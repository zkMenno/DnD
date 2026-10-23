
// ── THEMES: the look and voice a character pack can pick (PACK.theme) ──────────────────────────────────────
// Defines one global, THEMES. Loaded before #classes, the pack and the engine (claude.ai: <script id="themes">; web
// app: /engine/themes.js), and also built into the front page's dice (tools/build.js → web/home-dice.js).
// Only "pirate" exists; the web app's other looks are skins on top of it (skinDice below, words in §2 SKIN_WORDS).
// A theme is:
//   1. CSS tokens: the <style id="theme-css"> block (colours, fonts, textures). Swap that block to reskin.
//   2. words:  the few places the UI speaks in the theme's voice (button labels, headings, the crit icon).
//              Any key left out falls back to plain English (see WORD in §2).
//   3. dice:   the 3D dice sets offered in ☰ → Dice sets (drawn by §6). Each set: name, desc, grad [light, deep] hex
//              for the three.js faces, body (fallback colour), ink (numerals), rim (numeral shadow), metal/rough
//              (material), css [light, deep, ink] for the menu swatch. Optional:
//                pips:true draws d6 pips;
//                tex: 'wood' | 'bone' | 'tar' | 'hammered' | 'caustic' | 'seaglass' | 'gem' | 'char' | 'iron' | 'map' |
//                     'lava' | 'frost' | 'acid' | 'storm' | 'marble' | 'nebula' | 'moss' adds a surface texture;
//                glow (hex colour) lights up the texture's veins (lava cracks, acid bubbles, storm bolts);
//                alpha < 1 lets gems glow slightly see-through; bold:true draws numerals solid with a pale halo (rim);
//                font overrides the numeral font family; matte:true removes all highlights (raw wood);
//                shine:true adds polished reflections (studio:'cool' for silver tones, 'rose' for rose gold).
//              group: menu section (labels in diceGroups). The order here is the default order within each group
//              (players can reorder in ☰ → Dice sets). defaultDice: the fallback when no set is picked.
//   4. fonts:  the Google Fonts stylesheet the tokens' --f-* families need (claude.ai sheets: written into the page
//              head on sync, §21; the web app serves its own copies instead).
// Add a theme: copy "pirate", rename the key, change words/dice/fonts, ship matching #theme-css tokens.
const THEMES = {
  pirate: {
    name: 'Pirate',
    fonts: 'https://fonts.googleapis.com/css2?family=Pirata+One&family=Alegreya+SC:wght@500;700&family=Alegreya+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@500;700&display=swap',
    words: {
      ok: 'Aye ✓',                       // closes a drawer / confirms
      cancel: 'Belay that',              // dismisses a confirm dialog
      log: 'Captain’s log',              // Notes tab heading
      turn: 'Yer turn at a glance',      // Combat tab: action economy card
      clean: '⚓ Ship-shape.',            // Notes: nothing to enter in D&D Beyond
      notesHint: name => 'Who ye met, what ye plundered, what '+name+' wants next…',
      critIcon: '⚓'                      // big icon in the crit burst
    },
    defaultDice: 'doubloon',
    // menu groups for the dice sets, in display order
    diceGroups: { pirate:'A Pirate’s Life', metal:'Reforged Treasures', wood:'Carved Wood', sea:'Mythical Creatures', gem:'Precious Gems', elemental:'Elemental Powers' },
    // Matched pirate dice sets: every die in a set shares one look. Four per group, in group order.
    dice: {
      // A Pirate’s Life
      blackflag: { name:'Black Flag', group:'pirate',   desc:'Brushed pitch, gold numerals', tex:'tar',          grad:[0x4E454C,0x0A090B], body:0x221E22, ink:'#E9B949', rim:'rgba(0,0,0,.75)',      metal:.15, rough:.5,  css:['#4E454C','#0A090B','#E9B949'] },
      bone:      { name:'Bone & Blood', group:'pirate', desc:'Bloodied bone, red numerals', tex:'bone', matte:true, dim:.86, bold:true, font:'"Alegreya SC", Georgia, serif', grad:[0xEFEAE0,0xA59E92], body:0xDCD5C8, ink:'#6E0A0A', rim:'rgba(250,242,222,.85)', metal:0, rough:.88, css:['#EDE0C2','#8F7350','#6E0A0A'] },
      cannon:    { name:'Cannon Iron', group:'pirate', desc:'Pitted iron, chalk numerals', tex:'iron', grad:[0x84888C,0x26292C], body:0x44474A, ink:'#F2EEE4', rim:'rgba(0,0,0,.7)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.6, rough:.55, css:['#6E7276','#1A1C1E','#F2EEE4'] },
      treasuremap: { name:'Treasure Map', group:'pirate', desc:'Old parchment, ink numerals', tex:'map', matte:true, dim:.8, grad:[0xAE9873,0x765A34], body:0x9E8763, ink:'#3A2410', rim:'rgba(255,248,230,.5)', metal:0, rough:1, css:['#F2E2BE','#B08A56','#3A2410'] },
      // Reforged Treasures: polished metals
      doubloon:  { name:'Doubloon', group:'metal',     desc:'Polished gold, dark numerals', shine:true, grad:[0xFFF0A0,0xC2900E], body:0xF0C040, ink:'#2E1A03', rim:'rgba(255,246,200,.85)', metal:.9, rough:.15, css:['#FFF0A0','#C2900E','#2E1A03'] },
      rosegold:  { name:'Rose Doubloon', group:'metal', desc:'Rose gold, dark numerals', shine:true, studio:'rose', grad:[0xFFE6C6,0xDC9470], body:0xF2BC98, ink:'#4A1A18', rim:'rgba(255,240,230,.85)', metal:.9, rough:.16, css:['#FFE6C6','#DC9470','#4A1A18'] },
      silver:    { name:'Piece of Eight', group:'metal', desc:'Polished silver, dark numerals', shine:true, studio:'cool', grad:[0xF6F7F9,0x6E747C], body:0xC8CCD2, ink:'#1C2026', rim:'rgba(255,255,255,.8)', metal:.85, rough:.22, css:['#F6F7F9','#6E747C','#1C2026'] },
      bronze:    { name:'Ship’s Bell', group:'metal', desc:'Polished bronze, dark numerals', shine:true, grad:[0xF0AE78,0x6E3614], body:0xC07A48, ink:'#260E04', rim:'rgba(255,226,196,.8)', metal:.85, rough:.24, css:['#F0AE78','#6E3614','#260E04'] },
      // Carved Wood
      walnut:    { name:'Captain’s Walnut', group:'wood', desc:'Oiled walnut, cream numerals', tex:'wood', grad:[0x573925,0x180E06], body:0x3A2516, ink:'#F1DDB0', rim:'rgba(20,10,4,.7)', metal:0, rough:.7, css:['#573925','#180E06','#F1DDB0'] },
      timber:    { name:'Ship’s Timber', group:'wood', desc:'Raw oak, burnt numerals', tex:'wood', matte:true, grad:[0xA27A56,0x4A2E18], body:0x9A6A3C, ink:'#24120A', rim:'rgba(255,236,200,.35)', metal:0, rough:1, css:['#B88A60','#4A2E18','#24120A'] },
      ash:       { name:'Driftwood', group:'wood', desc:'Sea-weathered ash, dark numerals', tex:'wood', matte:true, dim:.85, grad:[0x86694A,0x3F2C1B], body:0x6A5238, ink:'#1A1008', rim:'rgba(240,226,200,.3)', metal:0, rough:1, css:['#A88B68','#5E4630','#1A1008'] },
      shipwreck: { name:'Shipwreck', group:'wood', desc:'Charred wood, glowing numerals', tex:'char', grad:[0x4A3A2E,0x0E0906], body:0x3A2A1E, ink:'#FF9A3C', rim:'rgba(30,8,0,.85)', bold:true, metal:0, rough:1, css:['#5E4A3A','#140D08','#FF9A3C'] },
      // Mythical Creatures: the sea
      davyjones: { name:'Davy Jones’ Pearl', group:'sea', desc:'Deep-sea blue, pearl numerals', tex:'caustic', grad:[0x4A72C4,0x0B1430], body:0x1A2C55, ink:'#E9EEF5', rim:'rgba(0,6,20,.7)', metal:.3, rough:.32, css:['#4A72C4','#0B1430','#E9EEF5'] },
      kraken:    { name:'Kraken’s Revenge', group:'sea',  desc:'Sea glass, cream numerals', tex:'seaglass',  grad:[0x45AE9F,0x0A2E34], body:0x1F6B70, ink:'#F3E6C4', rim:'rgba(0,20,24,.6)',     metal:.25, rough:.28, css:['#58C9B8','#0B3238','#F3E6C4'] },
      poseidon:  { name:'Poseidon’s Trident', group:'sea', desc:'Turquoise shard, gold numerals', tex:'caustic', shine:true, studio:'cool', grad:[0x7EE2E8,0x08506E], body:0x1A8AA0, ink:'#FFD877', rim:'rgba(0,20,30,.75)', metal:.35, rough:.22, css:['#7EE2E8','#08506E','#FFD877'] },
      moby:      { name:'Moby Dick’s Tooth', group:'sea', desc:'Scrimshaw ivory, navy numerals', tex:'seaglass', studio:'cool', grad:[0xF6F8FA,0x8794A4], body:0xD8DEE6, ink:'#1A2A40', rim:'rgba(255,255,255,.7)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.1, rough:.45, css:['#F6F8FA','#8794A4','#1A2A40'] },
      // Precious Gems
      emerald:   { name:'Mermaid’s Emerald', group:'gem', desc:'Green sapphire, pale numerals', tex:'gem', shine:true, studio:'cool', alpha:.93, grad:[0x5FE0A0,0x06402A], body:0x14805A, ink:'#EFFFF6', rim:'rgba(0,30,18,.7)', metal:.2, rough:.12, css:['#5FE0A0','#06402A','#EFFFF6'] },
      ruby:      { name:'Corsair’s Ruby', group:'gem', desc:'Blood-red ruby, gold numerals', tex:'gem', shine:true, studio:'cool', alpha:.93, grad:[0xFF6A78,0x5A0412], body:0xB01428, ink:'#FFE3A0', rim:'rgba(40,0,6,.75)', metal:.2, rough:.12, css:['#FF6A78','#5A0412','#FFE3A0'] },
      amethyst:  { name:'Siren’s Amethyst', group:'gem', desc:'Violet amethyst, pale numerals', tex:'gem', shine:true, studio:'cool', alpha:.93, grad:[0xC89BFF,0x34105E], body:0x7A3EB8, ink:'#F7F0FF', rim:'rgba(20,0,40,.7)', metal:.2, rough:.12, css:['#C89BFF','#34105E','#F7F0FF'] },
      topaz:     { name:'Sunken Topaz', group:'gem', desc:'Amber topaz, dark numerals', tex:'gem', shine:true, alpha:.93, grad:[0xFFD27A,0x9A4A08], body:0xE09030, ink:'#2A1204', rim:'rgba(255,240,210,.8)', metal:.2, rough:.12, css:['#FFD27A','#9A4A08','#2A1204'] },
      // Elemental Powers: glowing veins
      fire:      { name:'Dragonfire', group:'elemental', desc:'Lava crust, gold numerals', tex:'lava', glow:0xff5a10, grad:[0x5A2414,0x140604], body:0x3A140A, ink:'#FFD27A', rim:'rgba(30,6,0,.85)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:0, rough:.9, css:['#7A2A12','#140604','#FFD27A'] },
      cold:      { name:'Frostbite', group:'elemental', desc:'Glacier ice, navy numerals', tex:'frost', shine:true, studio:'cool', alpha:.92, grad:[0xE2F4FF,0x5890C4], body:0xA8CCE8, ink:'#0E2A44', rim:'rgba(255,255,255,.75)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.15, rough:.18, css:['#EEF8FF','#6CA6D2','#0E2A44'] },
      acid:      { name:'Snake’s Acid', group:'elemental', desc:'Serpent scales, pale numerals', tex:'acid', glow:0x9cff3a, grad:[0x6E9A30,0x0E1C06], body:0x3A5A18, ink:'#F2FFDC', rim:'rgba(0,0,0,0)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.15, rough:.35, css:['#6E9A30','#0E1C06','#F2FFDC'] },
      lightning: { name:'Thunderstrike', group:'elemental', desc:'Thunderhead, white numerals', tex:'storm', glow:0xd6c2ff, grad:[0x8A93A8,0x1E2236], body:0x444A60, ink:'#EAF6FF', rim:'rgba(0,0,20,.8)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.2, rough:.4, css:['#7A8296','#161A2C','#EAF6FF'] }
    },
    // The web app's other looks (☰ → Theme, <html data-skin>) offer their own dice sets instead of the pirate ones
    // (§6 skinDiceSets). Each look: font, fscale and bold for its numerals, groups (three, in menu order), and sets.
    // Each set: from = a pirate set to start from (its texture and material), then any field to change;
    // col:[light, deep, numerals] recolours it (faces, body and menu swatch in one go). font is the look's numeral
    // font unless a set says otherwise. Keys are unique across looks, so each look keeps its own pick.
    skinDice: {
      // Each look: 6 groups of 4, grouped by how the dice look (polished metal · wood · stone & shadow · glass & ivory ·
      // gems · glowing elemental), like the pirate sets; names fit the look, colours range across the spectrum.
      fantasy: { font:'"Cinzel", Georgia, serif', bold:true, groups:{ metal:'The King’s Vault', wood:'The Enchanted Wood', stone:'Castle Stone', glass:'The Lady of the Lake', gems:'The Crown Jewels', elemental:'Dragon’s Breath' }, sets:{
        fk_crown: { from:'doubloon', group:'metal', name:'Sunlit Crown', desc:'Polished gold, dark numerals' },
        fk_mithril: { from:'silver', group:'metal', name:'Elven Mithril', desc:'Moon-bright silver, ink numerals' },
        fk_tourney: { from:'bronze', group:'metal', name:'Tourney Bronze', desc:'Polished bronze, dark numerals' },
        fk_circlet: { from:'rosegold', group:'metal', name:'Princess’s Circlet', desc:'Rose gold, dark numerals' },
        fk_oak: { from:'walnut', group:'wood', name:'Round Table Oak', desc:'Oiled oak, cream numerals' },
        fk_lute: { from:'timber', group:'wood', name:'Bard’s Lute', desc:'Honey spruce, dark numerals', col:['#E8C890','#8A5A24','#1A0E04'] },
        fk_staff: { from:'ash', group:'wood', name:'Wizard’s Staff', desc:'Grey ash, violet numerals', col:['#B8B0A8','#4A443E','#3A1A6A'] },
        fk_hearth: { from:'shipwreck', group:'wood', name:'Tavern Hearth', desc:'Charred log, glowing numerals' },
        fk_throne: { from:'blackflag', group:'stone', name:'Throne Room Marble', desc:'White marble, gold numerals', col:['#F6F2E8','#B4AC9E','#8A6410'], tex:'marble', metal:.08, rough:.35 },
        fk_grimoire: { from:'blackflag', group:'stone', name:'Midnight Grimoire', desc:'Starry indigo, gold numerals', col:['#4A52A8','#0C0E2C','#F2CF6A'], tex:'nebula', rim:'rgba(0,0,10,.8)', metal:.1, rough:.35 },
        fk_steel: { from:'cannon', group:'stone', name:'Knight’s Steel', desc:'Pitted steel, white numerals', col:['#A8B0B8','#34393F','#FFFFFF'] },
        fk_map: { from:'treasuremap', group:'stone', name:'Questing Map', desc:'Old parchment, ink numerals' },
        fk_unicorn: { from:'moby', group:'glass', name:'Unicorn Horn', desc:'Pearl white, violet numerals', col:['#FFFFFF','#D8D0E8','#5A2A9A'] },
        fk_heraldry: { from:'kraken', group:'glass', name:'Heraldic Azure', desc:'Bright blue glass, white numerals', col:['#7FB6FF','#123C8A','#FFFFFF'] },
        fk_pixie: { from:'kraken', group:'glass', name:'Pixie Dust', desc:'Lilac glass, white numerals', col:['#E0C8FF','#6A3AA8','#FFFFFF'] },
        fk_lake: { from:'davyjones', group:'glass', name:'Lady of the Lake', desc:'Deep lake blue, pearl numerals' },
        fk_amethyst: { from:'amethyst', group:'gems', name:'Archmage’s Amethyst', desc:'Violet amethyst, pale numerals' },
        fk_scrying: { from:'amethyst', group:'gems', name:'Scrying Sapphire', desc:'Deep sapphire, pale numerals', col:['#7FA8FF','#0C1E5E','#F3F6FF'] },
        fk_velvet: { from:'ruby', group:'gems', name:'Velvet Banner', desc:'Crimson ruby, gold numerals', col:['#E05A6A','#5A0A1A','#FFE2A0'] },
        fk_dryad: { from:'emerald', group:'gems', name:'Dryad’s Tear', desc:'Leaf-green gem, pale numerals' },
        fk_redwyrm: { from:'fire', group:'elemental', name:'Red Wyrm’s Breath', desc:'Lava crust, gold numerals' },
        fk_whitefang: { from:'cold', group:'elemental', name:'White Dragon’s Fang', desc:'Glacier ice, navy numerals' },
        fk_wyvern: { from:'acid', group:'elemental', name:'Wyvern Venom', desc:'Green scales, pale numerals' },
        fk_bluewyrm: { from:'lightning', group:'elemental', name:'Blue Dragon’s Storm', desc:'Storm cloud, white numerals', col:['#7A9ACF','#141E3A','#F2F8FF'], glow:0xa8d8ff },
      } },
      space: { font:'"Orbitron", system-ui, sans-serif', bold:true, groups:{ metal:'Hull & Hardware', wood:'Hydroponics Bay', stone:'Deep Space', glass:'Strange Planets', gems:'Power Crystals', elemental:'Energy Cores' }, sets:{
        sp_hull: { from:'silver', group:'metal', name:'Hull Plating', desc:'Brushed alloy, dark numerals', tex:'hammered' },
        sp_captain: { from:'doubloon', group:'metal', name:'Captain’s Insignia', desc:'Polished gold, navy numerals', col:['#FFE89A','#B88A14','#0E1A3A'] },
        sp_wiring: { from:'bronze', group:'metal', name:'Copper Wiring', desc:'Bright copper, dark numerals', col:['#FFC09A','#8A3A14','#1A0A04'] },
        sp_android: { from:'silver', group:'metal', name:'Android Chrome', desc:'Mirror chrome, blue numerals', col:['#F4F8FF','#8A94A8','#1A4AA8'] },
        sp_bonsai: { from:'walnut', group:'wood', name:'Station Bonsai', desc:'Dark grown wood, green numerals', col:['#6A4A30','#1E120A','#8AFFB0'] },
        sp_crate: { from:'timber', group:'wood', name:'Cargo Crate', desc:'Pale shipping pine, stencil numerals', col:['#E0C890','#8A6A34','#1A1206'] },
        sp_greenhouse: { from:'ash', group:'wood', name:'Greenhouse Bamboo', desc:'Green-gold cane, dark numerals', col:['#C8D08A','#5A6A2A','#141A04'] },
        sp_reentry: { from:'shipwreck', group:'wood', name:'Re-entry Scorch', desc:'Burnt heat shield, glowing numerals' },
        sp_nebula: { from:'blackflag', group:'stone', name:'Violet Nebula', desc:'Violet starfield, cyan numerals', col:['#7A58C8','#0E0A26','#7FF3FF'], tex:'nebula', rim:'rgba(0,0,10,.8)', metal:.1, rough:.35 },
        sp_horizon: { from:'blackflag', group:'stone', name:'Event Horizon', desc:'Black starfield, gold numerals', col:['#3A3F5A','#04050C','#FFD877'], tex:'nebula', rim:'rgba(0,0,10,.8)', metal:.1, rough:.35 },
        sp_redgiant: { from:'blackflag', group:'stone', name:'Red Giant', desc:'Ember starfield, white numerals', col:['#C8483A','#2A0806','#FFF2E8'], tex:'nebula', rim:'rgba(0,0,10,.8)', metal:.1, rough:.35 },
        sp_asteroid: { from:'cannon', group:'stone', name:'Asteroid Rock', desc:'Pitted grey rock, white numerals', col:['#9A948A','#2E2A26','#FFFFFF'] },
        sp_bluedot: { from:'kraken', group:'glass', name:'Pale Blue Dot', desc:'Hazy blue glass, navy numerals', col:['#BFE6FF','#2A5C8E','#0B1A33'] },
        sp_ocean: { from:'davyjones', group:'glass', name:'Ocean World', desc:'Deep teal, white numerals', col:['#3AB8C8','#04303A','#FFFFFF'] },
        sp_moon: { from:'moby', group:'glass', name:'Moon Dust', desc:'Powder grey-white, blue numerals', col:['#F2F2EE','#B8B8B0','#1A3A8A'] },
        sp_gasgiant: { from:'poseidon', group:'glass', name:'Gas Giant', desc:'Swirled amber glass, white numerals', col:['#FFC88A','#8A4A1A','#FFFFFF'] },
        sp_quantum: { from:'emerald', group:'gems', name:'Quantum Shard', desc:'Cyan crystal, pale numerals', col:['#8FF6FF','#085A70','#F2FEFF'] },
        sp_dilith: { from:'amethyst', group:'gems', name:'Warp Crystal', desc:'Violet crystal, white numerals' },
        sp_rubylaser: { from:'ruby', group:'gems', name:'Ruby Laser', desc:'Red crystal, white numerals', col:['#FF6A6A','#6A0A0A','#FFFFFF'] },
        sp_beacon: { from:'topaz', group:'gems', name:'Distress Beacon', desc:'Amber crystal, black numerals', col:['#FFD050','#C07A00','#120A00'] },
        sp_plasma: { from:'lightning', group:'elemental', name:'Plasma Coil', desc:'Charged cloud, white numerals', col:['#6FA6E8','#0E1A3A','#F2FAFF'], glow:0x7ff3ff },
        sp_solar: { from:'fire', group:'elemental', name:'Solar Flare', desc:'Burning plasma, pale numerals', col:['#FF9A3C','#3A0C04','#FFF2C8'], glow:0xffb040 },
        sp_antimatter: { from:'acid', group:'elemental', name:'Antimatter', desc:'Magenta charge, pale numerals', col:['#D46AFF','#2A0A3A','#FFF0FF'], glow:0xff7aff },
        sp_comet: { from:'cold', group:'elemental', name:'Comet Tail', desc:'Icy white, violet numerals', col:['#F2F6FF','#9AA6D8','#3A1E8A'] },
      } },
      woodland: { font:'"Uncial Antiqua", Georgia, serif', fscale:1.1, groups:{ metal:'Fey Silver & Gold', wood:'The Old Grove', stone:'Standing Stones', glass:'Dewdrops & Moonpools', gems:'The Blossom Court', elemental:'Wild Magic' }, sets:{
        fw_rose: { from:'rosegold', group:'metal', name:'Briar Rose', desc:'Rose gold, dark numerals' },
        fw_moonsilver: { from:'silver', group:'metal', name:'Moonmoth Silver', desc:'Pale silver, green numerals', col:['#F4F8F0','#9AA294','#1E5A2A'] },
        fw_acorn: { from:'bronze', group:'metal', name:'Bronze Acorn', desc:'Polished bronze, dark numerals' },
        fw_summer: { from:'doubloon', group:'metal', name:'Midsummer Gold', desc:'Sunny gold, brown numerals' },
        fw_heartwood: { from:'walnut', group:'wood', name:'Heartwood Oak', desc:'Oiled oak, cream numerals' },
        fw_birch: { from:'timber', group:'wood', name:'Silver Birch', desc:'Pale birch, dark numerals', col:['#E8E2D2','#9C927C','#2A2418'] },
        fw_willow: { from:'ash', group:'wood', name:'Weeping Willow', desc:'Grey-green bark, dark numerals', col:['#B4B898','#5A5E40','#1A1C10'] },
        fw_hollow: { from:'shipwreck', group:'wood', name:'Hollow Log', desc:'Charred wood, glowing numerals' },
        fw_stone: { from:'blackflag', group:'stone', name:'Mossy Menhir', desc:'Mossy stone, cream numerals', col:['#8AA06A','#24301A','#F6F2DC'], tex:'moss', rim:'rgba(0,0,0,.7)', metal:0, rough:.9 },
        fw_toadstool: { from:'blackflag', group:'stone', name:'Toadstool Cap', desc:'Red cap, white numerals', col:['#D2483C','#5A1410','#FFF8EC'], tex:'moss', rim:'rgba(0,0,0,.7)', metal:0, rough:.9 },
        fw_glimmer: { from:'blackflag', group:'stone', name:'Glimmerdark', desc:'Violet night, pink numerals', col:['#6A4AA8','#120A28','#FFB0E8'], tex:'nebula', rim:'rgba(0,0,10,.8)', metal:.1, rough:.35 },
        fw_wisp: { from:'blackflag', group:'stone', name:'Will-o’-Wisp', desc:'Dark marsh, glowing numerals', col:['#3E7A5A','#0A1E14','#EAFFB0'], tex:'nebula', rim:'rgba(0,0,10,.8)', metal:.1, rough:.35 },
        fw_dew: { from:'kraken', group:'glass', name:'Morning Dew', desc:'Green glass, cream numerals', col:['#9EE0A8','#1E5A3A','#F6FFF2'] },
        fw_bluebell: { from:'kraken', group:'glass', name:'Bluebell Glass', desc:'Lilac-blue glass, white numerals', col:['#B8C8FF','#3A4A9A','#FFFFFF'] },
        fw_moonpool: { from:'davyjones', group:'glass', name:'Moonpool', desc:'Silver-blue water, white numerals', col:['#9AB8E8','#0E2050','#FFFFFF'] },
        fw_kingfisher: { from:'poseidon', group:'glass', name:'Kingfisher', desc:'Electric blue, orange numerals', col:['#3AA0FF','#052A6A','#FFB050'] },
        fw_emerald: { from:'emerald', group:'gems', name:'Summer Queen’s Emerald', desc:'Green sapphire, pale numerals' },
        fw_amber: { from:'topaz', group:'gems', name:'Amber Sap', desc:'Honey amber, dark numerals' },
        fw_autumn: { from:'ruby', group:'gems', name:'Autumn Leaf', desc:'Russet glass, cream numerals', col:['#F08A4A','#7A2A0A','#FFF4DC'] },
        fw_beetle: { from:'amethyst', group:'gems', name:'Jewel Beetle', desc:'Iridescent teal, gold numerals', col:['#5AD0B0','#0A4A5A','#FFE07A'] },
        fw_bramble: { from:'acid', group:'elemental', name:'Bramblescale', desc:'Thorny scales, pale numerals' },
        fw_firefly: { from:'lightning', group:'elemental', name:'Firefly Swarm', desc:'Dusky cloud, yellow numerals', col:['#5A6A5A','#141A14','#F8FF6A'], glow:0xf8ff6a },
        fw_winter: { from:'cold', group:'elemental', name:'Winter Court', desc:'Frost blue, navy numerals' },
        fw_bonfire: { from:'fire', group:'elemental', name:'Beltane Bonfire', desc:'Glowing embers, gold numerals', col:['#E8743A','#3A0E04','#FFE08A'], glow:0xff9a40 },
      } },
      gothic: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.2, bold:true, groups:{ metal:'The Count’s Treasury', wood:'The Cursed Village', stone:'The Crypt', glass:'The Haunted Manor', gems:'Blood Jewels', elemental:'Dark Powers' }, sets:{
        rv_stake: { from:'silver', group:'metal', name:'Silver Stake', desc:'Polished silver, dark numerals' },
        rv_portrait: { from:'doubloon', group:'metal', name:'Gilded Portrait', desc:'Tarnished gold, black numerals', col:['#E8C870','#8A6418','#120A02'] },
        rv_bell: { from:'bronze', group:'metal', name:'Chapel Bell', desc:'Dark bronze, cream numerals', col:['#C8884A','#4A2208','#FFF4DC'] },
        rv_lunar: { from:'silver', group:'metal', name:'Full Moon', desc:'Moonlit silver, navy numerals', col:['#F4F6FF','#9AA2C0','#14204A'] },
        rv_coffin: { from:'walnut', group:'wood', name:'Coffin Ebony', desc:'Black wood, silver numerals', col:['#3A2E2A','#0A0606','#E2E2E8'] },
        rv_crow: { from:'timber', group:'wood', name:'Scarecrow Straw', desc:'Straw yellow, brown numerals', col:['#E8D08A','#8A6A2A','#2A1A06'] },
        rv_gallows: { from:'ash', group:'wood', name:'Gallows Oak', desc:'Weathered grey, black numerals', col:['#A8A098','#3A3630','#0A0806'] },
        rv_hagwood: { from:'shipwreck', group:'wood', name:'Hag’s Hearth', desc:'Charred wood, glowing numerals' },
        rv_mausoleum: { from:'blackflag', group:'stone', name:'Mausoleum Marble', desc:'Grey marble, crimson numerals', col:['#DCD8D4','#7A7470','#5A0A14'], tex:'marble', metal:.08, rough:.35 },
        rv_raven: { from:'blackflag', group:'stone', name:'Raven Feather', desc:'Glossy black, violet numerals', ink:'#C9A6FF', css:['#4E454C','#0A090B','#C9A6FF'] },
        rv_bone: { from:'bone', group:'stone', name:'Ossuary', desc:'Bloodied bone, red numerals' },
        rv_tarokka: { from:'treasuremap', group:'stone', name:'Fortune Cards', desc:'Old card stock, violet numerals', ink:'#4A1A7A', css:['#AE9873','#765A34','#4A1A7A'] },
        rv_ghost: { from:'kraken', group:'glass', name:'Spectral Glass', desc:'Pale ghostlight, white numerals', col:['#C8E8FF','#3A6A9A','#FFFFFF'] },
        rv_chandelier: { from:'moby', group:'glass', name:'Crystal Chandelier', desc:'Milk glass, black numerals', col:['#FFFFFF','#C8C8D0','#120E1A'] },
        rv_tallow: { from:'moby', group:'glass', name:'Tallow Candle', desc:'Cream wax, oxblood numerals', col:['#F2E8D0','#A8946C','#4A0A14'] },
        rv_wallpaper: { from:'davyjones', group:'glass', name:'Poison Green Parlour', desc:'Arsenic green glass, cream numerals', col:['#5AC88A','#0E4A2A','#FFF6DC'] },
        rv_kiss: { from:'ruby', group:'gems', name:'Vampire’s Kiss', desc:'Blood-red ruby, silver numerals', ink:'#F0F0F4', css:['#FF6A78','#5A0412','#F0F0F4'] },
        rv_signet: { from:'ruby', group:'gems', name:'Count’s Signet', desc:'Deep garnet, gold numerals', col:['#B0303A','#3A0408','#FFD87A'] },
        rv_wolfsbane: { from:'amethyst', group:'gems', name:'Wolfsbane', desc:'Violet amethyst, pale numerals' },
        rv_pumpkin: { from:'topaz', group:'gems', name:'Jack-o’-Lantern', desc:'Pumpkin amber, black numerals', col:['#FFA84A','#B0480A','#120600'] },
        rv_bloodmoon: { from:'fire', group:'elemental', name:'Blood Moon', desc:'Dark red crust, pale numerals', col:['#9A1A20','#1A0204','#FFE0E0'], glow:0xff3040 },
        rv_mists: { from:'lightning', group:'elemental', name:'Dread Mists', desc:'Grey storm, pale numerals', col:['#9A9AA4','#26262E','#F2F0F6'], glow:0xe8e0ff },
        rv_swamp: { from:'acid', group:'elemental', name:'Bog Hag', desc:'Murky green scales, pale numerals', col:['#7A9A4A','#1A2A0A','#F2FFD0'] },
        rv_grave: { from:'cold', group:'elemental', name:'Grave Chill', desc:'Ice-grey frost, black numerals', col:['#E8ECF0','#8A929C','#0A0A10'] },
      } },
      underdark: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.2, bold:true, groups:{ metal:'The Spider City', wood:'The Old Mines', stone:'Deep Stone', glass:'The Sunless Sea', gems:'Glowing Caves', elemental:'Things That Ooze' }, sets:{
        ud_drowsilver: { from:'silver', group:'metal', name:'Drow Silver', desc:'Cold silver, violet numerals', col:['#E8E8F8','#7A7A9A','#4A1A8A'] },
        ud_spidergold: { from:'doubloon', group:'metal', name:'Spider-Queen Gold', desc:'Polished gold, black numerals', col:['#FFE07A','#A87810','#0A0600'] },
        ud_copper: { from:'bronze', group:'metal', name:'Copper Vein', desc:'Raw copper, dark numerals', col:['#FFB07A','#7A3410','#1A0802'] },
        ud_mithral: { from:'rosegold', group:'metal', name:'Mithral Web', desc:'Pink-silver, dark numerals', col:['#FFE0E8','#B88A98','#2A0A1A'] },
        ud_pickaxe: { from:'timber', group:'wood', name:'Pickaxe Handle', desc:'Worn ash wood, dark numerals', col:['#C8A878','#6A4A28','#1A1006'] },
        ud_zurkh: { from:'walnut', group:'wood', name:'Zurkhwood', desc:'Purple-brown mushroom wood, cream numerals', col:['#7A5A6A','#24141E','#FFF0E8'] },
        ud_driftroot: { from:'ash', group:'wood', name:'Petrified Root', desc:'Grey root, teal numerals', col:['#9A9A90','#3A3A34','#0E6A60'] },
        ud_lamp: { from:'shipwreck', group:'wood', name:'Burnt-Out Lamp', desc:'Charred wood, glowing numerals' },
        ud_obsidian: { from:'blackflag', group:'stone', name:'Obsidian Shard', desc:'Black glass, teal numerals', col:['#3A3448','#06040A','#5EF0D2'], tex:'marble', metal:.08, rough:.35 },
        ud_glowcap: { from:'blackflag', group:'stone', name:'Glowcap', desc:'Spotted violet cap, teal numerals', col:['#7A5AA8','#1A0E2A','#9CFFE8'], tex:'moss', rim:'rgba(0,0,0,.7)', metal:0, rough:.9 },
        ud_darkiron: { from:'cannon', group:'stone', name:'Duergar Iron', desc:'Dark pitted iron, pale numerals', col:['#5E5868','#16121C','#E8E1F2'] },
        ud_hook: { from:'bone', group:'stone', name:'Hook Horror', desc:'Bleached bone, red numerals' },
        ud_lake: { from:'davyjones', group:'glass', name:'Sunless Sea', desc:'Black water, pale numerals', col:['#2E8C86','#03201E','#E8FFFB'] },
        ud_silk: { from:'moby', group:'glass', name:'Spider Silk', desc:'Grey-white silk, violet numerals', col:['#E8E4EE','#8A8298','#3A1E6A'] },
        ud_gelatin: { from:'kraken', group:'glass', name:'Gelatinous Cube', desc:'Clear green jelly, dark numerals', col:['#C8F5D0','#4A9A6A','#0E2A1A'] },
        ud_kuotoa: { from:'poseidon', group:'glass', name:'Kuo-toa Pearl', desc:'Fishscale blue, gold numerals', col:['#7AD0E0','#0A4A5A','#FFE07A'] },
        ud_geode: { from:'amethyst', group:'gems', name:'Geode Heart', desc:'Violet crystal, pale numerals' },
        ud_crystal: { from:'emerald', group:'gems', name:'Glowcrystal', desc:'Teal crystal, pale numerals', col:['#7DF7DF','#06463E','#F2FFFC'] },
        ud_houseruby: { from:'ruby', group:'gems', name:'House Ruby', desc:'Wine-red ruby, silver numerals', ink:'#EEF0F8', css:['#FF6A78','#5A0412','#EEF0F8'] },
        ud_sapphire: { from:'amethyst', group:'gems', name:'Cave Sapphire', desc:'Deep blue gem, pale numerals', col:['#6A9AFF','#0A1A5A','#F2F6FF'] },
        ud_worm: { from:'acid', group:'elemental', name:'Purple Worm', desc:'Violet scales, pale numerals', col:['#B07AE0','#2A0E40','#FFF2FF'], glow:0xd08cff },
        ud_pudding: { from:'acid', group:'elemental', name:'Black Pudding', desc:'Tar-black scales, acid numerals', col:['#4A4A44','#0A0A08','#9CFF6A'], glow:0x9cff6a },
        ud_faerie: { from:'lightning', group:'elemental', name:'Faerie Fire', desc:'Violet sparks, white numerals', col:['#8A5AE0','#140A2E','#FFFFFF'], glow:0xc8a0ff },
        ud_umber: { from:'fire', group:'elemental', name:'Umber Hulk', desc:'Molten brown, yellow numerals', col:['#9A6A3A','#1A0E04','#FFE84A'], glow:0xffc040 },
      } },
      icewind: { font:'"Cinzel", Georgia, serif', bold:true, groups:{ metal:'Moon & Starmetal', wood:'The Ten Towns', stone:'The Spine of the World', glass:'The Sea of Moving Ice', gems:'Frozen Gems', elemental:'Northern Lights' }, sets:{
        iw_moonsilver: { from:'silver', group:'metal', name:'Moonlit Silver', desc:'Polished silver, dark numerals' },
        iw_starmetal: { from:'silver', group:'metal', name:'Starmetal', desc:'Blue-silver, navy numerals', col:['#DDE8FF','#5A6E9A','#0E1A33'] },
        iw_lantern: { from:'bronze', group:'metal', name:'Ice-Fishing Lantern', desc:'Warm brass, dark numerals', col:['#FFD08A','#8A5A18','#1A0E02'] },
        iw_mead: { from:'doubloon', group:'metal', name:'Mead Hall Gold', desc:'Honey gold, dark numerals' },
        iw_pine: { from:'timber', group:'wood', name:'Frozen Pine', desc:'Dark pine, frost numerals', col:['#5E6A58','#1A2018','#E6F2FA'] },
        iw_antler: { from:'ash', group:'wood', name:'Reindeer Antler', desc:'Pale antler, dark numerals', col:['#E8DCC8','#8A7458','#1A1008'] },
        iw_sled: { from:'walnut', group:'wood', name:'Dog Sled', desc:'Lacquered walnut, white numerals', ink:'#FFFFFF', css:['#573925','#180E06','#FFFFFF'] },
        iw_hearth: { from:'shipwreck', group:'wood', name:'Hearthfire Log', desc:'Charred wood, glowing numerals' },
        iw_granite: { from:'cannon', group:'stone', name:'Granite Peak', desc:'Grey stone, white numerals', col:['#A8A8A8','#3A3A3A','#FFFFFF'] },
        iw_polar: { from:'blackflag', group:'stone', name:'Polar Night', desc:'Deep navy, silver numerals', col:['#1E2A4A','#03060E','#E6F2FF'], tex:'nebula', rim:'rgba(0,0,10,.8)', metal:.1, rough:.35 },
        iw_marble: { from:'blackflag', group:'stone', name:'Snow Marble', desc:'White marble, blue numerals', col:['#FFFFFF','#C0C8D0','#1F4E7A'], tex:'marble', metal:.08, rough:.35 },
        iw_runestone: { from:'bone', group:'stone', name:'Runestone', desc:'Weathered bone, red numerals' },
        iw_seaice: { from:'kraken', group:'glass', name:'Sea Ice', desc:'Icy glass, navy numerals', col:['#CFEFFF','#3A6E8E','#0E2A44'] },
        iw_crevasse: { from:'davyjones', group:'glass', name:'Crevasse Blue', desc:'Deep blue ice, white numerals', col:['#5AA8E8','#0A2A6A','#FFFFFF'] },
        iw_ivory: { from:'moby', group:'glass', name:'Mammoth Tusk', desc:'Carved ivory, navy numerals' },
        iw_scrimshaw: { from:'moby', group:'glass', name:'Knucklehead Scrimshaw', desc:'Fish-bone white, ink numerals', col:['#F6F0E2','#B8A888','#14203A'] },
        iw_frostgiant: { from:'emerald', group:'gems', name:'Frost Giant’s Eye', desc:'Pale cyan gem, navy numerals', col:['#B8F4FF','#2A7A9A','#0A1A3A'] },
        iw_wyrmrime: { from:'amethyst', group:'gems', name:'Rime Wyrm', desc:'Lavender crystal, white numerals', col:['#D8C8FF','#5A4AA8','#FFFFFF'] },
        iw_remorhaz: { from:'ruby', group:'gems', name:'Remorhaz Heart', desc:'Fire-red gem, white numerals', col:['#FF5A3A','#4A0602','#FFFFFF'] },
        iw_sunstone: { from:'topaz', group:'gems', name:'Midnight Sunstone', desc:'Amber gem, dark numerals' },
        iw_glacier: { from:'cold', group:'elemental', name:'Glacier Heart', desc:'Glacier ice, navy numerals' },
        iw_hoarfrost: { from:'cold', group:'elemental', name:'Hoarfrost', desc:'White frost, blue numerals', col:['#FFFFFF','#B8CCDC','#1F4E7A'] },
        iw_blizzard: { from:'lightning', group:'elemental', name:'Blizzard', desc:'Snow storm, white numerals', col:['#B8C6D4','#3A4A5C','#FFFFFF'], glow:0xe6f6ff },
        iw_aurora: { from:'acid', group:'elemental', name:'Aurora', desc:'Green-shimmer scales, white numerals', col:['#4AD0A0','#06302A','#FFFFFF'], glow:0x8affc8 },
      } },
      avernus: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.25, bold:true, groups:{ metal:'The Devil’s Forge', wood:'Ashen Offerings', stone:'The Burning Plains', glass:'Fallen Angels', gems:'Pacts & Souls', elemental:'The Blood War' }, sets:{
        av_brass: { from:'bronze', group:'metal', name:'Brazen Bull', desc:'Polished brass, dark numerals', col:['#FFD89A','#8A5A14','#1A0E02'] },
        av_molten: { from:'doubloon', group:'metal', name:'Molten Gold', desc:'Polished gold, dark numerals' },
        av_halo: { from:'doubloon', group:'metal', name:'Tarnished Halo', desc:'Pale gold, blue numerals', col:['#FFF4C8','#C8A84A','#1A3A8A'] },
        av_chainsilver: { from:'silver', group:'metal', name:'Silver Shackles', desc:'Cold silver, red numerals', col:['#F0F0F4','#8A8A94','#8A0A0A'] },
        av_ashen: { from:'shipwreck', group:'wood', name:'Ashen Offering', desc:'Charred wood, glowing numerals' },
        av_gallows: { from:'walnut', group:'wood', name:'Infernal Gallows', desc:'Blackened wood, ember numerals', col:['#3A2A22','#0E0806','#FF9A4A'] },
        av_crossbow: { from:'timber', group:'wood', name:'Hellrider’s Crossbow', desc:'Pale yew, red numerals', col:['#E8D0A8','#8A6A44','#8A0E0A'] },
        av_cart: { from:'ash', group:'wood', name:'Supply-Cart Ash', desc:'Grey ash, orange numerals', col:['#B0A89C','#46403A','#C0480A'] },
        av_obsidian: { from:'blackflag', group:'stone', name:'Obsidian Blade', desc:'Volcanic glass, white numerals', col:['#4A4458','#08060E','#FFFFFF'], tex:'marble', metal:.08, rough:.35 },
        av_cinder: { from:'blackflag', group:'stone', name:'Soot & Cinders', desc:'Sooty black, ember numerals', col:['#5A4A42','#0E0A08','#FFB060'] },
        av_throne: { from:'bone', group:'stone', name:'Bone Throne', desc:'Bloodied bone, red numerals' },
        av_contract: { from:'treasuremap', group:'stone', name:'Signed in Blood', desc:'Old contract, blood numerals', ink:'#8A0E0A', css:['#AE9873','#765A34','#8A0E0A'] },
        av_lament: { from:'kraken', group:'glass', name:'Angel’s Lament', desc:'Sky-blue glass, white numerals', col:['#9ACFFF','#1A4A8A','#FFFFFF'] },
        av_feather: { from:'moby', group:'glass', name:'Fallen Feather', desc:'Ash-white, black numerals', col:['#F2F0EC','#B0AAA0','#0A0806'] },
        av_styx: { from:'davyjones', group:'glass', name:'River Styx', desc:'Murky green water, gold numerals', col:['#4A6A4A','#0E180E','#FFD27A'] },
        av_tear: { from:'poseidon', group:'glass', name:'Celestial Tear', desc:'Bright turquoise, gold numerals' },
        av_soulcoin: { from:'ruby', group:'gems', name:'Soul Coin', desc:'Blood-red ruby, gold numerals' },
        av_bloodstone: { from:'ruby', group:'gems', name:'Bloodstone', desc:'Dark garnet, pale numerals', col:['#B04A3A','#2A0806','#FFE6C8'] },
        av_bargain: { from:'amethyst', group:'gems', name:'Devil’s Bargain', desc:'Royal blue gem, gold numerals', col:['#6A8AFF','#0A1A6A','#FFD87A'] },
        av_zariel: { from:'topaz', group:'gems', name:'Zariel’s Sword', desc:'Burning amber, black numerals', col:['#FFC04A','#B05A00','#0E0400'] },
        av_hellfire: { from:'fire', group:'elemental', name:'Hellfire Crust', desc:'Lava crust, gold numerals' },
        av_sulphur: { from:'lightning', group:'elemental', name:'Sulphur Storm', desc:'Yellow haze, dark numerals', col:['#E0C870','#5A4A14','#1A1004'], glow:0xffe070, rim:'rgba(255,250,220,.7)' },
        av_demon: { from:'acid', group:'elemental', name:'Demon Hide', desc:'Acid-green scales, black numerals', col:['#8AD04A','#1A3A0A','#0A1404'], glow:0xb0ff50 },
        av_abyss: { from:'lightning', group:'elemental', name:'Abyssal Rift', desc:'Violet storm, pink numerals', col:['#6A2A8A','#14041E','#FF8AD8'], glow:0xff8ad8 },
      } },
    }
  }
};
