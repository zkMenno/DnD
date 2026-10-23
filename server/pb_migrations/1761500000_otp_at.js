/// <reference path="../pb_data/types.d.ts" />
// 23 Oct 2026: users.otp_at — when the player last signed in with an emailed code. For 24 hours after that, the
// home page lets them save a first password without a second email (pb_hooks/account.pb.js). It used to live in
// memory only, so a server restart (every deploy) lost it and saving the password quietly failed.
// Hidden: never sent to the browser.
// Up: adds users.otp_at. Down: removes it.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new DateField({ name: "otp_at", hidden: true }));
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("otp_at");
  app.save(users);
});
