// Privacy & terms and "Your data": the legal page and its links, nothing loaded from any other site but the D&D
// Beyond portraits (GDPR claim on the page), download my data, delete my account (and everything in it).
// Run: node tools/test/web/e2e-legal.js [server URL], or as part of bash tools/test.sh web. Default server:
// http://127.0.0.1:8090 (tools/devserver.sh). Prints PASS/FAIL per check and exits non-zero on a failure.
// Uses a fixed account (leaver@example.test) and deletes it at the end, so it can run again.
const { chromium } = require('playwright'), fs = require('fs'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  // Prints PASS/FAIL for one check and marks the run failed if it didn't pass.
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const b = await chromium.launch({ executablePath: watch.CHROMIUM }), errs = [], outside = new Set();
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); watch(p, errs); p.setDefaultTimeout(30000);
  // every request to another site is noted (the page promises none, except the D&D Beyond portrait pictures:
  // images from www.dndbeyond.com/avatars/, named on the page)
  p.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.origin !== B
    && !(r.resourceType() === 'image' && u.origin === 'https://www.dndbeyond.com' && u.pathname.startsWith('/avatars/'))) outside.add(u.host); });

  // The legal page: sections, hosting and SRD licence named, no unfilled {{placeholders}}.
  await p.goto(B + '/legal.html');
  ok('the legal page has its sections, folding open', (await p.$$eval('.legal details', d => d.length)) >= 6 && /Hetzner/.test(await p.textContent('.legal')));
  ok('it names the EU hosting and the SRD 5.2 licence', /Falkenstein, Germany/.test(await p.textContent('.legal')) && /Creative\s+Commons Attribution 4\.0/.test(await p.textContent('.legal')));
  ok('every {{placeholder}} is filled in', !/\{\{/.test(await p.content()));

  // Sign up, add Pip, write a note; the sheet menu links home, and nothing was loaded from another site.
  await p.goto(B + '/'); ok('the home page links to it', !!(await p.$('footer a[href="/legal.html"]')));
  await p.click('.hero .btn.cta'); await p.fill('input[name=email]', 'leaver@example.test'); await p.evaluate(() => { document.querySelector('.pwbox').open = true; }); await p.fill('input[name=password]', 'Passw0rd-leaver');
  await p.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await p.click('#pwgo'); await p.waitForSelector('#add');
  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/900000002'); await p.click('#add button'); await watch.onboard(p);
  await p.waitForSelector('#vitals'); await p.evaluate(() => window.SHEET.saved);
  await p.evaluate(() => notesStore.add({ text: 'A note to take home', kind: 'story', done: false, at: Date.now(), session: 1 })); await p.waitForTimeout(1200);
  await p.evaluate(() => { menuOpen = true; paintMenu(); });
  ok('the sheet\'s ☰ menu has a Back to all characters row (Privacy & terms is only in the home footer)', !!(await p.$('#menubox a.homelink[href="/"]')) && !(await p.$('#menubox a[href="/legal.html"]')));
  ok('nothing loads from another site but the D&D Beyond portrait (fonts, scripts: all from this server)', outside.size === 0 || console.log('   outside:', [...outside]));
  ok('the privacy page names the D&D Beyond portraits', await (await fetch(B + '/legal.html')).text().then(t => /Character portraits:/.test(t)));

  // Download my data: one JSON with the account, characters, trackers and notes.
  await p.goto(B + '/'); await p.click('[data-hometab=data]'); await p.waitForSelector('#export');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#export')]);
  const data = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok('download my data: account, character, tracker and notes as JSON', data.account.email === 'leaver@example.test' && data.characters.length === 1
    && data.notes.some(n => /take home/.test(n.text)) && Array.isArray(data.trackers));

  // Delete my account: refused until the username is typed out, then everything of the account is gone.
  const uid = await p.evaluate(() => pb.authStore.record.id);
  await p.click('#delacct'); await p.fill('#delname', 'not-me'); await p.click('#delgo'); await p.waitForTimeout(500);
  ok('delete asks for the username typed out', /not your username/.test(await p.textContent('#msg')) && !!(await p.$('#add')));
  await p.fill('#delname', '"' + await p.evaluate(() => pb.authStore.record.username) + '"'); await p.click('#delgo'); await p.waitForSelector('#delyes'); await p.click('#delyes'); await p.waitForSelector('#landing:not([hidden])');
  const su = (await (await fetch(B + '/api/collections/_superusers/auth-with-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: 'admin@example.test', password: 'TestPass-12345' }) })).json()).token;
  // how many records of a collection match a filter (as the superuser)
  const count = async (col, f) => (await (await fetch(B + '/api/collections/' + col + '/records?filter=' + encodeURIComponent(f), { headers: { Authorization: su } })).json()).totalItems;
  ok('delete my account: account, characters, trackers and notes are gone', (await count('users', 'id="' + uid + '"')) === 0 && (await count('characters', 'owner="' + uid + '"')) === 0
    && (await count('notes', 'author="' + uid + '"')) === 0 && (await count('play', 'character.owner="' + uid + '"')) === 0);
  { const bad = errs; ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  await b.close();
})();
