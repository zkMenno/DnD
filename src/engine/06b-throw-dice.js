// ── §6b Throw it yourself: the player flicks the 3D dice ───────────────────────────────────────────────────────
// A second way to roll, next to the automatic throw (dice3d, §6). With ☰ → Rolling → "Throw it yourself", the dice
// a roll needs appear resting near the bottom of the screen and wait. The player grabs them (touch or mouse), drags
// and lets go: the release speed and direction set the throw. A tap without a drag gives a gentle toss, and Enter or
// Space throws from the keyboard. "Roll for me" (or Escape) hands over to the automatic throw instead.
// The numbers are still rolled first, by the roll flows (§8, §8b, §18), exactly as before. The throw is worked out
// in full the moment the dice leave the hand (a small 2D table with walls, friction, bounces and dice knocking into
// each other), and the dice's turning is then wound back from the face they must show, so each die rolls naturally
// along its own path and comes to rest showing the value the roll already uses.
// Feature switch: FEATURES.throwDice (below). Off, nothing here runs: the menu row is empty, throwWanted() is false
// and fx() (§5) plays dice3d() as it always did.
// Defines: FEATURES, previewHost, throwOn, throwWanted, rollStyleRow, setRollStyle, throwDice.
// Uses: THREE, D3, d3Ready, d3Die, d3Shape, diceSet, dice3d, DICE_PREVIEW (§6); ui, saveUi (§3); reduceMotion (§4);
//   paintMenu, dicePromptMaybe (§18); dicePromptAfterRoll (§4). Styles: the "Throw it yourself" block at the end of
//   src/app.css.
// Also built into the front page's dice (tools/build.js → web/home-dice.js, after §6), where only throwDice() is
// called (the dice tray's test rolls; styles in web/home.css). The rest of this file (the menu row, the setting) is
// never called there, and the dice prompt is checked with typeof first, so it needs no other part of the sheet.

// ── Feature switch ─────────────────────────────────────────────────────────────────────────────────────────
// Staging and live run the same build, so features that aren't released yet are switched on by the address the app
// is opened at: the staging site and local development. claude.ai sheets have no window.SHEET and never get them.
// True for a host name where preview features are on: staging.dungeontracker.com, localhost, 127.0.0.1, *.localhost.
function previewHost(h){
  h = String(h || '').toLowerCase();
  return h === 'staging.dungeontracker.com' || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}
// Feature switches. "Throw it yourself" was a staging-only preview (throwDice: !!window.SHEET && previewHost(…)) and
// was released everywhere in the web app on 23 Oct 2026; previewHost stays for the next preview feature.
// Tests may switch a feature on directly: FEATURES.throwDice = true.
const FEATURES = {
  preview: previewHost(location.hostname),   // staging and local: where the next preview feature goes first
  throwDice: !!window.SHEET,
};

