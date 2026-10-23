
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
      fantasy: { font:'"Cinzel", Georgia, serif', groups:{ hoard:'The Royal Hoard', arcane:'Arcane Arts', dragon:'Dragon Lairs' }, sets:{
        fk_crown:    { from:'doubloon', group:'hoard',  name:'Crown Gold',          desc:'Polished gold, dark numerals' },
        fk_mithril:  { from:'silver',   group:'hoard',  name:'Mithril',             desc:'Bright silver-steel, dark numerals' },
        fk_marble:   { from:'blackflag', group:'hoard', name:'Castle Marble',       desc:'White marble, gold numerals', tex:'marble', col:['#F4F1EA','#A9A39A','#9A7414'], rim:'rgba(255,255,255,.6)', metal:.05, rough:.35 },
        fk_sapphire: { from:'amethyst', group:'arcane', name:'Royal Sapphire',      desc:'Deep sapphire, pale numerals', col:['#7FA8FF','#0C1E5E','#F3F6FF'], rim:'rgba(0,6,30,.7)' },
        fk_amethyst: { from:'amethyst', group:'arcane', name:'Archmage’s Amethyst', desc:'Violet amethyst, pale numerals' },
        fk_obsidian: { from:'blackflag', group:'arcane', name:'Wizard’s Obsidian',  desc:'Black marble, silver numerals', tex:'marble', col:['#4A4A55','#0A0A10','#DDE3EE'], metal:.1, rough:.3 },
        fk_reddragon:{ from:'fire',     group:'dragon', name:'Red Dragon’s Breath', desc:'Lava crust, gold numerals' },
        fk_golddragon:{ from:'acid',    group:'dragon', name:'Gold Dragon Scale',   desc:'Golden scales, dark numerals', col:['#F2D27A','#7A5410','#2A1A04'], glow:0xffd060, rim:'rgba(255,240,200,.7)' },
      } },
      space: { font:'"Orbitron", system-ui, sans-serif', bold:true, groups:{ hull:'Hull & Hardware', cosmos:'Deep Space', core:'Energy Cores' }, sets:{
        sp_hull:     { from:'silver',   group:'hull',   name:'Hull Plating',        desc:'Brushed alloy, dark numerals', tex:'hammered' },
        sp_titanium: { from:'cannon',   group:'hull',   name:'Titanium',            desc:'Scuffed grey metal, white numerals', col:['#9AA2AC','#2E343C','#F2F6FA'] },
        sp_nebula:   { from:'blackflag', group:'cosmos', name:'Nebula',             desc:'Violet starfield, cyan numerals', tex:'nebula', col:['#7A58C8','#0E0A26','#7FF3FF'], rim:'rgba(0,0,20,.8)', metal:.1, rough:.35 },
        sp_horizon:  { from:'blackflag', group:'cosmos', name:'Event Horizon',      desc:'Black starfield, gold numerals', tex:'nebula', col:['#3A3F5A','#04050C','#FFD877'], rim:'rgba(0,0,0,.85)', metal:.1, rough:.35 },
        sp_crystal:  { from:'emerald',  group:'cosmos', name:'Quantum Crystal',     desc:'Cyan crystal, pale numerals', col:['#8FF6FF','#085A70','#F2FEFF'], rim:'rgba(0,20,30,.7)' },
        sp_plasma:   { from:'lightning', group:'core',  name:'Plasma Core',         desc:'Charged cloud, white numerals', col:['#6FA6E8','#0E1A3A','#F2FAFF'], glow:0x7ff3ff },
        sp_cryo:     { from:'cold',     group:'core',   name:'Cryo Pod',            desc:'Frosted ice, navy numerals' },
        sp_solar:    { from:'fire',     group:'core',   name:'Solar Flare',         desc:'Burning plasma, pale numerals', col:['#FF9A3C','#3A0C04','#FFF2C8'], glow:0xffb040 },
      } },
      woodland: { font:'"Uncial Antiqua", Georgia, serif', groups:{ grove:'The Grove', bloom:'Fey Blooms', wild:'Wild Magic' }, sets:{
        fw_oak:      { from:'walnut',   group:'grove',  name:'Old Oak',             desc:'Oiled oak, cream numerals' },
        fw_birch:    { from:'timber',   group:'grove',  name:'Silver Birch',        desc:'Pale birch, dark numerals', col:['#E8E2D2','#9C927C','#2A2418'] },
        fw_moss:     { from:'blackflag', group:'grove', name:'Mossy Stone',         desc:'Stone and moss, cream numerals', tex:'moss', col:['#8AA06A','#24301A','#F2EED8'], rim:'rgba(0,0,0,.7)', metal:0, rough:.95, matte:true },
        fw_amber:    { from:'topaz',    group:'bloom',  name:'Amber Sap',           desc:'Honey amber, dark numerals' },
        fw_emerald:  { from:'emerald',  group:'bloom',  name:'Fey Emerald',         desc:'Green sapphire, pale numerals' },
        fw_rose:     { from:'rosegold', group:'bloom',  name:'Wild Rose',           desc:'Rose gold, dark numerals' },
        fw_dew:      { from:'kraken',   group:'wild',   name:'Morning Dew',         desc:'Green glass, cream numerals', col:['#9EE0A8','#1E5A3A','#F6FFF2'] },
        fw_thorn:    { from:'acid',     group:'wild',   name:'Thornvine',           desc:'Bramble scales, pale numerals' },
      } },
      gothic: { font:'"Grenze Gotisch", Georgia, serif', groups:{ crypt:'The Crypt', blood:'Blood & Bone', mist:'Out of the Mists' }, sets:{
        rv_ebony:    { from:'walnut',   group:'crypt',  name:'Ebony Coffin',        desc:'Black wood, silver numerals', col:['#3A2E2A','#0A0606','#D8D8DE'] },
        rv_nail:     { from:'cannon',   group:'crypt',  name:'Coffin Nail',         desc:'Rusted iron, bone numerals', col:['#6A6460','#1A1614','#EDE4D0'] },
        rv_silver:   { from:'silver',   group:'crypt',  name:'Silver Stake',        desc:'Polished silver, dark numerals' },
        rv_bone:     { from:'bone',     group:'blood',  name:'Crypt Bone',          desc:'Bloodied bone, red numerals' },
        rv_ruby:     { from:'ruby',     group:'blood',  name:'Vampire’s Ruby',      desc:'Blood-red ruby, silver numerals', ink:'#F0F0F4', css:['#FF6A78','#5A0412','#F0F0F4'] },
        rv_raven:    { from:'blackflag', group:'mist',  name:'Raven Feather',       desc:'Glossy black, violet numerals', ink:'#C9A6FF', css:['#4E454C','#0A090B','#C9A6FF'] },
        rv_mist:     { from:'lightning', group:'mist',  name:'Dread Mists',         desc:'Grey storm, pale numerals', col:['#9A9AA4','#26262E','#F2F0F6'], glow:0xe8e0ff },
        rv_witch:    { from:'amethyst', group:'mist',   name:'Witch’s Amethyst',    desc:'Violet amethyst, pale numerals' },
      } },
      underdark: { font:'"Grenze Gotisch", Georgia, serif', groups:{ stone:'Deep Stone', glow:'Things That Glow' }, sets:{
        ud_obsidian: { from:'blackflag', group:'stone', name:'Obsidian',            desc:'Black glass, teal numerals', tex:'marble', col:['#3A3448','#06040A','#5EF0D2'], metal:.15, rough:.25 },
        ud_iron:     { from:'cannon',   group:'stone',  name:'Deep Iron',           desc:'Dark pitted iron, pale numerals', col:['#5E5868','#16121C','#E8E1F2'] },
        ud_geode:    { from:'amethyst', group:'stone',  name:'Geode',               desc:'Violet crystal, pale numerals' },
        ud_spider:   { from:'blackflag', group:'stone', name:'Spider Silk',         desc:'Glossy black, violet numerals', ink:'#B59CFF', css:['#4E454C','#0A090B','#B59CFF'] },
        ud_glowcap:  { from:'blackflag', group:'glow',  name:'Glowcap',             desc:'Spotted mushroom, glowing numerals', tex:'moss', col:['#7A5AA8','#1A0E2A','#9CFFE8'], rim:'rgba(0,0,0,.8)', glow:0x5ef0d2, bold:true, metal:0, rough:.9 },
        ud_crystal:  { from:'emerald',  group:'glow',   name:'Glowcrystal',         desc:'Teal crystal, pale numerals', col:['#7DF7DF','#06463E','#F2FFFC'] },
        ud_ooze:     { from:'acid',     group:'glow',   name:'Ooze',                desc:'Slick scales, pale numerals' },
      } },
      icewind: { font:'"Cinzel", Georgia, serif', bold:true, groups:{ ice:'Ice & Snow', north:'The Frozen North' }, sets:{
        iw_glacier:  { from:'cold',     group:'ice',    name:'Glacier',             desc:'Glacier ice, navy numerals' },
        iw_rime:     { from:'cold',     group:'ice',    name:'Rime',                desc:'White frost, blue numerals', col:['#FFFFFF','#B8CCDC','#1F4E7A'] },
        iw_seaice:   { from:'kraken',   group:'ice',    name:'Sea Ice',             desc:'Icy glass, navy numerals', col:['#CFEFFF','#3A6E8E','#0E2A44'] },
        iw_aurora:   { from:'blackflag', group:'ice',   name:'Aurora',              desc:'Night sky, green numerals', tex:'nebula', col:['#2E8A7A','#06121E','#B8FFD8'], rim:'rgba(0,0,0,.8)', metal:.1, rough:.35 },
        iw_ivory:    { from:'moby',     group:'north',  name:'Mammoth Ivory',       desc:'Carved ivory, navy numerals' },
        iw_silver:   { from:'silver',   group:'north',  name:'Moonlit Silver',      desc:'Polished silver, dark numerals' },
        iw_pine:     { from:'timber',   group:'north',  name:'Frozen Pine',         desc:'Dark pine, frost numerals', col:['#5E6A58','#1A2018','#E6F2FA'] },
        iw_blizzard: { from:'lightning', group:'north', name:'Blizzard',            desc:'Snow storm, white numerals', col:['#B8C6D4','#3A4A5C','#FFFFFF'], glow:0xe6f6ff },
      } },
      avernus: { font:'"Grenze Gotisch", Georgia, serif', groups:{ hells:'The Nine Hells', forge:'Infernal Forge' }, sets:{
        av_hellfire: { from:'fire',     group:'hells',  name:'Hellfire',            desc:'Lava crust, gold numerals' },
        av_offering: { from:'shipwreck', group:'hells', name:'Burnt Offering',      desc:'Charred wood, glowing numerals' },
        av_brimstone:{ from:'blackflag', group:'hells', name:'Brimstone',           desc:'Black stone, ember numerals', tex:'marble', col:['#4A3A34','#0E0806','#FF9A3C'], glow:0xff5a10, metal:.05, rough:.6 },
        av_bonethrone:{ from:'bone',    group:'hells',  name:'Bone Throne',         desc:'Bloodied bone, red numerals' },
        av_brass:    { from:'bronze',   group:'forge',  name:'Infernal Brass',      desc:'Polished brass, dark numerals' },
        av_iron:     { from:'cannon',   group:'forge',  name:'Infernal Iron',       desc:'Pitted iron, ember numerals', ink:'#FF8A3C', css:['#84888C','#26292C','#FF8A3C'] },
        av_soulcoin: { from:'ruby',     group:'forge',  name:'Soul Coin',           desc:'Blood-red ruby, gold numerals' },
        av_contract: { from:'doubloon', group:'forge',  name:'Contract Gold',       desc:'Polished gold, dark numerals' },
      } },
    }
  }
};
