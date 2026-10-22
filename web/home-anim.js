// Front page motion and the dice tray (src/landing.html). Nothing here is needed to sign up: Get started works before
// this file loads, and with "reduce motion" on the page stays still (rolls just show the number).
//   reveal: cards and steps fade up as they scroll into view (html.anim turns it on)
//   tray:   the sheet's dice sets, grouped, as pictures of each set's 3D d20; tap one to throw three random dice of it,
//           or "Roll a d20" (window.HomeDice: src/home-dice-api.js + the sheet's 3D dice, built by tools/build.js).
//           three.js (600 KB) loads only when the tray comes near.
//   demo:   the first time the tray is in view and the visitor pauses, three dice are thrown for them (once per visit)
(() => {
  const $ = s => document.querySelector(s), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
  if (!$('#landing')) return;

  // ── reveal on scroll ────────────────────────────────────────────────────────────────────────────────
  if (!still && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('anim');
    document.querySelectorAll('.features .reveal, .steps .reveal').forEach(el => el.style.setProperty('--i', [...el.parentNode.children].indexOf(el)));   // stagger
    const show = el => { el.classList.add('in'); io.unobserve(el); };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) show(e.target); }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    // a jump to the bottom or a fast fling skips straight over some: anything already above the screen shows too
    let queued = false;
    addEventListener('scroll', () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false;
      document.querySelectorAll('.reveal:not(.in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.height && r.bottom < 0) show(el); }); }); }, { passive: true });
  }

  // ── demo clips (web/media): load when near, play while a third is in view, pause when scrolled away.
  //    With reduce-motion they never start by themselves: the poster shows, with the browser's play controls.
  const clips = [...document.querySelectorAll('.clip video')];
  if (still || !('IntersectionObserver' in window)) clips.forEach(v => { v.controls = true; v.preload = 'metadata'; });
  else {
    const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.preload = 'auto'; near.unobserve(e.target); } }), { rootMargin: '600px 0px' });
    const seen = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target; if (e.isIntersecting) { const go = v.play(); if (go && go.catch) go.catch(() => { v.controls = true; }); } else v.pause();
    }), { threshold: 0.35 });
    clips.forEach(v => { near.observe(v); seen.observe(v); });
  }

  // ── dice tray ───────────────────────────────────────────────────────────────────────────────────────
  // Swatches grouped like the sheet's ☰ → Dice Sets. Each starts as a flat d20 shape in the set's colours and becomes a
  // picture of that set's real 3D d20 once three.js is here. Tap a set: it's chosen and throws three random dice of it.
  const D = window.HomeDice; if (!D) return;
  const keys = D.order.flatMap(g => g[1]), tray = $('#tray'), out = $('#rollout'), btn = $('#rollbtn'), sw = $('#swatches');
  const groupOf = k => (D.order.find(g => g[1].includes(k)) || [''])[0];
  let cur = keys.includes(store.get('dt-front-dice')) ? store.get('dt-front-dice') : D.def, rolling = false, rolled = false;
  $('#dice-count').textContent = keys.length;
  sw.innerHTML = D.order.map(([label, ks]) => '<div class="sgroup" role="group" aria-label="' + label + '"><h4>' + label + '</h4><div class="srow">'
    + ks.map(k => { const s = D.sets[k]; return '<button type="button" class="sw" role="radio" data-k="' + k + '" aria-label="' + s.name + '" title="' + s.name + ': ' + s.desc + '"><span>20</span></button>'; }).join('')
    + '</div></div>').join('');
  sw.querySelectorAll('.sw').forEach(b => { const c = D.sets[b.dataset.k].css;
    b.style.setProperty('--a', c[0]); b.style.setProperty('--b', c[1]); b.style.setProperty('--ink', c[2]); });
  const pick = k => {
    cur = k; D.use(k); store.set('dt-front-dice', k);
    sw.querySelectorAll('.sw').forEach(b => { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    const s = D.sets[k]; $('#setname').innerHTML = '<b>' + s.name + '</b> <span>' + s.desc + ' · ' + groupOf(k) + '</span>';
  };
  pick(cur); tray.hidden = false;

  // three.js: once, from this site (the page's security policy allows no other script source)
  let three = null;
  const loadThree = () => three || (three = new Promise(res => {
    if (window.THREE) return res(true);
    const s = document.createElement('script'); s.src = '/three.min.js'; s.async = true;
    s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s);
    setTimeout(() => res(!!window.THREE), 8000);   // slow line: give up on 3D, still show the numbers
  }));
  // the swatches' 3D pictures: a few per idle moment, so scrolling stays smooth (still pictures, so also with reduce-motion)
  let thumbsDone = false;
  async function thumbs(){
    if (thumbsDone || !(await loadThree())) return; thumbsDone = true; await D.fonts();
    const px = Math.round(Math.min(2, devicePixelRatio || 1) * 52), todo = [...sw.querySelectorAll('.sw')];
    const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 30));
    const step = () => { todo.splice(0, 4).forEach(b => { const url = D.thumb(b.dataset.k, px); if (!url) return;
      b.firstChild.innerHTML = '<img src="' + url + '" alt="" width="52" height="52" draggable="false">'; b.classList.add('d3'); });
      if (todo.length) idle(step); };
    idle(step);
  }
  const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % n); };
  const SIZES = [4, 6, 8, 10, 12, 20];
  // one d20 → its number big; several dice → each number with its die
  const show = dice => {
    const nat = dice.some(d => d.s === 20 && d.v === 20), one = dice.length === 1 && dice[0].v === 1;
    out.className = 'rollout' + (nat ? ' crit' : one ? ' fumble' : '');
    out.innerHTML = dice.length === 1
      ? '<b>' + dice[0].v + '</b><span>' + (nat ? 'Natural 20!' : one ? 'Natural 1. Ouch.' : 'on a d20') + '</span>'
      : '<span class="dlist">' + dice.map(d => '<span class="rd"><b>' + d.v + '</b><small>d' + d.s + '</small></span>').join('') + '</span>' + (nat ? '<span>Natural 20!</span>' : '');
    if (nat && !still) out.insertAdjacentHTML('beforeend', '<i class="spark" aria-hidden="true"></i>'.repeat(10));
    void out.offsetWidth; out.classList.add('pop');
  };
  async function roll(dice){
    if (rolling) return; rolling = rolled = true; btn.disabled = true;
    out.className = 'rollout'; out.innerHTML = '<span>Rolling…</span>';
    const finish = () => { show(dice); rolling = false; btn.disabled = false; };
    if (still) return finish();
    if (!(await loadThree())) return finish();
    D.use(cur); D.roll(dice, finish);
  }
  const d20 = () => roll([{ s: 20, v: rnd(20) }]);
  const three3 = () => roll([0, 1, 2].map(() => { const s = SIZES[rnd(SIZES.length) - 1]; return { s, v: rnd(s) }; }));
  btn.addEventListener('click', d20);
  sw.addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; pick(b.dataset.k); three3(); });
  // arrow keys move between swatches (a radio group), in the order shown
  sw.addEventListener('keydown', e => {
    const i = keys.indexOf(cur), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
    e.preventDefault(); pick(keys[(i + d + keys.length) % keys.length]); sw.querySelector('.sw.on').focus();
  });

  // three.js and the 3D pictures when the tray comes near; one demo throw the first time it's properly in view
  if ('IntersectionObserver' in window) {
    let timer = 0;
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) thumbs(); }), { rootMargin: '400px 0px' }).observe(tray);
    const demo = new IntersectionObserver(es => es.forEach(e => {
      clearTimeout(timer);
      let seen = false; try { seen = !!sessionStorage.getItem('dt-demo'); } catch (_) {}
      if (!e.isIntersecting || still || rolled || seen) return;
      timer = setTimeout(() => { if (rolled) return; try { sessionStorage.setItem('dt-demo', '1'); } catch (_) {} demo.disconnect(); three3(); }, 900);
    }), { threshold: 0.6 });
    demo.observe(tray);
  } else thumbs();
})();
