/* ============================================================================
   §12 HEADER — vitals tiles and their drawers (HP, AC, speed, initiative)
   ============================================================================ */

// HP colour in 10% steps: deep red → red → orange → yellow → green
const HP_STEPS = ['#4A0B0E','#6E1216','#961B1B','#B8301C','#D2521B','#E0761A','#E39A1F','#D9BC2A','#9DBB3A','#3F9446'];
// HP tile colour for the current HP percentage
function hpColour(){
  const pct = D.hpMax ? S.hp / D.hpMax : 0;
  const i = Math.min(9, Math.max(0, Math.ceil(pct * 10) - 1));
  const bg = S.hp <= 0 ? '#2B0608' : HP_STEPS[i];
  const dark = i <= 5 || S.hp <= 0 || i === 9;
  return {bg, fg: dark ? '#FFF6E6' : '#2A1E0E'};
}
// small stroke icons for the stat tiles
const ICON = (()=>{
  const sv = d => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+d+'</svg>';
  return {
    hp:    sv('<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>'),
    ac:    sv('<path d="M12 3l7.5 2.8v5.4c0 4.8-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5-7.5-9.8V5.8z"/><path d="M12 7v10" class="thin"/>'),
    init:  sv('<path d="M13.5 2.5L5.5 13.5h6l-1 8 8-11h-6z"/>'),
    speed: sv('<path d="M7 4v8.5c0 1 .5 1.7 1.5 2.1l7.6 3.2c1.4.6 2.9-.4 2.9-1.9v-.4c0-.8-.5-1.5-1.2-1.8L11 11V4z"/><path d="M3 9h3M2 13h4" class="thin"/>'),
    insp:  sv('<path d="M12 3.2l2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16.2l-5.2 2.9L8 13.3l-4.4-4 5.9-.7z"/>')
  };
})();
// the HP vitals tile
function hpTile(){
  const c = hpColour();
  const low = S.hp < D.hpMax * 0.1;
  return '<button class="vt hptile'+(low?' low':'')+'" data-act="hpmenu" aria-expanded="'+(drawerKind==='hp')+'" aria-label="Hit points '+S.hp+' of '+D.hpMax+(S.temp?', plus '+S.temp+' temporary':'')+'. Tap to change." style="background:'+c.bg+';color:'+c.fg+';border-color:'+c.bg+'">'
    + '<div class="k">'+(S.hp<=0?'Down':'Hit points')+'</div><div class="v'+(D.hpMax >= 100 || S.temp ? ' big' : '')+'">'+(S.hp<=0?'<span class="skull" aria-hidden="true">☠️</span>':ICON.hp)+'<span class="num">'+S.hp+'</span><small>/'+D.hpMax+'</small>'+(S.temp?'<small class="tmp">+'+S.temp+'</small>':'')+'</div></button>';
}
// HP drawer: damage, heal, temp HP
function hpMenu(){
  return '<div class="hpm">'+dhead('❤️','Hit points', hpVal(), 'hpval')+'<div class="hpq">'
    + '<button class="btn" data-act="hpadj" data-n="-5">−5</button><button class="btn" data-act="hpadj" data-n="-1">−1</button>'
    + '<button class="btn" data-act="hpadj" data-n="1">+1</button><button class="btn" data-act="hpadj" data-n="5">+5</button>'
    + '<button class="btn primary" data-act="hpfull">Full</button></div>'
    + '<div class="hpedit"><label for="hpamt" class="small muted">Amount</label><input id="hpamt" type="number" inputmode="numeric" min="0" value="">'
    + '<button class="btn small" data-act="dmg">Damage</button><button class="btn small" data-act="heal">Heal</button><button class="btn small" data-act="temp">Temp HP</button></div>'
    + '<div class="hpfoot"><p class="small muted" style="margin:0">Damage comes off temporary HP first.</p><button class="btn done" data-act="hpclose" aria-label="Done">'+WORD.ok+'</button></div></div>';
}

