// Web app: open one character sheet (sheet.html). Signs in from the saved login, finds the character on the server,
// writes its data into the page as <script id="<pack id>-data">, sets window.SHEET (owner flag, party log, pull) and
// window.claude (a stand-in for claude.ai's `db` that keeps the tracker and notes in PocketBase), then loads the
// engine: themes → classes → pack → main, in that order. The engine is the same code as the claude.ai sheets.
// Addresses: /<username>/<D&D Beyond id> (someone's sheet) and /<D&D Beyond id> (your own copy; added if you don't have
// it yet, then shown as /<username>/<D&D Beyond id>).
// Paths are absolute ("/engine/…"): the page is served at /<username>/<id> too, where relative paths would miss.
// Offline: keeps going on the saved login and the last copy of the sheet saved on this device (localStorage).
// Globals: ASSET_V, withV (also window.withV, for the engine), findSheet, offlineBadge, loadScript, sheetDb.

// ── Build tags ─────────────────────────────────────────────────────────────────────────────────────────────
// ASSET_V: path → content hash (first 10 hex of its sha1) of each file loaded by script (engine, packs, item list),
// filled in by tools/build.js. withV asks for exactly that content (?v=<hash>), so a cached older engine can never run
// with a newer page, and a file that didn't change keeps its address across builds (the service worker's copy stays).
const ASSET_V = /*__ASSET_V__*/{};
// Add a file's content hash to its path (?v= or &v=); unchanged for a path the map doesn't know.
const withV = p => ASSET_V[p] ? p + (p.includes('?') ? '&' : '?') + 'v=' + ASSET_V[p] : p;
window.withV = withV;

// ── Open the sheet ─────────────────────────────────────────────────────────────────────────────────────────
// Sign in, find the character, put its data in the page, set window.SHEET / window.claude, then load the engine.
// Not signed in (and online): off to the home page, which comes back here after sign-in (?next=).
(async () => {
  const pb = new PocketBase(location.origin);
  const app = document.getElementById('app');
  // replace the loading card with a message (HTML) and a way back
  const fail = msg => { app.innerHTML = '<div class="boot"><p>' + msg + '</p><p><a href="/">← Your characters</a></p></div>'; };
  // offline (no network, or the server unreachable): keep going on the saved login and the last saved copy of the sheet
  const offline = e => !navigator.onLine || !e || !e.status;
  if (!pb.authStore.isValid && navigator.onLine) { location.href = '/?next=' + encodeURIComponent(location.pathname + location.search); return; }
  try { await pb.collection('users').authRefresh(); } catch (e) { if (!offline(e)) { pb.authStore.clear(); location.href = '/'; return; } }

  // find the character (and keep a copy for offline use); offline, fall back to the copy this address showed last
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
    app.innerHTML = '<div class="boot"><svg class="bootd20" aria-hidden="true" viewBox="0 0 100 100"><use href="#d20"/></svg><p>Reading D&amp;D Beyond…</p><div class="bootbar" aria-hidden="true"><span></span></div></div>';
    try { payload = await pb.send('/api/ddb/' + ch.ddb_id, {}); firstSync = true; }
    catch (e) { return fail((e && e.message) || 'D&D Beyond didn’t answer. Is the character public?'); }
  }
  // the character data goes into the page where the engine looks for it (§02); "<" escaped so it can't end the script
  const dj = document.createElement('script');
  dj.type = 'application/json'; dj.id = pid + '-data'; dj.textContent = JSON.stringify(payload).replace(/</g, '\\u003c');
  document.body.appendChild(dj);
  document.title = ch.name || 'Character';
  // the home page's "Continue with …" button: the last sheet opened on this device
  try { localStorage.setItem('last-sheet', JSON.stringify({ path: location.pathname, id: ch.id, name: ch.name || 'your character', at: Date.now() })); } catch (_) {}

  // What the engine reads to know it runs in the web app (see §03, §17, §21), and its db stand-in.
  window.SHEET = {
    pb, character: ch, mine,
    partyLog: !!(mine && ch.verified && ch.campaign),          // Notes → Party log sub-tab
    // ☰ → Sync → Get D&D Beyond's version (§21 syncWindow): the server fetches it, the engine's compact() shrinks it
    async pull(compact) {
      if (!mine) throw new Error('Only the owner can sync this sheet.');
      const raw = await pb.send('/api/ddb/' + ch.ddb_id, {});
      await pb.collection('characters').update(ch.id, { data: compact(raw) });   // the sync window (§21) shows ✓ and reloads
    },
  };
  window.claude = { use: async name => name === 'db' ? sheetDb(pb, ch, me, mine) : null };

  // a script that doesn't load (bad connection, a deploy mid-way) or an engine that stops before drawing the sheet:
  // say so with a way out, instead of leaving "Opening your sheet…" up forever
  const stuck = () => { if (app.querySelector('.boot')) fail('Couldn’t open the sheet. <a href="">Try again</a>'); };
  try { for (const src of ['/engine/themes.js', '/engine/classes.js', '/packs/' + packName + '.js', '/engine/main.js']) await loadScript(withV(src)); }
  catch (_) { return stuck(); }
  setTimeout(stuck, 10000);
  // first open: save the compact copy (window.SHEET.saved settles when it's stored; tests wait on it)
  /* global DATA */   // the engine's compact character, defined by engine/main.js
  window.SHEET.saved = firstSync && typeof DATA === 'object'
    ? pb.collection('characters').update(ch.id, { data: Object.assign({}, DATA, { inventory: DATA.inventory.filter(i => !i.added) }) }).catch(() => {})
    : Promise.resolve();
})();

