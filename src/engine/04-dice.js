/* ============================================================================
   §4  DICE — random rolls, the roll dock (#dock, where result cards show) and swiping between its sheets
   Defines: r(), parseDice(), rollDice(), sum(), d20(), reduceMotion(), DIE_SVG, deskFine(), fitDock(), navArrow(),
   navLabel(), modalBox(), closeModal(), showRoll(), closeRoll(), bindRollSwipe(), bindSwipeAway().
   Relies on: $ (§2). Calls functions from later files at run time: closeDrawer (§12), rollNav / rollPeek (§8).
   Registers document-level listeners as it loads: window resize (fitDock), a capturing click and Escape that close
   the open desktop window, and a 300 ms timer that keeps body.winopen in step with it.
   ============================================================================ */
// ── Random rolls ───────────────────────────────────────────────────────────────────────────────────────────
// one die with n sides: 1…n
const r = n => 1 + Math.floor(Math.random()*n);
// "2d6+3" → {n:2, d:6} (the modifier is ignored); {n:0, d:0} when there are no dice
function parseDice(str){ const m = String(str).match(/(\d+)d(\d+)/); return m ? {n:+m[1], d:+m[2]} : {n:0, d:0}; }
// roll n dice of d sides → array of results
function rollDice(n,d){ const a=[]; for(let i=0;i<n;i++) a.push(r(d)); return a; }
// sum of an array
const sum = a => a.reduce((x,y)=>x+y,0);
// roll a d20 in a mode ('adv' / 'norm' / 'dis') → {dice, pick, …}: two dice for adv/dis, pick = the one that counts.
// luck / lucked / insp start empty for Halfling Luck and Heroic Inspiration rerolls (§8).
function d20(mode){
  const dice = mode==='norm' ? [r(20)] : [r(20), r(20)];
  return { pick: mode==='adv' ? Math.max(...dice) : mode==='dis' ? Math.min(...dice) : dice[0], dice, luck:[], lucked:[], insp:null };
}
// true when the OS asks for less animation
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// a small d20 outline (also blown up for the d20 burst, §5)
const DIE_SVG = '<svg class="rolldie" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2.2l8.5 4.9v9.8L12 21.8l-8.5-4.9V7.1z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7.5l4.3 7.6H7.7zM12 2.2v5.3M3.5 7.1l4.2 8M20.5 7.1l-4.2 8M3.5 16.9h4.2M20.5 16.9h-4.2M12 21.8v-6.7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
let rollSwipeDX = 0;   // how far a swipe had dragged the sheet when it let go (the slide continues from there)

// ── Layout helpers and desktop windows ─────────────────────────────────────────────────────────────────────
// desktop layout (wide screen + mouse): the roll card fills the right-hand column and steps move vertically
const deskFine = () => window.innerWidth >= 1040 && matchMedia('(pointer:fine)').matches;
// Sets the CSS variables the dock and desktop windows are placed with: --hdrB (bottom of the sticky header),
// --paneW (width of the tabbed column, desktop) and --paneL (where the tab bar starts, to line it up with that column).
function fitDock(){ const tp = document.querySelector('.top'); if (tp) document.documentElement.style.setProperty('--hdrB', Math.round(tp.getBoundingClientRect().bottom)+'px');
  const pn = document.querySelector('.panes'); if (pn && deskFine()) document.documentElement.style.setProperty('--paneW', Math.round(pn.getBoundingClientRect().width)+'px');
  // desktop: line the tab bar up with the tabbed column
  const tw = document.querySelector('.top .wrap'); if (pn && tw && innerWidth >= 1040) { const r = pn.getBoundingClientRect(); if (r.width) document.documentElement.style.setProperty('--paneL', Math.max(0, Math.round(r.left - tw.getBoundingClientRect().left - parseFloat(getComputedStyle(tw).paddingLeft)))+'px'); } }
