// Collect what went wrong on a page: script errors, and anything the Content-Security-Policy blocked
// (a blocked inline script or style shows up only as a console error, never as a page error).
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
