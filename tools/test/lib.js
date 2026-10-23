// Shared bits for the claude.ai sheet tests (combat, items, smoke, spells): open a built sheet in a fresh browser
// context, wait out the roll animations, collect failed checks and page errors, and exit non-zero if anything failed.
// Needs playwright and Chromium ($CHROMIUM, default /opt/pw-browsers/chromium), and the sheets built in dist/claude.
// Screenshots go to $OUT (default <tmp>/sheet-tests).
const path = require('path'), os = require('os'), fs = require('fs');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..', '..', 'dist', 'claude');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'sheet-tests');   // screenshots land here
fs.mkdirSync(OUT, { recursive: true });
// Fixture sheets: a made-up character in tools/test/fixtures/sheets/<name>.json, for class features no built sheet
// has (rogue-fighter: a halfling Rogue 3 / Fighter 3 Battle Master, for Sneak Attack, Steady Aim, superiority dice
// and Halfling Luck; sorc-warlock-bard: Kestra Galeborn, a dragonborn Sorcerer 8 / Warlock 6 / Bard 6, the same
// character as the web tests' D&D Beyond fixture 900000003, made from it by the engine: a spellcaster with three
// casting classes, pact slots and sorcery points). Each is written to $OUT/fixture-<name>.html: a copy of the built trial-brute.html with that
// data in its #trial-brute-data script and the character's name as the title (same pack, so same storage prefix).
const FIXTURES = path.join(__dirname, 'fixtures', 'sheets');
function fixtureSheet(name) {
  const data = fs.readFileSync(path.join(FIXTURES, name + '.json'), 'utf8').trim(), title = JSON.parse(data).name;
  const src = fs.readFileSync(path.join(DIST, 'trial-brute.html'), 'utf8'), re = /(<script id="trial-brute-data" type="application\/json">)[\s\S]*?(<\/script>)/;
  if (!re.test(src)) throw new Error('fixtureSheet: no #trial-brute-data script in dist/claude/trial-brute.html');
  const f = path.join(OUT, 'fixture-' + name + '.html');
  fs.writeFileSync(f, src.replace(re, (m, a, b) => a + data + b).replace(/<title>[^<]*<\/title>/, () => '<title>' + title + '</title>'));
  return f;
}
// The test names for the sheets: built ones (the output names in tools/build.js) and fixture sheets (absolute paths).
const SHEETS = { tester2: 'apptester2.html', 'trial-brute': 'trial-brute.html', 'trial-mage': 'trial-mage.html',
  'rogue-fighter': fixtureSheet('rogue-fighter'), 'sorc-warlock-bard': fixtureSheet('sorc-warlock-bard') };
const ROLL_MS = 4500;   // a roll's burst + 3D dice before the numbers are written in

let failed = 0;
// Prints PASS/FAIL for one check (with the detail on a failure) and counts failures. Returns ok.
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  → ' + JSON.stringify(detail)));
  return ok;
}
// Runs fn(browser) with a fresh Chromium. A crash counts as a failure; any failure sets a non-zero exit code.
async function withBrowser(fn) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  try { await fn(browser); } catch (e) { failed++; console.log('FAIL crashed: ' + (e && e.stack || e)); }
  finally { await browser.close(); }
  if (failed) { console.log(failed + ' failed'); process.exitCode = 1; }
}
// Opens a sheet (a SHEETS name, a file name in dist/claude, or an absolute path) in a fresh context: empty
// localStorage, the given width and colour scheme. page.errs collects uncaught page errors; page.close2() closes it.
async function openSheet(browser, sheet, width = 390, scheme = 'dark') {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage(); page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message)); page.setDefaultTimeout(8000);
  const f = SHEETS[sheet] || sheet;
  await page.goto('file://' + (path.isAbsolute(f) ? f : path.join(DIST, f))); await page.waitForTimeout(900);
  page.close2 = () => ctx.close();
  return page;
}
// Waits until the open roll sheet has its dice written in (the 3D dice can take longer on a cold start). Never
// throws: a check after it will fail instead.
const wait = async (page, ms = ROLL_MS) => {
  try { await page.waitForFunction(() => !(typeof cur !== 'undefined' && cur && cur.veil) && !document.querySelector('#dock .roll.rolling'), null, { timeout: ms * 3 }); }
  catch (_) {}
  await page.waitForTimeout(400);
};
// Saves a screenshot as $OUT/<name>.png.
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });
module.exports = { check, withBrowser, openSheet, wait, shot, fixtureSheet, SHEETS, OUT, DIST };
