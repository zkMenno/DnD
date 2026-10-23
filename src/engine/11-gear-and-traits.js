/* ============================================================================
   §11 GEAR AND TRAITS — what each piece of kit does (2024 rules, metric), inventory counters, ➕ Add item, and the
   Gear and Traits tabs.
   Defines: TOOL_ABIL / toolAbility, USES and CONSUMABLE (item texts and use buttons), potion helpers, itemLeft /
   invQty / paintInv / useItem (counters), gearPanel, the ➕ Add item picker (CAN_ADD, ITEMS, openItemPicker,
   addedChanged), traitBody (also the picker's item details), traitsPanel / filterTraits / bindTraits.
   Relies on: DATA, D, RES, ADDED, mergeAdded, ddbQty, fillTpl, esc, $ (§2), S, ui, save, saveUi, ARROW_N, healPotion
   (§3), derive (§1), §4–§5 dice and fx, deskFine, HAS_ARROWS / paintRes / classEmo (§10). At run time: render (§13).
   oilDC, USES and CONSUMABLE are built as this file loads; addPotionUses() runs again when added items change.
   ============================================================================ */
// ── Tool checks ────────────────────────────────────────────────────────────────────────────────────────────
// proficient with a tool? (matched on the start of its name, so 'Thieves' finds "Thieves' Tools")
const toolProf = n => D.profs.tools.some(t => t.toLowerCase().startsWith(n.toLowerCase()));
// check bonus with a tool: ability mod + proficiency if proficient
const toolBonus = (a, n) => D.mod[a] + (toolProf(n) ? D.pb : 0);
// the ability a tool check uses (2024 rules), for the tools with a fixed one
const TOOL_ABIL = {"Thieves' Tools":'dex',"Herbalism Kit":'int',"Alchemist's Supplies":'int',"Brewer's Supplies":'int',"Calligrapher's Supplies":'dex',"Carpenter's Tools":'str',
  "Cartographer's Tools":'wis',"Cobbler's Tools":'dex',"Cook's Utensils":'wis',"Disguise Kit":'cha',"Forgery Kit":'dex',"Glassblower's Tools":'int',"Jeweler's Tools":'int',
  "Leatherworker's Tools":'dex',"Mason's Tools":'str',"Navigator's Tools":'wis',"Painter's Supplies":'wis',"Poisoner's Kit":'int',"Potter's Tools":'int',"Smith's Tools":'str',
  "Tinker's Tools":'dex',"Weaver's Tools":'dex',"Woodcarver's Tools":'dex',"Healer's Kit":'wis'};
// the ability a tool check uses: TOOL_ABIL, else gaming sets WIS, instruments CHA, vehicles DEX, anything else INT
const toolAbility = t => TOOL_ABIL[t] || (/set$|dice|cards|dragonchess|three-dragon/i.test(t) ? 'wis' : /lute|flute|drum|horn|lyre|bagpipes|dulcimer|pan flute|shawm|viol|instrument/i.test(t) ? 'cha' : /vehicle/i.test(t) ? 'dex' : 'int');
// extra search words for some tools (nothing reads this at the moment)
const TOOL_WORDS = {"Thieves' Tools":'lock trap pick',"Herbalism Kit":'herb plant brew potion',"Alchemist's Supplies":'acid fire potion',"Disguise Kit":'disguise costume',"Forgery Kit":'forge document',"Poisoner's Kit":'poison'};

