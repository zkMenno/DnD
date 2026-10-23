// The looks players pick in ☰ → Theme (web app only): reads src/looks/*.js, checks every look is complete, and makes
// what the web app needs from them. Used by tools/build.js; `node tools/looks.js` runs the check on its own.
//   skins.css   colour tokens (light + dark), title fonts, the line under the header, the page grid, the textured roll
//               sheet and tooltip, which floating theme symbols show (→ dist/web/engine/skins.css)
//   list        the theme picker's entries (→ SKINS in dist/web/sw-register.js, window.Skin.list)
//   words       each look's few words (→ SKIN_WORDS in the web engine, §2)
//   dice        each look's dice sets (→ THEMES.pirate.skinDice in the web engine's themes.js, §6)
// The claude.ai sheets only ever wear the pirate look, so their engine keeps the empty placeholders.
//
// One file per look: src/looks/NN-<key>.js (NN = its place in the picker; the key is <html data-skin="<key>">).
// 00-pirate.js is the base look (base: true): its tokens are src/theme.css itself, its words and dice THEMES.pirate in
// src/themes.js, so it only has the picker entry and its font files. Every other look exports:
//   label, emoji   the name in the picker (label also heads its block in skins.css)
//   swatch         [dark background, accent, light background]: the picker's little swatch
//   light, dark    colour tokens, named as in src/theme.css without the "--": every #RRGGBB token pirate has
//   fonts          { title, display?, body? }: CSS font stacks for --f-pirate, --f-display, --f-body
//   fontFiles      the web/fonts files those stacks and the dice need, as "<name>" for web/fonts/<name>-latin.woff2
//                  (and -latin-ext.woff2 when web/fonts/fonts.css lists one)
//   line           the line under the header: an SVG mask repeated along it (black = drawn), or null for a plain line
//   texture        the roll sheet and tooltip texture, top layer first; each layer one of
//                    { svg: '<svg …>' }  a tile; { css: 'repeating-linear-gradient(…)' }  any CSS image;
//                    { noise: { freq:[x, y], octaves, alpha, seed?, col? } }  a fractal-noise tile (col "r g b", 0–1;
//                    low freq = big blotches, high = fine grain, unequal = streaks)
//   css            optional: (sel, noise) => [CSS rules] only this look gets (sel = :root[data-skin="<key>"])
//   words          { cancel, log, clean, critIcon } and optionally ok, turn (§2 WORD; left out = plain English)
//   dice           { font, fscale?, bold?, groups: { 6 groups: menu label }, sets: { <key>: set } }, 4 sets per group.
//                  Each set: from = a pirate set in src/themes.js (its texture and material), group, name, desc, then any
//                  field to change; col: [light, deep, numerals] recolours faces, body and menu swatch in one go (§6
//                  skinDiceSets). Set keys are unique across looks, so each look keeps its own pick. The groups follow
//                  how the dice look, like the pirate sets (polished metal · wood · stone & shadow · glass & ivory ·
//                  gems · glowing elemental); names fit the look, colours range across the spectrum.
//
// How to add a look: copy a src/looks file to the next number with the new key and change everything in it; draw its
// four floating symbols (<symbol id="g-<key>-0"> … -3) in src/landing.html and give them slots (class "bd bdg
// bdg-<key>") in src/bgdice.html; add any new font files to web/fonts + web/fonts/fonts.css. The build stops with a list
// of what is still missing.
const fs = require('fs'), path = require('path'), vm = require('vm');

// ── Loading ────────────────────────────────────────────────────────────────────────────────────────────────
// Every look in picker order: { key, file, ...its fields }. Files are read fresh (no require cache), so a watcher or a
// second build in one process sees edits.
function loadLooks(root){
  const dir = path.join(root, 'src', 'looks');
  return fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => {
    const m = f.match(/^\d\d-([a-z][a-z0-9]*)\.js$/), file = 'src/looks/' + f;
    if (!m) throw new Error(file + ': look files are named NN-<key>.js (key: lower-case letters and digits)');
    const mod = { exports: {} };
    vm.runInThisContext('(function(module, exports){' + fs.readFileSync(path.join(dir, f), 'utf8') + '\n})', { filename: file })(mod, mod.exports);
    return Object.assign({ key: m[1], file }, mod.exports);
  });
}
// THEMES from src/themes.js (for pirate's dice sets and words), run in a sandbox like the browser would.
const loadThemes = root => vm.runInNewContext(fs.readFileSync(path.join(root, 'src', 'themes.js'), 'utf8') + '\n;THEMES', {});

