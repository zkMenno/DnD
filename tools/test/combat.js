// The hit → damage flow and its extras: Sneak Attack / Menacing (Henry), Rage / Smite / Colossus Slayer / Frenzy,
// Flurry, Lay on Hands, no spells while raging, magic arrows (AppTester-02), damage-type tooltip over the roll sheet.
// Run: node tools/test/combat.js (after node tools/build.js), or as part of bash tools/test.sh sheets. Uses the built
// claude.ai sheets in dist/claude through lib.js; prints PASS/FAIL per check and exits non-zero on a failure.
// Each part runs at phone (390 px) and desktop (1400 px) width. Dice are random, so checks compare totals with
// what was rolled rather than fixed numbers.
const { check, withBrowser, openSheet, wait, shot } = require('./lib');
// The rider keys (extra damage options) offered on the open roll sheet's damage step.
const riders = p => p.evaluate(() => [...document.querySelectorAll('#dock [data-act="rider"]')].map(b => b.dataset.k));
// Closes any open roll, then attacks with the named weapon in the given mode (adv / norm / dis) and rolls damage.
async function attack(p, weapon, mode){
  await p.evaluate(() => { if (typeof closeRoll === 'function' && cur) closeRoll(); }); await p.waitForTimeout(600);
  await p.evaluate(w => attackSetup(w), weapon); await p.waitForTimeout(400);
  await p.click('#dock .atkopt.'+mode); await wait(p);
  await p.click('#dock [data-act="rolldmg"]'); await wait(p);
}
withBrowser(async browser => {
  for (const width of [390, 1400]) {
    const at = '@'+width+' ';
    // ── Henry: Rogue + Battle Master riders ────────────────────────────────────────────────────────────────
    // Steady Aim is named on the advantage choice; Sneak Attack and Menacing are offered with advantage, the total
    // adds up, a superiority die is spent and comes back when Menacing is removed; no Sneak Attack with disadvantage.
    let p = await openSheet(browser, 'henry', width);
    await p.evaluate(() => attackSetup('Shortbow')); await p.waitForTimeout(400);
    check(at+'Henry (Rogue 3): Steady Aim named on the advantage choice', /Steady Aim/.test(await p.evaluate(() => document.querySelector('#dock .atkopt.adv').innerText)));
    await p.click('#dock [data-act="close"]'); await p.waitForTimeout(500);
    await attack(p, 'Shortbow', 'adv');
    check(at+'Henry: Sneak Attack and Menacing offered with advantage', JSON.stringify(await riders(p)) === '["sneak","menacing"]', await riders(p));
    const sd0 = await p.evaluate(() => S.sd);
    await p.click('#dock [data-act="rider"][data-k="sneak"]'); await p.waitForTimeout(1500);
    await p.click('#dock [data-act="rider"][data-k="menacing"]'); await p.waitForTimeout(1800);
    const r = await p.evaluate(() => ({ tot: curDmg(), sum: sum(cur.dmg.wd) + cur.dmg.flat + Object.values(cur.dmg.rid).reduce((t,x) => t + sum(x.vals), 0), n: cur.dmg.rid.sneak.vals.length, sd: S.sd }));
    const crit = await p.evaluate(() => curCrit());
    check(at+'Henry: total adds up, 2d6 sneak (4d6 on a crit), one superiority die spent', r.tot === r.sum && r.n === (crit ? 4 : 2) && r.sd === sd0 + 1, r);
    await shot(p, 'henry-damage-'+width);
    await p.click('#dock [data-act="rider"][data-k="menacing"]'); await p.waitForTimeout(400);
    check(at+'Henry: removing Menacing gives the die back', await p.evaluate(() => S.sd) === sd0);
    await attack(p, 'Shortbow', 'dis');
    check(at+'Henry: no Sneak Attack with disadvantage', !(await riders(p)).includes('sneak'));
    // Precision Attack on the hit step: spends a die, adds it to the roll, and then Menacing isn't offered on that
    // attack (one maneuver per attack)
    await p.evaluate(() => closeRoll()); await p.waitForTimeout(700);
    await p.evaluate(() => attackSetup('Shortbow')); await p.waitForTimeout(400);
    await p.click('#dock .atkopt.norm'); await wait(p);
    const hit0 = await p.evaluate(() => ({ hit: curHit(), sd: S.sd, opts: [...document.querySelectorAll('#dock [data-act="rider"][data-kind="hit"]')].map(b => b.dataset.k) }));
    check(at+'Henry: Precision Attack offered on the hit step', hit0.opts.includes('precision'), hit0);
    await p.click('#dock [data-act="rider"][data-k="precision"]'); await p.waitForTimeout(1500);
    const hit1 = await p.evaluate(() => ({ hit: curHit(), sd: S.sd, die: cur.hrid.precision.vals[0] }));
    check(at+'Henry: Precision adds its die and spends one', hit1.hit === hit0.hit + hit1.die && hit1.sd === hit0.sd + 1, { hit0, hit1 });
    await p.click('#dock [data-act="rolldmg"]'); await wait(p);
    check(at+'Henry: no Menacing on an attack that used Precision', !(await riders(p)).includes('menacing'));
    check(at+'Henry: no page errors', !p.errs.length, p.errs); await p.close2();

    // ── AppTester-02: Rage, Smite, Colossus Slayer, GWF, Frenzy ────────────────────────────────────────────
    // Rage spends a use and adds itself; Frenzy, Smite, Hunter's Mark and Colossus Slayer are offered; Great Weapon
    // Fighting counts 1s and 2s as 3s; Smite spends the right slot and gives it back when swapped; no spells while raging.
    p = await openSheet(browser, 'tester2', width);
    await p.evaluate(() => document.querySelector('#res').scrollIntoView());
    await p.click('[data-act="reson"][data-k="rage"]'); await p.waitForTimeout(600);
    check(at+'Rage: switched on and one use spent', await p.evaluate(() => S.active.rage === true && S.rage === 3));
    await p.click('#dock [data-act="close"]'); await p.waitForTimeout(500);
    await attack(p, 'Glaive, +1', 'adv');
    const opts = await riders(p);
    check(at+'Rage adds itself; Frenzy, Smite (1st and 2nd), Hunter’s Mark, Colossus Slayer offered', ['rage','frenzy','smite1','smite2','hm','colossus'].every(k => opts.includes(k)), opts);
    check(at+'Great Weapon Fighting on the two-handed Glaive', await p.evaluate(() => cur.dmg.gwf && cur.dmg.wd.every(v => v >= 3)));
    await p.click('#dock [data-act="rider"][data-k="smite2"]'); await p.waitForTimeout(1500);
    check(at+'Smite with a 2nd-level slot: 3d8, slot spent', await p.evaluate(() => cur.dmg.rid.smite2.vals.length === (curCrit() ? 6 : 3) && S.sl2 === 3));
    await p.click('#dock [data-act="rider"][data-k="smite1"]'); await p.waitForTimeout(1500);
    check(at+'Smite 1st replaces 2nd and the 2nd-level slot comes back', await p.evaluate(() => !cur.dmg.rid.smite2 && !!cur.dmg.rid.smite1 && S.sl2 === 2 && S.sl1 === 3));
    await shot(p, 'tester2-damage-'+width);
    await p.click('#dock [data-act="close"]'); await p.waitForTimeout(500);
    await p.evaluate(() => castSpell('Bless')); await p.waitForTimeout(400);
    check(at+'No spells while raging', /can’t cast spells while raging/.test(await p.evaluate(() => document.querySelector('#dock').innerText)));
    await p.click('#dock [data-act="resoff"]'); await p.waitForTimeout(500);
    check(at+'Rage ends', await p.evaluate(() => !S.active.rage));
    // Sacred Weapon (Channel Divinity button): +1 to hit with melee weapons, shown as an on state; Reckless Attack on
    // the setup
    await p.evaluate(() => document.querySelector('#res').scrollIntoView());
    await p.click('[data-act="resbtn"][data-k="cd"][data-i="0"]'); await p.waitForTimeout(500);
    check(at+'Sacred Weapon: a Channel Divinity use spent, switched on, strip on the Combat tab', await p.evaluate(() => S.active.sacred && S.cd === 2 && !!document.querySelector('.activebar')));
    await p.click('#dock [data-act="close"]'); await p.waitForTimeout(500);
    await p.evaluate(() => attackSetup('Glaive, +1')); await p.waitForTimeout(400);
    check(at+'Reckless Attack named on the advantage choice', /Reckless Attack/.test(await p.evaluate(() => document.querySelector('#dock .atkopt.adv').innerText)));
    // Steady Aim is a Rogue feature: never offered to a sheet without Rogue levels
    check(at+'no Steady Aim on a non-Rogue sheet', !/Steady Aim/.test(await p.evaluate(() => document.querySelector('#dock .atkopt.adv').innerText)));
    await p.click('#dock .atkopt.norm'); await wait(p);
    check(at+'Sacred Weapon adds +1 to the Glaive roll', await p.evaluate(() => curHit() === cur.t.pick + cur.w.hit + 1 && !!cur.hrid.sacred));
    await p.evaluate(() => closeRoll()); await p.waitForTimeout(700);
    await p.evaluate(() => attackSetup('Longbow, +1')); await p.waitForTimeout(400); await p.click('#dock .atkopt.norm'); await wait(p);
    check(at+'…but not to the Longbow', await p.evaluate(() => !cur.hrid.sacred));
    await p.evaluate(() => closeRoll()); await p.waitForTimeout(700);
    await p.click('.activebar [data-act="resoff"]'); await p.waitForTimeout(300);
    check(at+'Sacred Weapon ends', await p.evaluate(() => !S.active.sacred));
    // Flurry: 1 Focus, two unarmed strikes, Stunning Strike and Open Hand offered
    await p.evaluate(() => document.querySelector('#res').scrollIntoView());
    await p.click('[data-act="resbtn"][data-k="focus"][data-i="0"]'); await wait(p);
    check(at+'Flurry spends 1 Focus and queues a second strike', await p.evaluate(() => S.focus === 4 && cur.o.queue.length === 1 && cur.w.name === 'Unarmed Strike'));
    await p.click('#dock [data-act="rolldmg"]'); await wait(p);
    const fo = await riders(p);
    check(at+'Flurry hit offers Stunning Strike and Open Hand', fo.includes('stun') && fo.includes('openhand'), fo);
    await p.click('#dock [data-act="close"]'); await p.waitForTimeout(500);
    // Lay on Hands pool: −5 takes 5 points and lands on the change list
    await p.click('[data-pool="loh"][data-d="-5"]'); await p.waitForTimeout(200);
    check(at+'Lay on Hands −5 → 7 points left, on the change list', await p.evaluate(() => S.loh === 13 && changes().some(c => /^Lay on Hands 12 → 7/.test(c.t))));
    // magic arrows: picking +2 arrows adds +2 to hit and damage and spends one of them, not a plain arrow
    const plain0 = await p.evaluate(() => arrowsLeft());
    await p.evaluate(() => attackSetup('Longbow, +1')); await p.waitForTimeout(400);
    await p.click('#dock [data-act="ammo"][data-n="Arrows, +2"]'); await p.waitForTimeout(300);
    await shot(p, 'tester2-ammo-'+width);
    await p.click('#dock .atkopt.norm'); await wait(p);
    check(at+'+2 arrows: +13 to hit, one used, plain arrows untouched', await p.evaluate(n => cur.w.hit === 13 && S.spent['Arrows, +2'] === 1 && arrowsLeft() === n && changes().some(c => c.t === 'Arrows, +2 4 → 3'), plain0));
    await p.click('#dock [data-act="rolldmg"]'); await wait(p);
    check(at+'+2 arrows: +7 damage', await p.evaluate(() => cur.dmg.flat === 7));
    check(at+'AppTester-02: no page errors', !p.errs.length, p.errs); await p.close2();

    // ── AppTester-01: damage-type tooltip ──────────────────────────────────────────────────────────────────
    // The damage-type tooltip opens on top of the roll sheet, not behind it (AppTester-01, a spell attack).
    p = await openSheet(browser, 'tester', width);
    await p.evaluate(() => { ui.mode = 'norm'; castSpell('Shocking Grasp'); }); await p.waitForTimeout(500);
    for (let i = 0; i < 4; i++) { const nx = await p.$('#dock [data-act="rolldmg"], #dock .atkopt.norm'); if (!nx) break; await nx.click(); await wait(p); }
    await p.click('#dock .term.dt'); await p.waitForTimeout(400);
    check(at+'Damage-type tooltip opens on top of the roll sheet', await p.evaluate(() => { const b = document.querySelector('#bubble'); if (!b) return false; const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return !!(e && e.closest('#bubble')); }));
    check(at+'AppTester-01: no page errors', !p.errs.length, p.errs); await p.close2();
  }
});
