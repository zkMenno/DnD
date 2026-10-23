/// <reference path="../pb_data/types.d.ts" />
// Server hooks for the character sheets. Helpers live in ddb_utils.js (handlers run isolated, so each require()s it).
//   • the site's address (APP_URL) in the settings; security headers on every app page
//   • GET /api/ddb/{id}: D&D Beyond proxy (browsers can't fetch it: CORS)
//   • characters: name, campaign and pack come from the server; stored data and trackers may not hold markup
//   • verify-by-code (optional, unlocks party features)
//   • notes: party-log author name and campaign set by the server
//   • email codes double as sign-up
//   • usernames (sheet links /<username>/<D&D Beyond id>); characters carry their owner's as `handle`

// ── The site's own address ──────────────────────────────────────────────────────────────────────────
// Emails and the dashboard use settings.meta.appURL; the deploy passes APP_URL or ORIGIN (https://<domain>), so it's never
// left at PocketBase's http://localhost:8090 default.
onBootstrap((e) => {
  e.next();
  const url = $os.getenv("APP_URL") || $os.getenv("ORIGIN"), s = e.app.settings();   // AppInfra passes ORIGIN
  if (url && s.meta.appURL !== url) { s.meta.appURL = url; e.app.save(s); }
});

// GET /health: 200 while the server runs (the shared Caddy and Docker check it)
routerAdd("GET", "/health", (e) => e.string(200, "ok"));

// ── Security headers ────────────────────────────────────────────────────────────────────────────────
// A strict Content-Security-Policy: scripts only from this server (no inline scripts, no inline event handlers),
// so even a string that slipped past every other check can't run as code. The dashboard (/_/) has its own needs.
routerUse((e) => {
  const h = e.response.header();
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!e.request.url.path.startsWith("/_/")) {
    h.set("Content-Security-Policy", [
      "default-src 'self'", "script-src 'self'", "connect-src 'self'", "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'", "font-src 'self'",   // fonts are self-hosted (web/fonts): nothing loads from Google
      "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    ].join("; "));
    h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
  return e.next();
});

// ── D&D Beyond proxy (signed-in users; rate limited in the settings migration) ──────────────────────
routerAdd("GET", "/api/ddb/{id}", (e) => {
  return e.json(200, require(`${__hooks}/ddb_utils.js`).ddbGet(e.request.pathValue("id")).json);
}, $apis.requireAuth());

// ── Characters ──────────────────────────────────────────────────────────────────────────────────────
// campaign decides who counts as party, and the pack picks the code that runs: neither may come from the browser.
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/ddb_utils.js`), id = e.record.getInt("ddb_id"), f = u.ddbFacts(id);
  e.record.set("name", f.name); e.record.set("campaign", f.campaign); e.record.set("pack", u.packFor(id));
  e.record.set("handle", u.ownerHandle(e.record));
  if (!e.record.getString("visibility")) e.record.set("visibility", "private");
  u.assertNoMarkup(JSON.parse(e.record.getString("data") || "null"), "Character data");
  e.next();
}, "characters");
onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/ddb_utils.js`), o = e.record.original(), id = e.record.getInt("ddb_id");
  if (id !== o.getInt("ddb_id")) throw new BadRequestError("A sheet can't switch to another character.");
  e.record.set("pack", u.packFor(id)); e.record.set("handle", u.ownerHandle(e.record));
  // name and campaign are the server's, never the browser's: the campaign decides who counts as your party, so a
  // player must not be able to write someone else's campaign id into their own (verified) character
  e.record.set("name", o.getString("name")); e.record.set("campaign", o.getString("campaign"));
  // a new copy of the sheet (☰ Pull): check it, and refresh name + campaign. A sharing change alone costs no fetch.
  if (e.record.getString("data") !== o.getString("data")) {
    u.assertNoMarkup(JSON.parse(e.record.getString("data") || "null"), "Character data");
    const f = u.ddbFacts(id);
    e.record.set("name", f.name); e.record.set("campaign", f.campaign);
  }
  e.next();
}, "characters");

// trackers are shown to the party / public when shared: no markup in them either
onRecordCreateRequest((e) => { require(`${__hooks}/ddb_utils.js`).assertNoMarkup(JSON.parse(e.record.getString("state") || "null"), "Tracker"); e.next(); }, "play");
onRecordUpdateRequest((e) => { require(`${__hooks}/ddb_utils.js`).assertNoMarkup(JSON.parse(e.record.getString("state") || "null"), "Tracker"); e.next(); }, "play");

