// Two devices, one tracker: the same player has Pip open on two phones and each changes something different. Both
// changes must survive, on both phones and on the server, instead of the later save wiping the other (the tracker
// is merged field by field: src/engine/03-play-state.js mergeState, 17-dialog-and-notes.js takeRemote).
// Checks: two different trackers changed at the same moment (both saves race), two entries in one counter map
// (S.spent), and a change made offline on one phone while the other keeps playing.
// Run: node tools/test/web/e2e-merge.js [server URL], or as part of bash tools/test.sh web. Default server:
// http://127.0.0.1:8090 (tools/devserver.sh). Prints PASS/FAIL per check and exits non-zero on a failure.
// Uses a fresh email each run. Network errors while offline are expected and not counted as page errors.
const { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  // Prints PASS/FAIL for one check (with the detail on a failure) and marks the run failed if it didn't pass.
  const ok = (n, c, d) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : '  → '+JSON.stringify(d))); };
  const b = await chromium.launch({ executablePath: watch.CHROMIUM });
  // Phone A: sign up, add Pip, open the sheet.
  const ctxA = await b.newContext({ viewport:{width:390, height:844} }); const a = await ctxA.newPage(); a.setDefaultTimeout(30000);
  a.errs = []; watch(a, a.errs);
  await a.goto(B+'/#signin'); await a.fill('input[name=email]', 'merge'+Date.now()+'@example.test'); await a.evaluate(() => { document.querySelector('.pwbox').open = true; }); await a.fill('input[name=password]', 'Passw0rd-x1'); await a.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await a.click('#pwgo'); await a.waitForSelector('#add');
  await a.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/900000002'); await a.click('#add button'); await watch.onboard(a); await a.waitForURL(/\/[a-z0-9-]+\/\d+$/); await a.waitForSelector('#vitals');
  await a.evaluate(() => window.SHEET.saved); await a.waitForTimeout(1500);   // the first tracker is stored
  const url = a.url(), cid = await a.evaluate(() => window.SHEET.character.id);
  // Phone B: the same account (only the saved login is copied: B has no tracker of its own yet), same sheet.
  const auth = await a.evaluate(() => localStorage.getItem('pocketbase_auth'));
  const ctxB = await b.newContext({ viewport:{width:390, height:844} }); const p = await ctxB.newPage(); p.setDefaultTimeout(30000);
  p.errs = []; watch(p, p.errs);
  await p.goto(B+'/'); await p.evaluate(v => localStorage.setItem('pocketbase_auth', v), auth);
  await p.goto(url); await p.waitForSelector('#vitals'); await p.waitForTimeout(1500);   // B has the stored tracker and its live updates
  // two trackers: a resource with room to spend twice (k1) and temporary HP (k2); two items for the spent map
  const pick = await a.evaluate(() => ({ res: RES.filter(r => r.max > 1 && typeof S[r.key] === 'number').map(r => r.key), hp: S.hp, items: [ARROW_N, 'Potion of Healing'] }));
  ok('Pip has a tracker to change', pick.res.length >= 1, pick.res);
  const [k1] = pick.res, k2 = 'temp', [i1, i2] = pick.items;
  const tok = await a.evaluate(() => window.SHEET.pb.authStore.token);
  // the tracker as the server has it now
  const stored = async () => { const r = await (await fetch(B+'/api/collections/play/records?filter='+encodeURIComponent('character="'+cid+'"'), { headers:{ Authorization: tok } })).json(); return r.items && r.items[0] && r.items[0].state; };
  const state = pg => pg.evaluate(() => JSON.parse(JSON.stringify(S)));

  // 1. At the same moment (neither phone has heard of the other's change): A spends one of k1, B one of k2.
  const s0 = await state(a);
  await Promise.all([a.evaluate(k => { S[k]++; save(); }, k1), p.evaluate(k => { S[k]++; save(); }, k2)]);
  await a.waitForTimeout(3000);
  const sa = await state(a), sb = await state(p), sv = await stored();
  ok('both trackers changed at once survive on the server', sv && sv[k1] === s0[k1]+1 && sv[k2] === s0[k2]+1, sv && [sv[k1], sv[k2]]);
  ok('…on phone A', sa[k1] === s0[k1]+1 && sa[k2] === s0[k2]+1, [sa[k1], sa[k2]]);
  ok('…and on phone B', sb[k1] === s0[k1]+1 && sb[k2] === s0[k2]+1, [sb[k1], sb[k2]]);

  // 2. One counter map, two entries: A uses an item while B uses another (S.spent merges per entry).
  await Promise.all([a.evaluate(n => { S.spent = Object.assign({}, S.spent, {[n]: (S.spent[n]||0) + 1}); save(); }, i1),
    p.evaluate(n => { S.spent = Object.assign({}, S.spent, {[n]: (S.spent[n]||0) + 1}); save(); }, i2)]);
  await a.waitForTimeout(3000);
  { const x = await state(a), y = await state(p), v = await stored();
    ok('two items used on two phones are both counted (server)', v && v.spent[i1] === 1 && v.spent[i2] === 1, v && v.spent);
    ok('…and on both phones', x.spent[i1] === 1 && x.spent[i2] === 1 && y.spent[i1] === 1 && y.spent[i2] === 1, [x.spent, y.spent]); }

  // 3. B goes offline and takes damage; meanwhile A spends another k1. Back online, B's save keeps A's spend.
  await ctxB.setOffline(true);
  await p.evaluate(() => { S.hp = Math.max(1, S.hp - 3); save(); }); await p.waitForTimeout(1200);
  await a.evaluate(k => { S[k]++; save(); }, k1); await a.waitForTimeout(2000);
  await ctxB.setOffline(false); await p.waitForTimeout(3500);
  { const v = await stored(), x = await state(a), y = await state(p);
    ok('an offline change on B and an online one on A both reach the server', v && v.hp === pick.hp - 3 && v[k1] === s0[k1]+2, v && [v.hp, v[k1]]);
    ok('…and both phones show both', x.hp === pick.hp - 3 && y.hp === pick.hp - 3 && x[k1] === s0[k1]+2 && y[k1] === s0[k1]+2, [x.hp, y.hp, x[k1], y[k1]]); }

  // 4. Reloaded, each phone still shows everything (nothing was only in memory).
  await a.reload(); await p.reload(); await a.waitForSelector('#vitals'); await p.waitForSelector('#vitals'); await a.waitForTimeout(1500);
  { const x = await state(a), y = await state(p), want = s => s.hp === pick.hp - 3 && s[k1] === s0[k1]+2 && s[k2] === s0[k2]+1 && s.spent[i1] === 1 && s.spent[i2] === 1;
    ok('after a reload both phones have every change', want(x) && want(y), [x, y].map(s => [s.hp, s[k1], s[k2], s.spent])); }
  { const bad = [a.errs, p.errs].flat().filter(e => !/Failed to fetch|NetworkError|ClientResponseError|net::/.test(e)); ok('no page errors or CSP blocks' + (bad.length ? ': ' + JSON.stringify(bad) : ''), !bad.length); }
  await b.close();
})();
