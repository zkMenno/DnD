// ➕ Add item: the picker, gear, AC and attack cards, the change list, remove / equip, reload, and the sync drop-off.
const fs = require('fs'), path = require('path');
const { check, withBrowser, openSheet, shot, DIST, OUT } = require('./lib');
withBrowser(async browser => {
  for (const [sheet, width] of [['henry', 1400], ['wick', 390]]) {
    const p = await openSheet(browser, sheet, width), at = sheet+' @'+width+': ';
    await p.evaluate(() => document.querySelector('[data-tab="gear"]').click()); await p.waitForTimeout(300);
    const add = async (q, n, o = {}) => {
      await p.click('[data-act="additem"]'); await p.waitForSelector('#itq');
      await p.fill('#itq', q); await p.click('.irow[data-n="'+n+'"]');
      if (o.base) await p.selectOption('#itbase', o.base);
      for (let i = 1; i < (o.qty||1); i++) await p.click('[data-i="qty"][data-d="1"]');
      if (o.shot) await shot(p, 'additem-'+sheet+'-'+o.shot);
      await p.click('[data-i="add"]'); await p.waitForTimeout(300);
    };
    const ac0 = await p.evaluate(() => D.ac), pot0 = await p.evaluate(() => itemLeft('Potion of Healing'));
    await add('rope', 'Rope', {shot:'rope'});
    await add('longsw', 'Longsword');
    await add('weapon +1', 'Weapon +1', {base:'Rapier', shot:'plus1'});
    await add('heal', 'Potion of Healing', {qty:2});
    await add('shield', 'Shield +1');
    const r = await p.evaluate(() => ({ names: ADDED.map(a => a.inv.name), ac: D.ac, rapier: (D.weapons.find(w => w.name === 'Rapier +1')||{}).hit,
      dex: D.mod.dex, pb: D.pb, cards: [...document.querySelectorAll('[data-panel="combat"] .atk .t')].map(x => x.textContent), ch: changes().map(c => c.t), pots: itemLeft('Potion of Healing') }));
    check(at+'items added', ['Rope','Longsword','Rapier +1','Shield +1'].every(n => r.names.includes(n)), r.names);
    check(at+'Shield +1 adds 3 AC', r.ac === ac0 + 3, [ac0, r.ac]);
    check(at+'Rapier +1 hits for DEX (+ PB if proficient) + 1', [r.dex + 1, r.dex + r.pb + 1].includes(r.rapier), r);
    check(at+'new weapons get attack cards', r.cards.some(t => /Longsword/.test(t)) && r.cards.some(t => /Rapier \+1/.test(t)), r.cards);
    check(at+'Potions of Healing count up (or are added)', r.pots === pot0 + 2, [pot0, r.pots]);
    check(at+'on the change list', r.ch.some(t => t === 'Add Rope') && r.ch.some(t => t === 'Add Rapier +1'), r.ch);
    await p.reload(); await p.waitForTimeout(900);
    check(at+'kept after reload', await p.evaluate(() => ADDED.length) === r.names.length);
    await p.evaluate(() => document.querySelector('[data-tab="gear"]').click()); await p.waitForTimeout(200);
    const rope = await p.evaluate(() => ADDED.find(a => a.inv.name === 'Rope').inv.id);
    await p.click('[data-act="itemdel"][data-id="'+rope+'"]'); await p.click('.mbtns [data-m="1"]'); await p.waitForTimeout(300);
    check(at+'remove', await p.evaluate(() => !ADDED.some(a => a.inv.name === 'Rope')));
    const ls = await p.evaluate(() => ADDED.find(a => a.inv.name === 'Longsword').inv.id);
    await p.click('[data-act="itemeq"][data-id="'+ls+'"]'); await p.waitForTimeout(300);
    check(at+'equip toggle', await p.evaluate(() => ADDED.find(a => a.inv.name === 'Longsword').inv.equipped === false));
    await shot(p, 'additem-'+sheet+'-gear');
    check(at+'no page errors', !p.errs.length, p.errs); await p.close2();
  }
  // counters: trackers saved before 21 Oct (S.arrows / S.potions) carry over as spent counts; arrows and potions use the shared counter
  {
    const p = await openSheet(browser, 'henry', 390);
    const base = await p.evaluate(() => ({ arrows: itemLeft(ARROW_N), pots: itemLeft('Potion of Healing'), key: SKEY, stamp: DATA.syncedAt }));
    await p.evaluate(b => { const s = JSON.parse(localStorage.getItem(b.key)) || {}; Object.assign(s, { stamp: b.stamp, arrows: b.arrows - 3, potions: b.pots - 1, spent: {} }); delete s.base; localStorage.setItem(b.key, JSON.stringify(s)); }, base);
    await p.reload(); await p.waitForTimeout(900);
    const m = await p.evaluate(() => ({ arrows: itemLeft(ARROW_N), pots: itemLeft('Potion of Healing'), old: 'arrows' in S || 'potions' in S, ch: changes().map(c => c.t) }));
    check('old tracker: 3 arrows and 1 potion used carry over', m.arrows === base.arrows - 3 && m.pots === base.pots - 1 && !m.old, { base, m });
    check('old tracker: both on the change list', m.ch.some(t => t.startsWith('Arrows ')) && m.ch.some(t => t.startsWith('Potion of Healing ')), m.ch);
    await p.evaluate(() => document.querySelector('#res').scrollIntoView());
    await p.click('[data-inv="'+(await p.evaluate(() => ARROW_N))+'"][data-d="1"]'); await p.waitForTimeout(200);
    check('+ adds an arrow back', await p.evaluate(() => itemLeft(ARROW_N)) === base.arrows - 2);
    const hp0 = await p.evaluate(() => { S.hp = 10; save(); return S.hp; });
    if (base.pots - 1 > 0) { await p.click('[data-act="useitem"][data-item="Potion of Healing"]'); await p.waitForFunction(h => S.hp > h, hp0, {timeout: 12000}).catch(() => {}); await p.waitForTimeout(300);
      check('🧪 Drink heals and uses one', await p.evaluate(h => S.hp > h && itemLeft('Potion of Healing'), hp0) === base.pots - 2); }
    check('no page errors', !p.errs.length, p.errs); await p.close2();
  }
  // AppTester-02: every healing potion size can be drunk, with its own dice
  {
    const p = await openSheet(browser, 'tester2', 390);
    const r = await p.evaluate(() => potionNames().map(n => n+' '+potionDice(n)));
    check('AppTester-02: three potion sizes with their dice', JSON.stringify(r) === JSON.stringify(['Potion of Healing (Greater) 4d4+4','Potion of Healing (Superior) 8d4+8','Potion of Healing 2d4+2']), r);
    await p.evaluate(() => { S.hp = 10; save(); document.querySelector('#res').scrollIntoView(); });
    await p.click('[data-act="useitem"][data-item="Potion of Healing (Superior)"]'); await p.waitForFunction(() => S.hp > 10, null, {timeout: 12000}).catch(() => {}); await p.waitForTimeout(300);
    check('the hearts burst shows the HP gained', await p.evaluate(() => /^\+\d+ HP$/.test(HEAL_WORD)));
    check('Superior potion heals 16–40', await p.evaluate(() => S.hp >= 26 && S.hp <= 50 && itemLeft('Potion of Healing (Superior)') === 0 && changes().some(c => c.t === 'Potion of Healing (Superior) 1 → 0')));
    // healing spell → ❤️ Heal myself: HP up by what was rolled (capped at max), hearts show it
    await p.evaluate(() => { S.hp = 100; save(); closeRoll(); }); await p.waitForTimeout(700);
    await p.evaluate(() => castSpell('Cure Wounds')); await p.waitForTimeout(500);
    await p.click('#dock [data-act="castat"]'); await p.waitForFunction(() => document.querySelector('#dock [data-act="healself"]'), null, {timeout: 12000});
    await p.click('#dock [data-act="healself"]'); await p.waitForTimeout(300);
    check('Heal myself: HP up, button shows the HP gained', await p.evaluate(() => S.hp > 100 && /\+\d+ HP/.test(document.querySelector('#dock [data-act="healself"]').innerText) && HEAL_WORD === '+'+(S.hp-100)+' HP'));
    // Wholeness of Body (Monk): a rolled self-heal from its tracker
    await p.evaluate(() => { S.hp = 50; save(); closeRoll(); document.querySelector('#res').scrollIntoView(); }); await p.waitForTimeout(700);
    await p.evaluate(() => { S.wholeness = 0; save(); paintRes(); });
    await p.click('[data-act="resbtn"][data-k="wholeness"]'); await p.waitForFunction(() => S.hp > 50, null, {timeout: 12000}).catch(() => {});
    check('Wholeness of Body heals 1d8+1 and spends its use', await p.evaluate(() => S.hp >= 52 && S.hp <= 59 && S.wholeness === 1));
    check('no page errors', !p.errs.length, p.errs); await p.close2();
  }
  // a sync where D&D Beyond now lists one of two added items: that one goes, the other stays
  const src = fs.readFileSync(path.join(DIST, 'henry.html'), 'utf8'), F = path.join(OUT, 'synctest.html');
  fs.writeFileSync(F, src);
  const p = await openSheet(browser, F);
  await p.evaluate(() => { const L = n => ({ inv:{ id:'add-'+n, name:n, qty:1, filter:'Other Gear', inPack:true, props:[], added:true }, had: ddbQty(n), at:1 }); S.added = [L('Rope'), L('Crowbar')]; save(); });
  const m = src.match(/(<script id="henry-data" type="application\/json">)([\s\S]*?)(<\/script>)/), d = JSON.parse(m[2]);
  d.syncedAt = new Date().toISOString(); d.inventory.push(Object.assign({}, d.inventory[0], { id: 999, name: 'Rope', qty: 1, equipped: false, filter: 'Other Gear', inPack: true }));
  fs.writeFileSync(F, src.replace(m[0], m[1]+JSON.stringify(d)+m[3]));
  await p.reload(); await p.waitForTimeout(900);
  check('sync: Rope (now in D&D Beyond) dropped, Crowbar kept', await p.evaluate(() => ADDED.map(a => a.inv.name).join() === 'Crowbar'));
  await p.close2();
});
