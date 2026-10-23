// ── §3 Play state: S, saved per device and to the page db; resets to D&D Beyond's numbers after each sync ───
// S is everything that changes at the table (HP, uses, spent items, coins, hit dice, added items). It is saved to
// localStorage at once (key SKEY) and to the page db doc PLAY_DOC 800 ms later; bootStore() (§17) connects the db and
// takes in changes from other devices. A sync (new DATA.syncedAt) starts S over from freshState().
// Each field carries its last change time (S.at), so trackers from two devices merge field by field (mergeState).
// Defines: VIEW, SKEY, S, save, DIRTY, DB (set by bootStore), PLAY_DOC, mergeState, sameState, seeTimes, PREV,
//   stampChanges, pushPlay, ui + saveUi (this device's view prefs), ARROW_N, HEAL_POTION, healPotion, COINS,
//   freshState, normalizeState.
// Uses: DATA, D, RES, ADDED, keepAdded, mergeAdded, ls (§2); paintChanges (§10) and takeRemote (§17), called lazily
//   from save() / pushPlay().
// Web app: a sheet someone shared with you opens read-only (VIEW). It shows their live tracker, keeps nothing on
// this device (so it never mixes with your own tracker for the same character) and blocks every control that changes it.
const VIEW = !!(window.SHEET && window.SHEET.mine === false);
// localStorage key for S; a shared sheet gets its own key, apart from your own copy of the same character
const SKEY = PACK.id+'-play-' + DATA.id + (VIEW ? '-view-'+window.SHEET.character.id : '');
// Consumables are counted one way: S.spent[item name] = how many were used at the table since the sync (negative when
// some were added), so what's left = the inventory quantity − spent. Arrows and healing potions work like any other item.
const ARROW_N = (DATA.inventory.find(i => /^Arrows?$/.test(i.name)) || {name:'Arrows'}).name;   // plain arrows, as D&D Beyond names them
// healing potions → their dice (2024 names and D&D Beyond's "Potion of Healing (Greater)" style)
const HEAL_POTION = { '':[2,4,2], greater:[4,4,4], superior:[8,4,8], supreme:[10,4,20] };
const healPotion = n => { const m = String(n).match(/^Potion of (?:(Greater|Superior|Supreme) )?Healing(?: \((Greater|Superior|Supreme)\))?$/i); return m ? HEAL_POTION[(m[1]||m[2]||'').toLowerCase()] : null; };
// [key, name, value in copper]
const COINS = [['pp','Platinum',1000],['gp','Gold',100],['ep','Electrum',50],['sp','Silver',10],['cp','Copper',1]];
// Play state as D&D Beyond has it right now (the reset point).
function freshState(){
  return { stamp: DATA.syncedAt, hp: D.hpCur, temp: DATA.hp.temp, insp: DATA.inspiration,
    ...Object.fromEntries(RES.map(r => [r.key, r.used||0])),
    spent: {},
    hd: Object.fromEntries(D.hitDice.map(h => [h.cls, h.used])),
    coins: Object.fromEntries(COINS.map(([k]) => [k, (DATA.currency||{})[k]||0])), coinLog: [], added: ADDED, active: {}, at: {} };
}
// this device's saved state, unless D&D Beyond was synced since (then start fresh)
let S = ls.get(SKEY);
if (!S || S.stamp !== DATA.syncedAt) S = freshState();
// Until 21 Oct arrows and Potions of Healing had their own counters (S.arrows / S.potions = how many are left).
// Turn them into spent counts, so trackers saved by an older page (or another device still on it) carry over.
function migrateCounters(s){
  if (!s || typeof s !== 'object') return;
  const qty = n => DATA.inventory.filter(i => i.name === n).reduce((a,i) => a+(i.qty||0), 0);
  if (typeof s.arrows === 'number' || typeof s.potions === 'number') s.spent = Object.assign({}, s.spent);
  if (typeof s.arrows === 'number') { const v = qty(ARROW_N) - s.arrows; if (v) s.spent[ARROW_N] = (s.spent[ARROW_N]||0) + v; }
  if (typeof s.potions === 'number') { const v = qty('Potion of Healing') - s.potions; if (v) s.spent['Potion of Healing'] = (s.spent['Potion of Healing']||0) + v; }
  delete s.arrows; delete s.potions;
}
// Fills gaps in saved state (older versions, other devices) with fresh values and forces every counter to a number.
// Also used on trackers that arrive from the db (§17), so it must cope with anything. Returns a new object.
function normalizeState(s){
  migrateCounters(s); if (s && s.base) migrateCounters(s.base);
  const f = freshState(); s = Object.assign({}, f, s || {});
  s.hd = Object.assign({}, f.hd, s.hd || {});
  s.coins = Object.assign({}, f.coins, s.coins || {});
  if (!Array.isArray(s.coinLog)) s.coinLog = [];
  if (typeof s.fired !== 'number') s.fired = 0;
  if (!s.active || typeof s.active !== 'object') s.active = {};   // on/off states: Rage…
  // counters are numbers, whatever came back from storage or the server (a shared tracker is shown to others)
  const num = v => (Number.isFinite(+v) ? +v : 0), nums = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, num(v)]));
  Object.keys(f).forEach(k => { if (typeof f[k] === 'number') s[k] = num(s[k]); });
  s.hd = nums(s.hd); s.coins = nums(s.coins); s.spent = nums(s.spent);
  s.at = s.at && typeof s.at === 'object' ? nums(s.at) : {};   // change times per field (merging, below)
  s.added = keepAdded(s.added);
  return s;
}
S = normalizeState(S);
// the saved state's added items differ from §2's list: use these and derive again
if (JSON.stringify(S.added) !== JSON.stringify(ADDED)) { ADDED = S.added; mergeAdded(); Object.assign(D, derive(DATA)); }
// DB: the page db (claude.ai) or its PocketBase stand-in (web/sheet-boot.js); null until bootStore() connects
let remoteTimer = null, DB = null;
const PLAY_DOC = 'play/' + PACK.id;   // shared play state in the page's db (collection 'play' is in the db access rules)
// SKEY+'-dirty' marks a change this device hasn't stored remotely yet (offline, or closed within the 800 ms): on the
// next load it is merged with the stored copy and sent (bootStore), and going back online sends it.
const DIRTY = SKEY + '-dirty';
// ── Two devices, one tracker: merging field by field ──
// Phone A spends a Rage while phone B changes HP: saving the whole of S would let the later save wipe the other
// change. So every field of S carries the time it was last changed, in S.at (a map entry such as spent['Arrows'] is
// its own field, "spent.Arrows"; MAP_KEYS are the maps that merge per entry). save() stamps the fields that changed
// since the last save; when another copy comes in (the db's, §17 takeRemote), each field takes the newer of the two
// (mergeState). Both phones' changes survive, and the merge comes out the same whichever device does it, so two
// copies that crossed in the post settle on one result. Two phones changing the very same field: the later change wins.
// The times come from tick(): the clock, but always later than any time seen from another device, so a change made
// here after seeing another phone's beats it even when that phone's clock runs ahead.
const MAP_KEYS = ['spent', 'hd', 'coins', 'active'];
// JSON with sorted keys, so two copies of the same state compare equal whichever order their keys came back in
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(j => [j, x[j]])) : x));
const sameState = (a, b) => canon(a) === canon(b);
// s's fields as {name: value}: top-level keys, and "map.entry" for each entry of a MAP_KEYS map (stamp and at aren't fields)
function fieldsOf(s){
  const o = {};
  Object.keys(s).forEach(k => { if (k === 'stamp' || k === 'at') return;
    if (MAP_KEYS.includes(k)) Object.keys(s[k] || {}).forEach(e => { o[k+'.'+e] = s[k][e]; }); else o[k] = s[k]; });
  return o;
}
let CLOCK = 0;
// a change time for now: the clock, but later than the last time handed out and every time seen in other copies
const tick = () => (CLOCK = Math.max(Date.now(), CLOCK + 1));
// note the newest change time in copy s, so tick() goes past it
const seeTimes = s => Object.values((s && s.at) || {}).forEach(t => { if (t > CLOCK) CLOCK = t; });
seeTimes(S);
// Merge two copies of the tracker (same sync): every field from the copy that changed it last. A tie (the same
// time, or neither copy has one) goes to the larger value as JSON, so either device merging gets the same answer.
// Returns a new, normalised state.
function mergeState(mine, theirs){
  const fm = fieldsOf(mine), ft = fieldsOf(theirs), am = mine.at || {}, at = theirs.at || {};
  const out = { stamp: mine.stamp, at: {} };
  MAP_KEYS.forEach(k => { out[k] = {}; });
  new Set([...Object.keys(fm), ...Object.keys(ft)]).forEach(f => {
    const tm = am[f] || 0, tt = at[f] || 0;
    const ours = tm !== tt ? tm > tt : (f in fm) && (!(f in ft) || canon(fm[f]) >= canon(ft[f]));
    const v = ours ? fm[f] : ft[f];
    if (Math.max(tm, tt)) out.at[f] = Math.max(tm, tt);
    if (!(f in (ours ? fm : ft))) return;   // the winner has no such entry
    const dot = f.indexOf('.'), k = dot > 0 ? f.slice(0, dot) : f;
    if (dot > 0 && MAP_KEYS.includes(k)) out[k][f.slice(dot + 1)] = v; else out[f] = v;
  });
  return normalizeState(out);
}
// S as of the last save or merge: what save() compares against to see which fields just changed
let PREV = JSON.parse(JSON.stringify(S));
// Trackers saved before change times existed (or a sync reset) have none: when such a tracker still has unsent
// changes, every field that differs from D&D Beyond's numbers counts as changed now, so the merge keeps them.
if (!VIEW && ls.get(DIRTY) && !Object.keys(S.at).length) { PREV = freshState(); stampChanges(); }
// Give every field that changed since PREV a fresh change time (in S.at), then make S the new PREV.
function stampChanges(){
  const now = fieldsOf(S), was = fieldsOf(PREV);
  new Set([...Object.keys(now), ...Object.keys(was)]).forEach(f => { if (canon(now[f]) !== canon(was[f])) S.at[f] = tick(); });
  PREV = JSON.parse(JSON.stringify(S));
}
// Persists S locally now, and to the page db shortly after (debounced, pushPlay). Repaints the change list.
// A shared sheet (VIEW) saves nothing.
const save = () => {
  if (VIEW) { try { paintChanges(); } catch(_){} return; }
  stampChanges();
  ls.set(SKEY, S); ls.set(DIRTY, Date.now()); try { paintChanges(); } catch(_){}
  if (DB) { clearTimeout(remoteTimer); remoteTimer = setTimeout(pushPlay, 800); }
};
// Sends S to the db now. First it reads the db's current copy (when the db can: doc.get) and merges it in
// (takeRemote, §17), so the write carries what other devices saved meanwhile. If two writes still cross, each device
// merges the other's when it arrives and sends the result again (§17), so no change is lost. One write at a time: a
// save during a write sends again right after. The dirty mark is cleared only if no newer change came in meanwhile;
// offline the write fails, the mark stays, and going back online tries again.
let pushing = null, pushAgain = false;
function pushPlay(){
  clearTimeout(remoteTimer); remoteTimer = null;
  if (!DB || VIEW) return Promise.resolve();
  if (pushing) { pushAgain = true; return pushing; }
  const doc = DB.doc(PLAY_DOC), at = ls.get(DIRTY);
  pushing = (async () => {
    let now = null; try { if (doc.get) { const snap = await doc.get(); now = snap && snap.exists ? snap.data() : null; } } catch(_){}
    if (now && now.stamp === DATA.syncedAt) takeRemote(now);
    await doc.set(JSON.parse(JSON.stringify(S)));
    if (ls.get(DIRTY) === at) ls.set(DIRTY, 0);
  })().catch(() => {}).finally(() => { pushing = null; if (pushAgain) { pushAgain = false; pushPlay(); } });
  return pushing;
}
// back online with unsaved changes: push them
addEventListener('online', () => { if (ls.get(DIRTY)) save(); });

// UI prefs (this device only): tab, roll mode, dice set, card/section order, favourites, filters, last bardic die
let ui = ls.get(PACK.id+'-ui') || { tab: PACK.tabs[0][0], mode: 'adv' };
// persist UI prefs on this device
const saveUi = () => ls.set(PACK.id+'-ui', ui);