// ── The setting ────────────────────────────────────────────────────────────────────────────────────────────
// ui.rolling (this device): 'throw' (the default since 23 Oct 2026, also when unset) or 'auto'.
// ARCHIVED, KEPT UNTIL ABOUT 22 DEC 2026 (see CLEANUP.md): the 'auto' choice ("🎲 Automatic" in the menu), the old
// way where every roll throws itself. The automatic throw itself (dice3d, §6) is NOT dead code and stays: "Roll for
// me", reduced motion, devices without 3D and the dice-set previews all use it. What may go after that date is only
// the menu choice and the ui.rolling === 'auto' branch, if nobody missed it. Ask Menno before deleting.
// True when this device throws its own dice: the feature is on here and the setting isn't 'auto'.
const throwOn = () => !!FEATURES.throwDice && ui.rolling !== 'auto';
// True when the next dice animation should wait for the player: the setting is on, it isn't a dice-set preview from
// the menu (those always roll by themselves), motion is allowed and the 3D dice can run. Otherwise fx() uses dice3d().
const throwWanted = () => throwOn() && !DICE_PREVIEW && !reduceMotion() && d3Ready();
// The ☰ menu row under Dice Sets: "Rolling: Automatic · Throw it yourself". Empty where the feature is off.
function rollStyleRow(){
  if (!FEATURES.throwDice) return '';
  const on = throwOn(), b = (m, t, pressed) => '<button data-act="rollstyle" data-m="'+m+'" aria-pressed="'+pressed+'">'+t+'</button>';
  return '<div class="rollstyle"><h4 class="menuh">Rolling</h4>'
    + '<div class="skinmode" role="group" aria-label="Rolling">'+b('throw', '🤚 Throw it yourself', on)+b('auto', '🎲 Automatic', !on)+'</div>'
    + '<p class="small muted" style="margin:6px 2px 0">'+(on ? 'The dice wait for you: flick them, or tap for a gentle toss.' : 'The dice roll by themselves.')+' Saved on this device.</p></div>';
}
// Picks the rolling style ('auto' or 'throw') for this device and redraws the menu.
function setRollStyle(m){
  if (!FEATURES.throwDice) return;
  ui.rolling = m === 'throw' ? 'throw' : 'auto'; saveUi(); paintMenu();
}

// ── Throw tuning ───────────────────────────────────────────────────────────────────────────────────────────
// Simulation step and limits, in world units (the 3D scene's) and seconds. Speeds are clamped so a lazy flick still
// rolls and a wild one doesn't take ages to settle.
const TH = { dt: 1/120, maxT: 4.5, g: 30, bounce: .42, wall: .6, hit: .8, fric: 2.0, drag: 1.1, vMin: 3.2, vMax: 15, hintPx: 104 };

// ── Resting faces ──────────────────────────────────────────────────────────────────────────────────────────
// The orientation that shows face v of a die with s sides to the camera (number upright, tipped back a little), the
// same pose d3Die() (§6) works out for the rolled value. Needs that shape's face labels, so call it after d3Die().
function thFace(s, v){
  const T = THREE, sides = [4,6,8,10,12,20].includes(s) ? s : 6, faces = d3Shape(sides).faces, face = faces[Math.max(0, Math.min(faces.length-1, v-1))];
  const q1 = new T.Quaternion().setFromUnitVectors(face.n.clone().normalize(), new T.Vector3(0,0,1));
  const up = new T.Vector3(0,1,0).applyQuaternion(face.lbl.quaternion).applyQuaternion(q1);
  const q2 = new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1), Math.atan2(up.x, up.y));
  return new T.Quaternion().setFromEuler(new T.Euler(-.32, .18, 0)).multiply(q2.multiply(q1));
}
// "d20", "2d20", "2d6 + d4": what the hint says is being rolled
function thWhat(dice){
  const c = {}; dice.forEach(d => { c[d.s] = (c[d.s] || 0) + 1; });
  return Object.keys(c).sort((a, b) => b - a).map(s => (c[s] > 1 ? c[s] : '')+'d'+s).join(' + ');
}

