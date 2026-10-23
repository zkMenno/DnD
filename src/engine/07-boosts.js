/* ============================================================================
   §7  BOOSTS — dice other people (or your own features) add to a roll: inspiration and blessings
   Defines: the boost bursts and FX.chk (added to FX from §5), chkEmoji / checkEmoji() (the check burst's emoji),
   BOOST_NAME, boostSum(), hasBoost(), boostLines(), addBoost(), inspDmg().
   Relies on: FX, fxParts, fx (§5), r (§4), ABIL_NAME (§1), D, $ (§2), S, save (§3), dieF, flipKeys (§6).
   At run time: cur, checkRoll, paintCur, paintCheck (§8), paintRes, paintUse (§10). Boosts live on the roll
   itself (x.boosts = [{k, s, v}]), so they vanish with it.
   ============================================================================ */
// ── Boost dice ─────────────────────────────────────────────────────────────────────────────────────────────
// a burst for each boost (addBoost plays 'bard' for the bardic die)
Object.assign(FX, {
  bard:     { d:700, html:() => '<span class="e twirl">🎵</span>'+fxParts('♪',7) },
  bless:    { d:700, html:() => '<span class="e twirl">🕊️</span>'+fxParts('✨',6) },
  guidance: { d:700, html:() => '<span class="e twirl">✨</span>'+fxParts('✦',7,'spark') },
  tactical: { d:700, html:() => '<span class="ring"></span><span class="e pulse">🧠</span>' }
});
// the emoji the check burst (FX.chk) shows; set by rollCheckMode() (§8) just before it plays
let chkEmoji = '🎲';
// a fitting emoji for each skill or tool check
const CHECK_EMOJI = {Perception:'👁️', Stealth:'👣', Insight:'🧐', Investigation:'🔍', Athletics:'💪', Acrobatics:'🤸', Persuasion:'🤝', Deception:'🎭', Intimidation:'😠', Performance:'🎻',
  'Sleight of Hand':'🪙', Arcana:'🔮', History:'📜', Nature:'🌿', Religion:'🕯️', Medicine:'🩹', Survival:'🧭', 'Animal Handling':'🐾', 'Thieves’ Tools':'🗝️', 'Herbalism Kit':'🌿', 'Dice Set':'🎲', 'Dice set':'🎲'};
// a raw ability check gets its ability's emoji (the same as on the Stats tab's Abilities card)
const CHECK_ABIL_EMOJI = {str:'💪', dex:'🤸', con:'❤️', int:'🧠', wis:'🦉', cha:'🎭'};
// emoji for a check label: "… save" → 🛡️, "Strength check" → its ability's, a skill or tool → CHECK_EMOJI, else 🎲
function checkEmoji(label){
  if (/ save$/.test(label)) return '🛡️';
  const m = label.match(/^(.+) check$/);
  if (m) { const a = Object.keys(ABIL_NAME).find(k => ABIL_NAME[k] === m[1]); return (a && CHECK_ABIL_EMOJI[a]) || '🎲'; }
  return CHECK_EMOJI[label] || '🎲';
}
// the burst before a check or save: a ring around chkEmoji
FX.chk = { d:750, html:() => '<span class="ring"></span><span class="e pulse">'+chkEmoji+'</span>'+fxParts('✦',6,'spark') };
// boost key → the label on its result-card line
const BOOST_NAME = {bless:'Bless', guidance:'Guidance', bardic:'Bardic', tactical:'Tactical Mind'};
// total of the boost dice on a roll
const boostSum = x => (x && x.boosts || []).reduce((a,b)=>a+b.v, 0);
// is this boost already on the roll?
const hasBoost = (x, k) => !!(x && x.boosts || []).find(b=>b.k===k);
// result-card breakdown lines, one per boost die on the roll
const boostLines = x => (x && x.boosts || []).map(b => '<div class="ln"><span class="lb">'+BOOST_NAME[b.k]+'</span><span class="dc">d'+b.s+'</span> '+dieF(b.v,'boost')+' added</div>').join('');
// Roll a boost die (k = bless / guidance / bardic / tactical, s = sides) onto the open check, or the open attack
// while it's still on the hit step. Each kind once per roll. Tactical Mind spends a Second Wind use first (and
// does nothing without one left). Plays the boost's burst, then repaints the card with the box kept open.
function addBoost(k, s){
  const tgt = checkRoll || (cur && cur.t && !cur.dmg ? cur : null); if (!tgt || hasBoost(tgt, k)) return;
  if (k==='tactical') { if (!D.secondWind || S.sw >= D.secondWind.max) return; S.sw++; save(); paintRes(); paintUse(); }
  const v = r(s); (tgt.boosts = tgt.boosts || []).push({k, s, v}); tgt.boostOpen = true; flipKeys.add('boost');
  fx(k==='bardic' ? 'bard' : k, () => { if (checkRoll) { paintCheck(true); flipKeys.clear(); } else paintCur(['hit']); }, [{s, v}]);
}
// Heroic Inspiration on damage: reroll the lowest damage die (weapon or rider dice) and keep the new roll.
// Uses up the inspiration (saved) and notes "old→new" on the damage card.
function inspDmg(){
  const d = cur && cur.dmg; if (!d || !S.insp) return;
  const all = d.wd.map((v,i)=>[d.wd,i,v,d.p.d,'wd']).concat(...Object.values(d.rid||{}).map(x => x.vals.map((v,i)=>[x.vals,i,v,x.die,'rid'])));
  const lo = all.reduce((a,b)=> b[2] < a[2] ? b : a); const nv = r(lo[3]);
  lo[0][lo[1]] = nv; d.insp = lo[2]+'→'+nv; S.insp = false; save(); paintRes(); paintUse();
  const c = $('#inspchip'); if (c) { c.className = 'chip ghost'; c.textContent = 'none yet'; }
  flipKeys.add(lo[4]); fx('insp', () => paintCur(['dmg']), [{s:lo[3], v:nv}]);
}
