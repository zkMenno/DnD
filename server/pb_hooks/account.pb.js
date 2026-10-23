/// <reference path="../pb_data/types.d.ts" />
// ── Account settings: set or change your password, change your email ──────────────────────────────
// Most players sign in with emailed codes and never had a password, so neither change asks for the old one.
// Instead both use a 6-digit code: for a password it goes to your current email, for a new email it goes to that
// new address (proving you can read it). Codes live 10 minutes in memory, 5 tries, one new code per minute.
//   POST /api/account/code     {purpose: "password"} | {purpose: "email", email}
//   POST /api/account/confirm  {code, password?}  → sets the password, or the new (verified) email
// (handlers run in their own VMs, so constants live inside them)
routerAdd("POST", "/api/account/code", (e) => {
  const body = e.requestInfo().body || {}, me = e.auth;
  const purpose = body.purpose === "email" ? "email" : "password";
  let to = me.email();
  if (purpose === "email") {
    to = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 200) throw new BadRequestError("That doesn’t look like an email address.");
    if (to === me.email().toLowerCase()) throw new BadRequestError("That’s already your email.");
    let taken = false; try { $app.findAuthRecordByEmail("users", to); taken = true; } catch (_) {}
    if (taken) throw new BadRequestError("That email already has a Dungeon Tracker account.");
  }
  const key = "acct:" + me.id, prev = String($app.store().get(key) || "");
  if (prev && Date.now() - JSON.parse(prev).at < 60000) throw new BadRequestError("A code is on its way. Wait a minute before asking for another.");
  const code = $security.randomStringWithAlphabet(6, "0123456789");
  $app.store().set(key, JSON.stringify({ purpose, to, code, at: Date.now(), tries: 0 }));
  const s = $app.settings().meta, what = purpose === "email" ? "change your email to this address" : "set a new password";
  $app.newMailClient().send(new MailerMessage({
    from: { address: s.senderAddress, name: s.senderName },
    to: [{ address: to }],
    subject: "Your Dungeon Tracker code: " + code,
    html: "<p>Your code to " + what + " on Dungeon Tracker:</p><p style=\"font-size:28px;font-weight:700;letter-spacing:4px\">" + code + "</p>"
      + "<p>It works for 10 minutes. Didn’t ask for this? Ignore this email: nothing changes without the code.</p>",
  }));
  return e.json(200, { sent: to });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/account/confirm", (e) => {
  const body = e.requestInfo().body || {}, key = "acct:" + e.auth.id, raw = String($app.store().get(key) || "");
  if (!raw) throw new BadRequestError("Ask for a code first.");
  const st = JSON.parse(raw);
  if (Date.now() - st.at > 10 * 60 * 1000) { $app.store().remove(key); throw new BadRequestError("That code has expired. Ask for a new one."); }
  const pw = String(body.password || "");
  if (st.purpose === "password" && (pw.length < 8 || pw.length > 72)) throw new BadRequestError("Passwords are 8 to 72 characters.");
  if (String(body.code || "").trim() !== st.code) {
    st.tries++; if (st.tries >= 5) $app.store().remove(key); else $app.store().set(key, JSON.stringify(st));
    throw new BadRequestError(st.tries >= 5 ? "Too many wrong codes. Ask for a new one." : "That code isn’t right.");
  }
  const rec = $app.findRecordById("users", e.auth.id);
  if (st.purpose === "password") { rec.setPassword(pw); rec.set("pw_set", true); }
  else {
    let taken = false; try { $app.findAuthRecordByEmail("users", st.to); taken = true; } catch (_) {}
    if (taken) { $app.store().remove(key); throw new BadRequestError("That email already has a Dungeon Tracker account."); }
    rec.setEmail(st.to); rec.setVerified(true);
  }
  $app.save(rec); $app.store().remove(key);
  // a new email or password signs out old sessions (PocketBase rotates the token key): hand this one a fresh token
  return e.json(200, { ok: true, purpose: st.purpose, email: rec.email(), token: rec.newAuthToken(), record: rec });
}, $apis.requireAuth("users"));

// First password right after signing in with an emailed code (within a day of that sign-in, for an account that never
// had a password chosen): no second code needed — the emailed code just proved the address.
//   POST /api/account/first-password {password}
routerAdd("POST", "/api/account/first-password", (e) => {
  const rec = $app.findRecordById("users", e.auth.id), pw = String((e.requestInfo().body || {}).password || "");
  if (rec.getBool("pw_set")) throw new BadRequestError("You already have a password. Change it under Sign-in & security.");
  const at = rec.getDateTime("otp_at");
  if (at.isZero() || Date.now() - at.unix() * 1000 > 24 * 60 * 60 * 1000) throw new BadRequestError("fresh-code-needed");
  if (pw.length < 8 || pw.length > 72) throw new BadRequestError("Passwords are 8 to 72 characters.");
  rec.setPassword(pw); rec.set("pw_set", true); $app.save(rec);
  return e.json(200, { ok: true, email: rec.email(), token: rec.newAuthToken(), record: rec });
}, $apis.requireAuth("users"));
