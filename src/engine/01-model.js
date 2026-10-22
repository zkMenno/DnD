/* ============================================================================
   §1  MODEL — D&D Beyond JSON → compact() → derive(). Rules constants first, then the two transforms.
   ============================================================================ */
const ABIL = ['str','dex','con','int','wis','cha'];
const ABIL_NAME = {str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'};
const ABIL_SLUG = {str:'strength',dex:'dexterity',con:'constitution',int:'intelligence',wis:'wisdom',cha:'charisma'};
const SKILLS = [
  ['Acrobatics','dex'],['Animal Handling','wis'],['Arcana','int'],['Athletics','str'],['Deception','cha'],
  ['History','int'],['Insight','wis'],['Intimidation','cha'],['Investigation','int'],['Medicine','wis'],
  ['Nature','int'],['Perception','wis'],['Performance','cha'],['Persuasion','cha'],['Religion','int'],
  ['Sleight of Hand','dex'],['Stealth','dex'],['Survival','wis']
];
const MASTERY_WORDS = ['Vex','Sap','Nick','Slow','Topple','Push','Cleave','Graze'];
// Campaign-only "feats" (DM handouts stored as feats in D&D Beyond) and custom tool ids come from the pack.
const CAMPAIGN_FEATS = PACK.campaignFeats || [];
const TOOL_IDS = PACK.toolNames || {};   // D&D Beyond stores custom tool proficiencies by item id only
const XP_TABLE = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];

// kebab-case id from a name (for D&D Beyond URLs and keys)
const slug = s => String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
// strip D&D Beyond HTML down to plain text
// like clean(), but keeps paragraph and list breaks (\n, and "• " for list items) and cuts at a sentence end
const richText = (s, max) => { let t = String(s||'').replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ' ¦ ').replace(/<caption[^>]*>/gi, '\n').replace(/<\/caption>/gi, '\n').replace(/<li[^>]*>/gi, '\n• ').replace(/<\/(p|li|h\d|div|tr)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&mdash;/g,'—').replace(/&ndash;/g,'–').replace(/&rsquo;/g,'’').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{2,}/g,'\n').trim();
  if (max && t.length > max) { const cut = t.slice(0, max), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n')); t = (end > max * .5 ? cut.slice(0, end + 1) : cut) + ' …'; }
  return t; };
// strip D&D Beyond HTML down to one line of plain text
const clean = s => String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&mdash;/g,'—').replace(/&ndash;/g,'–').replace(/\s+/g,' ').trim();

