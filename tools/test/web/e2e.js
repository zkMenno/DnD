// End-to-end: web app against the local server. Sign up, add a character by link, use the sheet, reload, open it
// on a second device, and pull fresh data from D&D Beyond.
// Run: node tools/test/web/e2e.js [server URL], or as part of bash tools/test.sh web. Default server:
// http://127.0.0.1:8090 (tools/devserver.sh). Prints PASS/FAIL per check and exits non-zero on a failure.
// Order: the first web e2e test. It makes the account menno@example.test that e2e-items.js signs in with.
const {chromium} = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch({executablePath: watch.CHROMIUM});
  const ctx = await b.newContext({viewport:{width:390,height:844}, colorScheme:'dark'});
  const p = await ctx.newPage(); const errs = []; watch(p, errs); p.setDefaultTimeout(20000);
  // Prints PASS/FAIL for one check and marks the run failed if it didn't pass.
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  // Sign up, add Wick by link, change HP and write a note; both survive a reload.
  await p.goto(B + '/#signin'); await p.fill('input[name=email]', 'menno@example.test'); await p.evaluate(() => { document.querySelector('.pwbox').open = true; }); await p.fill('input[name=password]', 'Passw0rd-menno');
  await p.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await p.click('#pwgo'); await p.waitForSelector('#add');
  ok('sign up and land on the home page', true);
  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/165157421/NuPqJA'); await p.click('#add button'); await watch.onboard(p);
  await p.waitForURL(/\/[a-z0-9-]+\/\d+$/); await p.waitForSelector('#vitals', {timeout: 30000}); await p.waitForTimeout(1500);
  ok('adding by link opens the sheet', (await p.title()) === 'Wick Softtoppoms');
  const hp0 = await p.evaluate(() => S.hp);
  await p.evaluate(() => { S.hp -= 7; save(); paintVitals(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { notesStore.add({text:'Met the Bluff harbourmaster', kind:'story', done:false, at:Date.now(), session:1}); }); await p.waitForTimeout(1500);
  await p.screenshot({path: watch.shot('e2e-sheet.png')});
  await p.reload(); await p.waitForSelector('#vitals'); await p.waitForTimeout(2500);
  ok('tracker change kept after reload (from the server)', await p.evaluate(h => S.hp === h - 7, hp0));
  ok('note kept after reload', await p.evaluate(() => NOTES.some(n => /harbourmaster/.test(n.text))));
  // a fresh browser (no local cache) sees the same state: proves it's on the server, not localStorage
  const ctx2 = await b.newContext({viewport:{width:390,height:844}}); const p2 = await ctx2.newPage(); p2.setDefaultTimeout(20000);
  await p2.goto(B + '/#signin'); await p2.fill('input[name=email]', 'menno@example.test'); await p2.evaluate(() => { document.querySelector('.pwbox').open = true; }); await p2.fill('input[name=password]', 'Passw0rd-menno'); await p2.click('button[value=in]');
  await p2.waitForSelector('#mine .ch'); ok('home lists the character with campaign', /The Bluff|Warlock/.test(await p2.textContent('#mine')));
  await p2.click('#mine .ch a'); await p2.waitForSelector('#vitals'); await p2.waitForTimeout(2500);
  ok('another device gets the same HP and notes', await p2.evaluate(h => S.hp === h - 7 && NOTES.some(n => /harbourmaster/.test(n.text)), hp0));
  // pull from D&D Beyond via ☰ (two confirm steps): the data gets a new syncedAt
  const t0 = await p2.evaluate(() => DATA.syncedAt);
  p2.evaluate(() => { pull(); }); for (let i = 0; i < 2; i++) { await p2.waitForSelector('.mbtns [data-m="1"]'); await p2.click('.mbtns [data-m="1"]'); await p2.waitForTimeout(300); }
  await p2.waitForTimeout(8000); console.log('   msg:', await p2.evaluate(() => (document.querySelector('#syncmsg')||{}).textContent)); await p2.waitForSelector('#vitals'); await p2.waitForTimeout(1500);
  ok('pull from D&D Beyond re-syncs', await p2.evaluate(t => DATA.syncedAt !== t, t0));
  { const bad = [errs].flat(); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); } await b.close();
})();
