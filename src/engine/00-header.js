
/* ============================================================================
   CHARACTER SHEET ENGINE
   A live D&D 2024 play sheet built from D&D Beyond data, for one character at a time. It runs in two places:
   as a standalone claude.ai artifact (everything in one HTML page) and in the web app (web/sheet-boot.js sets
   window.SHEET, then loads the same engine as /engine/main.js). This file holds no code: it is the map.

   FILE MAP of a claude.ai page (one self-republishing file; buildDoc() in §21 writes these parts back in this order)
     <style id="theme-css">   theme tokens: colours, fonts, textures (swap to reskin)
     <style id="css">         engine styles, theme-agnostic
     <div id="app">           render() fills it
     <script id="<id>-data">  compact D&D Beyond JSON (written by Sync; <id> = PACK.id)
     <script id="items-data"> SRD 5.2 item list for Gear → ➕ Add item (the web app fetches items.json instead)
     <script id="themes">     THEMES: wording, dice sets, fonts per theme
     <script id="classes">    CLASS_MODULES: class / species rules (resources, derived numbers, roll-sheet rows)
     <script id="pack">       PACK: everything about this character + campaign
     <script id="main">       this engine

   DATA FLOW
     D&D Beyond JSON ──compact()──▶ DATA (stored in the page) ──derive()──▶ D (read-only sheet numbers)
     S  = play state at the table (HP, uses, ammo, coins…): this device's localStorage + the db doc
          play/<PACK.id> (the artifact's db, or PocketBase in the web app), so phone and laptop stay in step.
          Resets to D&D Beyond's numbers after each sync.
          S.added = items added in the app; they join DATA.inventory until D&D Beyond has them.
     ui = this device's view prefs (tab, roll mode, dice set, card and section order).
     The Notes tab lists every difference between S and the synced numbers, to type into D&D Beyond.

   RENDERING AND EVENTS
     Panels are HTML strings (render() / paint*()). Text is passed through linkify() (glossary terms become
     tappable) and decorate() (dice, DCs, distances get type styling). One delegated click handler (§20)
     dispatches on data-act and a few other data-* attributes. Roll results show in #dock as cards.

   EXTENDING
     New character: a pack (packs/<name>.js, see bare.js's header) + that character's data. Most characters need no
     pack of their own (packs/bare.js). New class or species rules: a CLASS_MODULES entry (src/classes.js) can add
       derive(x)      numbers merged into D (attacksPerAction takes the highest, so Extra Attack never stacks)
       resources(D)   trackers: pips (default), a points pool, an on/off toggle (Rage) and quick buttons (Focus)
       riders(w, c)   extra damage on a hit (Sneak Attack, Rage, Divine Smite…): auto, optional, or paid from a resource
       checkRows(k)   extra rows on a check or save sheet
     and the engine builds rests, the change list, glossary hooks and combos from them. New theme: a THEMES entry +
     #theme-css tokens. A new core feature belongs here; anything that names one character's weapon, feat or
     campaign belongs in its pack.

   CONVENTIONS
     Metric distances (1.5 m per 5 ft). sgn(n) formats +n/−n. esc() everything that came from data.
     Action buttons sit on the right. Hit rolls are blue (--sea), damage red (--hp). Motion is skipped when
     the OS asks for reduced motion.

   SOURCE FILES (src/engine/, joined in name order by tools/build.js into this one script; themes.js, classes.js
   and the pack load before it, and every file shares one global scope)
      00-header             this map                         11-gear-and-traits    gear (+ Add item), traits panels
      01-model              compact() and derive()           12-header             vitals tiles and their drawers
      02-boot               DATA, D, modules, resources      13-render             the page, built once
      03-play-state         S, ui, save                      14-jump-and-order     ↕ Sections and card order
      04-dice               rolls, the roll dock             15-tabs               tabs, arrows, keys, swipes
      05-action-animations  bursts before a roll lands       16-glossary           terms and their bubbles
      06-3d-dice            three.js dice and dice sets      17-dialog-and-notes   confirm dialog, notes, party log
      07-boosts             inspiration and blessings        18-menu-rests-quickroll ☰ menu, rests, Quick roll
      08-roll-flow          hit → damage, riders, checks     19-ammo-coins-touch   arrows, coins, touch, keys
      08b-spells            Spells tab and casting           20-events             one delegated click handler
      09-combos             combo recipes (pack or auto)     21-sync               D&D Beyond → republish
      10-panels             stats, combat, resources, change list   22-move   📦/📥 claude.ai → web app
     Order matters: top-level code runs as each file loads, and constants are used by later files, so new code
     goes in the section it belongs to. Functions can call ones defined in later files (they run after load).
   ============================================================================ */