// D&D Beyond character JSON → the small DATA object stored in this page (only what the sheet uses)
function compact(full){
  const d = full.data || full;
  const coreIds = {};
  const classes = (d.classes||[]).map(c => {
    const core = (c.classFeatures||[]).find(f => /^Core .* Traits$/.test(f.definition.name));
    if (core) coreIds[c.definition.name] = core.definition.id;
    return {
      name: c.definition.name, level: c.level, starting: !!c.isStartingClass, cid: c.id,
      spellAbility: c.definition.spellCastingAbilityId || (c.subclassDefinition && c.subclassDefinition.spellCastingAbilityId) || null,
      hitDie: c.definition.hitDice, used: c.hitDiceUsed||0,
      sub: c.subclassDefinition ? c.subclassDefinition.name : null,
      coreId: core ? core.definition.id : null,
      features: (c.classFeatures||[]).map(f => f.definition)
        .filter(f => f.requiredLevel <= c.level && !/^Core .* Traits$/.test(f.name) && !/Subclass$/.test(f.name))
        .map(f => ({name:f.name, level:f.requiredLevel, text: richText(f.description || f.snippet, 1400)}))
    };
  });
  const mods = [];
  for (const [src, list] of Object.entries(d.modifiers||{})) for (const m of (list||[])) {
    mods.push({src, type:m.type, sub:m.subType, value:m.value, fixed:m.fixedValue, dice: m.dice ? m.dice.diceString : null, comp:m.componentId, statId:m.statId, label:m.friendlySubtypeName, pbBonus: (m.bonusTypes||[]).includes(1) || undefined});
  }
  const actions = [];
  for (const [src, list] of Object.entries(d.actions||{})) for (const a of (list||[])) {
    const lu = a.limitedUse;
    actions.push({src, name:a.name, max: lu ? lu.maxUses : null, used: lu ? lu.numberUsed : 0, reset: lu ? lu.resetType : null,
      act: a.activation ? a.activation.activationType : null,   // 1 action, 3 bonus action, 4 reaction, 2 no action, 8 special
      // D&D Beyond often stores uses as a formula (e.g. Bardic Inspiration = CHA mod) with maxUses 0
      statUses: lu && lu.statModifierUsesId || null, pbUses: !!(lu && lu.useProficiencyBonus), pbOp: lu ? lu.proficiencyBonusOperator : null,
      text: clean(a.snippet || a.description).slice(0,360)});
  }
  const inventory = (d.inventory||[]).map(i => {
    const x = i.definition;
    return {
      id:i.id, name:x.name, type:x.type, filter:x.filterType, sub:x.subType, qty:i.quantity, equipped:!!i.equipped,
      inPack: i.containerEntityId !== d.id, isContainer: !!x.isContainer, magic: !!x.magic, rarity:x.rarity,
      weight: x.weight, damage: x.damage ? x.damage.diceString : null, dmgType: x.damageType,
      props: (x.properties||[]).map(p => p.name + (p.notes ? ' ('+p.notes+')' : '')),
      range: x.range, longRange: x.longRange, attackType: x.attackType, category: x.categoryId,
      ac: x.armorClass, armorType: x.armorTypeId, stealthDis: x.stealthCheck === 2,
      base: x.type && x.filterType === 'Weapon' && x.type !== 'Ammunition' ? x.type : null,   // "Glaive" for "Glaive, +1": masteries and proficiency go by the base weapon
      bonus: (x.grantedModifiers||[]).filter(m => m.type==='bonus' && m.subType==='magic').reduce((a,m) => a+(m.value||0), 0),
      xdmg: (x.grantedModifiers||[]).filter(m => m.type==='damage' && m.dice).map(m => ({dice: m.dice.diceString, type: m.subType})),
      uses: i.limitedUse ? {max:i.limitedUse.maxUses, used:i.limitedUse.numberUsed} : null,
      text: clean(x.snippet || x.description).slice(0,260)
    };
  });
  const masteryOpts = ((d.options||{}).feat||[]).map(o => o.definition.name);
  const maneuvers = ((d.options||{}).class||[]).map(o => ({name:o.definition.name, text: clean(o.definition.description).slice(0,300)}));
  const race = d.race || {};
  // spells, kept compact for the Spells tab. D&D Beyond stores slots *used* only; the app works out the totals.
  const featCls = {};   // class-feature id → class name, to tell which class a feature-granted spell belongs to
  (d.classes||[]).forEach(c => (c.classFeatures||[]).forEach(f => { if (f.definition) featCls[f.definition.id] = c.definition.name; }));
  const dieStr = dd => dd && dd.diceString ? String(dd.diceString).replace(/\s+/g,'') : null;
  const ups = m => ((m.atHigherLevels||{}).higherLevelDefinitions||[]).filter(h => h.dice && h.dice.diceString).map(h => [h.level, dieStr(h.dice)]);
  const spellDef = (sp, from) => { const x = sp.definition || {}; const act = x.activation || {}, rng = sp.range || x.range || {}, dur = x.duration || {}, mods = x.modifiers || [];
    const hl = (x.atHigherLevels||{}).higherLevelDefinitions || [], lu = sp.limitedUse && sp.limitedUse.maxUses ? {max: sp.limitedUse.maxUses, used: sp.limitedUse.numberUsed||0, reset: sp.limitedUse.resetType} : null;
    const hm = mods.find(m => m.type==='bonus' && m.subType==='hit-points' && m.die && m.die.diceString);
    return { name:x.name, level:x.level||0, school:x.school, from, ab: sp.spellCastingAbilityId || null,
      prepared: !!(sp.prepared || sp.alwaysPrepared || (x.level||0) === 0), always: !!sp.alwaysPrepared, slot: !!sp.usesSpellSlot, lu,
      ritual: !!x.ritual, conc: !!x.concentration, castTime: act.activationTime ? act.activationTime+' '+(['','action','no action','bonus action','reaction','','minute','hour','special'][act.activationType]||'') : null,
      range: rng.rangeValue || null, origin: rng.origin || null, aoe: rng.aoeType ? [rng.aoeType, rng.aoeValue||0] : null,
      duration: dur.durationInterval ? dur.durationInterval+' '+(dur.durationUnit||'') : (dur.durationType||null),
      save: x.saveDcAbilityId || null, attack: x.attackType || null,   // attackType 1 melee, 2 ranged
      scale: x.scaleType || null,
      dmg: mods.filter(m => m.type==='damage' && m.die && m.die.diceString).map(m => ({dice: dieStr(m.die), type: m.subType, up: ups(m)})).slice(0,3),
      heal: hm ? {dice: dieStr(hm.die), mod: !!hm.usePrimaryStat, up: ups(hm)} : null,
      extra: hl.filter(h => h.typeId===16).map(h => [h.level, h.value||0, h.details||'']),   // extra beams / darts / rays
      higher: !!(x.higherLevelDescription || hl.length || mods.some(m => ups(m).length)),
      text: clean(x.description || x.snippet || '').slice(0,1200) }; };
  const clsName = id => ((d.classes||[]).find(c => c.id === id) || {definition:{}}).definition.name || null;
  // never let spell parsing break a sync: anything odd in the data just leaves the lists empty
  let spells = [], slotsUsed = [], pactUsed = [];
  try {
    const lists = (d.classSpells||[]).map(cs => { const list = (cs.spells||[]).filter(sp => sp && sp.definition).map(sp => spellDef(sp, clsName(cs.characterClassId)));
      // a class list where nothing is marked prepared is a "spells known" list (2024 Sorcerer, Bard, Warlock…): all of them are ready
      if (!list.some(x => x.level && x.prepared)) list.forEach(x => { x.prepared = true; });
      return list; });
    const granted = Object.entries(d.spells||{}).map(([src, list]) => (list||[]).filter(sp => sp && sp.definition).map(sp => Object.assign(spellDef(sp, src==='class' ? (featCls[sp.componentId] || 'class') : src), {granted: true, prepared: true})));
    // the same spell from two classes (Cure Wounds: Paladin and Ranger) is listed once; it remembers the other class, and casts with the better ability
    const seen = new Map();
    spells = [].concat(...lists, ...granted).filter(x => { if (!x.name) return false; const first = seen.get(x.name);
      if (first) { if (x.from && x.from !== first.from) (first.alsoFrom = first.alsoFrom || []).push(x.from); return false; } seen.set(x.name, x); return true; });
    slotsUsed = (d.spellSlots||[]).map(x => x.used||0); pactUsed = (d.pactMagic||[]).map(x => x.used||0);
  } catch(e) { console.warn('spells skipped', e); }
  return {
    v:DATA_V, syncedAt: new Date().toISOString(),
    id:d.id, name:d.name, url: d.readonlyUrl, avatar: d.decorations && d.decorations.avatarUrl,
    xp:d.currentXp||0, inspiration: !!d.inspiration, gender:d.gender, age:d.age, hair:d.hair,
    hp:{base:d.baseHitPoints, bonus:d.bonusHitPoints, override:d.overrideHitPoints, removed:d.removedHitPoints||0, temp:d.temporaryHitPoints||0},
    stats:(d.stats||[]).map(s=>s.value), bonusStats:(d.bonusStats||[]).map(s=>s.value), overrideStats:(d.overrideStats||[]).map(s=>s.value),
    race:{name: race.fullName, walk: race.weightSpeeds && race.weightSpeeds.normal ? race.weightSpeeds.normal.walk : 30,
      traits:(race.racialTraits||[]).map(t=>t.definition).filter(t=>!t.hideInSheet && !t.hideOnDetailsPage && t.displayConfiguration && t.displayConfiguration.RACIALTRAIT===1)
        .map(t=>({name:t.name, text:richText(t.description, 1000)}))},
    background: d.background && d.background.definition ? {name:d.background.definition.name, feat:d.background.definition.featureName} : null,
    classes, mods, actions, inventory, masteryOpts, maneuvers, spells, slotsUsed, pactUsed,
    feats:(d.feats||[]).map(f=>({name:f.definition.name, text:richText(f.definition.description || f.definition.snippet, 1000)})),
    currency: d.currencies || {},
    campaign: d.campaign ? d.campaign.name : null,
    conditions: (d.conditions||[]).map(c=>c.id),
    customTools: (d.characterValues||[]).filter(v=>v.typeId===34 && String(v.valueTypeId)==='2103445194').map(v=>({id:+v.valueId, level:v.value}))
  };
}

