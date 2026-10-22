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
  + '\n<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-192.png">'
  + '<meta name="theme-color" content="#0f1720"><link rel="stylesheet" href="/engine/theme.css">'
  + '<script src="/sw-register.js"></script>';   // offline (web/sw.template.js); no inline scripts (CSP)
fs.writeFileSync(out+'/web/sheet.html', head('Character') + '<link rel="stylesheet" href="/engine/app.css"><link rel="stylesheet" href="/home.css">\n'
  + '<div id="app"><div class="boot"><p>Loading…</p></div></div>\n<script src="/pocketbase.umd.js"></script>\n<script src="/sheet-boot.js"></script>\n</body></html>');
fs.writeFileSync(out+'/web/index.html', head('Character sheets') + '<link rel="stylesheet" href="/home.css">\n'
  + '<header class="top"><h1>Character sheets</h1><span id="who"></span></header><p id="msg" class="msg"></p><main id="main"></main>\n'
  + '<footer class="foot"><a href="/legal.html">Privacy &amp; terms</a> · Hosted in the EU (Germany)</footer>\n'
  + '<script src="/pocketbase.umd.js"></script>\n<script src="/index.js"></script>\n</body></html>');
// privacy & terms: src/legal.html with the operator details from src/site.json
{ const site = JSON.parse(R('src/site.json'));
  for (const [k, v] of Object.entries(site)) if (/^\[.*\]$/.test(String(v))) console.warn('⚠️  src/site.json: "' + k + '" is still a placeholder (' + v + '): fill it in before inviting players');
  fs.writeFileSync(out+'/web/legal.html', head('Privacy & terms') + '<link rel="stylesheet" href="/home.css">\n'
    + R('src/legal.html').replace(/<!--[\s\S]*?-->\n?/, '').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in site ? site[k] : m)) + '\n</body></html>'); }
// offline: the service worker gets this build's file list and a version hash (a new build = a fresh cache)
{ const crypto = require('crypto'), files = [], walk = d => fs.readdirSync(path.join(out, 'web', d)).forEach(f => { const rel = d ? d+'/'+f : f;
    if (fs.statSync(path.join(out, 'web', rel)).isDirectory()) walk(rel); else files.push(rel); });
  walk(''); const keep = files.filter(f => !/^sw\.js$/.test(f)).sort(), h = crypto.createHash('sha1');
  keep.forEach(f => h.update(f).update(fs.readFileSync(path.join(out, 'web', f))));
  fs.writeFileSync(out+'/web/sw.js', R('web/sw.template.js').replace('__VERSION__', h.digest('hex').slice(0, 12)).replace('/*__FILES__*/[]', JSON.stringify(['/'].concat(keep.map(f => '/' + f))))); }
console.log('built', SHEETS.map(s=>s.out).join(', '), '+ web');
