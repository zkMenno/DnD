/* ============================================================================
   §15 TABS — moving between tabs: tab taps, ‹ › buttons, arrow keys, swipes
   Every way of changing tab ends in goTab()/showTab() (§14). Neighbouring tabs slide in as a carousel: the next
   panel gets .peek (absolutely placed beside the current one) and both move together, so the screen is never empty.
   Defines: isDesk, visTabs, tabLabel, paintPager, keepPanesInView, panelOf, placePeek, clearPeek, slideTo, finishSlide,
   goTab, wrapTab, stepTab, bump, tabEdges, bindTabs, setMsg; at load it adds the ← → key and touch-swipe listeners.
   Uses: TABS (§13), ui (§03), closeTip (§16), deskFine and reduceMotion (§04), $ and esc (§02).
   `animating` blocks a second slide (or swipe) until the current one has finished.
   ============================================================================ */

// ── Visible tabs ───────────────────────────────────────────────────────────────────────────────────────────
// true on desktop widths, where Stats is the left sidebar instead of a tab
const isDesk = () => window.matchMedia('(min-width:1040px)').matches;
// The tab keys shown on this screen size, in order (Stats is left out on desktop).
const visTabs = () => TABS.map(t=>t[0]).filter(k => !(k==='stats' && isDesk()));
// The label for a tab key (the key itself if it's unknown).
const tabLabel = k => (TABS.find(t=>t[0]===k)||[k,k])[1];

