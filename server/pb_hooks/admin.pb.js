/// <reference path="../pb_data/types.d.ts" />
// Site admin routes for the owner: the Site admin tab on the home page (web/admin.js). Every route needs a signed-in
// account with users.admin ticked; everything but /me, /code and /unlock also needs the unlock token an emailed
// code gives (admin_utils.js explains both locks). Non-admins get 404s, as if the routes weren't there.
// Each handler runs in its own VM and require()s admin_utils.js itself.

// GET /api/admin/me → {admin} — whether to show the tab at all (only true for admins; says nothing else)
routerAdd("GET", "/api/admin/me", (e) => {
  return e.json(200, { admin: require(`${__hooks}/admin_utils.js`).isAdmin(e.auth) });
}, $apis.requireAuth("users"));

// POST /api/admin/code → {sent} — emails a 6-digit code to the admin's own address. One a minute; the code lasts
// 10 minutes and 5 tries (stored under "adm:<user id>").
routerAdd("POST", "/api/admin/code", (e) => {
  const u = require(`${__hooks}/admin_utils.js`);
  if (!u.isAdmin(e.auth)) throw new NotFoundError("Not found.");
  const key = "adm:" + e.auth.id, prev = (() => { try { return JSON.parse(String($app.store().get(key) || "")); } catch (_) { return null; } })();
  if (prev && Date.now() - prev.at < 60000) throw new BadRequestError("A code is on its way. Wait a minute before asking for another.");
  const code = $security.randomStringWithAlphabet(6, "0123456789");
  $app.store().set(key, JSON.stringify({ code, at: Date.now(), tries: 0 }));
  const s = $app.settings().meta;
  $app.newMailClient().send(new MailerMessage({
    from: { address: s.senderAddress, name: s.senderName }, to: [{ address: e.auth.email() }],
    subject: "Your Dungeon Tracker admin code: " + code,
    html: "<p>Your code to open Site admin on Dungeon Tracker:</p><p style=\"font-size:28px;font-weight:700;letter-spacing:4px\">" + code + "</p>"
      + "<p>It works for 10 minutes. Didn’t ask for this? Someone may be signed in to your account: sign out everywhere and change your password.</p>",
  }));
  return e.json(200, { sent: e.auth.email() });
}, $apis.requireAuth("users"));

// POST /api/admin/unlock {code} → {token, until} — swaps a right code for a 30-minute unlock token
routerAdd("POST", "/api/admin/unlock", (e) => {
  const u = require(`${__hooks}/admin_utils.js`);
  if (!u.isAdmin(e.auth)) throw new NotFoundError("Not found.");
  const key = "adm:" + e.auth.id; let p = null; try { p = JSON.parse(String($app.store().get(key) || "")); } catch (_) {}
  if (!p || Date.now() - p.at > 600000 || p.tries >= 5) { $app.store().remove(key); throw new BadRequestError("That code has run out. Ask for a new one."); }
  const code = String((e.requestInfo().body || {}).code || "").replace(/\D/g, "");
  if (!$security.equal(code, p.code)) { p.tries++; $app.store().set(key, JSON.stringify(p)); throw new BadRequestError("That code isn’t right."); }
  $app.store().remove(key);
  const token = $security.randomString(40), until = Date.now() + u.UNLOCK_MS;
  $app.store().set("admtok:" + e.auth.id, JSON.stringify({ token, exp: until }));
  return e.json(200, { token, until });
}, $apis.requireAuth("users"));

// POST /api/admin/lock → {ok} — ends the unlock now
routerAdd("POST", "/api/admin/lock", (e) => {
  $app.store().remove("admtok:" + e.auth.id); return e.json(200, { ok: true });
}, $apis.requireAuth("users"));

// GET /api/admin/overview → {counts, feedback} — site numbers and the newest 100 feedback notes
routerAdd("GET", "/api/admin/overview", (e) => {
  require(`${__hooks}/admin_utils.js`).requireUnlocked(e);
  const n = (col, filter, params) => { try { return filter ? $app.countRecords(col, $dbx.exp(filter, params || {})) : $app.countRecords(col); } catch (_) { return null; } };
  const week = new Date(Date.now() - 7 * 864e5).toISOString().replace("T", " ");
  const counts = {
    users: n("users"), verified: n("users", "verified = 1"), newUsers7d: n("users", "created >= {:w}", { w: week }),
    characters: n("characters"), sharedParty: n("characters", "visibility = 'party'"), sharedAll: n("characters", "visibility = 'public'"),
    notes: n("notes"), feedback: n("feedback"),
  };
  const fb = $app.findRecordsByFilter("feedback", "id != ''", "-created", 100, 0).map(r => {
    let by = ""; const a = r.getString("author"); if (a) { try { by = $app.findRecordById("users", a).getString("username"); } catch (_) {} }
    return { id: r.id, kind: r.getString("kind"), text: r.getString("text"), contact: r.getString("contact"), page: r.getString("page"),
      device: r.getString("device"), by, created: r.getString("created") };
  });
  return e.json(200, { counts, feedback: fb });
}, $apis.requireAuth("users"));

// DELETE /api/admin/feedback/{id} → {ok} — removes one feedback note (dealt with)
routerAdd("DELETE", "/api/admin/feedback/{id}", (e) => {
  require(`${__hooks}/admin_utils.js`).requireUnlocked(e);
  const r = $app.findRecordById("feedback", e.request.pathValue("id")); $app.delete(r);
  return e.json(200, { ok: true });
}, $apis.requireAuth("users"));
