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

  // ── background dice: pick one up, throw it, knock others ──────────────────────────────────────────
  // The dice sit behind the page (.bgdice, no pointer events), so a press is matched to a die by position, and only
  // when it doesn't land on something you can use (link, button, video, dice tray). Mouse: hovering one lights it up,
  // grab straight away. Touch: hold still on a die for a moment first, so a swipe over one still just scrolls the page.
  // One small physics loop runs while anything moves: thrown dice slide, spin and bounce off the window edges, and a
  // die that hits another passes on speed along the line between them (bigger dice are heavier; a held die just pushes).
  // A die that comes to rest goes back to tumbling where it stopped.
  {
    const layer = document.querySelector('.bgdice'), dice = layer ? [...layer.querySelectorAll('.bd')] : [];
    const busy = 'a,button,input,textarea,select,label,summary,video,.sw,#tray,.phone,.clip,.card,.features li,.steps > li,.dicebox,.quicklink,.pc,.msg';
    const hit = (x, y, t) => { if (!t || (t.closest && t.closest(busy))) return null;
      for (let i = dice.length - 1; i >= 0; i--) { const r = dice[i].getBoundingClientRect(), pad = Math.max(0, 22 - r.width / 2);
        if (x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad) return dice[i]; } return null; };
    const live = new Map();   // die → { x, y (top-left px in the layer), a (deg), vx, vy (px per frame), va, w, h, m, held }
    let held = null, hold = 0, hot = null, raf = 0, last = 0;
    const place = s => { s.d.style.left = s.x + 'px'; s.d.style.top = s.y + 'px'; s.d.style.rotate = s.a + 'deg'; };
    // take a die out of its tumble: freeze it where it is, as left/top + rotate
    const lift = d => {
      if (live.has(d)) return live.get(d);
      const cs = getComputedStyle(d).transform, m = new DOMMatrix(cs === 'none' ? undefined : cs);
      const r = d.getBoundingClientRect(), L = layer.getBoundingClientRect(), w = d.clientWidth, h = d.clientHeight;
      const st = { d, w, h, m: w * w, x: r.left + r.width / 2 - L.left - w / 2, y: r.top + r.height / 2 - L.top - h / 2,
        a: (parseFloat(d.style.rotate) || 0) + Math.atan2(m.b, m.a) * 180 / Math.PI, vx: 0, vy: 0, va: 0, held: false };
      d.style.animation = 'none'; place(st); live.set(d, st); return st;
    };
    const rest = s => { live.delete(s.d); s.d.style.animation = ''; s.d.style.animationDelay = '0s'; };   // tumble on from here
    // where a still (tumbling) die's centre is right now
    const centre = (d, L) => { const r = d.getBoundingClientRect(); return { x: r.left + r.width / 2 - L.left, y: r.top + r.height / 2 - L.top }; };
    const step = now => {
      const k = Math.min(3, (now - last) / 16.7); last = now;
      const W = layer.clientWidth, H = layer.clientHeight, L = layer.getBoundingClientRect(), f = Math.pow(0.95, k);
      for (const s of live.values()) if (!s.held) {
        s.x += s.vx * k; s.y += s.vy * k; s.a += s.va * k;
        if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx) * 0.7; s.va = -s.va; } if (s.x > W - s.w) { s.x = W - s.w; s.vx = -Math.abs(s.vx) * 0.7; s.va = -s.va; }
        if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy) * 0.7; } if (s.y > H - s.h) { s.y = H - s.h; s.vy = -Math.abs(s.vy) * 0.7; }
        s.vx *= f; s.vy *= f; s.va *= f;
      }
      // collisions: every moving (or held) die against every other die
      for (const a of [...live.values()]) {
        if (!a.held && Math.abs(a.vx) + Math.abs(a.vy) < 0.05) continue;
        for (const d of dice) {
          if (d === a.d) continue;
          const b0 = live.get(d), ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, cb = b0 ? { x: b0.x + b0.w / 2, y: b0.y + b0.h / 2 } : centre(d, L);
          const bw = b0 ? b0.w : d.clientWidth, min = (a.w + bw) * 0.42, dx = cb.x - ca.x, dy = cb.y - ca.y, dist = Math.hypot(dx, dy);
          if (dist >= min || dist < 0.01) continue;
          const b = lift(d), nx = dx / dist, ny = dy / dist, ia = a.held ? 0 : 1 / a.m, ib = b.held ? 0 : 1 / b.m;
          if (!ia && !ib) continue;
          const over = min - dist; a.x -= nx * over * ia / (ia + ib); a.y -= ny * over * ia / (ia + ib); b.x += nx * over * ib / (ia + ib); b.y += ny * over * ib / (ia + ib);
          const rvx = a.vx - b.vx, rvy = a.vy - b.vy, rel = rvx * nx + rvy * ny;
          if (rel <= 0) continue;   // already moving apart
          const j = 1.8 * rel / (ia + ib);   // restitution 0.8
          a.vx -= j * ia * nx; a.vy -= j * ia * ny; b.vx += j * ib * nx; b.vy += j * ib * ny;
          const spin = (nx * rvy - ny * rvx) * 0.9; b.va += spin; if (!a.held) a.va -= spin * ib / (ia + ib);   // a glancing hit sets it spinning
        }
      }
      for (const s of [...live.values()]) { place(s); if (!s.held && Math.abs(s.vx) + Math.abs(s.vy) < 0.15 && Math.abs(s.va) < 1) rest(s); }
      raf = live.size ? requestAnimationFrame(step) : 0;
    };
    const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    const setHot = d => { if (hot === d) return; if (hot) hot.classList.remove('hot'); hot = d; if (d) d.classList.add('hot'); document.documentElement.classList.toggle('grab-die', !!d); };
    const start = (e, d) => {
      held = lift(d); held.held = true; held.vx = held.vy = held.va = 0; held.px = e.clientX; held.py = e.clientY; held.t = performance.now();
      d.classList.add('held'); setHot(null); document.documentElement.classList.add('grabbing-die'); run();
    };
    addEventListener('pointerdown', e => {
      if (held || e.button > 0) return; const d = hit(e.clientX, e.clientY, e.target); if (!d) return;
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') { e.preventDefault(); return start(e, d); }
      const x0 = e.clientX, y0 = e.clientY;   // touch: a short still hold picks it up
      hold = setTimeout(() => { hold = 0; start({ clientX: x0, clientY: y0 }, d); if (navigator.vibrate) navigator.vibrate(8); }, 220);
    });
    addEventListener('pointermove', e => {
      if (hold && e.pointerType !== 'mouse') { clearTimeout(hold); hold = 0; }   // moved: it's a scroll
      if (!held) { if (e.pointerType === 'mouse') setHot(hit(e.clientX, e.clientY, e.target)); return; }
      const now = performance.now(), dt = Math.max(8, now - held.t), dx = e.clientX - held.px, dy = e.clientY - held.py;
      held.x += dx; held.y += dy; held.a += dx * 0.4;
      held.vx = held.vx * 0.3 + (dx / dt) * 16.7 * 0.7; held.vy = held.vy * 0.3 + (dy / dt) * 16.7 * 0.7;   // px per frame, smoothed
      held.px = e.clientX; held.py = e.clientY; held.t = now;
    });
    addEventListener('mouseout', e => { if (!e.relatedTarget) setHot(null); });
    // while a die is held, a finger drags the die, not the page
    addEventListener('touchmove', e => { if (held) e.preventDefault(); }, { passive: false });
    const drop = () => {
      clearTimeout(hold); hold = 0; if (!held) return; const s = held; held = null;
      s.held = false; s.d.classList.remove('held'); document.documentElement.classList.remove('grabbing-die');
      if (performance.now() - s.t > 90) s.vx = s.vy = 0;   // stopped before letting go: no throw
      s.va = s.vx * 1.6; run();
    };
    addEventListener('pointerup', drop); addEventListener('pointercancel', drop); addEventListener('blur', drop);
  }

  // ── Try a sample character: the picker dialog (links work on their own too; #try opens it) ─────────────────────
  {
    const dlg = $('#try');
    if (dlg && dlg.showModal) {
      const open = () => { if (!dlg.open) dlg.showModal(); };
      document.addEventListener('click', e => { if (e.target.closest('a[href="#try"]')) { e.preventDefault(); open(); } });
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // a tap on the backdrop closes it
      if (location.hash === '#try') open();
    }
  }

  // ── phones: the sticky Get started bar shows while no other Get started (hero, How it works) is on screen ────────
  {
    const bar = $('.stickycta'), own = [...document.querySelectorAll('#landing .btn.cta')].filter(b => !bar.contains(b)), seen = new Set();
    if (bar && 'IntersectionObserver' in window) {
      const set = () => { const on = !seen.size && scrollY > 200; bar.classList.toggle('on', on); bar.setAttribute('aria-hidden', String(!on)); bar.firstElementChild.tabIndex = on ? 0 : -1; };
      const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); set(); });
      own.forEach(b => io.observe(b)); addEventListener('scroll', set, { passive: true });
    }
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
    + ks.map(k => { const s = D.sets[k]; return '<button type="button" class="sw" role="radio" data-k="' + k + '" aria-label="' + s.name + ': ' + s.desc + '"><span>20</span></button>'; }).join('')
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
  // three different dice (never two d20s): shuffle the six shapes, take three
  const three3 = () => { const z = SIZES.slice(); for (let i = z.length - 1; i > 0; i--) { const j = rnd(i + 1) - 1; [z[i], z[j]] = [z[j], z[i]]; }
    roll(z.slice(0, 3).map(s => ({ s, v: rnd(s) }))); };
  sw.addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; pick(b.dataset.k); three3(); });
  // the set's name in a bubble above it, like the app's tooltips: on mouse hover and keyboard focus (on touch the
  // name already shows under the tray when you tap)
  let tip = null;
  const showTip = b => {
    hideTip(); const s = D.sets[b.dataset.k]; tip = document.createElement('div'); tip.className = 'dtip'; tip.setAttribute('aria-hidden', 'true');
    tip.innerHTML = '<span class="bk">' + (D.order.find(g => g[1].includes(b.dataset.k)) || [''])[0] + '</span><span class="bt">' + s.name + '</span>' + s.desc;
    document.body.appendChild(tip);
    const r = b.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, cx = r.left + r.width / 2;
    const left = Math.max(12, Math.min(innerWidth - w - 12, cx - w / 2));
    tip.style.left = left + 'px'; tip.style.top = Math.max(8, r.top - h - 10) + 'px'; tip.style.setProperty('--tx', (cx - left) + 'px');
  };
  const hideTip = () => { if (tip) { tip.remove(); tip = null; } };
  sw.addEventListener('pointerover', e => { const b = e.target.closest('.sw'); if (b && e.pointerType === 'mouse') showTip(b); });
  sw.addEventListener('pointerout', e => { const b = e.target.closest('.sw'); if (b && !b.contains(e.relatedTarget)) hideTip(); });
  sw.addEventListener('focusin', e => { const b = e.target.closest('.sw'); if (b && b.matches(':focus-visible')) showTip(b); });
  sw.addEventListener('focusout', hideTip); addEventListener('scroll', hideTip, { passive: true });

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
