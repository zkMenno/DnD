// Collect what went wrong on a page: script errors, and anything the Content-Security-Policy blocked
// (a blocked inline script or style shows up only as a console error, never as a page error).
module.exports = (p, errs) => {
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && /Content Security Policy|Refused to (execute|load|apply|connect|frame)/i.test(m.text())) errs.push('CSP: ' + m.text()); });
  return errs;
};
