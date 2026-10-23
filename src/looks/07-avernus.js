// Avernus (avernus): the first layer of the Nine Hells. One look of ☰ → Theme; tools/looks.js explains every field.
module.exports = {
  label: 'Avernus', emoji: '🔥',
  swatch: ['#120806', '#FFB347', '#F0E4DA'],   // the theme picker's swatch: dark background, accent, light background
  // colour tokens (the names in src/theme.css), light and dark
  light: { bg:'#F0E4DA', surface:'#F8EFE8', raised:'#FDF8F4', ink:'#2A1410', muted:'#6E4A40', line:'#DEC6B8', rope:'#B07A5E', chart:'#E8D8CC', sea:'#7A2E1E', 'sea-ink':'#FDF8F4', 'sea-soft':'#F1DCD4', brass:'#B4410E', 'brass-soft':'#F6DCCB', hp:'#A3201B', good:'#2C7A45', aye:'#2A6E40', warn:'#9A5B00' },
  dark: { bg:'#120806', surface:'#1C0E0B', raised:'#26130F', ink:'#F3E3DA', muted:'#CDAE9F', line:'#3A1E17', rope:'#5E2F22', chart:'#170A08', sea:'#FF9A6B', 'sea-ink':'#120806', 'sea-soft':'#3A1810', brass:'#FFB347', 'brass-soft':'#3D2710', hp:'#FF5E57', good:'#7FD89C', aye:'#2B7647', warn:'#FFB347' },
  // title font (--f-pirate) and optionally display / body; fontFiles: the web/fonts files they and the dice need
  fonts: { title:'"Grenze Gotisch","Pirata One",Georgia,serif' },
  fontFiles: ['grenze-gotisch-500', 'grenze-gotisch-700'],
  // the line under the header: an SVG mask repeated along it (null: a plain line)
  line: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 7l4-5 4 5 4-5 4 5 4-5 4 5" fill="none" stroke="#000" stroke-width="1.3"/></svg>',
  // the roll sheet and tooltip texture, top layer first
  texture: [
    { noise:{ freq:[.02, .02], octaves:4, alpha:.16, seed:9, col:'1 .45 .1' } },
    { noise:{ freq:[.9, .9], octaves:2, alpha:.05 } },
  ],
  // the few words this look says its own way (left out: plain English)
  words: { ok:'Sealed ✓', cancel:'Refuse', log:'Infernal ledger', clean:'🔥 Debts settled.', critIcon:'🔥' },
  // dice sets (§6 skinDiceSets): numeral font, 6 groups of 4 sets, each set a pirate set (from) with changes
  dice: { font:'"Grenze Gotisch", Georgia, serif', fscale:1.25, bold:true, groups:{ metal:'The Devil’s Forge', wood:'Ashen Offerings', stone:'The Burning Plains', glass:'Fallen Angels', gems:'Pacts & Souls', elemental:'The Blood War' }, sets:{
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
};