// ── Item uses and consumables ──────────────────────────────────────────────────────────────────────────────
// the save DC of a thrown oil flask (8 + DEX + proficiency), fixed as the page loads
const oilDC = 8 + D.mod.dex + D.pb;
// What a piece of kit does, by inventory name: () → {text, roll?: [check label, bonus]}. Texts are built when shown,
// so bonuses stay current. Healing potions are added by addPotionUses(); packs can read them.
const USES = {
  "Thieves' Tools": () => ({text:'Pick a lock (DC 15) or disarm a trap (DC 15). Uses DEX'+(toolProf('Thieves')?'; you’re proficient, so ':', so ')+sgn(toolBonus('dex','Thieves'))+'. Takes your action.', roll:['Thieves’ Tools', toolBonus('dex','Thieves')]}),
  'Dice': () => ({text:'Gaming set. Spot someone cheating (DC 10) or win a game (DC 20). Uses WIS'+(toolProf('Dice')?'; proficient, so ':' without proficiency, so ')+sgn(toolBonus('wis','Dice'))+'. Good for tavern coin and gossip.', roll:['Dice set', toolBonus('wis','Dice')]}),
  "Healer's Kit": () => ({text:'Stabilise a creature at 0 HP without a Medicine check. One use per creature, takes your action. Doesn’t restore HP.'}),
  'Tinderbox': () => ({text:'Light a candle, lantern, torch or spilled oil as a bonus action. Any other fire, like a campfire, takes 1 minute.'}),
  'Hooded Lantern': () => ({text:'Bright light 9 m, dim light 9 m more. One flask of oil burns 6 hours. Lower the hood as a bonus action to shrink it to dim light 1.5 m when you want to sneak.'}),
  'Candle': () => ({text:'Bright light 1.5 m, dim 1.5 m more, for an hour. Cheap, quiet light for reading maps or searching a room.'}),
  'Oil': () => ({text:'Throw instead of one attack: a target within 6 m makes a DC '+oilDC+' DEX save or is covered in oil, and takes 5 extra fire damage if it takes fire damage within a minute. Or pour it on a 1.5 m square and light it: it burns 2 rounds, 5 fire damage to anyone entering or ending their turn there. Also lantern fuel.'}),
  'Ball Bearings': () => ({text:'Spill a bag to cover a 3 m square within 3 m of you. Anyone entering makes a DC 10 DEX save or falls prone. 10 minutes to collect. Your 1,000 bearings make one bag, so one use.'}),
  'Rope': () => ({text:'15 m of hemp. Tie a knot with Sleight of Hand DC 10; breaking it takes Athletics DC 20. You can only tie up someone who is grappled, incapacitated or restrained.'}),
  'Crowbar': () => ({text:'Advantage on Strength checks where leverage helps: forcing doors, prying open chests, lifting grates. Your STR check is '+sgn(D.mod.str)+'.'}),
  'Bell': () => ({text:'Heard up to 18 m away. Hang it on a string across a doorway or camp entrance as an alarm.'}),
  'Waterskin': () => ({text:'Holds about 2 litres. You need about 4 litres of water a day, double in hot weather, so refill whenever you can.'}),
  'Rations': () => ({text:'One day of food each. Going without food or water leads to exhaustion.'}),
  "Traveler's Clothes": () => ({text:'Sturdy everyday clothes. No game effect, but they let you pass as an ordinary traveller.'}),
  'Backpack': () => ({text:'Holds up to about 14 kg of gear.'}),
  'Quiver': () => ({text:'Holds 20 arrows.'}),
  'Leather': () => ({text:'Light armour: AC 11 + DEX. No penalty to Stealth.'}),
  'Arrows': () => ({text:'One per shot. After a fight, spend a minute to recover half of what you fired.'})
};
// Consumables: item name → the label of the button that spends one (null: counted, but no button, like arrows).
// How many are left comes from S.spent; every healing potion gets 🧪 Drink.
const CONSUMABLE = {'Oil':'🔥 Use one','Rations':'🍞 Eat one','Candle':'🕯️ Light one','Ball Bearings':'⚪ Spill the bag',[ARROW_N]:null};
// the names of the healing potions in the inventory, each once
const potionNames = () => [...new Set(DATA.inventory.filter(i => healPotion(i.name)).map(i => i.name))];
// a healing potion's dice: "2d4+2"
const potionDice = n => { const [c, d, f] = healPotion(n); return c+'d'+d+'+'+f; };
// give every healing potion a 🧪 Drink button and a "what it does" text (unless it has one); safe to run again
function addPotionUses(){ potionNames().forEach(n => { CONSUMABLE[n] = '🧪 Drink'; if (!USES[n]) USES[n] = () => ({text:'Drink as a bonus action: heal '+potionDice(n)+'. Or give it to an ally within 1.5 m.'}); }); }
addPotionUses();
// plain arrows left
const arrowsLeft = () => itemLeft(ARROW_N);
// how many of an item the inventory lists (D&D Beyond's, plus items added here)
const invQty = n => DATA.inventory.filter(i=>i.name===n).reduce((a,i)=>a+(i.qty||0),0);
// inventory item name for a glossary term (curly apostrophes made straight), or null
const invName = term => { const n = String(term).replace(/[’‘]/g,"'"); return DATA.inventory.some(i=>i.name===n) ? n : null; };
// how many are left right now (after uses at the table); ball bearings count as one bag
function itemLeft(n){
  const used = (S.spent||{})[n]||0;
  return Math.max(0, (n==='Ball Bearings' ? 1 : invQty(n)) - used);
}
// "×3" (or "1 bag" for ball bearings)
function itemCountTxt(n){ const k = itemLeft(n); return n==='Ball Bearings' ? k+' bag'+(k===1?'':'s') : '×'+k; }
// the "use one" button for a consumable ('' if it has none); disabled when none are left
function useBtn(n, cls){ return CONSUMABLE[n] ? '<button class="btn '+(cls||'small')+'" data-act="useitem" data-item="'+esc(n)+'" data-invbtn="'+esc(n)+'"'+(itemLeft(n)?'':' disabled')+'>'+CONSUMABLE[n]+'</button>' : ''; }
// "🎒 You have ×n [use]" row inside an item's glossary bubble or drawer ('' if the term isn't in the inventory)
function invBlock(term){
  const n = invName(term); if (!n) return '';
  return '<div class="binv"><span><b>🎒 You have</b> <span class="invq" data-invq="'+esc(n)+'">'+itemCountTxt(n)+'</span></span>'+useBtn(n,'primary rollbtn')+'</div>';
}
// refresh every counter and use button on screen for one item, without a repaint
function paintInv(n){
  const left = itemLeft(n);
  document.querySelectorAll('[data-invq]').forEach(e => { if (e.dataset.invq===n) e.textContent = itemCountTxt(n); });
  document.querySelectorAll('[data-invn]').forEach(e => { if (e.dataset.invn===n) e.textContent = left; });   // plain numbers (− / + steppers)
  document.querySelectorAll('[data-invbtn]').forEach(b => { if (b.dataset.invbtn===n) b.disabled = !left; });
  paintCarry();
}
// Spend one of a consumable (saved) and play its animation. A healing potion rolls, heals you (healMe) and shows a
// result card that closes itself; an arrow also counts as fired (for recovering half after the fight).
function useItem(n){
  if (!n || itemLeft(n) <= 0) return;
  S.spent = Object.assign({}, S.spent, {[n]: ((S.spent||{})[n]||0) + 1});
  const hp = healPotion(n);
  if (hp){   // a healing potion: roll it, heal, show the roll
    const [c, d, f] = hp, dice = rollDice(c, d), v = sum(dice) + f; save(); paintRes(); paintInv(n);
    return fx('potion', () => { const g = healMe(v);   // HP goes up as the result shows, with a burst of hearts
      showRoll('<span hidden data-heal></span><div class="head"><span class="title">'+esc(n)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="nums"><span class="n">'+healNote(v, g)+'</span></div><div class="bd">'+c+'d'+d+' ['+dice.join(', ')+'] +'+f+'</div>') || autoCloseRoll(); }, asDice(dice, d));
  }
  if (n === ARROW_N) S.fired = (S.fired||0) + 1;
  save(); paintRes(); paintInv(n);
  fx({'Oil':'oil','Rations':'rations','Candle':'candle','Ball Bearings':'bearings'}[n]);
}
// ── Gear tab ───────────────────────────────────────────────────────────────────────────────────────────────
// Gear tab: coins (#coinbox, filled by §19), ➕ New gear, weapons and armour, ammo (#ammobox, §19), backpack, kits;
// pack extras at the end. An item's "what it does" text shows on its first row only.
function gearPanel(){
  const inv = DATA.inventory;
  const weaponsArmor = inv.filter(i => !i.inPack && (i.filter==='Weapon' || i.filter==='Armor'));
  const ammo = inv.filter(i => /Arrow|Bolt|Bullet/.test(i.name));
  const pack = inv.filter(i => i.inPack);
  const other = inv.filter(i => !i.inPack && !weaponsArmor.includes(i) && !ammo.includes(i));
  const shown = new Set();
  const row = i => {
    const u = USES[i.name] && !shown.has(i.name) ? USES[i.name]() : null; if (u) shown.add(i.name);
    const live = u && (i.name in CONSUMABLE);
    return '<div class="item'+(i.added?' added':'')+'"><span class="n"><b class="iname">'+esc(i.name)+'</b>'+(live?' <span class="qty" data-invq="'+esc(i.name)+'">'+itemCountTxt(i.name)+'</span>':i.qty>1?' <span class="qty">×'+i.qty+'</span>':'')+(i.uses?' <span class="small muted">('+(i.uses.max-i.uses.used)+'/'+i.uses.max+' uses)</span>':'')
    + (i.added ? '<span class="addline"><span class="chip addtag" title="Added in this app. It’s on the change list for D&amp;D Beyond.">not in D&amp;D Beyond yet</span></span>' : '')
    + (u ? '<span class="use">'+esc(u.text)+'</span>' : '') + '</span>'
    + (u && u.roll ? '<button class="btn small rollbtn" data-tool="'+esc(u.roll[0])+'" data-b="'+u.roll[1]+'">🎲 Roll '+sgn(u.roll[1])+'</button>' : '')
    + (live ? useBtn(i.name) : '')
    + (i.added ? addedCtl(i) : i.equipped && (i.filter==='Weapon'||i.filter==='Armor')?'<span class="chip">equipped</span>':i.filter==='Weapon'||i.filter==='Armor'?'<span class="chip ghost">spare</span>':'')+'</div>';
  };
  // carrying first by default; like every titled card it can be moved with ↕ Sections → Reorder
  return '<section class="card carrycard"><h2><span class="emo" aria-hidden="true">⚖️</span>Carrying capacity</h2>'+carryHTML()+'</section>'
    + '<section class="card" id="coinbox"></section>'
    + (CAN_ADD() ? '<section class="card addcard"><div class="cardhead"><h2><span class="emo" aria-hidden="true">🛒</span>New gear</h2><button class="btn primary" data-act="additem">➕ Add item</button></div>'
      + '<p class="small muted" style="margin:0">'+(ADDED.length ? ADDED.length+' item'+(ADDED.length===1?'':'s')+' added here, marked <span class="chip addtag">not in D&amp;D Beyond yet</span>. They go once D&amp;D Beyond has them and you sync.' : 'Picked something up? Add it here. It works straight away and goes on the change list until it’s in D&amp;D Beyond.')+'</p></section>' : '')
    + '<section class="card"><h2><span class="emo" aria-hidden="true">⚔️</span>Weapons and armour</h2><div class="items">'+weaponsArmor.map(row).join('')+'</div></section>'
    + (HAS_ARROWS ? '<section class="card" id="ammobox"></section>' : '')
    + '<section class="card"><h2><span class="emo" aria-hidden="true">🎒</span>Backpack</h2><div class="items">'+pack.map(row).join('')+'</div></section>'
    + '<section class="card"><h2><span class="emo" aria-hidden="true">🧰</span>Kits, tools and clothes</h2><div class="items">'+other.filter(i=>!/Backpack|Quiver/.test(i.name)).map(row).join('')+'</div>'
    + '<p class="small muted" style="margin:8px 0 0">Being proficient with a tool adds your proficiency bonus (+'+D.pb+') to checks with it. If you’re also proficient in the skill involved, you get advantage.</p>'
    + '</section>'
    + (PACK.gearExtras ? PACK.gearExtras(inv) : '');
}

// ── ➕ Add item ─────────────────────────────────────────────────────────────────────────────────────────────
// Pick from the SRD 5.2 item list: the item works at once (S.added → ADDED, merged into DATA.inventory) and goes on
// the change list until D&D Beyond has it.
// Shared sheets in the web app are read-only: nothing to add there
const CAN_ADD = () => !(window.SHEET && window.SHEET.mine === false);
let ITEMS = null;   // the item list, once loaded
// the item list ({items: […]}): embedded in the claude.ai page (#items-data), fetched once in the web app
async function loadItems(){
  if (ITEMS) return ITEMS;
  const el = document.getElementById('items-data');
  ITEMS = el ? JSON.parse(el.textContent) : await (await fetch(window.withV ? window.withV('/items.json') : '/items.json')).json();
  return ITEMS;
}
// the picker's category chips (none picked = everything; tapping the picked one again unpicks it)
const IT_CATS = [['weapon','⚔️ Weapons'],['armor','🛡️ Armour'],['gear','🎒 Gear'],['tool','🧰 Tools'],['potion','🧪 Potions'],['magic','✨ Magic']];
// picker category of a catalogue item (packs and ammunition count as gear)
const itCat = it => it.k === 'pack' || it.k === 'ammo' ? 'gear' : it.k;
// pounds → kilograms, one decimal
const lbToKg = lb => Math.round(lb*0.45*10)/10;
// generic magic items (Weapon +1, Flame Tongue…) need a base weapon or armour picked
const needsBase = it => it.k === 'magic' && (it.gen === 'weapon' || it.gen === 'armor');
// ── What weapons and armour do ─────────────────────────────────────────────────────────────────────────────
// The SRD item list has no text for plain weapons, armour, ammunition and spellcasting foci, so the picker explains
// them from their properties. Short versions of the SRD 5.2 rules (CC-BY-4.0).
const PROP_TXT = {
  'Ammunition': 'Each attack uses one piece of ammunition. After the fight you can spend a minute to get half of it back.',
  'Finesse': 'Use STR or DEX, whichever is better, for the attack and the damage.',
  'Heavy': 'Disadvantage on the attack if your STR (melee) or DEX (ranged) is below 13.',
  'Light': 'After you attack with it, you can make one more attack as a Bonus Action with a different Light weapon. That second hit adds no ability modifier to its damage, unless the modifier is negative.',
  'Loading': 'One shot per action, Bonus Action or Reaction, however many attacks you have.',
  'Range': 'A ranged weapon: past the first range you have Disadvantage, and you can’t hit beyond the second.',
  'Reach': 'Reaches 1.5 m further than normal, so 3 m.',
  'Thrown': 'You can throw it for a ranged attack, with the same ability you’d use in melee.',
  'Two-Handed': 'Takes both hands to attack with.',
  'Versatile': 'One or two hands. With two, it deals the bigger damage die.',
  // weapon masteries: only for characters whose class lets them use this weapon's mastery
  'Cleave': 'Hit a creature in melee, and you can attack a second creature within 1.5 m of it and within your reach. On a hit it takes the weapon’s damage without your ability modifier. Once per turn.',
  'Graze': 'Miss, and the target still takes damage equal to the ability modifier you attacked with.',
  'Nick': 'The extra Light-weapon attack becomes part of your Attack action instead of a Bonus Action. Once per turn.',
  'Push': 'On a hit, push a Large or smaller creature up to 3 m straight away from you.',
  'Sap': 'On a hit, the target has Disadvantage on its next attack roll before your next turn starts.',
  'Slow': 'Hit and deal damage, and the target’s Speed drops by 3 m until your next turn starts.',
  'Topple': 'On a hit, the target makes a CON save (DC 8 + your attack’s ability modifier + proficiency bonus) or falls Prone.',
  'Vex': 'Hit and deal damage, and you have Advantage on your next attack against that creature before the end of your next turn.'};
// armour by kind (1 light … 4 shield): what counts for AC, and how long putting it on and taking it off takes
const ARMOR_TXT = {
  1: ['Light armour', 'AC is the armour’s number plus your full DEX modifier.', 'Takes 1 minute to put on and 1 minute to take off.'],
  2: ['Medium armour', 'AC is the armour’s number plus your DEX modifier, up to +2.', 'Takes 5 minutes to put on and 1 minute to take off.'],
  3: ['Heavy armour', 'AC is the armour’s number. DEX doesn’t count, for better or worse.', 'Takes 10 minutes to put on and 5 minutes to take off.'],
  4: ['Shield', 'Adds 2 to your AC while you hold it. It takes a hand.', 'Takes an action to pick up or put away.']};
// ammunition and spellcasting foci (the rest of the SRD list has its own text)
const GEAR_TXT = {
  'Arrows': 'Ammunition for shortbows and longbows. The quiver they come in holds 20.', 'Bolts': 'Ammunition for crossbows. The case holds 20.',
  'Bullets, Firearm': 'Ammunition for pistols and muskets. The pouch holds 10.', 'Bullets, Sling': 'Ammunition for slings. The pouch holds 20.', 'Needles': 'Ammunition for blowguns. The pouch holds 50.',
  'Crystal': 'Arcane focus', 'Orb': 'Arcane focus', 'Rod': 'Arcane focus', 'Staff': 'Arcane focus (it also works as a quarterstaff)', 'Wand': 'Arcane focus',
  'Sprig of Mistletoe': 'Druidic focus', 'Yew Wand': 'Druidic focus', "Glassblower's Tools": 'Shape glass: blow, cut and polish it, and tell good glass from bad. Your proficiency bonus counts on checks with them.'};
const FOCUS_TXT = 'Hold it to cast spells: it stands in for material components that have no cost listed.';
// The "what it does" block in the picker for a catalogue item it (and the base weapon / armour picked): the item's
// own text first, then each weapon property, the armour rules, and whether you're trained with it.
function itemExplain(it, base){
  const w = base && base.k==='weapon' ? base : it.k==='weapon' ? it : null, ar = base && base.k==='armor' ? base : it.k==='armor' ? it : null;
  const out = [];
  if (it.d) out.push(traitBody(it.d.replace(/^(Common|Uncommon|Rare|Very Rare|Legendary|Artifact)( \([^)]*\))?\s+(?=[A-Z])/, '')));
  else if (GEAR_TXT[it.n]) out.push('<p>'+esc(GEAR_TXT[it.n])+(/focus/.test(GEAR_TXT[it.n]) ? ': '+esc(FOCUS_TXT.charAt(0).toLowerCase()+FOCUS_TXT.slice(1)) : '')+'</p>');
  const dl = [];
  if (w) {
    dl.push([(w.cat===2 ? 'Martial' : 'Simple')+' '+(w.at===2 ? 'ranged' : 'melee')+' weapon', w.dmg+' '+String(w.dt||'').toLowerCase()+' damage.'
      + (typeof D !== 'undefined' && D.profs ? ' '+((w.cat===2 ? D.profs.weapons.includes('Martial') : D.profs.weapons.includes('Simple')) ? 'You’re trained with it: add your proficiency bonus (+'+D.pb+') to hit.' : 'You’re not trained with it, so no proficiency bonus to hit.') : '')]);
    (w.p||[]).forEach(x => { const k = x.replace(/\s*\(.*\)$/, ''), t = PROP_TXT[k]; if (!t) return;
      const mine = MASTERY_WORDS.includes(k) && typeof D !== 'undefined' && D.masteries && D.masteries[w.n] === k;
      dl.push([MASTERY_WORDS.includes(k) ? 'Mastery: '+k : x, t + (MASTERY_WORDS.includes(k) ? (mine ? ' You have this mastery.' : ' Only with Weapon Mastery for this weapon.') : '')]); });
  }
  if (ar && ARMOR_TXT[ar.arm]) { const [nm, ac, time] = ARMOR_TXT[ar.arm];
    const kind = ar.arm===4 ? 'Shields' : nm.split(' ')[0];
    const trained = typeof D !== 'undefined' && D.profs ? D.profs.armor.includes(kind) : null;
    dl.push([nm, ac+' '+time]);
    if (ar.str) dl.push(['Needs STR '+ar.str, 'Below STR '+ar.str+', your Speed drops by 3 m while you wear it.']);
    if (ar.sd) dl.push(['Noisy', 'Disadvantage on Stealth checks while you wear it.']);
    if (trained !== null) dl.push([trained ? 'You’re trained with it' : 'You’re not trained with it', trained ? 'No penalties.' : 'While you wear it: Disadvantage on every STR and DEX roll, and you can’t cast spells.']); }
  if (dl.length) out.push('<dl class="iexp">'+dl.map(([k, v]) => '<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>');
  return out.join('');
}

// ── Carrying capacity ──────────────────────────────────────────────────────────────────────────────────────
// What you can carry: STR × 15 lb, twice that with Powerful Build (or a Large species). Weight counts what the
// inventory lists minus what was used at the table; coins don't count. Returns pounds.
const carryCap = () => (D.score.str||10) * 15 * ((DATA.race && (DATA.race.traits||[]).some(t => /^Powerful Build$/i.test(t.name))) || /large/i.test(String(DATA.race && DATA.race.size || '')) ? 2 : 1);
function carriedLb(){
  // D&D Beyond weighs ammunition and the like per bundle (Arrows: 1 lb for 20); older saved sheets lack .bundle
  const BUNDLE = {'Arrows':20, 'Bolts':20, 'Needles':50, 'Bullets, Sling':20, 'Bullets, Firearm':10, 'Ball Bearings':1000, 'Caltrops':20};
  const unit = i => (i.weight||0) / (i.bundle || BUNDLE[i.name] || 1);
  let lb = DATA.inventory.reduce((a, i) => a + unit(i) * (i.qty||0), 0);
  Object.entries(S.spent||{}).forEach(([n, k]) => { const i = DATA.inventory.find(x => x.name === n); if (i && k > 0) lb -= unit(i) * Math.min(k, invQty(n)); });
  return Math.max(0, lb);
}
// The carrying line: "Carrying 34 kg of 116 kg" with a bar; addLb shows what it becomes with an item added.
// Lives in the Gear tab and the item picker (data-carry), and paintCarry() refreshes it in place.
function carryHTML(addLb){
  const cap = carryCap(), now = carriedLb(), after = now + (addLb||0), pct = Math.min(100, after / cap * 100), over = after > cap;
  return '<div class="carry'+(over?' over':'')+'" data-carry'+(addLb ? ' data-add="'+addLb+'"' : '')+'><div class="carryt"><span class="eyebrow">Carrying</span><span><b class="num">'+lbToKg(now)+'</b>'+(addLb ? ' → <b class="num">'+lbToKg(after)+'</b>' : '')+' of '+lbToKg(cap)+' kg</span></div>'
    + '<div class="carrybar" role="meter" aria-label="Carrying" aria-valuemin="0" aria-valuemax="'+lbToKg(cap)+'" aria-valuenow="'+lbToKg(after)+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>'
    + (over ? '<p class="small">That’s more than you can carry. Past '+lbToKg(cap)+' kg you can only push or drag it (up to '+lbToKg(cap*2)+' kg), at 1.5 m a turn.</p>' : '')+'</div>';
}
function paintCarry(){ document.querySelectorAll('[data-carry]').forEach(e => { e.outerHTML = carryHTML(+e.dataset.add || 0); }); }

// one line of facts under an item's name: damage or AC (from the base weapon / armour if one is picked), range,
// rarity, kind, cost and weight in kg
function itemFacts(it, base){
  const w = base && base.k==='weapon' ? base : it.k==='weapon' ? it : null, ar = base && base.k==='armor' ? base : it.k==='armor' ? it : null;
  const ft = n => Math.round(n/5*1.5*10)/10;
  return [w && (w.dmg+(it.b?' +'+it.b:'')+' '+(w.dt||'').toLowerCase()), w && w.at===2 && ft(w.r)+'/'+ft(w.lr)+' m',
    ar && (ar.arm===4 ? '+'+(ar.ac+(it.b||0))+' AC' : 'AC '+(ar.ac+(it.b||0))+(ar.arm===1?' + DEX':ar.arm===2?' + DEX (max 2)':'')),
    ar && ar.sd && 'Stealth disadvantage', it.rar, it.mk && it.mk !== 'Wondrous item' && it.mk, it.c, it.w ? lbToKg(it.w)+' kg' : '']
    .filter(Boolean).join(' · ');
}
// The inventory entry for a picked item (same shape compact() makes from D&D Beyond), named the way D&D Beyond
// would: "Longsword +1", "Flame Tongue Longsword". Weapons and armour go on your person, the rest in the pack.
function invFrom(it, base, qty, eq){
  const w = base && base.k==='weapon' ? base : it.k==='weapon' ? it : null, ar = base && base.k==='armor' ? base : it.k==='armor' ? it : null;
  const name = !base ? it.n : it.b ? base.n+' +'+it.b : /\b(Weapon|Armor)\b/.test(it.n) ? it.n.replace(/\b(Weapon|Armor)\b/, base.n) : it.n+' '+base.n;
  return { id:'add-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), name, type:it.k, filter: w ? 'Weapon' : ar ? 'Armor' : it.k==='potion' ? 'Potion' : 'Other Gear',
    sub:null, qty, equipped: !!(eq && (w || ar)), inPack: !(w || ar), isContainer:false, magic: it.k==='magic' || !!it.magic, rarity: it.rar || null,
    weight: (base ? base.w : it.w) || null, bundle: !base && it.q > 1 ? it.q : 1, damage: w ? w.dmg : null, dmgType: w ? w.dt : null, props: w ? (w.p||[]).slice() : [],
    range: w ? w.r : null, longRange: w ? w.lr : null, attackType: w ? w.at : null, category: w ? w.cat : null,
    ac: ar ? ar.ac : null, armorType: ar ? ar.arm : null, stealthDis: !!(ar && ar.sd), uses:null,
    text: String(it.d || (base && base.d) || '').slice(0, 260), bonus: it.b || 0, added:true };
}
// equip toggle and remove button on an added item's gear row
function addedCtl(i){
  const wa = i.filter==='Weapon' || i.filter==='Armor';
  return '<span class="addctl">'
    + (wa ? '<button class="chip eqbtn'+(i.equipped?'':' ghost')+'" data-act="itemeq" data-id="'+esc(i.id)+'" aria-pressed="'+i.equipped+'" title="Tap to switch">'+(i.equipped?'equipped':'spare')+'</button>' : '')
    + '<button class="x2 small itemdel" data-act="itemdel" data-id="'+esc(i.id)+'" aria-label="Remove '+esc(i.name)+'">×</button></span>';
}
// the added list changed (here or on another device): rebuild the inventory and D, then render the whole page again
// at the same scroll position
function addedChanged(){
  ADDED = S.added || []; mergeAdded(); Object.assign(D, derive(DATA));
  addPotionUses();
  HAS_ARROWS = HAS_ARROWS || DATA.inventory.some(i => /Arrow/.test(i.name)) || D.weapons.some(w => /bow\b/i.test(w.name) && !/crossbow/i.test(w.name));
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
// save a new added-items list and rebuild
function setAdded(list){ S.added = list; save(); addedChanged(); }
// Counters this sheet already tracks (consumables and potions D&D Beyond lists): adding more just lowers S.spent,
// which can go negative. Returns true if it did; the caller saves.
function bumpCounter(name, qty){
  if ((name in CONSUMABLE || healPotion(name)) && name !== 'Ball Bearings' && invQty(name)) { S.spent = Object.assign({}, S.spent, {[name]: ((S.spent||{})[name]||0) - qty}); return true; }
  return false;
}
let itemBox = null;   // the open picker window, if any
// The picker window: search + category chips, then one item's details with base weapon / armour, quantity and
// Equipped. Esc goes back from the details, then closes; focus returns to where it was. Adding closes it and either
// bumps an existing counter or adds an entry to S.added (with what to search for in D&D Beyond).
async function openItemPicker(){
  if (itemBox) return;
  const prev = document.activeElement;
  const wrap = document.createElement('div'); wrap.className = 'modal itemmodal'; wrap.setAttribute('role','dialog'); wrap.setAttribute('aria-modal','true'); wrap.setAttribute('aria-label','Add an item');
  wrap.innerHTML = '<div class="mbox ibox"><p class="muted">Opening the item list…</p></div>';
  document.body.appendChild(wrap); itemBox = wrap;
  const close = () => { document.removeEventListener('keydown', key, true); wrap.remove(); itemBox = null; if (prev && prev.focus && prev.isConnected) try{ prev.focus({preventScroll:true}); }catch(_){} };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); if (pick) { pick = null; paint(); } else close(); } };
  document.addEventListener('keydown', key, true);
  let list;
  try { list = (await loadItems()).items; }
  catch (e) { wrap.querySelector('.ibox').innerHTML = '<p>Couldn’t load the item list. Check your connection and try again.</p><div class="mbtns"><button class="btn" data-i="close">Close</button></div>'; wrap.addEventListener('click', ev => { if (ev.target.closest('[data-i="close"]') || ev.target === wrap) close(); }); return; }
  const bases = { weapon: list.filter(i => i.k==='weapon'), armor: list.filter(i => i.k==='armor' && i.arm !== 4) };
  let cat = 'all', q = '', pick = null, qty = 1, eq = true, base = null, scroll = 0;
  const box = wrap.querySelector('.ibox');
  const matches = () => { const t = q.trim().toLowerCase();
    return list.filter(it => (cat==='all' || itCat(it)===cat) && (!t || (it.n+' '+(it.mk||'')+' '+(it.rar||'')+' '+(it.dt||'')).toLowerCase().includes(t))); };
  const paintList = () => { const m = matches(), l = box.querySelector('.ilist'); if (!l) return;
    l.innerHTML = m.length ? m.map(it => '<button class="irow" data-i="pick" data-n="'+esc(it.n)+'"><span class="irn"><b>'+esc(it.n)+'</b><span class="small muted">'+esc(itemFacts(it))+'</span></span><span class="iplus" aria-hidden="true">＋</span></button>').join('')
      : '<p class="small muted">Nothing called that in the SRD list. Homebrew or book items: add them in D&amp;D Beyond, then sync.</p>'; };
  const paint = () => {
    if (!pick) {
      box.innerHTML = '<div class="itop"><div class="cardhead"><h3>➕ Add item</h3><button class="x2" data-i="close" aria-label="Close">×</button></div>'
        + '<input id="itq" class="qrsearch" type="search" placeholder="Search: rope, longsword, healing, bag…" autocomplete="off" value="'+esc(q)+'">'
        + '<div class="spfilters">'+IT_CATS.map(([k,t]) => '<button class="chip toggle'+(cat===k?' on':'')+'" data-i="cat" data-k="'+k+'" aria-pressed="'+(cat===k)+'">'+t+'</button>').join('')+'</div>'+carryHTML()+'</div>'
        + '<div class="ilist"></div><p class="small muted isrc">Items from the D&amp;D System Reference Document 5.2 (CC-BY-4.0).</p>';
      paintList(); box.querySelector('.ilist').scrollTop = scroll;
      const inp = box.querySelector('#itq'); inp.addEventListener('input', () => { q = inp.value; paintList(); });
      if (deskFine()) inp.focus({preventScroll:true});
      return;
    }
    const it = pick, nb = needsBase(it) || (it.k==='magic' && (it.mk==='Weapon' || it.mk==='Armor') && !/Ammunition|Shield/.test(it.n));
    const bl = nb ? (it.gen === 'armor' || it.mk === 'Armor' ? bases.armor : bases.weapon) : [];
    const wa = (base || it).k === 'weapon' || (base || it).k === 'armor';
    const inv = invFrom(it, base, qty, eq), have = ddbQty(inv.name);
    box.innerHTML = '<div class="itop"><div class="cardhead"><button class="btn small" data-i="back">‹ Back</button><button class="x2" data-i="close" aria-label="Close">×</button></div></div>'
      + '<div class="idet"><h3>'+esc(inv.name)+'</h3><p class="small muted">'+esc(itemFacts(it, base))+'</p>'
      + (it.has ? '<p class="small">Contains: '+esc(it.has.map(([n, x]) => (n>1?n+'× ':'')+x).join(', '))+'</p>' : '')
      + itemExplain(it, base)
      + (bl.length ? '<label class="ifield"><span class="eyebrow">Which '+(bl === bases.armor ? 'armour' : 'weapon')+(needsBase(it) ? '' : ' (optional)')+'</span><select id="itbase"><option value="">'+(needsBase(it) ? 'Pick one…' : 'Not a specific one')+'</option>'+bl.map(b => '<option'+(base && base.n===b.n?' selected':'')+'>'+esc(b.n)+'</option>').join('')+'</select></label>' : '')
      + (wa ? '<label class="ifield irow2 icheck"><span class="eyebrow">Equipped</span><input type="checkbox" id="iteq"'+(eq?' checked':'')+'></label>' : '')
      + (have ? '<p class="small muted">D&amp;D Beyond already lists '+have+'. This adds '+qty+' more.</p>' : '')

      + '</div><div class="icarry">'+carryHTML(((base ? base.w : it.w) || 0) / (!base && it.q > 1 ? it.q : 1) * qty)+'</div>'
      // footer: how many, next to the Add button it changes
      + '<div class="mbtns iadd"><span class="istep" role="group" aria-label="How many"><span class="eyebrow">How many</span><button class="iconbtn" data-i="qty" data-d="-1" aria-label="One fewer">−</button><output class="num">'+qty+'</output><button class="iconbtn" data-i="qty" data-d="1" aria-label="One more">+</button></span><button class="btn primary" data-i="add"'+(needsBase(it) && !base ? ' disabled' : '')+'>➕ Add '+(qty>1?qty+'× ':'')+esc(inv.name)+'</button></div>';
    const sel = box.querySelector('#itbase'); if (sel) sel.addEventListener('change', () => { base = bl.find(b => b.n === sel.value) || null; paint(); });
    const cb = box.querySelector('#iteq'); if (cb) cb.addEventListener('change', () => { eq = cb.checked; });
  };
  wrap.addEventListener('click', e => {
    if (e.target === wrap) return close();
    const b = e.target.closest('[data-i]'); if (!b) return;
    switch (b.dataset.i) {
      case 'close': return close();
      case 'cat': cat = cat === b.dataset.k ? 'all' : b.dataset.k; box.querySelectorAll('[data-i="cat"]').forEach(c => { const on = c.dataset.k === cat; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); }); return paintList();
      case 'pick': { scroll = box.querySelector('.ilist').scrollTop; pick = list.find(x => x.n === b.dataset.n); qty = pick.q || 1;
        base = /^Shield \+\d/.test(pick.n) ? list.find(x => x.k==='armor' && x.arm===4) || null : null;   // Shield +1: it's a shield
        eq = pick.k === 'weapon' || pick.k === 'armor' || pick.k === 'magic'; return paint(); }
      case 'back': pick = null; return paint();
      case 'qty': qty = Math.max(1, Math.min(999, qty + +b.dataset.d)); return paint();
      case 'add': {
        const it = pick, inv = invFrom(it, base, qty, eq);
        close();
        if (!base && bumpCounter(inv.name, qty)) { save(); const y = window.scrollY; render(); window.scrollTo(0, y); return; }
        const entry = { inv, had: ddbQty(inv.name), at: Date.now() };
        if (base && it.b) { entry.find = base.n; entry.pick = 'the +'+it.b+' version'; }
        else if (base) { entry.find = it.n; entry.pick = base.n; }
        return setAdded(ADDED.concat([entry]));
      }
    }
  });
  paint();
}


