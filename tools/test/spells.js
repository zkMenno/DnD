// Spells tab: pick what you're concentrating on without casting, CON save button, no concentration while raging,
// spell tag icons explain themselves (tap on phones, hover on desktop), only useful spell filters, combo favourites.
// Run: node tools/test/spells.js (after node tools/build.js), or as part of bash tools/test.sh sheets. Uses the built
// claude.ai sheets in dist/claude through lib.js; prints PASS/FAIL per check and exits non-zero on a failure.
// All on AppTester-02, at phone and desktop width.
const { check, withBrowser, openSheet, shot } = require('./lib');
withBrowser(async browser => {
  for (const width of [390, 1400]) {
    const p = await openSheet(browser, 'tester2', width), at = '@'+width+' ';
    await p.evaluate(() => document.querySelector('[data-tab="spells"]').click()); await p.waitForTimeout(300);
    // Concentration: folded away when not concentrating; pick, change and end without spending a slot; a CON save
    // button while concentrating; no picking while raging.
    await shot(p, 'conc-off-'+width);
    check(at+'not concentrating: list folded away', await p.evaluate(() => !document.querySelector('.concopt')));
    await p.click('[data-act="concopen"]'); await p.waitForTimeout(200);
    await p.click('.concopt[data-k="Bless"]'); await p.waitForTimeout(300);
    check(at+'pick Bless as concentration (no slot spent)', await p.evaluate(() => S.conc === 'Bless' && S.sl1 === 2 && !!document.querySelector('.spell.concon')));
    check(at+'CON save button while concentrating', await p.evaluate(() => !!document.querySelector('.concbox [data-save="con"]')));
    await p.click('[data-act="concopen"]'); await p.waitForTimeout(200);
    await p.click('.concopt[data-k="Entangle"]'); await p.waitForTimeout(300);
    await shot(p, 'conc-on-'+width);
    check(at+'Change → Entangle', await p.evaluate(() => S.conc === 'Entangle'));
    await p.click('.concbox [data-act="concend"]'); await p.waitForTimeout(300);
    check(at+'End ends it', await p.evaluate(() => S.conc === null));
    await p.evaluate(() => { S.active = {rage: true}; save(); paintSpells(); });
    check(at+'no picking while raging', await p.evaluate(() => !document.querySelector('[data-act="concopen"]') && /no concentration/.test(document.querySelector('.concbox').innerText)));
    await p.evaluate(() => { S.active = {}; save(); paintSpells(); });
    // Spell tag icons: hover opens and closes the tooltip on desktop, a tap opens it on a phone.
    if (width === 1400) {
      await p.hover('.spell .chip.ic[data-term="Concentration"]'); await p.waitForTimeout(600);
      check(at+'hovering 🧠 opens its tooltip', await p.evaluate(() => /Concentration/.test((document.querySelector('#bubble')||{}).innerText||'')));
      await p.mouse.move(5, 5); await p.waitForTimeout(400);
      check(at+'…and moving away closes it', await p.evaluate(() => !document.querySelector('#bubble')));
    } else {
      await p.click('.spell .chip.ic[data-term="Bonus action"]'); await p.waitForTimeout(400);
      check(at+'tapping ⚡ opens its tooltip', await p.evaluate(() => /Bonus action/.test((document.querySelector('#bubble')||{}).innerText||'')));
    }
    // Spell filters: only the ones at least one prepared spell matches.
    check(at+'only filters the spells can match (no 🎯 Attack on AppTester-02)', await p.evaluate(() => { const ks = [...document.querySelectorAll('[data-act="spf"]')].map(c => c.dataset.f);
      return !ks.includes('atk') && !ks.includes('react') && ks.includes('save') && ks.every(k => k === 'all' || DATA.spells.some(x => x.prepared && spellFlags(x).split(' ').includes(k))); }));
    // Combos: starring one adds Favourites on top and an "All combos" heading over the rest
    await p.evaluate(() => document.querySelector('[data-tab="combos"]').click()); await p.waitForTimeout(200);
    await p.click('[data-act="cbfav"][data-k="auto-rage"]'); await p.waitForTimeout(300);
    check(at+'combos: Favourites and All combos headings', await p.evaluate(() => { const h = [...document.querySelectorAll('[data-panel="combos"] .sechead h2')].map(x => x.textContent); return h.some(t => /Favourites/.test(t)) && h.some(t => /All combos/.test(t)); }));
    await p.click('.cbfavlist [data-act="cbfav"][data-k="auto-rage"]'); await p.waitForTimeout(300);
    check(at+'combos: no headings with no favourites', await p.evaluate(() => !document.querySelector('[data-panel="combos"] .sechead')));
    check(at+'no page errors', !p.errs.length, p.errs); await p.close2();
  }
});
