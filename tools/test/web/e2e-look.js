// First visit "Pick a theme" window (lookAskMaybe, src/engine/18-menu-rests-quickroll.js): shows once on a player's
// own sheet when this device has no look yet, "Not now" closes it for good, and picking a look applies it.
// Browser tests normally skip the window (navigator.webdriver); this one turns it on with window.LOOK_ASK_TEST.
// Run: node tools/test/web/e2e-look.js [server URL], or via bash tools/test.sh web.
const { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
let fail = 0; const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) fail = 1; };
(async () => {
  const b = await chromium.launch({ executablePath: watch.CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { window.LOOK_ASK_TEST = true; });
  const p = await ctx.newPage(); const errs = []; watch(p, errs); p.setDefaultTimeout(20000);
  const email = 'look' + Date.now() + '@example.test';
  await p.goto(B + '/#signin'); await p.fill('input[name=email]', email); await p.evaluate(() => { document.querySelector('.pwbox').open = true; });
  await p.evaluate(() => { document.querySelector('[data-pwmode=up]').click(); }); await p.fill('input[name=password]', 'Passw0rd-look'); await p.fill('input[name=password2]', 'Passw0rd-look');
  await p.click('#pwgo'); await p.waitForSelector('#add');
  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/900000002'); await p.click('#add button'); await watch.onboard(p);
  await p.waitForSelector('#vitals', { timeout: 30000 });
  await p.waitForSelector('.lookask', { timeout: 5000 }).catch(() => {});
  ok('a new player sees "Pick a theme" on their first sheet', !!(await p.$('.lookask')));
  ok('it lists every look and light / dark / auto', await p.evaluate(() => document.querySelectorAll('.lookask .skinopt').length === window.Skin.list.length && document.querySelectorAll('.lookask [data-i=mode]').length === 3));
  await p.click('.lookask [data-i=mode][data-m=dark]'); ok('light/dark applies at once', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
  await p.click('.lookask .mbtns [data-i=close]'); ok('"Not now" closes it', !(await p.$('.lookask')));
  await p.reload(); await p.waitForSelector('#vitals'); await p.waitForTimeout(1800);
  ok('it asks only once on this device', !(await p.$('.lookask')));
  await p.evaluate(() => { localStorage.removeItem('dt-look-asked'); localStorage.removeItem('dt-skin'); }); await p.reload(); await p.waitForSelector('.lookask', { timeout: 5000 });
  await Promise.all([p.waitForNavigation(), p.click('.lookask [data-i=look][data-k=gothic]')]); await p.waitForSelector('#vitals');
  ok('picking a look applies it', await p.evaluate(() => document.documentElement.dataset.skin === 'gothic'));
  ok('no page errors', !errs.length); if (errs.length) console.log(errs.join('\n'));
  await b.close(); process.exit(fail);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