// ── Pager and scrolling ────────────────────────────────────────────────────────────────────────────────────
// Draw the ‹ previous / next › buttons and the page dots at the bottom of the open tab (both wrap around).
function paintPager(){
  const pg = $('#pager'); if (!pg) return;
  const v = visTabs(), prev = wrapTab(-1), next = wrapTab(1);
  pg.innerHTML = (prev ? '<button class="btn" data-act="tabprev">‹ '+esc(tabLabel(prev))+'</button>' : '<span></span>')
    + '<span class="small muted pagedots" aria-hidden="true">'+v.map(k=>'<i class="'+(k===ui.tab?'on':'')+'"></i>').join('')+'</span>'
    + (next ? '<button class="btn" data-act="tabnext">'+esc(tabLabel(next))+' ›</button>' : '<span></span>');
}
let animating = false;   // a slide is running: tab changes wait for it
// After a switch: if the page is scrolled past the top of the panels, scroll back up so the tab strip and the top of
// the new panel show. Never scrolls down.
function keepPanesInView(){
  const panes = $('#panes'), top = $('.top'); if (!panes || !top) return;
  const y = panes.getBoundingClientRect().top + window.scrollY - top.offsetHeight - 10;
  if (window.scrollY > y) window.scrollTo({top: Math.max(0, y)});
}
// ── Carousel ───────────────────────────────────────────────────────────────────────────────────────────────
// The next tab rides in beside the current one (with a small gap), so there is never an empty moment.
// Used by tab taps, the ‹ › buttons, arrow keys and swipes.
const SLIDE_GAP = 20;   // px between the two panels while they slide
// The panel element for a tab key.
const panelOf = k => document.querySelector('.panel[data-panel="'+k+'"]');
// Show a neighbouring panel beside the current one (.peek), lined up with what's on screen: its top is moved down to
// just under the sticky header. Returns that offset in px, so finishSlide can keep the new panel where it was seen.
function placePeek(el){
  const panes = $('#panes'), top = $('.top'); if (!panes || !el) return 0;
  const hb = top ? top.getBoundingClientRect().bottom : 0, pt = panes.getBoundingClientRect().top;
  const off = Math.max(0, hb + 8 - pt);
  el.classList.add('peek'); el.style.top = off + 'px'; el.style.transition = 'none';
  return off;
}
// Undo placePeek: the panel goes back to normal flow with no inline position.
function clearPeek(el){ if (!el) return; el.classList.remove('peek'); el.style.top = el.style.transform = el.style.transition = el.style.opacity = ''; }
// Slide both panels to the end: cur from fromDx to -dir·(w+gap) (off screen), next from dir·(w+gap)+fromDx to 0.
// dir 1 = forward (next comes from the right). fromDx is where a swipe left them. The duration scales with the
// distance still to go (140–320 ms); done runs just after.
function slideTo(cur, next, dir, fromDx, w, done){
  const dist = w + SLIDE_GAP, left = Math.abs(-dir*dist - fromDx) / dist;
  const ms = Math.round(140 + 180 * Math.min(1, left));
  const ease = 'cubic-bezier(.22,.8,.25,1)';
  [cur, next].forEach(el => { el.style.transition = 'transform '+ms+'ms '+ease; });
  cur.getBoundingClientRect();
  cur.style.transform = 'translateX('+(-dir*dist)+'px)';
  next.style.transform = 'translateX(0px)';
  setTimeout(done, ms + 20);
}
// After a slide: clear the inline styles, make k the open tab, and scroll so the new panel stays where it was on
// screen (off = its peek offset) or, without an offset, so the panel top is visible.
function finishSlide(cur, next, k, off){
  cur.style.transition = cur.style.transform = cur.style.opacity = '';
  clearPeek(next);
  showTab(k);
  if (off) window.scrollTo({top: Math.max(0, window.scrollY - off)});   // keep the new section exactly where it was on screen
  else keepPanesInView();
  animating = false;
}
// Go to tab k with a slide. dir (1 forward, -1 back) defaults to the tab's position relative to the open one.
// Closes any tooltip first. With reduced motion (or a missing panel) it just switches.
function goTab(k, dir){
  if (animating || k === ui.tab) return;
  const v = visTabs(); if (dir == null) dir = v.indexOf(k) > v.indexOf(ui.tab) ? 1 : -1;
  const cur = document.querySelector('.panel.on'), next = panelOf(k);
  closeTip();
  if (!cur || !next || reduceMotion()) { showTab(k); keepPanesInView(); return; }
  animating = true;
  const w = cur.offsetWidth || window.innerWidth;
  const off = placePeek(next);
  next.style.transform = 'translateX('+(dir*(w+SLIDE_GAP))+'px)';
  slideTo(cur, next, dir, 0, w, () => finishSlide(cur, next, k, off));
}
// The neighbouring tab key in direction dir (-1 / 1), wrapping round at the ends.
const wrapTab = (dir) => { const v = visTabs(), i = v.indexOf(ui.tab); return v[(i + dir + v.length) % v.length]; };
// Step one tab back or forward (‹ › buttons, arrow keys); bumps instead when there is nowhere to go (one tab only).
function stepTab(dir){ const k = wrapTab(dir); if (k && k !== ui.tab) goTab(k, dir); else bump(dir); }
// A small rubber-band nudge of the open panel, for a step that can't go anywhere.
function bump(dir){
  const cur = document.querySelector('.panel.on'); if (!cur || reduceMotion()) return;
  cur.animate([{transform:'translateX(0)'},{transform:'translateX('+(-dir*14)+'px)'},{transform:'translateX(0)'}], {duration:220, easing:'ease-out'});
}
// ── Keys and swipes ────────────────────────────────────────────────────────────────────────────────────────
// keyboard: ← / → step tabs, unless you're typing or holding a modifier
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const t = e.target; if (t && (t.closest('input,textarea,select,[contenteditable]') )) return;
  e.preventDefault(); stepTab(e.key === 'ArrowRight' ? 1 : -1);
});
// Touch: the open panel and both neighbours follow the finger. A swipe is taken once it moves LOCK px and is mostly
// sideways; it commits at COMMIT of the width or a quick flick (FLICK px/ms over 40 px), else springs back.
// Ignored near the screen edges (the phone's back gesture), on fields, the tab strip, bubbles and [data-noswipe].
(() => {
  const EDGE = 20, COMMIT = 0.25, FLICK = 0.5, LOCK = 10;
  // mode: null (no swipe) → 'pending' (finger down) → 'h' (a sideways swipe); prev/next are the peeking panels
  let sx = 0, sy = 0, st = 0, dx = 0, mode = null, cur = null, w = 1, prev = null, next = null, offP = 0, offN = 0;
  document.addEventListener('touchstart', e => {
    mode = null;
    if (animating || e.touches.length !== 1) return;
    const t = e.touches[0], tgt = e.target;
    if (!tgt.closest || !tgt.closest('#panes')) return;
    if (tgt.closest('input,textarea,select,.tabs,.bubble,[data-noswipe]')) return;
    if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return;   // leave the phone's back gesture alone
    sx = t.clientX; sy = t.clientY; st = Date.now(); dx = 0; mode = 'pending';
    cur = document.querySelector('.panel.on'); w = (cur && cur.offsetWidth) || window.innerWidth;
  }, {passive:true});
  document.addEventListener('touchmove', e => {
    if (!mode || !cur) return;
    const t = e.touches[0], mx = t.clientX - sx, my = t.clientY - sy;
    if (mode === 'pending') {
      if (Math.abs(mx) < LOCK && Math.abs(my) < LOCK) return;
      mode = Math.abs(mx) > Math.abs(my) * 1.3 ? 'h' : null;   // mostly vertical = normal scrolling
      if (!mode) return;
      closeTip(); cur.style.transition = 'none';
      const kp = wrapTab(-1), kn = wrapTab(1);
      if (kp && kp !== ui.tab) { prev = panelOf(kp); offP = placePeek(prev); }
      if (kn && kn !== ui.tab && kn !== kp) { next = panelOf(kn); offN = placePeek(next); }
    }
    e.preventDefault();
    dx = mx;
    cur.style.transform = 'translateX('+dx+'px)';
    if (prev) prev.style.transform = 'translateX('+(dx - w - SLIDE_GAP)+'px)';
    if (next) next.style.transform = 'translateX('+(dx + w + SLIDE_GAP)+'px)';
  }, {passive:false});
  // Finger up: commit to the neighbour (slide the rest of the way) or spring all panels back.
  const end = () => {
    if (mode !== 'h' || !cur) { mode = null; return; }
    mode = null;
    const dt = Math.max(1, Date.now() - st), dir = dx < 0 ? 1 : -1;
    const target = dir === 1 ? next : prev, other = dir === 1 ? prev : next, k = wrapTab(dir), off = dir === 1 ? offN : offP;
    const commit = target && (Math.abs(dx) >= w * COMMIT || (Math.abs(dx) / dt > FLICK && Math.abs(dx) > 40));
    const c = cur; cur = null;
    if (!commit) {
      const ease = 'transform .22s cubic-bezier(.2,.8,.2,1)';
      [c, prev, next].forEach(el => { if (el) el.style.transition = ease; });
      c.style.transform = 'translateX(0px)';
      if (prev) prev.style.transform = 'translateX('+(-w - SLIDE_GAP)+'px)';
      if (next) next.style.transform = 'translateX('+(w + SLIDE_GAP)+'px)';
      const p = prev, n = next; prev = next = null;
      setTimeout(() => { c.style.transition = c.style.transform = ''; clearPeek(p); clearPeek(n); }, 240);
      return;
    }
    animating = true;
    clearPeek(other); prev = next = null;
    slideTo(c, target, dir, dx, w, () => finishSlide(c, target, k, off));
  };
  document.addEventListener('touchend', end, {passive:true});
  document.addEventListener('touchcancel', end, {passive:true});
})();
// ── Tab strip ──────────────────────────────────────────────────────────────────────────────────────────────
// Touch screens: show the strip's fade and ‹ › arrows (.can-l / .can-r) on the side where more tabs are hidden.
// Desktop with a mouse: no arrows; if the tabs don't fit, add .tight, .tighter, .tightest one by one (drop the emojis,
// then tighten the spacing) until they do, so every tab stays visible.
function tabEdges(){
  const nav = $('#tabs'), w = $('#tabwrap'); if (!nav || !w) return;
  if (deskFine()) {
    w.classList.remove('tight', 'tighter', 'tightest');
    if (nav.scrollWidth > nav.clientWidth + 1) w.classList.add('tight');
    if (nav.scrollWidth > nav.clientWidth + 1) w.classList.add('tighter');
    if (nav.scrollWidth > nav.clientWidth + 1) w.classList.add('tightest');
    w.classList.remove('can-l', 'can-r'); return;
  }
  const max = nav.scrollWidth - nav.clientWidth;
  w.classList.toggle('can-l', nav.scrollLeft > 4);
  w.classList.toggle('can-r', nav.scrollLeft < max - 4);
}
// Wire up the tab strip after a render: re-check its edges on scroll, on resize of the strip or any tab, and once the
// web fonts have loaded. (The keys and swipes are bound once at load, above.)
function bindTabs(){
  const nav = $('#tabs'); if (!nav) return;
  nav.addEventListener('scroll', tabEdges, {passive:true});
  // the strip and its tabs change size when desktop lines it up with the column, or when the fonts arrive
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => tabEdges()); ro.observe(nav); [...nav.children].forEach(t => ro.observe(t)); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tabEdges());
  tabEdges();
}
window.addEventListener('resize', () => tabEdges());

// ── Message line ───────────────────────────────────────────────────────────────────────────────────────────
// Show a message in #syncmsg under the header (sync status, move results…); empty hides it. html is inserted as HTML,
// so callers escape anything from data.
function setMsg(html){ const m = $('#syncmsg'); if (!m) return; m.hidden = !html; m.innerHTML = html||''; }