// ── Helpers ────────────────────────────────────────────────────────────────────────────────────────────────
// The character record for this address. /<D&D Beyond id> is "my copy": when there isn't one yet, it's added
// (the server checks the character is public, like ➕ Add on the home page). No route match throws {status: 404}.
async function findSheet(pb, me, route) {
  if (!route) throw { status: 404 };
  const [, handle, ddb] = route, col = pb.collection('characters');
  if (handle) return col.getFirstListItem(pb.filter('handle = {:h} && ddb_id = {:d}', { h: handle, d: +ddb }));
  try { return await col.getFirstListItem(pb.filter('owner = {:o} && ddb_id = {:d}', { o: me, d: +ddb })); }
  catch (e) { if (e && e.status === 404) return col.create({ ddb_id: +ddb, owner: me, visibility: 'private', data: {} }); throw e; }
}

// A small "offline" pill while there's no connection. Back online, the tracker is saved to the server again
// (the engine's save(), if it has loaded).
function offlineBadge() {
  const b = document.createElement('div'); b.className = 'offline'; b.textContent = '📴 Offline: changes are kept on this device and saved when you’re back';
  const set = () => { b.hidden = navigator.onLine; };
  window.addEventListener('offline', set);
  window.addEventListener('online', () => { set(); try { if (typeof save === 'function') save(); } catch (_) {} });   // eslint-disable-line no-undef
  set(); document.body.appendChild(b);
}
// Load one script and wait for it; rejects when it fails to load.
function loadScript(src) {
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.body.appendChild(s); });
}

