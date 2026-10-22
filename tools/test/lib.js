// Shared bits for the browser tests: open a built sheet in a fresh browser context, wait out the roll animations,
// collect failed checks and page errors, and exit non-zero if anything failed.
const path = require('path'), os = require('os'), fs = require('fs');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..', '..', 'dist', 'claude');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'sheet-tests');   // screenshots land here
fs.mkdirSync(OUT, { recursive: true });
const SHEETS = { henry: 'henry.html', tester: 'apptester.html', tester2: 'apptester2.html', wick: 'wick.html' };
const ROLL_MS = 4500;   // a roll's burst + 3D dice before the numbers are written in

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  → ' + JSON.stringify(detail)));
  return ok;
}
async function withBrowser(fn) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  try { await fn(browser); } catch (e) { failed++; console.log('FAIL crashed: ' + (e && e.stack || e)); }
  finally { await browser.close(); }
  if (failed) { console.log(failed + ' failed'); process.exitCode = 1; }
}
// a sheet in a fresh context (empty localStorage); page.errs collects uncaught page errors
async function openSheet(browser, sheet, width = 390, scheme = 'dark') {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage(); page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message)); page.setDefaultTimeout(8000);
  await page.goto('file://' + (path.isAbsolute(sheet) ? sheet : path.join(DIST, SHEETS[sheet] || sheet))); await page.waitForTimeout(900);
  page.close2 = () => ctx.close();
  return page;
}
// wait until the open roll sheet has its dice written in (the 3D dice can take longer on a cold start)
const wait = async (page, ms = ROLL_MS) => {
  try { await page.waitForFunction(() => !(typeof cur !== 'undefined' && cur && cur.veil) && !document.querySelector('#dock .roll.rolling'), null, { timeout: ms * 3 }); }
  catch (_) {}
  await page.waitForTimeout(400);
};
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });
module.exports = { check, withBrowser, openSheet, wait, shot, SHEETS, OUT, DIST };
