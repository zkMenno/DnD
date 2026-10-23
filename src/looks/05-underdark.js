// Underdark (underdark): glowing caves below the world. One look of ☰ → Theme; tools/looks.js explains every field.
module.exports = {
  label: 'Underdark', emoji: '🍄',
  swatch: ['#0A0710', '#5EF0D2', '#E8E3EE'],   // the theme picker's swatch: dark background, accent, light background
  // colour tokens (the names in src/theme.css), light and dark
  light: { bg:'#E8E3EE', surface:'#F4F1F8', raised:'#FBFAFD', ink:'#1E1828', muted:'#5C5270', line:'#D3CADF', rope:'#8C7BA6', chart:'#E0D9EA', sea:'#5B3C99', 'sea-ink':'#FBFAFD', 'sea-soft':'#E4DCF5', brass:'#13756D', 'brass-soft':'#D3EEEA', hp:'#B3264B', good:'#2C7A45', aye:'#2A6E40', warn:'#9A5B00' },
  dark: { bg:'#0A0710', surface:'#130E1C', raised:'#1B1427', ink:'#E8E1F2', muted:'#B6A9CC', line:'#2A2138', rope:'#45345E', chart:'#0E0A16', sea:'#B59CFF', 'sea-ink':'#0A0710', 'sea-soft':'#251B3D', brass:'#5EF0D2', 'brass-soft':'#0F3632', hp:'#FF6F91', good:'#7FD89C', aye:'#2B7647', warn:'#E8AE55' },
  // title font (--f-pirate) and optionally display / body; fontFiles: the web/fonts files they and the dice need
  fonts: { title:'"Grenze Gotisch","Pirata One",Georgia,serif' },
  fontFiles: ['grenze-gotisch-500', 'grenze-gotisch-700'],
  // the line under the header: an SVG mask repeated along it (null: a plain line)
  line: null,
  // the roll sheet and tooltip texture, top layer first
  texture: [
    { svg:'<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><g fill="#7DF7DF"><circle cx="18" cy="24" r="1.4" fill-opacity=".22"/><circle cx="96" cy="14" r="1" fill-opacity=".18"/><circle cx="60" cy="70" r="1.8" fill-opacity=".14"/><circle cx="122" cy="96" r="1.2" fill-opacity=".2"/><circle cx="30" cy="118" r="1" fill-opacity=".16"/><circle cx="84" cy="128" r="1.5" fill-opacity=".12"/></g></svg>' },
    { noise:{ freq:[.9, .9], octaves:2, alpha:.05 } },
  ],
  // the few words this look says its own way (left out: plain English)
  words: { cancel:'Retreat', log:'Expedition log', clean:'🍄 All quiet below.', critIcon:'🍄' },
  // dice sets (§6 skinDiceSets): numeral font, 6 groups of 4 sets, each set a pirate set (from) with changes
  dice: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.2, bold:true, groups:{ metal:'The Spider City', wood:'The Old Mines', stone:'Deep Stone', glass:'The Sunless Sea', gems:'Glowing Caves', elemental:'Things That Ooze' }, sets:{
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
};
