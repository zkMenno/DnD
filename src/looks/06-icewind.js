// Icewind (icewind): the frozen north. One look of ☰ → Theme; tools/looks.js explains every field.
module.exports = {
  label: 'Icewind', emoji: '❄️',
  swatch: ['#08111A', '#9EDBFF', '#E8EFF3'],   // the theme picker's swatch: dark background, accent, light background
  // colour tokens (the names in src/theme.css), light and dark
  light: { bg:'#E8EFF3', surface:'#F4F8FA', raised:'#FFFFFF', ink:'#142231', muted:'#4F6475', line:'#C9D8E2', rope:'#8FAABD', chart:'#DEE8EE', sea:'#4A5C8C', 'sea-ink':'#FFFFFF', 'sea-soft':'#DDE3F2', brass:'#1F6E99', 'brass-soft':'#D5E8F3', hp:'#B2303A', good:'#2C7A45', aye:'#2A6E40', warn:'#9A5B00' },
  dark: { bg:'#08111A', surface:'#0F1B27', raised:'#152433', ink:'#E6F0F7', muted:'#A9BDCC', line:'#213345', rope:'#3A5268', chart:'#0B1520', sea:'#C6CCFF', 'sea-ink':'#08111A', 'sea-soft':'#1D2747', brass:'#9EDBFF', 'brass-soft':'#13324A', hp:'#FF7A85', good:'#7FD89C', aye:'#2B7647', warn:'#E8AE55' },
  // title font (--f-pirate) and optionally display / body; fontFiles: the web/fonts files they and the dice need
  fonts: { title:'"Cinzel","Alegreya SC",Georgia,serif' },
  fontFiles: ['cinzel-500', 'cinzel-700'],
  // the line under the header: an SVG mask repeated along it (null: a plain line)
  line: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 2h24M4 2l2 5 2-5M14 2l1.5 4 1.5-4" fill="none" stroke="#000" stroke-width="1.3"/></svg>',
  // the roll sheet and tooltip texture, top layer first
  texture: [
    { noise:{ freq:[.004, .18], octaves:3, alpha:.035, seed:5 } },   // a faint frost; the thick fog only puffs out on open (css below)
    { noise:{ freq:[.9, .9], octaves:2, alpha:.04 } },
  ],
  // opening a roll sheet is like opening a freezer: a cold fog that clears within a second or so
  css: (sel, noise) => [
    sel+' #dock .roll{position:relative;isolation:isolate}',
    sel+' #dock .roll::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:5;'
      + 'background:'+noise({ freq:[.004, .18], octaves:3, alpha:.22, seed:5 })+',linear-gradient(180deg,rgba(235,248,255,.45),rgba(235,248,255,.1) 70%,transparent);animation:freezerfog 1.3s ease-out forwards}',
    '@keyframes freezerfog{0%{opacity:1;transform:translateY(0)}35%{opacity:.85}100%{opacity:0;transform:translateY(-14px)}}',
    '@media (prefers-reduced-motion:reduce){'+sel+' #dock .roll::before{display:none}}',
  ],
  // the few words this look says its own way (left out: plain English)
  words: { cancel:'Hold', log:'Trail log', clean:'❄️ All clear.', critIcon:'❄️' },
  // dice sets (§6 skinDiceSets): numeral font, 6 groups of 4 sets, each set a pirate set (from) with changes
  dice: { font:'"Cinzel", Georgia, serif', bold:true, groups:{ metal:'Moon & Starmetal', wood:'The Ten Towns', stone:'The Spine of the World', glass:'The Sea of Moving Ice', gems:'Frozen Gems', elemental:'Northern Lights' }, sets:{
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
};
