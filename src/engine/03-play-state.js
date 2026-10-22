/* ============================================================================
   §3  PLAY STATE — S, per device + page db; resets to D&D Beyond values after each sync
   ============================================================================ */
// Web app: a sheet someone shared with you opens read-only (VIEW). It shows their live tracker, keeps nothing on
// this device (so it never mixes with your own tracker for the same character) and blocks every control that changes it.
const VIEW = !!(window.SHEET && window.SHEET.mine === false);
const SKEY = PACK.id+'-play-' + DATA.id + (VIEW ? '-view-'+window.SHEET.character.id : '');
// Consumables are counted one way: S.spent[item name] = how many were used at the table since the sync (negative when
// some were added), so what's left = the inventory quantity − spent. Arrows and healing potions work like any other item.
const ARROW_N = (DATA.inventory.find(i => /^Arrows?$/.test(i.name)) || {name:'Arrows'}).name;   // plain arrows, as D&D Beyond names them
// healing potions → their dice (2024 names and D&D Beyond's "Potion of Healing (Greater)" style)
const HEAL_POTION = { '':[2,4,2], greater:[4,4,4], superior:[8,4,8], supreme:[10,4,20] };
const healPotion = n => { const m = String(n).match(/^Potion of (?:(Greater|Superior|Supreme) )?Healing(?: \((Greater|Superior|Supreme)\))?$/i); return m ? HEAL_POTION[(m[1]||m[2]||'').toLowerCase()] : null; };
const COINS = [['pp','Platinum',1000],['gp','Gold',100],['ep','Electrum',50],['sp','Silver',10],['cp','Copper',1]];
// play state as D&D Beyond has it right now (the reset point)
function freshState(){
  return { stamp: DATA.syncedAt, hp: D.hpCur, temp: DATA.hp.temp, insp: DATA.inspiration,
    ...Object.fromEntries(RES.map(r => [r.key, r.used||0])),
    spent: {},
    hd: Object.fromEntries(D.hitDice.map(h => [h.cls, h.used])),
    coins: Object.fromEntries(COINS.map(([k]) => [k, (DATA.currency||{})[k]||0])), coinLog: [], added: ADDED, active: {} };
}
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
// fill gaps in saved state from older versions with fresh values
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
if (JSON.stringify(S.added) !== JSON.stringify(ADDED)) { ADDED = S.added; mergeAdded(); Object.assign(D, derive(DATA)); }
let remoteTimer = null, DB = null;
const PLAY_DOC = 'play/' + PACK.id;   // shared play state in the page's db (collection 'play' is in the db access rules)
// persist S locally now, and to the page db shortly after (debounced)
const save = () => { if (VIEW) { try { paintChanges(); } catch(_){} return; } ls.set(SKEY, S); try { paintChanges(); } catch(_){} if (DB) { clearTimeout(remoteTimer); remoteTimer = setTimeout(() => { DB.doc(PLAY_DOC).set(JSON.parse(JSON.stringify(S))).catch(()=>{}); }, 800); } };

// UI prefs (this device): tab, roll mode, dice set, card/section order, last bardic die
let ui = ls.get(PACK.id+'-ui') || { tab: PACK.tabs[0][0], mode: 'adv' };
// persist UI prefs on this device
const saveUi = () => ls.set(PACK.id+'-ui', ui);