// DATA → D: every number the sheet shows (mods, skills, saves, attacks, resources), computed once
// the class / species modules this character uses: classes by name, others by their match()
function activeModules(c){
  const names = new Set(c.classes.map(k => k.name));
  return Object.entries(typeof CLASS_MODULES === 'object' ? CLASS_MODULES : {})
    .filter(([k, m]) => m.match ? m.match(c) : names.has(k)).map(([, m]) => m);
}
// DATA → D: every number the sheet shows (scores, saves, skills, AC, speed, weapons, class module numbers). Pure; re-run when the inventory changes.
function derive(c){
  const sgn = n => (n>=0?'+':'') + n;
  const totalLevel = c.classes.reduce((a,k)=>a+k.level,0);
  const pb = 2 + Math.floor((totalLevel-1)/4);
  const lvl = name => (c.classes.find(k=>k.name===name)||{level:0}).level;
  // multiclass: proficiencies from a non-starting class's core traits only grant weapons + light/medium armor + shields
  const nonStartCore = new Set(c.classes.filter(k=>!k.starting && k.coreId).map(k=>k.coreId));
  const mods = c.mods.filter(m => !(nonStartCore.has(m.comp) && m.type==='proficiency' && /saving-throws$|^choose-|heavy-armor/.test(m.sub)));
  const has = (type, sub) => mods.some(m => m.type===type && m.sub===sub);
  const bonusSum = sub => mods.filter(m=>m.type==='bonus' && m.sub===sub && !m.dice).reduce((a,m)=>a+(m.fixed!=null?m.fixed:(m.value||0)),0);

  const score = {}, mod = {};
  ABIL.forEach((a,i) => {
    const ov = c.overrideStats[i];
    score[a] = ov ? +ov || 10 : (+c.stats[i]||10) + (c.bonusStats[i]||0) + bonusSum(ABIL_SLUG[a]+'-score');
    mod[a] = Math.floor((score[a]-10)/2);
  });
  const statById = id => mod[ABIL[id-1]] || 0;

  const saveAll = bonusSum('saving-throws');   // Ring / Cloak of Protection and the like
  const saves = ABIL.map(a => { const p = has('proficiency', ABIL_SLUG[a]+'-saving-throws'); return {a, name:ABIL_NAME[a], prof:p, bonus: mod[a] + (p?pb:0) + saveAll + bonusSum(ABIL_SLUG[a]+'-saving-throws')}; });
  const saveNotes = mods.filter(m=>m.type==='advantage' && m.sub==='saving-throws').length ? ['Advantage on saves vs Frightened (Brave)'] : [];

  const skills = SKILLS.map(([name,a]) => {
    const s = slug(name); const exp = has('expertise', s); const prof = exp || has('proficiency', s);
    return {name, a, prof, exp, bonus: mod[a] + (exp ? 2*pb : prof ? pb : 0)};
  });
  const sk = n => skills.find(s=>s.name===n).bonus;

  const conLevelHp = mod.con * totalLevel;
  const hpMax = (+c.hp.override || 0) || (+c.hp.base + conLevelHp + (c.hp.bonus||0) + bonusSum('hit-points-per-level')*totalLevel);
  const hpCur = Math.max(0, hpMax - (+c.hp.removed || 0));

  // armour
  const eq = c.inventory.filter(i=>i.equipped);
  const armor = eq.find(i=>i.armorType && i.armorType<=3);
  const shield = eq.find(i=>i.armorType===4);
  let ac = 10 + mod.dex;
  if (armor) ac = (armor.bonus||0) + (armor.armorType===1 ? armor.ac + mod.dex : armor.armorType===2 ? armor.ac + Math.min(mod.dex,2) : armor.ac);
  else {   // Unarmored Defense / Draconic Resilience: 10 + DEX + another ability, whichever set is best
    const ua = mods.filter(m => m.type==='set' && m.sub==='unarmored-armor-class' && m.statId).map(m => 10 + mod.dex + statById(m.statId));
    if (ua.length) ac = Math.max(ac, ...ua);
  }
  if (shield) ac += (shield.ac || 2) + (shield.bonus||0);
  ac += bonusSum('armor-class');

  const initMods = mods.filter(m=>m.type==='bonus' && m.sub==='initiative');
  const initiative = mod.dex + initMods.reduce((a,m)=>a + (m.statId ? statById(m.statId) : m.pbBonus ? pb : (m.fixed||m.value||0)),0);
  const initNote = [initMods.some(m=>m.statId===6) && 'Rakish Audacity adds your CHA ('+sgn(mod.cha)+')',
    initMods.some(m=>m.pbBonus) && (c.feats.some(f=>f.name==='Alert') ? 'Alert' : 'A feature')+' adds your proficiency bonus ('+sgn(pb)+')'].filter(Boolean).join(' · ');
  const speedFt = (c.race.walk||30) + bonusSum('speed') + (!armor && !shield ? bonusSum('unarmored-movement') : 0);
  const ftToM = ft => Math.round(ft/5*1.5*10)/10;

  // weapons
  const masteries = {};
  c.masteryOpts.forEach(n => { const m = n.match(/^(.+) \((\w+)\)$/); if (m && MASTERY_WORDS.includes(m[2])) masteries[m[1]] = m[2]; });
  const archery = mods.filter(m=>m.type==='bonus' && m.sub==='ranged-weapon-attacks').reduce((a,m)=>a+(m.value||0),0);
  const profWith = w => (w.category===1 && has('proficiency','simple-weapons')) || (w.category===2 && has('proficiency','martial-weapons')) || has('proficiency', slug(w.base || w.name));
  // Monk Martial Arts: unarmed strikes and Monk weapons (simple melee, martial melee with Light) may use DEX and the Martial Arts die
  const monk = lvl('Monk'), maDie = monk ? (monk >= 17 ? 12 : monk >= 11 ? 10 : monk >= 5 ? 8 : 6) : 0;
  const monkWeapon = w => monk && w.attackType !== 2 && (w.category === 1 || (w.category === 2 && w.props.includes('Light'))) && !w.props.some(p => /^(Heavy|Two-Handed)/.test(p));
  const seen = new Set(); const weapons = [];
  c.inventory.filter(i=>i.damage && i.filter==='Weapon').sort((a,b)=>(b.equipped-a.equipped)).forEach(w => {
    if (seen.has(w.name)) return; seen.add(w.name);
    const ranged = w.attackType===2; const finesse = w.props.some(p=>p.startsWith('Finesse'));
    const mw = monkWeapon(w);
    const a = ranged ? 'dex' : finesse ? (mod.dex>=mod.str?'dex':'str') : mw ? (mod.dex>mod.str?'dex':'str') : 'str';   // a tie goes to STR for Monk weapons (Rage counts)
    const mb = w.bonus||0;   // magic +1/+2/+3 (D&D Beyond, or added in this app)
    const wd = String(w.damage||'').match(/^(\d+)d(\d+)$/), dice = mw && wd && +wd[1] === 1 && maDie > +wd[2] ? '1d'+maDie : w.damage;
    const hit = mod[a] + (profWith(w)?pb:0) + (ranged?archery:0) + mb;
    const thrown = w.props.some(p=>p.startsWith('Thrown'));
    const vers = (w.props.find(p=>p.startsWith('Versatile'))||'').match(/\((.+)\)/);
    weapons.push({
      name:w.name, ranged, finesse, light: w.props.some(p=>p==='Light'), a, hit, dice, monkWeapon: mw, dmgMod: mod[a] + mb, dmgType:w.dmgType, added: !!w.added,
      versatile: vers ? vers[1] : null, equipped: w.equipped,
      range: ranged ? ftToM(w.range)+'/'+ftToM(w.longRange)+' m' : (thrown ? '1.5 m · throw '+ftToM(w.range)+'/'+ftToM(w.longRange)+' m' : w.props.includes('Reach') ? '3 m (reach)' : '1.5 m'),
      thrownHit: thrown ? mod[a] + (profWith(w)?pb:0) + mb : null,
      mastery: masteries[w.base || w.name] || masteries[w.name] || null, base: w.base || w.name, xdmg: w.xdmg || [], twoHanded: w.props.some(p => /^Two-Handed/.test(p)),
      ammoKind: ranged && w.props.some(p => /^Ammunition/.test(p)) ? (/crossbow/i.test(w.base||w.name) ? 'Bolt' : /sling/i.test(w.base||w.name) ? 'Bullet' : /blowgun/i.test(w.base||w.name) ? 'Needle' : 'Arrow') : null,
      masteryOnItem: (w.props.find(p=>MASTERY_WORDS.includes(p))||null),
      props: w.props.filter(p=>!MASTERY_WORDS.includes(p) && !/^Range|^Ammunition/.test(p))
    });
  });
  weapons.sort((x,y)=> (y.ranged - x.ranged) || (y.equipped - x.equipped));
  let unarmed = {name:'Unarmed Strike', hit: mod.str+pb, flat: 1+mod.str};
  if (monk) {   // Martial Arts: a real attack with a die, STR or DEX
    const a = mod.dex > mod.str ? 'dex' : 'str';
    weapons.push({ name:'Unarmed Strike', ranged:false, finesse:true, light:false, a, hit: mod[a]+pb, dice:'1d'+maDie, dmgMod: mod[a], dmgType:'Bludgeoning', equipped:true,
      versatile:null, range:'1.5 m', thrownHit:null, mastery:null, base:'Unarmed Strike', xdmg:[], twoHanded:false, masteryOnItem:null, props:['Martial Arts'], unarmed:true, monkWeapon:true });
    unarmed = null;
  }

  // class / species modules (#classes) add their own numbers; core defaults first
  const act = n => c.actions.find(a=>a.name===n);
  const modular = { rogue:0, fighter:0, sneakDice:0, attacksPerAction:1, secondWind:null, actionSurge:null, superiorityDice:null,
    maneuvers:[], maneuverDC:0, luck:false };
  const x = { c, lvl, act, mod, pb, sgn };
  activeModules(c).forEach(m => { if (!m.derive) return; const o = m.derive(x) || {};
    Object.entries(o).forEach(([k,v]) => { modular[k] = k==='attacksPerAction' ? Math.max(modular[k]||1, v||1) : v; }); });
  const feats = c.feats.map(f=>f.name);
  const savage = feats.includes('Savage Attacker');
  const ammo = c.inventory.filter(i=>/^Arrows?$/.test(i.name)).reduce((a,i)=>a+i.qty,0);

  const nextXp = XP_TABLE[totalLevel] || null;
  const line = c.classes.map(k => k.name+' '+k.level+(k.sub?' ('+k.sub.replace(/\s*\(.*\)/,'')+')':'')).join(' / ');

  const profs = {
    armor: ['light','medium','heavy'].filter(t=>has('proficiency',t+'-armor')).map(t=>t[0].toUpperCase()+t.slice(1)).concat(has('proficiency','shields')?['Shields']:[]),
    weapons: (has('proficiency','simple-weapons')?['Simple']:[]).concat(has('proficiency','martial-weapons')?['Martial']:[]),
    tools: [...new Set(mods.filter(m=>m.type==='proficiency' && !/^choose-/.test(m.sub) && /tools|set|kit|supplies/.test(m.sub)).map(m=>m.label)
      .concat((c.customTools||[]).filter(t=>t.level>=3).map(t=>TOOL_IDS[t.id]||('Tool #'+t.id))))],
    langs: [...new Set(mods.filter(m=>m.type==='language').map(m=>m.label))]
  };

  return { c, sgn, totalLevel, pb, score, mod, saves, saveNotes, skills, sk, hpMax, hpCur, ac, armor, shield, initiative, initNote,
    speedFt, speedM: ftToM(speedFt), weapons, unarmed, masteries, archery, ...modular,
    savage, ammo, nextXp, line, profs, feats,
    passive: {perception: 10+sk('Perception'), investigation: 10+sk('Investigation'), insight: 10+sk('Insight')},
    hitDice: c.classes.map(k=>({die:'d'+k.hitDie, total:k.level, used:k.used, cls:k.name})),
    campaignFeats: c.feats.filter(f=>CAMPAIGN_FEATS.includes(f.name)),
    realFeats: c.feats.filter(f=>!CAMPAIGN_FEATS.includes(f.name) && !/Ability Score Improvements$/.test(f.name))
  };
}