window.addEventListener('resize', () => { fitDock(); });
// arrows that point the way the steps move: up/down on desktop, left/right on phones
const navArrow = dir => deskFine() ? (dir==='back' ? '↓' : '↑') : (dir==='back' ? '←' : '→');
// On desktop the header drawer, menu, rest and Quick roll boxes are modal windows: returns the open one, or null.
// (On phones they are inline panels, so this is always null there.)
const modalBox = () => deskFine() ? ['#restbox','#menubox','#rollbox','#hpedit'].map(q => $(q)).find(b => b && !b.hidden) : null;
// close a desktop window by pressing its own close button (the header drawer has closeDrawer())
function closeModal(b){ if (b.id === 'hpedit') return closeDrawer(); const x = b.querySelector('[data-act="restclose"],[data-act="menu"],.x2'); if (x) x.click(); }
// a click outside the open window (but not on the dock, a bubble or a confirm dialog) closes it and does nothing else;
// Esc closes it too unless a glossary bubble is open
document.addEventListener('click', e => {
  const b = modalBox(); if (!b || b.contains(e.target) || e.target.closest('#dock,#bubble,.cfm,.confirm')) return;
  e.stopPropagation(); e.preventDefault(); closeModal(b);
}, true);
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const b = modalBox(); if (b && !$('#bubble')) { e.preventDefault(); closeModal(b); } });
setInterval(() => document.body.classList.toggle('winopen', !!modalBox()), 300);
// a step button label: arrow after the text, except the ← back arrow on phones, which goes before it
const navLabel = (dir, t) => deskFine() || dir!=='back' ? t+' '+navArrow(dir) : navArrow(dir)+' '+t;

