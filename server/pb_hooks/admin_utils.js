// Shared helpers for the Site admin routes (admin.pb.js): who is an admin, and the short unlock that an emailed code
// gives. Not a hook file (no .pb.js); each handler require()s it, because handlers run in their own JS VMs.
//
// Two locks, both checked on every admin route:
//   1. the signed-in account has users.admin ticked (only the superuser can tick it: the field is hidden), and
//   2. the request carries an unlock token (X-Admin-Token) from POST /api/admin/unlock, which needs a 6-digit code
//      just emailed to that account. The token lasts 30 minutes and lives in server memory ($app.store()), so a
//      restart or deploy locks the tab again.
// Failures answer 404 to non-admins (the routes look like they don't exist) and 403 when the unlock is missing.

const UNLOCK_MS = 30 * 60 * 1000;
module.exports.UNLOCK_MS = UNLOCK_MS;

// true when the signed-in record is an admin. Re-read from the database: the auth record in the request may be old.
module.exports.isAdmin = function isAdmin(auth) {
  if (!auth) return false;
  try { return $app.findRecordById("users", auth.id).getBool("admin"); } catch (_) { return false; }
};

// Throws unless the request is from an admin with a live unlock token. Returns nothing.
module.exports.requireUnlocked = function requireUnlocked(e) {
  if (!module.exports.isAdmin(e.auth)) throw new NotFoundError("Not found.");
  const sent = String(e.request.header.get("X-Admin-Token") || ""), raw = String($app.store().get("admtok:" + e.auth.id) || "");
  let t = null; try { t = JSON.parse(raw); } catch (_) {}
  if (!t || !sent || t.exp < Date.now() || !$security.equal(sent, t.token)) throw new ForbiddenError("Locked. Ask for a new code.");
};
