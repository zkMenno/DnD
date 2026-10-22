/* ============================================================================
   §15 TABS — moving between sections: tabs, arrows, keys, swipes
   ============================================================================ */
const isDesk = () => window.matchMedia('(min-width:1040px)').matches;
// tabs shown on this screen size (Stats lives in the sidebar on desktop)
const visTabs = () => TABS.map(t=>t[0]).filter(k => !(k==='stats' && isDesk()));
// label for a tab key
const tabLabel = k => (TABS.find(t=>t[0]===k)||[k,k])[1];

// previous / next buttons at the bottom of a tab
function paintPager(){
  const pg = $('#pager'); if (!pg) return;
  const v = visTabs(), prev = wrapTab(-1), next = wrapTab(1);
  pg.innerHTML = (prev ? '<button class="btn" data-act="tabprev">‹ '+esc(tabLabel(prev))+'</button>' : '<span></span>')
    + '<span class="small muted pagedots" aria-hidden="true">'+v.map(k=>'<i class="'+(k===ui.tab?'on':'')+'"></i>').join('')+'</span>'
    + (next ? '<button class="btn" data-act="tabnext">'+esc(tabLabel(next))+' ›</button>' : '<span></span>');
}
let animating = false;
// keep the tab strip and panel top visible after switching
function keepPanesInView(){
  const panes = $('#panes'), top = $('.top'); if (!panes || !top) return;
  const y = panes.getBoundingClientRect().top + window.scrollY - top.offsetHeight - 10;
  if (window.scrollY > y) window.scrollTo({top: Math.max(0, y)});
}
/* Carousel: the next section rides in beside the current one (with a small gap), so
   there is never an empty moment. Used by tab taps, the ‹ › buttons, arrow keys and swipes. */
const SLIDE_GAP = 20;
// the panel element for a tab key
const panelOf = k => document.querySelector('.panel[data-panel="'+k+'"]');
// position the neighbouring tab beside the current one during a swipe
function placePeek(el){
  // show a neighbour section next to the current one, lined up with what's on screen
  const panes = $('#panes'), top = $('.top'); if (!panes || !el) return 0;
  const hb = top ? top.getBoundingClientRect().bottom : 0, pt = panes.getBoundingClientRect().top;
  const off = Math.max(0, hb + 8 - pt);
  el.classList.add('peek'); el.style.top = off + 'px'; el.style.transition = 'none';
  return off;
}
// reset swipe positioning
function clearPeek(el){ if (!el) return; el.classList.remove('peek'); el.style.top = el.style.transform = el.style.transition = el.style.opacity = ''; }
// animate the carousel to the next tab
function slideTo(cur, next, dir, fromDx, w, done){
  // cur goes from fromDx → -dir·(w+gap); next from dir·(w+gap)+fromDx → 0
  const dist = w + SLIDE_GAP, left = Math.abs(-dir*dist - fromDx) / dist;
  const ms = Math.round(140 + 180 * Math.min(1, left));
  const ease = 'cubic-bezier(.22,.8,.25,1)';
  [cur, next].forEach(el => { el.style.transition = 'transform '+ms+'ms '+ease; });
  cur.getBoundingClientRect();
  cur.style.transform = 'translateX('+(-dir*dist)+'px)';
  next.style.transform = 'translateX(0px)';
  setTimeout(done, ms + 20);
}
// settle the carousel after a slide
function finishSlide(cur, next, k, off){
  cur.style.transition = cur.style.transform = cur.style.opacity = '';
  clearPeek(next);
  showTab(k);
  if (off) window.scrollTo({top: Math.max(0, window.scrollY - off)});   // keep the new section exactly where it was on screen
  else keepPanesInView();
  animating = false;
}
// go to a tab, sliding when it's a neighbour
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
// neighbour tab key, wrapping at the ends
const wrapTab = (dir) => { const v = visTabs(), i = v.indexOf(ui.tab); return v[(i + dir + v.length) % v.length]; };
// step one tab left/right
function stepTab(dir){ const k = wrapTab(dir); if (k && k !== ui.tab) goTab(k, dir); else bump(dir); }
// rubber-band nudge at the first/last tab
function bump(dir){
  const cur = document.querySelector('.panel.on'); if (!cur || reduceMotion()) return;
  cur.animate([{transform:'translateX(0)'},{transform:'translateX('+(-dir*14)+'px)'},{transform:'translateX(0)'}], {duration:220, easing:'ease-out'});
}
// keyboard: ← / → when you're not typing
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const t = e.target; if (t && (t.closest('input,textarea,select,[contenteditable]') )) return;
  e.preventDefault(); stepTab(e.key === 'ArrowRight' ? 1 : -1);
});
// touch: both sections follow the finger; commit at 25% of the width or a quick flick
(() => {
  const EDGE = 20, COMMIT = 0.25, FLICK = 0.5, LOCK = 10;
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
// show the tab strip scroll arrows when there's more to see
function tabEdges(){
  const nav = $('#tabs'), w = $('#tabwrap'); if (!nav || !w) return;
  // desktop: no swipe hints; if the tabs don't fit, drop the emojis, then tighten, so every tab stays visible
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
// wire up the tab strip, keys and swipes
function bindTabs(){
  const nav = $('#tabs'); if (!nav) return;
  nav.addEventListener('scroll', tabEdges, {passive:true});
  // the strip and its tabs change size when desktop lines it up with the column, or when the fonts arrive
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => tabEdges()); ro.observe(nav); [...nav.children].forEach(t => ro.observe(t)); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tabEdges());
  tabEdges();
}
window.addEventListener('resize', () => tabEdges());
// show a message under the header (sync status etc.)
function setMsg(html){ const m = $('#syncmsg'); if (!m) return; m.hidden = !html; m.innerHTML = html||''; }


