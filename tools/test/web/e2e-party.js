// Party log end to end: two players in Saltreach Crossing, both verified (superuser stands in for the D&D Beyond code check).
// A party note is seen, signed, by the other player, a private note isn't, others' party notes can't be edited,
// and replies show up live.
// Run: node tools/test/web/e2e-party.js [server URL], or as part of bash tools/test.sh web. Default server:
// http://127.0.0.1:8090 (tools/devserver.sh). Prints PASS/FAIL per check and exits non-zero on a failure.
// Uses fixed accounts (ann, hal): run it on a fresh database.
const {chromium} = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
// A JSON request to the server; returns the parsed answer.
const api = async (path, opt={}) => { const r = await fetch(B+path, {...opt, headers:{'content-type':'application/json', ...(opt.headers||{})}}); return r.json(); };
(async () => {
  const su = (await api('/api/collections/_superusers/auth-with-password', {method:'POST', body: JSON.stringify({identity:'admin@example.test', password:'TestPass-12345'})})).token;
  const b = await chromium.launch({executablePath: watch.CHROMIUM});
  // Prints PASS/FAIL for one check and marks the run failed if it didn't pass.
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  // A player in their own browser context: signs up, adds the character at link and waits for its first save.
  // p.cid is the character record id, p.errs the page errors and CSP blocks.
  const player = async (email, link) => {
    const ctx = await b.newContext({viewport:{width:390,height:844}, colorScheme:'dark'}); const p = await ctx.newPage(); p.setDefaultTimeout(30000);
    const errs = []; watch(p, errs); p.errs = errs;
    await p.goto(B+'/#signin'); await p.fill('input[name=email]', email); await p.evaluate(() => { document.querySelector('.pwbox').open = true; }); await p.fill('input[name=password]', 'Passw0rd-x1'); await p.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await p.click('#pwgo'); await p.waitForSelector('#add');
    await p.fill('#add input[name=url]', link); await p.click('#add button'); await watch.onboard(p); await p.waitForURL(/\/[a-z0-9-]+\/\d+$/); await p.waitForSelector('#vitals');
    await p.evaluate(() => window.SHEET.saved);   // the first save must land before the admin verifies (no lost update)
    p.cid = await p.evaluate(() => window.SHEET.character.id); return p;
  };
  const a = await player('ann@example.test', 'https://www.dndbeyond.com/characters/900000002');   // Pip
  const h = await player('hal@example.test', 'https://www.dndbeyond.com/characters/900000001');   // Corwin
  // the superuser marks both verified; both reload and open Notes
  for (const p of [a, h]) await api('/api/collections/characters/records/'+p.cid, {method:'PATCH', headers:{Authorization: su}, body: JSON.stringify({verified:true})});
  for (const p of [a, h]) { await p.reload(); await p.waitForSelector('#vitals'); await p.waitForTimeout(800); await p.evaluate(() => showTab('notes')); await p.waitForTimeout(400); }
  ok('verified players get the Party log sub-tab', await a.$('[data-act="notescope"][data-k="party"]') && await h.$('[data-act="notescope"][data-k="party"]'));
  await a.click('[data-act="notescope"][data-k="party"]'); await a.waitForTimeout(800);
  await a.fill('#note-text', 'Party: the harbourmaster owes us 20 gp'); await a.click('[data-act="addnote"]'); await a.waitForTimeout(1500);
  await a.click('[data-act="notescope"][data-k="own"]'); await a.waitForTimeout(800);
  await a.fill('#note-text', 'Private: I don\'t trust Corwin'); await a.click('[data-act="addnote"]'); await a.waitForTimeout(1500);
  await h.click('[data-act="notescope"][data-k="party"]'); await h.waitForTimeout(2000);
  const hp = await h.textContent('#notelist');
  ok('Corwin\'s player sees the party note, signed by Pip', /harbourmaster owes us/.test(hp) && /Pip Mossbottom/.test(hp));
  ok('…but not Pip\'s private note', !/trust Corwin/.test(hp));
  ok('…and can\'t edit or delete Pip\'s party note', !(await h.$('#notelist [data-act="noteedit"]')));
  await h.fill('#note-text', 'Corwin: bought rope'); await h.click('[data-act="addnote"]'); await h.waitForTimeout(2500);
  await a.click('[data-act="notescope"][data-k="party"]'); await a.waitForTimeout(1500);
  ok('Pip\'s player sees Corwin\'s reply live', /bought rope/.test(await a.textContent('#notelist')));
  await a.screenshot({path: watch.shot('partylog.png')});
  { const bad = [a.errs, h.errs].flat(); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); } await b.close();
})();
