// Party log end to end: two players in The Bluff, both verified (superuser stands in for the D&D Beyond code check).
const {chromium} = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
const api = async (path, opt={}) => { const r = await fetch(B+path, {...opt, headers:{'content-type':'application/json', ...(opt.headers||{})}}); return r.json(); };
(async () => {
  const su = (await api('/api/collections/_superusers/auth-with-password', {method:'POST', body: JSON.stringify({identity:'admin@example.test', password:'TestPass-12345'})})).token;
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const player = async (email, link) => {
    const ctx = await b.newContext({viewport:{width:390,height:844}, colorScheme:'dark'}); const p = await ctx.newPage(); p.setDefaultTimeout(30000);
    const errs = []; watch(p, errs); p.errs = errs;
    await p.goto(B+'/'); await p.fill('input[name=email]', email); await p.click('.pwbox summary'); await p.fill('input[name=password]', 'Passw0rd-x1'); await p.click('button[value=up]'); await p.waitForSelector('#add');
    await p.fill('#add input[name=url]', link); await p.click('#add button'); await p.waitForURL(/\/[a-z0-9-]+\/\d+$/); await p.waitForSelector('#vitals');
    await p.evaluate(() => window.SHEET.saved);   // the first save must land before the admin verifies (no lost update)
    p.cid = await p.evaluate(() => window.SHEET.character.id); return p;
  };
  const a = await player('ann@example.test', 'https://www.dndbeyond.com/characters/165157421');   // Wick
  const h = await player('hal@example.test', 'https://www.dndbeyond.com/characters/170557047');   // Henry
  for (const p of [a, h]) await api('/api/collections/characters/records/'+p.cid, {method:'PATCH', headers:{Authorization: su}, body: JSON.stringify({verified:true})});
  for (const p of [a, h]) { await p.reload(); await p.waitForSelector('#vitals'); await p.waitForTimeout(800); await p.evaluate(() => showTab('notes')); await p.waitForTimeout(400); }
  ok('verified players get the Party log sub-tab', await a.$('[data-act="notescope"][data-k="party"]') && await h.$('[data-act="notescope"][data-k="party"]'));
  await a.click('[data-act="notescope"][data-k="party"]'); await a.waitForTimeout(800);
  await a.fill('#note-text', 'Party: the harbourmaster owes us 20 gp'); await a.click('[data-act="addnote"]'); await a.waitForTimeout(1500);
  await a.click('[data-act="notescope"][data-k="own"]'); await a.waitForTimeout(800);
  await a.fill('#note-text', 'Private: I don\'t trust Henry'); await a.click('[data-act="addnote"]'); await a.waitForTimeout(1500);
  await h.click('[data-act="notescope"][data-k="party"]'); await h.waitForTimeout(2000);
  const hp = await h.textContent('#notelist');
  ok('Henry\'s player sees the party note, signed by Wick', /harbourmaster owes us/.test(hp) && /Wick Softtoppoms/.test(hp));
  ok('…but not Wick\'s private note', !/trust Henry/.test(hp));
  ok('…and can\'t edit or delete Wick\'s party note', !(await h.$('#notelist [data-act="noteedit"]')));
  await h.fill('#note-text', 'Henry: bought rope'); await h.click('[data-act="addnote"]'); await h.waitForTimeout(2500);
  await a.click('[data-act="notescope"][data-k="party"]'); await a.waitForTimeout(1500);
  ok('Wick\'s player sees Henry\'s reply live', /bought rope/.test(await a.textContent('#notelist')));
  await a.screenshot({path:'/tmp/partylog.png'});
  { const bad = [a.errs, h.errs].flat(); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); } await b.close();
})();
