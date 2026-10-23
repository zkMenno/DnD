/// <reference path="../pb_data/types.d.ts" />
// 22 Oct 2026, the first schema: accounts, characters, trackers (play), notes, and the server settings. One file,
// written before the first deploy. Later changes go in new migrations next to this one, never in here: a server
// that already ran it would never see an edit. Migrations run in file-name order, so this one always comes first.
//
// Who sees what
//   • A character record is one account's copy of a public D&D Beyond character ("tracker"). Anyone can add any
//     public character; each account gets its own, unlinked copy. One copy per character per account.
//   • Trackers (play) and notes are the owner's. visibility opens them read-only: "party" = verified characters in
//     the same D&D Beyond campaign, "public" = anyone signed in.
//   • Verified ("this account can edit the D&D Beyond sheet", proven by a code; see hooks) unlocks party features.
//   • Server-set, never from the browser: owner checks, verified, claim_code, name, campaign, pack, handle (hooks),
//     and a note's author name + campaign. Nothing can be moved to another character, scope or campaign.
// Up: adds the collections, rules and settings below. Down: drops notes, play and characters, removes the username
// field and turns code sign-in off (the settings stay).
migrate((app) => {
  // ── users: sign in with an emailed code (or a password); a username for sheet links ──────────────────────
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new TextField({ name: "username", min: 3, max: 20, pattern: "^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$" }));   // /<username>/<D&D Beyond id>
  users.indexes = (users.indexes || []).concat(["CREATE UNIQUE INDEX idx_users_username ON users (username) WHERE username != ''"]);
  users.otp.enabled = true; users.otp.length = 6; users.otp.duration = 600;   // 6 digits, 10 minutes
  users.otp.emailTemplate.subject = "{OTP} is your code for {APP_NAME}";
  users.otp.emailTemplate.body = "<p>Hello,</p>"
    + "<p>Your sign-in code is:</p><p style=\"font-size:28px;letter-spacing:4px\"><strong>{OTP}</strong></p>"
    + "<p>Type it into the sign-in screen. It works for 10 minutes.</p>"
    + "<p><i>Didn't ask for a code? You can ignore this email; nothing happens without it.</i></p>";
  users.authAlert.enabled = false;   // no "new location" mails: with codes every new phone would trigger one
  app.save(users);

  // A character is visible to its owner, to verified party members in the same campaign (when shared with the party)
  // and to anyone signed in (when public). Only the owner writes; the hooks fill in the server-set fields.
  // ── characters ───────────────────────────────────────────────────────────────────────────────────────────
  const OWN   = 'owner = @request.auth.id';
  const PARTY = '(visibility = "party" && verified = true && campaign != "" && @collection.characters.owner ?= @request.auth.id'
    + ' && @collection.characters.verified ?= true && @collection.characters.campaign ?= campaign)';
  const PUB   = '(visibility = "public" && @request.auth.id != "")';
  const SERVER_ONLY = '@request.body.verified:isset = false && @request.body.claim_code:isset = false';
  const characters = new Collection({
    type: "base", name: "characters",
    listRule: `${OWN} || ${PARTY} || ${PUB}`, viewRule: `${OWN} || ${PARTY} || ${PUB}`,
    createRule: `@request.auth.id != "" && ${OWN} && ${SERVER_ONLY}`,
    updateRule: `${OWN} && @request.body.owner:isset = false && ${SERVER_ONLY}`,
    deleteRule: OWN,
    fields: [
      { name: "ddb_id",     type: "number", required: true, onlyInt: true },
      { name: "owner",      type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "handle",     type: "text", max: 20 },                 // the owner's username (hooks): the link's first part
      { name: "name",       type: "text", max: 120 },                // from D&D Beyond (hooks)
      { name: "pack",       type: "text", max: 40 },                 // character pack file: henry, bare… (hooks)
      { name: "data",       type: "json", maxSize: 4000000 },        // the engine's compact() of the D&D Beyond sheet
      { name: "visibility", type: "select", maxSelect: 1, values: ["private", "party", "public"] },
      { name: "campaign",   type: "text", max: 40 },                 // D&D Beyond campaign id (hooks)
      { name: "verified",   type: "bool" },                          // set by the verify flow only
      { name: "claim_code", type: "text", max: 20, hidden: true },   // the pending verify code
      { name: "created",    type: "autodate", onCreate: true },
      { name: "updated",    type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_characters_owner_ddb ON characters (owner, ddb_id)",   // one copy per account
      "CREATE INDEX idx_characters_handle ON characters (handle, ddb_id)",            // finding a sheet by its link
    ],
  });
  app.save(characters);

  // ── play: one live tracker per character record ──────────────────────────────────────────────────────────
  const C_OWN   = 'character.owner = @request.auth.id';
  const C_PARTY = '(character.visibility = "party" && character.verified = true && character.campaign != "" && @collection.characters.owner ?= @request.auth.id'
    + ' && @collection.characters.verified ?= true && @collection.characters.campaign ?= character.campaign)';
  const C_PUB   = '(character.visibility = "public" && @request.auth.id != "")';
  const play = new Collection({
    type: "base", name: "play",
    listRule: `${C_OWN} || ${C_PARTY} || ${C_PUB}`, viewRule: `${C_OWN} || ${C_PARTY} || ${C_PUB}`,
    createRule: C_OWN, updateRule: `${C_OWN} && @request.body.character:isset = false`, deleteRule: C_OWN,
    fields: [
      { name: "character", type: "relation", required: true, collectionId: characters.id, maxSelect: 1, cascadeDelete: true },
      { name: "state",     type: "json", maxSize: 1000000 },        // the engine's S (no markup: hooks)
      { name: "updated",   type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [ "CREATE UNIQUE INDEX idx_play_character ON play (character)" ],
  });
  app.save(play);

  // ── notes: scope "own" = the character's log, "party" = the campaign's shared party log ──────────────────
  const PARTY_MEMBER = '@collection.characters.owner ?= @request.auth.id && @collection.characters.verified ?= true && @collection.characters.campaign ?= campaign';
  const notes = new Collection({
    type: "base", name: "notes",
    listRule: `(scope = "own" && (${C_OWN} || ${C_PARTY} || ${C_PUB})) || (scope = "party" && ${PARTY_MEMBER})`,
    viewRule: `(scope = "own" && (${C_OWN} || ${C_PARTY} || ${C_PUB})) || (scope = "party" && ${PARTY_MEMBER})`,
    createRule: `author = @request.auth.id && ((scope = "own" && ${C_OWN}) || (scope = "party" && ${C_OWN} && character.verified = true && campaign = character.campaign))`,
    updateRule: 'author = @request.auth.id && @request.body.author:isset = false && @request.body.character:isset = false'
      + ' && @request.body.scope:isset = false && @request.body.campaign:isset = false',
    deleteRule: 'author = @request.auth.id',
    fields: [
      { name: "character", type: "relation", required: true, collectionId: characters.id, maxSelect: 1, cascadeDelete: true },
      { name: "author",    type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },   // deleting an account deletes its notes
      { name: "scope",     type: "select", required: true, maxSelect: 1, values: ["own", "party"] },
      { name: "campaign",  type: "text", max: 40 },                  // party notes: the character's campaign (hooks)
      { name: "by",        type: "text", max: 120 },                 // party notes: the posting character's name (hooks)
      { name: "text",      type: "text", max: 20000 },
      { name: "kind",      type: "text", max: 20 },
      { name: "done",      type: "bool" },
      { name: "at",        type: "number" },
      { name: "session",   type: "number" },
      { name: "created",   type: "autodate", onCreate: true },
    ],
  });
  app.save(notes);

  // ── settings ─────────────────────────────────────────────────────────────────────────────────────────────
  const s = app.settings();
  s.meta.appName = "Character sheets";
  s.backups.cron = "15 3 * * *"; s.backups.cronMaxKeep = 7;          // nightly at 03:15, last 7 kept
  s.logs.maxDays = 5; s.logs.logIP = true;                          // request logs (with IP) for security, 5 days: stated on /legal.html
  s.trustedProxy.headers = ["X-Forwarded-For"]; s.trustedProxy.useLeftmostIP = false;   // behind Caddy: the last entry is the client
  s.rateLimits.enabled = true;
  // Per IP, sized for a whole party signing up on one café wifi on game night, not for a script.
  // The catch-all "/api/" stays last: later migrations insert their rules above it.
  s.rateLimits.rules = [
    { label: "*:requestOTP",       maxRequests: 20,  duration: 600, audience: "" },   // code emails
    { label: "*:authWithOTP",      maxRequests: 30,  duration: 60,  audience: "" },   // ~300 guesses in a code's 10 min: 0.03% of a 6-digit code
    { label: "*:authWithPassword", maxRequests: 20,  duration: 60,  audience: "" },
    { label: "users:create",       maxRequests: 20,  duration: 600, audience: "" },
    { label: "/api/ddb/",          maxRequests: 30,  duration: 60,  audience: "" },   // don't get the server blocked by D&D Beyond
    { label: "/api/claim/",        maxRequests: 20,  duration: 60,  audience: "" },
    { label: "/api/",              maxRequests: 600, duration: 60,  audience: "" },   // everything else: generous
  ];
  app.save(s);
}, (app) => {
  for (const n of ["notes", "play", "characters"]) { try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) {} }
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("username"); users.indexes = users.indexes.filter(i => !/idx_users_username/.test(i)); users.otp.enabled = false;
  app.save(users);
});
