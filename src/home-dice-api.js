// The front page's window.HomeDice (used by web/home-anim.js). tools/build.js puts this after src/themes.js and
// src/engine/06-3d-dice.js inside one closure, so it uses the sheet's own dice code: DICE_SETS, d3Ready, d3Die, dice3d.
// The sets in menu order, grouped like ☰ → Dice Sets: [[group label, [keys]], …]
const homeOrder = () => {
  const g = THEME.diceGroups || {}, keys = Object.keys(DICE_SETS);
  return Object.keys(g).map(k => [g[k], keys.filter(x => DICE_SETS[x].group === k)])
    .concat([['More', keys.filter(x => !g[DICE_SETS[x].group])]]).filter(x => x[1].length);
};
// the numeral fonts the dice use, loaded before any face is drawn (a face drawn in a fallback font stays cached)
let homeFonts = null;
const homeFontsReady = () => homeFonts || (homeFonts = Promise.all(['84px "Pirata One"', '700 66px "Alegreya SC"']
  .concat(Object.values(window.HomeDice.sets).filter(s => s.font).map(s => (s.bold ? '700 ' : '') + '66px ' + s.font))
  .map(f => document.fonts ? document.fonts.load(f).catch(() => {}) : null)));
// A still picture (PNG data URL, px × px) of set k's d20 showing 20, lit like the throw. Null without WebGL.
let homeTR = null;
function homeThumb(k, px){
  if (!d3Ready() || !DICE_SETS[k]) return null;
  const T = THREE;
  try {
    if (!homeTR) { const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }), cam = new T.PerspectiveCamera(35, 1, .1, 100);
      cam.position.set(0, 0, 12); r.setPixelRatio(1); homeTR = { r, cam }; }
    homeTR.r.setSize(px, px, false);
    const { die, mat, fin } = d3Die({ s: 20, v: 20 }, DICE_SETS[k]);
    die.quaternion.copy(fin); die.scale.setScalar(3); D3.scene.add(die);
    homeTR.r.render(D3.scene, homeTR.cam);
    const url = homeTR.r.domElement.toDataURL('image/png');
    D3.scene.remove(die); mat.dispose(); die.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
    return url;
  } catch (_) { return null; }
}
// The front page shows only three sets to try, each from a different look and as far apart in colour as possible: a
// fresh pick on every visit. Candidates: the pirate sets plus every look's own (THEME.skinDice, filled in by the build),
// keyed "<look>:<set>" so names can't clash. Returns [[label, [keys]]] like homeOrder and the sets by key.
function homePick(){
  const all = {}, look = {}, names = Object.fromEntries(((window.Skin && window.Skin.list) || []).map(l => [l[0], l[1]]));
  Object.entries(THEME.dice).forEach(([k, s]) => { all['pirate:' + k] = s; look['pirate:' + k] = 'Pirate'; });
  Object.entries(THEME.skinDice || {}).forEach(([lk, sd]) => { try { Object.entries(skinDiceSets(sd)).forEach(([k, s]) => { all[lk + ':' + k] = s; look[lk + ':' + k] = names[lk] || lk; }); } catch (_) {} });
  // hue (0–360) and how colourful a set's main colour is, from its css colours [light, dark, ink]
  const hue = k => { const c = (all[k].css || ['#888888'])[0], n = parseInt(c.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return { h: 0, s: 0 };
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(mx + mn - 1) || 1) }; };
  const keys = Object.keys(all).filter(k => all[k].css), shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  // greedy: a random first set, then each next one the furthest in hue from those chosen, from a look not yet used
  const chosen = [], lks = new Set(), gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  for (const k of shuffle(keys)) { if (!chosen.length) { chosen.push(k); lks.add(k.split(':')[0]); break; } }
  while (chosen.length < 3) {
    let best = null, bestD = -1;
    for (const k of keys) { if (lks.has(k.split(':')[0])) continue; const hk = hue(k);
      const dd = Math.min(...chosen.map(c => gap(hue(c).h, hk.h))) + hk.s * 20 + Math.random() * 25; if (dd > bestD) { bestD = dd; best = k; } }
    if (!best) break; chosen.push(best); lks.add(best.split(':')[0]);
  }
  const sets = {}; chosen.forEach(k => { sets[k] = Object.assign({}, all[k], { look: look[k] }); });
  return { sets, order: [['Three to try', chosen]], total: keys.length };
}
const HOME = homePick();
Object.assign(DICE_SETS, HOME.sets);   // so d3Die / dice3d find the picked sets by their keys
window.HomeDice = { sets: HOME.sets, order: HOME.order, total: HOME.total, def: HOME.order[0][1][0], use: k => { ui.dice = k; },
  roll: dice3d, ready: d3Ready, fonts: homeFontsReady, thumb: homeThumb };
