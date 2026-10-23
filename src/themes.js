
// ── THEMES: the look and voice a character pack can pick (PACK.theme) ──────────────────────────────────────
// Defines one global, THEMES. Loaded before #classes, the pack and the engine (claude.ai: <script id="themes">; web
// app: /engine/themes.js), and also built into the front page's dice (tools/build.js → web/home-dice.js).
// Only "pirate" exists; the web app's other looks are skins on top of it, one file each in src/looks/ (their dice go
// into skinDice below and their words into §2 SKIN_WORDS at build time, see tools/looks.js).
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
    // (§6 skinDiceSets). They live in src/looks/*.js (dice); tools/build.js fills them in here for the web app only,
    // so the claude.ai sheets (always pirate) keep this empty.
    skinDice: /*__SKIN_DICE__*/{}
  }
};
