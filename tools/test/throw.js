// "Throw it yourself" (src/engine/06b-throw-dice.js): the dice wait until the player flicks them, then land on the
// values the roll already uses. Checks the host gate (claude.ai sheets never get it), the ☰ menu setting, a check
// that waits, a mouse drag that throws, a tap and Enter that throw, "Roll for me", the damage step with several dice,
// and that reduced motion and the Automatic setting never show the waiting dice.
// The claude.ai test sheets open from file:// (no host, no window.SHEET), so the feature is off there, as it must be;
// the test checks that first and then switches it on directly (FEATURES.throwDice = true), as the engine allows.
// Run: node tools/test/throw.js (after node tools/build.js), or as part of bash tools/test.sh sheets.
const { check, withBrowser, openSheet, wait, shot } = require('./lib');

// Starts recording, every frame, the face each 3D die shows to the camera: window.__faces = [{s, v}] in the order
// the dice were added; the last values stay after the dice go. A die at rest is tipped back a little so it reads as
// 3D (§6 d3Die: Euler -.32, .18), so that tilt is taken off first; then the face showing points straight at the camera.
const recordFaces = p => p.evaluate(() => {
  cancelAnimationFrame(window.__rec); window.__faces = []; const seen = new Map();
  const untilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.32, .18, 0)).invert();
  (function tick(){
    if (window.THREE && D3.scene) D3.scene.children.forEach(m => {
      if (!m.isMesh) return; const s = Object.keys(D3.geo).find(k => D3.geo[k].g === m.geometry); if (!s) return;
      let best = -2, v = 0; D3.geo[s].faces.forEach((f, k) => { const z = f.n.clone().applyQuaternion(untilt.clone().multiply(m.quaternion)).z; if (z > best) { best = z; v = k + 1; } });
      if (!seen.has(m.uuid)) { seen.set(m.uuid, window.__faces.length); window.__faces.push({ s: +s, v }); }
      else window.__faces[seen.get(m.uuid)].v = v;
    });
    window.__rec = requestAnimationFrame(tick);
  })();
});
// Where the first waiting die is on screen (CSS px), from its 3D position
const diePos = p => p.evaluate(() => {
  const m = D3.scene.children.find(c => c.isMesh); if (!m) return null;
  const v = m.position.clone().project(D3.cam);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
// Waits up to ms for the waiting dice overlay; true if it showed (and hasn't been thrown yet)
const waitsForThrow = async (p, ms = 4000) => { try { await p.waitForSelector('.throwfx:not(.thrown)', { timeout: ms }); return true; } catch (_) { return false; } };
// True if the waiting dice overlay shows up at any point in the next ms
const everWaits = (p, ms) => p.evaluate(ms => new Promise(res => { const t0 = Date.now();
  (function poll(){ if (document.querySelector('.throwfx')) return res(true); if (Date.now() - t0 > ms) return res(false); setTimeout(poll, 30); })(); }), ms);
// Waits until the open check sheet has its roll written in (lib.js wait() follows attacks only)
const waitCheck = async (p, ms = 15000) => { try { await p.waitForFunction(() => checkRoll && checkRoll.veil === false, null, { timeout: ms }); } catch (_) {} await p.waitForTimeout(400); };
// Drags from the die upwards and lets go quickly: a flick
async function flick(p, dx = 40, dy = -260){
  const at = await diePos(p);
  await p.mouse.move(at.x, at.y); await p.mouse.down();
  await p.mouse.move(at.x + dx / 3, at.y + dy / 3, { steps: 3 }); await p.mouse.move(at.x + dx, at.y + dy, { steps: 4 }); await p.mouse.up();
}

withBrowser(async browser => {
  const p = await openSheet(browser, 'trial-brute', 390);
  await p.evaluate(() => { ui.dicePrompted = true; saveUi(); });   // no "different dice?" note over the buttons
  // ── The gate ───────────────────────────────────────────────────────────────────────────────────────────
  const hosts = await p.evaluate(() => ['staging.dungeontracker.com', 'localhost', '127.0.0.1', 'pb.localhost', 'dungeontracker.com', 'app.dungeontracker.com', 'staging.dungeontracker.com.evil.example', 'notlocalhost', 'claude.ai', ''].map(h => [h, previewHost(h)]));
  const want = { 'staging.dungeontracker.com': true, localhost: true, '127.0.0.1': true, 'pb.localhost': true };
  check('gate: preview hosts are staging, localhost, 127.0.0.1 and *.localhost only', hosts.every(([h, ok]) => ok === !!want[h]), hosts);
  check('gate: off on a claude.ai sheet (no window.SHEET)', await p.evaluate(() => FEATURES.throwDice === false && !window.SHEET));
  await p.click('#menubtn'); await p.waitForTimeout(300);
  check('gate: no Rolling setting in the ☰ menu on a claude.ai sheet', await p.evaluate(() => !document.querySelector('[data-act="rollstyle"]') && !!document.querySelector('#menubox:not([hidden])')));
  await p.click('#menubox [data-act="menu"]'); await p.waitForTimeout(300);
  // even with the setting stored, the feature being off means the automatic throw
  await p.evaluate(() => { ui.rolling = 'throw'; saveUi(); });
  await p.evaluate(() => rollCheckMode('Strength', 3, 'norm'));
  check('gate: a stored "throw" setting does nothing while the feature is off', !(await everWaits(p, 2500)));
  await waitCheck(p); await p.evaluate(() => { closeRoll(); ui.rolling = 'auto'; saveUi(); }); await p.waitForTimeout(500);

  // ── The setting ────────────────────────────────────────────────────────────────────────────────────────
  await p.evaluate(() => { FEATURES.throwDice = true; });
  await p.click('#menubtn'); await p.waitForTimeout(300);
  check('menu: Rolling shows Automatic (pressed) and Throw it yourself', await p.evaluate(() => {
    const b = [...document.querySelectorAll('[data-act="rollstyle"]')]; return b.length === 2 && b[0].dataset.m === 'auto' && b[0].getAttribute('aria-pressed') === 'true'; }));
  await p.click('[data-act="rollstyle"][data-m="throw"]'); await p.waitForTimeout(200);
  check('menu: picking Throw it yourself is saved on this device', await p.evaluate(() => ui.rolling === 'throw' && JSON.parse(localStorage.getItem(PACK.id + '-ui')).rolling === 'throw'
    && document.querySelector('[data-act="rollstyle"][data-m="throw"]').getAttribute('aria-pressed') === 'true'));
  await shot(p, 'throw-menu-390');
  await p.click('#menubox [data-act="menu"]'); await p.waitForTimeout(300);

  // ── A check waits, a drag throws, the result is the die ────────────────────────────────────────────────
  await recordFaces(p);
  await p.evaluate(() => rollCheckMode('Strength', 3, 'norm'));
  check('check: the dice wait to be thrown', await waitsForThrow(p));
  await p.waitForTimeout(1500);
  check('check: still waiting a while later, sheet still veiled', await p.evaluate(() => !!document.querySelector('.throwfx:not(.thrown)') && checkRoll && checkRoll.veil === true));
  check('check: the hint says what to do', /Drag and let go|Flick the die/.test(await p.evaluate(() => document.querySelector('.throwhint').innerText)));
  await shot(p, 'throw-waiting-390');
  await flick(p);
  check('check: the drag throws the die', await p.evaluate(() => !!document.querySelector('.throwfx.thrown')));
  await p.waitForTimeout(350); await shot(p, 'throw-flying-390');
  await waitCheck(p);
  const r1 = await p.evaluate(() => ({ faces: window.__faces, pick: checkRoll.t.pick, total: document.querySelector('#dock .roll .n').innerText, veil: checkRoll.veil, gone: !document.querySelector('.throwfx') }));
  check('check: the die landed on the value used, and the sheet shows it', !r1.veil && r1.gone && r1.faces.length === 1 && r1.faces[0].v === r1.pick && parseInt(r1.total, 10) === r1.pick + 3, r1);
  await p.evaluate(() => closeRoll()); await p.waitForTimeout(500);

  // ── Advantage: two dice, thrown with Enter ─────────────────────────────────────────────────────────────
  await recordFaces(p);
  await p.evaluate(() => rollCheckMode('Dexterity', 1, 'adv'));
  check('advantage: two dice wait', await waitsForThrow(p) && (await p.evaluate(() => D3.scene.children.filter(c => c.isMesh).length)) === 2);
  await p.keyboard.press('Enter');
  check('advantage: Enter throws', await p.evaluate(() => !!document.querySelector('.throwfx.thrown')));
  await waitCheck(p);
  const r2 = await p.evaluate(() => ({ faces: window.__faces.map(f => f.v), dice: checkRoll.t.dice, pick: checkRoll.t.pick, veil: checkRoll.veil }));
  check('advantage: both dice landed on their rolled values', !r2.veil && JSON.stringify(r2.faces) === JSON.stringify(r2.dice), r2);
  await p.evaluate(() => closeRoll()); await p.waitForTimeout(500);

  // ── A tap (no drag) throws gently; "Roll for me" hands over to the automatic throw ─────────────────────
  await p.evaluate(() => rollCheckMode('Wisdom', 0, 'norm'));
  if (await waitsForThrow(p)) { const at = await diePos(p); await p.mouse.click(at.x, at.y); }
  check('tap: a tap without a drag throws', await p.evaluate(() => !!document.querySelector('.throwfx.thrown')));
  await waitCheck(p); await p.evaluate(() => closeRoll()); await p.waitForTimeout(500);
  await p.evaluate(() => rollCheckMode('Wisdom', 0, 'norm'));
  if (await waitsForThrow(p)) await p.click('.throwskip');
  check('skip: Roll for me plays the automatic dice', await p.evaluate(() => !document.querySelector('.throwfx') && !!document.querySelector('.fxdice')));
  await waitCheck(p);
  check('skip: the result is written in', await p.evaluate(() => checkRoll && checkRoll.veil === false));
  await p.evaluate(() => closeRoll()); await p.waitForTimeout(500);

  // ── Attack: hit, then damage with its dice, each thrown; the damage shown is the dice that landed ──────
  const weapon = await p.evaluate(() => (D.weapons.find(w => !w.spell) || D.weapons[0]).name);
  await p.evaluate(w => attackSetup(w), weapon); await p.waitForTimeout(400);
  await p.click('#dock .atkopt.norm');
  if (await waitsForThrow(p)) await flick(p, -80, -240);
  await wait(p);
  check('attack: the hit is written in after the throw', await p.evaluate(() => cur && !cur.veil && !!document.querySelector('#dock [data-act="rolldmg"]')));
  await recordFaces(p);
  await p.click('#dock [data-act="rolldmg"]');
  check('damage: the damage dice wait', await waitsForThrow(p));
  await flick(p, 120, -200);
  await wait(p);
  const r3 = await p.evaluate(() => ({ faces: window.__faces.map(f => f.v), wd: cur.dmg.wd, tot: curDmg(), shown: document.querySelector('#dock .roll .dmgn').innerText }));
  check('damage: the dice landed on the values used and the total shows', JSON.stringify(r3.faces) === JSON.stringify(r3.wd) && parseInt(r3.shown, 10) === r3.tot, r3);
  await shot(p, 'throw-damage-390');
  await p.evaluate(() => { closeRoll(); cancelAnimationFrame(window.__rec); }); await p.waitForTimeout(500);

  // ── Every die shape in one throw: one flick throws them all, each lands on its own value ───────────────
  await recordFaces(p);
  await p.evaluate(() => { window.__done = false; fx(null, () => { window.__done = true; }, [{s:4, v:3}, {s:6, v:5}, {s:8, v:7}, {s:10, v:9}, {s:12, v:11}]); });
  check('all shapes: five dice wait', await waitsForThrow(p) && (await p.evaluate(() => D3.scene.children.filter(c => c.isMesh).length)) === 5);
  await shot(p, 'throw-five-waiting-390');
  await flick(p, 30, -300);
  try { await p.waitForFunction(() => window.__done, null, { timeout: 15000 }); } catch (_) {}
  const r4 = await p.evaluate(() => ({ done: window.__done, faces: window.__faces.map(f => f.s+':'+f.v) }));
  check('all shapes: d4 d6 d8 d10 d12 each landed on its value', r4.done && JSON.stringify(r4.faces) === '["4:3","6:5","8:7","10:9","12:11"]', r4);
  await p.waitForTimeout(500);   // the overlay fades out after done()

  // ── Reduced motion and Automatic: never wait ───────────────────────────────────────────────────────────
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.evaluate(() => rollCheckMode('Charisma', 2, 'norm'));
  check('reduced motion: no waiting dice, the result is in at once', !(await everWaits(p, 1200)) && await p.evaluate(() => checkRoll.veil === false));
  await p.evaluate(() => closeRoll()); await p.emulateMedia({ reducedMotion: 'no-preference' }); await p.waitForTimeout(400);
  await p.click('#menubtn'); await p.waitForTimeout(300);
  await p.click('[data-act="rollstyle"][data-m="auto"]'); await p.waitForTimeout(200);
  await p.click('#menubox [data-act="menu"]'); await p.waitForTimeout(300);
  await p.evaluate(() => rollCheckMode('Charisma', 2, 'norm'));
  check('automatic: back on Automatic the dice roll by themselves', !(await everWaits(p, 2500)) && await p.evaluate(() => ui.rolling === 'auto'));
  await waitCheck(p);
  check('no page errors', !p.errs.length, p.errs);
  await p.close2();
});
