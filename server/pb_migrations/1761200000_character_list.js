/// <reference path="../pb_data/types.d.ts" />
// v3 (22 Oct 2026): players organise their own character list on the home page.
//   pinned   ⭐ "playing now": listed first
//   archived done with the campaign: folded away under "Archived", not deleted
//   sort     the player's own order (1, 2, 3…); 0 = not ordered yet (then by name)
// The existing updateRule already lets only the owner change these (and never owner, verified or claim_code).
// Up: adds pinned, archived and sort to characters. Down: removes them (and what players had set).
migrate((app) => {
  const c = app.findCollectionByNameOrId("characters");
  c.fields.add(new BoolField({ name: "pinned" }));
  c.fields.add(new BoolField({ name: "archived" }));
  c.fields.add(new NumberField({ name: "sort", onlyInt: true, min: 0, max: 100000 }));
  app.save(c);
}, (app) => {
  const c = app.findCollectionByNameOrId("characters");
  ["pinned", "archived", "sort"].forEach(n => c.fields.removeByName(n));
  app.save(c);
});
