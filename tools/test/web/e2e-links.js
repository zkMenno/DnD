// Sheet links: /<username>/<D&D Beyond id>. New accounts get player-xxxxx and a username card on top; the
// address of every sheet follows the username; /<D&D Beyond id> opens (or adds) your own copy;
// a private sheet's link shows nothing to anyone else.
const { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }), errs = [];
  const page = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 900 } })).newPage(); watch(p, errs); p.setDefaultTimeout(30000); return p; };
  const signUp = async (p, who) => { await p.goto(B + '/'); await p.fill('input[name=email]', who + '@example.test'); await p.click('.pwbox summary');
    await p.fill('input[name=password]', 'Passw0rd-' + who); await p.click('button[value=up]'); await p.waitForSelector('#add'); };
  const sheet = async p => { await p.waitForSelector('#vitals'); await p.evaluate(() => window.SHEET.saved); return new URL(p.url()).pathname; };
  const rename = async (p, name) => { await p.fill('#uname input[name=u]', name); await p.click('#uname button'); await p.waitForTimeout(800); };

  const p = await page(); await signUp(p, 'linker');
  ok('a new account gets a player-xxxxx name, and the username card comes first', /^@player-/.test(await p.textContent('#who span')) && await p.evaluate(() => document.querySelector('#main > *').id === 'uname'));
  await rename(p, 'admin'); ok('a reserved name is refused, in words', /taken/.test(await p.textContent('#msg')));
  await rename(p, 'Menno-Test'); ok('username saved (lowercased) and shown on top', (await p.textContent('#who span')) === '@menno-test');

  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/165157421'); await p.click('#add button');
  ok('adding a character opens /<username>/<D&D Beyond id>', (await sheet(p)) === '/menno-test/165157421');
  await p.goto(B + '/170557047'); ok('/<D&D Beyond id> adds and opens your own copy', (await sheet(p)) === '/menno-test/170557047' && (await p.title()) === 'Henry Gibbs');

  await p.goto(B + '/'); await p.waitForSelector('#mine .ch'); await rename(p, 'menno-two'); await p.waitForSelector('#mine .ch');
  ok('your characters follow a new username', await p.evaluate(() => [...document.querySelectorAll('#mine a.open')].map(a => a.getAttribute('href')).sort().join() === '/menno-two/165157421,/menno-two/170557047'));
  await p.goto(B + '/menno-two/165157421'); ok('the new address opens the sheet', (await sheet(p)) === '/menno-two/165157421');
  await p.goto(B + '/menno-test/165157421'); await p.waitForSelector('.boot');
  ok('the old address shows "not here"', /isn’t here/.test(await p.textContent('.boot')));

  const q = await page(); await signUp(q, 'stranger');
  await q.goto(B + '/menno-two/165157421'); await q.waitForSelector('.boot');
  ok('someone else gets nothing from a private sheet\'s link', /isn’t here/.test(await q.textContent('.boot')));
  { const bad = errs.filter(e => !/404|Failed to load resource/.test(e)); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  await b.close();
})();
