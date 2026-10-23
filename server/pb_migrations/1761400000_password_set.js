/// <reference path="../pb_data/types.d.ts" />
// 23 Oct 2026: users.pw_set — the player chose a password (password sign-up, or set one later). Accounts made by an
// emailed code have a random one nobody knows; the home page then suggests saving a password, so signing in doesn't
// always cost an email. Server-set only (pb_hooks/account.pb.js, ddb.pb.js).
// Up: adds users.pw_set. Down: removes it.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new BoolField({ name: "pw_set" }));
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("pw_set");
  app.save(users);
});
