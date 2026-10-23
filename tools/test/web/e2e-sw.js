// The offline copy across deploys (service worker, web/sw.template.js): a front-page visit saves only the app shell
// (no three.js, no item list, no other looks' fonts); the next build, with one changed file, downloads only that
// file (and the page that links it), copying the rest from the previous cache; afterwards nothing is downloaded again
// but the page itself, and offline the home page and a sheet address (/<username>/<id> → sheet.html) still open.
// Run: node tools/test/web/e2e-sw.js (also part of bash tools/test.sh web). Needs no PocketBase: it serves two copies
// of dist/web itself (build A, and build B = A with home.css changed, re-stamped by node tools/build.js --stamp; B also
// lacks items.json, an optional file, which must not break the install) and logs every request that reaches it.
// Run node tools/build.js first. Prints PASS/FAIL per check and exits non-zero on a failure.
const { chromium } = require('playwright'), watch = require('./watch');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const WEB = path.join(__dirname, '..', '..', '..', 'dist', 'web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.webm': 'video/webm' };
// A build's sw.js: its VERSION and FILES ([path, hash, 1 for the shell]).
const swOf = dir => { const s = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  return { version: s.match(/const VERSION = '([0-9a-f]+)'/)[1], files: JSON.parse(s.match(/FILES = (\[.*?\]);/)[1]) }; };
(async () => {
  // Prints PASS/FAIL for one check (with the detail on a failure) and marks the run failed if it didn't pass.
  const ok = (n, c, d) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
  // Build A = dist/web as built; build B = A with one changed file, stamped again, and items.json gone.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-')), A = path.join(tmp, 'a'), B = path.join(tmp, 'b');
  fs.cpSync(WEB, A, { recursive: true }); fs.cpSync(WEB, B, { recursive: true });
  fs.appendFileSync(path.join(B, 'home.css'), '\n/* build B */\n');
  execFileSync(process.execPath, [path.join(__dirname, '..', '..', 'build.js'), '--stamp', B]);
  fs.rmSync(path.join(B, 'items.json'));
  const swA = swOf(A), swB = swOf(B);
  const changed = swB.files.filter(([p, h]) => (swA.files.find(f => f[0] === p) || [])[1] !== h).map(f => f[0]).sort();
  ok('build B changes home.css and the pages that link it', JSON.stringify(changed) === JSON.stringify(['/', '/home.css', '/legal.html']), changed);

  // The server: root (A or B) as the public dir, sheet addresses get sheet.html like server/pocketbase-main.go, /api/
  // answers 404. Every request is logged as path+query. no-cache: the browser's own cache can't hide a download.
  let root = A; const log = [];
  const server = http.createServer((q, s) => {
    const u = new URL(q.url, 'http://x'); log.push(u.pathname + u.search);
    if (u.pathname.startsWith('/api/')) { s.writeHead(404, { 'content-type': 'application/json' }); return s.end('{}'); }
    const rel = u.pathname === '/' ? 'index.html' : /^\/(?:[a-z0-9_-]{3,20}\/)?\d{4,12}\/?$/.test(u.pathname) ? 'sheet.html' : decodeURIComponent(u.pathname).slice(1);
    const f = path.join(root, path.normalize(rel));
    if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); s.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  // the paths downloaded since the log was last cleared, then clear it. Left out: sw.js (the browser's update check),
  // favicon.ico (Chromium fetches it itself, past the service worker) and the videos (streamed, never cached).
  const took = () => { const t = [...new Set(log.map(l => l.split('?')[0]).filter(p => p !== '/sw.js' && p !== '/favicon.ico' && !/\.(?:webm|mp4)$/.test(p)))].sort(); log.length = 0; return t; };
  // the paths saved in the service worker's caches, by cache name
  const cached = p => p.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname).sort(); return o; });

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  p.errs = []; watch(p, p.errs);
  try {
    // Build A, first visit to the front page: the shell is saved, nothing else.
    await p.goto(base + '/'); await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForFunction(() => !!navigator.serviceWorker.controller); await p.waitForTimeout(1500);
    const c1 = await cached(p), shellA = swA.files.filter(f => f[2]).map(f => f[0]).sort(), first = took();
    ok('build A: one cache, named after its version', JSON.stringify(Object.keys(c1)) === JSON.stringify(['sheets-' + swA.version]), Object.keys(c1));
    ok('…holding the whole app shell (' + shellA.length + ' files)', shellA.every(f => (c1['sheets-' + swA.version] || []).includes(f)), shellA.filter(f => !(c1['sheets-' + swA.version] || []).includes(f)));
    const extra = first.filter(f => /three\.min\.js|items\.json|\/fonts\/(?:cinzel|orbitron|exo-2|uncial|grenze)/.test(f));
    ok('a front-page visit downloads no three.js, item list or other looks\' fonts', !extra.length, extra);
    // A second visit on A: whatever the page uses beyond the shell (icons, artwork) is saved on first use.
    await p.reload(); await p.waitForTimeout(1500); took();
    await p.reload(); await p.waitForTimeout(1000);
    { const t = took(); ok('build A, again: only the page itself is downloaded', JSON.stringify(t) === '["/"]', t); }

    // Deploy build B, reload: the new service worker installs (copying what didn't change) and takes over.
    root = B;
    await p.reload();
    for (let i = 0; i < 40 && (await p.evaluate(() => caches.keys())).join() !== 'sheets-' + swB.version; i++) await p.waitForTimeout(500);
    await p.waitForTimeout(1500);
    const c2 = await cached(p), shellB = swB.files.filter(f => f[2]).map(f => f[0]).sort();
    ok('build B: the new cache replaces the old one', JSON.stringify(Object.keys(c2)) === JSON.stringify(['sheets-' + swB.version]), Object.keys(c2));
    ok('…with the whole app shell (a missing optional file didn\'t stop the install)', shellB.every(f => (c2['sheets-' + swB.version] || []).includes(f)), shellB.filter(f => !(c2['sheets-' + swB.version] || []).includes(f)));
    const hits = log.filter(l => l.split('?')[0] === '/home.css').length, second = took();
    ok('the update downloads only the changed file and its page', JSON.stringify(second) === '["/","/home.css"]', second);
    ok('…the changed file at most twice (the old worker for the page, the new one for its cache): ' + hits + '×', hits >= 1 && hits <= 2, hits);
    ok('…and the page has the new file', await p.evaluate(() => [...document.styleSheets].some(s => /home\.css/.test(s.href || '') && [...s.cssRules].length > 0)
      && /home\.css\?v=/.test(document.querySelector('link[href^="/home.css"]').href)));
    await p.reload(); await p.waitForTimeout(1000);
    { const t = took(); ok('build B, again: only the page itself is downloaded', JSON.stringify(t) === '["/"]', t); }

    // Offline: the home page, and a sheet address (never opened, so sheet-boot.js says so) from the saved copies.
    await ctx.setOffline(true);
    await p.reload(); await p.waitForSelector('header.top', { timeout: 10000 }).catch(() => {});
    ok('offline, the home page opens', await p.evaluate(() => !!document.querySelector('header.top') && /\/home\.css/.test([...document.styleSheets].map(s => s.href).join())));
    await p.goto(base + '/player-abcde/1234567').catch(() => {});
    await p.waitForFunction(() => /offline/i.test((document.querySelector('.boot') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
    ok('offline, a sheet address opens sheet.html (and it says it is offline)', await p.evaluate(() => typeof PocketBase === 'function' && /offline/i.test((document.querySelector('.boot') || {}).textContent || '')));
    { const bad = p.errs.filter(e => !/Failed to fetch|NetworkError|ClientResponseError|net::/.test(e)); ok('no page errors' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  } finally {
    await b.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  }
})();
