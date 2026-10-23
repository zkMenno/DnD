/// <reference path="../pb_data/types.d.ts" />
// 23 Oct 2026: feedback — bug reports, ideas and other notes sent from the 🐞 Feedback box on any page (web/feedback.js).
// Anyone can send one (signed in or not); only the superuser can read them (PocketBase dashboard → feedback).
// The author is the signed-in player or empty, never someone else; deleting the account deletes their feedback.
// Rate limited per IP (settings below).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const c = new Collection({
    type: "base", name: "feedback",
    listRule: null, viewRule: null, updateRule: null, deleteRule: null,
    createRule: 'author = "" || author = @request.auth.id',
    fields: [
      { name: "kind", type: "select", required: true, maxSelect: 1, values: ["bug", "idea", "other"] },
      { name: "text", type: "text", required: true, min: 3, max: 4000 },
      { name: "contact", type: "email" },                    // optional, for replies when not signed in
      { name: "page", type: "text", max: 300 },              // where it was sent from (path only)
      { name: "device", type: "text", max: 300 },            // browser + screen size, only if the sender ticked the box
      { name: "author", type: "relation", collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
  });
  app.save(c);
  const s = app.settings();
  s.rateLimits.rules = s.rateLimits.rules.filter(r => r.label !== "feedback:create");
  const at = s.rateLimits.rules.findIndex(r => r.label === "/api/");
  s.rateLimits.rules.splice(at < 0 ? s.rateLimits.rules.length : at, 0, { label: "feedback:create", maxRequests: 5, duration: 600, audience: "" });
  app.save(s);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("feedback")); } catch (_) {}
  const s = app.settings(); s.rateLimits.rules = s.rateLimits.rules.filter(r => r.label !== "feedback:create"); app.save(s);
});
