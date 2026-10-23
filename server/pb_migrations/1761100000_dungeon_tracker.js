/// <reference path="../pb_data/types.d.ts" />
// v2 (22 Oct 2026): the app is called Dungeon Tracker, and accounts can sign in with an OAuth2 provider (Google,
// Microsoft, Apple…). Which providers show on the sign-in screen is set in the dashboard:
// Collections → users → Options → OAuth2 (each needs a client id + secret from that provider;
// redirect URL https://dungeontracker.com/api/oauth2-redirect).
// The sign-in screen lists only the providers that are filled in, so nothing shows until one is set up.
// Up: renames the app and turns OAuth2 on for users. Down: turns OAuth2 off again (the name stays).
migrate((app) => {
  const s = app.settings();
  s.meta.appName = "Dungeon Tracker";
  app.save(s);

  const users = app.findCollectionByNameOrId("users");
  users.oauth2.enabled = true;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.oauth2.enabled = false;
  app.save(users);
});
