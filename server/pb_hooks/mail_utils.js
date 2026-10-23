// The look of every email Dungeon Tracker sends: sign-in codes (PocketBase's own OTP mail), account codes
// (account.pb.js), the admin code (admin.pb.js) and notices. One layout in the front page's style: the dark
// navy page, a card with a thin gold edge, the d20 logo and name in gold small capitals, the code in a gold-framed
// box, and the small print at the bottom.
// Email clients ignore most CSS: the layout is tables with inline styles, system and Georgia fonts (no web fonts),
// and the logo is the site's PNG icon. Not a hook file (no .pb.js); hooks require() it inside their handlers.
// layout() also gives PocketBase's templates ({OTP}, {ACTION_URL}… placeholders pass through untouched);
// ddb.pb.js sets those at start-up, so this file is the only place the emails are designed.

const C = { page: "#0E151E", card: "#16212D", edge: "#5A4A26", gold: "#E3B04B", ink: "#EDE3CC", muted: "#A9B3BF", box: "#0F1822" };
const SITE = "https://dungeontracker.com";

// Escapes text for HTML (names and addresses that go into a mail).
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
module.exports.esc = esc;

// The whole email as HTML. o: { title, lead (HTML), code (text, or a {PLACEHOLDER}), after (HTML), button: {href, text},
// note (HTML: the small print, e.g. "Didn't ask for this?…") }. Every part but title is optional.
module.exports.layout = function layout(o) {
  const p = (html, extra) => '<p style="margin:0 0 14px;font:16px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:' + C.ink + ';' + (extra || "") + '">' + html + "</p>";
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>' + esc(o.title) + "</title></head>"
    + '<body style="margin:0;padding:0;background:' + C.page + '">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.page + ';padding:28px 12px"><tr><td align="center">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">'
    // the logo row
    + '<tr><td style="padding:0 4px 16px"><a href="' + SITE + '" style="text-decoration:none"><img src="' + SITE + '/icon-192.png" width="32" height="32" alt="" style="vertical-align:middle;border:0;border-radius:8px">'
    + '<span style="vertical-align:middle;margin-left:10px;font:700 18px/1 Georgia,\'Times New Roman\',serif;letter-spacing:.06em;font-variant:small-caps;color:' + C.gold + '">Dungeon Tracker</span></a></td></tr>'
    // the card
    + '<tr><td style="background:' + C.card + ';border:1px solid ' + C.edge + ';border-radius:16px;padding:26px 24px">'
    + '<h1 style="margin:0 0 14px;font:700 22px/1.25 Georgia,\'Times New Roman\',serif;font-variant:small-caps;letter-spacing:.03em;color:' + C.ink + '">' + esc(o.title) + "</h1>"
    + (o.lead ? p(o.lead) : "")
    + (o.code ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td style="background:' + C.box + ';border:1.5px solid ' + C.gold + ';border-radius:12px;padding:14px 22px;'
      + 'font:700 32px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:8px;color:' + C.gold + '">' + o.code + "</td></tr></table>" : "")
    + (o.button ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td style="background:' + C.gold + ';border-radius:999px">'
      + '<a href="' + o.button.href + '" style="display:inline-block;padding:12px 22px;font:700 16px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1B140C;text-decoration:none">' + esc(o.button.text) + "</a></td></tr></table>" : "")
    + (o.after ? p(o.after, "color:" + C.muted + ";") : "")
    + (o.note ? '<p style="margin:18px 0 0;padding-top:14px;border-top:1px solid ' + C.edge + ';font:13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:' + C.muted + '">' + o.note + "</p>" : "")
    + "</td></tr>"
    // the footer
    + '<tr><td style="padding:16px 4px 0;font:12px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:' + C.muted + '">'
    + '<a href="' + SITE + '" style="color:' + C.muted + '">dungeontracker.com</a> · an unofficial fan project, not affiliated with Wizards of the Coast or D&amp;D Beyond. This is an automatic email; replies aren’t read.</td></tr>'
    + "</table></td></tr></table></body></html>";
};

// A ready-to-send code mail for the account and admin routes: { subject, html }. what completes "Your code to …".
module.exports.codeMail = function codeMail(code, what, note) {
  return { subject: "Your Dungeon Tracker code: " + code, html: module.exports.layout({
    title: "Your code", lead: "Here’s your code to " + esc(what) + ":", code: esc(code), after: "It works for 10 minutes.",
    note: note || "Didn’t ask for this? You can ignore this email: nothing changes without the code." }) };
};

// PocketBase's own templates for the users collection (sign-in code, and the rarely used link mails), in this
// layout. Placeholders ({OTP}, {ACTION_URL}, {APP_URL}) are filled in by PocketBase. Returns {field: {subject, body}}.
module.exports.pbTemplates = function pbTemplates() {
  const L = module.exports.layout;
  return {
    otp: { subject: "{OTP} is your Dungeon Tracker code", body: L({ title: "Your sign-in code", lead: "Type this code into the sign-in screen:", code: "{OTP}",
      after: "It works for 10 minutes.", note: "Didn’t ask for a code? You can ignore this email: nothing happens without it." }) },
    verification: { subject: "Confirm your email for Dungeon Tracker", body: L({ title: "Confirm your email", lead: "One tap to confirm this address for your Dungeon Tracker account.",
      button: { href: "{ACTION_URL}", text: "Confirm my email" }, note: "Didn’t sign up? You can ignore this email." }) },
    resetPassword: { subject: "Reset your Dungeon Tracker password", body: L({ title: "Reset your password", lead: "Choose a new password for your Dungeon Tracker account.",
      button: { href: "{ACTION_URL}", text: "Choose a new password" }, note: "Didn’t ask for this? You can ignore this email: your password stays as it is." }) },
    confirmEmailChange: { subject: "Confirm your new email for Dungeon Tracker", body: L({ title: "Confirm your new email", lead: "Confirm that your Dungeon Tracker account should sign in with this address from now on.",
      button: { href: "{ACTION_URL}", text: "Confirm the new email" }, note: "Didn’t ask for this? You can ignore this email: nothing changes." }) },
  };
};
