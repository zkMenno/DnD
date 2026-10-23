// Shared helpers for the server hooks: usernames, character packs, the D&D Beyond fetch (with a 60 s cache), the
// player's own text for verify codes, and the no-markup check on stored JSON.
// Not a hook file itself (no .pb.js), so PocketBase doesn't load it on its own. Each hook handler runs in its own
// JS VM and can't see the hook file's top-level constants, so handlers in ddb.pb.js call
// require(`${__hooks}/ddb_utils.js`) inside the handler. Constants in this file are fine: they belong to the module.
// Errors are thrown as BadRequestError, with a message written for the player.

// ── Usernames (sheet links: /<username>/<D&D Beyond id>) ───────────────────────────────────────────────────
// Names that would clash with the app's own pages and files, or read as official.
const RESERVED = ["api", "admin", "sheet", "sheets", "engine", "packs", "index", "login", "logout", "signin", "signup",
  "settings", "account", "help", "about", "static", "assets", "www", "app", "me", "new", "user", "users", "party",
  "dm", "support", "root", "system", "official", "dndbeyond", "player",
  // look official or invite scams: staff titles, the app's and companies' names, money and security words
  "administrator", "admins", "mod", "mods", "moderator", "moderators", "staff", "team", "owner", "operator", "sysop", "superuser",
  "helpdesk", "service", "security", "abuse", "noreply", "no-reply", "postmaster", "webmaster", "hostmaster", "info", "contact",
  "billing", "payment", "payments", "invoice", "verify", "verification", "password", "reset", "auth", "oauth", "sso", "mail", "email",
  "dungeontracker", "dungeon-tracker", "tracker", "dnd", "dnd-beyond", "beyond", "wizards", "wotc", "hasbro", "dungeonsanddragons",
  "status", "privacy", "legal", "terms", "tos", "blog", "news", "docs", "dev", "staging", "test", "demo", "media", "img", "fonts",
  "profile", "profiles", "campaign", "campaigns", "invite", "invites", "home", "dashboard", "null", "undefined", "anonymous", "guest"];
// 3–20 characters, letters/digits at both ends. Same rule as the users.username pattern (migration 1761300000)
// and the sheet-link route in pocketbase-main.go.
const NAME = /^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/;
// Lowercases and checks a username: the clean name if it is valid and free (or already selfId's), otherwise a
// BadRequestError saying why not. A failed lookup means nobody has it.
module.exports.checkUsername = function checkUsername(name, selfId) {
  const n = String(name || "").trim().toLowerCase();
  if (!NAME.test(n) || /[-_]{2}/.test(n)) throw new BadRequestError("Usernames are 3–20 letters, digits, dashes or underscores (not at the start or end, and not two in a row).");
  if (RESERVED.indexOf(n) >= 0) throw new BadRequestError("That username is taken.");
  try { const u = $app.findFirstRecordByFilter("users", "username = {:n}", { n }); if (u && u.id !== selfId) throw new BadRequestError("That username is taken."); }
  catch (e) { if (e instanceof BadRequestError) throw e; }   // not found: free
  return n;
};
// A character's handle in links: its owner's username (read fresh, so it follows a rename).
module.exports.ownerHandle = rec => $app.findRecordById("users", rec.getString("owner")).getString("username");
// A free player-xxxxx name for a new account (changeable later). Five letters/digits without look-alikes
// (no i, l, o, 0, 1); gives up after 20 tries.
module.exports.newUsername = function newUsername() {
  for (let i = 0; i < 20; i++) {
    const n = "player-" + $security.randomStringWithAlphabet(5, "abcdefghjkmnpqrstuvwxyz23456789");
    try { $app.findFirstRecordByFilter("users", "username = {:n}", { n }); } catch (_) { return n; }
  }
  throw new BadRequestError("Couldn't pick a username. Try again.");
};

// ── Character packs ────────────────────────────────────────────────────────────────────────────────────────
// Characters that have their own pack (theme, wording). Everyone else gets "bare". Decided here, never by the browser.
const PACKS = { 170557047: "henry" };
// The pack file name (packs/<name>.js) for a D&D Beyond character id.
module.exports.packFor = id => PACKS[id] || "bare";

