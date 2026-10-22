/* ============================================================================
   §6  3D DICE — three.js loads in the background; until it's there (or without WebGL) the flat dice play instead
   ============================================================================ */
// claude.ai sheets load it from cdnjs; the web app serves its own copy (web/three.min.js, r128: works offline and
// under the app's Content-Security-Policy, which allows scripts from the app's own server only)
(function(){ try { const s = document.createElement('script'); s.src = window.SHEET ? '/three.min.js' : 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.async = true; document.head.appendChild(s); } catch(_){} })();
const D3 = { r:null, scene:null, cam:null, canvas:null, geo:{}, tex:{}, failed:false };
// true once three.js and the WebGL renderer are up
function d3Ready(){
  if (D3.r) return true;
  if (D3.failed || !window.THREE) return false;
  try {
    const T = THREE, canvas = document.createElement('canvas'); canvas.className = 'dice3d';
    const r = new T.WebGLRenderer({canvas, antialias:true, alpha:true});
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(35, 1, .1, 100); cam.position.set(0, 0, 12);
    scene.add(new T.AmbientLight(0xfff1d6, .5)); scene.add(new T.HemisphereLight(0xffe6b0, 0x1a2a3a, .35));
    const l1 = new T.DirectionalLight(0xffffff, .95); l1.position.set(-3, 5, 8); scene.add(l1);
    const l2 = new T.DirectionalLight(0xffb560, .45); l2.position.set(4, -3, 5); scene.add(l2);
    try { document.fonts && document.fonts.load('84px "Pirata One"'); } catch(_){}
    Object.assign(D3, {r, scene, cam, canvas}); return true;
  } catch(e) { D3.failed = true; return false; }
}
// group a polyhedron geometry's triangles into numbered faces
function d3Faces(g){
  const T = THREE, pos = g.attributes.position, groups = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new T.Vector3().fromBufferAttribute(pos, i), b = new T.Vector3().fromBufferAttribute(pos, i+1), c = new T.Vector3().fromBufferAttribute(pos, i+2);
    const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a)).normalize();
    const mid = new T.Vector3().add(a).add(b).add(c).divideScalar(3); if (n.dot(mid) < 0) n.negate();
    let f = groups.find(x => x.n.dot(n) > .999); if (!f) { f = {n, pts:[]}; groups.push(f); }
    [a, b, c].forEach(p => { if (!f.pts.some(q => q.distanceTo(p) < 1e-4)) f.pts.push(p); });
  }
  return groups.map(f => ({ n: f.n, c: f.pts.reduce((s, p) => s.add(p), new T.Vector3()).divideScalar(f.pts.length) }));
}
// geometry + face list for a die with s sides (cached)
function d3Shape(s){
  if (D3.geo[s]) return D3.geo[s];
  const T = THREE; let g;
  if (s === 10) {
    // pentagonal trapezohedron with flat kite faces
    const h = .105, H = h * (1 + Math.cos(Math.PI/5)) / (1 - Math.cos(Math.PI/5));
    const ring = k => new T.Vector3(Math.cos(k*Math.PI/5), (k % 2) ? -h : h, Math.sin(k*Math.PI/5));
    const top = new T.Vector3(0, H, 0), bot = new T.Vector3(0, -H, 0), pts = [];
    const kite = (p0, p1, p2, p3) => { [[p0,p1,p2],[p0,p2,p3]].forEach(tri => {
      const n = new T.Vector3().subVectors(tri[1], tri[0]).cross(new T.Vector3().subVectors(tri[2], tri[0]));
      const m = new T.Vector3().add(tri[0]).add(tri[1]).add(tri[2]);
      (n.dot(m) < 0 ? [tri[0], tri[2], tri[1]] : tri).forEach(p => pts.push(p.x, p.y, p.z)); }); };
    for (let k = 0; k < 10; k += 2) kite(top, ring(k), ring(k+1), ring(k+2));
    for (let k = 1; k < 10; k += 2) kite(bot, ring(k), ring(k+1), ring(k+2));
    g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); g.scale(1.1, 1.1, 1.1);
    // UVs (the built-in shapes have them; this hand-made one didn't, so wood, bone, lava… textures were missing):
    // each face gets its own flat projection, like the other dice
    { const P = g.attributes.position, uv = [], A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), n = new T.Vector3(), u = new T.Vector3(), v = new T.Vector3();
      for (let i = 0; i < P.count; i += 3) {
        A.fromBufferAttribute(P, i); B.fromBufferAttribute(P, i+1); C.fromBufferAttribute(P, i+2);
        n.subVectors(B, A).cross(new T.Vector3().subVectors(C, A)).normalize();
        u.set(0, 1, 0); if (Math.abs(n.dot(u)) > .9) u.set(1, 0, 0); u.sub(n.clone().multiplyScalar(n.dot(u))).normalize(); v.crossVectors(n, u);
        [A, B, C].forEach(p => uv.push(.5 + p.dot(u) * .36, .5 + p.dot(v) * .36));
      }
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); }
  } else {
    g = s === 4 ? new T.TetrahedronGeometry(1.15) : s === 6 ? new T.BoxGeometry(1.3, 1.3, 1.3) : s === 8 ? new T.OctahedronGeometry(1.05) : s === 12 ? new T.DodecahedronGeometry(1) : new T.IcosahedronGeometry(1.05);
    if (g.index) g = g.toNonIndexed();
  }
  g.computeVertexNormals();
  return (D3.geo[s] = { g, faces: d3Faces(g) });
}
// A soft studio for shiny sets (shine:true): warm light above, dark floor, two bright strips, used as a reflection map
function d3Studio(tint){
  const key = 'studio_' + (tint || 'warm'); if (D3.tex[key]) return D3.tex[key];
  const C = tint === 'cool' ? ['#f4f8ff','#9ca4b0','#5c6470','#1e2228'] : tint === 'rose' ? ['#fff2ee','#d2b0a8','#9a7470','#3e2a28'] : ['#fff6e0','#a89a80','#6a5a44','#2a2218'];
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, C[0]); g.addColorStop(.45, C[1]); g.addColorStop(.55, C[2]); g.addColorStop(1, C[3]);
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(90, 40, 60, 70); x.fillRect(330, 30, 90, 50);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding; return (D3.tex[key] = t);
}
// Surface textures for dice sets (tex: 'wood' | 'bone'), multiplied over the set's colours
const ELEM_TEX = ['lava','frost','acid','storm'];
// texture for a 3D dice set's material
function d3Surface(kind){ return kind === 'bone' ? d3Bone() : kind === 'wood' ? d3Grain() : kind === 'char' ? d3Char().map : ELEM_TEX.includes(kind) ? d3Elem(kind).map : d3Pattern(kind); }
// glow map for sets that light up (char embers, elemental veins); the set's glow colour tints it
const d3Glow = kind => kind === 'char' ? d3Char().ember : ELEM_TEX.includes(kind) ? d3Elem(kind).glow : null;
// Elemental surfaces: a colour map plus a glow map drawn along the same strokes
function d3Elem(kind){
  const key = 'elem_' + kind; if (D3.tex[key]) return D3.tex[key];
  const R = Math.random, mk = fill => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = fill; x.fillRect(0, 0, 256, 256); return [c, x]; };
  const [cm, m] = mk('#ffffff'), [cg, g] = mk('#000000');
  const branch = (ctx, px, py, a, len, w, depth) => {   // forked, jagged line (cracks, bolts, frost ferns)
    ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(px, py);
    for (let t = 0; t < len; t += 7) { a += (Math.random()-.5)*.7; px += Math.cos(a)*7; py += Math.sin(a)*7; ctx.lineTo(px, py);
      if (depth < 2 && Math.random() < .12) { ctx.stroke(); branch(ctx, px, py, a + (Math.random() < .5 ? -1 : 1)*(.5 + Math.random()*.6), len*.45, w*.6, depth + 1); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(px, py); } }
    ctx.stroke(); };
  const both = (fn) => { const seed = []; for (let i = 0; i < 400; i++) seed.push(R()); let k = 0; const rr = Math.random;
    [m, g].forEach(ctx => { k = 0; Math.random = () => seed[k++ % seed.length]; fn(ctx, ctx === g); }); Math.random = rr; };
  if (kind === 'lava') {
    m.fillStyle = '#9a9a9a'; m.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) { const px = R()*256, py = R()*256, r = 20 + R()*40, gr = m.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = gr; m.fillRect(px-r, py-r, r*2, r*2); }
    both((ctx, glow) => { ctx.strokeStyle = glow ? 'rgba(255,170,60,1)' : 'rgba(255,255,255,1)'; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) branch(ctx, Math.random()*256, Math.random()*256, Math.random()*7, 90 + Math.random()*120, 2.5 + Math.random()*2.5, 0); });
  } else if (kind === 'frost') {
    m.fillStyle = '#aeb4ba'; m.fillRect(0, 0, 256, 256);
    m.strokeStyle = 'rgba(255,255,255,.95)'; m.lineCap = 'round';
    for (let i = 0; i < 22; i++) branch(m, R()*256, R()*256, R()*7, 40 + R()*70, 1.6 + R()*1.6, 0);
    for (let i = 0; i < 260; i++) { m.fillStyle = 'rgba(255,255,255,'+(.4 + R()*.6).toFixed(2)+')'; m.beginPath(); m.arc(R()*256, R()*256, .5 + R()*1.2, 0, 7); m.fill(); }
  } else if (kind === 'acid') {    // serpent scales (rows of shaded half-moons), acid running down them in glowing drips
    m.fillStyle = '#c4c4c4'; m.fillRect(0, 0, 256, 256);
    for (let row = -1, y = -8; y < 272; row++, y += 11) for (let x = (row % 2) * 8 - 16; x < 272; x += 16) {
      const gr = m.createRadialGradient(x, y - 4, 1, x, y, 10); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.75, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.45)');
      m.fillStyle = gr; m.beginPath(); m.arc(x, y, 9.5, 0, Math.PI); m.fill(); }
    both((ctx, glow) => { for (let i = 0; i < 8; i++) { let px = Math.random()*256, py = Math.random()*120; const len = 50 + Math.random()*110, w = 2 + Math.random()*2.5;
      ctx.strokeStyle = glow ? 'rgba(170,255,70,.95)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py);
      for (let t = 0; t < len; t += 8) { px += (Math.random()-.5)*3; py += 8; ctx.lineTo(px, py); } ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(px, py + 2, w*1.4, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(px + (Math.random()-.5)*16, py + 6 + Math.random()*10, 1 + Math.random()*1.6, 0, 7); ctx.fill(); } } });
  } else {   // storm: rolling thunderhead clouds, thin forked bolts that glow violet-white
    m.fillStyle = '#7c7c7c'; m.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { const px = R()*256, py = R()*256, r = 14 + R()*34, gr = m.createRadialGradient(px, py - r*.3, 0, px, py, r);
      gr.addColorStop(0, 'rgba(255,255,255,'+(.25 + R()*.35).toFixed(2)+')'); gr.addColorStop(.6, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); m.fillStyle = gr; m.fillRect(px-r, py-r, r*2, r*2); }
    for (let i = 0; i < 14; i++) { const px = R()*256, py = R()*256, r = 20 + R()*30, gr = m.createRadialGradient(px, py + r*.3, 0, px, py, r);
      gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = gr; m.fillRect(px-r, py-r, r*2, r*2); }
    both((ctx, glow) => { ctx.strokeStyle = glow ? 'rgba(235,220,255,1)' : 'rgba(255,255,255,1)'; ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
      for (let i = 0; i < 4; i++) branch(ctx, Math.random()*256, Math.random()*30, 1.3 + Math.random()*.5, 150 + Math.random()*90, 1.3 + Math.random()*.8, 0); });
  }
  const tex = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  return (D3.tex[key] = { map: tex(cm), glow: tex(cg) });
}
// Burned timber: dark grain, ashy patches and long fissures along the grain. Returns the colour map plus an
// ember map (orange in the fissures) used as an emissive map, so the cracks glow faintly in the dark.
function d3Char(){
  if (D3.tex.char) return D3.tex.char;
  const R = Math.random, mk = () => { const c = document.createElement('canvas'); c.width = c.height = 256; return [c, c.getContext('2d')]; };
  const [c1, x] = mk(), [c2, e] = mk();
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256); e.fillStyle = '#000'; e.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 44; i++) { const y0 = i*5.8 + R()*3, amp = 2 + R()*4, ph = R()*6; x.strokeStyle = 'rgba(0,0,0,'+(.18 + R()*.3).toFixed(2)+')'; x.lineWidth = .8 + R()*2;
    x.beginPath(); for (let px = 0; px <= 256; px += 8) { const py = y0 + Math.sin(px/36 + ph)*amp; px ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
  for (let i = 0; i < 10; i++) { const px = R()*256, py = R()*256, rr = 18 + R()*40, g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, 'rgba(160,150,140,.35)'); g.addColorStop(1, 'rgba(160,150,140,0)'); x.fillStyle = g; x.fillRect(px-rr, py-rr, rr*2, rr*2); }
  for (let i = 0; i < 26; i++) { let px = R()*256, py = R()*256; const len = 30 + R()*90, pts = [[px, py]];
    for (let t = 0; t < len; t += 6) { px += 6; py += (R()-.5)*3.5; pts.push([px, py]); }
    const path = ctx => { ctx.beginPath(); pts.forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); };
    x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineWidth = 2 + R()*2; path(x);
    e.strokeStyle = 'rgba(255,'+(70 + Math.floor(R()*60))+',10,'+(.5 + R()*.5).toFixed(2)+')'; e.lineWidth = 1 + R()*1.4; path(e); }
  const tex = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  return (D3.tex.char = { map: tex(c1), ember: tex(c2) });
}
// The other set surfaces, drawn once per kind on a 256px canvas. The map multiplies the die colour, so light =
// the set's own colour and darker marks = texture; a base just under white lets highlights read brighter.
function d3Pattern(kind){
  const key = 'tex_' + kind; if (D3.tex[key]) return D3.tex[key];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), R = Math.random;
  const dot = (px, py, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); };
  if (kind === 'tar') {            // brushed pitch: long soft brush strokes, dull and glossy patches, no pattern
    x.fillStyle = '#d4d4d4'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 14; i++) { const px = R()*256, py = R()*256, rr = 30 + R()*60, g = x.createRadialGradient(px, py, 0, px, py, rr);
      const lit = R() < .5; g.addColorStop(0, lit ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(128,128,128,0)');
      x.fillStyle = g; x.fillRect(px-rr, py-rr, rr*2, rr*2); }
    for (let i = 0; i < 90; i++) { const py = R()*256, l = 60 + R()*160, px = R()*256 - 40;
      x.strokeStyle = R() < .5 ? 'rgba(255,255,255,'+(.08 + R()*.14).toFixed(2)+')' : 'rgba(0,0,0,'+(.06 + R()*.12).toFixed(2)+')'; x.lineWidth = .8 + R()*2.5;
      x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + l*.33, py + (R()-.5)*8, px + l*.66, py + (R()-.5)*8, px + l, py + (R()-.5)*10); x.stroke(); }
  } else if (kind === 'hammered') { // worn coin gold: fine brushed lines, softly polished highlights, a little tarnish
    x.fillStyle = '#e2e2e2'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6; i++) { const px = R()*256, py = R()*256, rr = 50 + R()*70, g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px-rr, py-rr, rr*2, rr*2); }
    for (let py = 0; py < 256; py += 1.5) { x.fillStyle = 'rgba('+(R() < .5 ? '255,255,255' : '90,60,0')+','+(.04 + R()*.1).toFixed(2)+')'; x.fillRect(0, py, 256, .8); }
    for (let i = 0; i < 8; i++) { const px = R()*256, py = R()*256, rr = 12 + R()*26, g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(70,45,0,.18)'); g.addColorStop(1, 'rgba(70,45,0,0)'); x.fillStyle = g; x.fillRect(px-rr, py-rr, rr*2, rr*2); }
  } else if (kind === 'caustic') {  // deep water: shifting light net (caustics) and drifting particles
    x.fillStyle = '#9c9c9c'; x.fillRect(0, 0, 256, 256);
    x.lineCap = 'round';
    for (let i = 0; i < 26; i++) { let px = R()*256, py = R()*256; x.strokeStyle = 'rgba(255,255,255,'+(.55 + R()*.4).toFixed(2)+')'; x.lineWidth = 1.2 + R()*2.8;
      x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { const nx = px + (R()-.5)*70, ny = py + (R()-.5)*70; x.quadraticCurveTo((px+nx)/2 + (R()-.5)*30, (py+ny)/2 + (R()-.5)*30, nx, ny); px = nx; py = ny; } x.stroke(); }
    for (let i = 0; i < 60; i++) dot(R()*256, R()*256, .6 + R()*1.4, 'rgba(255,255,255,'+(.4 + R()*.5).toFixed(2)+')');
  } else if (kind === 'iron') {     // cannon iron: pitted cast surface with light-rimmed pocks and rust blooms
    x.fillStyle = '#d2d2d2'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) { const px = R()*256, py = R()*256, rr = 14 + R()*36, g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(150,70,20,.45)'); g.addColorStop(1, 'rgba(150,70,20,0)'); x.fillStyle = g; x.fillRect(px-rr, py-rr, rr*2, rr*2); }
    for (let i = 0; i < 320; i++) { const px = R()*256, py = R()*256, r = .6 + R()*2.4; dot(px + .6, py + .6, r, 'rgba(255,255,255,.35)'); dot(px, py, r, 'rgba(0,0,0,'+(.3 + R()*.35).toFixed(2)+')'); }
  } else if (kind === 'map') {      // treasure map: tea stains, a faint grid, dotted routes and the odd red X
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12; i++) { const px = R()*256, py = R()*256, rr = 20 + R()*50, g = x.createRadialGradient(px, py, rr*.5, px, py, rr);
      g.addColorStop(0, 'rgba(130,95,50,.22)'); g.addColorStop(1, 'rgba(130,95,50,0)'); x.fillStyle = g; x.fillRect(px-rr, py-rr, rr*2, rr*2); }
    x.strokeStyle = 'rgba(90,60,30,.3)'; x.lineWidth = 1; for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
    x.strokeStyle = 'rgba(70,40,15,.75)'; x.lineWidth = 2.2; x.setLineDash([5, 5]);
    for (let i = 0; i < 4; i++) { let px = R()*256, py = R()*256; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { const nx = px + (R()-.5)*120, ny = py + (R()-.5)*120; x.quadraticCurveTo(px + (R()-.5)*60, py + (R()-.5)*60, nx, ny); px = nx; py = ny; } x.stroke(); }
    x.setLineDash([]); x.strokeStyle = 'rgba(160,20,10,.8)'; x.lineWidth = 2.6;
    for (let i = 0; i < 3; i++) { const px = R()*256, py = R()*256, l = 6; x.beginPath(); x.moveTo(px-l, py-l); x.lineTo(px+l, py+l); x.moveTo(px+l, py-l); x.lineTo(px-l, py+l); x.stroke(); }
  } else if (kind === 'gem') {      // cut gem: angled facet planes, inner flaws, sparkles
    x.fillStyle = '#bdbdbd'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 34; i++) { const cx = R()*256, cy = R()*256, rr = 20 + R()*50, n = 3 + Math.floor(R()*3), a0 = R()*7;
      x.fillStyle = R() < .5 ? 'rgba(255,255,255,'+(.15 + R()*.35).toFixed(2)+')' : 'rgba(0,0,0,'+(.06 + R()*.14).toFixed(2)+')';
      x.beginPath(); for (let k = 0; k < n; k++) { const a = a0 + k*(Math.PI*2/n) + (R()-.5)*.6; x.lineTo(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr); } x.closePath(); x.fill(); }
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .8; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(R()*256, R()*256); x.lineTo(R()*256, R()*256); x.stroke(); }
    for (let i = 0; i < 16; i++) { const px = R()*256, py = R()*256, l = 3 + R()*6; x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(px - l, py); x.lineTo(px + l, py); x.moveTo(px, py - l); x.lineTo(px, py + l); x.stroke(); dot(px, py, 1.4, '#fff'); }
  } else {                          // sea glass: frosted speckle, tiny trapped bubbles, faint swirls
    x.fillStyle = '#b4b4b4'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) dot(R()*256, R()*256, .4 + R()*.9, R() < .55 ? 'rgba(255,255,255,.6)' : 'rgba(0,30,30,.15)');
    for (let i = 0; i < 34; i++) { const px = R()*256, py = R()*256, r = 1.5 + R()*4.5; x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1; x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke(); dot(px - r*.3, py - r*.3, r*.3, 'rgba(255,255,255,.9)'); }
    x.lineWidth = 7; for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(R()*256, R()*256, 30 + R()*60, R()*7, R()*7 + 2); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (D3.tex[key] = t);
}
// Aged bone: mottled patches, pores, hairline cracks and a few dried blood spatters
function d3Bone(){
  if (D3.tex.bone) return D3.tex.bone;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), R = Math.random;
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) { const px = R()*256, py = R()*256, rr = 18 + R()*46, g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, 'rgba(150,118,72,'+(.08 + R()*.14).toFixed(2)+')'); g.addColorStop(1, 'rgba(150,118,72,0)'); x.fillStyle = g; x.fillRect(px-rr, py-rr, rr*2, rr*2); }
  for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(95,72,40,'+(.15 + R()*.3).toFixed(2)+')'; x.beginPath(); x.arc(R()*256, R()*256, .5 + R()*1.2, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(80,58,32,.45)'; x.lineWidth = .9;
  for (let i = 0; i < 7; i++) { let px = R()*256, py = R()*256; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (R()-.5)*34; py += (R()-.3)*22; x.lineTo(px, py); } x.stroke(); }
  for (let i = 0; i < 4; i++) { const px = R()*256, py = R()*256;
    x.fillStyle = 'rgba(120,12,10,.55)'; x.beginPath(); x.arc(px, py, 4 + R()*7, 0, 7); x.fill();
    for (let k = 0; k < 9; k++) { const a = R()*7, d = 8 + R()*22; x.fillStyle = 'rgba(120,12,10,'+(.35 + R()*.3).toFixed(2)+')'; x.beginPath(); x.arc(px + Math.cos(a)*d, py + Math.sin(a)*d, .8 + R()*2.4, 0, 7); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (D3.tex.bone = t);
}
// Wood grain — wavy darker growth rings
function d3Grain(){
  if (D3.tex.grain) return D3.tex.grain;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    const y0 = i * 5.6 + Math.random() * 3, amp = 3 + Math.random() * 5, ph = Math.random() * 6;
    x.strokeStyle = 'rgba(110,62,28,'+(.12 + Math.random() * .28).toFixed(2)+')'; x.lineWidth = .8 + Math.random() * 2.2;
    x.beginPath(); for (let px = 0; px <= 256; px += 8) { const py = y0 + Math.sin(px / 38 + ph) * amp; px ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (D3.tex.grain = t);
}
// pirate dice: Pirata One numerals carved into the face (dark cut + light rim), bone d6s with pips
function d3Label(text, ink, rim, pips, bold, font){
  const key = text + ink + rim + (pips?'p':'') + (bold?'b':'') + (font||''); if (D3.tex[key]) return D3.tex[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  if (pips) {
    const P = {1:[[64,64]],2:[[36,36],[92,92]],3:[[34,34],[64,64],[94,94]],4:[[36,36],[92,36],[36,92],[92,92]],5:[[34,34],[94,34],[64,64],[34,94],[94,94]],6:[[38,30],[90,30],[38,64],[90,64],[38,98],[90,98]]}[+text] || [];
    P.forEach(([px,py]) => { x.beginPath(); x.arc(px+2, py+2, 12, 0, 7); x.fillStyle = rim; x.fill(); x.beginPath(); x.arc(px, py, 12, 0, 7); x.fillStyle = ink; x.fill(); });
  } else {
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font ? (bold ? '700 ' : '')+(text.length > 1 ? 66 : 80)+'px '+font : (text.length > 1 ? 70 : 84)+'px "Pirata One", Georgia, serif';
    if (bold) {   // legible on a busy surface: a pale halo, then a solid numeral with a thin same-colour stroke
      x.lineJoin = 'round'; x.lineWidth = 9; x.strokeStyle = rim; x.strokeText(text, 64, 69);
      x.lineWidth = 2.5; x.strokeStyle = ink; x.strokeText(text, 64, 69); x.fillStyle = ink; x.fillText(text, 64, 69);
    } else { x.fillStyle = rim; x.fillText(text, 66, 72); x.fillStyle = ink; x.fillText(text, 64, 69); }
    if (text === '6' || text === '9') x.fillRect(44, 110, 40, 6);
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return (D3.tex[key] = t);
}
// Dice sets come from the theme (see #themes). Every die in a set shares one look; picked in the ☰ menu.
const DICE_SETS = THEME.dice;
const DEFAULT_DICE = THEME.defaultDice || Object.keys(DICE_SETS)[0];
// the dice set picked in the menu (or the theme default)
let DICE_PREVIEW = null;   // a set being previewed from the picker (not selected)
// the dice set to roll with (the one being previewed wins)
const diceSet = () => DICE_SETS[DICE_PREVIEW || ui.dice] || DICE_SETS[DEFAULT_DICE];
const D3_LBL = {20:.6, 12:.58, 10:.5, 8:.58, 6:.82, 4:.52};
// one die of a set as a mesh, oriented so face d.v faces the camera (number upright, tipped back a little):
// used by the throw below, and by the front page's dice swatches (tools/build.js → home-dice.js)
function d3Die(d, SET){
  const T = THREE, sides = [4,6,8,10,12,20].includes(d.s) ? d.s : 6, shp = d3Shape(sides), pips = !!SET.pips && sides===6, ls = pips ? .95 : D3_LBL[sides];
  if (SET.grad) {   // sea-depth gradient: light at the top-left of the die, deep at the bottom-right, each facet a touch different
    const pos = shp.g.attributes.position, col = new Float32Array(pos.count*3), a = new T.Color(SET.grad[0]), b = new T.Color(SET.grad[1]), c = new T.Color();
    for (let v = 0; v < pos.count; v++) {
      const f = Math.floor(v/3), jit = ((f*37) % 11) / 11 * .14 - .07;
      const t = Math.max(0, Math.min(1, (-pos.getX(v)*.45 - pos.getY(v)*.85 + 1.2) / 2.4 + jit));
      c.copy(a).lerp(b, t); col[v*3] = c.r; col[v*3+1] = c.g; col[v*3+2] = c.b;
    }
    shp.g.setAttribute('color', new T.BufferAttribute(col, 3));
  }
  // matte sets use a light-only (Lambert) material: no highlight at all, like raw wood
  const mat = SET.matte ? new T.MeshLambertMaterial({color: SET.dim ? new T.Color(SET.dim, SET.dim, SET.dim) : SET.grad ? 0xffffff : SET.body, vertexColors: !!SET.grad, flatShading: true, transparent: true, opacity: SET.alpha || 1, map: SET.tex ? d3Surface(SET.tex) : null})
                        : new T.MeshStandardMaterial({color: SET.grad ? 0xffffff : SET.body, vertexColors: !!SET.grad, roughness: SET.rough, metalness: SET.metal, flatShading: true, transparent: true, opacity: SET.alpha || 1, map: SET.tex ? d3Surface(SET.tex) : null, envMap: SET.shine ? d3Studio(SET.studio) : null, emissive: SET.tex === 'char' ? 0xff6a1a : SET.glow != null ? SET.glow : 0x000000, emissiveMap: SET.tex === 'char' || SET.glow != null ? d3Glow(SET.tex) : null, emissiveIntensity: SET.tex === 'char' ? 1.2 : SET.glow != null ? 1.3 : 1, envMapIntensity: SET.shine ? 1.15 : 1});
  const die = new T.Mesh(shp.g, mat);
  shp.faces.forEach((f, k) => {
    const lbl = new T.Mesh(new T.PlaneGeometry(ls, ls), new T.MeshBasicMaterial({map: d3Label(String(k+1), SET.ink, SET.rim, pips, SET.bold, SET.font), transparent: true, depthWrite: false}));
    lbl.position.copy(f.c).addScaledVector(f.n, .004); lbl.lookAt(new T.Vector3().copy(f.c).add(f.n)); die.add(lbl); f.lbl = lbl;
  });
  // orientation that shows face (value) to the camera, number upright, tipped back a little so it reads as 3D
  const face = shp.faces[Math.max(0, Math.min(shp.faces.length-1, d.v-1))];
  const q1 = new T.Quaternion().setFromUnitVectors(face.n.clone().normalize(), new T.Vector3(0,0,1));
  const up = new T.Vector3(0,1,0).applyQuaternion(face.lbl.quaternion).applyQuaternion(q1);
  const q2 = new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1), Math.atan2(up.x, up.y));
  const tilt = new T.Quaternion().setFromEuler(new T.Euler(-.32, .18, 0));
  const fin = tilt.multiply(q2.multiply(q1));
  return { die, mat, fin };
}
// throw 3D dice that land showing the given values, then call done
function dice3d(dice, done){
  if (!d3Ready()) return diceFx(dice, done);
  const T = THREE, W = window.innerWidth, Hh = window.innerHeight;
  D3.r.setSize(W, Hh, false); D3.canvas.style.width = W+'px'; D3.canvas.style.height = Hh+'px';
  D3.cam.aspect = W / Hh; D3.cam.updateProjectionMatrix();
  const wrap = document.createElement('div'); wrap.className = 'fx fxdice'; wrap.setAttribute('aria-hidden','true'); wrap.appendChild(D3.canvas); document.body.appendChild(wrap);
  const visH = 2 * Math.tan(T.MathUtils.degToRad(17.5)) * 12, px = visH / Hh;   // world units per pixel
  // desktop: dice are thrown up from the bottom edge and roll and bounce across the table; phones keep the quick side throw
  const desk = true;   // since V237 every device gets the rolling throw from the bottom
  const n = dice.length, perRow = Math.min(n, 4), gapPx = n > 2 ? 92 : 130, size = (n > 2 ? 46 : 58) * px;
  const objs = dice.map((d, i) => {
    const { die, mat, fin } = d3Die(d, diceSet());
    const row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row*perRow), col = i % perRow;
    // each die stops a little off its grid spot: some roll less far, some drift left or right (never enough to touch)
    const jx = (Math.random() - .5) * .4 * gapPx, jy = (Math.random() * .5 - .35) * gapPx;
    const tx = ((col - (inRow-1)/2) * gapPx + jx) * px, ty = (-(row - (Math.ceil(n/perRow)-1)/2) * gapPx + jy) * px;
    const sx = desk ? tx + (Math.random()-.5) * 4 : -W/2*px - 1.5 - Math.random()*1.5;
    const sy = desk ? -Hh/2*px - 1.2 - Math.random()*1.2 : ty + (Math.random()-.5) * 3;
    // rolling: turn about the axis across the direction of travel (plus a little wobble), so the die tumbles forward
    const dir = new T.Vector3(tx - sx, ty - sy, 0).normalize();
    const axis = desk ? new T.Vector3(-dir.y, dir.x, 0).add(new T.Vector3(Math.random()-.5, Math.random()-.5, Math.random()-.5).multiplyScalar(.45)).normalize()
                      : new T.Vector3(Math.random()-.5, Math.random()-.5, Math.random()-.5).normalize();
    die.scale.setScalar(size); D3.scene.add(die);
    return { die, mat, d, fin, tx, ty, sx, sy, axis, spin: desk ? -Math.PI*(6 + Math.random()*3) : Math.PI*(3 + Math.random()*2), delay: i*(desk ? 110 : 80), landed: 0 };
  });
  const DUR = desk ? 1250 : 760, t0 = performance.now(), end = DUR + (n-1)*(desk ? 110 : 80) + 1400;   // landed dice stay on screen a while before the sheet
  const ease = t => 1 - Math.pow(1-t, 3), spinQ = new T.Quaternion();
  (function frame(now){
    const el = now - t0;
    objs.forEach(o => {
      const t = Math.max(0, Math.min(1, (el - o.delay) / DUR)), e = ease(t);
      if (desk) {
        // up the table with a slight overshoot, three bounces that die away, spin slowing to a stop
        const e2 = 1 - Math.pow(1-t, 3.2), over = Math.sin(Math.PI*Math.min(1, t*1.15)) * .35 * (1-t);
        o.die.position.set(o.sx + (o.tx - o.sx)*e2, o.sy + (o.ty - o.sy)*e2 + over, Math.abs(Math.sin(Math.PI*3*Math.pow(t, .8))) * 2.2 * Math.pow(1-t, 1.6));
        spinQ.setFromAxisAngle(o.axis, Math.pow(1-t, 2.4) * o.spin);
      } else {
        o.die.position.set(o.sx + (o.tx - o.sx)*e, o.sy + (o.ty - o.sy)*e + Math.sin(Math.PI*Math.min(1, t*1.25)) * .6 * (1-t), Math.sin(Math.PI*t) * 1.2);
        spinQ.setFromAxisAngle(o.axis, (1-e) * o.spin);
      } o.die.quaternion.copy(spinQ).multiply(o.fin);
      if (t >= 1 && !o.landed) { o.landed = now; if (o.d.off) o.mat.opacity = .38; if (o.d.s===20 && o.d.v===1) o.mat.color.setHex(0x8A8A8A); }
      const k = o.landed ? Math.min(1, (now - o.landed) / 220) : 0;
      o.die.scale.setScalar(size * (1 + (o.landed ? .16*Math.sin(Math.PI*k) : 0) + (o.d.s===20 && o.d.v===20 && o.landed ? .08 : 0)));
    });
    D3.r.render(D3.scene, D3.cam);
    if (el < end) return requestAnimationFrame(frame);
    wrap.classList.add('out');
    setTimeout(() => { objs.forEach(o => { D3.scene.remove(o.die); o.mat.dispose(); o.die.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); }); wrap.remove(); }, 160);
    done();
  })(t0);
}
// a d20 roll as 3D dice (the dropped die of advantage/disadvantage shown dimmed)
const d20Dice = t => { const k = t.dice.length>1 && t.dice[0]===t.dice[1] ? 0 : t.dice.indexOf(t.pick); return t.dice.map((v,i)=>({s:20, v, off: t.dice.length>1 && i!==k})); };
// [values] + die size → [{s, v}] for the dice animations
const asDice = (arr, s) => arr.map(v => ({s, v}));
// dice that were just rolled get a flip-in on the card, so the "?" turns into the value
let flipKeys = new Set();
// a die value in a result card; flips in when its key was just rolled
const dieF = (v, k) => '<b class="die'+(flipKeys.has(k)?' flip':'')+'">'+v+'</b>';

