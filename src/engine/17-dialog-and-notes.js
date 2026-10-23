// ── §17 Confirm dialog and notes: every delete or wipe asks first; story log, to-dos, party log ────────────
// confirmBox() is the one confirm dialog. The Notes tab keeps a log per character in the page db (claude.ai) or
// PocketBase (web app, via the db stand-in in web/sheet-boot.js: collections "notes" and "partynotes").
// bootStore() connects that db at startup (called from §21): notes, plus the shared play state S (§3).
// Defines: confirmBox, NOTES and the notes UI state, notesPanel, paintNotes, notesStore, addNote, setNoteScope,
//   subscribeNotes, bootStore, PARTY_LOG, pendingIds.
// Uses: S, save, DB, DIRTY, PLAY_DOC, normalizeState (§3); changesHtml, paintRes, paintCoins, paintVitals,
//   addedChanged, linkify, decorate (other sections, called later). Without a db, notes stay on this device.
// ── Confirm dialog ─────────────────────────────────────────────────────────────────────────────────────────
// Asks a yes/no question; resolves true for OK, false for Cancel, Escape or a click outside. title and body are HTML
// (callers escape data); body without a leading tag is wrapped in <p>. danger === false makes OK a plain primary
// button. no: the Cancel label (default WORD.cancel). read(wrap): optional, called just before the dialog closes, to
// pick up what was typed in it. Focus returns to where it was.
function confirmBox(title, body, ok, danger, read, no){
  return new Promise(res => {
    const prev = document.activeElement;
    const wrap = document.createElement('div'); wrap.className = 'modal'; wrap.setAttribute('role','alertdialog'); wrap.setAttribute('aria-modal','true'); wrap.setAttribute('aria-labelledby','mtitle');
    wrap.innerHTML = '<div class="mbox"><h3 id="mtitle">'+title+'</h3>'+(body?(body[0]==='<'?body:'<p>'+body+'</p>'):'')+'<div class="mbtns"><button class="btn" data-m="0">'+(no||WORD.cancel)+'</button><button class="btn '+(danger===false?'primary':'danger solid')+'" data-m="1">'+ok+'</button></div></div>';
    const done = v => { if (read) try { read(wrap); } catch(_){} document.removeEventListener('keydown', key, true); wrap.remove(); if (prev && prev.focus && prev.isConnected) try{ prev.focus({preventScroll:true}); }catch(_){} res(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    wrap.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) done(b.dataset.m === '1'); else if (e.target === wrap) done(false); });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(wrap); wrap.querySelector('[data-m="0"]').focus({preventScroll:true});
  });
}

