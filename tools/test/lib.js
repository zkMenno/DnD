// Shared bits for the claude.ai sheet tests (combat, items, smoke, spells): open a built sheet in a fresh browser
// context, wait out the roll animations, collect failed checks and page errors, and exit non-zero if anything failed.
// Needs playwright and Chromium ($CHROMIUM, default /opt/pw-browsers/chromium), and the sheets built in dist/claude.
// Screenshots go to $OUT (default <tmp>/sheet-tests).
const path = require('path'), os = require('os'), fs = require('fs');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..', '..', 'dist', 'claude');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'sheet-tests');   // screenshots land here
fs.mkdirSync(OUT, { recursive: true });
// The test names for the built sheets (the output names in tools/build.js).
const SHEETS = { henry: 'henry.html', tester: 'apptester.html', tester2: 'apptester2.html', wick: 'wick.html' };
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
  await page.goto('file://' + (path.isAbsolute(sheet) ? sheet : path.join(DIST, SHEETS[sheet] || sheet))); await page.waitForTimeout(900);
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
module.exports = { check, withBrowser, openSheet, wait, shot, SHEETS, OUT, DIST };