// One drawer under the tiles: the HP menu or a stat explainer, sliding open and shut
let drawerKind = null;
const DRAWER_HEAD = {
  'Armour Class': ['🛡️', () => D.ac], 'Initiative': ['⚡', () => sgn(D.initiative)], 'Speed': ['👢', () => D.speedM+' m']
};
// "23 / 36" text for the HP tile
const hpVal = () => S.hp+'/'+D.hpMax+(S.temp?' +'+S.temp:'');
// drawer header: emoji, title, value
const dhead = (emo, title, val, id) => '<div class="dhead"><span class="emo" aria-hidden="true">'+emo+'</span><span class="dtitle">'+esc(title)+'</span><span class="dval"'+(id?' id="'+id+'"':'')+'>'+esc(val)+'</span></div>';
// drawer version of a glossary bubble (AC, speed, initiative tiles)
function termDrawer(term){
  const g = G[term]; if (!g) return '';
  const bk = esc(srcTag(term) || g[0]);
  const h = DRAWER_HEAD[term];
  if (h) { // tile drawers (AC, speed, initiative): a roll button sits beside the "Yours" list, Aye bottom-right
    let body = fmtTip(g[1]), side = false;
    if (g[3]) body = body.replace(/(Yours<\/div>)(<ul class="tl">[\s\S]*?<\/ul>)/, (m, a, ul) => { side = true; return a+'<div class="tlrow">'+ul+'<div class="ba">'+g[3]+'</div></div>'; });
    return '<div class="tdr"><div class="bk">'+bk+'</div>'+dhead(h[0], term, String(h[1]()))+'<div class="bx">'+body+'</div>'
    + useBlock(term) + invBlock(term)
    + '<div class="hpfoot tdfoot"><div class="ba">'+(side ? '' : (g[3]||''))+'</div><button class="btn done" data-act="hpclose" aria-label="Done">'+WORD.ok+'</button></div></div>'; }
  return '<div class="tdr"><div class="bk">'+bk+'</div><div class="bt'+(g[4]?' hassub':'')+'"><span>'+esc(term)+'</span>'+(g[4]?'<span class="bsub">'+esc(g[4])+'</span>':'')+'</div><div class="bx">'+fmtTip(g[1])+'</div>'
    + ''
    + useBlock(term) + invBlock(term)
    + '<div class="hpfoot"><div class="ba">'+(g[3]||'')+'</div><button class="btn done" data-act="hpclose" aria-label="Done">'+WORD.ok+'</button></div></div>';
}
// Heroic Inspiration drawer
function inspDrawer(){
  return '<div class="tdr"><div class="bk">Reroll</div>'+dhead('⭐','Heroic Inspiration', S.insp ? 'Yes' : 'No', 'inspval')
    + '<div class="bx">Spend it right after a roll to <b>reroll any one die</b>: an attack, check, save or a damage die. You must keep the new roll, even if it’s worse. You can only hold one.</div>'
    + ''
    + '<p class="small muted" style="margin:8px 0 0">You get it from the DM for great play, or from another player: your bard can hand it out. Not the same as Halfling Luck, which rerolls natural 1s for free.</p>'
    + '<p class="small muted" style="margin:6px 0 0">If the bard gives you a <b>Bardic Inspiration die</b> instead (a d6 you add to a roll), that’s a different thing: it doesn’t go here.</p>'
    + '<div class="hpfoot"><div class="ba">'+(S.insp
        ? '<button class="btn insptog spend" data-act="insptoggle">🎲 Used it</button>'
        : '<button class="btn insptog gain" data-act="insptoggle">⭐ Gained one</button>')
    + '</div><button class="btn done" data-act="hpclose" aria-label="Done">'+WORD.ok+'</button></div></div>';
}
// desktop window close ✕ (hidden in the phone drawer)
const WINX = '<button class="x2 winx" data-act="hpclose" aria-label="Close">×</button>';
// open one header drawer (closing any other)
function openDrawer(kind){
  const box = $('#hpedit'); if (!box) return;
  if (drawerKind === kind && !box.hidden) return closeDrawer();
  const html = kind === 'hp' ? hpMenu() : kind === 'insp' ? inspDrawer() : termDrawer(kind.slice(5));
  if (!html) return;
  closeTip();
  // one header panel at a time: stat drawers, Quick roll, Rest and the menu
  if (rollBoxOpen) closeRollBox(); if (restMode) closeRest(); if (menuOpen) { menuOpen = false; paintMenu(); }
  const wasOpen = !box.hidden, from = wasOpen ? box.offsetHeight : 0;
  box.getAnimations && box.getAnimations().forEach(a => a.cancel());
  drawerKind = kind; box.innerHTML = WINX + html; box.hidden = false; box.querySelectorAll('.tdr .bx,.tdr .bw > span').forEach(r => { linkify(r); decorate(r); }); paintVitals();
  if (reduceMotion() || !box.animate) return;
  if (deskFine()) { if (wasOpen) box.lastElementChild.animate([{opacity:0},{opacity:1}], {duration:160, easing:'ease-out'}); return; }   // desktop window: its CSS animation brings it in
  const h = box.offsetHeight;
  if (wasOpen) {
    box.animate([{height:from+'px'},{height:h+'px'}], {duration:200, easing:'cubic-bezier(.2,.8,.2,1)'});
    box.firstElementChild && box.firstElementChild.animate([{opacity:0, transform:'translateY(-4px)'},{opacity:1, transform:'none'}], {duration:180, easing:'ease-out'});
    return;
  }
  box.animate([{height:'0px', opacity:0, transform:'translateY(-8px)', paddingTop:'0px', paddingBottom:'0px'},
               {height:h+'px', opacity:1, transform:'translateY(0)'}], {duration:220, easing:'cubic-bezier(.2,.8,.2,1)'});
}
// close the open header drawer
function closeDrawer(){
  const box = $('#hpedit'); if (!box || box.hidden) return;
  const done = () => { box.hidden = true; box.innerHTML = ''; drawerKind = null; paintVitals(); };
  if (reduceMotion() || !box.animate) return done();
  if (deskFine()) return winOut(box, done);
  const h = box.offsetHeight;
  const an = box.animate([{height:h+'px', opacity:1, transform:'translateY(0)'},
                          {height:'0px', opacity:0, transform:'translateY(-8px)', paddingTop:'0px', paddingBottom:'0px'}], {duration:180, easing:'ease-in'});
  an.onfinish = done;
}
// open / close the HP drawer
const closeHpMenu = closeDrawer;
// take damage: temp HP first, then HP
function hurt(n){ const t = Math.min(S.temp, n); S.temp -= t; S.hp = Math.max(0, S.hp - (n - t)); }
// the vitals tile row: HP, AC, speed, initiative, Roll
function vitalsHtml(){
  return hpTile()
    + '<button type="button" class="vt tile" data-term="Armour Class" aria-expanded="'+(drawerKind==='term:Armour Class')+'" aria-label="Armour Class '+D.ac+', explain"><div class="k">Armour</div><div class="v">'+ICON.ac+''+D.ac+'</div></button>'
    + '<button type="button" class="vt tile" data-term="Speed" aria-expanded="'+(drawerKind==='term:Speed')+'" aria-label="Speed '+D.speedM+' metres, explain"><div class="k">Speed</div><div class="v">'+ICON.speed+''+D.speedM+'<small>m</small></div></button>'
    + '<button type="button" class="vt tile" data-term="Initiative" aria-expanded="'+(drawerKind==='term:Initiative')+'" aria-label="Initiative '+sgn(D.initiative)+', explain"><div class="k">Initiative</div><div class="v">'+ICON.init+''+sgn(D.initiative)+'</div></button>'
    + '<button type="button" class="vt tile" data-act="rollflow" id="rollbtn" aria-expanded="'+rollBoxOpen+'" aria-label="Quick roll: any check, save or skill"><div class="k">Roll</div><div class="v">🎲</div></button>';
}
// repaint the vitals row
function paintVitals(){ const v = $('#vitals'); if (v) v.innerHTML = vitalsHtml(); const hv = $('#hpval'); if (hv) hv.textContent = hpVal(); }
