// Starfarer (space): starships and strange planets. One look of ☰ → Theme; tools/looks.js explains every field.
module.exports = {
  label: 'Starfarer', emoji: '🚀',
  swatch: ['#0D1424', '#4FE0EE', '#E9EEF5'],   // the theme picker's swatch: dark background, accent, light background
  // colour tokens (the names in src/theme.css), light and dark
  light: { bg:'#E9EEF5', surface:'#F5F8FC', raised:'#FFFFFF', ink:'#111C2E', muted:'#55647C', line:'#C9D3E2', rope:'#8EA2C2', chart:'#E0E7F1', sea:'#5B3FD6', 'sea-ink':'#FFFFFF', 'sea-soft':'#E3DDFB', brass:'#0A7F95', 'brass-soft':'#D2EEF3', hp:'#C42A5E', good:'#1E7A52', aye:'#1B6E4A', warn:'#B45F06' },
  dark: { bg:'#060A14', surface:'#0D1424', raised:'#131C32', ink:'#E3EBFA', muted:'#A3B2CD', line:'#1F2C48', rope:'#2B4170', chart:'#08101E', sea:'#A99BFF', 'sea-ink':'#060A14', 'sea-soft':'#1C1A44', brass:'#4FE0EE', 'brass-soft':'#0E3440', hp:'#FF6B9A', good:'#5FE0A1', aye:'#1C7A55', warn:'#FFB65C' },
  // title font (--f-pirate) and optionally display / body; fontFiles: the web/fonts files they and the dice need
  fonts: { title:'"Orbitron","Exo 2",system-ui,sans-serif' },
  fontFiles: ['orbitron-500', 'orbitron-700', 'exo-2-400', 'exo-2-500', 'exo-2-700'],
  // the line under the header: an SVG mask repeated along it (null: a plain line)
  line: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 4h9" stroke="#000" stroke-width="1.4"/><circle cx="14" cy="4" r="1.6" fill="#000"/><path d="M19 4h5" stroke="#000" stroke-width="1.4"/></svg>',
  // the roll sheet and tooltip texture, top layer first
  texture: [
    { svg:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="1" cy="1" r=".8" fill="#fff" fill-opacity=".09"/></svg>' },
    { css:'repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px)' },
  ],
  // wider, bolder headings
  css: sel => [sel+' h1,'+sel+' h2,'+sel+' .roll .title,'+sel+' .bubble .bt{letter-spacing:.06em;font-weight:700}'],
  // the few words this look says its own way (left out: plain English)
  words: { ok:'Confirm ✓', cancel:'Abort', log:'Mission log', clean:'✦ All systems nominal.', critIcon:'✦' },
  // dice sets (§6 skinDiceSets): numeral font, 6 groups of 4 sets, each set a pirate set (from) with changes
  dice: { font:'"Orbitron", system-ui, sans-serif', bold:true, groups:{ metal:'Hull & Hardware', wood:'Hydroponics Bay', stone:'Deep Space', glass:'Strange Planets', gems:'Power Crystals', elemental:'Energy Cores' }, sets:{
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
};
