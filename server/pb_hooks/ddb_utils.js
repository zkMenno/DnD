// Shared helpers for the hooks (each handler runs in its own isolated VM, so handlers require() this file).

// ── Usernames (sheet links: /<username>/<D&D Beyond id>) ─────────────────────────────────────────────
// Names that would clash with the app's own pages and files, or read as official.
const RESERVED = ["api", "admin", "sheet", "sheets", "engine", "packs", "index", "login", "logout", "signin", "signup",
  "settings", "account", "help", "about", "static", "assets", "www", "app", "me", "new", "user", "users", "party",
  "dm", "support", "root", "system", "official", "dndbeyond", "player"];
const NAME = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
// a valid, free username, or a BadRequestError saying why not
module.exports.checkUsername = function checkUsername(name, selfId) {
  const n = String(name || "").trim().toLowerCase();
  if (!NAME.test(n) || n.indexOf("--") >= 0) throw new BadRequestError("Usernames are 3–20 letters, digits or dashes (no dash at the start or end).");
  if (RESERVED.indexOf(n) >= 0) throw new BadRequestError("That username is taken.");
  try { const u = $app.findFirstRecordByFilter("users", "username = {:n}", { n }); if (u && u.id !== selfId) throw new BadRequestError("That username is taken."); }
  catch (e) { if (e instanceof BadRequestError) throw e; }   // not found: free
  return n;
};
// a character's handle in links: its owner's username
module.exports.ownerHandle = rec => $app.findRecordById("users", rec.getString("owner")).getString("username");
// a free player-xxxxx name for a new account (changeable later)
module.exports.newUsername = function newUsername() {
  for (let i = 0; i < 20; i++) {
    const n = "player-" + $security.randomStringWithAlphabet(5, "abcdefghjkmnpqrstuvwxyz23456789");
    try { $app.findFirstRecordByFilter("users", "username = {:n}", { n }); } catch (_) { return n; }
  }
  throw new BadRequestError("Couldn't pick a username. Try again.");
};

// Characters that have their own pack (theme, wording). Everyone else gets "bare". Decided here, never by the browser.
const PACKS = { 170557047: "henry" };
module.exports.packFor = id => PACKS[id] || "bare";

// ── D&D Beyond ──────────────────────────────────────────────────────────────────────────────────────
// One public character as D&D Beyond's JSON. Answers are kept for 60 s in the app store, so a sync
// (proxy fetch + record update) or a burst of opens costs D&D Beyond one request, not several.
const TTL_MS = 60000, MAX_BYTES = 3000000;
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
  if (res.statusCode !== 200) throw new BadRequestError("D&D Beyond answered " + res.statusCode + ". Is the character public?");
  if (res.raw.length > MAX_BYTES) throw new BadRequestError("That character is too big to read.");
  const raw = String(res.raw);
  const st = $app.store(), now = Date.now();
  for (const k of Object.keys(st.getAll() || {})) {   // drop expired answers so the cache never grows
    if (k.indexOf("ddb:") === 0 && now - Number(String(st.get(k)).split("|")[0]) >= TTL_MS) st.remove(k);
  }
  st.set(key, now + "|" + raw);   // a plain string: hook VMs don't share JS objects
  return { raw, json: JSON.parse(raw) };
};

// name + campaign: these decide who counts as party, so they always come from D&D Beyond
module.exports.ddbFacts = function ddbFacts(id) {
  const d = (module.exports.ddbGet(id).json || {}).data || {};
  return { name: String(d.name || "").slice(0, 120), campaign: d.campaign && d.campaign.id ? String(d.campaign.id) : "" };
};

// The text fields a player can write in on D&D Beyond (Notes and Backstory). Verify codes are looked for only
// here: other parts of the JSON (campaign roster, other characters' names) are written by other people.
module.exports.ownText = function ownText(json) {
  const d = (json || {}).data || {}, n = d.notes || {}, t = d.traits || {};
  return [n.backstory, n.otherNotes, n.allies, n.enemies, n.organizations, n.personalPossessions, n.otherHoldings,
    t.personalityTraits, t.ideals, t.bonds, t.flaws, t.appearance].filter(v => typeof v === "string").join("\n");
};

// ── Stored JSON: no markup ──────────────────────────────────────────────────────────────────────────
// Sheets (data) and trackers (play.state) are shown to other people when shared. The app strips HTML when it
// compacts D&D Beyond's data and never stores markup itself, so any tag-like string means a hand-made request:
// refuse it. The engine escapes what it shows as well; this is the second lock.
const TAG = /<\s*[a-zA-Z!/?]/;
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
