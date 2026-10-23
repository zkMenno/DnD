// Sheet links: /<username>/<D&D Beyond id>. New accounts get player-xxxxx and a username card on top; the
// address of every sheet follows the username; /<D&D Beyond id> opens (or adds) your own copy;
// a private sheet's link shows nothing to anyone else; a link pasted on the front page carries over to sign-up.
// Run: node tools/test/web/e2e-links.js [server URL], or as part of bash tools/test.sh web. Default server:
// http://127.0.0.1:8090 (tools/devserver.sh). Prints PASS/FAIL per check and exits non-zero on a failure.
// Uses fixed accounts and usernames (linker, menno-test, pender, stranger): run it on a fresh database.
const { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  // Prints PASS/FAIL for one check and marks the run failed if it didn't pass.
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const b = await chromium.launch({ executablePath: watch.CHROMIUM }), errs = [];
  // a new browser context with errors and CSP blocks collected in errs
  const page = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 900 } })).newPage(); watch(p, errs); p.setDefaultTimeout(30000); return p; };
  // signs up <who>@example.test with a password, ending on the home page
  const signUp = async (p, who) => { await p.goto(B + '/#signin'); await p.fill('input[name=email]', who + '@example.test'); await p.evaluate(() => { document.querySelector('.pwbox').open = true; });
    await p.fill('input[name=password]', 'Passw0rd-' + who); await p.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await p.click('#pwgo'); await p.waitForSelector('#add'); };
  // waits for a sheet to open and its first save, then gives its address (path)
  const sheet = async p => { await p.waitForSelector('#vitals'); await p.evaluate(() => window.SHEET.saved); return new URL(p.url()).pathname; };
  // changes the username on the home page (opening the Account tab if the form is hidden there)
  const rename = async (p, name) => { await p.evaluate(() => { const u = document.querySelector('#uname'), t = document.querySelector('[data-hometab=account]'); if (u && !u.offsetParent && t) t.click(); }); await p.fill('#uname input[name=u]', name); await p.click('#uname button'); await p.waitForTimeout(800); };

  // Onboarding: step 1 adds a character, step 2 picks a username (reserved names refused), then the sheet opens at
  // /<username>/<id>; /<id> adds and opens your own copy.
  const p = await page(); await signUp(p, 'linker');
  ok('a new account starts at step 1: add your character, with how to make it public', /Step 1 of 2/.test(await p.textContent('#add')) && /Character Privacy/.test(await p.textContent('#add')) && /Read-only/.test(await p.textContent('#add')));
  ok('…with a player-xxxxx name for now', /^@player-/.test(await p.textContent('#who span')));
  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/900000002'); await p.click('#add button'); await p.waitForSelector('#ustep');
  ok('step 2 asks for a username and previews the link', /\/900000002/.test(await p.textContent('#ustep .linkpreview')));
  await p.fill('#ustep input[name=u]', 'admin'); await p.click('#ustep button[value=go]'); await p.waitForTimeout(800);
  ok('a reserved name is refused, in words', /taken/.test(await p.textContent('#msg')));
  await p.fill('#ustep input[name=u]', 'Menno-Test'); await p.click('#ustep button[value=go]');
  ok('then the sheet opens at /<username>/<D&D Beyond id> (lowercased)', (await sheet(p)) === '/menno-test/900000002');
  await p.goto(B + '/900000001'); ok('/<D&D Beyond id> adds and opens your own copy', (await sheet(p)) === '/menno-test/900000001' && (await p.title()) === "Corwin Tidewell's Character Sheet - Dungeon Tracker");

  // A new username: the character links follow it, the old address says the sheet isn't here.
  await p.goto(B + '/'); await p.waitForSelector('#mine .ch'); await rename(p, 'menno-two'); await p.click('[data-hometab=chars]'); await p.waitForSelector('#mine .ch');
  ok('your characters follow a new username', await p.evaluate(() => [...document.querySelectorAll('#mine a.open')].map(a => a.getAttribute('href')).sort().join() === '/menno-two/900000001,/menno-two/900000002'));
  await p.goto(B + '/menno-two/900000002'); ok('the new address opens the sheet', (await sheet(p)) === '/menno-two/900000002');
  await p.goto(B + '/menno-test/900000002'); await p.waitForFunction(() => /isn’t here/.test((document.querySelector('.boot') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  ok('the old address shows "not here"', /isn’t here/.test(await p.textContent('.boot')));

  // front page → paste a link → sign up → the character is added straight away
  const r = await page(); await r.goto(B + '/'); await r.fill('#ql-url', 'https://www.dndbeyond.com/characters/900000001/abc'); await r.click('#quicklink button');
  await r.waitForSelector('#login'); ok('a pasted link carries over to sign-in', /add your character straight away/.test(await r.textContent('#login')));
  await r.evaluate(() => { document.querySelector('.pwbox').open = true; }); await r.fill('input[name=email]', 'pender@example.test'); await r.fill('input[name=password]', 'Passw0rd-pender'); await r.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await r.click('#pwgo');
  await r.waitForSelector('#ustep'); await r.click('#ustep button[value=go]');
  ok('…and the character is there after signing up', /^\/player-[a-z0-9]{5}\/900000001$/.test(await sheet(r)));
  // someone else opening a private sheet's link gets "isn't here"
  const q = await page(); await signUp(q, 'stranger');
  await q.goto(B + '/menno-two/900000002'); await q.waitForSelector('.boot');
  ok('someone else gets nothing from a private sheet\'s link', /isn’t here/.test(await q.textContent('.boot')));
  { const bad = errs.filter(e => !/404|Failed to load resource/.test(e)); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  await b.close();
})();
