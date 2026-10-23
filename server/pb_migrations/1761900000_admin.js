/// <reference path="../pb_data/types.d.ts" />
// 23 Oct 2026: users.admin — marks the site owner. Opens the Site admin tab on the home page (web/admin.js), behind
// an emailed one-time code (pb_hooks/admin.pb.js). Hidden: never sent to the browser, and only the superuser can set
// it (PocketBase dashboard → users → the account → admin). Nobody is an admin until it's ticked there.
// Up: adds users.admin and a rate limit for /api/admin/. Down: removes both.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new BoolField({ name: "admin", hidden: true }));
  app.save(users);
  // the admin routes: 20 requests a minute per IP, like /api/account/
  const s = app.settings();
  s.rateLimits.rules = s.rateLimits.rules.filter(r => r.label !== "/api/admin/");
  const at = s.rateLimits.rules.findIndex(r => r.label === "/api/");
  s.rateLimits.rules.splice(at < 0 ? s.rateLimits.rules.length : at, 0, { label: "/api/admin/", maxRequests: 20, duration: 60, audience: "" });
  app.save(s);
}, (app) => {
  const s = app.settings(); s.rateLimits.rules = s.rateLimits.rules.filter(r => r.label !== "/api/admin/"); app.save(s);
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("admin");
  app.save(users);
});
