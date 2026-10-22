// Verify in the browser: Verify → a SHEET-XXXXXX code with the steps → Check says it isn't there yet (we can't edit
// D&D Beyond from a test) → after the server marks it verified, the list shows ✓ Verified and "My party can see"
// becomes choosable. The server side of verify (own text only, newest proof wins) is in apitest.py.
const { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }), errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 900 }, colorScheme: 'dark' })).newPage(); watch(p, errs); p.setDefaultTimeout(30000);
  await p.goto(B + '/#signin'); await p.fill('input[name=email]', 'verifier@example.test'); await p.click('.pwbox summary'); await p.fill('input[name=password]', 'Passw0rd-verifier');
  await p.click('button[value=up]'); await p.waitForSelector('#add');
  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/170557047'); await p.click('#add button'); await watch.onboard(p);
  await p.waitForURL(/\/[a-z0-9-]+\/\d+$/); await p.waitForSelector('#vitals'); await p.evaluate(() => window.SHEET.saved);
  const cid = await p.evaluate(() => window.SHEET.character.id);
  await p.goto(B + '/'); await p.waitForSelector('[data-claim]');
  ok('"My party can see" is locked until verified', await p.$eval('[data-vis] option[value=party]', o => o.disabled));
  await p.click('[data-claim]'); await p.waitForSelector('[data-check]');
  const code = await p.textContent('.claim code'); ok('Verify shows a one-time code', /^SHEET-[A-Z2-9]{6}$/.test(code));
  await p.click('[data-check]'); await p.waitForFunction(() => /isn’t on the sheet yet/.test(document.querySelector('#msg').textContent));
  ok('Check without the code on D&D Beyond: not verified, and says why', true);
  const su = (await (await fetch(B + '/api/collections/_superusers/auth-with-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: 'admin@example.test', password: 'TestPass-12345' }) })).json()).token;
  await fetch(B + '/api/collections/characters/records/' + cid, { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: su }, body: JSON.stringify({ verified: true }) });
  await p.reload(); await p.waitForSelector('.vbadge');
  ok('verified: ✓ badge, and party sharing can be chosen', !(await p.$eval('[data-vis] option[value=party]', o => o.disabled)));
  await p.screenshot({ path: '/tmp/sheet-tests/verify.png', fullPage: true });
  { const bad = errs; ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  await b.close();
})();