// ── Verify (optional): prove this account can edit the D&D Beyond sheet ─────────────────────────────
// POST /api/claim/{record}        → a one-time code to paste into the character's Notes or Backstory on D&D Beyond
// POST /api/claim/{record}/check  → the server reads the public sheet; if the code is in the player's own text
//                                   (Notes, Backstory, traits), the character is verified for this account and
//                                   un-verified for anyone who verified it before (newest proof wins)
routerAdd("POST", "/api/claim/{id}", (e) => {
  const rec = $app.findRecordById("characters", e.request.pathValue("id"));
  if (rec.getString("owner") !== e.auth.id) throw new ForbiddenError("Not your tracker.");
  let code = rec.getString("claim_code");
  if (!code) { code = "SHEET-" + $security.randomStringWithAlphabet(6, "ABCDEFGHJKMNPQRSTUVWXYZ23456789"); rec.set("claim_code", code); $app.save(rec); }
  return e.json(200, { code });
}, $apis.requireAuth());
routerAdd("POST", "/api/claim/{id}/check", (e) => {
  const u = require(`${__hooks}/ddb_utils.js`);
  const rec = $app.findRecordById("characters", e.request.pathValue("id"));
  if (rec.getString("owner") !== e.auth.id) throw new ForbiddenError("Not your tracker.");
  const code = rec.getString("claim_code");
  if (!code) throw new BadRequestError("Ask for a code first.");
  $app.store().remove("ddb:" + rec.getInt("ddb_id"));   // always read the sheet fresh here
  if (u.ownText(u.ddbGet(rec.getInt("ddb_id")).json).indexOf(code) < 0) return e.json(200, { verified: false });
  const others = $app.findRecordsByFilter("characters", "ddb_id = {:d} && verified = true && id != {:id}", "", 50, 0, { d: rec.getInt("ddb_id"), id: rec.id });
  for (const o of others) { o.set("verified", false); $app.save(o); }
  rec.set("verified", true); rec.set("claim_code", ""); $app.save(rec);
  return e.json(200, { verified: true });
}, $apis.requireAuth());

// ── Notes ───────────────────────────────────────────────────────────────────────────────────────────
// party log: "by" is the posting character's name and campaign its campaign, never what the browser says.
// Moving a note to another character, scope or campaign is blocked in the rules (pb_migrations/1761000000_schema.js).
onRecordCreateRequest((e) => {
  const ch = $app.findRecordById("characters", e.record.getString("character")), party = e.record.getString("scope") === "party";
  e.record.set("by", party ? ch.getString("name") : "");
  e.record.set("campaign", party ? ch.getString("campaign") : "");
  e.next();
}, "notes");
onRecordUpdateRequest((e) => { e.record.set("by", e.record.original().getString("by")); e.next(); }, "notes");

// ── Email codes double as sign-up ───────────────────────────────────────────────────────────────────
// A code asked for an unknown email creates the account first (random password nobody knows; they can set one
// later). Without the code nobody gets in, so this only adds an empty account. Rate limited per IP (settings).
onRecordRequestOTPRequest((e) => {
  if (!e.record) {
    const email = String((e.requestInfo().body || {}).email || "").trim().toLowerCase();
    if (email) {
      const r = new Record(e.collection);
      r.setEmail(email); r.setRandomPassword();
      $app.save(r);
      e.record = r;
    }
  }
  e.next();
}, "users");
// signing in with an emailed code proves the address: mark it verified
onRecordAuthWithOTPRequest((e) => {
  // first proof of this address: anything set on the account before it (a password someone typed while signing up with
  // an email that wasn't theirs) is dropped, so only the person who reads the mail gets in from now on
  if (e.record && !e.record.verified()) { e.record.setRandomPassword(); e.record.set("pw_set", false); e.record.setVerified(true); $app.save(e.record); }
  e.next();
  // remember when: lets /api/account/first-password skip a second email (a database field, so a restart doesn't lose it)
  if (e.record) { const r = $app.findRecordById("users", e.record.id); r.set("otp_at", new DateTime()); $app.saveNoValidate(r); }
}, "users");

// ── Usernames ───────────────────────────────────────────────────────────────────────────────────────
// Every account has one (sheet links are /<username>/<D&D Beyond id>): a player-xxxxx name at sign-up, by any route
// (password sign-up, or the email-code hook above saving a new account), which the player can change.
onRecordCreate((e) => {
  if (!e.record.getString("username")) e.record.set("username", require(`${__hooks}/ddb_utils.js`).newUsername());
  e.next();
}, "users");
onRecordCreateRequest((e) => {
  if (e.record.getString("username")) e.record.set("username", require(`${__hooks}/ddb_utils.js`).checkUsername(e.record.getString("username"), ""));
  e.record.set("pw_set", !!String((e.requestInfo().body || {}).password || ""));   // a password sign-up chose one
  e.next();
}, "users");
onRecordUpdateRequest((e) => {
  e.record.set("pw_set", e.record.original().getBool("pw_set"));   // server-set only
  e.record.set("otp_at", e.record.original().get("otp_at"));
  const n = e.record.getString("username");
  if (n !== e.record.original().getString("username")) e.record.set("username", require(`${__hooks}/ddb_utils.js`).checkUsername(n, e.record.id));
  e.next();
}, "users");
// a new username: the owner's characters follow (their links change with it)
onRecordUpdate((e) => {
  const before = e.record.original().getString("username");
  e.next();
  const after = e.record.getString("username");
  if (before === after) return;
  for (const ch of $app.findRecordsByFilter("characters", "owner = {:o}", "", 0, 0, { o: e.record.id })) { ch.set("handle", after); $app.save(ch); }
}, "users");
