// Helpers for the web e2e tests. Not a test itself: required as ./watch by the e2e-*.js files.

// Collects what went wrong on a page into errs: script errors, and anything the Content-Security-Policy blocked
// (a blocked inline script or style shows up only as a console error, never as a page error). Returns errs.
module.exports = (p, errs) => {
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && /Content Security Policy|Refused to (execute|load|apply|connect|frame)/i.test(m.text())) errs.push('CSP: ' + m.text()); });
  return errs;
};
// After "Add" on a fresh account: onboarding step 2 (username) comes first; keep the name and open the sheet.
// Returning players go straight to the sheet, so this just waits for either.
module.exports.onboard = async p => {
  await p.waitForFunction(() => document.querySelector('#ustep') || /^\/[a-z0-9-]+\/\d+$/.test(location.pathname), null, { timeout: 30000 });
  if (await p.$('#ustep')) await p.click('#ustep button[value=go]');
};

// Settings from the environment, shared by the e2e tests (tools/test.sh and CI set them; defaults: this machine).
// Chromium for Playwright: $CHROMIUM, default /opt/pw-browsers/chromium (same as tools/test/lib.js).
module.exports.CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
// The fake mail server's file (tools/mailsink.py): $MAILSINK, default /tmp/mailsink.txt.
module.exports.MAIL = process.env.MAILSINK || '/tmp/mailsink.txt';
// Its port on 127.0.0.1, which the tests give PocketBase as its SMTP server: $MAILSINK_PORT, default 2525.
module.exports.MAIL_PORT = Number(process.env.MAILSINK_PORT || 2525);
// A screenshot path: $OUT/<name> (default <tmp>/sheet-tests, as in tools/test/lib.js), making the folder if needed.
module.exports.shot = name => {
  const path = require('path'), dir = process.env.OUT || path.join(require('os').tmpdir(), 'sheet-tests');
  require('fs').mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
};
