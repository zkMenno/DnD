/* ============================================================================
   §5  ACTION ANIMATIONS — a short burst over the middle of the screen, then the dice, then the result
   ============================================================================ */
let fxBusy = false;
let HEAL_WORD = '';   // the "+12 HP" the hearts burst shows
// n particles thrown outward from the centre (for the burst animations)
const fxParts = (ch, n, cls) => Array.from({length:n}, (_,i) => { const a = (i/n)*Math.PI*2 + Math.random()*.5, d = 70 + Math.random()*60;
  return '<span class="p '+(cls||'')+'" style="--dx:'+Math.round(Math.cos(a)*d)+'px;--dy:'+Math.round(Math.sin(a)*d)+'px;--dl:'+Math.round(Math.random()*120)+'ms">'+ch+'</span>'; }).join('');
// damage-type icons, used on weapons, spells, filters and the roll animations
const DMG_ICON = {fire:'🔥', cold:'❄️', lightning:'🌩️', thunder:'🔊', acid:'🧪', poison:'☣️', necrotic:'💀', radiant:'☀️', psychic:'🌀', force:'💫', bludgeoning:'🔨', piercing:'🗡️', slashing:'🪓'};
// emoji for a damage type
const dmgIcon = t => DMG_ICON[String(t||'').toLowerCase().split(/[ /]/)[0]] || '';
// damage type as a tappable term with its icon
const dmgTag = t => t ? '<span class="dtag">'+dmgIcon(t)+' '+esc(String(t).toLowerCase())+'</span>' : '';
// the main element of a spell (healing counts as its own)
const spellEl = x => x.heal ? 'heal' : ((x.dmg||[])[0]||{}).type || '';
// emoji for a spell: healing, its element, attack or generic
const spellIcon = x => x.heal ? '💚' : dmgIcon(spellEl(x)) || (x.attack ? '🎯' : (x.dmg||[]).length ? '💥' : '✨');
const FX = {
  arrow:   { d:900, html:() => '<span class="e bow">🏹</span><span class="streak"></span><span class="e tgt">🎯</span>' },
  slash:   { d:850, html:() => '<span class="arc"></span><span class="e blade">🗡️</span>' },
  spell:   { d:800, html:() => '<span class="e twirl">✨</span>'+fxParts('✦',8,'spark') },
  heal:    { d:800, html:() => '<span class="e twirl">💚</span>'+fxParts('✚',8,'spark') },
  impact:  { d:800, html:() => '<span class="e boom">💥</span>'+fxParts('✦',8,'spark') },
  crit:    { d:1100,html:() => '<span class="rays"></span><span class="e boom">'+WORD.critIcon+'</span><span class="word">CRIT!</span>'+fxParts('✦',12,'spark') },
  fumble:  { d:900, html:() => '<span class="e wob">☠️</span>' },
  d20:     { d:850, html:() => '<span class="e spin">'+DIE_SVG.replace('width="30" height="30"','width="120" height="120"')+'</span>' },
  init:    { d:750, html:() => '<span class="e flash">⚡</span>'+fxParts('✦',6,'spark') },
  luck:    { d:700, html:() => '<span class="e twirl">🍀</span>'+fxParts('✨',5) },
  insp:    { d:750, html:() => '<span class="e twirl">⭐</span>'+fxParts('✨',8) },
  savage:  { d:700, html:() => '<span class="e chop">🪓</span>'+fxParts('✦',6,'spark') },
  precision:{d:700, html:() => '<span class="ring"></span><span class="e zoom">🎯</span>' },
  menacing:{ d:750, html:() => '<span class="e shake">👹</span>' },
  commanding:{d:750,html:() => '<span class="ring"></span><span class="ring r2"></span><span class="e pulse">🗣️</span>' },
  oil:     { d:950, html:() => '<span class="e toss">🫗</span><span class="e flame">🔥</span>'+fxParts('🔥',5,'late') },
  rations: { d:800, html:() => '<span class="e chomp">🍞</span>'+fxParts('•',7,'crumb late') },
  candle:  { d:850, html:() => '<span class="halo"></span><span class="e flick">🕯️</span>' },
  bearings:{ d:850, html:() => '<span class="e drop">👝</span>'+fxParts('⚪',12,'late') },
  potion:  { d:950, html:() => '<span class="e tilt">🧪</span>'+fxParts('💚',6,'rise late') },
  hearts:  { d:1300, html:() => '<span class="e beat">❤️</span>'+fxParts('❤️',9,'rise late')+'<span class="word heal">'+esc(HEAL_WORD)+'</span>' },
  wind:    { d:900, html:() => '<span class="e sweep">💨</span>'+fxParts('💚',5,'rise late') },
  rest:    { d:900, html:() => '<span class="e tilt">⛺</span>'+fxParts('💚',6,'rise late') },
  restore: { d:900, html:() => '<span class="e flash">⚡</span>'+fxParts('✨',10,'spark') },
  shortrest:{ d:1000, html:() => '<span class="e tilt">⛺</span>'+fxParts('🔥',5,'rise late')+fxParts('✨',6,'spark') },
  longrest: { d:1200, html:() => '<span class="e twirl">🌙</span>'+fxParts('⭐',10,'spark')+fxParts('💤',4,'rise late') },
  surge:   { d:850, html:() => '<span class="e flash">⚡</span><span class="word">SURGE!</span>' }
};
// one burst per damage type: 🔥 fire, ❄️ cold…
Object.entries(DMG_ICON).forEach(([k, e]) => { FX['el_'+k] = { d:800, html:() => '<span class="e twirl">'+e+'</span>'+fxParts('✦',8,'spark') }; });

