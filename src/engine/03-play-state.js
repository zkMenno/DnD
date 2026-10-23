// ── §3 Play state: S, saved per device and to the page db; resets to D&D Beyond's numbers after each sync ───
// S is everything that changes at the table (HP, uses, spent items, coins, hit dice, added items). It is saved to
// localStorage at once (key SKEY) and to the page db doc PLAY_DOC 800 ms later; bootStore() (§17) connects the db and
// takes in changes from other devices. A sync (new DATA.syncedAt) starts S over from freshState().
// Defines: VIEW, SKEY, S, save, DIRTY, DB (set by bootStore), PLAY_DOC, ui + saveUi (this device's view prefs),
//   ARROW_N, HEAL_POTION, healPotion, COINS, freshState, normalizeState.
// Uses: DATA, D, RES, ADDED, keepAdded, mergeAdded, ls (§2); paintChanges (§10), called lazily from save().
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
    coins: Object.fromEntries(COINS.map(([k]) => [k, (DATA.currency||{})[k]||0])), coinLog: [], added: ADDED, active: {} };
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
// next load the stored copy must not overwrite it (bootStore pushes it instead), and going back online pushes it.
const DIRTY = SKEY + '-dirty';
// Persists S locally now, and to the page db shortly after (debounced). Repaints the change list.
// A shared sheet (VIEW) saves nothing. The dirty mark is cleared only if no newer change came in meanwhile.
const save = () => {
  if (VIEW) { try { paintChanges(); } catch(_){} return; }
  ls.set(SKEY, S); ls.set(DIRTY, Date.now()); try { paintChanges(); } catch(_){}
  if (DB) { clearTimeout(remoteTimer); remoteTimer = setTimeout(() => {
    const at = ls.get(DIRTY);
    DB.doc(PLAY_DOC).set(JSON.parse(JSON.stringify(S))).then(() => { if (ls.get(DIRTY) === at) ls.set(DIRTY, 0); }).catch(()=>{});
  }, 800); }
};
// back online with unsaved changes: push them
addEventListener('online', () => { if (ls.get(DIRTY)) save(); });

// UI prefs (this device only): tab, roll mode, dice set, card/section order, favourites, filters, last bardic die
let ui = ls.get(PACK.id+'-ui') || { tab: PACK.tabs[0][0], mode: 'adv' };
// persist UI prefs on this device
const saveUi = () => ls.set(PACK.id+'-ui', ui);

