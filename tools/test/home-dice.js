// The front page's dice tray (web/home-anim.js "Dice tray"): tapping a set makes its three dice wait on screen to be
// thrown, as in the app (src/engine/06b-throw-dice.js, bundled into web/home-dice.js); a drag throws them, they land on
// the values rolled, and the result card shows those values and their total. Also: "Roll for me", Enter, Roll again,
// closing the card (×, Escape, a tap outside), reduced motion (no waiting, the card at once) and no WebGL (the card
// still shows the numbers). Screenshots of the waiting dice and the card at 390 and 1200 px, light and dark.
// Needs no PocketBase: it serves dist/web itself (the page's own account calls just fail, which the front page allows).
// Run: node tools/test/home-dice.js (after node tools/build.js), or as part of bash tools/test.sh sheets.
//      node tools/test/home-dice.js http://127.0.0.1:8092   the same against a running server (PocketBase, with its
//                                                            security headers) instead of the built-in one
const http = require('http'), fs = require('fs'), path = require('path');
const { check, withBrowser, shot } = require('./lib');
const WEB = path.join(__dirname, '..', '..', 'dist', 'web');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

// A static server for dist/web on a free port ("/" is index.html; anything else missing is a 404). Resolves its base URL.
function serve(){
  const server = http.createServer((q, s) => {
    const u = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(WEB, u === '/' ? 'index.html' : u);
    if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, base: 'http://127.0.0.1:' + server.address().port })));
}
// Opens the front page in a fresh context (width, colour scheme, options: reducedMotion, noGL) with the first-view
// demo throw already "seen", scrolls to the tray and waits for it (and, with 3D, for three.js and the set pictures).
// page.errs collects uncaught page errors.
async function openHome(browser, base, width, scheme, o = {}){
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: scheme, serviceWorkers: 'block', reducedMotion: o.reducedMotion || 'no-preference' });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.setDefaultTimeout(10000);
  await p.addInitScript(noGL => {
    try { sessionStorage.setItem('dt-demo', '1'); } catch (_) {}
    if (noGL) { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, a){ return /webgl/.test(t) ? null : get.call(this, t, a); }; }
  }, !!o.noGL);
  await p.goto(base + '/'); await p.waitForSelector('#tray:not([hidden]) .sw');
  await p.evaluate(() => document.querySelector('#tray').scrollIntoView({ block: 'center' }));
  if (!o.noGL) { await p.waitForFunction(() => !!window.THREE && document.querySelectorAll('.sw.d3').length === 3, null, { timeout: 15000 }).catch(() => {}); }
  await p.waitForTimeout(600);
  // remember every throw the tray asks for: window.__thrown = the dice ([{s, v}]) of the last one
  await p.evaluate(() => { const D = window.HomeDice;
    for (const k of ['throw', 'roll']) { const f = D[k]; D[k] = (dice, done) => { window.__thrown = dice.map(d => ({ s: d.s, v: d.v })); window.__how = k; return f(dice, done); }; } });
  p.close2 = () => ctx.close();
  return p;
}
// Starts recording, every frame, the face each 3D die shows to the camera (window.__faces = [{s, v}] in the order the
// dice were added), as tools/test/throw.js does on a sheet: the resting tilt (Euler -.32, .18) is taken off first.
const recordFaces = p => p.evaluate(() => {
  const D3 = window.HomeDice.d3; cancelAnimationFrame(window.__rec); window.__faces = []; const seen = new Map();
  const untilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.32, .18, 0)).invert();
  (function tick(){
    if (D3.scene) D3.scene.children.forEach(m => {
      if (!m.isMesh) return; const s = Object.keys(D3.geo).find(k => D3.geo[k].g === m.geometry); if (!s) return;
      let best = -2, v = 0; D3.geo[s].faces.forEach((f, k) => { const z = f.n.clone().applyQuaternion(untilt.clone().multiply(m.quaternion)).z; if (z > best) { best = z; v = k + 1; } });
      if (!seen.has(m.uuid)) { seen.set(m.uuid, window.__faces.length); window.__faces.push({ s: +s, v }); }
      else window.__faces[seen.get(m.uuid)].v = v;
    });
    window.__rec = requestAnimationFrame(tick);
  })();
});
// Where the first waiting die is on screen (CSS px), from its 3D position
const diePos = p => p.evaluate(() => {
  const D3 = window.HomeDice.d3, m = D3.scene.children.find(c => c.isMesh); if (!m) return null;
  const v = m.position.clone().project(D3.cam);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
// Waits up to ms for the waiting dice; true if they showed (and haven't been thrown yet)
const waitsForThrow = async (p, ms = 5000) => { try { await p.waitForSelector('.throwfx:not(.thrown)', { timeout: ms }); return true; } catch (_) { return false; } };
// Waits up to ms for the result card, then for its slide-in to end; true if it showed
const cardShows = async (p, ms = 15000) => { try { await p.waitForSelector('.diceresult', { timeout: ms }); await p.waitForTimeout(350); return true; } catch (_) { return false; } };
// Drags from the first die upwards and lets go quickly: a flick
async function flick(p, dx = 40, dy = -260){
  const at = await diePos(p);
  await p.mouse.move(at.x, at.y); await p.mouse.down();
  await p.mouse.move(at.x + dx / 3, at.y + dy / 3, { steps: 3 }); await p.mouse.move(at.x + dx, at.y + dy, { steps: 4 }); await p.mouse.up();
}
// What the result card shows: title, total, each die ({s, v} from its data, its text, and whether it is drawn at all)
// and the set chosen
const readCard = p => p.evaluate(() => { const c = document.querySelector('.diceresult'); if (!c) return null;
  const sw = document.querySelector('.sw.on');
  return { title: c.querySelector('.title').textContent, total: parseInt(c.querySelector('.n').textContent, 10),
    dice: [...c.querySelectorAll('.rd')].map(e => ({ s: +e.dataset.s, v: +e.dataset.v, txt: e.textContent.replace(/\s+/g, ' ').trim(), seen: e.getBoundingClientRect().width > 0 })),
    note: c.querySelector('.rnote').textContent, set: window.HomeDice.sets[sw.dataset.k].name, thrown: window.__thrown, how: window.__how,
    inView: (r => r.top >= 0 && r.bottom <= innerHeight + 1)(c.getBoundingClientRect()) }; });
// True when the card shows exactly the dice thrown (values, shapes, the "d20 17" text, on screen) and their total
const cardMatches = r => !!r && !!r.thrown && r.dice.length === r.thrown.length && r.dice.every((d, i) => d.s === r.thrown[i].s && d.v === r.thrown[i].v && d.txt === 'd' + d.s + ' ' + d.v && d.seen)
  && r.total === r.thrown.reduce((a, d) => a + d.v, 0) && r.title === r.set;

withBrowser(async browser => {
  const { server, base } = process.argv[2] ? { server: { close(){} }, base: process.argv[2].replace(/\/$/, '') } : await serve();
  try {
    // ── The whole flow at 390 px, dark ───────────────────────────────────────────────────────────────────
    const p = await openHome(browser, base, 390, 'dark');
    check('tray: three sets with their 3D pictures', await p.evaluate(() => document.querySelectorAll('.sw.d3').length === 3));
    await recordFaces(p);
    await p.click('.sw[aria-checked="true"]');
    check('tap a set: its three dice wait to be thrown', await waitsForThrow(p) && (await p.evaluate(() => window.HomeDice.d3.scene.children.filter(c => c.isMesh).length)) === 3);
    await p.waitForTimeout(1500);
    check('still waiting a while later, no card yet', await p.evaluate(() => !!document.querySelector('.throwfx:not(.thrown)') && !document.querySelector('.diceresult') && window.__how === 'throw'));
    check('the hint says what to do and offers Roll for me', /Drag and let go|Flick the dice/.test(await p.evaluate(() => document.querySelector('.throwhint').innerText))
      && await p.evaluate(() => !!document.querySelector('.throwhint .throwskip')));
    await shot(p, 'home-dice-waiting-390-dark');
    await flick(p);
    check('a drag throws the dice', await p.evaluate(() => !!document.querySelector('.throwfx.thrown')));
    check('the result card shows once they land', await cardShows(p));
    const r1 = await readCard(p), f1 = await p.evaluate(() => window.__faces);
    check('card: the set name, each die with its value, and the total', cardMatches(r1), r1);
    check('card: the dice landed on the values the card shows', JSON.stringify(f1) === JSON.stringify(r1 && r1.thrown), { faces: f1, thrown: r1 && r1.thrown });
    check('card: says every theme has its own sets, and is on screen', /Every theme has its own sets/.test(r1.note) && r1.inView, r1);
    check('card: the dice overlay is gone, the page is usable', await p.evaluate(() => !document.querySelector('.throwfx') && !document.querySelector('.fxdice')));
    await p.waitForTimeout(400); await shot(p, 'home-dice-card-390-dark');
    await p.keyboard.press('Escape');
    check('Escape closes the card', await p.evaluate(() => !document.querySelector('.diceresult')));

    // ── Roll for me, then Roll again with Enter, then × and a tap outside ─────────────────────────────────
    await p.click('.sw[aria-checked="true"]');
    if (await waitsForThrow(p)) await p.click('.throwskip');
    check('Roll for me: the dice roll by themselves', await p.evaluate(() => !document.querySelector('.throwfx') && !!document.querySelector('.fxdice')));
    check('Roll for me: the card shows the values', await cardShows(p) && cardMatches(await readCard(p)), await readCard(p));
    await p.click('.diceresult .again');
    check('Roll again: three new dice wait', await waitsForThrow(p) && await p.evaluate(() => !document.querySelector('.diceresult')));
    await p.keyboard.press('Enter');
    check('Enter throws them', await p.evaluate(() => !!document.querySelector('.throwfx.thrown')));
    check('Roll again: the card shows the new values', await cardShows(p) && cardMatches(await readCard(p)), await readCard(p));
    await p.click('.diceresult .x');
    check('× closes the card', await p.evaluate(() => !document.querySelector('.diceresult')));
    await p.click('.sw[aria-checked="true"]'); if (await waitsForThrow(p)) await p.keyboard.press('Enter');
    await cardShows(p); await p.mouse.click(20, 120);
    check('a tap outside closes the card', await p.evaluate(() => !document.querySelector('.diceresult')));
    check('no page errors', !p.errs.length, p.errs);
    await p.evaluate(() => cancelAnimationFrame(window.__rec)); await p.close2();

    // ── Screenshots: 390 light, 1000 dark (the narrowest with the card in the tray), 1200 light and dark (a drag each, and the card's values checked) ──────────
    for (const [w, scheme] of [[390, 'light'], [1000, 'dark'], [1200, 'light'], [1200, 'dark']]) {
      const q = await openHome(browser, base, w, scheme);
      await q.click('.sw[aria-checked="true"]');
      const waits = await waitsForThrow(q); await q.waitForTimeout(700); await shot(q, 'home-dice-waiting-' + w + '-' + scheme);
      if (waits) await flick(q, -60, -240);
      check(w + ' ' + scheme + ': waits, is thrown, and the card shows its values', waits && await cardShows(q) && cardMatches(await readCard(q)), await readCard(q));
      await q.waitForTimeout(400); await shot(q, 'home-dice-card-' + w + '-' + scheme);
      check(w + ' ' + scheme + ': no page errors', !q.errs.length, q.errs); await q.close2();
    }

    // ── Reduced motion: no waiting, the card at once ─────────────────────────────────────────────────────
    const m = await openHome(browser, base, 390, 'light', { reducedMotion: 'reduce' });
    await m.click('.sw[aria-checked="true"]'); await m.waitForTimeout(300);
    // (no throw at all, so the card is checked on its own: three different dice, each within its sides, and their sum)
    const rm = await readCard(m), own = rm && Object.assign({}, rm, { thrown: rm.dice.map(d => ({ s: d.s, v: d.v })) });
    check('reduced motion: no dice to throw, the card shows straight away', await m.evaluate(() => !document.querySelector('.fx') && !window.__thrown) && cardMatches(own)
      && new Set(rm.dice.map(d => d.s)).size === 3 && rm.dice.every(d => d.v >= 1 && d.v <= d.s), rm);
    await shot(m, 'home-dice-card-390-reduced');
    check('reduced motion: no page errors', !m.errs.length, m.errs); await m.close2();

    // ── No WebGL: the card still shows the numbers ───────────────────────────────────────────────────────
    const g = await openHome(browser, base, 390, 'dark', { noGL: true });
    await g.click('.sw[aria-checked="true"]');
    check('no WebGL: no dice to throw, the card shows the values', await cardShows(g, 10000) && await g.evaluate(() => !document.querySelector('.throwfx')) && cardMatches(await readCard(g)), await readCard(g));
    check('no WebGL: no page errors', !g.errs.length, g.errs); await g.close2();
  } finally { server.close(); }
});