// fx(kind, then, dice): emoji burst first, then the real dice tumble across the screen and land on their values
// fx(kind, then, dice, after): emoji burst → dice tumble → optional "after" burst (crit / fumble reveal) → result
function emojiFx(kind, short, cb){
  const spec = FX[kind]; if (!spec) return cb();
  const dur = short ? Math.round(spec.d * .8) : spec.d;
  const el = document.createElement('div'); el.className = 'fx fx-'+kind; el.style.setProperty('--d', spec.d+'ms'); el.setAttribute('aria-hidden','true');
  el.innerHTML = '<div class="stage"><div class="glow"></div>'+spec.html()+'</div>';
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 160); setTimeout(cb, short ? 60 : 0); }, dur - 100);
}
// play an action burst, then the dice, then an optional after-burst (crit/fumble), then call `then`
function fx(kind, then, dice, after){
  const hasDice = dice && dice.length, spec = kind && FX[kind], aft = after && FX[after];
  if (reduceMotion() || fxBusy || (!spec && !hasDice && !aft)) { then && then(); return; }
  fxBusy = true;
  const done = () => { try { then && then(); } finally { fxBusy = false; } };
  const afterStep = () => aft ? emojiFx(after, false, done) : done();
  const diceStep = () => hasDice ? dice3d(dice, afterStep) : afterStep();
  if (spec) emojiFx(kind, hasDice, diceStep); else diceStep();
}
// Heal yourself by v: HP up (never past the max), the HP tile pulses, and a burst of hearts shows the HP actually gained.
// Returns what was gained. Safe to call from inside another animation's callback (the hearts wait their turn).
function healMe(v){
  const before = S.hp; S.hp = Math.min(D.hpMax, S.hp + Math.max(0, v)); const gained = S.hp - before;
  save(); paintRes(); paintVitals();
  HEAL_WORD = gained ? '+'+gained+' HP' : 'HP full';
  const tile = $('.hptile'); if (tile && tile.animate && !reduceMotion()) tile.animate([{transform:'scale(1)'},{transform:'scale(1.08)', boxShadow:'0 0 0 4px color-mix(in srgb,var(--good) 55%,transparent)'},{transform:'scale(1)'}], {duration:700, easing:'ease-out'});
  setTimeout(() => fx('hearts'), 30);
  return gained;
}
// "+9 HP" or "+9 HP (rolled 12, you're at full)" for a heal result card
const healNote = (v, gained) => '+'+gained+' HP'+(gained < v ? ' <span class="small">(rolled '+v+', '+(gained ? 'now' : 'already')+' at full HP)</span>' : '');
// die size → CSS shape class for the flat dice
const DIE_SHAPE = s => s===20 ? 'd20' : s===8 ? 'd8' : s===4 ? 'd4' : s===10 ? 'd10' : 'd6';
// flat (2D) tumbling dice: the fallback when 3D is unavailable
function diceFx(dice, done){
  const el = document.createElement('div'); el.className = 'fx fxdice'; el.setAttribute('aria-hidden','true');
  const n = dice.length, perRow = Math.min(n, 4), gap = n > 4 ? 70 : 84;
  el.innerHTML = '<div class="stage">'+dice.map(d => '<span class="dd '+DIE_SHAPE(d.s)+'"><i>?</i><small>d'+d.s+'</small></span>').join('')+'</div>';
  document.body.appendChild(el);
  const els = [...el.querySelectorAll('.dd')], ROLL = 620, STAG = 70;
  els.forEach((e, i) => {
    const row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row*perRow), col = i % perRow;
    const x = (col - (inRow-1)/2) * gap, y = (row - (Math.ceil(n/perRow)-1)/2) * gap;
    const sx = -window.innerWidth/2 - 60 - Math.random()*60, sy = y - 80 + Math.random()*160, spin = 540 + Math.round(Math.random()*360);
    e.animate([
      {transform:'translate('+sx+'px,'+sy+'px) rotate(-'+spin+'deg) scale(.7)', opacity:0},
      {opacity:1, offset:.12},
      {transform:'translate('+(x+14)+'px,'+(y-10)+'px) rotate(18deg) scale(1.12)', offset:.78},
      {transform:'translate('+x+'px,'+y+'px) rotate(0) scale(1)'}
    ], {duration:ROLL, delay:i*STAG, easing:'cubic-bezier(.2,.7,.3,1)', fill:'both'});
    const face = e.querySelector('i'), d = dice[i];
    const flick = setInterval(() => { face.textContent = 1 + Math.floor(Math.random()*d.s); }, 55);
    setTimeout(() => { clearInterval(flick); face.textContent = d.v; e.classList.add('land'); if (d.off) e.classList.add('off'); if (d.s===20 && d.v===20) e.classList.add('nat20'); if (d.s===20 && d.v===1) e.classList.add('nat1'); }, ROLL*.8 + i*STAG);
  });
  const total = ROLL + (n-1)*STAG + 700;
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 160); done(); }, total);
}