// ── CSS helpers ────────────────────────────────────────────────────────────────────────────────────────────
// A small SVG as a CSS url(): only <, >, # and double quotes are escaped, which is enough inside url("…").
const svg = s => 'url("data:image/svg+xml,' + s.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23').replace(/"/g, "'") + '")';
// An SVG as a CSS url(), percent-encoded byte by byte except letters, digits, _.-~ and " =:/'" (safer than svg() for
// filters and attributes with %, #, etc.).
const uri = x => 'url("data:image/svg+xml,' + Array.from(Buffer.from(x, 'utf8'))
  .map(b => /[A-Za-z0-9_.\-~ =:/']/.test(String.fromCharCode(b)) ? String.fromCharCode(b) : '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('') + '")';
// A fractal-noise texture tile (feTurbulence) in one colour at opacity alpha (see the noise layer in the header).
function noise({ freq: [fx, fy], octaves, alpha, seed = 3, col = '1 1 1', w = 300, h = 300 }){
  const [r, g, b] = col.split(' ');
  return uri('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="'
    + fx + ' ' + fy + '" numOctaves="' + octaves + '" seed="' + seed + '" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ' + r + ' 0 0 0 0 ' + g
    + ' 0 0 0 0 ' + b + ' 0 0 0 ' + alpha + ' 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>');
}
// One texture layer as a CSS image.
const layer = t => t.svg ? uri(t.svg) : t.noise ? noise(t.noise) : t.css;
// Rounds halves to even (as the palettes were first mixed), so mixed colours never shift by one.
const roundEven = x => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; };
// Blends two #RRGGBB colours: t=0 gives a, t=1 gives b.
function mix(a, b, t){
  const p = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((x, i) => roundEven(x * (1 - t) + B[i] * t).toString(16).toUpperCase().padStart(2, '0')).join('');
}

// ── skins.css ──────────────────────────────────────────────────────────────────────────────────────────────
// One mode's tokens as CSS declarations, plus the shared extras for that mode: the press tint and header glow, and in
// dark mode the shadow, the paper grain and color-scheme.
function toks(d, dark){
  let out = Object.entries(d).map(([k, v]) => '--' + k + ':' + v).join(';');
  if (dark) out += ';--press:rgba(255,240,210,.14);--shadow:0 1px 2px rgba(0,0,0,.35),0 8px 22px rgba(0,0,0,.3);--grain:repeating-linear-gradient(0deg,rgba(255,240,210,.016) 0 1px,transparent 1px 3px);--glow:radial-gradient(ellipse 120% 60% at 50% 0%,color-mix(in srgb,' + d.brass + ' 9%,transparent),transparent 70%);color-scheme:dark';
  else out += ';--press:rgba(40,30,60,.1);--glow:radial-gradient(ellipse 120% 70% at 50% 0%,rgba(255,255,255,.55),transparent 70%)';
  return out;
}
// The quiet 120 px grid every look uses as the page background (over the glow, the grain and --bg).
const GRID = 'repeating-linear-gradient(0deg,transparent 0 119px,color-mix(in srgb,var(--rope) 9%,transparent) 119px 120px) fixed,repeating-linear-gradient(90deg,transparent 0 119px,color-mix(in srgb,var(--rope) 6%,transparent) 119px 120px) fixed,var(--glow) fixed no-repeat,var(--grain) fixed,var(--bg)';
// An inner vignette and a faint top highlight, shared by every card.
const VIG = 'inset 0 0 60px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06)';
// The whole of skins.css for these looks (the base look gets only the grid and its symbols).
function skinsCss(looks){
  const SK = looks.filter(l => !l.base);
  const css = ['/* ============================================================================\n   SKINS — the extra looks players pick in ☰ → Theme (web app only; web/sw-register.js sets <html data-skin="…">).\n   Each skin swaps the theme tokens (same names as src/theme.css) for light and dark, the title fonts, the line under\n   the header, the roll-card texture and which floating theme symbols show. Pirate is src/theme.css itself (no data-skin).\n   Built by tools/looks.js from src/looks/: edit the looks there.\n   ============================================================================ */'];
  // Per look: light tokens + fonts, dark tokens (system dark mode unless the player chose light, or the player chose
  // dark), the grid background on every page but the front page, and the header line.
  for (const s of SK) {
    const sel = ':root[data-skin="' + s.key + '"]', f = s.fonts;
    const ft = ['--f-pirate:' + f.title, f.display ? '--f-display:' + f.display : '', f.body ? '--f-body:' + f.body : ''].filter(Boolean).join(';');
    css.push('/* ' + s.label + ' */');
    css.push(sel + '{' + toks(s.light, false) + ';' + ft + '}');
    css.push('@media (prefers-color-scheme: dark){' + sel + ':not([data-theme="light"]){' + toks(s.dark, true) + '}}');
    css.push(sel + '[data-theme="dark"]{' + toks(s.dark, true) + '}');
    css.push(sel + ' body:not(.front){background:' + GRID + '}');
    if (s.line) { const m = svg(s.line); css.push(sel + ' .top::after{-webkit-mask:' + m + ' repeat-x center/24px 8px;mask:' + m + ' repeat-x center/24px 8px}'); }
  }
  // pirate on the web: the same quiet grid instead of the big compass rose (the claude.ai sheets keep theirs)
  css.push(':root:not([data-skin]) body:not(.front){background:' + GRID + '}');
  // small theme symbols float with the background dice: only the current look's set shows (src/bgdice.html)
  css.push('.bdg{display:none}');
  css.push(':root:not([data-skin]) .bdg-pirate,' + looks.map(l => ':root[data-skin="' + l.key + '"] .bdg-' + l.key).join(',') + '{display:block}');
  // Roll sheet + tooltips: no parchment outside the pirate look. Light mode keeps the dark card (ink on paper,
  // inverted); dark mode gets a dark card too (a lifted, accent-tinted panel with light text) instead of a bright
  // sheet. Done by swapping --ink/--bg inside the card, so everything in it that reads "paper colour / text colour"
  // follows. Per look: the card texture and accent sheen in both modes, then the dark card (panel colour mixed from the
  // dark palette's raised + brass) in dark mode, with chips readable on it.
  for (const s of SK) {
    const sel = ':root[data-skin="' + s.key + '"]', dk = s.dark;
    css.push(sel + ' #dock .roll,' + sel + ' .bubble{background-image:' + s.texture.map(layer).join(',') + ',linear-gradient(160deg,color-mix(in srgb,var(--brass) 14%,transparent),transparent 50%)!important;background-size:auto!important;background-repeat:repeat!important;border:1px solid color-mix(in srgb,var(--brass) 45%,transparent);box-shadow:0 18px 50px -12px rgba(0,0,0,.55),' + VIG + '}');
    css.push(sel + ' .bubble::after{border:0}');
    const inv = '--ink:' + mix(dk.raised, dk.brass, .10) + ';--bg:' + dk.ink + ';--good:#7FD89C;--roll-hit:#8CC4DC;--roll-on:#1B140C;--roll-accent:#F08F5E;--roll-accent-ink:#F4A07A;box-shadow:0 18px 50px -12px rgba(0,0,0,.7),inset 0 0 0 1px color-mix(in srgb,var(--brass) 30%,transparent),' + VIG;
    css.push('@media (prefers-color-scheme: dark){' + sel + ':not([data-theme="light"]) #dock .roll,' + sel + ':not([data-theme="light"]) .bubble{' + inv + '}}');
    css.push(sel + '[data-theme="dark"] #dock .roll,' + sel + '[data-theme="dark"] .bubble{' + inv + '}');
    // chips inside the dark card: light text on their dark tint
    css.push('@media (prefers-color-scheme: dark){' + sel + ':not([data-theme="light"]) .roll .chip,' + sel + ':not([data-theme="light"]) .bubble .chip{color:var(--bg)}}');
    css.push(sel + '[data-theme="dark"] .roll .chip,' + sel + '[data-theme="dark"] .bubble .chip{color:var(--bg)}');
  }
  // every look: the close buttons fully visible; then each look's own rules (css)
  css.push(':root[data-skin] .roll .x,:root[data-skin] .bubble .bclose{opacity:1}');
  for (const s of SK) if (s.css) css.push(...s.css(':root[data-skin="' + s.key + '"]', noise));
  return css.join('\n') + '\n';
}

// ── Check ──────────────────────────────────────────────────────────────────────────────────────────────────
// Words a look must say its own way, and the ones it may (§2 WORD falls back to plain English for those).
const REQUIRED_WORDS = ['cancel', 'log', 'clean', 'critIcon'], OPTIONAL_WORDS = ['ok', 'turn'];
// Font families every device has: allowed in a stack without a file in web/fonts.
const SYSTEM_FONTS = ['Times New Roman', 'Segoe UI', 'Georgia', 'Arial', 'Helvetica'];
// Dice: groups per look and sets per group (like the pirate sets).
const DICE_GROUPS = 6, SETS_PER_GROUP = 4;
const HEX = /^#[0-9A-Fa-f]{6}$/;
// Every problem with the looks, as "<file>: <what is missing>" lines (empty = all complete).
function checkLooks(root, looks){
  const R = p => fs.readFileSync(path.join(root, p), 'utf8'), errs = [];
  const THEMES = loadThemes(root), P = THEMES.pirate || {};
  // pirate's colour tokens: the #RRGGBB ones in src/theme.css's first (light) block
  const themeCss = R('src/theme.css'), rootBlock = (themeCss.match(/:root\{([^}]*)\}/) || [, ''])[1];
  const baseToks = {}; for (const m of rootBlock.matchAll(/--([a-z-]+):\s*([^;]+);/g)) baseToks[m[1]] = m[2].trim();
  const colourToks = Object.keys(baseToks).filter(k => HEX.test(baseToks[k]));
  // web/fonts/fonts.css: which family each file stem is, and every file it points at
  const fontsCss = R('web/fonts/fonts.css'), stemFamily = {}, familyStems = {}, fontUrls = [];
  for (const [, block] of fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const fam = (block.match(/font-family:\s*'([^']+)'/) || [])[1], url = (block.match(/url\(\/fonts\/([^)]+)\)/) || [])[1];
    if (!fam || !url) continue; fontUrls.push(url);
    const stem = url.replace(/-latin(-ext)?\.woff2$/, ''); stemFamily[stem] = fam; (familyStems[fam] = familyStems[fam] || new Set()).add(stem);
  }
  for (const u of fontUrls) if (!fs.existsSync(path.join(root, 'web/fonts', u))) errs.push('web/fonts/fonts.css: /fonts/' + u + ' is not in web/fonts');
  const landing = R('src/landing.html'), bgdice = R('src/bgdice.html');
  const base = looks.find(l => l.base), baseFiles = new Set(base ? base.fontFiles || [] : []);
  if (!looks.length || !looks[0].base || looks[0].key !== 'pirate') errs.push('src/looks: the first look must be 00-pirate.js with base: true');
  const setOwner = {}; Object.keys(P.dice || {}).forEach(k => { setOwner[k] = 'pirate'; });
  const labels = {};
  for (const l of looks) {
    const e = msg => errs.push(l.file + ': ' + msg);
    // picker entry
    if (typeof l.label !== 'string' || !l.label) e('label missing'); else if (labels[l.label]) e('label "' + l.label + '" is also ' + labels[l.label]); else labels[l.label] = l.file;
    if (typeof l.emoji !== 'string' || !l.emoji) e('emoji missing');
    if (!Array.isArray(l.swatch) || l.swatch.length !== 3 || !l.swatch.every(c => HEX.test(c))) e('swatch must be [dark background, accent, light background] as #RRGGBB');
    // fonts: the stacks it uses, and the files behind them
    const stacks = l.base ? ['f-pirate', 'f-display', 'f-body', 'f-num'].map(k => baseToks[k]).filter(Boolean) : [];
    const dice = l.base ? { font: null, groups: P.diceGroups, sets: P.dice } : l.dice;
    if (!l.base) {
      for (const mode of ['light', 'dark']) {
        const t = l[mode];
        if (!t || typeof t !== 'object') { e(mode + ' tokens missing'); continue; }
        const miss = colourToks.filter(k => !(k in t)), extra = Object.keys(t).filter(k => !colourToks.includes(k));
        if (miss.length) e(mode + ' tokens missing: ' + miss.join(', ') + ' (every #RRGGBB token in src/theme.css)');
        if (extra.length) e(mode + ' tokens not in src/theme.css: ' + extra.join(', '));
        for (const [k, v] of Object.entries(t)) if (!HEX.test(v)) e(mode + ' token ' + k + ' is not #RRGGBB: ' + v);
      }
      if (!l.fonts || typeof l.fonts.title !== 'string') e('fonts.title missing');
      else { stacks.push(l.fonts.title); for (const k of ['display', 'body']) if (l.fonts[k] != null) stacks.push(l.fonts[k]); }
      if (!(l.line === null || (typeof l.line === 'string' && l.line.startsWith('<svg')))) e('line must be an <svg …> string or null');
      if (!Array.isArray(l.texture) || !l.texture.length) e('texture missing (at least one layer)');
      else l.texture.forEach((t, i) => {
        const ok = t && ((typeof t.svg === 'string' && t.svg.startsWith('<svg')) || typeof t.css === 'string'
          || (t.noise && Array.isArray(t.noise.freq) && t.noise.freq.length === 2 && typeof t.noise.octaves === 'number' && typeof t.noise.alpha === 'number'));
        if (!ok) e('texture layer ' + i + ' must be { svg }, { css } or { noise: { freq:[x, y], octaves, alpha } }');
      });
      if (l.css != null && typeof l.css !== 'function') e('css must be a function (sel, noise) => [rules]');
      // words
      const w = l.words;
      if (!w || typeof w !== 'object') e('words missing');
      else {
        const miss = REQUIRED_WORDS.filter(k => !(k in w)), extra = Object.keys(w).filter(k => !REQUIRED_WORDS.includes(k) && !OPTIONAL_WORDS.includes(k));
        if (miss.length) e('words missing: ' + miss.join(', '));
        if (extra.length) e('words not used by the engine: ' + extra.join(', ') + ' (allowed: ' + REQUIRED_WORDS.concat(OPTIONAL_WORDS).join(', ') + ')');
        for (const [k, v] of Object.entries(w)) if (typeof v !== 'string' || !v) e('words.' + k + ' must be text');
      }
    }
    // dice: 6 groups × 4 sets, each from a real pirate set, keys unique across looks
    if (!dice || typeof dice !== 'object' || !dice.groups || !dice.sets) e('dice missing ({ font, groups, sets })');
    else {
      if (!l.base && typeof dice.font !== 'string') e('dice.font missing');
      if (dice.font) stacks.push(dice.font);
      const groups = Object.keys(dice.groups), count = {};
      if (groups.length !== DICE_GROUPS) e('dice: ' + groups.length + ' groups, needs ' + DICE_GROUPS);
      for (const [k, s] of Object.entries(dice.sets)) {
        if (!l.base) {
          if (setOwner[k]) e('dice set ' + k + ' is also in ' + setOwner[k] + ' (set keys are unique across looks)'); else setOwner[k] = l.key;
          if (!(P.dice || {})[s.from]) e('dice set ' + k + ': from "' + s.from + '" is not a pirate set in src/themes.js');
          if (typeof s.name !== 'string' || typeof s.desc !== 'string') e('dice set ' + k + ': name and desc needed');
          if (s.col && !(Array.isArray(s.col) && s.col.length === 3 && s.col.every(c => HEX.test(c)))) e('dice set ' + k + ': col must be [light, deep, numerals] as #RRGGBB');
        }
        if (!groups.includes(s.group)) e('dice set ' + k + ': group "' + s.group + '" is not in dice.groups');
        count[s.group] = (count[s.group] || 0) + 1;
        if (s.font) stacks.push(s.font);
      }
      for (const g of groups) if ((count[g] || 0) !== SETS_PER_GROUP) e('dice group ' + g + ': ' + (count[g] || 0) + ' sets, needs ' + SETS_PER_GROUP);
    }
    // font files: on disk and in fonts.css, each one used, and every self-hosted family in the stacks covered
    const files = l.fontFiles;
    if (!Array.isArray(files) || !files.length) e('fontFiles missing');
    else for (const f of files) {
      if (!fs.existsSync(path.join(root, 'web/fonts', f + '-latin.woff2'))) e('font file web/fonts/' + f + '-latin.woff2 missing');
      if (!stemFamily[f]) { e('font file ' + f + ' has no @font-face in web/fonts/fonts.css'); continue; }
      if (!stacks.some(s => s.includes('"' + stemFamily[f] + '"'))) e('font file ' + f + ' (' + stemFamily[f] + ') is not used by this look\'s fonts or dice');
    }
    const have = new Set([...(files || []), ...baseFiles].map(f => stemFamily[f]).filter(Boolean));
    for (const s of stacks) for (const [, fam] of s.matchAll(/"([^"]+)"/g)) {
      if (familyStems[fam]) { if (!have.has(fam)) e('font "' + fam + '" is used but none of its files (' + [...familyStems[fam]].join(', ') + ') is in fontFiles'); }
      else if (!SYSTEM_FONTS.includes(fam)) e('font "' + fam + '" has no @font-face in web/fonts/fonts.css (add its files there, or to SYSTEM_FONTS in tools/looks.js if every device has it)');
    }
    // floating theme symbols: four shapes in src/landing.html, at least one slot in src/bgdice.html
    for (let i = 0; i < 4; i++) if (!landing.includes('<symbol id="g-' + l.key + '-' + i + '"')) e('symbol <symbol id="g-' + l.key + '-' + i + '"> missing in src/landing.html');
    if (!bgdice.includes('bdg-' + l.key + '"')) e('no floating symbol slots (class "bd bdg bdg-' + l.key + '") in src/bgdice.html');
  }
  for (const [, id] of bgdice.matchAll(/href="#(g-[a-z0-9]+-\d+)"/g)) if (!landing.includes('<symbol id="' + id + '"')) errs.push('src/bgdice.html: #' + id + ' has no <symbol> in src/landing.html');
  return [...new Set(errs)];
}

