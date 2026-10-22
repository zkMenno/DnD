/* ============================================================================
   §14 QUICK JUMP AND SECTION ORDER
   ============================================================================ */
// quick jump: a floating button listing the sections (cards) of the tab you're on
function jumpSecs(){
  const panel = document.querySelector('.panel.on'); if (!panel) return [];
  return secBlocks(panel).filter(b => b.t && b.els[0].offsetParent).map(b => ({el:b.els[0], t:b.t}));
}
// Section order per tab (saved on this device). A block = a top-level element with a heading, plus any
// heading-less elements right after it (e.g. a combo list under its section header).
function secBlocks(panel){
  const out = [];
  [...panel.children].forEach(el => {
    if (el.matches('nav,.pager') ) return;
    const h2 = el.matches('section.card') ? (el.querySelector('h2') || el.querySelector('.cardhead h3')) : el.querySelector(':scope > section.card h2');
    if (h2) out.push({t: h2.textContent.trim(), els: [el]});
    else if (out.length) out[out.length-1].els.push(el);
    else out.push({t: '', els: [el]});
  });
  return out;
}
// apply this device's saved card order to one panel
function applySecOrder(panel){
  const ord = (ui.secOrder || {})[panel.dataset.panel]; if (!ord || !ord.length) return;
  const blocks = secBlocks(panel), pos = b => { const i = ord.indexOf(b.t); return i < 0 ? 999 : i; };
  const anchor = panel.querySelector(':scope > nav.pager');
  blocks.map((b,i)=>[b,i]).sort((a,b2) => (pos(a[0]) - pos(b2[0])) || (a[1]-b2[1])).forEach(([b]) => b.els.forEach(el => panel.insertBefore(el, anchor || null)));
}
// apply saved card order on every panel
function applyAllSecOrder(){ document.querySelectorAll('main .panel').forEach(applySecOrder); }
let jumpEdit = false;
// move a section card up/down and remember it
function moveSec(i, d){
  const panel = document.querySelector('.panel.on'); if (!panel) return;
  const blocks = secBlocks(panel).filter(b => b.t), j = i + d; if (j < 0 || j >= blocks.length) return;
  const titles = blocks.map(b => b.t); [titles[i], titles[j]] = [titles[j], titles[i]];
  ui.secOrder = Object.assign({}, ui.secOrder, {[panel.dataset.panel]: titles}); saveUi();
  applySecOrder(panel); openJump(true);
}
// show the ↕ Sections button when a tab has 2+ sections
function paintJump(){ const b = $('#jumpbtn'); if (!b) return; b.hidden = jumpSecs().length < 2; closeJump(); }
// close the jump menu
function closeJump(){
  jumpEdit = false; const m = $('#jumpmenu'), b = $('#jumpbtn');
  if (b) b.setAttribute('aria-expanded','false');
  if (!m || m.hidden) return;
  const hide = () => { m.hidden = true; m.innerHTML = ''; };
  if (reduceMotion() || !m.animate) return hide();
  jumpAnim(m, false).finished.then(() => { if (b && b.getAttribute('aria-expanded') !== 'true') hide(); }, () => {});
}
// The menu grows out of the ↕ Sections button and shrinks back into it: scale from the button's centre.
let jumpA = null;
// open/close animation of the ↕ Sections menu, growing from its button
function jumpAnim(m, open){
  const b = $('#jumpbtn'); if (jumpA) jumpA.cancel();
  if (b) { const mr = m.getBoundingClientRect(), br = b.getBoundingClientRect();
    m.style.transformOrigin = (br.left + br.width/2 - mr.left)+'px '+(br.top + br.height/2 - mr.top)+'px'; }
  const shut = {transform:'scale(.12)', opacity:0, borderRadius:'999px'}, full = {transform:'none', opacity:1};
  jumpA = m.animate(open ? [shut, full] : [full, shut], open
    ? {duration:260, easing:'cubic-bezier(.2,.9,.25,1.08)'}
    : {duration:170, easing:'cubic-bezier(.5,0,.75,.4)', fill:'forwards'});
  if (b && b.animate) b.animate([{transform:'scale(1)'},{transform:'scale(.92)'},{transform:'scale(1)'}], {duration:200, easing:'ease-out'});
  return jumpA;
}
// open the jump menu (with reorder arrows)
function openJump(keep){
  const m = $('#jumpmenu'), b = $('#jumpbtn'); if (!m) return;
  if (!m.hidden && !keep && b.getAttribute('aria-expanded') === 'true') return closeJump();
  const wasShut = m.hidden || b.getAttribute('aria-expanded') !== 'true';
  if (jumpEdit) {
    const panel = document.querySelector('.panel.on'), blocks = panel ? secBlocks(panel).filter(x => x.t) : [];
    m.innerHTML = '<div class="jumph jumprow"><span>Reorder sections</span><button class="btn small done" data-act="jumpedit">'+WORD.ok+'</button></div>'
      + blocks.map((x,i) => '<div class="jumpi jumpord"><span class="jt">'+esc(x.t)+'</span><span class="jarrows"><button class="btn small" data-act="secmove" data-i="'+i+'" data-d="-1"'+(i?'':' disabled')+' aria-label="Move up">▲</button><button class="btn small" data-act="secmove" data-i="'+i+'" data-d="1"'+(i<blocks.length-1?'':' disabled')+' aria-label="Move down">▼</button></span></div>').join('');
    if (ui.tab === 'combat') {   // weapon order lives here too
      const items = atkItems(), n = items.length;
      m.innerHTML += '<div class="jumph jumprow"><span>Reorder attacks</span></div>'
        + items.map(([k],i) => '<div class="jumpi jumpord"><span class="jt">'+esc(k)+'</span><span class="jarrows"><button class="btn small" data-act="wmove" data-k="'+esc(k)+'" data-d="-1"'+(i?'':' disabled')+' aria-label="Move up">▲</button><button class="btn small" data-act="wmove" data-k="'+esc(k)+'" data-d="1"'+(i<n-1?'':' disabled')+' aria-label="Move down">▼</button></span></div>').join('');
    }
    m.hidden = false; b.setAttribute('aria-expanded','true'); if (wasShut && !reduceMotion() && m.animate) jumpAnim(m, true); return;
  }
  const secs = jumpSecs(), emo = s => { const e = s.el.querySelector('h2 .emo'); return e ? e.textContent : '•'; };
  m.innerHTML = '<div class="jumph jumprow"><span>Jump to</span><button class="btn small" data-act="jumpedit">↕ Reorder</button></div><button class="jumpi" data-act="jumpto" data-i="-1"><span class="je">⬆️</span>Top of the page</button>'
    + secs.map((s,i) => '<button class="jumpi" data-act="jumpto" data-i="'+i+'"><span class="je">'+emo(s)+'</span>'+esc(s.t.replace(emo(s),'').trim())+'</button>').join('');
  m.hidden = false; b.setAttribute('aria-expanded','true'); if (wasShut && !reduceMotion() && m.animate) jumpAnim(m, true);
}
// scroll to a section below the sticky header
function jumpTo(i){
  closeJump();
  if (i < 0) return window.scrollTo({top:0, behavior: reduceMotion() ? 'auto' : 'smooth'});
  const s = jumpSecs()[i]; if (!s) return;
  const top = $('.top'), hb = top ? top.getBoundingClientRect().height : 0;
  window.scrollTo({top: s.el.getBoundingClientRect().top + window.scrollY - hb - 10, behavior: reduceMotion() ? 'auto' : 'smooth'});
  s.el.classList.add('jumped'); setTimeout(() => s.el.classList.remove('jumped'), 900);
}
document.addEventListener('click', e => { if (!e.target.closest('#jumpmenu,#jumpbtn')) closeJump(); }, true);
// switch to a tab (no re-render)
function showTab(k){
  if (k==='stats' && window.matchMedia('(min-width:1040px)').matches) k = 'combat';
  ui.tab = k; saveUi();
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab===k)));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.dataset.panel===k));
  const nav = $('#tabs'), act = nav && nav.querySelector('[aria-selected="true"]');
  if (nav && act) { const l = act.offsetLeft - nav.offsetLeft, r = l + act.offsetWidth; if (l < nav.scrollLeft + 24) nav.scrollLeft = Math.max(0, l - 32); else if (r > nav.scrollLeft + nav.clientWidth - 24) nav.scrollLeft = r - nav.clientWidth + 32; }
  tabEdges(); paintPager(); paintJump();
}
