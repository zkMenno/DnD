/* ============================================================================
   §8  ROLL FLOW — hit first, then damage; checks and saves. Rerolls are buttons you choose to press.
   An attack: attackSetup() (mode step) → pickMode() → startAttack() (hit sheet) → rollDamage() (damage sheet), with
   riders (see Riders below) and boosts (§7) added from buttons on the cards. A check: rollCheck() → rollCheckMode().
   Defines: cur (the open attack) and checkRoll (the open check; only one is set at a time), the card builders and
   paint functions (paintCur, paintCheck), ob() / nb() / optRow() buttons, findW(), riders, AMMO and ammo helpers.
   Relies on: §4 dice and dock, §5 fx, §7 boosts, D / RES / MODS / WORD (§2), S / ui (§3), dieF / d20Dice / asDice /
   flipKeys (§6), G (§16, at run time), SPELL_W (§8b), ARROW_N (§3), arrowsLeft / invQty (§11, at run time).
   Every sheet is shown "veiled" (a ? for each die) first, and its numbers are written in once the dice land.
   ============================================================================ */
let cur = null, checkRoll = null;

// ── Hit and check cards: d20 lines and rerolls ─────────────────────────────────────────────────────────────
// a plain die value
const dieB = v => '<b class="die">'+v+'</b>';
// The "d20 [a, b] + bonus = total" line of a hit or check card. The die that counts is plain, the other is struck
// through; notes for advantage, disadvantage, Halfling Luck and Inspiration rerolls follow.
function d20Line(t, bonus, mode, label){
  const pickI = t.dice.length>1 && t.dice[0]===t.dice[1] ? 0 : t.dice.indexOf(t.pick);
  const dice = t.dice.map((v,i) => i===pickI ? dieF(v,'d20') : '<s class="die off'+(flipKeys.has('d20')?' flip':'')+'">'+v+'</s>').join(' ');
  const notes = [];
  if (mode==='adv') notes.push('Advantage: kept the higher die');
  if (mode==='dis') notes.push('Disadvantage: kept the lower die');
  if (t.luck.length) notes.push('Halfling Luck: '+esc(t.luck.join(', ')));
  if (t.insp) notes.push('Inspiration: '+esc(t.insp));
  return '<div class="ln"><span class="lb">'+esc(label||'To hit')+'</span><span class="dc">d20</span> '+dice+' <span class="mod">'+sgn(bonus)+'</span> = <b>'+(t.pick+bonus)+'</b>'+(notes.length?'<span class="rn">'+notes.join(' · ')+'</span>':'')+'</div>';
}
// the d20 line before the roll lands: one "?" per die
function d20Veil(n, bonus, label){
  return '<div class="ln"><span class="lb">'+esc(label||'To hit')+'</span><span class="dc">d20</span> '+Array(n).fill('<b class="die q">?</b>').join(' ')+' <span class="mod">'+sgn(bonus)+'</span> = <b>?</b></div>';
}
// which d20 counts for a mode
const pickOf = (dice, mode) => mode==='adv' ? Math.max(...dice) : mode==='dis' ? Math.min(...dice) : dice[0];
// superiority dice left
const sdLeft = () => D.superiorityDice ? D.superiorityDice.max - S.sd : 0;
// Halfling Luck applies: a natural 1 is showing and not yet rerolled
function canLuck(t){ return D.luck && t.pick===1 && t.dice.some((v,k)=>v===1 && !t.lucked.includes(k)); }
// Halfling Luck: reroll the 1 and keep the new die
function luckReroll(t, mode){
  const i = t.dice.findIndex((v,k)=>v===1 && !t.lucked.includes(k)); if (i<0) return;
  const n = r(20); t.luck.push('1→'+n); t.dice[i] = n; t.lucked.push(i); t.pick = pickOf(t.dice, mode);
}
// spend Heroic Inspiration to reroll the lowest d20 (saved; the header chip updates)
function inspReroll(t, mode){
  if (!S.insp) return;
  const i = t.dice.indexOf(Math.min(...t.dice)), old = t.dice[i], n = r(20);
  t.dice[i] = n; t.insp = old+'→'+n; t.pick = pickOf(t.dice, mode);
  S.insp = false; save(); paintRes();
  const c = $('#inspchip'); if (c) { c.className = 'chip ghost'; c.textContent = 'none yet'; }
}
// ── Inspiration & Blessings box ────────────────────────────────────────────────────────────────────────────
// The roll the box belongs to: the open check, else the open attack. The box is closed on every new roll and
// stays open (t.boostOpen) while you use it on this roll.
const boostTgt = () => checkRoll || cur;
// The collapsible "Inspiration & Blessings" box on hit and check cards. items: [button, text] pairs or {html};
// falsy items are dropped, and no items means no box.
function boostBox(items){
  items = items.filter(Boolean); if (!items.length) return '';
  const t = boostTgt();
  return '<details class="bd boosts'+(t && t.boostOpen?' isopen':'')+'"'+(t && t.boostOpen?' open':'')+'><summary><span class="optlb">Inspiration &amp; Blessings</span>'+(S.insp?'<span class="chip brass">⭐ ready</span>':'')+'<span class="chev" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="boostlist">'
    + items.map(x => x.html || '<div class="opt"><span class="od">'+x[1]+'</span>'+x[0]+'</div>').join('') + '</div></details>';
}
// a boost's name as a tappable term (its tooltip from the glossary, §16), plain bold when there's none
const bterm = n => '<b>'+(G[n] ? '<button type="button" class="term" data-term="'+esc(n)+'">'+esc(n)+'</button>' : esc(n))+'</b>';
// Heroic Inspiration row for the boost box: Reroll if you have it, ➕ Add if not (the DM just gave it), nothing once used on this roll
const inspItem = (act, what, used) => used ? null : S.insp
  ? [ob(act,'🎲 Reroll'), bterm('Heroic Inspiration')+': reroll your lowest '+what+'. Uses it up.']
  : [ob('inspgain','➕ Add'), bterm('Heroic Inspiration')+' from the DM? Add it, then reroll.'];
