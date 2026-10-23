/// <reference path="../pb_data/types.d.ts" />
// ── Account settings: set or change your password, change your email ──────────────────────────────
// Most players sign in with emailed codes and never had a password, so neither change asks for the old one.
// Instead both use 6-digit codes: for a password one goes to your current email; for a new email one goes to the new
// address (proving you can read it) AND one to your current address (proving it's you, not someone holding your
// signed-in phone), and the old address gets a notice afterwards. Codes live 10 minutes in memory, 5 tries, one
// request per minute.
//   POST /api/account/code     {purpose: "password"} | {purpose: "email", email}
//   POST /api/account/confirm  {code, code2?, password?}  → sets the password, or the new (verified) email
// (handlers run in their own VMs, so constants live inside them)
routerAdd("POST", "/api/account/code", (e) => {
  const body = e.requestInfo().body || {}, me = e.auth;
  const purpose = body.purpose === "email" ? "email" : "password";
  let to = me.email();
  // one request a minute, checked first (so the "already has an account" answer below can't be asked for in bulk)
  const key = "acct:" + me.id, ask = "acct-ask:" + me.id, prev = Number($app.store().get(ask) || 0);
  if (prev && Date.now() - prev < 60000) throw new BadRequestError("A code is on its way. Wait a minute before asking for another.");
  if (purpose === "email") {
    to = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 200) throw new BadRequestError("That doesn’t look like an email address.");
    if (to === me.email().toLowerCase()) throw new BadRequestError("That’s already your email.");
  }
  $app.store().set(ask, String(Date.now()));   // from here on the request counts (a typo above doesn't)
  if (purpose === "email") {
    // an address that already has an account gets the same answer as any other, so this can't be used to find out who
    // has one; no code goes there, so the change can never be confirmed
    let taken = false; try { $app.findAuthRecordByEmail("users", to); taken = true; } catch (_) {}
    if (taken) return e.json(200, { sent: to, current: me.email() });
  }
  const code = $security.randomStringWithAlphabet(6, "0123456789");
  const code2 = purpose === "email" ? $security.randomStringWithAlphabet(6, "0123456789") : "";
  $app.store().set(key, JSON.stringify({ purpose, to, code, code2, at: Date.now(), tries: 0 }));
  const s = $app.settings().meta;
  const mail = (addr, c, what) => $app.newMailClient().send(new MailerMessage({
    from: { address: s.senderAddress, name: s.senderName },
    to: [{ address: addr }],
    subject: "Your Dungeon Tracker code: " + c,
    html: "<p>Your code to " + what + " on Dungeon Tracker:</p><p style=\"font-size:28px;font-weight:700;letter-spacing:4px\">" + c + "</p>"
      + "<p>It works for 10 minutes. Didn’t ask for this? Ignore this email: nothing changes without the code.</p>",
  }));
  if (purpose === "email") { mail(to, code, "change your email to this address"); mail(me.email(), code2, "move your account to a new email address (" + to.replace(/[<>&"]/g, "") + ")"); }
  else mail(to, code, "set a new password");
  return e.json(200, { sent: to, current: purpose === "email" ? me.email() : "" });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/account/confirm", (e) => {
  const body = e.requestInfo().body || {}, key = "acct:" + e.auth.id, raw = String($app.store().get(key) || "");
  if (!raw) throw new BadRequestError("Ask for a code first.");
  const st = JSON.parse(raw);
  if (Date.now() - st.at > 10 * 60 * 1000) { $app.store().remove(key); throw new BadRequestError("That code has expired. Ask for a new one."); }
  const pw = String(body.password || "");
  if (st.purpose === "password" && (pw.length < 8 || pw.length > 72)) throw new BadRequestError("Passwords are 8 to 72 characters.");
  if (String(body.code || "").trim() !== st.code || (st.code2 && String(body.code2 || "").trim() !== st.code2)) {
    st.tries++; if (st.tries >= 5) $app.store().remove(key); else $app.store().set(key, JSON.stringify(st));
    throw new BadRequestError(st.tries >= 5 ? "Too many wrong codes. Ask for a new one." : (st.code2 ? "One of the codes isn’t right." : "That code isn’t right."));
  }
  const rec = $app.findRecordById("users", e.auth.id);
  if (st.purpose === "password") { rec.setPassword(pw); rec.set("pw_set", true); }
  else {
    let taken = false; try { $app.findAuthRecordByEmail("users", st.to); taken = true; } catch (_) {}
    if (taken) { $app.store().remove(key); throw new BadRequestError("That email already has a Dungeon Tracker account."); }
    rec.setEmail(st.to); rec.setVerified(true);
  }
  const old = e.auth.email();
  $app.save(rec); $app.store().remove(key); $app.store().remove("acct-ask:" + e.auth.id);   // done: a new request may follow straight away
  if (st.purpose === "email") {   // a heads-up to the address the account just left
    const s = $app.settings().meta;
    try { $app.newMailClient().send(new MailerMessage({ from: { address: s.senderAddress, name: s.senderName }, to: [{ address: old }],
      subject: "Your Dungeon Tracker account moved to a new email",
      html: "<p>Your Dungeon Tracker account now signs in with <b>" + st.to.replace(/[<>&"]/g, "") + "</b> instead of this address.</p><p>If that wasn’t you, reply to this email straight away.</p>" })); } catch (_) {}
  }
  // a new email or password signs out old sessions (PocketBase rotates the token key): hand this one a fresh token
  return e.json(200, { ok: true, purpose: st.purpose, email: rec.email(), token: rec.newAuthToken(), record: rec });
}, $apis.requireAuth("users"));

// A password right after signing in with an emailed code, no second code needed: the code just proved the address.
//  - no password yet (the "Save a password for next time" card): within a day of that code sign-in
//  - "Forgot your password?" on the sign-in page (sign in with a code, then choose a new one): within 15 minutes
// Outside those windows the answer is "fresh-code-needed" and the page asks for a code (POST /code, then /confirm).
//   POST /api/account/first-password {password}
routerAdd("POST", "/api/account/first-password", (e) => {
  const rec = $app.findRecordById("users", e.auth.id), pw = String((e.requestInfo().body || {}).password || "");
  const at = rec.getDateTime("otp_at"), window = rec.getBool("pw_set") ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;
  if (at.isZero() || Date.now() - at.unix() * 1000 > window) throw new BadRequestError("fresh-code-needed");
  if (pw.length < 8 || pw.length > 72) throw new BadRequestError("Passwords are 8 to 72 characters.");
  rec.setPassword(pw); rec.set("pw_set", true);
  rec.set("otp_at", null);   // one password per code sign-in
  $app.save(rec);
  return e.json(200, { ok: true, email: rec.email(), token: rec.newAuthToken(), record: rec });
}, $apis.requireAuth("users"));

// Sign out everywhere else: a new token key ends every session, then this device gets a fresh token.
//   POST /api/account/signout-all
routerAdd("POST", "/api/account/signout-all", (e) => {
  const rec = $app.findRecordById("users", e.auth.id);
  rec.refreshTokenKey(); $app.save(rec);
  return e.json(200, { ok: true, email: rec.email(), token: rec.newAuthToken(), record: rec });
}, $apis.requireAuth("users"));

// Remove the password: back to emailed codes only. A random password nobody knows replaces it (which also ends other
// sessions); this device gets a fresh token.
//   POST /api/account/remove-password
routerAdd("POST", "/api/account/remove-password", (e) => {
  const rec = $app.findRecordById("users", e.auth.id);
  if (!rec.getBool("pw_set")) throw new BadRequestError("You don’t have a password to remove.");
  rec.setRandomPassword(); rec.set("pw_set", false); $app.save(rec);
  return e.json(200, { ok: true, email: rec.email(), token: rec.newAuthToken(), record: rec });
}, $apis.requireAuth("users"));