// ── D&D Beyond ─────────────────────────────────────────────────────────────────────────────────────────────
const TTL_MS = 60000, MAX_BYTES = 3000000;
// One public character as D&D Beyond's JSON: { raw, json }. Answers are kept for 60 s in the app store, so a sync
// (proxy fetch + record update) or a burst of opens costs D&D Beyond one request, not several.
// Private, missing or failing sheets, and answers over 3 MB, become a BadRequestError the player can act on.
module.exports.ddbGet = function ddbGet(id) {
  id = String(id);
  if (!/^\d{4,12}$/.test(id)) throw new BadRequestError("Bad character id.");
  const key = "ddb:" + id, hit = String($app.store().get(key) || ""), cut = hit.indexOf("|");   // "<time>|<json>"
  if (cut > 0 && Date.now() - Number(hit.slice(0, cut)) < TTL_MS) { const raw = hit.slice(cut + 1); return { raw, json: JSON.parse(raw) }; }
  const res = $http.send({
    url: "https://character-service.dndbeyond.com/character/v5/character/" + id + "?includeCustomItems=true",
    method: "GET", timeout: 20,
    headers: { "accept": "application/json", "user-agent": "sheet-app/1.0" },
  });
  if (res.statusCode === 403 || res.statusCode === 401) throw new BadRequestError("This character sheet isn’t public yet. On D&D Beyond, open your character and go to Manage → Character Settings (scroll all the way down) → Character Privacy, and change it to Public. Then try again.");
  if (res.statusCode === 404) throw new BadRequestError("D&D Beyond can’t find that character. Check the link: it looks like dndbeyond.com/characters/12345678.");
  if (res.statusCode !== 200) throw new BadRequestError("D&D Beyond didn’t answer just now. Try again in a minute.");
  if (res.raw.length > MAX_BYTES) throw new BadRequestError("That character is too big to read.");
  const raw = String(res.raw);
  const st = $app.store(), now = Date.now();
  for (const k of Object.keys(st.getAll() || {})) {   // drop expired answers so the cache never grows
    if (k.indexOf("ddb:") === 0 && now - Number(String(st.get(k)).split("|")[0]) >= TTL_MS) st.remove(k);
  }
  st.set(key, now + "|" + raw);   // a plain string: hook VMs don't share JS objects
  return { raw, json: JSON.parse(raw) };
};

// The character's name and campaign id. These decide who counts as party, so they always come from D&D Beyond.
module.exports.ddbFacts = function ddbFacts(id) {
  const d = (module.exports.ddbGet(id).json || {}).data || {};
  return { name: String(d.name || "").slice(0, 120), campaign: d.campaign && d.campaign.id ? String(d.campaign.id) : "" };
};

// The text fields a player can write in on D&D Beyond (Notes, Backstory and traits), joined into one string.
// Verify codes are looked for only here: other parts of the JSON (campaign roster, other characters' names) are
// written by other people.
module.exports.ownText = function ownText(json) {
  const d = (json || {}).data || {}, n = d.notes || {}, t = d.traits || {};
  return [n.backstory, n.otherNotes, n.allies, n.enemies, n.organizations, n.personalPossessions, n.otherHoldings,
    t.personalityTraits, t.ideals, t.bonds, t.flaws, t.appearance].filter(v => typeof v === "string").join("\n");
};

// ── Stored JSON: no markup ─────────────────────────────────────────────────────────────────────────────────
// Sheets (data) and trackers (play.state) are shown to other people when shared. The app strips HTML when it
// compacts D&D Beyond's data and never stores markup itself, so any tag-like string means a hand-made request:
// refuse it. The engine escapes what it shows as well; this is the second lock.
// A "<" that starts a tag, comment or doctype. A plain "<" in text ("HP < 10", "<3") is fine.
const TAG = /<\s*[a-zA-Z!/?]/;
// Throws a BadRequestError ("<what> can't contain HTML.") if any string or key in v looks like markup. Walks at most
// 200,000 values, so a huge or deeply nested body is refused instead of tying up the server.
module.exports.assertNoMarkup = function assertNoMarkup(v, what) {
  let n = 0;
  const walk = x => {
    if (++n > 200000) throw new BadRequestError(what + " is too big.");
    if (typeof x === "string") { if (TAG.test(x)) throw new BadRequestError(what + " can't contain HTML."); }
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") Object.keys(x).forEach(k => { if (TAG.test(k)) throw new BadRequestError(what + " can't contain HTML."); walk(x[k]); });
  };
  walk(v);
};