// Bless row for the boost box (save = word it for a saving throw)
const blessItem = save => [ob('boost','🎲 Roll d4',' data-k="bless" data-s="4"'), bterm('Bless')+': add a d4'+(save?' to this save':'')+'.'];
// Guidance row for the boost box
const guidanceItem = () => [ob('boost','🎲 Roll d4',' data-k="guidance" data-s="4"'), bterm('Guidance')+': add a d4.'];
// Bardic Inspiration row: pick the bard's die (d6–d12, default d8), then roll
function bardItem(){
  const s = ui.bardDie || 8;
  return { html: '<div class="opt bardopt"><span class="od">'+bterm('Bardic Inspiration')+': pick the bard’s die, then roll.</span></div>'
    + '<div class="bardrow"><div class="seg bardseg" role="group" aria-label="Bardic Inspiration die">'+[6,8,10,12].map(d=>'<button data-act="bardsel" data-s="'+d+'" aria-pressed="'+(d===s)+'">d'+d+'</button>').join('')+'</div>'
    + ob('boost','🎲 Roll d'+s,' data-k="bardic" data-s="'+s+'"')+'</div>' };
}
// pick the bardic die size (remembered on this device) and repaint the open card with the box open
function bardSel(s){ ui.bardDie = s; saveUi(); const t = boostTgt(); if (t) t.boostOpen = true; if (checkRoll) paintCheck(false); else if (cur) paintCur([]); }
// mark Heroic Inspiration gained (from the DM, a nat 20 house rule, etc.): saved, and the open card repaints
function inspGain(){
  S.insp = true; save(); paintRes(); paintUse();
  const c = $('#inspchip'); if (c) { c.className = 'chip brass'; c.textContent = '⭐ have it'; }
  const t = boostTgt(); if (t) t.boostOpen = true;
  if (checkRoll) return paintCheck(false); if (cur) paintCur([]);
}
// Animated expand / collapse for the boost box: the arrow turns while the list slides open or shut. The toggle
// listener after it records the open state on the roll, so a repaint keeps it.
document.addEventListener('click', e => {
  const sum = e.target.closest('details.boosts > summary'); if (!sum) return;
  e.preventDefault();
  const d = sum.parentElement, list = d.querySelector('.boostlist'), opening = !d.open;
  d.classList.toggle('isopen', opening);
  if (reduceMotion() || !list.animate) { d.open = opening; return; }
  if (opening) d.open = true;
  const full = list.scrollHeight;
  const a = list.animate([{height:(opening?0:full)+'px', opacity:opening?0:1, marginTop:opening?'0px':'8px'}, {height:(opening?full:0)+'px', opacity:opening?1:0, marginTop:opening?'8px':'0px'}], {duration:220, easing:'cubic-bezier(.2,.8,.2,1)'});
  list.style.overflow = 'hidden';
  a.onfinish = () => { list.style.overflow = ''; if (!opening) d.open = false; };
});
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('boosts')) { const t = boostTgt(); if (t) t.boostOpen = e.target.open; } }, true);
// ── Option buttons ─────────────────────────────────────────────────────────────────────────────────────────
// a labelled row of options on a result card: items are [button, text] pairs, falsy ones dropped ('' if none left)
function optRow(label, items){ items = items.filter(Boolean); return items.length ? '<div class="bd optrow">'+(label?'<span class="optlb">'+label+'</span>':'')+items.map(([b,t])=>'<div class="opt"><span class="od">'+t+'</span>'+b+'</div>').join('')+'</div>' : ''; }
// small option button (extra = more attributes, e.g. ' data-k="bless"')
const ob = (act, txt, extra) => '<button class="btn small" data-act="'+act+'"'+(extra||'')+'>'+txt+'</button>';
// primary "next step" button
const nb = (act, txt, extra) => '<button class="btn primary" data-act="'+act+'"'+(extra||'')+'>'+txt+'</button>';