// ── The db stand-in ────────────────────────────────────────────────────────────────────────────────────────
// The subset of claude.ai's db the engine uses, on PocketBase:
//   doc('play/<pack>') .set(state) .get() .onSnapshot(cb)   → collection "play" (one record per character)
//   collection('notes') .doc() .onSnapshot(cb)               → collection "notes", scope "own"
//   collection('partynotes') .doc() .onSnapshot(cb)          → collection "notes", scope "party", this campaign
//   doc('notes/<id>') / doc('partynotes/<id>') .update(patch) .delete()
// Snapshots are re-sent on PocketBase realtime events. Built once per page (SHEET_DB).
let SHEET_DB = null;
// Build (or return) the db stand-in for character ch. me = the signed-in user id, mine = it's their own sheet.
function sheetDb(pb, ch, me, mine) {
  if (SHEET_DB) return SHEET_DB;
  const byChar = pb.filter('character = {:c}', { c: ch.id });
  // a new record id: 15 random characters from a–z0–9, PocketBase's id format (so offline notes keep their id)
  const id15 = () => { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; return Array.from(crypto.getRandomValues(new Uint8Array(15)), x => a[x % 36]).join(''); };
  // only the note fields a player writes; the server sets the rest
  const noteFields = n => { const o = {}; ['text', 'kind', 'done', 'at', 'session'].forEach(k => { if (k in n) o[k] = n[k]; }); return o; };

  // The tracker: one "play" record per character. playId is found on first use. sent holds the last few trackers this
  // page saved, so onSnapshot can skip the realtime echo of our own saves: an old echo that arrives after a newer save
  // would otherwise look like another device going back in time. Other devices' saves always come through, even
  // while one of ours is on its way (the engine merges them field by field, see save() and takeRemote()).
  let playId = null;
  const sent = [];
  const play = {
    // save the tracker (creates the record the first time); does nothing on someone else's sheet
    async set(state) {
      if (!mine) return;                                    // shared sheets are read-only
      sent.push(JSON.stringify(state)); if (sent.length > 5) sent.shift();
      if (!playId) { try { playId = (await pb.collection('play').getFirstListItem(byChar, { requestKey: null })).id; } catch (_) {} }
      if (playId) await pb.collection('play').update(playId, { state }, { requestKey: null });
      else playId = (await pb.collection('play').create({ character: ch.id, state }, { requestKey: null })).id;
    },
    // the stored tracker right now, as a snapshot (exists: false when there is none). The engine reads it just before
    // each save, to merge in what other devices saved since. A network error is thrown.
    async get() {
      let r = null;
      try { r = playId ? await pb.collection('play').getOne(playId, { requestKey: null }) : await pb.collection('play').getFirstListItem(byChar, { requestKey: null }); }
      catch (e) { if (!e || e.status !== 404) throw e; }
      if (r) playId = r.id;
      return { exists: !!r, data: () => (r ? r.state : null), metadata: { hasPendingWrites: false } };
    },
    // send the stored tracker now (exists: false when there is none) and again whenever another device saves one;
    // returns an unsubscribe function
    onSnapshot(cb, err) {
      const emit = r => cb({ exists: !!r, data: () => (r ? r.state : null), metadata: { hasPendingWrites: false } });
      pb.collection('play').getFirstListItem(byChar).then(r => { playId = r.id; emit(r); })
        .catch(e => (e && e.status === 404 ? emit(null) : err && err(e)));
      let unsub = null;
      pb.collection('play').subscribe('*', ev => {
        if (ev.record.character !== ch.id || ev.action === 'delete') return;
        if (sent.includes(JSON.stringify(ev.record.state))) return;   // our own echo
        playId = ev.record.id; emit(ev.record);
      }, { filter: byChar }).then(u => (unsub = u)).catch(() => {});
      return () => unsub && unsub();
    },
  };

  // Offline: note writes wait in a queue on this device (in order) and go out when the connection is back.
  // net(e): the error is a network problem (no status), not a refusal from the server.
  const QKEY = 'note-queue-' + ch.id, net = e => !navigator.onLine || !e || !e.status;
  // the queue in localStorage: read, add one write, run one write
  const queue = () => { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch (_) { return []; } };
  const enqueue = op => { try { localStorage.setItem(QKEY, JSON.stringify(queue().concat([op]))); } catch (_) {} };
  const run = op => op.op === 'create' ? pb.collection('notes').create(op.data, { requestKey: null })
    : op.op === 'update' ? pb.collection('notes').update(op.id, op.data, { requestKey: null }) : pb.collection('notes').delete(op.id, { requestKey: null });
  // send a write now; offline (or on a network error) queue it instead. A server refusal is thrown to the engine.
  const tryOrQueue = async op => { if (!navigator.onLine) return enqueue(op); try { await run(op); } catch (e) { if (net(e)) enqueue(op); else throw e; } };
  let flushing = false;
  // Send the queued writes in order, stopping at the first network error (the rest wait for the next try).
  // A write the server refuses (not a network problem) is kept aside in note-failed-<id> (the last 50) instead of
  // vanishing.
  // Runs at start and on every 'online' event.
  const flush = async () => { if (flushing || !navigator.onLine) return; flushing = true;
    try { let q = queue(); while (q.length) { try { await run(q[0]); } catch (e) { if (net(e)) break;
        try { const k = QKEY.replace('note-queue-', 'note-failed-'), f = JSON.parse(localStorage.getItem(k) || '[]'); f.push(Object.assign({ err: String((e && e.message) || e) }, q[0])); localStorage.setItem(k, JSON.stringify(f.slice(-50))); } catch (_) {} }
      q = q.slice(1); try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (_) {} } }
    finally { flushing = false; } };
  window.addEventListener('online', () => flush()); flush();
  // the character's own notes (Notes → My notes)
  const notesFilter = pb.filter('character = {:c} && scope = "own"', { c: ch.id });
  const notes = {
    // a new note: the id is known at once, set(n) creates it (or queues it offline)
    doc() {
      const id = id15();
      return { id, set: n => tryOrQueue({ op: 'create', data: Object.assign({ id, character: ch.id, author: me, scope: 'own' }, noteFields(n)) }) };
    },
    // send the whole list (oldest first) now and again on every change; returns an unsubscribe function
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

  // Party log: every verified party member's notes for this character's campaign (the server decides who may read
  // and post; "by" is set by the server). Same shape as notes, plus by and mine.
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

  // the db object itself: paths and names the engine uses, anything else throws
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