// ── For the build ──────────────────────────────────────────────────────────────────────────────────────────
// Loads and checks the looks; throws with every problem listed if one is incomplete. Returns the looks and what the
// build writes: css (skins.css), list (picker entries [key, label, emoji, dark, accent, light]), words, dice.
function build(root){
  const looks = loadLooks(root), errs = checkLooks(root, looks);
  if (errs.length) throw new Error('A look is incomplete (src/looks, see tools/looks.js):\n  ' + errs.join('\n  '));
  const skins = looks.filter(l => !l.base);
  return { looks, css: skinsCss(looks), list: looks.map(l => [l.key, l.label, l.emoji, ...l.swatch]),
    words: Object.fromEntries(skins.map(l => [l.key, l.words])), dice: Object.fromEntries(skins.map(l => [l.key, l.dice])) };
}
// text with its one placeholder /*__<name>__*/<empty literal> replaced by value as JSON; throws if the placeholder
// isn't there exactly once (file names the source, for the message).
function inject(text, name, value, file){
  const parts = text.split(new RegExp('/\\*__' + name + '__\\*/(?:\\{\\}|\\[\\])'));
  if (parts.length !== 2) throw new Error('looks: ' + file + ' needs exactly one /*__' + name + '__*/ placeholder (found ' + (parts.length - 1) + ')');
  return parts[0] + JSON.stringify(value) + parts[1];
}
module.exports = { build, inject, loadLooks, checkLooks, skinsCss };
// `node tools/looks.js`: just the check.
if (require.main === module) {
  try { const b = build(path.join(__dirname, '..')); console.log('looks ok:', b.looks.map(l => l.key).join(', ')); }
  catch (err) { console.error(err.message); process.exit(1); }
}
