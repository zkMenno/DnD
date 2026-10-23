/// <reference path="../pb_data/types.d.ts" />
// 23 Oct 2026: indexes for the notes every sheet reads and subscribes to (by character and scope; the party log by
// campaign and scope). Without them each query scans the whole notes table (architecture review).
migrate((app) => {
  const notes = app.findCollectionByNameOrId("notes");
  notes.indexes = notes.indexes.filter(i => !/idx_notes_(character|campaign)_scope/.test(i)).concat([
    "CREATE INDEX idx_notes_character_scope ON notes (character, scope)",
    "CREATE INDEX idx_notes_campaign_scope ON notes (campaign, scope)",
  ]);
  app.save(notes);
}, (app) => {
  const notes = app.findCollectionByNameOrId("notes");
  notes.indexes = notes.indexes.filter(i => !/idx_notes_(character|campaign)_scope/.test(i));
  app.save(notes);
});