// ── The flight ─────────────────────────────────────────────────────────────────────────────────────────────
// Works out a whole throw before it plays. objs: the dice ({x, y, r, fin}); v: the throw velocity in world units/s
// ({x, y}, up = +y); box: the table edges ({minX, maxX, minY, maxY}). Every die gets the throw with a little spread,
// flies up and bounces (z), slides and rolls with friction, bounces off the edges and knocks the other dice.
// Fills each die's o.path: one {x, y, z, q} per step (q = orientation), ending exactly on o.fin, and o.stop: the
// step where it last moved.
function thSimulate(objs, v, box){
  const T = THREE, n = objs.length, speed = Math.hypot(v.x, v.y), steps = [];
  const st = objs.map(o => {
    const a = Math.atan2(v.y, v.x) + (n > 1 ? (Math.random() - .5) * .45 : 0), sp = speed * (.88 + Math.random() * .24);
    return { x: o.x, y: o.y, z: o.z || 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 5.5 + speed * .28 + Math.random() * 1.5,
      wob: new T.Vector3(Math.random()-.5, Math.random()-.5, Math.random()-.5).multiplyScalar(.5), rots: [], pos: [], stop: 0 };
  });
  const minD = objs[0].r * 1.9, maxK = Math.round(TH.maxT / TH.dt), axis = new T.Vector3();
  for (let k = 0; k < maxK; k++) {
    let moving = false;
    st.forEach(s => {
      // height: up, gravity, bounces that lose energy until the die stays on the table
      if (s.z > 0 || s.vz > 0) { s.vz -= TH.g * TH.dt; s.z += s.vz * TH.dt;
        if (s.z <= 0) { s.z = 0; s.vz = -s.vz * TH.bounce; if (s.vz < 1.4) s.vz = 0; } }
      // sliding: light air drag in flight, friction (a share plus a little constant braking) on the table
      const sp = Math.hypot(s.vx, s.vy), air = s.z > 0;
      if (sp > 0) { const k2 = air ? Math.exp(-TH.drag * .3 * TH.dt) : Math.max(0, (sp * Math.exp(-TH.fric * TH.dt) - .9 * TH.dt) / sp); s.vx *= k2; s.vy *= k2; }
      s.x += s.vx * TH.dt; s.y += s.vy * TH.dt;
      // the table edges: bounce back, losing some speed
      if (s.x > box.maxX) { s.x = box.maxX; s.vx = -Math.abs(s.vx) * TH.wall; } else if (s.x < box.minX) { s.x = box.minX; s.vx = Math.abs(s.vx) * TH.wall; }
      if (s.y > box.maxY) { s.y = box.maxY; s.vy = -Math.abs(s.vy) * TH.wall; } else if (s.y < box.minY) { s.y = box.minY; s.vy = Math.abs(s.vy) * TH.wall; }
      if (Math.hypot(s.vx, s.vy) < .04 && s.z === 0 && s.vz === 0) { s.vx = s.vy = 0; } else { moving = true; s.stop = k + 1; }
    });
    // dice knocking into each other: push apart, swap speed along the line between them (equal weights)
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const A = st[a], B = st[b], dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy);
      if (dist >= minD || dist < 1e-4) continue;
      const nx = dx / dist, ny = dy / dist, push = (minD - dist) / 2;
      A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
      const rel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny; if (rel <= 0) continue;
      const j = rel * (1 + TH.hit) / 2; A.vx -= j * nx; A.vy -= j * ny; B.vx += j * nx; B.vy += j * ny;
      A.stop = B.stop = k + 1; moving = true;
    }
    // this step's turn for each die: rolling across the table (about the axis across its travel, angle = distance /
    // radius), tumbling faster with a wobble while in the air
    st.forEach((s, i) => {
      const sp = Math.hypot(s.vx, s.vy), r = objs[i].r, q = new T.Quaternion();
      if (sp > 1e-4) { axis.set(-s.vy / sp, s.vx / sp, 0); if (s.z > 0) axis.add(s.wob).normalize(); q.setFromAxisAngle(axis, sp * TH.dt / r * (s.z > 0 ? 1.35 : 1)); }
      s.rots.push(q); s.pos.push({ x: s.x, y: s.y, z: s.z });
    });
    steps.push(k);
    if (!moving) break;
  }
  // wind the turning back from the face the die must show: q[last] = fin, q[k-1] = rot[k]⁻¹ · q[k]
  st.forEach((s, i) => {
    const o = objs[i], N = s.pos.length, qs = new Array(N);
    qs[N-1] = o.fin.clone();
    for (let k = N - 1; k > 0; k--) qs[k-1] = s.rots[k].clone().invert().multiply(qs[k]);
    o.path = s.pos.map((p, k) => ({ x: p.x, y: p.y, z: p.z, q: qs[k] })); o.stop = Math.min(N - 1, s.stop);
  });
  return steps.length;
}

