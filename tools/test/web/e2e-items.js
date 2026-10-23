// Web app: add an item (list fetched from items.json), it's saved to the account's tracker and shows on another device
const {chromium} = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const dev = async () => { const ctx = await b.newContext({viewport:{width:390,height:844}}); const p = await ctx.newPage(); p.errs = []; watch(p, p.errs); p.setDefaultTimeout(20000);
    await p.goto(B + '/#signin'); await p.fill('input[name=email]', 'menno@example.test'); await p.evaluate(() => { document.querySelector('.pwbox').open = true; }); await p.fill('input[name=password]', 'Passw0rd-menno'); await p.click('button[value=in]');
    await p.waitForSelector('.ch a.open'); await p.click('.ch a.open'); await p.waitForSelector('#vitals'); await p.waitForTimeout(1500); return p; };
  const p = await dev();
  await p.evaluate(() => document.querySelector('[data-tab="gear"]').click());
  await p.click('[data-act="additem"]'); await p.waitForSelector('#itq'); await p.fill('#itq', 'crowbar'); await p.click('.irow[data-n="Crowbar"]'); await p.click('[data-i="add"]');
  await p.waitForTimeout(1500);
  ok('item list loads from items.json and Crowbar is added', await p.evaluate(() => ADDED.some(a => a.inv.name === 'Crowbar')));
  const q = await dev();
  ok('another device shows the Crowbar', await q.evaluate(() => ADDED.some(a => a.inv.name === 'Crowbar') && DATA.inventory.some(i => i.name === 'Crowbar')));
  ok('the server copy of the character data stays as D&D Beyond has it', await q.evaluate(async () => { const c = await window.SHEET.pb.collection('characters').getOne(window.SHEET.character.id); return !c.data.inventory.some(i => i.added); }));
  { const bad = [p.errs, q.errs].flat(); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); } await b.close();
})();
