
/* ============================================================================
   THEMES — look-and-feel that a character pack can pick (PACK.theme).
   A theme is three things:
     1. CSS tokens: the <style id="theme-css"> block (colours, fonts, textures). Swap that block to reskin.
     2. words:  the few places the UI speaks in the theme's voice (button labels, headings, the crit icon).
                Any key left out falls back to plain English (see WORD in #main).
     3. dice:   the 3D dice sets offered in ☰ → Dice set. Each set: name, desc, grad [light, deep] hex for the
                three.js faces, body (fallback colour), ink (numerals), rim (numeral shadow), metal/rough
                (material), css [light, deep, ink] for the menu swatch. Optional: pips:true draws d6 pips,
                tex:'wood'|'bone'|'tar'|'hammered'|'caustic'|'seaglass'|'gem'|'char'|'iron'|'map'|'lava'|'frost'|'acid'|'storm'|'marble'|'nebula'|'moss' adds a surface texture,
                glow (hex colour) lights up the texture's veins (lava cracks, acid bubbles, storm bolts), alpha<1 lets gems glow slightly see-through, bold:true draws numerals solid with a pale halo (rim),
                font overrides the numeral font family, matte:true removes all highlights (raw wood), shine:true adds polished reflections (studio:'cool' for silver tones).
                group: menu section (labels in diceGroups). The order here is the default order within each group
                (players can reorder in ☰ → Dice Sets).
   fonts: the Google Fonts stylesheet the tokens' --f-* families need (written into the page head on sync).
   Add a theme: copy "pirate", rename the key, change words/dice/fonts, ship matching #theme-css tokens.
   ============================================================================ */
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
    // Menu groups for the dice sets, in display order
    diceGroups: { pirate:'A Pirate’s Life', metal:'Reforged Treasures', wood:'Carved Wood', sea:'Mythical Creatures', gem:'Precious Gems', elemental:'Elemental Powers' },
    // Matched pirate dice sets: every die in a set shares one look.
    dice: {
      blackflag: { name:'Black Flag', group:'pirate',   desc:'Brushed pitch, gold numerals', tex:'tar',          grad:[0x4E454C,0x0A090B], body:0x221E22, ink:'#E9B949', rim:'rgba(0,0,0,.75)',      metal:.15, rough:.5,  css:['#4E454C','#0A090B','#E9B949'] },
      bone:      { name:'Bone & Blood', group:'pirate', desc:'Bloodied bone, red numerals', tex:'bone', matte:true, dim:.86, bold:true, font:'"Alegreya SC", Georgia, serif', grad:[0xEFEAE0,0xA59E92], body:0xDCD5C8, ink:'#6E0A0A', rim:'rgba(250,242,222,.85)', metal:0, rough:.88, css:['#EDE0C2','#8F7350','#6E0A0A'] },
      cannon:    { name:'Cannon Iron', group:'pirate', desc:'Pitted iron, chalk numerals', tex:'iron', grad:[0x84888C,0x26292C], body:0x44474A, ink:'#F2EEE4', rim:'rgba(0,0,0,.7)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.6, rough:.55, css:['#6E7276','#1A1C1E','#F2EEE4'] },
      treasuremap: { name:'Treasure Map', group:'pirate', desc:'Old parchment, ink numerals', tex:'map', matte:true, dim:.8, grad:[0xAE9873,0x765A34], body:0x9E8763, ink:'#3A2410', rim:'rgba(255,248,230,.5)', metal:0, rough:1, css:['#F2E2BE','#B08A56','#3A2410'] },
      doubloon:  { name:'Doubloon', group:'metal',     desc:'Polished gold, dark numerals', shine:true, grad:[0xFFF0A0,0xC2900E], body:0xF0C040, ink:'#2E1A03', rim:'rgba(255,246,200,.85)', metal:.9, rough:.15, css:['#FFF0A0','#C2900E','#2E1A03'] },
      rosegold:  { name:'Rose Doubloon', group:'metal', desc:'Rose gold, dark numerals', shine:true, studio:'rose', grad:[0xFFE6C6,0xDC9470], body:0xF2BC98, ink:'#4A1A18', rim:'rgba(255,240,230,.85)', metal:.9, rough:.16, css:['#FFE6C6','#DC9470','#4A1A18'] },
      silver:    { name:'Piece of Eight', group:'metal', desc:'Polished silver, dark numerals', shine:true, studio:'cool', grad:[0xF6F7F9,0x6E747C], body:0xC8CCD2, ink:'#1C2026', rim:'rgba(255,255,255,.8)', metal:.85, rough:.22, css:['#F6F7F9','#6E747C','#1C2026'] },
      bronze:    { name:'Ship’s Bell', group:'metal', desc:'Polished bronze, dark numerals', shine:true, grad:[0xF0AE78,0x6E3614], body:0xC07A48, ink:'#260E04', rim:'rgba(255,226,196,.8)', metal:.85, rough:.24, css:['#F0AE78','#6E3614','#260E04'] },
      walnut:    { name:'Captain’s Walnut', group:'wood', desc:'Oiled walnut, cream numerals', tex:'wood', grad:[0x573925,0x180E06], body:0x3A2516, ink:'#F1DDB0', rim:'rgba(20,10,4,.7)', metal:0, rough:.7, css:['#573925','#180E06','#F1DDB0'] },
      timber:    { name:'Ship’s Timber', group:'wood', desc:'Raw oak, burnt numerals', tex:'wood', matte:true, grad:[0xA27A56,0x4A2E18], body:0x9A6A3C, ink:'#24120A', rim:'rgba(255,236,200,.35)', metal:0, rough:1, css:['#B88A60','#4A2E18','#24120A'] },
      ash:       { name:'Driftwood', group:'wood', desc:'Sea-weathered ash, dark numerals', tex:'wood', matte:true, dim:.85, grad:[0x86694A,0x3F2C1B], body:0x6A5238, ink:'#1A1008', rim:'rgba(240,226,200,.3)', metal:0, rough:1, css:['#A88B68','#5E4630','#1A1008'] },
      shipwreck: { name:'Shipwreck', group:'wood', desc:'Charred wood, glowing numerals', tex:'char', grad:[0x4A3A2E,0x0E0906], body:0x3A2A1E, ink:'#FF9A3C', rim:'rgba(30,8,0,.85)', bold:true, metal:0, rough:1, css:['#5E4A3A','#140D08','#FF9A3C'] },
      davyjones: { name:'Davy Jones’ Pearl', group:'sea', desc:'Deep-sea blue, pearl numerals', tex:'caustic', grad:[0x4A72C4,0x0B1430], body:0x1A2C55, ink:'#E9EEF5', rim:'rgba(0,6,20,.7)', metal:.3, rough:.32, css:['#4A72C4','#0B1430','#E9EEF5'] },
      kraken:    { name:'Kraken’s Revenge', group:'sea',  desc:'Sea glass, cream numerals', tex:'seaglass',  grad:[0x45AE9F,0x0A2E34], body:0x1F6B70, ink:'#F3E6C4', rim:'rgba(0,20,24,.6)',     metal:.25, rough:.28, css:['#58C9B8','#0B3238','#F3E6C4'] },
      poseidon:  { name:'Poseidon’s Trident', group:'sea', desc:'Turquoise shard, gold numerals', tex:'caustic', shine:true, studio:'cool', grad:[0x7EE2E8,0x08506E], body:0x1A8AA0, ink:'#FFD877', rim:'rgba(0,20,30,.75)', metal:.35, rough:.22, css:['#7EE2E8','#08506E','#FFD877'] },
      moby:      { name:'Moby Dick’s Tooth', group:'sea', desc:'Scrimshaw ivory, navy numerals', tex:'seaglass', studio:'cool', grad:[0xF6F8FA,0x8794A4], body:0xD8DEE6, ink:'#1A2A40', rim:'rgba(255,255,255,.7)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.1, rough:.45, css:['#F6F8FA','#8794A4','#1A2A40'] },
      emerald:   { name:'Mermaid’s Emerald', group:'gem', desc:'Green sapphire, pale numerals', tex:'gem', shine:true, studio:'cool', alpha:.93, grad:[0x5FE0A0,0x06402A], body:0x14805A, ink:'#EFFFF6', rim:'rgba(0,30,18,.7)', metal:.2, rough:.12, css:['#5FE0A0','#06402A','#EFFFF6'] },
      ruby:      { name:'Corsair’s Ruby', group:'gem', desc:'Blood-red ruby, gold numerals', tex:'gem', shine:true, studio:'cool', alpha:.93, grad:[0xFF6A78,0x5A0412], body:0xB01428, ink:'#FFE3A0', rim:'rgba(40,0,6,.75)', metal:.2, rough:.12, css:['#FF6A78','#5A0412','#FFE3A0'] },
      amethyst:  { name:'Siren’s Amethyst', group:'gem', desc:'Violet amethyst, pale numerals', tex:'gem', shine:true, studio:'cool', alpha:.93, grad:[0xC89BFF,0x34105E], body:0x7A3EB8, ink:'#F7F0FF', rim:'rgba(20,0,40,.7)', metal:.2, rough:.12, css:['#C89BFF','#34105E','#F7F0FF'] },
      topaz:     { name:'Sunken Topaz', group:'gem', desc:'Amber topaz, dark numerals', tex:'gem', shine:true, alpha:.93, grad:[0xFFD27A,0x9A4A08], body:0xE09030, ink:'#2A1204', rim:'rgba(255,240,210,.8)', metal:.2, rough:.12, css:['#FFD27A','#9A4A08','#2A1204'] },
      fire:      { name:'Dragonfire', group:'elemental', desc:'Lava crust, gold numerals', tex:'lava', glow:0xff5a10, grad:[0x5A2414,0x140604], body:0x3A140A, ink:'#FFD27A', rim:'rgba(30,6,0,.85)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:0, rough:.9, css:['#7A2A12','#140604','#FFD27A'] },
      cold:      { name:'Frostbite', group:'elemental', desc:'Glacier ice, navy numerals', tex:'frost', shine:true, studio:'cool', alpha:.92, grad:[0xE2F4FF,0x5890C4], body:0xA8CCE8, ink:'#0E2A44', rim:'rgba(255,255,255,.75)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.15, rough:.18, css:['#EEF8FF','#6CA6D2','#0E2A44'] },
      acid:      { name:'Snake’s Acid', group:'elemental', desc:'Serpent scales, pale numerals', tex:'acid', glow:0x9cff3a, grad:[0x6E9A30,0x0E1C06], body:0x3A5A18, ink:'#F2FFDC', rim:'rgba(0,0,0,0)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.15, rough:.35, css:['#6E9A30','#0E1C06','#F2FFDC'] },
      lightning: { name:'Thunderstrike', group:'elemental', desc:'Thunderhead, white numerals', tex:'storm', glow:0xd6c2ff, grad:[0x8A93A8,0x1E2236], body:0x444A60, ink:'#EAF6FF', rim:'rgba(0,0,20,.8)', bold:true, font:'"Alegreya SC", Georgia, serif', metal:.2, rough:.4, css:['#7A8296','#161A2C','#EAF6FF'] }
    },
    // The web app's other looks (☰ → Theme, <html data-skin>) offer their own dice sets instead of the pirate ones
    // (engine §06 skinDiceSets). Each set: from = a pirate set to start from (its texture and material), then any
    // field to change; col:[light, deep, numerals] recolours it (faces, body and menu swatch in one go). font is the
    // look's numeral font unless a set says otherwise. Keys are unique across looks, so each look keeps its own pick.
    skinDice: {
      // Dragon Keep: royal gold and indigo
      fantasy: { font:'"Cinzel", Georgia, serif', bold:true, groups:{ vault:'The King’s Vault', tower:'The Wizard’s Tower', lair:'Dragon Lairs' }, sets:{
        fk_crown:     { from:'doubloon', group:'vault', name:'Sunlit Crown',        desc:'Polished gold, dark numerals' },
        fk_mithril:   { from:'silver',   group:'vault', name:'Elven Mithril',       desc:'Moon-bright silver, ink numerals' },
        fk_throne:    { from:'blackflag', group:'vault', name:'Throne Room Marble', desc:'White marble, gold numerals', tex:'marble', col:['#F6F2E8','#B4AC9E','#8A6410'], rim:'rgba(255,255,255,.7)', metal:.05, rough:.35 },
        fk_tourney:   { from:'bronze',   group:'vault', name:'Tourney Bronze',      desc:'Polished bronze, dark numerals' },
        fk_grimoire:  { from:'blackflag', group:'tower', name:'Midnight Grimoire',  desc:'Starry indigo, gold numerals', tex:'nebula', col:['#4A52A8','#0C0E2C','#F2CF6A'], rim:'rgba(0,0,20,.8)', metal:.1, rough:.35 },
        fk_amethyst:  { from:'amethyst', group:'tower', name:'Archmage’s Amethyst', desc:'Violet amethyst, pale numerals' },
        fk_scrying:   { from:'amethyst', group:'tower', name:'Scrying Sapphire',    desc:'Deep sapphire, pale numerals', col:['#7FA8FF','#0C1E5E','#F3F6FF'], rim:'rgba(0,6,30,.7)' },
        fk_vellum:    { from:'moby',     group:'tower', name:'Spellbound Vellum',   desc:'Cream vellum, indigo numerals', col:['#F6F0E0','#B0A486','#1E2450'] },
        fk_redwyrm:   { from:'fire',     group:'lair',  name:'Red Wyrm’s Breath',   desc:'Lava crust, gold numerals' },
        fk_gilded:    { from:'acid',     group:'lair',  name:'Gilded Scales',       desc:'Golden scales, dark numerals', col:['#F2D27A','#7A5410','#2A1A04'], glow:0xffd060, rim:'rgba(255,240,200,.7)' },
        fk_wyvern:    { from:'acid',     group:'lair',  name:'Wyvern Venom',        desc:'Green scales, pale numerals' },
        fk_frostwyrm: { from:'cold',     group:'lair',  name:'White Dragon’s Fang', desc:'Glacier ice, navy numerals' },
      } },
      // Starfarer: cyan and navy
      space: { font:'"Orbitron", system-ui, sans-serif', bold:true, groups:{ hull:'Hull & Hardware', cosmos:'Deep Space', core:'Energy Cores' }, sets:{
        sp_hull:      { from:'silver',   group:'hull',   name:'Hull Plating',       desc:'Brushed alloy, dark numerals', tex:'hammered' },
        sp_gunmetal:  { from:'cannon',   group:'hull',   name:'Gunmetal',           desc:'Scuffed grey metal, white numerals', col:['#9AA2AC','#2E343C','#F2F6FA'] },
        sp_wiring:    { from:'bronze',   group:'hull',   name:'Copper Wiring',      desc:'Bright copper, dark numerals', col:['#FFC09A','#8A3A14','#1A0A04'] },
        sp_carbon:    { from:'blackflag', group:'hull',  name:'Carbon Fibre',       desc:'Woven black, cyan numerals', col:['#4A4E58','#101216','#5FF0FF'] },
        sp_nebula:    { from:'blackflag', group:'cosmos', name:'Violet Nebula',     desc:'Violet starfield, cyan numerals', tex:'nebula', col:['#7A58C8','#0E0A26','#7FF3FF'], rim:'rgba(0,0,20,.8)', metal:.1, rough:.35 },
        sp_horizon:   { from:'blackflag', group:'cosmos', name:'Event Horizon',     desc:'Black starfield, gold numerals', tex:'nebula', col:['#3A3F5A','#04050C','#FFD877'], rim:'rgba(0,0,0,.85)', metal:.1, rough:.35 },
        sp_bluedot:   { from:'kraken',   group:'cosmos', name:'Pale Blue Dot',      desc:'Hazy blue glass, navy numerals', col:['#BFE6FF','#2A5C8E','#0B1A33'] },
        sp_comet:     { from:'cold',     group:'cosmos', name:'Comet Tail',         desc:'Icy white, violet numerals', col:['#F2F6FF','#9AA6D8','#3A1E8A'] },
        sp_plasma:    { from:'lightning', group:'core',  name:'Plasma Coil',        desc:'Charged cloud, white numerals', col:['#6FA6E8','#0E1A3A','#F2FAFF'], glow:0x7ff3ff },
        sp_solar:     { from:'fire',     group:'core',   name:'Solar Flare',        desc:'Burning plasma, pale numerals', col:['#FF9A3C','#3A0C04','#FFF2C8'], glow:0xffb040 },
        sp_quantum:   { from:'emerald',  group:'core',   name:'Quantum Shard',      desc:'Cyan crystal, pale numerals', col:['#8FF6FF','#085A70','#F2FEFF'], rim:'rgba(0,20,30,.7)' },
        sp_antimatter:{ from:'acid',     group:'core',   name:'Antimatter',         desc:'Magenta charge, pale numerals', col:['#D46AFF','#2A0A3A','#FFF0FF'], glow:0xff7aff },
      } },
      // Feywild: moss green, gold and blossom
      woodland: { font:'"Uncial Antiqua", Georgia, serif', fscale:1.1, groups:{ grove:'The Old Grove', court:'The Blossom Court', wild:'Wild Magic' }, sets:{
        fw_heartwood: { from:'walnut',   group:'grove',  name:'Heartwood Oak',      desc:'Oiled oak, cream numerals' },
        fw_birch:     { from:'timber',   group:'grove',  name:'Silver Birch',       desc:'Pale birch, dark numerals', col:['#E8E2D2','#9C927C','#2A2418'] },
        fw_stone:     { from:'blackflag', group:'grove', name:'Standing Stone',     desc:'Mossy stone, cream numerals', tex:'moss', col:['#8AA06A','#24301A','#F6F2DC'], rim:'rgba(0,0,0,.7)', bold:true, metal:0, rough:.95, matte:true },
        fw_willow:    { from:'ash',      group:'grove',  name:'Weeping Willow',     desc:'Grey-green bark, dark numerals', col:['#B4B898','#5A5E40','#1A1C10'] },
        fw_amber:     { from:'topaz',    group:'court',  name:'Amber Sap',          desc:'Honey amber, dark numerals' },
        fw_rose:      { from:'rosegold', group:'court',  name:'Briar Rose',         desc:'Rose gold, dark numerals' },
        fw_bluebell:  { from:'kraken',   group:'court',  name:'Bluebell Glass',     desc:'Lilac glass, white numerals', col:['#B8C8FF','#3A4A9A','#FFFFFF'] },
        fw_emerald:   { from:'emerald',  group:'court',  name:'Summer Queen’s Emerald', desc:'Green sapphire, pale numerals' },
        fw_dew:       { from:'kraken',   group:'wild',   name:'Morning Dew',        desc:'Green glass, cream numerals', col:['#9EE0A8','#1E5A3A','#F6FFF2'] },
        fw_bramble:   { from:'acid',     group:'wild',   name:'Bramblescale',       desc:'Thorny scales, pale numerals' },
        fw_wisp:      { from:'blackflag', group:'wild',  name:'Will-o’-Wisp',       desc:'Dark marsh, glowing numerals', tex:'nebula', col:['#3E7A5A','#0A1E14','#EAFFB0'], rim:'rgba(0,0,0,.8)', bold:true, metal:.1, rough:.4 },
        fw_toadstool: { from:'blackflag', group:'wild',  name:'Toadstool Cap',      desc:'Red cap, white numerals', tex:'moss', col:['#D2483C','#5A1410','#FFF8EC'], rim:'rgba(60,0,0,.75)', bold:true, metal:0, rough:.8 },
      } },
      // Ravenloft: crimson, violet and old silver
      gothic: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.2, bold:true, groups:{ crypt:'The Crypt', blood:'Blood & Bone', mist:'Out of the Mists' }, sets:{
        rv_coffin:    { from:'walnut',   group:'crypt',  name:'Coffin Ebony',       desc:'Black wood, silver numerals', col:['#3A2E2A','#0A0606','#E2E2E8'] },
        rv_gravedig:  { from:'cannon',   group:'crypt',  name:'Gravedigger’s Spade', desc:'Rusted iron, bone numerals', col:['#6A6460','#1A1614','#EDE4D0'] },
        rv_stake:     { from:'silver',   group:'crypt',  name:'Silver Stake',       desc:'Polished silver, dark numerals' },
        rv_mausoleum: { from:'blackflag', group:'crypt', name:'Mausoleum Marble',   desc:'Grey marble, crimson numerals', tex:'marble', col:['#DCD8D4','#7A7470','#5A0A14'], rim:'rgba(255,255,255,.6)', metal:.05, rough:.4 },
        rv_bone:      { from:'bone',     group:'blood',  name:'Ossuary',            desc:'Bloodied bone, red numerals' },
        rv_kiss:      { from:'ruby',     group:'blood',  name:'Vampire’s Kiss',     desc:'Blood-red ruby, silver numerals', ink:'#F0F0F4', css:['#FF6A78','#5A0412','#F0F0F4'] },
        rv_bloodmoon: { from:'fire',     group:'blood',  name:'Blood Moon',         desc:'Dark red crust, pale numerals', col:['#9A1A20','#1A0204','#FFE0E0'], glow:0xff3040 },
        rv_wolfsbane: { from:'amethyst', group:'blood',  name:'Wolfsbane',          desc:'Violet amethyst, pale numerals' },
        rv_raven:     { from:'blackflag', group:'mist',  name:'Raven Feather',      desc:'Glossy black, violet numerals', ink:'#C9A6FF', css:['#4E454C','#0A090B','#C9A6FF'] },
        rv_mists:     { from:'lightning', group:'mist',  name:'Dread Mists',        desc:'Grey storm, pale numerals', col:['#9A9AA4','#26262E','#F2F0F6'], glow:0xe8e0ff },
        rv_witchlight:{ from:'blackflag', group:'mist',  name:'Witchlight',         desc:'Violet haze, green numerals', tex:'nebula', col:['#5A3A7A','#120A1E','#C9FFB0'], rim:'rgba(0,0,0,.8)', metal:.1, rough:.4 },
        rv_tallow:    { from:'moby',     group:'mist',   name:'Tallow Candle',      desc:'Cream wax, oxblood numerals', col:['#F2E8D0','#A8946C','#4A0A14'] },
      } },
      // Underdark: teal glow and violet stone
      underdark: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.2, bold:true, groups:{ stone:'Deep Stone', glow:'Glowing Caves', ooze:'Things That Ooze' }, sets:{
        ud_obsidian:  { from:'blackflag', group:'stone', name:'Obsidian Shard',     desc:'Black glass, teal numerals', tex:'marble', col:['#3A3448','#06040A','#5EF0D2'], metal:.15, rough:.25 },
        ud_darkiron:  { from:'cannon',   group:'stone',  name:'Duergar Iron',       desc:'Dark pitted iron, pale numerals', col:['#5E5868','#16121C','#E8E1F2'] },
        ud_geode:     { from:'amethyst', group:'stone',  name:'Geode Heart',        desc:'Violet crystal, pale numerals' },
        ud_silk:      { from:'moby',     group:'stone',  name:'Spider Silk',        desc:'Grey-white silk, violet numerals', col:['#E8E4EE','#8A8298','#3A1E6A'] },
        ud_glowcap:   { from:'blackflag', group:'glow',  name:'Glowcap',            desc:'Spotted violet cap, teal numerals', tex:'moss', col:['#7A5AA8','#1A0E2A','#9CFFE8'], rim:'rgba(0,0,0,.8)', metal:0, rough:.9 },
        ud_faerie:    { from:'blackflag', group:'glow',  name:'Faerie Fire',        desc:'Violet sparks, white numerals', tex:'nebula', col:['#8A5AE0','#140A2E','#FFFFFF'], rim:'rgba(0,0,0,.8)', metal:.1, rough:.4 },
        ud_crystal:   { from:'emerald',  group:'glow',   name:'Glowcrystal',        desc:'Teal crystal, pale numerals', col:['#7DF7DF','#06463E','#F2FFFC'] },
        ud_lake:      { from:'davyjones', group:'glow',  name:'Sunless Sea',        desc:'Black water, pale numerals', col:['#2E8C86','#03201E','#E8FFFB'] },
        ud_gelatin:   { from:'cold',     group:'ooze',   name:'Gelatinous Cube',    desc:'Clear green jelly, dark numerals', col:['#C8F5D0','#4A9A6A','#0E2A1A'] },
        ud_pudding:   { from:'blackflag', group:'ooze',  name:'Black Pudding',      desc:'Tar black, acid-green numerals', ink:'#9CFF6A', css:['#4E454C','#0A090B','#9CFF6A'] },
        ud_worm:      { from:'acid',     group:'ooze',   name:'Purple Worm',        desc:'Violet scales, pale numerals', col:['#B07AE0','#2A0E40','#FFF2FF'], glow:0xd08cff },
        ud_spores:    { from:'blackflag', group:'ooze',  name:'Myconid Spores',     desc:'Speckled tan, brown numerals', tex:'moss', col:['#D8C6A0','#7A6440','#2A1A08'], rim:'rgba(255,255,255,.5)', metal:0, rough:.9 },
      } },
      // Icewind Dale: ice blue, navy and aurora green
      icewind: { font:'"Cinzel", Georgia, serif', bold:true, groups:{ ice:'Ice & Snow', north:'The Frozen North', lights:'Northern Lights' }, sets:{
        iw_glacier:   { from:'cold',     group:'ice',    name:'Glacier Heart',      desc:'Glacier ice, navy numerals' },
        iw_hoarfrost: { from:'cold',     group:'ice',    name:'Hoarfrost',          desc:'White frost, blue numerals', col:['#FFFFFF','#B8CCDC','#1F4E7A'] },
        iw_seaice:    { from:'kraken',   group:'ice',    name:'Sea of Moving Ice',  desc:'Icy glass, navy numerals', col:['#CFEFFF','#3A6E8E','#0E2A44'] },
        iw_snowdrift: { from:'moby',     group:'ice',    name:'Snowdrift',          desc:'Powder white, steel numerals', col:['#FFFFFF','#C8D4E0','#2A3A54'] },
        iw_ivory:     { from:'moby',     group:'north',  name:'Mammoth Tusk',       desc:'Carved ivory, navy numerals' },
        iw_pine:      { from:'timber',   group:'north',  name:'Frozen Pine',        desc:'Dark pine, frost numerals', col:['#5E6A58','#1A2018','#E6F2FA'] },
        iw_moonsilver:{ from:'silver',   group:'north',  name:'Moonlit Silver',     desc:'Polished silver, dark numerals' },
        iw_antler:    { from:'ash',      group:'north',  name:'Reindeer Antler',    desc:'Pale antler, dark numerals', col:['#E8DCC8','#8A7458','#1A1008'] },
        iw_aurora:    { from:'blackflag', group:'lights', name:'Aurora',            desc:'Night sky, green numerals', tex:'nebula', col:['#2E8A7A','#06121E','#B8FFD8'], rim:'rgba(0,0,0,.8)', metal:.1, rough:.35 },
        iw_blizzard:  { from:'lightning', group:'lights', name:'Blizzard',          desc:'Snow storm, white numerals', col:['#B8C6D4','#3A4A5C','#FFFFFF'], glow:0xe6f6ff },
        iw_polar:     { from:'blackflag', group:'lights', name:'Polar Night',       desc:'Deep navy, silver numerals', tex:'nebula', col:['#1E2A4A','#03060E','#E6F2FF'], rim:'rgba(0,0,0,.85)', metal:.1, rough:.35 },
        iw_starmetal: { from:'silver',   group:'lights', name:'Starmetal',          desc:'Blue-silver, navy numerals', col:['#DDE8FF','#5A6E9A','#0E1A33'] },
      } },
      // Avernus: ember orange, brass and charred red
      avernus: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.25, bold:true, groups:{ plains:'The Burning Plains', forge:'The Devil’s Forge', pacts:'Pacts & Souls' }, sets:{
        av_hellfire:  { from:'fire',     group:'plains', name:'Hellfire Crust',     desc:'Lava crust, gold numerals' },
        av_ashen:     { from:'shipwreck', group:'plains', name:'Ashen Offering',    desc:'Charred wood, glowing numerals' },
        av_styx:      { from:'davyjones', group:'plains', name:'River Styx',        desc:'Murky green water, gold numerals', col:['#4A6A4A','#0E180E','#FFD27A'] },
        av_sulphur:   { from:'lightning', group:'plains', name:'Sulphur Storm',     desc:'Yellow haze, dark numerals', col:['#E0C870','#5A4A14','#1A1004'], glow:0xffe070, rim:'rgba(255,250,220,.7)' },
        av_brass:     { from:'bronze',   group:'forge',  name:'Brazen Bull',        desc:'Polished brass, dark numerals', col:['#FFD89A','#8A5A14','#1A0E02'] },
        av_chain:     { from:'cannon',   group:'forge',  name:'Chain Devil Steel',  desc:'Pitted steel, ember numerals', ink:'#FF9A4C', css:['#84888C','#26292C','#FF9A4C'] },
        av_molten:    { from:'doubloon', group:'forge',  name:'Molten Gold',        desc:'Polished gold, dark numerals' },
        av_cinder:    { from:'blackflag', group:'forge', name:'Soot & Cinders',     desc:'Sooty black, ember numerals', col:['#5A4A42','#0E0A08','#FFB060'] },
        av_soulcoin:  { from:'ruby',     group:'pacts',  name:'Soul Coin',          desc:'Blood-red ruby, gold numerals' },
        av_throne:    { from:'bone',     group:'pacts',  name:'Bone Throne',        desc:'Bloodied bone, red numerals' },
        av_contract:  { from:'treasuremap', group:'pacts', name:'Signed in Blood',  desc:'Old contract, blood numerals', ink:'#8A0E0A', css:['#AE9873','#765A34','#8A0E0A'] },
        av_bloodstone:{ from:'ruby',     group:'pacts',  name:'Bloodstone',         desc:'Dark garnet, pale numerals', col:['#B04A3A','#2A0806','#FFE6C8'] },
      } },
    }
  }
};