// ── The throw ──────────────────────────────────────────────────────────────────────────────────────────────
// Same contract as dice3d(dice, done) (§6): dice = [{s, v, off?}], the values already rolled; done() runs once they
// have landed and faded. The dice wait, resting, until the player throws them (drag and let go, a tap, Enter or
// Space); "Roll for me" or Escape plays the automatic throw instead. Without WebGL it is the automatic one (which
// falls back to the flat dice itself).
function throwDice(dice, done){
  if (!d3Ready()) return dice3d(dice, done);
  const T = THREE, W = window.innerWidth, Hh = window.innerHeight, fine = matchMedia('(pointer:fine)').matches;
  D3.r.setSize(W, Hh, false); D3.canvas.style.width = W+'px'; D3.canvas.style.height = Hh+'px';
  D3.cam.aspect = W / Hh; D3.cam.updateProjectionMatrix();
  // the overlay: the canvas, and the hint with its skip button. It takes every touch while the dice wait.
  const wrap = document.createElement('div'); wrap.className = 'fx fxdice throwfx'; wrap.tabIndex = -1;
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Throw the dice: drag and let go, tap, or press Enter');
  wrap.appendChild(D3.canvas);
  const many = dice.length > 1, hint = document.createElement('div'); hint.className = 'throwhint';
  hint.innerHTML = '<span class="throwtxt"><b>'+(fine ? 'Drag and let go to roll' : 'Flick the '+(many ? 'dice' : 'die')+' to roll')+'</b>'
    + '<small>'+thWhat(dice)+' · '+(fine ? 'or click · Enter throws' : 'or tap for a gentle toss')+'</small></span>'
    + '<button type="button" class="btn small throwskip">Roll for me</button>';
  wrap.appendChild(hint); document.body.appendChild(wrap);
  try { wrap.focus({preventScroll:true}); } catch(_){}
  const visH = 2 * Math.tan(T.MathUtils.degToRad(17.5)) * 12, px = visH / Hh;   // world units per pixel
  const n = dice.length, perRow = Math.min(n, 4), gapPx = n > 2 ? 78 : 104, size = (n > 2 ? 46 : 58) * px;
  // the table: the whole screen less a die's width at each edge, and above the hint at the bottom
  const box = { maxX: W/2*px - size*1.15, minX: -(W/2*px - size*1.15), maxY: Hh/2*px - size*1.15, minY: -(Hh/2 - TH.hintPx)*px + size*1.15 };
  // the dice rest in a small group a little below the middle of the screen (above the roll sheet), each showing a
  // random face
  const rows = Math.ceil(n / perRow), baseY = -Math.min(Hh * .16, Hh/2 - TH.hintPx - 70 - (rows - 1) * gapPx / 2) * px;
  const objs = dice.map((d, i) => {
    const { die, mat, fin } = d3Die(d, diceSet());
    const row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row*perRow), col = i % perRow;
    const x = (col - (inRow-1)/2) * gapPx * px, y = baseY + ((rows-1)/2 - row) * gapPx * px;
    // a random face up, and turned and tipped at random like a die that came to rest by itself (each die its own)
    const rest = thFace(d.s, 1 + Math.floor(Math.random() * d.s)).premultiply(new T.Quaternion().setFromEuler(new T.Euler(
      (Math.random() - .5) * .5, (Math.random() - .5) * .5, (Math.random() - .5) * 2 * Math.PI))), q = rest.clone();
    die.scale.setScalar(size); die.position.set(x, y, 0); die.quaternion.copy(q); D3.scene.add(die);
    return { die, mat, d, fin, r: size, hx: x, hy: y, x, y, z: 0, rest, q, ph: Math.random() * 6, landed: 0, path: null, stop: 0 };
  });
  // state: 'wait' (resting), 'hold' (being dragged), 'fly' (thrown), 'gone' (cleaned up or handed to dice3d)
  let mode = 'wait', grab = null, t0 = 0, raf = 0, blendFrom = null;
  const samples = [];   // recent pointer positions while dragging: {x, y, t}, for the release speed
  // leaves the overlay: stop listening, take the dice off the scene, remove the overlay
  const teardown = () => {
    mode = 'gone'; cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey, true);
    objs.forEach(o => { D3.scene.remove(o.die); o.mat.dispose(); o.die.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); });
  };
  // "Roll for me": the automatic throw takes over with the same values (it moves the canvas into its own overlay)
  const skip = () => { if (mode === 'gone' || mode === 'fly') return; teardown(); wrap.remove(); dice3d(dice, done); };
  // throws the dice with a velocity in screen px/ms ({x, y}, y down). Too slow (a tap) = a gentle toss up the table.
  const launch = vs => {
    if (mode !== 'wait' && mode !== 'hold') return;
    let vx = vs.x * 1000 * px * .55, vy = -vs.y * 1000 * px * .55, sp = Math.hypot(vx, vy);
    if (sp < TH.vMin * .6) { const a = Math.PI/2 + (Math.random() - .5) * .7; sp = TH.vMin * 1.6 + Math.random() * 1.5; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
    const k = Math.max(TH.vMin, Math.min(TH.vMax, sp)) / sp; vx *= k; vy *= k;
    objs.forEach(o => { o.x = o.die.position.x; o.y = o.die.position.y; o.z = Math.max(0, o.die.position.z); });
    thSimulate(objs, {x: vx, y: vy}, box);
    blendFrom = objs.map(o => o.die.quaternion.clone());
    mode = 'fly'; t0 = performance.now(); wrap.classList.add('thrown');
  };
  // ── Pointer: grab, drag, let go ──
  // Grabbing anywhere on the overlay picks up all the dice (they follow the finger, keeping their spacing), so a
  // near miss of a small die still works.
  wrap.addEventListener('pointerdown', e => {
    if (mode !== 'wait' || e.target.closest('button')) return;
    e.preventDefault(); grab = { id: e.pointerId, sx: e.clientX, sy: e.clientY }; mode = 'hold';
    samples.length = 0; samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    objs.forEach(o => { o.gx = o.die.position.x; o.gy = o.die.position.y; });
    try { wrap.setPointerCapture(e.pointerId); } catch(_){}
  });
  wrap.addEventListener('pointermove', e => {
    if (mode !== 'hold' || !grab || e.pointerId !== grab.id) return;
    const now = performance.now(), last = samples[samples.length - 1];
    samples.push({ x: e.clientX, y: e.clientY, t: now }); while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
    const dx = (e.clientX - grab.sx) * px, dy = -(e.clientY - grab.sy) * px;
    objs.forEach(o => {
      o.die.position.x = Math.max(box.minX, Math.min(box.maxX, o.gx + dx)); o.die.position.y = Math.max(box.minY, Math.min(box.maxY, o.gy + dy));
      // the die turns a little in the hand as it is moved
      const mx = (e.clientX - last.x) * px, my = -(e.clientY - last.y) * px, m = Math.hypot(mx, my);
      if (m > 1e-4) o.q.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(-my / m, mx / m, 0), m / o.r * .5));
    });
  });
  // let go: the speed over the last ~90 ms is the throw
  const release = e => {
    if (mode !== 'hold' || !grab || e.pointerId !== grab.id) return;
    const now = performance.now(); samples.push({ x: e.clientX, y: e.clientY, t: now });
    while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
    const a = samples[0], b = samples[samples.length - 1], dt = Math.max(16, b.t - a.t);
    grab = null; launch({ x: (b.x - a.x) / dt, y: (b.y - a.y) / dt });
  };
  wrap.addEventListener('pointerup', release);
  // the browser took the touch away: the dice go back to rest, nothing is thrown
  wrap.addEventListener('pointercancel', () => { if (mode !== 'hold') return; grab = null; mode = 'wait'; objs.forEach(o => { o.die.position.x = o.hx; o.die.position.y = o.hy; }); });
  // clicks stay inside the overlay (the page's own click handlers never see them); the skip button skips
  wrap.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('.throwskip')) skip(); });
  // ── Keyboard: Enter or Space throws, Escape rolls for me (Enter on the focused skip button skips) ──
  function onKey(e){
    if (mode === 'gone' || e.key === 'Tab') return;
    if (mode === 'fly') { if (e.key !== 'Shift') { e.stopPropagation(); e.preventDefault(); } return; }
    e.stopPropagation(); e.preventDefault(); if (e.repeat) return;
    if (e.key === 'Escape' || ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList.contains('throwskip'))) return skip();
    if (e.key === 'Enter' || e.key === ' ') launch({ x: 0, y: 0 });
  }
  document.addEventListener('keydown', onKey, true);
  // ── Frames ──
  // waiting: the dice breathe a little; held: they lift towards the camera; flying: play the worked-out path,
  // blending out of the held pose over the first moments; then land, pause, fade and hand over to done()
  const frame = now => {
    if (mode === 'gone') return;
    try { step(now); } catch (e) {
      // never leave the dice stuck on screen: on any error, clear up and let the roll finish
      if (mode !== 'gone') { teardown(); wrap.remove(); done(); }
      throw e;
    }
  };
  // one frame (see above); returns without asking for another once the throw is over
  const step = now => {
    if (mode === 'wait' || mode === 'hold') {
      objs.forEach(o => {
        const tz = mode === 'hold' ? 1.1 : .12 + .08 * Math.sin(now / 420 + o.ph);
        o.die.position.z += (tz - o.die.position.z) * .2;
        if (mode === 'wait') { o.q.slerp(o.rest, .08); o.die.position.x += (o.hx - o.die.position.x) * .15; o.die.position.y += (o.hy - o.die.position.y) * .15; }
        o.die.quaternion.copy(o.q).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), .06 * Math.sin(now / 520 + o.ph)));
      });
    } else {
      // (a frame's time can be a little before the throw started: count from 0)
      const el = Math.max(0, now - t0), k = Math.floor(el / 1000 / TH.dt), bl = Math.min(1, el / 200);
      let all = true;
      objs.forEach((o, i) => {
        const p = o.path[Math.min(k, o.path.length - 1)];
        o.die.position.set(p.x, p.y, p.z);
        o.die.quaternion.copy(bl < 1 ? blendFrom[i].clone().slerp(p.q, bl * bl * (3 - 2 * bl)) : p.q);
        if (k >= o.stop && bl >= 1 && !o.landed) { o.landed = now; if (o.d.off) o.mat.opacity = .38; if (o.d.s===20 && o.d.v===1) o.mat.color.setHex(0x8A8A8A); }
        if (!o.landed) all = false;
        const lk = o.landed ? Math.min(1, (now - o.landed) / 220) : 0;
        o.die.scale.setScalar(size * (1 + (o.landed ? .16 * Math.sin(Math.PI * lk) : 0) + (o.d.s===20 && o.d.v===20 && o.landed ? .08 : 0)));
      });
      // every die at rest: hold the result a moment (as the automatic throw does), then fade out
      if (all && now - Math.max(...objs.map(o => o.landed)) > 1200) {
        teardown(); wrap.classList.add('out'); setTimeout(() => wrap.remove(), 160);
        done();
        if (typeof dicePromptMaybe === 'function') { const dk = document.getElementById('dock');
          if (dk && !dk.hidden && dk.querySelector('.roll')) dicePromptAfterRoll = true; else dicePromptMaybe(); }
        return;
      }
    }
    D3.r.render(D3.scene, D3.cam);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
