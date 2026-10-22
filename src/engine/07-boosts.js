/* ============================================================================
   §7  BOOSTS — dice other people (or your own features) add to a roll: inspiration and blessings
   ============================================================================ */
Object.assign(FX, {
  bard:     { d:700, html:() => '<span class="e twirl">🎵</span>'+fxParts('♪',7) },
  bless:    { d:700, html:() => '<span class="e twirl">🕊️</span>'+fxParts('✨',6) },
  guidance: { d:700, html:() => '<span class="e twirl">✨</span>'+fxParts('✦',7,'spark') },
  tactical: { d:700, html:() => '<span class="ring"></span><span class="e pulse">🧠</span>' }
});
// a fitting emoji for each kind of check, shown before the dice roll
let chkEmoji = '🎲';
const CHECK_EMOJI = {Perception:'👁️', Stealth:'👣', Insight:'🧐', Investigation:'🔍', Athletics:'💪', Acrobatics:'🤸', Persuasion:'🤝', Deception:'🎭', Intimidation:'😠', Performance:'🎻',
  'Sleight of Hand':'🪙', Arcana:'🔮', History:'📜', Nature:'🌿', Religion:'🕯️', Medicine:'🩹', Survival:'🧭', 'Animal Handling':'🐾', 'Thieves’ Tools':'🗝️', 'Herbalism Kit':'🌿', 'Dice Set':'🎲', 'Dice set':'🎲'};
// emoji for a check/save label in the result card
function checkEmoji(label){ if (/ save$/.test(label)) return '🛡️'; if (/ check$/.test(label)) return '💪'; return CHECK_EMOJI[label] || '🎲'; }
FX.chk = { d:750, html:() => '<span class="ring"></span><span class="e pulse">'+chkEmoji+'</span>'+fxParts('✦',6,'spark') };
const BOOST_NAME = {bless:'Bless', guidance:'Guidance', bardic:'Bardic', tactical:'Tactical Mind'};
// total of the boost dice on a roll
const boostSum = x => (x && x.boosts || []).reduce((a,b)=>a+b.v, 0);
// is this boost already on the roll?
const hasBoost = (x, k) => !!(x && x.boosts || []).find(b=>b.k===k);
// result-card lines for each boost die
const boostLines = x => (x && x.boosts || []).map(b => '<div class="ln"><span class="lb">'+BOOST_NAME[b.k]+'</span><span class="dc">d'+b.s+'</span> '+dieF(b.v,'boost')+' added</div>').join('');
// roll a boost die (bless, guidance, bardic…) onto the current hit or check
function addBoost(k, s){
  const tgt = checkRoll || (cur && cur.t && !cur.dmg ? cur : null); if (!tgt || hasBoost(tgt, k)) return;
  if (k==='tactical') { if (!D.secondWind || S.sw >= D.secondWind.max) return; S.sw++; save(); paintRes(); paintUse(); }
  const v = r(s); (tgt.boosts = tgt.boosts || []).push({k, s, v}); tgt.boostOpen = true; flipKeys.add('boost');
  fx(k==='bardic' ? 'bard' : k, () => { if (checkRoll) { paintCheck(true); flipKeys.clear(); } else paintCur(['hit']); }, [{s, v}]);
}
// Heroic Inspiration on damage: reroll the lowest damage die
function inspDmg(){
  const d = cur && cur.dmg; if (!d || !S.insp) return;
  const all = d.wd.map((v,i)=>[d.wd,i,v,d.p.d,'wd']).concat(...Object.values(d.rid||{}).map(x => x.vals.map((v,i)=>[x.vals,i,v,x.die,'rid'])));
  const lo = all.reduce((a,b)=> b[2] < a[2] ? b : a); const nv = r(lo[3]);
  lo[0][lo[1]] = nv; d.insp = lo[2]+'→'+nv; S.insp = false; save(); paintRes(); paintUse();
  const c = $('#inspchip'); if (c) { c.className = 'chip ghost'; c.textContent = 'none yet'; }
  flipKeys.add(lo[4]); fx('insp', () => paintCur(['dmg']), [{s:lo[3], v:nv}]);
}
