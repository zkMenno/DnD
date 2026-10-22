// Front page motion and the dice tray (src/landing.html). Nothing here is needed to sign up: Get started works before
// this file loads, and with "reduce motion" on the page stays still (rolls just show the number).
//   reveal: cards and steps fade up as they scroll into view (html.anim turns it on)
//   tray:   the sheet's 24 dice sets as swatches; tap one or "Roll a d20" to throw a 3D die (window.HomeDice, built
//           from src/engine/06-3d-dice.js by tools/build.js). three.js (600 KB) loads only when the tray comes near.
//   demo:   the first time the tray is in view and the visitor pauses, one die is thrown for them (once per visit)
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

  // ── dice tray ───────────────────────────────────────────────────────────────────────────────────────
  const D = window.HomeDice; if (!D) return;
  const keys = Object.keys(D.sets), tray = $('#tray'), out = $('#rollout'), btn = $('#rollbtn');
  let cur = keys.includes(store.get('dt-front-dice')) ? store.get('dt-front-dice') : D.def, rolling = false, rolled = false;
  $('#dice-count').textContent = keys.length;
  $('#swatches').innerHTML = keys.map(k => { const s = D.sets[k];
    return '<button type="button" class="sw" role="radio" data-k="' + k + '" aria-label="' + s.name + '" title="' + s.name + ': ' + s.desc + '"><span>20</span></button>'; }).join('');
  document.querySelectorAll('#swatches .sw').forEach(b => { const c = D.sets[b.dataset.k].css;
    b.style.setProperty('--a', c[0]); b.style.setProperty('--b', c[1]); b.style.setProperty('--ink', c[2]); });
  const pick = k => {
    cur = k; D.use(k); store.set('dt-front-dice', k);
    document.querySelectorAll('#swatches .sw').forEach(b => { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    const s = D.sets[k]; $('#setname').innerHTML = '<b>' + s.name + '</b> <span>' + s.desc + (D.groups[s.group] ? ' · ' + D.groups[s.group] : '') + '</span>';
  };
  pick(cur); tray.hidden = false;

  // three.js: once, from this site (the page's security policy allows no other script source)
  let three = null;
  const loadThree = () => three || (three = new Promise(res => {
    if (window.THREE) return res(true);
    const s = document.createElement('script'); s.src = '/three.min.js'; s.async = true;
    s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s);
    setTimeout(() => res(!!window.THREE), 8000);   // slow line: give up on 3D, still show the number
  }));
  const d20 = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % 20); };
  const show = v => {
    out.className = 'rollout' + (v === 20 ? ' crit' : v === 1 ? ' fumble' : '');
    out.innerHTML = '<b>' + v + '</b><span>' + (v === 20 ? 'Natural 20!' : v === 1 ? 'Natural 1. Ouch.' : 'on a d20') + '</span>';
    if (v === 20 && !still) out.insertAdjacentHTML('beforeend', '<i class="spark" aria-hidden="true"></i>'.repeat(10));
    void out.offsetWidth; out.classList.add('pop');
  };
  async function roll(){
    if (rolling) return; rolling = rolled = true; btn.disabled = true;
    const v = d20(); out.className = 'rollout'; out.innerHTML = '<span>Rolling…</span>';
    const finish = () => { show(v); rolling = false; btn.disabled = false; };
    if (still) return finish();
    if (!(await loadThree())) return finish();
    D.use(cur); D.roll([{ s: 20, v }], finish);
  }
  btn.addEventListener('click', roll);
  $('#swatches').addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; pick(b.dataset.k); roll(); });
  // arrow keys move between swatches (a radio group)
  $('#swatches').addEventListener('keydown', e => {
    const i = keys.indexOf(cur), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
    e.preventDefault(); pick(keys[(i + d + keys.length) % keys.length]); $('#swatches .sw.on').focus();
  });

  // fetch three.js when the tray comes near; throw one demo die the first time it's properly in view
  if ('IntersectionObserver' in window) {
    let timer = 0;
    if (!still) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) loadThree(); }), { rootMargin: '400px 0px' }).observe(tray);
    const demo = new IntersectionObserver(es => es.forEach(e => {
      clearTimeout(timer);
      let seen = false; try { seen = !!sessionStorage.getItem('dt-demo'); } catch (_) {}
      if (!e.isIntersecting || still || rolled || seen) return;
      timer = setTimeout(() => { if (rolled) return; try { sessionStorage.setItem('dt-demo', '1'); } catch (_) {} demo.disconnect(); roll(); }, 900);
    }), { threshold: 0.6 });
    demo.observe(tray);
  }
})();
