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

  // ── background dice: pick one up and throw it ──────────────────────────────────────────────────────
  // The dice sit behind the page (.bgdice, no pointer events), so a press is matched to a die by position, and only
  // when it doesn't land on something you can use (link, button, video, dice tray). Mouse: grab straight away.
  // Touch: hold still on a die for a moment first, so a swipe over one still just scrolls the page.
  // Thrown, it slides, spins and bounces off the window edges; when it stops it goes back to tumbling where it landed.
  {
    const layer = document.querySelector('.bgdice'), dice = layer ? [...layer.querySelectorAll('.bd')] : [];
    const busy = 'a,button,input,textarea,select,label,summary,video,.sw,#tray,.phone,.clip';
    const hit = (x, y, t) => { if (!t || (t.closest && t.closest(busy))) return null;
      for (let i = dice.length - 1; i >= 0; i--) { const r = dice[i].getBoundingClientRect(), pad = Math.max(0, 22 - r.width / 2);
        if (x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad) return dice[i]; } return null; };
    let held = null, hold = 0;
    // take a die out of its tumble: freeze it where it is, as left/top (px, in the layer) + rotate
    const lift = d => {
      const m = new DOMMatrix(getComputedStyle(d).transform === 'none' ? undefined : getComputedStyle(d).transform);
      const r = d.getBoundingClientRect(), L = layer.getBoundingClientRect(), w = d.clientWidth, h = d.clientHeight;
      const st = { d, w, h, x: r.left + r.width / 2 - L.left - w / 2, y: r.top + r.height / 2 - L.top - h / 2,
        a: (parseFloat(d.style.rotate) || 0) + Math.atan2(m.b, m.a) * 180 / Math.PI, vx: 0, vy: 0, va: 0, t: performance.now() };
      cancelAnimationFrame(d._fly); d.classList.add('held'); d.style.animation = 'none'; place(st); return st;
    };
    const place = s => { s.d.style.left = s.x + 'px'; s.d.style.top = s.y + 'px'; s.d.style.rotate = s.a + 'deg'; };
    const start = (e, d) => {
      held = lift(d); held.px = e.clientX; held.py = e.clientY; held.id = e.pointerId;
      document.documentElement.classList.add('grabbing-die'); e.preventDefault && e.preventDefault();
    };
    addEventListener('pointerdown', e => {
      if (held || e.button > 0) return; const d = hit(e.clientX, e.clientY, e.target); if (!d) return;
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') return start(e, d);
      const x0 = e.clientX, y0 = e.clientY;   // touch: a short still hold picks it up
      hold = setTimeout(() => { hold = 0; start({ clientX: x0, clientY: y0, pointerId: e.pointerId }, d); if (navigator.vibrate) navigator.vibrate(8); }, 220);
    });
    addEventListener('pointermove', e => {
      if (hold && e.pointerType !== 'mouse') { clearTimeout(hold); hold = 0; }   // moved: it's a scroll
      if (!held) { if (e.pointerType === 'mouse') { const on = !!hit(e.clientX, e.clientY, e.target); document.documentElement.classList.toggle('grab-die', on); } return; }
      const now = performance.now(), dt = Math.max(8, now - held.t), dx = e.clientX - held.px, dy = e.clientY - held.py;
      held.x += dx; held.y += dy; held.a += dx * 0.4;
      held.vx = held.vx * 0.3 + (dx / dt) * 0.7; held.vy = held.vy * 0.3 + (dy / dt) * 0.7;   // px per ms, smoothed
      held.px = e.clientX; held.py = e.clientY; held.t = now; place(held);
    });
    // while a die is held, a finger drags the die, not the page
    addEventListener('touchmove', e => { if (held) e.preventDefault(); }, { passive: false });
    const drop = () => {
      clearTimeout(hold); hold = 0; if (!held) return; const s = held; held = null;
      document.documentElement.classList.remove('grabbing-die');
      if (performance.now() - s.t > 90) { s.vx = s.vy = 0; }   // stopped before letting go: no throw
      s.vx *= 16; s.vy *= 16; s.va = s.vx * 1.6;   // px per frame
      let last = performance.now();
      const fly = now => {
        const k = Math.min(3, (now - last) / 16.7); last = now;
        const W = layer.clientWidth, H = layer.clientHeight;
        s.x += s.vx * k; s.y += s.vy * k; s.a += s.va * k;
        if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx) * 0.7; s.va = -s.va; } if (s.x > W - s.w) { s.x = W - s.w; s.vx = -Math.abs(s.vx) * 0.7; s.va = -s.va; }
        if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy) * 0.7; } if (s.y > H - s.h) { s.y = H - s.h; s.vy = -Math.abs(s.vy) * 0.7; }
        const f = Math.pow(0.95, k); s.vx *= f; s.vy *= f; s.va *= f; place(s);
        if (Math.abs(s.vx) + Math.abs(s.vy) > 0.15) s.d._fly = requestAnimationFrame(fly);
        else { s.d.classList.remove('held'); s.d.style.animation = ''; s.d.style.animationDelay = '0s'; }   // tumble on from here
      };
      s.d._fly = requestAnimationFrame(fly);
    };
    addEventListener('pointerup', drop); addEventListener('pointercancel', drop); addEventListener('blur', drop);
  }

  // ── demo clips (web/media): load when near, play while a third is in view, pause when scrolled away.
  //    With reduce-motion they never start by themselves: the poster shows, with the browser's play controls.
  // The hero's phone (.herovid) is decoration: with reduce-motion it just keeps its poster, without controls.
  // Nothing loads before the page itself has (window load), so the videos never slow the first view.
  const clips = [...document.querySelectorAll('.clip video, .herovid')];
  if (still || !('IntersectionObserver' in window)) clips.forEach(v => { if (!v.classList.contains('herovid')) { v.controls = true; v.preload = 'metadata'; } });
  else {
    const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.preload = 'auto'; near.unobserve(e.target); } }), { rootMargin: '600px 0px' });
    const seen = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target; if (e.isIntersecting) { const go = v.play(); if (go && go.catch) go.catch(() => { v.controls = true; }); } else v.pause();
    }), { threshold: 0.35 });
    const watch = () => clips.forEach(v => { near.observe(v); seen.observe(v); });
    if (document.readyState === 'complete') watch(); else addEventListener('load', watch, { once: true });
  }

  // ── dice tray ───────────────────────────────────────────────────────────────────────────────────────
  // Swatches grouped like the sheet's ☰ → Dice Sets. Each starts as a flat d20 shape in the set's colours and becomes a
  // picture of that set's real 3D d20 once three.js is here. Tap a set: it's chosen and throws three random dice of it.
  const D = window.HomeDice; if (!D) return;
  const keys = D.order.flatMap(g => g[1]), tray = $('#tray'), sw = $('#swatches');
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
    const s = D.sets[k]; $('#setname').innerHTML = '<b>' + s.name + ':</b> <span>' + s.desc + '</span>';
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
    const px = Math.round(Math.min(2, devicePixelRatio || 1) * 84), todo = [...sw.querySelectorAll('.sw')];
    const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 30));
    const step = () => { todo.splice(0, 4).forEach(b => { const url = D.thumb(b.dataset.k, px); if (!url) return;
      b.firstChild.innerHTML = '<img src="' + url + '" alt="" width="84" height="84" draggable="false">'; b.classList.add('d3'); });
      if (todo.length) idle(step); };
    idle(step);
  }
  const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % n); };
  const SIZES = [4, 6, 8, 10, 12, 20];
  async function roll(dice){
    if (rolling || still) return; rolling = rolled = true;
    if (!(await loadThree())) { rolling = false; return; }
    D.use(cur); D.roll(dice, () => { rolling = false; });
  }
  const three3 = () => roll([0, 1, 2].map(() => { const s = SIZES[rnd(SIZES.length) - 1]; return { s, v: rnd(s) }; }));
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