// ── The roll dock ──────────────────────────────────────────────────────────────────────────────────────────
// Show a result card in #dock. again = repaint the card in place (no entrance); trans = 'next' / 'prev' to slide
// between sheets (sideways on phones, up/down on desktop), or 'up' / 'down' for the older vertical step changes.
// The old card is kept as a fixed "ghost" while it animates away. Adds .landed (and .inked when fresh values show).
function showRoll(html, again, trans){
  fitDock();
  // desktop: a roll made from inside the rest / menu window sits centred under it, at the window's width
  const dkw = $('#dock'); if (dkw) dkw.classList.toggle('inwin', !!(typeof modalBox === 'function' && modalBox()));
  const dk = $('#dock');
  const prev = !dk.hidden && dk.querySelector('.roll');
  again = again && prev;
  // trans: 'next' = the new sheet slides in from the right and the old one leaves left (like the tabs);
  //        'prev' = the reverse; 'up' / 'down' = vertical step changes (older flows). vert: desktop next / prev.
  const side = trans==='next' || trans==='prev', moving = !reduceMotion(), vert = side && deskFine();
  const cls = side ? ' again' : trans==='up' && prev ? ' stepup' : trans==='down' && prev ? ' again reveal' : again ? ' again' : '';
  let ghost = null;
  const dx0 = side ? rollSwipeDX : 0, s = trans==='next' ? 1 : -1;
  let W = 0;
  if ((trans==='down' || side) && prev && moving) {   // the old sheet keeps its spot (and any swipe offset) while it leaves
    // CSS zoom (desktop) scales these lengths too, so convert the on-screen box back to the element's own units
    const rc = prev.getBoundingClientRect(), z = parseFloat(getComputedStyle(prev).zoom) || 1; ghost = prev; W = rc.width + 16;
    ghost.style.cssText += ';position:fixed;left:'+(rc.left/z)+'px;top:'+(rc.top/z)+'px;width:'+(rc.width/z)+'px;margin:0;z-index:'+(vert && trans==='next' ? 30 : 31)+';pointer-events:none;transition:none;transform:none;opacity:1';
  }
  dk.innerHTML = '<div class="wrap"><div class="roll'+cls+'" role="status" aria-live="polite">'+html+'</div></div>'; dk.hidden = false;
  if (ghost) {
    dk.appendChild(ghost);
    // sideways: the two sheets move together like the tab carousel, no fading; down: drop away
    // desktop: 'next' slides the new sheet up over the old one (which waits underneath); 'prev' drops the current sheet down to reveal the previous
    const a = vert ? (trans==='next' ? ghost.animate([{opacity:1},{opacity:1}],{duration:360,fill:'forwards'})
                                     : ghost.animate([{transform:'none'},{transform:'translateY(calc(100% + 40px))'}],{duration:340,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'}))
            : side ? ghost.animate([{transform:'none'},{transform:'translateX('+(-s*W - dx0)+'px)'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'})
                   : ghost.animate([{transform:'none',opacity:1},{transform:'translateY(110%)',opacity:0}],{duration:260,easing:'cubic-bezier(.4,0,.8,.6)',fill:'forwards'});
    a.onfinish = () => ghost.remove();
  }
  const roll = dk.querySelector('.roll'); bindRollSwipe(roll);
  if (vert && moving && trans==='next') { roll.style.position = 'relative'; roll.style.zIndex = '32'; roll.animate([{transform:'translateY(calc(100% + 40px))'},{transform:'none'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'}); }
  else if (side && moving && !vert) roll.animate([{transform: W ? 'translateX('+(s*W + dx0)+'px)' : 'translateX('+(s*100)+'%)'},{transform:'none'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'});
  if (reduceMotion()) { roll.classList.add('landed'); return; }
  // freshly rolled values are written into the sheet (CSS: .roll.inked); no number tumble any more
  if (roll.querySelector('.n:not(.still), .die.flip')) { roll.classList.add('inked','landed'); return; }
  roll.classList.add('landed');
}
// set by the 3D dice (§06) when the first throw happened inside a roll sheet: the "different dice?" note waits for it
let dicePromptAfterRoll = false;
// Slides the roll sheet out ('left', 'right', else down) and hides the dock (× or Done/Confirm at the end of a roll);
// doesn't touch cur / checkRoll (§8). If the first
// throw asked to offer another dice set, that note appears once the sheet has gone.
function closeRoll(dir){
  const dk = $('#dock'), roll = dk.querySelector('.roll');
  if (dicePromptAfterRoll && typeof dicePromptMaybe === 'function') { dicePromptAfterRoll = false; setTimeout(dicePromptMaybe, 450); }
  if (!roll || reduceMotion()) { dk.hidden = true; return; }
  const to = dir === 'left' ? 'translateX(-120%)' : dir === 'right' ? 'translateX(120%)' : 'translateY(140%)';
  roll.classList.remove('stepup','reveal','rolling'); roll.style.animation = 'none';
  roll.style.transition = 'transform .2s ease-in, opacity .2s ease-in'; roll.style.transform = to; roll.style.opacity = '0';
  setTimeout(() => { dk.hidden = true; }, 200);
}
// ── Swipe gestures ─────────────────────────────────────────────────────────────────────────────────────────
// swipe gestures on a roll card: left = next sheet, right = previous sheet. Swipes never close it (× and Done do).
function bindRollSwipe(roll){ return bindSwipeAway(roll, closeRoll, {nav: rollNav, keepRight: true, peek: rollPeek, noClose: true}); }
// Generic swipe-to-dismiss for a card, with pointer events. close(dir) runs on a long or fast swipe. opts:
//   up       dismiss by swiping up instead of down
//   nav      nav(dir) tries to move to another sheet on a sideways swipe; returns true if it did
//   peek     peek(dir) returns the HTML of the sheet beside this one, shown and dragged along while swiping
//   keepRight  a swipe to the right never closes; noClose  no swipe ever closes (vertical drags are left to scrolling)
function bindSwipeAway(roll, close, opts){
  const UP = !!(opts && opts.up);
  let sx = 0, sy = 0, st = 0, dx = 0, dy = 0, active = false, id = null;
  // Peek: the previous / next sheet, placed beside this one (bottom-aligned, one card width + gap away) and dragged along
  let peekEl = null, peekDir = null, home = null;
  const dropPeek = animate => { const el = peekEl; peekEl = null; peekDir = null; if (!el) return;
    if (!animate) return el.remove();
    el.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)'; el.style.transform = 'translateX('+(el._side*(home.width+16))+'px)'; setTimeout(() => el.remove(), 220); };
  const makePeek = (html, dir) => {
    const el = document.createElement('div'); el.className = 'roll again peek'; el.setAttribute('aria-hidden','true'); el.innerHTML = html;
    el._side = dir === 'left' ? 1 : -1;
    el.style.cssText = 'position:fixed;left:'+home.left+'px;width:'+home.width+'px;bottom:'+(window.innerHeight - home.bottom)+'px;margin:0;z-index:31;pointer-events:none;transition:none';
    $('#dock').appendChild(el); return el;
  };
  roll.addEventListener('pointerdown', e => {
    if (e.target.closest('button,input,textarea,a,summary')) return;
    active = true; id = e.pointerId; sx = e.clientX; sy = e.clientY; st = Date.now(); dx = dy = 0; home = roll.getBoundingClientRect();
    roll.style.transition = 'none'; try { roll.setPointerCapture(id); } catch(_){}
  });
  roll.addEventListener('pointermove', e => {
    if (!active || e.pointerId !== id) return;
    dx = e.clientX - sx; dy = Math.max(0, UP ? sy - e.clientY : e.clientY - sy);   // one vertical direction counts
    const horiz = Math.abs(dx) > dy;
    if (horiz && opts && opts.peek) {
      const dir = dx < 0 ? 'left' : 'right';
      if (dir !== peekDir) { dropPeek(false); peekDir = dir; const h = opts.peek(dir); if (h) peekEl = makePeek(h, dir); }
      if (peekEl) { roll.style.transform = 'translateX('+dx+'px)'; roll.style.opacity = ''; peekEl.style.transform = 'translateX('+(dx + peekEl._side*(home.width+16))+'px)'; return; }
      if ((dir === 'right' && opts.keepRight) || opts.noClose) { roll.style.transform = 'translateX('+(dx*.3)+'px)'; roll.style.opacity = ''; return; }   // nothing there: rubber band
    } else if (peekEl) dropPeek(false);
    if (!horiz && opts && opts.noClose) { roll.style.transform = ''; roll.style.opacity = ''; return; }   // vertical: leave it to scrolling
    roll.style.transform = horiz ? 'translateX('+dx+'px)' : 'translateY('+(UP ? -dy : dy)+'px)';
    roll.style.opacity = String(1 - Math.min((horiz ? Math.abs(dx) : dy) / 220, .7));
  });
  const up = e => {
    if (!active || (e && e.pointerId !== id)) return; active = false;
    const dt = Math.max(1, Date.now() - st), horiz = Math.abs(dx) > dy, d = horiz ? Math.abs(dx) : dy;
    if ((d > 70 || (d > 30 && d / dt > 0.5)) && horiz && opts && opts.nav) {
      rollSwipeDX = dx; const went = opts.nav(dx < 0 ? 'left' : 'right'); rollSwipeDX = 0;
      if (went) { dropPeek(false); return; }   // the new sheet now sits exactly where the peek was
    }
    if (peekEl) dropPeek(true);
    const far = d > 70 || (d > 30 && d / dt > 0.5);
    if (far && !(opts && opts.noClose) && !(horiz && dx > 0 && opts && opts.keepRight)) return close(horiz ? (dx < 0 ? 'left' : 'right') : (UP ? 'up' : 'down'));
    roll.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1), opacity .2s'; roll.style.transform = ''; roll.style.opacity = '';
  };
  roll.addEventListener('pointerup', up);
  // the browser took over (e.g. scrolling a tall card): just settle back, never close
  roll.addEventListener('pointercancel', () => { if (!active) return; active = false; dropPeek(true); roll.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1), opacity .2s'; roll.style.transform = ''; roll.style.opacity = ''; });
}


