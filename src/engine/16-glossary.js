/* ============================================================================
   §16 GLOSSARY — tappable terms and their bubbles
   ============================================================================ */

const SKILL_INFO = {
  'Acrobatics': 'Stay on your feet on ice, ropes or a rocking deck, tumble past enemies, or slip out of a grapple.',
  'Animal Handling': 'Calm, control or read an animal: keep a horse steady, soothe a guard dog, tell if a beast is about to attack.',
  'Arcana': 'Recall lore about spells, magic items, symbols and other planes. You need proficiency in it to brew magic potions.',
  'Athletics': 'Climb, jump, swim, shove, grapple, or break free from a grapple.',
  'Deception': 'Lie convincingly, bluff, wear a disguise well, or hide what you really intend.',
  'History': 'Remember events, wars, kingdoms, famous people and old ruins.',
  'Insight': 'Read someone’s true intentions: spot a lie, nerves or a hidden motive.',
  'Intimidation': 'Get your way through threats, hostile body language or sheer menace.',
  'Investigation': 'Work things out: search for clues, find a hidden compartment, understand how a trap or lock works.',
  'Medicine': 'Stabilise a dying ally (DC 10) or figure out what illness or poison you’re dealing with.',
  'Nature': 'Recall lore about terrain, plants, animals and weather. Handy for identifying herbs to brew with.',
  'Perception': 'Spot, hear or otherwise notice things: an ambush, a sneaking enemy, a hidden door.',
  'Performance': 'Entertain a crowd with music, dance, storytelling or acting.',
  'Persuasion': 'Convince someone honestly: negotiate, make a good impression, rally people.',
  'Religion': 'Recall lore about gods, rites, holy symbols and cults.',
  'Sleight of Hand': 'Pick a pocket, plant something on someone, palm an object or hide it on yourself.',
  'Stealth': 'Sneak past without being seen or heard. The Hide action is a Stealth check against DC 15.',
  'Survival': 'Track creatures, forage, find your way in the wild, and read the weather.'
};
// glossary entries for each skill, with your bonus and a roll button
function skillTips(){
  const out = {};
  D.skills.forEach(s => {
    const parts = s.exp ? abbr(s.a)+' '+sgn(D.mod[s.a])+' + expertise '+sgn(2*D.pb) : s.prof ? abbr(s.a)+' '+sgn(D.mod[s.a])+' + proficiency '+sgn(D.pb) : abbr(s.a)+' '+sgn(D.mod[s.a])+', not proficient';
    out[s.name] = ['Skill · '+ABIL_NAME[s.a], (SKILL_INFO[s.name]||'') + '\n## 🎲 Your bonus: '+sgn(s.bonus)+'\n• '+parts, null,
      '<button class="btn primary rollbtn" data-skill="'+esc(s.name)+'">🎲 Roll '+sgn(s.bonus)+'</button>'];
  });
  return out;
}

