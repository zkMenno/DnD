// Builds everything in dist/ from src/, packs/, data/ and web/. No dependencies beyond Node itself.
//   dist/claude/  one self-contained HTML per character: the claude.ai artifacts (the layout buildDoc() writes)
//   dist/web/     the web app PocketBase serves: engine files, packs, items.json, and the built pages index.html,
//                 sheet.html, try.html, legal.html, home-dice.js and sw.js (everything else is copied from web/)
// usage: node tools/build.js   (also run by tools/test.sh, the Dockerfile and tools/refresh.js)
//        node tools/build.js --stamp <dir>   only the last step (stamp(), below) on an already built web app in <dir>:
//                                            tools/test/web/e2e-sw.js uses it to make "the next build" with one change
// Order matters at the end: content-hash tags are added once every file is written, and sw.js comes last
// because its file list covers the finished pages. The looks (☰ → Theme) come from src/looks/ via tools/looks.js,
// which checks them first: the build stops if one is incomplete.
const fs = require('fs'), path = require('path'), { createHash } = require('crypto');
// Reads a repo file (path relative to the repo root) as text.
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
if (process.argv[2] === '--stamp') { stamp(path.resolve(process.argv[3])); process.exit(0); }
// The claude.ai sheets (dist/claude). tools/test/lib.js knows them by name (and builds its fixture sheets from
// trial-brute.html).
const SHEETS = [   // pack file, data file, page title, output name
  { pack:'henry',  data:'henry',  title:'Henry Gibbs',      out:'henry.html' },
  { pack:'wick',   data:'wick',   title:'Wick Softtoppoms', out:'wick.html' },
  { pack:'tester2', data:'tester2', title:'AppTester-02',    out:'apptester2.html' },
  { pack:'trial-brute', data:'trial-brute', title:'Torgan Ironvow', out:'trial-brute.html' },
  { pack:'trial-mage',  data:'trial-mage',  title:'Vexa Emberscale', out:'trial-mage.html' },
];
// The engine lives in src/engine/ as one file per section (00-header … 22-move). They are joined in name order into
// one script: the claude.ai page keeps it as its single #main part (buildDoc writes it back on sync), the web app
// gets engine/main.js.
const ENGINE_DIR = path.join(__dirname, '..', 'src', 'engine');
// The whole engine as one script (src/engine/*.js joined in name order).
const engine = () => fs.readdirSync(ENGINE_DIR).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(ENGINE_DIR, f), 'utf8')).join('\n');
// A pack's id, read from its source text (PACK = { id, theme, … }): it names the #<id>-data script.
const packId = src => (src.match(/\bid:\s*["']([a-z0-9-]+)["'],\s*theme:/) || [])[1];   // PACK = { id, theme, … }
// ── claude.ai sheets ───────────────────────────────────────────────────────────────────────────────────────
// One claude.ai sheet as a single HTML file: head, CSS, the character's data, the item list, themes, class modules,
// the pack and the engine, each in its own <script>/<style> with the id the engine looks for. items.json is
// escaped ("<" → \u003c) so no item text can close the script tag.
function claudeDoc(s){
  const pack = R('packs/'+s.pack+'.js'), id = packId(pack);
  return R('src/head.html').replace(/<title>[^<]*<\/title>/, '<title>'+s.title+'</title>') + '\n'
    + '<style id="theme-css">'+R('src/theme.css')+'</style>\n<style id="css">'+R('src/app.css')+'</style>\n<div id="app"></div>\n'
    + '<script id="'+id+'-data" type="application/json">'+R('data/'+s.data+'.json')+'</script>\n'
    + '<script id="items-data" type="application/json">'+R('data/items.json').trim().replace(/</g,'\\u003c')+'</script>\n'
    + '<script id="themes">'+R('src/themes.js')+'</script>\n<script id="classes">'+R('src/classes.js')+'</script>\n'
    + '<script id="pack">'+pack+'</script>\n<script id="main">'+engine()+'</script>\n</body></html>';
}
// The looks, checked (throws with a list of what's missing): skins.css, the picker list, words and dice for the web app.
const { build: buildLooks, inject } = require('./looks.js');
const LOOKS = (() => { try { return buildLooks(path.join(__dirname, '..')); } catch (e) { console.error('❌ ' + e.message); process.exit(1); } })();
const out = path.join(__dirname, '..', 'dist');
fs.mkdirSync(out+'/claude', {recursive:true});
for (const s of SHEETS) fs.writeFileSync(out+'/claude/'+s.out, claudeDoc(s));
// ── Web app: engine, packs and static files ────────────────────────────────────────────────────────────────
// Engine parts as files, plus packs; the shell pages live in web/ (sw.template.js is only the source of sw.js).
// The web engine gets the looks filled in: skins.css (built), each look's dice (themes.js) and words (main.js).
fs.mkdirSync(out+'/web/engine', {recursive:true}); fs.mkdirSync(out+'/web/packs', {recursive:true});
for (const f of ['theme.css','app.css','classes.js']) fs.copyFileSync(path.join(__dirname,'..','src',f), out+'/web/engine/'+f);
fs.writeFileSync(out+'/web/engine/skins.css', LOOKS.css);
fs.writeFileSync(out+'/web/engine/themes.js', inject(R('src/themes.js'), 'SKIN_DICE', LOOKS.dice, 'src/themes.js'));
fs.writeFileSync(out+'/web/engine/main.js', inject(engine(), 'SKIN_WORDS', LOOKS.words, 'src/engine/02-boot.js'));
fs.copyFileSync(path.join(__dirname,'..','data','items.json'), out+'/web/items.json');   // ➕ Add item list, fetched when opened
for (const f of fs.readdirSync(path.join(__dirname,'..','packs'))) fs.copyFileSync(path.join(__dirname,'..','packs',f), out+'/web/packs/'+f);
fs.cpSync(path.join(__dirname,'..','web'), out+'/web', { recursive: true, filter: f => !f.endsWith('sw.template.js') });   // incl. fonts/
// Icons (tools/gen-icons.py): the sprite next to the pages, and the emoji → icon map stamped into icons.js
fs.copyFileSync(path.join(__dirname,'..','src','icons.svg'), out+'/web/icons.svg');
fs.writeFileSync(out+'/web/icons.js', fs.readFileSync(out+'/web/icons.js','utf8').replace('/*__ICON_MAP__*/{}', fs.readFileSync(path.join(__dirname,'..','src','icons.json'),'utf8').trim()));
fs.writeFileSync(out+'/web/sw-register.js', inject(R('web/sw-register.js'), 'LOOKS', LOOKS.list, 'web/sw-register.js'));   // the theme picker's looks
// ── Web app: pages ─────────────────────────────────────────────────────────────────────────────────────────
// A web page's <head>: the same as the claude.ai sheets (reset, fonts), then engine CSS by link. Every path is
// absolute: sheet.html is also served at /<username>/<D&D Beyond id> (server/pocketbase-main.go), where relative
// paths would miss. Fonts: the web app serves its own copies (web/fonts, GDPR: no visitor ever contacts Google);
// claude.ai sheets keep Google Fonts. Adds the manifest, icons, theme and skin CSS, and the offline script.
const head = title => R('src/head.html').replace(/<title>[^<]*<\/title>/, '<title>'+title+'</title>')
    .replace(/<link rel="preconnect"[^>]*>\n?/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="/fonts/fonts.css">')
  + '\n<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/favicon.png?v=4" type="image/png" sizes="96x96"><link rel="icon" href="/favicon.ico?v=4" sizes="16x16 32x32 48x48"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4">'
  + '<meta name="theme-color" content="#0f1720"><link rel="stylesheet" href="/engine/theme.css"><link rel="stylesheet" href="/engine/skins.css">'
  + '<link rel="stylesheet" href="/icons.css"><script src="/sw-register.js"></script><script src="/icons.js" defer></script><script src="/feedback.js" defer></script>';   // offline (web/sw.template.js) · 🐞 feedback box; no inline scripts (CSP)
// Sheet pages: the tumbling background dice (the same ones as the home page, throwable via home-anim.js) and a
// loading card with a gold bar while the character and the engine load. DICE_DEFS is the hidden <svg> of dice
// shapes (<symbol>s) taken from src/landing.html.
const DICE_DEFS = (R('src/landing.html').match(/<svg width="0" height="0"[\s\S]*?<\/svg>/) || [''])[0];
const BOOT = '<div class="boot"><svg class="bootd20" aria-hidden="true" viewBox="0 0 100 100"><use href="#d20"/></svg><p>Opening your sheet…</p><div class="bootbar" aria-hidden="true"><span></span></div></div>';
// A sheet page around the given <script> tags (sheet.html, try.html).
const sheetFrame = (title, scripts) => head(title) + '<link rel="stylesheet" href="/engine/app.css"><link rel="stylesheet" href="/sheet.css">\n'
  + R('src/bgdice.html').replace('class="bgdice"', 'class="bgdice sheetdice"') + DICE_DEFS
  + '<div id="app">' + BOOT + '</div>\n' + scripts + '<script src="/home-anim.js" defer></script>\n</body></html>';
fs.writeFileSync(out+'/web/sheet.html', sheetFrame('Character', '<script src="/pocketbase.umd.js"></script>\n<script src="/sheet-boot.js"></script>\n'));
// Try-out sheets (web/try-boot.js): two made-up characters anyone can open without an account. Not indexed.
fs.mkdirSync(out+'/web/trial', {recursive:true});
for (const t of ['trial-brute','trial-mage']) fs.copyFileSync(path.join(__dirname,'..','data',t+'.json'), out+'/web/trial/'+t+'.json');
fs.writeFileSync(out+'/web/try.html', sheetFrame('Try Dungeon Tracker', '<script src="/try-boot.js"></script>\n').replace('<link rel="stylesheet" href="/engine/app.css">', '<meta name="robots" content="noindex"><link rel="stylesheet" href="/engine/app.css">'));
// The site's footer, shared by the home page and Privacy & terms.
const SITE_FOOT = '<footer class="foot"><p>Made with 🎲 by <a href="https://github.com/zkMenno" target="_blank" rel="noopener">Menno</a></p>'
  + '<p class="small">This is an unofficial fan project. Dungeon Tracker is not affiliated with Wizards of the Coast or D&amp;D Beyond.</p>'
  + '<p class="small"><a href="#" data-feedback="bug">🐞 Report a bug or share an idea</a> · <a href="/legal.html">Privacy &amp; Terms</a> · Hosted by Hetzner in Germany.</p></footer>\n';
// Home: the public front page (src/landing.html, signed out) and the app's own screens (#main, drawn by web/index.js).
fs.writeFileSync(out+'/web/index.html', head('Dungeon Tracker: your D&amp;D Beyond character at the table')
  + '<meta name="description" content="Dungeon Tracker turns your D&amp;D Beyond character into a quick play sheet: every roll one tap away, HP, spell slots and uses tracked as you play. Read-only, free, hosted in the EU.">\n'
  + '<link rel="stylesheet" href="/home.css">\n'
  + R('src/bgdice.html') + '<header class="top"><a class="brand" href="/"><svg class="brand-d20" aria-hidden="true" viewBox="0 0 100 100"><use href="#d20"/></svg><span>Dungeon Tracker</span></a><span id="who"></span></header>\n'
  + R('src/landing.html') + '\n<p id="msg" class="msg"></p><main id="main"></main>\n'
  + SITE_FOOT
  + '<script src="/pocketbase.umd.js"></script>\n<script src="/index.js"></script>\n<script src="/home-dice.js" defer></script>\n<script src="/home-anim.js" defer></script>\n</body></html>');
// ── Web app: front-page dice ───────────────────────────────────────────────────────────────────────────────
// Front page dice (web/home-anim.js): the sheet's own 3D dice (src/engine/06-3d-dice.js) with the theme's dice sets,
// in one closure so its names don't meet web/index.js. three.js is loaded by home-anim.js when it's needed, so the
// line that loads it in the sheet is left out (the build stops if that line changes, rather than shipping two loaders).
{ const d3 = R('src/engine/06-3d-dice.js'), loader = /^\(function\(\)\{ try \{ const s = document\.createElement\('script'\);.*\n/m;
  if (!loader.test(d3)) throw new Error('home-dice: the three.js loader line in src/engine/06-3d-dice.js changed; update tools/build.js');
  fs.writeFileSync(out+'/web/home-dice.js', '// Built by tools/build.js from src/themes.js + src/engine/06-3d-dice.js + src/home-dice-api.js. Do not edit.\n(function(){\n' + R('src/themes.js')
    + '\nconst THEME = THEMES.pirate || THEMES[Object.keys(THEMES)[0]];\nconst ui = { dice: null };\nconst diceFx = (dice, done) => done();   // no WebGL: the result just shows\n'
    + d3.replace(loader, '') + '\n' + R('src/home-dice-api.js') + '})();\n'); }
// ── Web app: Privacy & terms ───────────────────────────────────────────────────────────────────────────────
// Privacy & terms: src/legal.html with the operator details from src/site.json filled in for {{key}}. Values still
// in [brackets] are placeholders: the build warns but carries on.
{ const site = JSON.parse(R('src/site.json'));
  for (const [k, v] of Object.entries(site)) if (/^\[.*\]$/.test(String(v))) console.warn('⚠️  src/site.json: "' + k + '" is still a placeholder (' + v + '): fill it in before inviting players');
  fs.writeFileSync(out+'/web/legal.html', head('Privacy & terms') + '<link rel="stylesheet" href="/home.css">\n'
    + R('src/bgdice.html') + '<header class="top"><a class="brand" href="/"><svg class="brand-d20" aria-hidden="true" viewBox="0 0 100 100"><use href="#d20"/></svg><span>Dungeon Tracker</span></a><span id="who"><a class="btn login toplogin" href="/">‹ Back</a></span></header>\n'
    + R('src/legal.html').replace(/<!--[\s\S]*?-->\n?/, '').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in site ? site[k] : m)) + '\n' + SITE_FOOT
    + DICE_DEFS   // the dice shapes (<symbol>s)
    + '<script src="/home-anim.js" defer></script>\n</body></html>'); }
stamp(out + '/web');
console.log('built', SHEETS.map(s=>s.out).join(', '), '+ web');

// ── Content hashes and the service worker ──────────────────────────────────────────────────────────────────
// stamp(W): the last step of a build, on the web app in directory W (dist/web, or a copy of it: --stamp).
//   1. ASSET_V: the content hash of each file loaded by script (DYNAMIC) goes into the scripts that load them (sheet-boot.js,
//      try-boot.js, feedback.js), in place of the map after their __ASSET_V__ marker.
//   2. The pages' <script src>/<link href> get ?v=<content hash of that file>: a changed file gets a new address (the
//      browser and the service worker can't hand a page an older copy), an unchanged one keeps it from build to build.
//   3. sw.js (from web/sw.template.js) gets FILES, [path, hash] for every file it may cache plus a third element 1
//      for the app shell (SHELL), and VERSION, a hash of that list. Not in FILES: sw.js itself, and the videos
//      (media/*.webm, *.mp4: streamed with range requests, never cached). index.html is listed as "/".
// Hash = the first 10 hex digits of the file's sha1; the service worker checks the same of what it saves.
// Every step re-runs cleanly on its own output (the map and the tags are replaced, not added).
function stamp(W) {
  // The app shell: what the service worker saves on install, so the home page and a sheet open with no connection
  // (pattern per group, paths relative to dist/web). Everything else is saved the first time it's used (three.js, the
  // other looks' fonts, latin-ext fonts, items.json, try-out data, icons, artwork) and kept across builds while unchanged.
  // Every script and stylesheet the home page and sheet.html load by tag must be in here: stamp() stops otherwise.
  const SHELL = [
    /^(?:index|sheet)\.html$/,                                              // the home page ("/") and every sheet address
    /^(?:sw-register|feedback|home-anim|icons)\.js$|^icons\.(?:css|svg)$|^engine\/(?:theme|skins)\.css$|^fonts\/fonts\.css$/,   // every page's <head> (+ the icon sprite)
    /^(?:index|home-dice|pocketbase\.umd)\.js$|^home\.css$/,                // the home page
    /^sheet-boot\.js$|^sheet\.css$|^engine\/(?:app\.css|themes\.js|classes\.js|main\.js)$|^packs\/[^/]+\.js$/,   // a sheet: boot, engine, every pack
    // the default (pirate) look's fonts, latin only (latin-ext loads only for letters outside it): Pirata One,
    // Alegreya SC 500/700, Alegreya Sans 400/500/700, IBM Plex Mono 500/700 (--f-* in src/theme.css)
    /^fonts\/(?:pirata-one-400|alegreya-sc-(?:500|700)|alegreya-sans-(?:400|500|700)|ibm-plex-mono-(?:500|700))-latin\.woff2$/,
  ];
  const hashOf = rel => createHash('sha1').update(fs.readFileSync(path.join(W, rel))).digest('hex').slice(0, 10);
  const files = [], walk = d => fs.readdirSync(path.join(W, d)).forEach(f => { const rel = d ? d + '/' + f : f;
    if (fs.statSync(path.join(W, rel)).isDirectory()) walk(rel); else files.push(rel); });
  walk(''); files.sort();
  // 1. the map of script-loaded files
  const DYNAMIC = /^(?:engine\/[^/]+\.js|packs\/[^/]+\.js|trial\/[^/]+\.json|items\.json|feedback\.css|icons\.svg|admin\.(?:js|css))$/, MARK = /\/\*__ASSET_V__\*\/\{[^}]*\}/;
  const map = {}; files.filter(f => DYNAMIC.test(f)).forEach(f => { map['/' + f] = hashOf(f); });
  for (const f of ['sheet-boot.js', 'try-boot.js', 'feedback.js', 'icons.js', 'index.js']) { const src = fs.readFileSync(path.join(W, f), 'utf8');
    if (!MARK.test(src)) throw new Error(f + ': the ASSET_V marker is missing (tools/build.js fills in the map after it)');
    fs.writeFileSync(path.join(W, f), src.replace(MARK, '/*__ASSET_V__*/' + JSON.stringify(map))); }
  // 2. the pages' tags (a file that isn't there stops the build)
  const TAG = /(<(?:script|link)\b[^>]*?\b(?:src|href)=")\/([^"?#]+\.(?:js|css))(?:\?v=[0-9a-f]*)?"/g;
  for (const page of ['index.html', 'sheet.html', 'legal.html', 'try.html']) { const f = path.join(W, page);
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(TAG, (m, a, rel) => a + '/' + rel + '?v=' + hashOf(rel) + '"')); }
  // 3. the service worker's file list, after checking the shell is complete
  const shell = f => SHELL.some(re => re.test(f));
  for (const re of SHELL) if (!files.some(f => re.test(f))) throw new Error('sw: no file matches ' + re + ' (SHELL in tools/build.js)');
  for (const page of ['index.html', 'sheet.html']) for (const m of fs.readFileSync(path.join(W, page), 'utf8').matchAll(TAG))
    if (!shell(m[2])) throw new Error('sw: ' + page + ' loads /' + m[2] + ', which is not in the app shell (SHELL in tools/build.js)');
  const list = files.filter(f => f !== 'sw.js' && !/^media\/.*\.(?:webm|mp4)$/.test(f))
    .map(f => [f === 'index.html' ? '/' : '/' + f, hashOf(f)].concat(shell(f) ? [1] : []));
  const version = createHash('sha1').update(JSON.stringify(list)).digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(W, 'sw.js'), R('web/sw.template.js').replace('__VERSION__', version).replace('/*__FILES__*/[]', JSON.stringify(list)));
}
