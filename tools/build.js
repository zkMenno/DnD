// Build the sheets.
//   claude: one self-contained HTML per character (the claude.ai artifacts, same layout buildDoc() writes)
//   web:    the standalone web app (engine files + packs), see web/
// usage: node tools/build.js            → dist/claude/*.html + dist/web/
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const SHEETS = [   // pack file, data file, page title, output name
  { pack:'henry',  data:'henry',  title:'Henry Gibbs',      out:'henry.html' },
  { pack:'tester', data:'tester', title:'AppTester-01',     out:'apptester.html' },
  { pack:'wick',   data:'wick',   title:'Wick Softtoppoms', out:'wick.html' },
  { pack:'tester2', data:'tester2', title:'AppTester-02',    out:'apptester2.html' },
  { pack:'trial-brute', data:'trial-brute', title:'Torgan Ironvow', out:'trial-brute.html' },
  { pack:'trial-mage',  data:'trial-mage',  title:'Vexa Emberscale', out:'trial-mage.html' },
];
// The engine lives in src/engine/ as one file per section (00-header … 21-sync). They are joined in name order into one
// script: the claude.ai page keeps it as its single #main part (buildDoc writes it back on sync), the web app gets engine/main.js.
const ENGINE_DIR = path.join(__dirname, '..', 'src', 'engine');
const engine = () => fs.readdirSync(ENGINE_DIR).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(ENGINE_DIR, f), 'utf8')).join('\n');
const packId = src => (src.match(/\bid:\s*["']([a-z0-9-]+)["'],\s*theme:/) || [])[1];   // PACK = { id, theme, … }
function claudeDoc(s){
  const pack = R('packs/'+s.pack+'.js'), id = packId(pack);
  return R('src/head.html').replace(/<title>[^<]*<\/title>/, '<title>'+s.title+'</title>') + '\n'
    + '<style id="theme-css">'+R('src/theme.css')+'</style>\n<style id="css">'+R('src/app.css')+'</style>\n<div id="app"></div>\n'
    + '<script id="'+id+'-data" type="application/json">'+R('data/'+s.data+'.json')+'</script>\n'
    + '<script id="items-data" type="application/json">'+R('data/items.json').trim().replace(/</g,'\\u003c')+'</script>\n'
    + '<script id="themes">'+R('src/themes.js')+'</script>\n<script id="classes">'+R('src/classes.js')+'</script>\n'
    + '<script id="pack">'+pack+'</script>\n<script id="main">'+engine()+'</script>\n</body></html>';
}
const out = path.join(__dirname, '..', 'dist');
fs.mkdirSync(out+'/claude', {recursive:true});
for (const s of SHEETS) fs.writeFileSync(out+'/claude/'+s.out, claudeDoc(s));
// web app: engine parts as files, plus packs; the shell pages live in web/
fs.mkdirSync(out+'/web/engine', {recursive:true}); fs.mkdirSync(out+'/web/packs', {recursive:true});
for (const f of ['theme.css','app.css','themes.js','classes.js']) fs.copyFileSync(path.join(__dirname,'..','src',f), out+'/web/engine/'+f);
fs.writeFileSync(out+'/web/engine/main.js', engine());
fs.copyFileSync(path.join(__dirname,'..','data','items.json'), out+'/web/items.json');   // ➕ Add item list, fetched when opened
for (const f of fs.readdirSync(path.join(__dirname,'..','packs'))) fs.copyFileSync(path.join(__dirname,'..','packs',f), out+'/web/packs/'+f);
fs.cpSync(path.join(__dirname,'..','web'), out+'/web', { recursive: true, filter: f => !f.endsWith('sw.template.js') });   // incl. fonts/
// web pages: the same <head> as the claude.ai sheets (reset, fonts), then engine CSS by link. Every path is absolute:
// sheet.html is also served at /<username>/<D&D Beyond id> (server/pocketbase-main.go), where relative paths would miss.
// Fonts: the web app serves its own copies (web/fonts, GDPR: no visitor ever contacts Google); claude.ai sheets keep Google Fonts.
const head = title => R('src/head.html').replace(/<title>[^<]*<\/title>/, '<title>'+title+'</title>')
    .replace(/<link rel="preconnect"[^>]*>\n?/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="/fonts/fonts.css">')
  + '\n<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/favicon.png?v=4" type="image/png" sizes="96x96"><link rel="icon" href="/favicon.ico?v=4" sizes="16x16 32x32 48x48"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4">'
  + '<meta name="theme-color" content="#0f1720"><link rel="stylesheet" href="/engine/theme.css">'
  + '<script src="/sw-register.js"></script>';   // offline (web/sw.template.js); no inline scripts (CSP)
fs.writeFileSync(out+'/web/sheet.html', head('Character') + '<link rel="stylesheet" href="/engine/app.css"><link rel="stylesheet" href="/sheet.css">\n'
  + '<div id="app"><div class="boot"><p>Loading…</p></div></div>\n<script src="/pocketbase.umd.js"></script>\n<script src="/sheet-boot.js"></script>\n</body></html>');
// try-out sheets (web/try-boot.js): two made-up characters anyone can open without an account
fs.mkdirSync(out+'/web/trial', {recursive:true});
for (const t of ['trial-brute','trial-mage']) fs.copyFileSync(path.join(__dirname,'..','data',t+'.json'), out+'/web/trial/'+t+'.json');
fs.writeFileSync(out+'/web/try.html', head('Try Dungeon Tracker') + '<meta name="robots" content="noindex"><link rel="stylesheet" href="/engine/app.css"><link rel="stylesheet" href="/sheet.css">\n'
  + '<div id="app"><div class="boot"><p>Loading…</p></div></div>\n<script src="/try-boot.js"></script>\n</body></html>');
// home: the public front page (src/landing.html, signed out) and the app's own screens (#main, drawn by web/index.js)
fs.writeFileSync(out+'/web/index.html', head('Dungeon Tracker: your D&amp;D Beyond character at the table')
  + '<meta name="description" content="Dungeon Tracker turns your D&amp;D Beyond character into a quick play sheet: every roll one tap away, HP, spell slots and uses tracked as you play. Read-only, free, hosted in the EU.">\n'
  + '<link rel="stylesheet" href="/home.css">\n'
  + '<header class="top"><a class="brand" href="/"><svg class="brand-d20" aria-hidden="true" viewBox="0 0 100 100"><use href="#d20"/></svg><span>Dungeon Tracker</span></a><span id="who"></span></header>\n'
  + R('src/landing.html') + '\n<p id="msg" class="msg"></p><main id="main"></main>\n'
  + '<footer class="foot"><p>Made with 🎲 by <a href="https://github.com/zkMenno" target="_blank" rel="noopener">Menno</a></p>'
  + '<p class="small">This is an unofficial fan project. Dungeon Tracker is not affiliated with Wizards of the Coast or D&amp;D Beyond.</p>'
  + '<p><a href="/legal.html">Privacy &amp; Terms</a> · Hosted in Germany.</p></footer>\n'
  + '<script src="/pocketbase.umd.js"></script>\n<script src="/index.js"></script>\n<script src="/home-dice.js" defer></script>\n<script src="/home-anim.js" defer></script>\n</body></html>');
// front page dice (web/home-anim.js): the sheet's own 3D dice (src/engine/06-3d-dice.js) with the theme's dice sets, in one
// closure so its names don't meet web/index.js. three.js is loaded by home-anim.js when it's needed, so the line that
// loads it in the sheet is left out (the build stops if that line changes, rather than shipping two loaders).
{ const d3 = R('src/engine/06-3d-dice.js'), loader = /^\(function\(\)\{ try \{ const s = document\.createElement\('script'\);.*\n/m;
  if (!loader.test(d3)) throw new Error('home-dice: the three.js loader line in src/engine/06-3d-dice.js changed; update tools/build.js');
  fs.writeFileSync(out+'/web/home-dice.js', '// Built by tools/build.js from src/themes.js + src/engine/06-3d-dice.js + src/home-dice-api.js. Do not edit.\n(function(){\n' + R('src/themes.js')
    + '\nconst THEME = THEMES.pirate || THEMES[Object.keys(THEMES)[0]];\nconst ui = { dice: null };\nconst diceFx = (dice, done) => done();   // no WebGL: the result just shows\n'
    + d3.replace(loader, '') + '\n' + R('src/home-dice-api.js') + '})();\n'); }
// privacy & terms: src/legal.html with the operator details from src/site.json
{ const site = JSON.parse(R('src/site.json'));
  for (const [k, v] of Object.entries(site)) if (/^\[.*\]$/.test(String(v))) console.warn('⚠️  src/site.json: "' + k + '" is still a placeholder (' + v + '): fill it in before inviting players');
  fs.writeFileSync(out+'/web/legal.html', head('Privacy & terms') + '<link rel="stylesheet" href="/home.css">\n'
    + R('src/legal.html').replace(/<!--[\s\S]*?-->\n?/, '').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in site ? site[k] : m)) + '\n</body></html>'); }
// Cache-busting: each page asks for this build's copy of its scripts and stylesheets (?v=<hash of the build's files>).
// The service worker serves files from its saved copy first, so without this a fresh page could run with the previous
// build's CSS or engine for one visit after every deploy. sheet-boot.js passes the same tag to what it loads itself.
{ const crypto = require('crypto'), h = crypto.createHash('sha1'), files = [];
  const walk = d => fs.readdirSync(path.join(out, 'web', d)).forEach(f => { const rel = d ? d + '/' + f : f;
    if (fs.statSync(path.join(out, 'web', rel)).isDirectory()) walk(rel); else if (!/\.html$|^sw\.js$|^media\//.test(rel)) files.push(rel); });
  walk(''); files.sort().forEach(f => h.update(f).update(fs.readFileSync(path.join(out, 'web', f))));
  const v = h.digest('hex').slice(0, 10);
  for (const page of ['index.html', 'sheet.html', 'legal.html', 'try.html']) {
    const f = path.join(out, 'web', page);
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")(\/[^"?#]+\.(?:js|css))"/g, '$1$2?v=' + v + '"'));
  } }
// offline: the service worker gets this build's file list and a version hash (a new build = a fresh cache)
{ const crypto = require('crypto'), files = [], walk = d => fs.readdirSync(path.join(out, 'web', d)).forEach(f => { const rel = d ? d+'/'+f : f;
    if (fs.statSync(path.join(out, 'web', rel)).isDirectory()) walk(rel); else files.push(rel); });
  walk(''); const keep = files.filter(f => !/^sw\.js$/.test(f) && !/^media\//.test(f)).sort(), h = crypto.createHash('sha1');   // media/: the front page's demo videos load only when seen, never precached
  keep.forEach(f => h.update(f).update(fs.readFileSync(path.join(out, 'web', f))));
  fs.writeFileSync(out+'/web/sw.js', R('web/sw.template.js').replace('__VERSION__', h.digest('hex').slice(0, 12)).replace('/*__FILES__*/[]', JSON.stringify(['/'].concat(keep.map(f => '/' + f))))); }
console.log('built', SHEETS.map(s=>s.out).join(', '), '+ web');