// normalise curly apostrophes so proficiency names match glossary keys
const profKey = s => String(s).replace(/[’']/g, "'");
// Proficiency bubbles (armour, weapons, tools, languages) are character advice, so they live in the pack.
const PROF_INFO = () => PACK.profInfo ? PACK.profInfo() : {};
// glossary entries for each ability: modifier, skills, save, roll buttons
function abilityTips(){
  const use = PACK.abilityUse ? PACK.abilityUse() : {};   // one line per ability: what it does for this character
  const out = {};
  ['str','dex','con','int','wis','cha'].forEach(a => {
    const save = D.saves.find(s=>s.a===a);
    const sk = D.skills.filter(s=>s.a===a).map(s=>s.name+' '+sgn(s.bonus)+(s.exp?' (expertise)':s.prof?' (proficient)':''));
    out[ABIL_NAME[a]] = ['Ability · score '+D.score[a],
      '**Modifier '+sgn(D.mod[a])+' · Save '+sgn(save.bonus)+'**'+(save.prof?' (proficient)':'')+(use[a] ? '\n'+use[a] : '')
        + (sk.length ? '\n## 🎯 Skills\n'+sk.map(x=>'• '+x).join('\n') : ''),
      null,
      '<button class="btn rollbtn savebtn" data-save="'+a+'">🛡️ Save '+sgn(save.bonus)+'</button> <button class="btn primary rollbtn" data-check="'+a+'">🎲 Check '+sgn(D.mod[a])+'</button>'];
  });
  return out;
}

// glossary key for a damage type ("lightning" → "Lightning"); unknown or none → "Damage"
const dmgTerm = t => { const k = String(t||'').trim(); return k ? k.charAt(0).toUpperCase() + k.slice(1).toLowerCase() : 'Damage'; };
// G: every tappable term → [category, body, (unused), button html, footer]. Body format is documented at fmtTip().
// Pack glossary first (rules explained for this character), then entries the engine builds from the sheet itself.
// Rules every sheet needs, whatever the pack says
function ruleTips(){
  const pb = D.pb, L = D.totalLevel, next = [[5,3],[9,4],[13,5],[17,6]].find(([lv]) => lv > L);
  return {
    'Rolling hit dice': ['Short rest', '**Each hit die heals the die + CON ('+sgn(D.mod.con)+').**\n## 🎲 In the app\n• Tap 🎲 Roll: it rolls, heals you and ticks the die off\n## ✋ Real dice\n• Tap a ✓ for each die you roll\n• Add the healing with the ❤️ Hit points tile'],
    'Expertise': ['Rule', '**Add double your proficiency bonus (+'+(pb*2)+') to that skill.**\n• Instead of the usual +'+pb+'\n• Comes from class features (Rogue, Bard) or a feat'
      + (D.skills.some(s => s.exp) ? '\n## 🎯 Yours\n'+D.skills.filter(s => s.exp).map(s => '• '+s.name+' '+sgn(s.bonus)).join('\n') : '')],
    'Proficient': ['Rule', '**Add your proficiency bonus (+'+pb+') to the roll.**\n• Skills, saves, tools and weapons you’re trained in\n• Comes from your class, background and species'
      + '\n## 🧮 Your bonus\n• +'+pb+' at character level '+L + (next ? '\n## 📈 Progression\n• +'+next[1]+' at level '+next[0] : '')]
  };
}
const G = Object.assign({}, ruleTips(), PACK.glossary ? PACK.glossary() : {}, abilityTips(), skillTips(), PROF_INFO());
(DATA.spells||[]).forEach(sp => { if (!G[sp.name]) G[sp.name] = [(sp.level ? ORD(sp.level)+'-level ' : '')+(sp.school||'')+(sp.level ? '' : ' cantrip')+(sp.from && !/^(class|race|feat|item|background)$/.test(sp.from) ? ' · '+[sp.from].concat(sp.alsoFrom||[]).join(' / ') : ''), spellTip(sp)]; });
// the header tiles (Armour, Speed, Initiative) open these in their drawers; a pack may write richer ones
if (!G['Armour Class']) { const ua = !D.armor && D.c.mods.some(m => m.type==='set' && m.sub==='unarmored-armor-class' && m.statId) ? D.c.mods.find(m => m.type==='set' && m.sub==='unarmored-armor-class' && m.statId) : null;
  G['Armour Class'] = ['Defence', '**AC '+D.ac+': an attack hits you if it meets or beats this.**\n## 🧮 Made of'
    + (D.armor ? '\n• '+D.armor.name+' '+D.armor.ac + (D.armor.armorType===1 ? '\n• DEX '+sgn(D.mod.dex) : D.armor.armorType===2 ? '\n• DEX '+sgn(Math.min(D.mod.dex,2))+' (max +2)' : '')
      : ua ? '\n• 10 + DEX '+sgn(D.mod.dex)+' + '+ABIL[ua.statId-1].toUpperCase()+' '+sgn(D.mod[ABIL[ua.statId-1]])+' (no armour)' : '\n• 10 + DEX '+sgn(D.mod.dex)+' (no armour)')
    + (D.shield ? '\n• Shield +'+(D.shield.ac||2) : ''), 'You.']; }
if (!G['Speed']) G['Speed'] = ['Movement', '**'+D.speedM+' m per turn** ('+D.speedFt+' ft, '+(D.speedFt/5)+' squares).\n• Split it before and after your action\n• Dash: move your speed again this turn\n• Difficult terrain: every metre costs 2', 'You.'];
if (!G['Initiative']) G['Initiative'] = ['Combat', '**d20 '+sgn(D.initiative)+' when a fight starts.** Highest goes first.\n## 🧮 Yours\n• DEX '+sgn(D.mod.dex)
  + (D.initNote ? D.initNote.split(' · ').map(t => '\n• '+t).join('') : ''), null, '<button class="btn primary rollbtn" data-act="rollinit">🎲 Roll</button>'];
// Proficiencies and senses: a plain explanation for any the pack doesn't describe (every character's sheet taps work)
const CORE_PROF = new Set();   // proficiency terms added here: tappable in the Proficiencies card, never auto-linked in prose
(() => {
  const pb = '+'+D.pb, put = (k, v, prof) => { if (!G[k]) { G[k] = v; if (prof !== false) CORE_PROF.add(k); } };
  const ARM = {
    'Light armour': ['Armour', '**Wear it with no penalty: AC = armour + your full DEX.**\n• Padded 11, leather 11, studded leather 12\n• Padded makes Stealth harder'],
    'Medium armour': ['Armour', '**AC = armour + DEX (max +2).**\n• Hide 12, chain shirt 13, scale 14, breastplate 14, half plate 15\n• Scale and half plate make Stealth harder'],
    'Heavy armour': ['Armour', '**Fixed AC, DEX doesn’t count.**\n• Ring mail 14, chain mail 16, splint 17, plate 18\n• Stealth is harder; chain mail and up need STR 13–15'],
    'Shields': ['Armour', '**+2 AC while you hold one.**\n• Takes a hand, so no two-handed weapons or second weapon\n• Donning or doffing it takes an action']};
  const WPN = {
    'Simple weapons': ['Weapons', '**Add your proficiency bonus ('+pb+') to hit with them.**\n• Club, dagger, handaxe, javelin, light hammer, mace, quarterstaff, sickle, spear\n• Light crossbow, dart, shortbow, sling'],
    'Martial weapons': ['Weapons', '**Add your proficiency bonus ('+pb+') to hit with them.**\n• Swords, axes, polearms, rapier, whip…\n• Longbow, hand and heavy crossbow']};
  const TOOL = {
    "Thieves' Tools": 'Pick locks and disarm traps.', "Herbalism Kit": 'Identify plants, make antitoxin and healing potions.', "Alchemist's Supplies": 'Identify substances, make acid, alchemist’s fire and smoke.',
    "Disguise Kit": 'Change your look: makeup, props, costumes.', "Forgery Kit": 'Copy handwriting, seals and documents.', "Poisoner's Kit": 'Make and identify poisons.',
    "Navigator's Tools": 'Plot a course and read the stars.', "Healer's Kit": 'Stabilise a dying creature without a Medicine check.', "Calligrapher's Supplies": 'Fine writing, spot forged script.',
    "Smith's Tools": 'Work metal, repair armour and weapons.', "Tinker's Tools": 'Repair and build small gadgets.', "Cook's Utensils": 'Cook meals that help on a rest.'};
  const LANG = {Common:'The trade tongue: nearly everyone speaks it.', Dwarvish:'Dwarves; rune script also used by gnomes and giants.', Elvish:'Elves; flowing script.', Gnomish:'Gnomes; written in Dwarvish runes.',
    Halfling:'Halflings.', Draconic:'Dragons, dragonborn and kobolds; the language of magic.', Giant:'Giants and ogres.', Goblin:'Goblins, hobgoblins and bugbears.', Orc:'Orcs.',
    Infernal:'Devils and tieflings.', Abyssal:'Demons.', Celestial:'Angels and celestials.', Primordial:'Elementals.', Sylvan:'Fey creatures.', Undercommon:'Traders of the Underdark.',
    'Deep Speech':'Aberrations and mind flayers.', "Thieves' Cant":'Secret slang and signs of rogues.', Druidic:'Secret language of druids.'};
  const pf = D.profs || {armor:[], weapons:[], tools:[], langs:[]};
  (pf.armor||[]).forEach(x => { const k = x==='Shields' ? 'Shields' : x+' armour'; put(k, ARM[k] || ['Armour', '**You can wear '+x.toLowerCase()+' armour without penalty.**']); });
  (pf.weapons||[]).forEach(x => { const k = x+' weapons'; put(k, WPN[k] || ['Weapons', '**Add your proficiency bonus ('+pb+') to hit with '+x.toLowerCase()+' weapons.**']); });
  (pf.tools||[]).forEach(x => { const k = profKey(x); put(k, ['Tool', '**Add your proficiency bonus ('+pb+') to checks with it.**'+(TOOL[k] ? '\n• '+TOOL[k] : '')]); });
  (pf.langs||[]).forEach(x => { const k = profKey(x); put(k, ['Language', '**You speak, read and write it.**'+(LANG[k] ? '\n• '+LANG[k] : '')]); });
  put('Passive Perception', ['Rule', '**'+D.passive.perception+' = 10 + Perception.** Noticing things without rolling.\n• The DM checks it against hidden creatures, traps and ambushes'], false);
  put('Passive Investigation', ['Rule', '**'+D.passive.investigation+' = 10 + Investigation.** Working things out without rolling.\n• Hidden compartments, forgeries, clues'], false);
  put('Passive Insight', ['Rule', '**'+D.passive.insight+' = 10 + Insight.** Sensing lies without rolling.\n• The DM compares it to a creature’s Deception'], false);
})();
// core rules every sheet links to; a pack may write richer, character-specific ones
(() => {
  const put = (k, v) => { if (!G[k]) G[k] = v; };
  const shortBack = RES.filter(r => r.short).map(r => '• '+(r.label || r.name)).join('\n');
  put('Action', ['Your turn', '**One per turn.** Attack, cast a spell, Dash, Disengage, Dodge, Help, Hide, Search, or use an item or feature.']);
  put('Bonus action', ['Your turn', '**At most one per turn,** and only if something lets you use one (a spell, feature or potion).']);
  put('Reaction', ['Any time', '**One per round,** on your turn or someone else’s, when its trigger happens.\n• Back at the start of your turn']);
  put('Ritual', ['Spellcasting', '**Cast it without a spell slot** by taking 10 minutes longer.\n• Only spells with the ritual tag\n• The spell must be prepared (or in your book, for wizards)']);
  put('Free / once per turn', ['Your turn', '**No action needed.** Moving, talking, one object interaction, and features that say once per turn.']);
  // damage types: what they are and what usually resists them (roll cards and spell lines link here)
  const DT = {Acid:'Corrosive liquid or digestive enzymes.', Bludgeoning:'Blunt force: hammers, falling, constriction.', Cold:'Freezing: ice, frigid water, cold breath.',
    Fire:'Flames and heat. Common resistance for fiends; burns webs and some plants.', Force:'Pure magical energy. Almost nothing resists it.', Lightning:'Electricity. Metal armour doesn’t help.',
    Necrotic:'Withering life energy. Undead often resist it.', Piercing:'Puncturing: arrows, spears, bites.', Poison:'Venom and toxins. Many undead, fiends and constructs are immune.',
    Psychic:'Mental assault. Mindless creatures often ignore it.', Radiant:'Searing holy light. Hurts undead and fiends most.', Slashing:'Cuts: swords, axes, claws.', Thunder:'A concussive burst of sound.'};
  Object.entries(DT).forEach(([k, t]) => put(k, ['Damage type', '**'+t+'**\n• Resistance halves it, vulnerability doubles it, immunity ignores it']));
  put('Damage', ['Rule', '**Subtract it from hit points.** Temporary HP go first.\n• Resistance halves it, vulnerability doubles it']);
  put('Advantage', ['Rule', '**Roll two d20s and keep the higher.**\n• Advantage and disadvantage cancel out\n• Several sources still only give one extra die']);
  put('Disadvantage', ['Rule', '**Roll two d20s and keep the lower.**\n• Cancels out with advantage']);
  put('Short rest', ['Rule', '**At least 1 hour of downtime.**\n• Spend hit dice to heal'+(shortBack ? '\n## 🔁 Comes back\n'+shortBack : '')]);
  put('Long rest', ['Rule', '**8 hours, at most once a day.**\n• Full HP and all hit dice\n• All spell slots and limited uses']);
  put('Heroic Inspiration', ['Rule', '**Reroll any one die right after you roll it.** You must keep the new roll.\n• You can only hold one\n• The DM hands it out for great play']);
  // the Inspiration & Blessings box on roll cards links to these (a pack or a tracked feature may have written richer ones)
  put('Guidance', ['Cantrip', '**Add a d4 to one ability check.** An ally touches you and casts it before you roll.\n• Lasts up to a minute while they concentrate\n• Not for attacks or saving throws']);
  put('Bless', ['1st-level spell', '**Add a d4 to attack rolls and saving throws** for up to a minute.\n• Up to three creatures\n• The caster has to keep concentrating']);
  put('Bardic Inspiration', ['Bard', '**Add the bard’s die to a d20 roll you just failed.** It can turn a miss into a hit or a failed save into a success.\n• A bard gives it to you as a Bonus Action; it lasts an hour\n• The die grows with the bard: d6, d8 at level 5, d10 at 10, d12 at 15']);
  put('Tactical Mind', ['Fighter', '**Failed an ability check? Spend a Second Wind use to add a d10.**\n• If you still fail, the use isn’t spent']);
  put('Halfling Luck', ['Species', '**Roll a natural 1 on a d20 test → reroll it.** You must use the new roll.']);
  const coin = (n, v) => ['Coin', '**'+v+'**'];
  put('Platinum', coin('pp', '1 pp = 10 gp.')); put('Gold', coin('gp', '1 gp = 10 sp = 100 cp. Prices are mostly in gold.'));
  put('Electrum', coin('ep', '1 ep = 5 sp, half a gold piece.')); put('Silver', coin('sp', '1 sp = 10 cp; 10 sp make 1 gp.')); put('Copper', coin('cp', '100 cp make 1 gp.'));
  lrTerms(); if (!G['Pact Magic slots']) G['Pact Magic slots'] = G['Pact Magic'];
  RES.forEach(r => { try { resTerm(r); } catch(_){} });   // every tracked feature (Bardic Inspiration, Sorcery Points…) gets a tooltip and links in text
})();
if (!G['Concentration']) G['Concentration'] = ['Rule', '**One concentration spell at a time.**\n• Casting another ends the first\n• Taking damage: CON save, DC 10 or half the damage (max 30)\n• Incapacitated → it ends', 'You.'];
// aliases: words in prose that should open an existing term
const GA = {'advantage':'Advantage','disadvantage':'Disadvantage','hidden':'Hide','hiding':'Hide','Halfling Luck':'Halfling Luck','Luck':'Halfling Luck',
  'Inspiration':'Heroic Inspiration','expertise':'Expertise','crit':'Critical hit','crits':'Critical hit','Critical hits':'Critical hit','natural 20':'Critical hit','Natural 20':'Critical hit',
  'opportunity attack':'Opportunity attack','opportunity attacks':'Opportunity attack','Opportunity attacks':'Opportunity attack','temporary HP':'Temporary HP','temp HP':'Temporary HP',
  'hit dice':'Hit dice','short rest':'Short rest','long rest':'Long rest','thrown':'Thrown','finesse':'Finesse','Ranged':null};
const PROF_KEYS = new Set(Object.keys(PROF_INFO()));
const GKEYS = Object.keys(G).filter(k=>!['Action','Bonus action','Reaction','Free','Free / once per turn','Move','Light','Platinum','Gold','Electrum','Silver','Copper'].includes(k) && !SKILL_INFO[k] && !PROF_KEYS.has(k) && !CORE_PROF.has(k))
  .concat(Object.keys(GA).filter(k=>GA[k])).sort((a,b)=>b.length-a.length);
const GRE = new RegExp('(^|[^A-Za-z-])(' + GKEYS.map(k=>k.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join('|') + ')(?![A-Za-z])', 'g');
// turn glossary words in plain text into tappable terms (first mention per text node)
function linkify(root){
  if (!root) return;
  const skip = 'button,a,input,label,textarea,h1,nav,.tr > summary,.roll,.bubble,.kv dd,.tag,.term,.num,.notelist,.changes,script,style';
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (!n.nodeValue.trim() || (n.parentElement && n.parentElement.closest(skip))) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
  nodes.forEach(n => {
    const s = n.nodeValue, used = new Set(); let out = '', last = 0, m, hit = false;
    GRE.lastIndex = 0;
    while ((m = GRE.exec(s))){
      const word = m[2], key = G[word] ? word : GA[word];
      const start = m.index + m[1].length;
      if (!key || used.has(key)) continue;
      used.add(key); hit = true;
      out += esc(s.slice(last, start)) + '<button type="button" class="term" data-term="'+esc(key)+'">'+esc(word)+'</button>';
      last = start + word.length;
    }
    if (!hit) return;
    out += esc(s.slice(last));
    const span = document.createElement('span'); span.innerHTML = out; n.replaceWith(span);
  });
  // chips that are a single property or mastery name (Light only links here, never in prose)
  root.querySelectorAll('.chip:not(.toggle)').forEach(ch => {
    if (ch.querySelector('.term')) return;
    const base = ch.textContent.replace(/\s*\(.*\)$/,'').replace(/:.*$/,'').trim();
    if (G[base]) ch.innerHTML = '<button type="button" class="term" data-term="'+esc(base)+'">'+esc(ch.textContent)+'</button>';
  });
}
// type cues: dice in brass mono, DCs as badges, distances in mono
const DEC_RE = /(\b\d*d(?:4|6|8|10|12|20|100)s?(?:\s?[+−-]\s?\d+)?\b)|(\bDC\s?\d+\b)|(\b\d+(?:[.,]\d+)?\s?(?:km|m)\b)/g;
// type cues: dice in mono with the die icon, DCs as badges, distances in mono.
// Roll cards only get the dice cue (their DCs and numbers have their own layout).
function decorate(root){
  if (!root) return;
  const skip = 'button,a,input,textarea,label,select,script,style,h1,h2,h3,.num,.dice,.dc,.dist,.qty,.k,.v,.eyebrow,.die,.mod,.roll .n,.fx,.dsw';
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (!n.nodeValue.trim() || (n.parentElement && n.parentElement.closest(skip))) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
  nodes.forEach(n => {
    const s = n.nodeValue; DEC_RE.lastIndex = 0; if (!DEC_RE.test(s)) return; DEC_RE.lastIndex = 0;
    const diceOnly = !!n.parentElement.closest('.roll');
    if (diceOnly && !/\d*d(?:4|6|8|10|12|20|100)\b|d(?:4|6|8|10|12|20|100)s\b/.test(s)) return;
    const html = esc(s).replace(DEC_RE, (m, d, dc, dist) => diceOnly && !d ? m : '<span class="'+(d?'dice':dc?'dc':'dist')+'">'+m+'</span>');
    const span = document.createElement('span'); span.innerHTML = html; n.replaceWith(span);
  });
}
// **bold** → <b>
const fmtB = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
// Glossary body markup → HTML. First line is the gist. "**x**" bold, "## Heading" starts a section (a leading
// emoji is dropped), "• " lines become a list, a line that is just "OR" draws a choice divider.
function fmtTip(s){
  s = String(s||''); if (!s.includes('\n')) return fmtB(s);
  let out = '', list = false;
  s.split('\n').forEach(line => {
    const t = line.trim(), li = t.startsWith('• ');
    if (list && !li) { out += '</ul>'; list = false; }
    if (!t) return;
    if (t==='OR') { out += '<div class="or"><span>or</span></div>'; return; }
    if (t.startsWith('## ')) out += '<div class="th">'+fmtB(t.slice(3).replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u,''))+'</div>';
    else if (li) { if (!list) { out += '<ul class="tl">'; list = true; } out += '<li>'+fmtB(t.slice(2))+'</li>'; }
    else out += '<p>'+fmtB(t)+'</p>';
  });
  return out + (list ? '</ul>' : '');
}
let tipFor = null;
// close the open glossary bubble
function closeTip(dir){
  const b = document.getElementById('bubble');
  if (tipFor) tipFor.setAttribute('aria-expanded','false'); tipFor = null; document.body.classList.remove('tipopen');
  if (!b) return;
  b.id = ''; // a new bubble can open while this one leaves
  if (dir === 'now' || reduceMotion()) { b.remove(); return; }
  if (!dir || dir === 'fade') {          // fade out right where it is, pinned to its word
    b.style.transition = 'opacity .16s ease-in, transform .16s ease-in'; b.style.opacity = '0'; b.style.transform = 'scale(.97)';
    setTimeout(() => b.remove(), 170); return;
  }
  const to = dir === 'left' ? 'translateX(-120%)' : dir === 'right' ? 'translateX(120%)' : 'translateY(60px)';
  b.style.transition = 'transform .18s ease-in, opacity .18s ease-in'; b.style.transform = to; b.style.opacity = '0';
  setTimeout(() => b.remove(), 180);
}
// open (or close) the bubble for a term, pinned to the tapped element
function toggleTip(el){
  if (tipFor === el) return closeTip();
  closeTip();
  const g = G[el.dataset.term]; if (!g) return;
  const b = document.createElement('div'); b.id = 'bubble'; b.className = 'bubble'; b.setAttribute('role','tooltip');
  b.innerHTML = '<button type="button" class="bclose" data-act="tipclose" aria-label="Close"><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><div class="bscroll"><div class="bk">'+esc(srcTag(el.dataset.term) || g[0])+'</div><div class="bt'+(g[4]?' hassub':'')+'"><span>'+esc(el.dataset.term)+'</span>'+(g[4]?'<span class="bsub">'+esc(g[4])+'</span>':'')+'</div><div class="bx">'+fmtTip(g[1])+'</div></div>'
    // trackers and buttons sit in a footer under the scrolling text, so they stay in reach on long tooltips
    + (() => { const f = useBlock(el.dataset.term)+invBlock(el.dataset.term)+(g[3]?'<div class="ba">'+g[3]+'</div>':''); return f ? '<div class="bfoot">'+f+'</div>' : ''; })();
  b.querySelectorAll('.bx,.bw > span').forEach(decorate);
  document.body.appendChild(b);   // no swipe-to-close: tooltips can scroll now; close with ✕ or a tap outside
  // long tooltips: shrink the scrolling part so the whole bubble fits in the bigger gap above or below its word
  { const r0 = el.getBoundingClientRect(), top0 = el.closest('.top') ? 0 : (($('.top') || {getBoundingClientRect:()=>({bottom:0})}).getBoundingClientRect().bottom);
    const room = Math.max(window.innerHeight - r0.bottom - 24, r0.top - 24 - top0), sc = b.querySelector('.bscroll');
    if (sc && b.offsetHeight > room) sc.style.maxHeight = Math.max(120, sc.clientHeight - (b.offsetHeight - room))+'px';
    if (sc) b.classList.toggle('bscrolls', sc.scrollHeight > sc.clientHeight + 2); }
  const rc = el.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const w = b.offsetWidth, h = b.offsetHeight, gutter = 12;
  let left = Math.min(Math.max(gutter, rc.left + rc.width/2 - w/2), vw - w - gutter);
  // above only if it fits fully below the sticky header; otherwise go below (and scroll it into view further down)
  const hdr = el.closest('.top') ? 0 : (($('.top') || {getBoundingClientRect:()=>({bottom:0})}).getBoundingClientRect().bottom);
  const below = rc.bottom + 10 + h < vh - 8 || rc.top - 10 - h < hdr + 8;
  // words in the page: page coordinates, so the bubble scrolls with its word and slides under the header.
  // words in the sticky header (stat panels): stay fixed, above everything.
  // words in fixed layers (roll sheet, windows, dialogs): fixed too, and drawn above that layer
  const overlay = !!el.closest('#dock, .restbox, #hpedit, .modal');
  const inTop = overlay || !!el.closest('.top');
  const sx = inTop ? 0 : window.scrollX, sy = inTop ? 0 : window.scrollY;
  b.style.position = inTop ? 'fixed' : 'absolute'; b.style.zIndex = overlay ? '120' : inTop ? '50' : '15';
  b.style.left = (left + sx) + 'px';
  b.style.top = ((below ? rc.bottom + 10 : rc.top - h - 10) + sy) + 'px';
  b._anchorTop = rc.top; b._top0 = parseFloat(b.style.top);   // lets a tip inside a scrolling panel follow its word
  b.classList.add(below ? 'down' : 'up');
  b.style.setProperty('--tx', Math.min(Math.max(14, rc.left + rc.width/2 - left), w - 14) + 'px');
  el.setAttribute('aria-expanded','true'); tipFor = el; document.body.classList.add('tipopen');
  // if the bottom of the tooltip (where its buttons are) is off-screen, scroll down just enough to show it,
  // without pushing the word it belongs to up under the sticky header
  if (!inTop) {
    const over = b.getBoundingClientRect().bottom - (window.innerHeight - 12);
    if (over > 0) {
      const top = $('.top'), hb = top ? top.getBoundingClientRect().bottom : 0;
      const room = el.getBoundingClientRect().top - hb - 12;
      const by = Math.min(over, Math.max(0, room));
      if (by > 0) window.scrollBy({top: by, behavior: reduceMotion() ? 'auto' : 'smooth'});
    }
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTip(); });
// scrolling keeps the bubble on its word; it only fades once the word has left the screen (or slid under the header)
window.addEventListener('scroll', () => {
  if (!tipFor) return;
  if (!tipFor.isConnected) return closeTip();
  if (tipFor.closest('.top')) {
    // words inside a scrolling panel in the header (Quick roll, menu): the bubble rides along with its word
    const sc = tipFor.closest('.restbox'); if (!sc) return;
    const r = tipFor.getBoundingClientRect(), br = sc.getBoundingClientRect();
    if (r.bottom < br.top || r.top > br.bottom) return closeTip();
    const b = $('#bubble'); if (b && b._top0 != null) b.style.top = (b._top0 + r.top - b._anchorTop) + 'px';
    return;
  }
  const r = tipFor.getBoundingClientRect(), top = $('.top'), hb = top ? top.getBoundingClientRect().bottom : 0;
  if (r.bottom < hb || r.top > window.innerHeight || r.width === 0) closeTip();
}, {passive:true, capture:true});
window.addEventListener('resize', closeTip);


