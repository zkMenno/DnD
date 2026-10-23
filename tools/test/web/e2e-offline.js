// Offline at the table: a sheet opened once opens again with no connection (service worker + saved copy), tracker
// changes and notes are kept, and they reach the server when the connection is back.
// Run: node tools/test/web/e2e-offline.js [server URL], or as part of bash tools/test.sh web. Default server:
// http://127.0.0.1:8090 (tools/devserver.sh). Prints PASS/FAIL per check and exits non-zero on a failure.
// Uses a fresh email each run. Network errors while offline are expected and not counted as page errors.
const { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  // Prints PASS/FAIL for one check (with the detail on a failure) and marks the run failed if it didn't pass.
  const ok = (n, c, d) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : '  → '+JSON.stringify(d))); };
  const b = await chromium.launch({ executablePath: watch.CHROMIUM });
  const ctx = await b.newContext({ viewport:{width:390, height:844} }); const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  p.errs = []; watch(p, p.errs);
  // Online first: sign up, add Wick, open the home list and the sheet so the service worker saves both.
  await p.goto(B+'/#signin'); await p.fill('input[name=email]', 'off'+Date.now()+'@example.test'); await p.evaluate(() => { document.querySelector('.pwbox').open = true; }); await p.fill('input[name=password]', 'Passw0rd-x1'); await p.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await p.click('#pwgo'); await p.waitForSelector('#add');
  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/165157421'); await p.click('#add button'); await watch.onboard(p); await p.waitForURL(/\/[a-z0-9-]+\/\d+$/); await p.waitForSelector('#vitals');
  const url = p.url(), cid = await p.evaluate(() => window.SHEET.character.id), path = new URL(url).pathname;
  await p.goto(B+'/'); await p.waitForSelector('#mine .ch a.open');   // the home list, seen once online
  await p.goto(url); await p.waitForSelector('#vitals');   // opened twice online: the saved copy has the synced data
  await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
  ok('offline support is installed', await p.evaluate(() => !!navigator.serviceWorker.controller));

  // Offline: the sheet and the home list still open; an HP change is kept on the device.
  await ctx.setOffline(true);
  await p.reload(); await p.waitForSelector('#vitals', { timeout: 15000 }).catch(() => {});
  ok('the sheet opens with no connection', await p.evaluate(() => typeof D === 'object' && !!document.querySelector('#vitals')));
  ok('…and says it is offline', await p.evaluate(() => { const o = document.querySelector('.offline'); return !!o && !o.hidden; }));
  await p.goto(B+'/'); await p.waitForSelector('#mine .ch a.open', { timeout: 10000 }).catch(() => {});
  ok('the home page still lists the sheet offline (and keeps you signed in)', await p.evaluate(c => !!document.querySelector('#mine a.open[href="'+c+'"]'), path));
  await p.goto(url); await p.waitForSelector('#vitals', { timeout: 15000 }).catch(() => {});
  await p.evaluate(() => { S.hp = 7; save(); }); await p.waitForTimeout(500);
  ok('a change made offline is kept on the device', await p.evaluate(() => JSON.parse(localStorage.getItem(SKEY)).hp === 7));

  // A note written offline stays in the list; back online, the note and the tracker reach the server.
  await p.evaluate(() => showTab('notes')); await p.waitForTimeout(300);
  await p.fill('#note-text', 'Offline note: the ferryman lied'); await p.click('[data-act="addnote"]'); await p.waitForTimeout(800);
  ok('a note written offline stays in the list', /ferryman lied/.test(await p.textContent('#notelist')));
  await ctx.setOffline(false); await p.waitForTimeout(2500);
  const notes = await (await fetch(B+'/api/collections/notes/records?filter='+encodeURIComponent('character="'+cid+'"'), { headers:{ Authorization: await p.evaluate(() => window.SHEET.pb.authStore.token) } })).json();
  ok('…and reaches the server when back online', (notes.items||[]).some(n => /ferryman lied/.test(n.text)));
  const tok = await p.evaluate(() => window.SHEET.pb.authStore.token);
  const res = await (await fetch(B+'/api/collections/play/records?filter='+encodeURIComponent('character="'+cid+'"'), { headers:{ Authorization: tok } })).json();
  ok('back online, it reaches the server', res.items && res.items[0] && res.items[0].state.hp === 7, res.items && res.items[0] && res.items[0].state.hp);
  ok('the offline note goes away', await p.evaluate(() => document.querySelector('.offline').hidden));
  { const bad = [p.errs.filter(e => !/Failed to fetch|NetworkError|ClientResponseError|net::/.test(e))].flat(); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  await b.close();
})();