// ── Attacks: mode step, hit, damage ────────────────────────────────────────────────────────────────────────
// Roll to hit with weapon (or spell attack) w. o: {mode, title, label, step, queue, n, sneak, savage, noMod}.
// Spends one piece of ammunition first (the picked magic ammo, else a plain arrow) and adds automatic hit riders.
// The empty sheet slides in, then the burst and dice play, then the numbers are written in (unless the card
// was closed or replaced meanwhile).
function startAttack(w, o){
  const am = !w.spell && w.ammoKind ? ammoPick(w) : null;
  if (am) {   // magic ammunition: its bonus joins the shot, its extra damage becomes a rider, and one is used up
    S.spent = Object.assign({}, S.spent, {[am.name]: ((S.spent||{})[am.name]||0) + 1}); save(); paintRes();
    w = Object.assign({}, w, { hit: w.hit + am.bonus, dmgMod: w.dmgMod + am.bonus, xdmg: (w.xdmg||[]).concat(am.xdmg.map(x => Object.assign({src: am.name}, x))), ammoName: am.name });
    o = Object.assign({}, o, { label: (o.label ? o.label+' · ' : '')+am.name });
  } else if (w.ranged && !w.spell && w.ammoKind === 'Arrow' && arrowsLeft() > 0){ S.spent = Object.assign({}, S.spent, {[ARROW_N]: ((S.spent||{})[ARROW_N]||0) + 1}); S.fired = (S.fired||0) + 1; save(); paintRes(); }
  const me = cur = { w, o, mode:o.mode, t:d20(o.mode), hrid:{}, dmg:null, veil:'hit' }; checkRoll = null;
  ridersFor(w, cur, 'hit').filter(x => x.auto).forEach(x => applyRider(x, true, 'hit'));   // Sacred Weapon and the like
  const k = w.spell ? (FX['el_'+String(w.dmgType||'').toLowerCase()] ? 'el_'+String(w.dmgType).toLowerCase() : 'spell') : w.ranged ? 'arrow' : 'slash', nat = cur.t.pick===20 ? 'crit' : cur.t.pick===1 ? 'fumble' : null;
  paintCur([], true, 'next');   // 1. the empty sheet slides in from the right
  afterSheet(() => fx(k, () => { if (cur !== me) return; me.veil = null; flipKeys.add('d20'); if (!$('#dock').hidden) paintCur(['hit'], false); }, d20Dice(me.t), nat));   // 2. animations, 3. write the roll in
}
// current attack total: d20 + weapon bonus + hit riders + boosts
const curHit = () => cur.t.pick + cur.w.hit + riderSum(cur.hrid) + boostSum(cur);
// current attack is a natural 20
const curCrit = () => !!cur.t && cur.t.pick===20;
// current damage total (weapon dice + modifier + damage riders)
const curDmg = () => { const d = cur.dmg; return sum(d.wd) + d.flat + riderSum(d.rid); };
// Roll damage for the current attack: variant 'two' uses the versatile die. Dice double on a crit; Great Weapon
// Fighting and automatic damage riders (Rage…) apply. Same veil → burst → numbers sequence as the hit.
function rollDamage(variant){
  const w = cur.w, mult = curCrit() ? 2 : 1;
  const p = parseDice(variant==='two' && w.versatile ? w.versatile : w.dice);
  cur.view = 'dmg';
  cur.dmg = { variant, p, mult, wdie:(p.n*mult)+'d'+p.d, wd:rollDice(p.n*mult, p.d), alt:null, flat: cur.o.noMod ? Math.min(0,w.dmgMod) : w.dmgMod, rid:{} };
  // Great Weapon Fighting: melee, held in two hands → 1s and 2s on the weapon dice count as 3
  cur.dmg.gwf = D.feats.includes('Great Weapon Fighting') && !w.ranged && !w.spell && (w.twoHanded || variant === 'two');
  if (cur.dmg.gwf) cur.dmg.raw = cur.dmg.wd.slice(), cur.dmg.wd = cur.dmg.wd.map(v => Math.max(3, v));
  ridersFor(w, cur, 'dmg').filter(x => x.auto).forEach(x => applyRider(x, true, 'dmg'));
  const me = cur; me.veil = 'dmg';
  paintCur([], false, 'next');
  afterSheet(() => fx(w.spell && FX['el_'+String(w.dmgType||'').toLowerCase()] ? 'el_'+String(w.dmgType).toLowerCase() : 'impact', () => { if (cur !== me) return; me.veil = null; flipKeys.add('wd'); if (!$('#dock').hidden) paintCur(['dmg'], false); }, asDice(me.dmg.wd, p.d), mult>1 ? 'crit' : null));
}
// Savage Attacker: roll the weapon dice again and keep the better set (once per damage roll)
function savageReroll(){
  const d = cur && cur.dmg; if (!d || d.alt) return;
  let alt = rollDice(d.p.n*d.mult, d.p.d); if (d.gwf) alt = alt.map(v => Math.max(3, v));
  if (sum(alt) > sum(d.wd)) { d.alt = d.wd; d.wd = alt; } else d.alt = alt;
  flipKeys.add('wd'); fx('savage', () => paintCur(['dmg']), asDice(alt, d.p.d));
}
// The attack sheet's HTML for its current step (cur.view: hit, or damage once rolled). anim lists the totals
// ('hit', 'dmg') written in fresh this time. The hidden [data-flow] marker tells rollView that an attack card is up.
function curSheetHtml(anim){
  const c = cur, w = c.w, o = c.o, d = c.dmg;
  const view = (c.view==='hit' && c.t) || !d ? 'hit' : 'dmg';
  const modeTxt = c.t && view==='hit' ? (c.mode==='adv'?' · advantage':c.mode==='dis'?' · disadvantage':'') : '';
  let h = '<span hidden data-flow></span><div class="head"><span class="title">'+esc((o.title||w.name)+modeTxt)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>';
  const veil = c.veil === view;   // veil: the sheet is up, the dice aren't rolled yet
  if (view==='hit') {
    h += '<div class="stepnote hitc"><b>🎯 Step 1 · Did it hit?</b> Meet or beat the target’s AC.'+(veil?'':curCrit()?'<br>A natural 20 always hits.':c.t.pick===1?'<br>A natural 1 always misses.':'')+'</div>';
    if (o.label) h += '<div class="sub">'+esc(o.label)+(o.step?' · '+o.step:'')+'</div>';
    h += '<div class="nums"><span class="n hitn'+(anim.includes('hit')?'':' still')+'">'+(veil?'?':curHit())+'<small>to hit vs AC</small></span>'
      + (veil ? '' : curCrit() ? '<span class="flag">⚓ Natural 20: a crit!</span>' : c.t.pick===1 ? '<span class="flag">☠️ Natural 1: a miss</span>' : '') + '</div>';
    let bd = veil ? d20Veil(c.t.dice.length, w.hit) : d20Line(c.t, w.hit, c.mode);
    bd += riderLines(c.hrid);
    bd += boostLines(c);
    h += '<div class="bd hitl">'+bd+'</div>';
    if (veil) { /* options appear once the roll is in */ }
    else if (!d) {
      h += optRow('Rerolls', [canLuck(c.t) && [ob('luck','🍀 Halfling Luck'), 'Rolled a 1? Reroll it once and take the new roll.']]);
      h += riderRows(w, c, 'hit');
      h += boostBox([inspItem('inspre','d20'), !hasBoost(c,'bless') && blessItem(), !hasBoost(c,'bardic') && bardItem()]);
      const more = o.queue && o.queue.length;
      h += '<div class="nextrow navrow"><button class="btn" data-act="'+(more?'nextatk':'close')+'">'+(more?'Missed · next →':'✕ Missed')+'</button><span class="dmgbtns">'+(w.versatile ? nb('rolldmg','💥 One-handed',' data-v="main"')+nb('rolldmg','💥 Two-handed',' data-v="two"') : nb('rolldmg','💥 Roll damage',' data-v="main"'))+'</span></div>';
    } else {
      h += '<div class="nextrow navrow"><span></span><button class="btn" data-act="rollview" data-v="dmg">'+navLabel('next','Damage roll')+'</button></div>';
    }
  } else {
    h += '<div class="stepnote dmgc"><b>💥 '+(c.t?'Step 2 · ':'')+'Damage</b> Only if it hit.</div>';
    if (o.label) h += '<div class="sub">'+esc(o.label)+(o.step?' · '+o.step:'')+'</div>';
    h += '<div class="nums"><span class="n dmgn'+(anim.includes('dmg')?'':' still')+'">'+(veil?'?':curDmg())+'<small>'+(dmgIcon(w.dmgType) ? dmgIcon(w.dmgType)+' ' : '')+'<button type="button" class="term dt" data-term="'+esc(dmgTerm(w.dmgType))+'">'+esc((w.dmgType||'damage').toLowerCase())+'</button>'+(Object.values(d.rid||{}).some(x => x.type && x.type.toLowerCase() !== String(w.dmgType||'').toLowerCase() && (x.vals.length || x.flat)) ? ' + more' : ' damage')+'</small></span>'
      + (curCrit() ? '<span class="flag">⚓ Crit: dice doubled</span>' : '') + '</div>';
    if (veil) {
      h += '<div class="bd dmgl"><div class="ln"><span class="lb">'+esc(d.variant==='two'?'Two-handed':w.name)+'</span><span class="dc">'+d.wdie+'</span> '+d.wd.map(()=>'<b class="die q">?</b>').join(' + ')+' <span class="mod">'+sgn(d.flat)+'</span> = <b>?</b></div></div>';
      return h;
    }
    let bd = '<div class="ln hang"><span class="lb">'+esc(d.variant==='two'?'Two-handed':w.name)+'</span><span class="lnv"><span class="dc">'+d.wdie+'</span> '+d.wd.map(v=>dieF(v,'wd')).join(' + ')+' <span class="mod">'+sgn(d.flat)+'</span> = <b>'+(sum(d.wd)+d.flat)+'</b></span>'
      + (d.alt ? '<span class="rn">Savage Attacker: rerolled, kept '+sum(d.wd)+' over '+sum(d.alt)+'</span>' : '') + '</div>';
    if (d.gwf && d.raw && d.raw.some(v => v < 3)) bd += '<div class="ln"><span class="rn lnote" style="padding-left:0;flex-basis:auto">Great Weapon Fighting: rolled '+d.raw.join(', ')+', the 1s and 2s count as 3</span></div>';
    bd += riderLines(d.rid);
    if (d.insp) bd += '<div class="ln"><span class="lb">Inspiration</span><span class="rn lnote" style="padding-left:0;flex-basis:auto">rerolled a die: '+esc(d.insp)+'</span></div>';
    h += '<div class="bd dmgl">'+bd+'</div>';
    h += riderRows(w, c, 'dmg');
    h += optRow('Rerolls', [D.savage && o.savage!==false && !d.alt && [ob('savage','🪓 Savage Attacker'), 'Reroll the weapon dice and keep the better. Once per turn.']]);
    h += boostBox([inspItem('inspdmg','damage die', d.insp)]);
    const next = o.queue && o.queue.length ? nb('nextatk','Next: '+esc(o.queue[0].label)+' →') : '<button class="btn done" data-act="close">'+WORD.ok+'</button>';
    h += '<div class="nextrow navrow">'+(c.t ? '<button class="btn" data-act="rollview" data-v="hit">'+navLabel('back','Hit roll')+'</button>' : '<span></span>')+next+'</div>';
  }
  return h;
}
// redraw the attack card for its current step; fresh = a new sheet rather than a repaint, trans = how it slides in
function paintCur(anim, fresh, trans){ const h = curSheetHtml(anim); showRoll(h, !fresh, trans); flipKeys.clear(); }
// The sheet beside this one in the flow (left swipe = next, right = previous), for the swipe peek; null if none.
function rollPeek(dir){
  if (!cur || cur.veil || !$('#dock .roll [data-flow]')) return null;
  const now = (cur.view==='hit' && cur.t) || !cur.dmg ? 'hit' : 'dmg', v = dir==='left' ? 'dmg' : 'hit';
  if (v===now || (v==='hit' && !cur.t) || (v==='dmg' && !cur.dmg)) return null;
  const keep = cur.view; cur.view = v; const h = curSheetHtml([]); cur.view = keep; return h;
}
// Switch between the hit and damage steps without rerolling (v = 'hit' / 'dmg'). Returns false when there's
// nothing to switch to, so a swipe can rubber-band instead.
function rollView(v){
  if (!cur || !$('#dock .roll [data-flow]')) return false;
  if (v==='hit' && !cur.t) return false;
  if (v==='dmg' && !cur.dmg) return false;
  const now = (cur.view==='hit' && cur.t) || !cur.dmg ? 'hit' : 'dmg';
  if (now===v) return false;
  cur.view = v; paintCur([], false, v==='hit' ? 'prev' : 'next');
  return true;
}
// swipe direction → step: right = back to the hit, left = on to the damage
function rollNav(dir){ return dir==='right' ? rollView('hit') : rollView('dmg'); }
// ── How are you rolling? (advantage · normal · disadvantage) ────────────────────────────────────────────────
// The three option cards say only the mode and one plain line of what to roll, so they stay two lines. This roll's
// own reasons for advantage / disadvantage go in tooltips, opened from one line under the cards ("When might you
// have advantage or disadvantage?"): glossary entries made for this roll, keyed "When: <mode> · <what>".
const MODE_PLAIN = { adv: 'Roll two d20s, keep the higher one.', norm: 'Roll one d20.', dis: 'Roll two d20s, keep the lower one.' };
// One option card. act + attrs: the card's data-act and data-* attributes (attacks and checks differ).
const modeOpt = (m, icon, t, act, attrs) => '<button class="restopt atkopt '+m+(m==='norm'?' last':'')+'" data-act="'+act+'" data-m="'+m+'"'+attrs+'><b>'+icon+' '+t+'</b><span>'+MODE_PLAIN[m]+'</span></button>';
// The line under the cards: the reasons (". "-separated text per mode) as tooltips for this roll (what).
function modeWhen(what, advWhy, disWhy){
  const term = (t, why) => { const r = String(why || '').split(/\.\s+|\.$/).map(x => x.trim()).filter(Boolean); if (!r.length) return '';
    const key = 'When you have '+t.toLowerCase(); G[key] = [t, '**When you might have '+t.toLowerCase()+' here:**\n'+r.map(x => '• '+x).join('\n')];
    return '<button type="button" class="term" data-term="'+esc(key)+'">'+t.toLowerCase()+'</button>'; };
  const a = term('Advantage', advWhy), d = term('Disadvantage', disWhy);
  return a || d ? '<p class="small atkwhen">When might you have '+[a, d].filter(Boolean).join(' or ')+'?</p>' : '';
}
// Step 0 for an attack: pick how you roll (advantage / normal / disadvantage, with reasons that fit this weapon),
// and the ammunition when there's magic ammo for it. One tap on a mode rolls (pickMode). Clears any open roll.
function attackSetup(name, again){
  const w = findW(name); if (!w) return;
  cur = null; checkRoll = null;
  const am = ammoChoices(w), pick = ammoPick(w);
  // Normal is highlighted as the usual pick; Disadvantage gets its own warning colour
  const opt = (m, icon, t) => modeOpt(m, icon, t, 'atkmode', ' data-w="'+esc(w.name)+'"');
  const advWhy = w.spell ? 'Hidden, or the target can’t see you' : [MODS.map(m => m.advNote ? m.advNote(w) : '').filter(Boolean).join('. '), 'Hidden, or the target can’t see you', w.mastery === 'Vex' ? 'Vex from your last hit on this target' : ''].filter(Boolean).join('. ')+(saOK(w)?'. Sneak Attack is on.':'');
  const disWhy = w.spell ? (w.ranged ? 'An enemy within 1.5 m of you' : 'You can’t see the target') : 'Beyond normal range, or an enemy within 1.5 m of you'+(saOK(w)?'. No Sneak Attack.':'');
  showRoll('<div class="head"><span class="title">'+esc(w.name)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + (am.length ? '<div class="ammopick"><span class="optlb">🏹 Ammunition</span><div class="chips">'
        + [{name:'', label:'Plain '+w.ammoKind.toLowerCase()+'s', left: w.ammoKind === 'Arrow' ? arrowsLeft() : null}].concat(am.map(a => ({name:a.name, label:a.name, left:a.left})))
          .map(a => '<button class="chip toggle'+((pick ? pick.name : '') === a.name ? ' on' : '')+'" data-act="ammo" data-w="'+esc(w.name)+'" data-n="'+esc(a.name)+'" aria-pressed="'+((pick ? pick.name : '') === a.name)+'"'+(a.left === 0 ? ' disabled' : '')+'>'+esc(a.label)+(a.left != null ? ' <span class="cost">'+a.left+'</span>' : '')+'</button>').join('')
        + '</div>'+(pick ? '<p class="small" style="margin:6px 0 0">'+ammoNote(pick)+'</p>' : '')+'</div>' : '')
    + '<div class="stepnote"><b>🎲 How are you rolling?</b> Tap one to roll to hit.</div>'
    + '<div class="restpick atkpick">'
    + opt('adv','⬆️','Advantage') + opt('norm','🎯','Normal') + opt('dis','⬇️','Disadvantage')
    + '</div>' + modeWhen(w.name, advWhy, disWhy)
    , again);
}
// ── Magic ammunition ───────────────────────────────────────────────────────────────────────────────────────
// Magic ammunition this weapon can shoot (+1/+2 arrows, Arrow of Slaying…), with how many are left:
// [{name, bonus, xdmg, left}], one per item name. Plain ammunition isn't listed.
function ammoChoices(w){
  if (!w || !w.ammoKind) return [];
  const re = new RegExp('\\b'+w.ammoKind+'s?\\b', 'i'), seen = new Set();
  return (DATA.inventory||[]).filter(i => re.test(i.name) && ((i.bonus||0) > 0 || (i.xdmg||[]).length) && !seen.has(i.name) && seen.add(i.name))
    .map(i => ({ name:i.name, bonus:i.bonus||0, xdmg:i.xdmg||[], left: Math.max(0, invQty(i.name) - ((S.spent||{})[i.name]||0)) }));
}
let AMMO = {};   // weapon name → the magic ammunition picked for it (this visit, not saved)
// the magic ammunition picked for this weapon, or null (none picked, or none of it left)
const ammoPick = w => { const n = AMMO[w.name]; return n ? ammoChoices(w).find(a => a.name === n && a.left > 0) || null : null; };
// one line on what the picked ammunition does
const ammoNote = a => (a.bonus ? '+'+a.bonus+' to hit and damage. ' : '')+(a.xdmg.length ? 'Extra '+a.xdmg.map(x => x.dice+' '+x.type.toLowerCase()).join(' + ')+' to add on the damage step (see the item for when it counts). ' : '')+'One is used up per shot.';
// a mode was picked on the mode step: roll to hit. Weapons can add Sneak Attack and Savage Attacker; spells can't.
function pickMode(m, name){
  const w = findW(name); if (!w) return;
  // spells with several beams / rays (Eldritch Blast, Scorching Ray) queue one attack per beam
  if (w.spell) { const n = w.beams || 1, s1 = {w, mode:m, sneak:false, savage:false, label:w.name+(n > 1 ? ' · '+w.beamWord : '')};
    return startAttack(w, n > 1 ? {...s1, title:w.name, queue: Array.from({length:n-1}, () => s1), step:'1 of '+n, n} : s1); }
  startAttack(w, {mode:m, sneak:true, savage:true});
}
// a weapon by name, or a spell attack set up by castSpell()
const findW = name => D.weapons.find(x=>x.name===name) || SPELL_W[name];
// ── Riders ─────────────────────────────────────────────────────────────────────────────────────────────────
/* Riders: extras on an attack, from the class modules (#classes) and the weapon itself.
   Two kinds, same shape and the same buttons:
     'hit'  hitRiders(w, c) → added to the attack roll (Precision Attack, Sacred Weapon); shown on the hit step
     'dmg'  riders(w, c)    → extra damage on a hit (Sneak Attack, Rage, Divine Smite…); shown on the damage step
   A rider: { key, label, short, emoji, dice:'1d8', flat, type, note, after, once:'turn', cost:{key, n}, group, auto, pri, fx }
   auto: added by itself as the roll is made (Rage, Sacred Weapon); cost: spent from a resource when added, given back
   when removed; group: only one of the group at a time (Divine Smite at different slot levels). Damage dice double on a crit. */
