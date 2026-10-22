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
window.HomeDice = { sets: DICE_SETS, order: homeOrder(), def: Object.keys(DICE_SETS)[Math.floor(Math.random() * Object.keys(DICE_SETS).length)], use: k => { ui.dice = k; },
  roll: dice3d, ready: d3Ready, fonts: homeFontsReady, thumb: homeThumb };
