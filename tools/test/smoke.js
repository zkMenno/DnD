// Every sheet, phone and desktop: all tabs open without errors, a sync keeps the item list, and the key numbers
// match expect.json (AC, HP, speed, saves, attacks, trackers, slots). After an intended change:
//   UPDATE=1 node tools/test/smoke.js   rewrites expect.json; review the diff before committing it.
const fs = require('fs'), path = require('path');
const { check, withBrowser, openSheet, SHEETS } = require('./lib');
const EXPECT = path.join(__dirname, 'expect.json');
const expect = fs.existsSync(EXPECT) ? JSON.parse(fs.readFileSync(EXPECT, 'utf8')) : {};
const got = {};

withBrowser(async browser => {
  for (const sheet of Object.keys(SHEETS)) for (const width of [390, 1400]) {
    const p = await openSheet(browser, sheet, width);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-tab]')].map(t => t.dataset.tab));
    for (const t of tabs) { await p.evaluate(t => document.querySelector('[data-tab="'+t+'"]').click(), t); await p.waitForTimeout(150); }
    check(sheet+' @'+width+': '+tabs.length+' tabs open without errors', !p.errs.length, p.errs);
    if (width === 390) {
      check(sheet+': a sync keeps the item list', await p.evaluate(() => buildDoc(DATA).includes('id="items-data"')));
      check(sheet+': data is current (no "sync for new details")', await p.evaluate(() => !DATA_OLD));
      got[sheet] = await p.evaluate(() => ({
        ac: D.ac, hp: [D.hpCur, D.hpMax], speedM: D.speedM, init: D.initiative, pb: D.pb, attacks: D.attacksPerAction,
        saves: D.saves.map(s => s.a+(s.bonus >= 0 ? '+' : '')+s.bonus+(s.prof ? '*' : '')).join(' '),
        weapons: D.weapons.map(w => w.name+' '+(w.hit >= 0 ? '+' : '')+w.hit+' '+w.dice+(w.dmgMod >= 0 ? '+' : '')+w.dmgMod+(w.mastery ? ' '+w.mastery : '')),
        res: RES.map(r => r.key+' '+r.used+'/'+r.max+(r.pool ? ' pool' : '')+(r.toggle ? ' toggle' : '')),
        spells: (DATA.spells||[]).length, combos: combos().map(c => c.id) }));
    }
    await p.close2();
  }
  if (process.env.UPDATE) { fs.writeFileSync(EXPECT, JSON.stringify(got, null, 1)+'\n'); console.log('expect.json updated'); return; }
  for (const [sheet, g] of Object.entries(got)) for (const [k, v] of Object.entries(g))
    check(sheet+' '+k, JSON.stringify(v) === JSON.stringify((expect[sheet]||{})[k]), { expected: (expect[sheet]||{})[k], got: v });
});