// ── Notes: story log and to-dos ────────────────────────────────────────────────────────────────────────────
// NOTES: the notes on show; notesReady: loaded at least once; notesLocal: no db, kept on this device (NKEY);
// noteKind / noteFilter: the composer's type and the list filter; editing: id of the note being edited.
let NOTES = [], notesReady = false, notesLocal = false, noteKind = 'story', noteFilter = 'all', editing = null;
// localStorage key for notes kept on this device
const NKEY = PACK.id+'-notes-' + DATA.id;
// Session number: follows the highest session in the log unless you pick one with − / +
let pickedSession = null;
// session number for a new note (at least PACK.firstSession)
function curSession(){ return pickedSession || Math.max(PACK.firstSession || 1, ...NOTES.map(n => +n.session || 0)); }
// repaint the session number
function paintSession(){ const o = $('#sessnum'); if (o) o.textContent = curSession(); }
// note date as "18 Oct 2026"
const noteDate = at => new Date(at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
// Notes tab: changes to enter, composer, the log
function notesPanel(){
  const k = (v,l) => '<button aria-pressed="'+(noteKind===v)+'" data-act="notekind" data-k="'+v+'">'+l+'</button>';
  return '<section class="card" id="notechanges">'+changesHtml()+'</section>'
    + (PARTY_LOG() ? '<div class="seg notescope" role="group" aria-label="Which notes">'
        + '<button aria-pressed="'+(noteScope==='own')+'" data-act="notescope" data-k="own">📜 My notes</button><button aria-pressed="'+(noteScope==='party')+'" data-act="notescope" data-k="party">🍻 Party log</button></div>' : '')
    + '<section class="card"><div class="cardhead"><h2><span class="emo" aria-hidden="true">'+(noteScope==='party'?'🍻':'📜')+'</span>'+(noteScope==='party' ? 'Party log' : WORD.log)+'</h2><span class="small muted" id="notewhere"></span></div>'
    + '<div class="composer"><div class="comphead"><label for="note-text" class="eyebrow">New note</label><div class="sess" role="group" aria-label="Session number"><span class="eyebrow">Session</span><button class="iconbtn" data-act="sessstep" data-d="-1" aria-label="Previous session">−</button><output id="sessnum" class="num">'+curSession()+'</output><button class="iconbtn" data-act="sessstep" data-d="1" aria-label="Next session">+</button></div></div>'
    + '<textarea id="note-text" rows="3" placeholder="'+esc(WORD.notesHint(FIRST_NAME))+'"></textarea>'
    + '<div class="mode"><div class="seg" role="group" aria-label="Note type" id="notekinds">'+k('story','Story')+k('todo','To do')+'</div><button class="btn primary" data-act="addnote">✍️ Add note</button><span class="small muted" id="notemsg"></span></div></div></section>'
    + '<section class="card"><div class="cardhead"><div class="chips" id="notefilters"></div></div><div class="notelist" id="notelist"><p class="muted" style="margin:0">Loading notes…</p></div></section>';
}
// Repaints the note list, filters and the where-it's-saved line. Notes still saving show "saving…".
// On the party log, notes by other characters (mine === false) can't be edited or deleted here.
function paintNotes(){
  const list = $('#notelist'); if (!list) return; paintSession();
  const w = $('#notewhere'); if (w) w.textContent = !notesReady ? '' : notesLocal ? 'Saved on this device only' : notesOffline ? 'Reconnecting… showing your last copy' : noteScope === 'party' ? 'Shared with your party' : 'Private to you, on every device';
  const open = NOTES.filter(n=>n.kind==='todo' && !n.done).length;
  const f = (v,l) => '<button class="chip toggle '+(noteFilter===v?'on':'')+'" data-act="notefilter" data-f="'+v+'">'+l+'</button>';
  const fl = $('#notefilters'); if (fl) fl.innerHTML = f('all','All '+NOTES.length) + f('story','Story') + f('todo','To do'+(open?' · '+open+' open':''));
  if (!notesReady) return;
  const shown = NOTES.filter(n => noteFilter==='all' || n.kind===noteFilter)
    .sort((a,b) => (noteFilter==='todo' ? (a.done-b.done) : 0) || (b.at - a.at));
  if (!shown.length) { list.innerHTML = '<p class="muted" style="margin:0">'+(NOTES.length ? 'Nothing here yet.' : 'The log is empty. Write what happened last session, or a plan for '+esc(FIRST_NAME)+', and add it above.')+'</p>'; return; }
  list.innerHTML = shown.map(n => {
    const date = (n.session ? 'Session '+n.session+' · ' : '') + noteDate(n.at);
    const body = editing === n.id
      ? '<textarea id="note-edit" rows="4">'+esc(n.text)+'</textarea><div class="mode" style="margin-top:6px"><label class="small muted" for="note-sess">Session</label><input id="note-sess" class="sessin" type="number" inputmode="numeric" min="1" value="'+(+n.session||'')+'"><span class="btnright"><button class="btn small" data-act="notecancel">Cancel</button><button class="btn small primary" data-act="notesave" data-id="'+esc(n.id)+'">Save</button></span></div>'
      : '<div class="ntext">'+esc(n.text)+'</div>';
    return '<article class="nt '+(n.kind==='todo'?'todo':'')+(n.done?' done':'')+(pendingIds.has(n.id)?' saving':'')+'">'
      + (n.kind==='todo' ? '<button class="check" data-act="notedone" data-id="'+esc(n.id)+'" aria-pressed="'+!!n.done+'" aria-label="'+(n.done?'Mark not done':'Mark done')+'">'+(n.done?'✓':'')+'</button>' : '<span class="storymark" aria-hidden="true"></span>')
      + '<div class="nbody"><div class="nmeta"><span class="chip '+(n.kind==='todo'?'brass':'')+'">'+(n.kind==='todo'?'To do':'Story')+'</span><span class="small muted">'+date+(pendingIds.has(n.id)?' · saving…':'')+'</span>'
      + (n.by && noteScope === 'party' ? '<span class="small nby">'+esc(n.by)+'</span>' : '')
      + (editing===n.id || (noteScope === 'party' && n.mine === false) ? '' : '<span class="nact"><button class="linkbtn" data-act="noteedit" data-id="'+esc(n.id)+'">Edit</button><button class="linkbtn" data-act="notedel" data-id="'+esc(n.id)+'">Delete</button></span>')
      + '</div>'+body+'</div></article>';
  }).join('');
}
// ids of notes still on their way to the db. Optimistic: the list updates instantly; the db saves in the background.
const pendingIds = new Set();
// Notes sub-tabs (web app, verified character in a campaign): "own" = this character's log, "party" = the shared party log
let noteScope = 'own';
// does this sheet have a party log? (web app, verified character in a campaign)
const PARTY_LOG = () => !!(window.SHEET && window.SHEET.partyLog);
// db collection for the notes on show
const NOTE_COL = () => noteScope === 'party' ? 'partynotes' : 'notes';
// switches between My notes and Party log: redraws the panel and subscribes to the other collection
function setNoteScope(sc){
  if (sc === noteScope) return; noteScope = sc; NOTES = []; notesReady = false; editing = null;
  const el = document.querySelector('[data-panel="notes"]'); if (el) { el.innerHTML = notesPanel(); linkify(el); decorate(el); }
  paintNotes(); if (DB) subscribeNotes(DB);
}
// Add, update, delete. Each changes NOTES first and rolls back if the db refuses (the error is rethrown for the
// caller's message). Without a db (notesLocal) they write to localStorage instead.
const notesStore = {
  async add(n){
    if (notesLocal) { NOTES.push(Object.assign({id:'n'+Date.now()}, n)); ls.set(NKEY, NOTES); paintNotes(); return; }
    const ref = DB.collection(NOTE_COL()).doc();            // id minted locally, so the note shows right away
    NOTES = NOTES.concat(Object.assign({id: ref.id}, n)); pendingIds.add(ref.id); paintNotes();
    try { await ref.set(n); } catch(e) { NOTES = NOTES.filter(x=>x.id!==ref.id); throw e; } finally { pendingIds.delete(ref.id); paintNotes(); }
  },
  async update(id, patch){
    const x = NOTES.find(n=>n.id===id); const before = x ? Object.assign({}, x) : null;
    if (x) NOTES = NOTES.map(n => n.id===id ? Object.assign({}, n, patch) : n);
    if (notesLocal) { ls.set(NKEY, NOTES); paintNotes(); return; }
    pendingIds.add(id); paintNotes();
    try { await DB.doc(NOTE_COL()+'/'+id).update(patch); } catch(e) { if (before) NOTES = NOTES.map(n => n.id===id ? before : n); throw e; } finally { pendingIds.delete(id); paintNotes(); }
  },
  async del(id){
    const before = NOTES; NOTES = NOTES.filter(n=>n.id!==id); paintNotes();
    if (notesLocal) { ls.set(NKEY, NOTES); return; }
    try { await DB.doc(NOTE_COL()+'/'+id).delete(); } catch(e) { NOTES = before; paintNotes(); throw e; }
  }
};
// status line under the composer
function noteMsg(t){ const m = $('#notemsg'); if (m) m.textContent = t; }
// Saves the composer's note to the page db (or this device without one). On failure the text goes back in the box.
async function addNote(){
  const ta = $('#note-text'); const text = ta.value.trim(); if (!text) { ta.focus(); return; }
  ta.value = ''; ta.blur(); noteMsg('Added.'); setTimeout(()=>noteMsg(''), 1500);
  try { await notesStore.add({text, kind: noteKind, done: false, at: Date.now(), session: curSession()}); }
  catch(e){ if (!ta.value) ta.value = text; noteMsg(e && e.code==='quota_exceeded' ? 'Notes are full. Delete a few old ones first.' : 'Couldn’t save that note, so it’s back in the box. Try again.'); }
}
// A dropped connection must never blank the list: keep what's shown, fall back to the
// last copy cached on this device (NCACHE, own notes only), and quietly reconnect.
const NCACHE = PACK.id+'-notes-cache-' + DATA.id;
let notesOffline = false, notesRetry = 0, notesUnsub = null;
// Live note updates from the db for the current scope (replaces any earlier subscription). On an error it shows the
// cached copy and retries with backoff (2 s, doubling, up to 30 s).
function subscribeNotes(db){
  if (notesUnsub) { try { notesUnsub(); } catch(_){} notesUnsub = null; }
  notesUnsub = db.collection(NOTE_COL()).onSnapshot(snap => {
    notesRetry = 0; notesOffline = false;
    if (noteScope === 'own' && !snap.docs.length && !VIEW) moveLocalNotes(db);
    // store data wins, except for notes and edits still on their way
    const local = new Map(NOTES.filter(n => pendingIds.has(n.id)).map(n => [n.id, n]));
    const fromStore = snap.docs.map(d => local.get(d.id) || Object.assign({id: d.id}, d.data()));
    const ids = new Set(fromStore.map(n=>n.id));
    NOTES = fromStore.concat([...local.values()].filter(n => !ids.has(n.id)));
    if (noteScope === 'own') ls.set(NCACHE, NOTES.filter(n => !pendingIds.has(n.id)));
    notesReady = true; if (!editing) paintNotes();
  }, () => {
    notesOffline = true;
    if (!NOTES.length) NOTES = ls.get(NCACHE) || [];
    notesReady = true; if (!editing) paintNotes();
    const wait = Math.min(30000, 2000 * Math.pow(2, notesRetry++));
    setTimeout(() => subscribeNotes(db), wait);
  });
}
// Notes written while this page had no db (an older version, or a sheet published without storage) live only on
// this device. The first time the db's log is empty, copy them up once, so turning storage on never hides them.
function moveLocalNotes(db){
  const local = (ls.get(NKEY) || []).filter(n => n && typeof n.text === 'string');
  if (!local.length || ls.get(NKEY+'-moved')) return;
  ls.set(NKEY+'-moved', Date.now());
  local.forEach(n => { const o = {}; ['text','kind','done','at','session'].forEach(k => { if (k in n) o[k] = n[k]; }); db.collection('notes').doc().set(o).catch(() => {}); });
}
// ── Connecting the db ──────────────────────────────────────────────────────────────────────────────────────
// Connects the page db at startup: notes plus the shared play state. Without a db (window.claude.use missing or
// failing), notes stay on this device. Tracker updates from the db replace S only when they belong to the same sync
// (stamp) and this device has nothing unsaved; a shared sheet (VIEW) reloads when its owner synced.
async function bootStore(){
  // show the cached copy straight away so the log never flashes empty
  const cached = ls.get(NCACHE); if (cached && cached.length && !NOTES.length) { NOTES = cached; notesReady = true; paintNotes(); }
  let db = null; try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch(_){}
  if (!db) { notesLocal = true; NOTES = ls.get(NKEY) || []; if (!NOTES.length && cached) NOTES = cached; notesReady = true; paintNotes(); return; }
  DB = db;
  subscribeNotes(db);
  db.doc(PLAY_DOC).onSnapshot(snap => {
    if (!snap.exists) { if (!VIEW) save(); return; }   // nothing stored yet: this device's tracker becomes the stored one
    if (snap.metadata.hasPendingWrites) return;
    const r = snap.data();
    // a shared sheet whose owner synced since we opened it: reload to get the new character data (at most every 30 s)
    if (VIEW && r.stamp !== DATA.syncedAt) { let last = 0; try { last = +sessionStorage.getItem('view-reload') || 0; } catch(_){}
      if (Date.now() - last > 30000) { try { sessionStorage.setItem('view-reload', Date.now()); } catch(_){} return location.reload(); } }
    // this device has changes it hasn't stored yet (made offline, or the tab closed too soon): they're newer, keep them
    if (ls.get(DIRTY) && r.stamp === DATA.syncedAt) { if (JSON.stringify(r) !== JSON.stringify(S)) save(); return; }
    if (r.stamp === DATA.syncedAt && JSON.stringify(r) !== JSON.stringify(S)) { S = normalizeState(JSON.parse(JSON.stringify(r))); ls.set(SKEY, S);
      if (JSON.stringify(S.added) !== JSON.stringify(ADDED)) return addedChanged();   // items added on another device
      paintRes(); paintCoins(); paintVitals(); }
  }, () => {});
  paintRes();
}
// Ctrl/⌘ + Enter in the composer adds the note
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.target && e.target.id === 'note-text') { e.preventDefault(); addNote(); }
});
