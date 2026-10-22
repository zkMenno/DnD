// A sheet shared with the party opens read-only for the others: live numbers, a banner, nothing changes.
const { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
const api = async (path, opt={}) => (await fetch(B+path, {...opt, headers:{'content-type':'application/json', ...(opt.headers||{})}})).json();
(async () => {
  const ok = (n, c, d) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : '  → '+JSON.stringify(d))); };
  const su = (await api('/api/collections/_superusers/auth-with-password', {method:'POST', body: JSON.stringify({identity:'admin@example.test', password:'TestPass-12345'})})).token;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const t = Date.now();
  const player = async (email, link) => {
    const ctx = await b.newContext({viewport:{width:390,height:844}, colorScheme:'dark'}); const p = await ctx.newPage(); p.setDefaultTimeout(30000);
    p.errs = []; watch(p, p.errs);
    await p.goto(B+'/'); await p.fill('input[name=email]', email); await p.click('.pwbox summary'); await p.fill('input[name=password]', 'Passw0rd-x1'); await p.click('button[value=up]'); await p.waitForSelector('#add');
    await p.fill('#add input[name=url]', link); await p.click('#add button'); await p.waitForURL(/\/[a-z0-9-]+\/\d+$/); await p.waitForSelector('#vitals'); await p.waitForTimeout(800);
    p.cid = await p.evaluate(() => window.SHEET.character.id); p.path = new URL(p.url()).pathname; return p;
  };
  const a = await player('viewer'+t+'@example.test', 'https://www.dndbeyond.com/characters/165157421');   // Wick
  const h = await player('owner'+t+'@example.test', 'https://www.dndbeyond.com/characters/170557047');    // Henry
  for (const p of [a, h]) await api('/api/collections/characters/records/'+p.cid, {method:'PATCH', headers:{Authorization: su}, body: JSON.stringify({verified:true})});
  const htok = await h.evaluate(() => window.SHEET.pb.authStore.token);
  await api('/api/collections/characters/records/'+h.cid, {method:'PATCH', headers:{Authorization: htok}, body: JSON.stringify({visibility:'party'})});
  await h.evaluate(() => { S.hp = 30; save(); }); await h.waitForTimeout(1500);   // the owner's tracker, saved to the server

  // the viewer finds Henry under "Shared with you" and opens it
  await a.goto(B+'/'); await a.waitForSelector('#shared .ch a.open');
  ok('Henry is listed under Shared with you', !!(await a.$('#shared a.open[href="'+h.path+'"]')));
  await a.click('#shared a.open[href="'+h.path+'"]'); await a.waitForSelector('#vitals'); await a.waitForTimeout(1500);
  ok('opens read-only with a banner', await a.evaluate(() => VIEW && !!document.querySelector('.viewbar') && document.body.classList.contains('viewonly')));
  ok('shows the owner\'s live HP (30)', await a.evaluate(() => S.hp) === 30, await a.evaluate(() => S.hp));
  // taps that would change it are refused
  const before = await a.evaluate(() => JSON.stringify(S));
  await a.evaluate(() => document.querySelector('#res').scrollIntoView());
  await a.evaluate(() => showTab('combat')); await a.waitForTimeout(300);
  const pip = await a.$('#res .pip'); if (pip) await pip.click();
  await a.waitForTimeout(300);
  ok('tapping a tracker changes nothing and says why', await a.evaluate(b => JSON.stringify(S) === b && !document.querySelector('#viewnote').hidden, before));
  ok('nothing of it is kept on the viewer\'s device', await a.evaluate(() => !Object.keys(localStorage).some(k => /-play-170557047$/.test(k))));
  // the owner changes HP: the viewer sees it without reloading
  await h.evaluate(() => { S.hp = 12; save(); }); await h.waitForTimeout(2500);
  ok('owner\'s change shows up live (12)', await a.evaluate(() => S.hp) === 12, await a.evaluate(() => S.hp));
  // the owner's tracker on the server is untouched by the viewer
  const rec = await api('/api/collections/play/records?filter='+encodeURIComponent('character="'+h.cid+'"'), {headers:{Authorization: htok}});
  ok('server copy still the owner\'s (12)', rec.items && rec.items[0] && rec.items[0].state.hp === 12);
  await a.screenshot({path:'/tmp/sheet-tests/shared-view.png'});
  { const bad = [a.errs, h.errs].flat(); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); } await b.close();
})();
