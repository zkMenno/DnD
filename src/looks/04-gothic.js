// Ravenloft (gothic): gothic horror. One look of ☰ → Theme; tools/looks.js explains every field.
module.exports = {
  label: 'Ravenloft', emoji: '🦇', pick: 5,   // place in the theme picker (1 = first)
  swatch: ['#161118', '#D9B26A', '#E9E4E2'],   // the theme picker's swatch: dark background, accent, light background
  // colour tokens (the names in src/theme.css), light and dark
  light: { bg:'#E9E4E2', surface:'#F5F1EF', raised:'#FCFAF9', ink:'#1C1519', muted:'#5F4F58', line:'#D4C8CC', rope:'#8F7480', chart:'#E2DBD9', sea:'#5A3D7A', 'sea-ink':'#FCFAF9', 'sea-soft':'#E5DCEE', brass:'#8E2236', 'brass-soft':'#F1D9DE', hp:'#B0261E', good:'#2F6B47', aye:'#2D6342', warn:'#9A5B00' },
  dark: { bg:'#0C090E', surface:'#161118', raised:'#1F1822', ink:'#ECE3E8', muted:'#BCADB7', line:'#2F2533', rope:'#563C4C', chart:'#110C13', sea:'#B99BDD', 'sea-ink':'#0C090E', 'sea-soft':'#2A1F38', brass:'#D9B26A', 'brass-soft':'#3A2E18', hp:'#FF6B6B', good:'#79CF98', aye:'#2F7A4D', warn:'#E8AE55' },
  // title font (--f-pirate) and optionally display / body; fontFiles: the web/fonts files they and the dice need
  fonts: { title:'"Grenze Gotisch","Pirata One",Georgia,serif' },
  fontFiles: ['grenze-gotisch-500', 'grenze-gotisch-700'],
  // the line under the header: an SVG mask repeated along it (null: a plain line)
  line: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 6h4V2h4v4h8V2h4v4h4" fill="none" stroke="#000" stroke-width="1.4"/></svg>',
  // the roll sheet and tooltip texture, top layer first
  texture: [
    { noise:{ freq:[.006, .02], octaves:4, alpha:.12, seed:11, col:'0 0 0' } },
    { noise:{ freq:[.9, .9], octaves:2, alpha:.06 } },
  ],
  // the few words this look says its own way (left out: plain English)
  words: { ok:'So be it ✓', cancel:'Begone', log:'Journal', clean:'🕯️ All quiet.', critIcon:'🦇' },
  // dice sets (§6 skinDiceSets): numeral font, 6 groups of 4 sets, each set a pirate set (from) with changes
  dice: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.2, bold:true, groups:{ metal:'The Count’s Treasury', wood:'The Cursed Village', stone:'The Crypt', glass:'The Haunted Manor', gems:'Blood Jewels', elemental:'Dark Powers' }, sets:{
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
};
