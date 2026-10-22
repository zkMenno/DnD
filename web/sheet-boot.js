// Web app: open one character sheet. Loads the character from the server, then the engine
// (themes → classes → pack → main), with a stand-in for claude.ai's `db` that keeps the
// tracker and notes on the server. The engine itself is the same code as the claude.ai sheets.
// Addresses: /<username>/<D&D Beyond id> (someone's sheet) and /<D&D Beyond id> (your own copy; added if you don't have
// it yet, then shown as /<username>/<D&D Beyond id>).
// Paths are absolute ("/engine/…"): the page is served at /<username>/<id> too, where relative paths would miss.
// The build tag from this script's own address (?v=…, set by tools/build.js): every file loaded below asks for the
// same build, so a cached older engine can never run with a newer page.
const BUILD_V = (() => { try { return new URL(document.currentScript.src).searchParams.get('v') || ''; } catch (_) { return ''; } })();
const withV = p => BUILD_V ? p + (p.includes('?') ? '&' : '?') + 'v=' + BUILD_V : p;
window.withV = withV;
(async () => {
  const pb = new PocketBase(location.origin);
  const app = document.getElementById('app');
  const fail = msg => { app.innerHTML = '<div class="boot"><p>' + msg + '</p><p><a href="/">← Your characters</a></p></div>'; };
  // offline (no network, or the server unreachable): keep going on the saved login and the last saved copy of the sheet
  const offline = e => !navigator.onLine || !e || !e.status;
  if (!pb.authStore.isValid && navigator.onLine) { location.href = '/?next=' + encodeURIComponent(location.pathname + location.search); return; }
  try { await pb.collection('users').authRefresh(); } catch (e) { if (!offline(e)) { pb.authStore.clear(); location.href = '/'; return; } }

  const me = pb.authStore.record && pb.authStore.record.id;
  const route = location.pathname.match(/^\/(?:([a-z0-9_-]{3,20})\/)?(\d{4,12})\/?$/);   // [, username?, D&D Beyond id]
  const ALIAS = 'sheet-at-' + location.pathname;   // offline: which saved sheet this address showed last time
  let ch;
  try { ch = await findSheet(pb, me, route);
    try { localStorage.setItem('sheet-cache-' + ch.id, JSON.stringify(ch)); localStorage.setItem(ALIAS, ch.id); } catch (_) {} }
  catch (e) {
    try { const id = localStorage.getItem(ALIAS); ch = offline(e) && id ? JSON.parse(localStorage.getItem('sheet-cache-' + id)) : null; } catch (_) { ch = null; }
    if (!ch) return fail(offline(e) ? 'You’re offline, and this sheet hasn’t been opened on this device before.' : (e && e.status === 400 && e.message) || 'That character isn’t here, or isn’t shared with you.');
  }
  const mine = ch.owner === me;
  const pretty = '/' + ch.handle + '/' + ch.ddb_id;
  if (location.pathname !== pretty) history.replaceState(null, '', pretty);   // /<id> → /<username>/<id>: one address per sheet
  offlineBadge();

  // the pack decides the data element's id
  const packName = /^[a-z0-9-]+$/.test(ch.pack || '') ? ch.pack : 'bare';
  const packSrc = await (await fetch(withV('/packs/' + packName + '.js'))).text();
  const pid = (packSrc.match(/\bid:\s*["']([a-z0-9-]+)["'],\s*theme:/) || [])[1] || 'sheet';

  // first open: no compact data yet → hand the engine D&D Beyond's raw JSON, save what it makes of it
  let firstSync = false, payload = ch.data;
  if (!payload || !payload.id) {
    if (!mine) return fail('This character hasn’t been synced by its owner yet.');
    app.innerHTML = '<div class="boot"><p>Reading D&amp;D Beyond…</p></div>';
    try { payload = await pb.send('/api/ddb/' + ch.ddb_id, {}); firstSync = true; }
    catch (e) { return fail((e && e.message) || 'D&D Beyond didn’t answer. Is the character public?'); }
  }
  const dj = document.createElement('script');
  dj.type = 'application/json'; dj.id = pid + '-data'; dj.textContent = JSON.stringify(payload).replace(/</g, '\\u003c');
  document.body.appendChild(dj);
  document.title = ch.name || 'Character';
  // the home page's "Continue with …" button: the last sheet opened on this device
  try { localStorage.setItem('last-sheet', JSON.stringify({ path: location.pathname, id: ch.id, name: ch.name || 'your character', at: Date.now() })); } catch (_) {}

  window.SHEET = {
    pb, character: ch, mine,
    partyLog: !!(mine && ch.verified && ch.campaign),          // Notes → Party log sub-tab
    // ☰ → Pull from D&D Beyond
    async pull(compact) {
      if (!mine) throw new Error('Only the owner can sync this sheet.');
      const raw = await pb.send('/api/ddb/' + ch.ddb_id, {});
      await pb.collection('characters').update(ch.id, { data: compact(raw) });
      location.reload();
    },
  };
  window.claude = { use: async name => name === 'db' ? sheetDb(pb, ch, me, mine) : null };

  for (const src of ['/engine/themes.js', '/engine/classes.js', '/packs/' + packName + '.js', '/engine/main.js']) await loadScript(withV(src));
  // first open: save the compact copy (window.SHEET.saved settles when it's stored; tests wait on it)
  /* global DATA */   // the engine's compact character, defined by engine/main.js
  window.SHEET.saved = firstSync && typeof DATA === 'object'
    ? pb.collection('characters').update(ch.id, { data: Object.assign({}, DATA, { inventory: DATA.inventory.filter(i => !i.added) }) }).catch(() => {})
    : Promise.resolve();
})();

// The character record for this address. /<D&D Beyond id> is "my copy": when there isn't one yet, it's added
// (the server checks the character is public, like ➕ Add on the home page).
async function findSheet(pb, me, route) {
  if (!route) throw { status: 404 };
  const [, handle, ddb] = route, col = pb.collection('characters');
  if (handle) return col.getFirstListItem(pb.filter('handle = {:h} && ddb_id = {:d}', { h: handle, d: +ddb }));
  try { return await col.getFirstListItem(pb.filter('owner = {:o} && ddb_id = {:d}', { o: me, d: +ddb })); }
  catch (e) { if (e && e.status === 404) return col.create({ ddb_id: +ddb, owner: me, visibility: 'private', data: {} }); throw e; }
}

// a small "offline" pill while there's no connection; back online, the tracker is saved to the server again
function offlineBadge() {
  const b = document.createElement('div'); b.className = 'offline'; b.textContent = '📴 Offline: changes are kept on this device and saved when you’re back';
  const set = () => { b.hidden = navigator.onLine; };
  window.addEventListener('offline', set);
  window.addEventListener('online', () => { set(); try { if (typeof save === 'function') save(); } catch (_) {} });   // eslint-disable-line no-undef
  set(); document.body.appendChild(b);
}
// load one script and wait for it
function loadScript(src) {
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.body.appendChild(s); });
}

// The subset of claude.ai's db the engine uses, on PocketBase:
//   doc('play/<pack>') .set(state) .onSnapshot(cb)          → collection "play" (one record per character)
//   collection('notes') .doc() .onSnapshot(cb)               → collection "notes", scope "own"
//   doc('notes/<id>') .update(patch) .delete()
let SHEET_DB = null;
function sheetDb(pb, ch, me, mine) {
  if (SHEET_DB) return SHEET_DB;
  const byChar = pb.filter('character = {:c}', { c: ch.id });
  const id15 = () => { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; return Array.from(crypto.getRandomValues(new Uint8Array(15)), x => a[x % 36]).join(''); };
  const noteFields = n => { const o = {}; ['text', 'kind', 'done', 'at', 'session'].forEach(k => { if (k in n) o[k] = n[k]; }); return o; };

  let playId = null, writing = 0, lastSent = '';
  const play = {
    async set(state) {
      if (!mine) return;                                    // shared sheets are read-only
      writing++; lastSent = JSON.stringify(state);
      try {
        if (!playId) { try { playId = (await pb.collection('play').getFirstListItem(byChar)).id; } catch (_) {} }
        if (playId) await pb.collection('play').update(playId, { state }, { requestKey: null });
        else playId = (await pb.collection('play').create({ character: ch.id, state }, { requestKey: null })).id;
      } finally { writing--; }
    },
    onSnapshot(cb, err) {
      const emit = r => cb({ exists: !!r, data: () => (r ? r.state : null), metadata: { hasPendingWrites: false } });
      pb.collection('play').getFirstListItem(byChar).then(r => { playId = r.id; emit(r); })
        .catch(e => (e && e.status === 404 ? emit(null) : err && err(e)));
      let unsub = null;
      pb.collection('play').subscribe('*', ev => {
        if (ev.record.character !== ch.id || ev.action === 'delete') return;
        if (writing || JSON.stringify(ev.record.state) === lastSent) return;   // our own echo
        playId = ev.record.id; emit(ev.record);
      }, { filter: byChar }).then(u => (unsub = u)).catch(() => {});
      return () => unsub && unsub();
    },
  };

  // Offline: note writes wait in a queue on this device (in order) and go out when the connection is back.
  const QKEY = 'note-queue-' + ch.id, net = e => !navigator.onLine || !e || !e.status;
  const queue = () => { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch (_) { return []; } };
  const enqueue = op => { try { localStorage.setItem(QKEY, JSON.stringify(queue().concat([op]))); } catch (_) {} };
  const run = op => op.op === 'create' ? pb.collection('notes').create(op.data, { requestKey: null })
    : op.op === 'update' ? pb.collection('notes').update(op.id, op.data, { requestKey: null }) : pb.collection('notes').delete(op.id, { requestKey: null });
  const tryOrQueue = async op => { if (!navigator.onLine) return enqueue(op); try { await run(op); } catch (e) { if (net(e)) enqueue(op); else throw e; } };
  let flushing = false;
  const flush = async () => { if (flushing || !navigator.onLine) return; flushing = true;
    try { let q = queue(); while (q.length) { try { await run(q[0]); } catch (e) { if (net(e)) break; } q = q.slice(1); localStorage.setItem(QKEY, JSON.stringify(q)); } }
    finally { flushing = false; } };
  window.addEventListener('online', () => flush()); flush();
  const notesFilter = pb.filter('character = {:c} && scope = "own"', { c: ch.id });
  const notes = {
    doc() {
      const id = id15();
      return { id, set: n => tryOrQueue({ op: 'create', data: Object.assign({ id, character: ch.id, author: me, scope: 'own' }, noteFields(n)) }) };
    },
    onSnapshot(cb, err) {
      const load = () => pb.collection('notes').getFullList({ filter: notesFilter, sort: 'at', requestKey: null })
        .then(list => cb({ docs: list.map(r => ({ id: r.id, data: () => ({ text: r.text, kind: r.kind, done: r.done, at: r.at, session: r.session }) })) }))
        .catch(e => err && err(e));
      load();
      let unsub = null;
      pb.collection('notes').subscribe('*', ev => { if (ev.record.character === ch.id) load(); }, { filter: notesFilter }).then(u => (unsub = u)).catch(() => {});
      return () => unsub && unsub();
    },
  };

  // party log: every verified party member's notes for this character's campaign
  const partyFilter = pb.filter('scope = "party" && campaign = {:c}', { c: ch.campaign || '-' });
  const party = {
    doc() {
      const id = id15();
      return { id, set: n => tryOrQueue({ op: 'create', data: Object.assign({ id, character: ch.id, author: me, scope: 'party', campaign: ch.campaign }, noteFields(n)) }) };
    },
    onSnapshot(cb, err) {
      const load = () => pb.collection('notes').getFullList({ filter: partyFilter, sort: 'at', requestKey: null })
        .then(list => cb({ docs: list.map(r => ({ id: r.id, data: () => ({ text: r.text, kind: r.kind, done: r.done, at: r.at, session: r.session, by: r.by, mine: r.author === me }) })) }))
        .catch(e => err && err(e));
      load();
      let unsub = null;
      pb.collection('notes').subscribe('*', ev => { if (ev.record.scope === 'party' && ev.record.campaign === ch.campaign) load(); }, { filter: partyFilter }).then(u => (unsub = u)).catch(() => {});
      return () => unsub && unsub();
    },
  };

  SHEET_DB = {
    doc(path) {
      if (path.startsWith('play/')) return play;
      const [col, id] = path.split('/');
      if (col === 'notes' || col === 'partynotes') return {
        update: patch => tryOrQueue({ op: 'update', id, data: noteFields(patch) }),
        delete: () => tryOrQueue({ op: 'delete', id }),
      };
      throw new Error('unknown doc ' + path);
    },
    collection(name) { if (name === 'notes') return notes; if (name === 'partynotes') return party; throw new Error('unknown collection ' + name); },
  };
  return SHEET_DB;
}
