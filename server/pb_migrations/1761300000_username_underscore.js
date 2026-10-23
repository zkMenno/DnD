/// <reference path="../pb_data/types.d.ts" />
// 23 Oct 2026: usernames may contain underscores (menno_test). Same rule as NAME in pb_hooks/ddb_utils.js.
// Up: allows "_" in the username pattern. Down: back to letters, digits and dashes only.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.getByName("username").pattern = "^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$";
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.getByName("username").pattern = "^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$";
  app.save(users);
});
