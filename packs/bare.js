/* ============================================================================
   CHARACTER PACK — the plain pack every web-app character gets unless the server picks another one
   (PACKS in server/pb_hooks/ddb_utils.js). Pirate look, the six core tabs, no character-specific hooks.
   Storage prefix "sheet".
   A pack holds everything that is about one character or campaign; #main is the generic engine. The engine reads
   PACK.* and degrades gracefully when an optional hook is missing.

   Pack functions run lazily (at render time), so they may use engine globals: D (derived sheet),
   DATA (raw D&D Beyond data), S (play state), sgn, esc, toolBonus, oilDC, comboCard, fmtTip, classEmo…
   Never touch those at the top level of a pack script — #main hasn't run yet.

   REQUIRED
     id            storage prefix. Keys: <id>-play-<charId>, <id>-ui, <id>-notes-<charId>, <id>-notes-cache-<charId>,
                   <id>-tab; db doc play/<id>; data script #<id>-data. Changing it orphans saved play state.
     theme         key in THEMES (#themes).
     tabs          [key, label, emoji] in strip order. Core panels: combat, combos, stats, gear, traits, notes.
   OPTIONAL
     campaignFeats names of DM handouts stored as feats (kept off the Feats list)
     toolNames     {itemId: name} for custom tool proficiencies D&D Beyond stores by id
     firstSession  session number the notes composer starts at
     panels        {tabKey: () => html} extra tabs, or overrides of a core tab
     signatureWeapon() → the weapon highlighted on Combat and used by combo steps that don't name one
     combos()      → [{id, title, when, steps:[[A|B|F|M|R, text]], formula, mode?, melee?, roll:[{w?, mode?, sneak, savage, noMod?, label}]}]
     turnEconomy() → [[tag, glossary term, [option, …]]] rows of the "turn at a glance" card
     attackNote()  → html under the Attacks card
     weaponTip(w)  → html under one weapon card ('' for none)
     gearExtras(inv) → html appended to the Gear tab
     backgroundBlurb() → html for the Background card
     abilityUse()  → {str…cha: one-line "what it does for you"} in ability bubbles
     profInfo()    → glossary entries for proficiencies (armour, weapons, tools, languages)
     glossary()    → glossary entries G (format at fmtTip in #main)
     sync          {pullTask, pushTask} scheduled-task ids behind ☰ → Sync pull / push (claude.ai sheets only)
   NEW CHARACTER: copy this script, change the id/theme/tabs, add the hooks you want (PACK may also be built by a
   function, const PACK = (() => { … return { id, theme, tabs, combos, … }; })(), so hooks can share helpers),
   and put that character's compact D&D Beyond JSON in #<id>-data (Sync fills it in after the first load).
   Then add it to SHEETS in tools/build.js (claude.ai sheet) and/or PACKS in server/pb_hooks/ddb_utils.js (web app).
   ============================================================================ */
const PACK = { id:"sheet", theme:"pirate", tabs:[["combat","Combat","⚔️"],["spells","Spells","🪄"],["stats","Stats","📊"],["gear","Gear","🎒"],["traits","Traits","✨"],["notes","Notes","📜"]] };
