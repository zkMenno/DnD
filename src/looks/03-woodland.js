// Feywild (woodland): the fey forest. One look of ☰ → Theme; tools/looks.js explains every field.
module.exports = {
  label: 'Feywild', emoji: '🍃', pick: 2,   // place in the theme picker (1 = first)
  swatch: ['#132119', '#DCB867', '#E6ECD8'],   // the theme picker's swatch: dark background, accent, light background
  // colour tokens (the names in src/theme.css), light and dark
  light: { bg:'#E6ECD8', surface:'#F2F6E8', raised:'#FAFCF3', ink:'#1C2619', muted:'#57684F', line:'#C8D3B1', rope:'#8BA266', chart:'#DEE6CC', sea:'#2D6A4C', 'sea-ink':'#FAFCF3', 'sea-soft':'#D5E6D8', brass:'#946719', 'brass-soft':'#EFE2BE', hp:'#A3302A', good:'#2C7A45', aye:'#2A6E40', warn:'#9A5B00' },
  dark: { bg:'#0C1510', surface:'#132119', raised:'#1A2C21', ink:'#E2EBD5', muted:'#B5C6A4', line:'#253B2B', rope:'#4E6B42', chart:'#0F1B13', sea:'#86D3A6', 'sea-ink':'#0C1510', 'sea-soft':'#173326', brass:'#DCB867', 'brass-soft':'#352D16', hp:'#EE7C6C', good:'#7FD89C', aye:'#2B7647', warn:'#E8AE55' },
  // title font (--f-pirate) and optionally display / body; fontFiles: the web/fonts files they and the dice need
  fonts: { title:'"Uncial Antiqua","Alegreya SC",Georgia,serif' },
  fontFiles: ['uncial-antiqua-400'],
  // the line under the header: an SVG mask repeated along it (null: a plain line)
  line: null,
  // the roll sheet and tooltip texture, top layer first
  texture: [
    { noise:{ freq:[.012, .06], octaves:4, alpha:.10, seed:7 } },
    { noise:{ freq:[.9, .9], octaves:2, alpha:.05 } },
  ],
  // the few words this look says its own way (left out: plain English)
  words: { ok:'Done ✓', cancel:'Not now', log:'Grove journal', clean:'🍃 All is well.', critIcon:'🍃' },
  // dice sets (§6 skinDiceSets): numeral font, 6 groups of 4 sets, each set a pirate set (from) with changes
  dice: { font:'"Uncial Antiqua", Georgia, serif', fscale:1.1, groups:{ metal:'Fey Silver & Gold', wood:'The Old Grove', stone:'Standing Stones', glass:'Dewdrops & Moonpools', gems:'The Blossom Court', elemental:'Wild Magic' }, sets:{
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
};