// every rider of one kind this attack could take, by pri; damage riders also get the weapon's own extra dice (xdmg)
function ridersFor(w, c, kind){
  const hook = kind === 'hit' ? 'hitRiders' : 'riders';
  const list = MODS.flatMap(m => m[hook] ? (m[hook](w, c) || []) : []).filter(Boolean).sort((a, b) => (a.pri||0) - (b.pri||0));
  if (kind !== 'hit') (w.xdmg||[]).forEach((x, i) => list.push({ key:'item'+i, label: x.src || w.name, emoji:'✨', dice: x.dice, type: x.type,
    note: '+'+x.dice+' '+x.type.toLowerCase()+' from '+esc(x.src || w.name)+(x.src ? ', if it counts against this target (see the item).' : ', when its magic is on (see the item).') }));
  return list;
}
// where a kind of rider lives on the current attack: cur.hrid (hit) or cur.dmg.rid (damage)
const riderBox = kind => !cur ? null : kind === 'hit' ? (cur.hrid = cur.hrid || {}) : cur.dmg ? cur.dmg.rid : null;
// Add a rider to the current roll: spends its cost (not if there isn't enough), drops others in its group, rolls its
// dice (doubled for damage on a crit). quiet = no animation or repaint (automatic riders while the sheet is built).
function applyRider(x, quiet, kind){
  const box = riderBox(kind); if (!box || box[x.key]) return;
  if (x.cost) { const rr = resBy(x.cost.key); if (!rr || rr.max - S[rr.key] < x.cost.n) return; S[rr.key] += x.cost.n; save(); paintRes(); paintUse(); }
  if (x.group) Object.values(box).filter(y => y.group === x.group).forEach(y => dropRider(y.key, kind));
  const p = parseDice(x.dice || ''), vals = p.n ? rollDice(p.n * (kind === 'hit' ? 1 : cur.dmg.mult), p.d) : [];
  box[x.key] = { key:x.key, label:x.label, emoji:x.emoji||'➕', die:p.d, vals, flat:x.flat||0, type:x.type||'', cost:x.cost||null, group:x.group||null, after:x.after||'' };
  if (quiet) return;
  if (kind === 'hit') cur.view = 'hit';
  flipKeys.add('rid'); fx(x.fx || null, () => paintCur([kind === 'hit' ? 'hit' : 'dmg']), asDice(vals, p.d));
}
// take a rider off the current roll and give its cost back
function dropRider(k, kind){
  const box = riderBox(kind), x = box && box[k]; if (!x) return;
  if (x.cost) { S[x.cost.key] = Math.max(0, S[x.cost.key] - x.cost.n); save(); paintRes(); paintUse(); }
  delete box[k];
}
// rider button: add it, or remove it if it's on
function toggleRider(k, kind){
  const box = riderBox(kind); if (!box) return;
  if (box[k]) { dropRider(k, kind); return paintCur([]); }
  const x = ridersFor(cur.w, cur, kind).find(y => y.key === k); if (x) applyRider(x, false, kind);
}
// total a set of riders adds (dice + flat)
const riderSum = box => Object.values(box||{}).reduce((t,x) => t + sum(x.vals) + (x.flat||0), 0);
// one breakdown line per rider on the roll (label on the left; dice, total and type on the right: when they wrap,
// the next line stays indented under the dice)
const riderLines = box => Object.values(box||{}).map(x => '<div class="ln rid hang"><b class="lb">'+x.emoji+' '+esc(x.label)+'</b><span class="lnv">'+(x.vals.length ? '<span class="dc">'+x.vals.length+'d'+x.die+'</span> '+x.vals.map(v=>dieF(v,'rid')).join(' + ')+(x.flat ? ' <span class="mod">'+sgn(x.flat)+'</span>' : '') : '<span class="mod">'+(x.flat ? sgn(x.flat) : '')+'</span>')+(x.vals.length || x.flat ? ' = <b>'+(sum(x.vals)+(x.flat||0))+'</b>' : '')+(x.type ? ' <span class="dtype">'+esc(x.type.toLowerCase())+'</span>' : '')+'</span>'+(x.after ? '<span class="rn lnote">'+x.after+'</span>' : '')+'</div>').join('');
// The option rows for one kind of rider ("Add to the roll" / "Extra damage"): add or ✕ Remove, with what's left of
// its resource. A rider you can't afford is hidden unless it's already on.
function riderRows(w, c, kind){
  const box = riderBox(kind) || {}, list = ridersFor(w, c, kind); if (!list.length) return '';
  const mult = kind === 'hit' ? 1 : c.dmg.mult;
  const rows = list.map(x => { const on = !!box[x.key], rr = x.cost && resBy(x.cost.key), left = rr ? rr.max - S[rr.key] : null;
    if (!on && rr && left < x.cost.n) return null;
    const dice = x.dice ? (mult > 1 ? x.dice.replace(/^(\d+)/, n => n*mult) : x.dice) : '';
    return [on ? ob('rider','✕ Remove',' data-k="'+esc(x.key)+'" data-kind="'+kind+'"') : ob('rider', (x.emoji||'➕')+' '+esc(x.short||x.label)+(dice ? ' +'+dice : x.flat ? ' '+sgn(x.flat) : ''), ' data-k="'+esc(x.key)+'" data-kind="'+kind+'"'),
      '<b>'+esc(x.label)+'</b>'+(x.once ? ' <span class="sa1">· once per '+x.once+'</span>' : '')+'<br>'+x.note+(rr ? ' <span class="rleft">('+left+' '+(rr.spell ? 'lvl '+rr.slotLevel+' slot'+(left===1?'':'s') : esc(rr.unit[left===1?0:1]))+' left)</span>' : '')]; });
  return optRow(kind === 'hit' ? 'Add to the roll' : 'Extra damage', rows);
}
// can this weapon deliver Sneak Attack?
const saOK = w => D.sneakDice && !w.spell && (w.ranged || w.finesse);
// move on to the next queued attack of a combo or a multi-beam spell, keeping the title and "n of m" count
function nextAttack(){
  const q = cur && cur.o.queue; if (!q || !q.length) return;
  const [s, ...rest] = q;
  startAttack(s.w, {...s, title:cur.o.title, queue:rest, step:(cur.o.n - rest.length)+' of '+cur.o.n, n:cur.o.n});
}
// ── Checks and saves ───────────────────────────────────────────────────────────────────────────────────────
// Commanding Presence: spend a superiority die and add it to the open check, once per check. 'commanding' is the
// only kind left (Precision and Menacing are riders now).
function useManeuver(kind){
  if (sdLeft()<=0) return;
  const roll = r(+D.superiorityDice.die.slice(1));
  if (kind==='commanding'){ if (!checkRoll || checkRoll.cmd) return; S.sd++; save(); paintRes(); checkRoll.cmd = roll; return fx('commanding', () => paintCheck(true), [{s:+D.superiorityDice.die.slice(1), v:roll}]); }
}
// Step 0 for an ability check, save, skill or tool (label, bonus): pick how you roll, with reasons that fit a check,
// a save or initiative. One tap picks the mode and rolls (rollCheckMode). Normal is highlighted.
function rollCheck(label, bonus){
  cur = null; checkRoll = null;
  const save = / save$/.test(label), init = label==='Initiative';
  const why = init ? ['Invisible, or a feature says so','No edge either way','Surprised']
    : save ? ['Brave vs Frightened, or a feature says so','No edge either way','Restrained (Dex saves), or a feature says so']
    : ['An ally helps, or a feature says so','No edge either way','Frightened or Poisoned'];
  const opt = (m, icon, t) => modeOpt(m, icon, t, 'chkmode', ' data-l="'+esc(label)+'" data-b="'+bonus+'"');
  showRoll('<div class="head"><span class="title">'+esc(label)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + '<div class="stepnote"><b>🎲 How are you rolling?</b> Roll d20 '+sgn(bonus)+'</div>'
    + '<div class="restpick atkpick">'+opt('adv','⬆️','Advantage')+opt('norm','🎯','Normal')+opt('dis','⬇️','Disadvantage')+'</div>'+modeWhen(label, why[0], why[2]));
}
// roll the check with the picked mode: veiled sheet, then the check (or initiative) burst and dice, then the total
function rollCheckMode(label, bonus, mode){
  cur = null;
  const me = checkRoll = { label, bonus, mode, t:d20(mode), cmd:0, veil:true };
  chkEmoji = checkEmoji(label);
  paintCheck(false, true, 'next');
  afterSheet(() => fx(label==='Initiative' ? 'init' : 'chk', () => { if (checkRoll !== me) return; me.veil = false; flipKeys.add('d20'); if (!$('#dock').hidden) paintCheck(true, false); flipKeys.clear(); }, d20Dice(me.t), me.t.pick===20 ? 'crit' : me.t.pick===1 ? 'fumble' : null));
}
// let the incoming sheet settle (340 ms) before the action animation covers it
const afterSheet = go => setTimeout(go, reduceMotion() ? 0 : 340);
// Redraw the check card (veiled: "?" until the dice land). animate = the total was just written in; class modules
// can add rows (checkRows, e.g. Commanding Presence); saves offer Bless, other checks Guidance.
function paintCheck(animate, fresh, trans){
  const k = checkRoll;
  const total = k.t.pick + k.bonus + k.cmd + boostSum(k), isSave = / save$/.test(k.label);
  showRoll('<div class="head"><span class="title">'+esc(k.label)+(k.mode==='adv'?' · advantage':k.mode==='dis'?' · disadvantage':'')+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + '<div class="nums"><span class="n'+(animate?'':' still')+'">'+(k.veil?'?':total)+'<small>total</small></span>'+(k.veil?'':k.t.pick===20?'<span class="flag">⚓ Natural 20</span>':k.t.pick===1?'<span class="flag">☠️ Natural 1</span>':'')+'</div>'
    + '<div class="bd">'+(k.veil ? d20Veil(k.t.dice.length, k.bonus, 'Roll') : d20Line(k.t, k.bonus, k.mode, 'Roll'))
      + (k.cmd ? '<div class="ln"><span class="lb">Commanding</span><span class="dc">'+D.superiorityDice.die+'</span> '+dieB(k.cmd)+' added → <b>'+total+'</b></div>' : '') + boostLines(k) + '</div>'
    + (k.veil ? '' : optRow('Rerolls', [canLuck(k.t) && [ob('luck','🍀 Halfling Luck'), 'Rolled a 1? Reroll it once and take the new roll.']])
    + MODS.flatMap(m => m.checkRows ? m.checkRows(k) : []).join('')
    + boostBox([inspItem('inspre','d20'), isSave ? !hasBoost(k,'bless') && blessItem(true) : !hasBoost(k,'guidance') && guidanceItem(), !hasBoost(k,'bardic') && bardItem()])
    + '<div class="nextrow"><button class="btn done" data-act="close">'+WORD.ok+'</button></div>'), !fresh, trans);
}
// the d20 that now counts, as one die for the reroll animation
const newD20 = t => [{s:20, v: t.pick}];
// Halfling Luck on whichever card is open (check or hit): reroll, play 🍀, repaint
function doLuck(){ const t = checkRoll ? checkRoll.t : cur && cur.t; if (!t) return; luckReroll(t, checkRoll ? checkRoll.mode : cur.mode); flipKeys.add('d20');
  if (checkRoll) return fx('luck', () => { paintCheck(true); flipKeys.clear(); }, newD20(t)); fx('luck', () => paintCur(['hit']), newD20(t)); }
// Heroic Inspiration on whichever card is open (check or hit): reroll the lowest d20, play ⭐, repaint
function doInsp(){ const t = checkRoll ? checkRoll.t : cur && cur.t; if (!t) return; inspReroll(t, checkRoll ? checkRoll.mode : cur.mode); flipKeys.add('d20');
  if (checkRoll) return fx('insp', () => { paintCheck(true); flipKeys.clear(); }, newD20(t)); fx('insp', () => paintCur(['hit']), newD20(t)); }

