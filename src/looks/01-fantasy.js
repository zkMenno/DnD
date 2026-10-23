// Dragon Keep (fantasy): castles, heraldry and dragons. One look of ☰ → Theme; tools/looks.js explains every field.
module.exports = {
  label: 'Dragon Keep', emoji: '🏰',
  swatch: ['#171B36', '#E9C766', '#F1EBDD'],   // the theme picker's swatch: dark background, accent, light background
  // colour tokens (the names in src/theme.css), light and dark
  light: { bg:'#F1EBDD', surface:'#FAF6EC', raised:'#FFFCF4', ink:'#231D35', muted:'#615878', line:'#DCD1BA', rope:'#B89A5A', chart:'#E9E1CE', sea:'#2D4C93', 'sea-ink':'#FFFCF4', 'sea-soft':'#D9E1F2', brass:'#9A7414', 'brass-soft':'#F2E4BC', hp:'#9C1F33', good:'#2F6B47', aye:'#2D6342', warn:'#9A5B00' },
  dark: { bg:'#0F1124', surface:'#171B36', raised:'#1F2444', ink:'#EEE7D3', muted:'#C2B9D8', line:'#2C3260', rope:'#6C5B2C', chart:'#13162C', sea:'#93B4FF', 'sea-ink':'#0F1124', 'sea-soft':'#1E2A55', brass:'#E9C766', 'brass-soft':'#3A3016', hp:'#F07C8C', good:'#79CF98', aye:'#2F7A4D', warn:'#E8AE55' },
  // title font (--f-pirate) and optionally display / body; fontFiles: the web/fonts files they and the dice need
  fonts: { title:'"Cinzel Decorative","Cinzel",Georgia,serif', display:'"Cinzel",Georgia,serif' },
  fontFiles: ['cinzel-decorative-700', 'cinzel-500', 'cinzel-700'],
  // the line under the header: an SVG mask repeated along it (null: a plain line)
  line: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 4h7l5-3 5 3h7" fill="none" stroke="#000" stroke-width="1.4"/><path d="M12 2.2l1.8 1.8L12 5.8 10.2 4z" fill="#000"/></svg>',
  // the roll sheet and tooltip texture, top layer first
  texture: [
    { svg:'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M0 14 14 0 28 14 14 28Z" fill="none" stroke="#fff" stroke-opacity=".045"/><circle cx="14" cy="14" r="1.2" fill="#fff" fill-opacity=".06"/></svg>' },
    { noise:{ freq:[.8, .8], octaves:2, alpha:.05 } },
  ],
  // the few words this look says its own way (left out: plain English)
  words: { ok:'So be it ✓', cancel:'Nay', log:'Chronicle', clean:'⚜ All in order.', critIcon:'⚜' },
  // dice sets (§6 skinDiceSets): numeral font, 6 groups of 4 sets, each set a pirate set (from) with changes
  dice: { font:'"Cinzel", Georgia, serif', bold:true, groups:{ metal:'The King’s Vault', wood:'The Enchanted Wood', stone:'Castle Stone', glass:'The Lady of the Lake', gems:'The Crown Jewels', elemental:'Dragon’s Breath' }, sets:{
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
};
