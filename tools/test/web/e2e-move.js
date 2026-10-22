// Moving a claude.ai sheet to the web app (§22): the claude.ai copy of Wick gives a code with its tracker and notes,
// the player's own web-app copy of Wick takes it; a code for another character or a broken code is refused.
const { chromium } = require('playwright'), path = require('path'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090', DIST = path.join(__dirname, '..', '..', '..', 'dist', 'claude');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const errs = [];
  // open ☰ → Sync and press one of its buttons
  const menuBtn = async (p, act) => { await p.evaluate(() => { menuOpen = true; menuView = 'sync'; paintMenu(); }); await p.click('#' + act + 'btn'); await p.waitForSelector('.mbox'); };

  // 1. claude.ai sheet (file, no db: tracker and notes on this device)
  const c = await (await b.newContext({ viewport: { width: 390, height: 900 } })).newPage(); watch(c, errs); c.setDefaultTimeout(15000);
  await c.goto('file://' + path.join(DIST, 'wick.html')); await c.waitForSelector('#vitals'); await c.waitForTimeout(800);
  await c.evaluate(() => { S.hp = Math.max(1, S.hp - 4); S.coins.gp += 7; save(); notesStore.add({ text: 'Moved with Wick: the lighthouse key', kind: 'story', done: false, at: 1700000000000, session: 3 }); });
  await c.waitForTimeout(300);
  const want = await c.evaluate(() => ({ hp: S.hp, gp: S.coins.gp }));
  await menuBtn(c, 'moveout');
  const code = await c.inputValue('.mbox .movecode');
  ok('claude.ai sheet shows a moving code', code.startsWith('SHEETMOVE1 ') && /lighthouse key/.test(code));
  await c.click('.mbtns [data-m="0"]');
  // Henry's code, to try on the wrong sheet
  const h = await (await b.newContext()).newPage(); await h.goto('file://' + path.join(DIST, 'henry.html')); await h.waitForSelector('#vitals');
  const henryCode = await h.evaluate(() => moveCode());

  // 2. web app: a new player adds Wick, then brings the tracker over
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); watch(p, errs); p.setDefaultTimeout(30000);
  await p.goto(B + '/#signin'); await p.fill('input[name=email]', 'mover@example.test'); await p.click('.pwbox summary'); await p.fill('input[name=password]', 'Passw0rd-mover');
  await p.click('button[value=up]'); await p.waitForSelector('#add');
  await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/165157421'); await p.click('#add button'); await watch.onboard(p);
  await p.waitForURL(/\/[a-z0-9-]+\/\d+$/); await p.waitForSelector('#vitals'); await p.waitForTimeout(2500);
  const paste = async text => { p.evaluate(() => { moveIn(); }); await p.waitForSelector('.mbox');   // the web app's menu no longer offers it (Menno, 23 Oct); the code path stays
    await p.fill('#movepaste', text); await p.click('.mbtns [data-m="1"]'); await p.waitForTimeout(400); };
  await paste('hello'); ok('a broken code is refused, in words', /isn’t a moving code/.test(await p.textContent('#syncmsg')));
  await paste(henryCode); ok('a code for another character is refused', /This code is for Henry/.test(await p.textContent('#syncmsg')));
  await paste(code); await p.waitForSelector('.mbtns'); await p.click('.mbtns [data-m="1"]'); await p.waitForTimeout(2500);
  ok('tracker brought over (HP, coins)', await p.evaluate(w => S.hp === w.hp && S.coins.gp === w.gp, want));
  ok('notes brought over', await p.evaluate(() => NOTES.some(n => /lighthouse key/.test(n.text))));
  await p.reload(); await p.waitForSelector('#vitals'); await p.waitForTimeout(2500);
  ok('kept on the server after a reload', await p.evaluate(w => S.hp === w.hp && NOTES.some(n => /lighthouse key/.test(n.text)), want));
  await paste(code); await p.waitForSelector('.mbtns'); await p.click('.mbtns [data-m="1"]'); await p.waitForTimeout(2000);
  ok('bringing it over twice doesn’t double the notes', await p.evaluate(() => NOTES.filter(n => /lighthouse key/.test(n.text)).length === 1));
  { const bad = errs; ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  await b.close();
})();