// ── Traits tab ─────────────────────────────────────────────────────────────────────────────────────────────
// Traits tab: every trait folds to one line (name · how you use it · uses left); tap to read it.
// A filter card on top: search, how you use it (Action / Bonus / Reaction / Passive) and where it comes from.
// Chips multi-select: OR within a row, AND across rows and the search.
// kind → [tag CSS class, label]; Passive borrows the F (free) tag colour
const TR_KIND = {A:['A','Action'], B:['B','Bonus'], R:['R','Reaction'], P:['F','Passive']};
// how a trait is used: A(ction), B(onus), R(eaction) or P(assive), from D&D Beyond's action data or the text
function traitKinds(name, text){
  const k = new Set(), acts = (DATA.actions||[]).filter(a => a.name === name || a.name.startsWith(name+':') || a.name.startsWith(name+' ('));
  acts.forEach(a => { if (a.act === 1) k.add('A'); if (a.act === 3) k.add('B'); if (a.act === 4) k.add('R'); });
  const t = String(text||'');
  if (!k.size) {
    if (/\bas a Bonus Action\b|\bBonus Action\b/i.test(t)) k.add('B');
    if (/\b(as a|use your|take a) Reaction\b|\bReaction\b.{0,40}\bwhen\b/i.test(t)) k.add('R');
    if (/\b(take|as) (a|the) (Magic |Utilize )?action\b|\bMagic action\b|\bas an action\b/i.test(t)) k.add('A');
  }
  if (!k.size) k.add('P');
  return [...k];
}
// "2/3" uses-left pill for a trait with a tracker (matched by resource name, its terms, or "Name: …" / "Name (…)")
function traitUses(name){
  const r = RES.find(x => x.name === name || (x.terms||[]).includes(name) || x.name.startsWith(name+':') || x.name.startsWith(name+' (') || x.name.replace(/^Font of Magic: /,'') === name);
  return r ? '<span class="trus'+(r.max - S[r.key] ? '' : ' none')+'">'+(r.max - S[r.key])+'/'+r.max+'</span>' : '';
}
// one folded trait (<details>: name, extra like "level 3", kinds, uses); data-src / data-k / data-q drive the filters
function traitRow(name, text, src, extra){
  const kinds = traitKinds(name, text), search = (name+' '+text).toLowerCase();
  return '<details class="tr" data-src="'+esc(src)+'" data-k="'+kinds.join('')+'" data-q="'+esc(search)+'"><summary><span class="trn">'+esc(name)+'</span>'
    + (extra ? '<span class="small muted trlv">'+extra+'</span>' : '')
    + '<span class="trtags">'+kinds.map(x => '<span class="tag '+TR_KIND[x][0]+'">'+TR_KIND[x][1]+'</span>').join('')+traitUses(name)+'</span><span class="chev" aria-hidden="true"></span></summary>'
    + traitBody(text)+'</details>';
}
// "Spell Slots. The Warlock…" → bold "Spell Slots." lead-in (escaped HTML either way)
const lead = x => { const m = String(x).match(/^([A-Z][A-Za-z’'+\-]*(?: [A-Za-z’'+\-0-9]+){0,5}\.)\s+(?=[A-Z])/); return m && m[1].length < 46 ? '<b>'+esc(m[1])+'</b> '+esc(x.slice(m[0].length)) : esc(x); };
// Long trait text → <div class="trbody"> with paragraphs, bullet lists and tables. Text that kept its own lines
// (richText, §1) is used as is; one long line is split into short paragraphs, and "the following benefits: A. B. C."
// becomes a bullet list. D&D Beyond's own UI hints ("clicking on this feature…") are dropped.
function traitBody(text){
  const raw = String(text||'').trim();
  if (raw.includes('\n')) {   // the sheet kept its own paragraphs and lists: use them
    const out = []; let li = [], tb = [];
    const endL = () => { if (li.length) out.push('<ul class="tl">'+li.map(x => '<li>'+lead(x)+'</li>').join('')+'</ul>'); li = []; };
    const endT = () => { if (tb.length) out.push('<div class="trtabw"><table class="trtab">'+tb.map((r, i) => '<tr>'+r.split(' ¦ ').map(c => i ? '<td>'+esc(c)+'</td>' : '<th>'+esc(c)+'</th>').join('')+'</tr>').join('')+'</table></div>'); tb = []; };
    raw.split('\n').map(x => x.trim()).filter(x => x && !/clicking on this feature|Deselect it to stop/i.test(x)).forEach(x => {
      if (x.includes(' ¦ ')) { endL(); tb.push(x); return; } endT();
      if (x.startsWith('•')) li.push(x.replace(/^•\s*/, '')); else { endL(); out.push(traitBody(x).replace(/^<div class="trbody">|<\/div>$/g, '')); } });
    endL(); endT(); return '<div class="trbody">'+out.join('')+'</div>';
  }
  const t = raw.replace(/\s+/g, ' ');
  const sents = t.split(/(?<=[.!?])\s+(?=[A-Z(])/).filter(x => !/clicking on this feature|Deselect it to stop|selecting Activate/i.test(x));
  if (t.length < 200) return '<div class="trbody"><p>'+lead(sents.join(' '))+'</p></div>';
  const out = []; let para = [], list = null;
  const flush = () => { if (para.length) out.push('<p>'+lead(para.join(' '))+'</p>'); para = []; };
  const endList = () => { if (list && list.length) out.push('<ul class="tl">'+list.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul>'); list = null; };
  sents.forEach(x => {
    const m = x.match(/^(.*\bfollowing[^:]*:)\s*(.+)$/);
    if (m) { endList(); para.push(m[1]); flush(); list = [m[2]]; return; }
    if (list) { if (/^(You can use this|You regain|Once you|This feature|Starting at|When you reach|At \d)/.test(x)) { endList(); } else { list.push(x); return; } }
    if (para.length >= 2 || para.join(' ').length > 170 || /^(Additionally|In addition|Also|Once you|Starting at|Beginning at|When you reach|You can use this|You regain)/.test(x)) flush();
    para.push(x);
  });
  endList(); flush();
  return '<div class="trbody">'+out.join('')+'</div>';
}
// Traits tab: filter card, then traits grouped by where they come from (species, each class with Battle Master
// maneuvers, feats and weapon masteries, background). Class texts fill in level-based numbers (fillTpl).
// Classes and subclasses the sheet has no special tracking for yet: their features still show (as text, below),
// but nothing counts their uses. One short note on the Traits tab says so. '' when everything is covered.
function supportNote(){
  const mods = typeof CLASS_MODULES === 'object' ? CLASS_MODULES : {};
  const plain = [];
  DATA.classes.forEach(k => { const m = mods[k.name];
    if (!m) plain.push(k.name);
    else if (k.sub && Array.isArray(m.subs) && !m.subs.some(x => k.sub.includes(x))) plain.push(k.sub.replace(/\s*\(.*\)/, '')+' ('+k.name+')'); });
  if (!plain.length) return '';
  const list = plain.length === 1 ? plain[0] : plain.slice(0, -1).join(', ')+' and '+plain[plain.length-1];
  return '<section class="card supnote"><p class="small" style="margin:0"><b>'+esc(list)+'</b> features show as text here; tracking for them is coming. Count their uses in D&amp;D Beyond for now.</p></section>';
}
function traitsPanel(){
  const sec = (emo, title, src, rows) => rows.length ? '<section class="card trsec" data-src="'+esc(src)+'"><h2><span class="emo" aria-hidden="true">'+emo+'</span>'+title+'</h2><div class="trlist">'+rows.join('')+'</div></section>' : '';
  const srcs = [['species', 'Species']].concat(DATA.classes.map(k => [k.name, k.name])).concat([['feats','Feats'],['background','Background']]);
  const cls = DATA.classes.map(k => sec(classEmo(k.name), 'Class: '+esc(k.name)+' '+k.level+(k.sub?' · '+esc(k.sub.replace(/\s*\(.*\)/,'')):''), k.name,
      k.features.map(f => traitRow(f.name, fillTpl(f.text, k.level), k.name, 'level '+f.level))
      .concat(k.name==='Fighter' && D.maneuvers.length ? [traitRow('Maneuvers', 'Save DC '+D.maneuverDC+' when a maneuver calls for one. One maneuver per attack. '+D.superiorityDice.max+' '+D.superiorityDice.die+' superiority dice. Known: '+D.maneuvers.map(m => m.name).join(', ')+'.', k.name)]
        .concat(D.maneuvers.map(m => traitRow(m.name, m.text, k.name, 'maneuver'))) : []))).join('');
  const f = ui.trF || [], so = ui.trS || [];
  const chips = (act, list, sel) => '<div class="spfilters">'+[['all','All']].concat(list).map(([k,t]) => { const on = k==='all' ? !sel.length : sel.includes(k); return '<button class="chip toggle'+(on?' on':'')+'" data-act="'+act+'" data-f="'+esc(k)+'" aria-pressed="'+on+'">'+t+'</button>'; }).join('')+'</div>';
  const finder = '<section class="card spfind trfind"><div class="cardhead"><h2><span class="emo" aria-hidden="true">🔎</span>Find a trait</h2><button class="btn small" data-act="trall">'+(ui.trOpen ? 'Fold all' : 'Open all')+'</button></div>'
    + '<input id="trq" class="qrsearch" type="search" placeholder="Search: flight, rest, advantage, Sneak…" autocomplete="off" value="'+esc(ui.trQ||'')+'">'
    + chips('trf', [['A','⚔️ Action'],['B','⚡ Bonus'],['R','🛡️ Reaction'],['P','🌀 Passive']], f)
    + chips('trs', srcs, so)
    + '<p class="small muted trnone" hidden>No trait matches. Clear a filter or the search.</p></section>';
  return supportNote() + finder
    + sec('🍀', 'Species: '+esc(DATA.race.name), 'species', DATA.race.traits.map(t => traitRow(t.name, t.text, 'species')))
    + cls
    + sec('🏅', 'Feats & masteries', 'feats', D.realFeats.map(x => traitRow(x.name, x.text, 'feats'))
        .concat(Object.keys(D.masteries||{}).length ? [traitRow('Weapon masteries', Object.entries(D.masteries).map(([w,m]) => w+' ('+m+')').join(', '), 'feats')] : []))
    + '<section class="card trsec" data-src="background"><h2><span class="emo" aria-hidden="true">🎖️</span>Background: '+esc(DATA.background?DATA.background.name:'—')+'</h2>'+(PACK.backgroundBlurb ? '<p class="muted" style="margin:0">'+PACK.backgroundBlurb()+'</p>' : '<p class="muted" style="margin:0">'+esc((DATA.background && DATA.background.text) || 'Skills, a tool and an Origin feat (listed under Feats).')+'</p>')+'</section>';
}
// show / hide traits for the search and chips (no repaint, so open traits stay open); a search of 3+ letters opens
// the traits it finds
function filterTraits(){
  const panel = document.querySelector('[data-panel="traits"]'); if (!panel) return;
  const q = (ui.trQ||'').trim().toLowerCase(), f = ui.trF || [], so = ui.trS || [];
  let any = false;
  panel.querySelectorAll('.trsec').forEach(secEl => {
    const srcOk = !so.length || so.includes(secEl.dataset.src);
    let n = 0;
    secEl.querySelectorAll('.tr').forEach(t => {
      const on = srcOk && (!f.length || f.some(k => t.dataset.k.includes(k))) && (!q || q.split(/\s+/).every(w => t.dataset.q.includes(w)));
      t.hidden = !on; if (on) n++;
      if (q.length >= 3 && on) t.open = true;
    });
    const plain = !secEl.querySelector('.tr');   // background card: no rows, shows only with no type filter and no search
    secEl.hidden = plain ? !(srcOk && !f.length && !q) : !n; if (!secEl.hidden) any = true;
  });
  const none = panel.querySelector('.trnone'); if (none) none.hidden = any;
}
// Traits filter: bind the search box (once per box, saved to ui.trQ as you type) and apply the filters
function bindTraits(){
  const inp = $('#trq'); if (inp && !inp._b) { inp._b = true; inp.addEventListener('input', () => { ui.trQ = inp.value; saveUi(); filterTraits(); }); }
  filterTraits();
}


