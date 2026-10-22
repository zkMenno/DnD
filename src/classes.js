
/* ============================================================================
   CLASS MODULES — the rules of one class, subclass or species, as plug-ins the engine reads.
   A character loads every module whose key matches one of its classes (by name) or whose match(DATA) is true
   (species and the like). Modules run lazily (inside derive and at render time), like PACK, so they may use
   engine globals: D, S, sgn, esc, optRow, ob, hasBoost, sdLeft…  Never touch those at the top level.

   A module may define:
     match(DATA)   → true when it applies (default: a class with the module's name)
     derive(x)     → numbers merged into D. x = {c, lvl(name), act(name), mod, pb, sgn}.
                     attacksPerAction is merged with Math.max; everything else by assignment.
     resources(D)  → [{ key, name, max, used,           key = short id in the play state S (not a core key)
                        die?, chip?, desc,               shown in Action Resources
                        short: 'all' | n | 0,            given back on a short rest (long rest gives all back)
                        unit: [one, many],               "1 Second Wind" / "all Second Wind uses"
                        label?, emoji?,                  short name + icon on the restore sheet
                        terms: [glossary terms],         their bubbles show this tracker
                        button?: {act, label, use},      a quick-use button (panel label / bubble label)
                        pool?: true,                     a pool of points (Lay on Hands): −5 / −1 / +1 instead of pips
                        toggle?: {on, off, onChip, onDesc, noSpells?, start?},   an on/off state (Rage): on spends a use
                        buttons?: [{label, n, title, note | attacks:{w, n} | heal | activate}],   spend buttons (Focus)
                        ddb: 'Actions → …' }]            where to tick it in D&D Beyond
     checkRows(k)  → [html] extra option rows on a check or save sheet (k = the open check)
     riders(w, c)    → extra damage on a hit (see §8 Riders in 08-roll-flow): Sneak Attack, Rage, Divine Smite…
     hitRiders(w, c) → the same for the attack roll: Precision Attack, Sacred Weapon
     actives(D)      → [{ key, chip, desc, off }] on/off states switched on by a resource button (activate: key)
     advNote(w)      → a reason this weapon attack can have advantage, shown on the attack setup (Reckless Attack)
     longRestNote  → string, a reminder on the long-rest drawer
   ============================================================================ */
const CLASS_MODULES = {
  Fighter: {
    derive: x => {
      const f = x.lvl('Fighter'), sw = x.act('Second Wind'), surge = x.act('Action Surge'), sup = x.act('Superiority Dice');
      return { fighter: f, attacksPerAction: f >= 5 ? 2 : 1,
        secondWind: sw ? {max: sw.max, used: sw.used, heal: '1d10'+x.sgn(f)} : null,
        actionSurge: surge ? {max: surge.max, used: surge.used} : null,
        superiorityDice: sup ? {max: sup.max, used: sup.used, die: f >= 18 ? 'd12' : f >= 10 ? 'd10' : 'd8'} : null,
        maneuvers: x.c.maneuvers || [], maneuverDC: 8 + x.pb + Math.max(x.mod.str, x.mod.dex) };
    },
    resources: D => [
      D.secondWind && { key:'sw', name:'Second Wind', emoji:'💨', max:D.secondWind.max, used:D.secondWind.used, chip:'👤 self only',
        desc:'Bonus action, heal yourself '+D.secondWind.heal+'. Tactical Mind: spend a use to add 1d10 to a failed ability check (kept if it still fails).',
        short:1, unit:['Second Wind','Second Wind uses'], terms:['Second Wind','Tactical Mind'],
        button:{act:'secondwind', label:'❤️‍🩹 Heal', use:'💨 Use'}, ddb:'Actions → Second Wind' },
      D.actionSurge && { key:'as', name:'Action Surge', emoji:'⚡', max:D.actionSurge.max, used:D.actionSurge.used, chip:'👤 self only',
        desc:'One extra action for you. Back on a short rest.', short:'all', unit:['Action Surge','Action Surges'], terms:['Action Surge'],
        ddb:'Actions → Action Surge' },
      D.superiorityDice && { key:'sd', name:'Superiority Dice', label:'Superiority', emoji:'⚔️', max:D.superiorityDice.max, used:D.superiorityDice.used,
        die:D.superiorityDice.die, desc:'Fuel for maneuvers — Precision Attack, Menacing Attack, Commanding Presence. Back on a short or long rest.',
        short:'all', unit:['Superiority Die','Superiority Dice'],
        terms:['Superiority Dice','Battle Master','Combat Superiority','Precision Attack','Menacing Attack','Commanding Presence'],
        ddb:'Actions → Superiority Dice' }
    ],
    // Commanding Presence (Battle Master) on social checks, Tactical Mind on any failed ability check
    checkRows: k => {
      const sd = sdLeft(), isSave = / save$/.test(k.label), rows = [];
      if (D.superiorityDice && /^(Intimidation|Performance|Persuasion)$/.test(k.label))
        rows.push(optRow(sd ? 'Superiority · '+sd+' '+D.superiorityDice.die+' left' : '', [sd && !k.cmd && [ob('maneuver','🗣️ Commanding Presence',' data-man="commanding"'), 'Add a '+D.superiorityDice.die+' to this check.']]));
      if (!isSave && D.secondWind && S.sw < D.secondWind.max)
        rows.push(optRow('Fighter', [!hasBoost(k,'tactical') && [ob('boost','🧠 Tactical Mind',' data-k="tactical" data-s="10"'), 'Failed? Spend a Second Wind use to add a d10 ('+(D.secondWind.max-S.sw)+' left).']]));
      return rows;
    },
    // Precision Attack (Battle Master): a superiority die on the attack roll, after you see it. One maneuver per attack.
    hitRiders: (w, c) => {
      if (!D.superiorityDice || w.spell || (c.dmg && c.dmg.rid.menacing)) return [];
      const die = D.superiorityDice.die;
      return [{ key:'precision', label:'Precision Attack', short:'Precision', emoji:'🎯', dice:'1'+die, cost:{ key:'sd', n:1 }, fx:'precision',
        note:'Missed by a little? Spend a superiority die and add a '+die+' to this roll.' }];
    },
    // Menacing Attack (Battle Master): a superiority die on damage
    riders: (w, c) => {
      if (!D.superiorityDice || w.spell || (c.hrid && c.hrid.precision)) return [];
      const die = D.superiorityDice.die;
      return [{ key:'menacing', label:'Menacing Attack', short:'Menacing', emoji:'👹', dice:'1'+die, cost:{ key:'sd', n:1 }, fx:'menacing', after:'DC '+D.maneuverDC+' WIS save or Frightened',
        note:'Spend a superiority die: add a '+die+' to damage. The target makes a <b>DC '+D.maneuverDC+' WIS save</b> or is Frightened until the end of your next turn.' }];
    },
    longRestNote: 'you can swap one Fighter weapon mastery'
  },
  Rogue: {
    derive: x => { const r = x.lvl('Rogue'); return { rogue: r, sneakDice: Math.ceil(r/2) }; },
    // Steady Aim (Rogue 3): bonus action, advantage on your next attack if you haven't moved this turn
    advNote: w => !w.spell && D.rogue >= 3 ? 'Steady Aim (bonus action, don’t move this turn)' : '',
    // Sneak Attack: finesse or ranged, never with disadvantage, once per turn (combos turn it off on later shots)
    riders: (w, c) => {
      if (!saOK(w) || c.o.sneak === false || (c.t && c.mode === 'dis')) return [];
      return [{ key:'sneak', pri:-1, label:'Sneak Attack', emoji:'🗡️', dice: D.sneakDice+'d6', once:'turn',
        note: c.mode === 'adv' && c.t ? '✓ You had advantage, so it counts.' : 'Only with advantage, an ally within 1.5 m of the target, or one-on-one in melee.' }];
    }
  },
  // ---- Martial classes (built around AppTester-02: Barbarian / Paladin / Monk / Ranger) ----
  Barbarian: {
    derive: x => { const b = x.lvl('Barbarian'), r = x.act('Rage (Enter)') || x.act('Rage'), k = x.c.classes.find(c => c.name === 'Barbarian');
      return { barbarian: b, attacksPerAction: b >= 5 ? 2 : 1, rageDmg: b >= 16 ? 4 : b >= 9 ? 3 : 2, berserker: /Berserker/.test(k && k.sub || ''),
        rage: { max: (r && r.max) || (b >= 17 ? 6 : b >= 12 ? 5 : b >= 6 ? 4 : b >= 3 ? 3 : 2), used: r ? r.used : 0 } }; },
    resources: D => [{ key:'rage', name:'Rage', emoji:'🔥', max:D.rage.max, used:D.rage.used, short:1, unit:['Rage','Rages'], terms:['Rage','Rage (Enter)'], ddb:'Actions → Rage (Enter)',
      desc:'Bonus action, lasts 10 minutes. +'+D.rageDmg+' damage on Strength attacks, advantage on Strength checks and saves, resistance to bludgeoning, piercing and slashing. One use back on a short rest.',
      toggle:{ on:'🔥 Rage', off:'End rage', onChip:'🔥 Raging',
        onDesc:'<b>+'+D.rageDmg+' damage</b> on Strength attacks (added for you). <b>Advantage</b> on Strength checks and saves. <b>Resistance</b> to bludgeoning, piercing and slashing. <b>No spells, no concentration.</b> Ends early if you don’t attack, take damage or keep it going with a bonus action each turn.'+(D.berserker ? ' <b>Frenzy:</b> attack recklessly and your first hit each turn adds '+D.rageDmg+'d6.' : ''),
        noSpells:'You can’t cast spells while raging.',
        start: () => { if (!S.conc) return ''; const c = S.conc; S.conc = null; return 'Your concentration on '+esc(c)+' ends.'; } } }],
    riders: (w, c) => {
      if (!S.active.rage || w.spell || w.a !== 'str') return [];
      return [{ key:'rage', label:'Rage', emoji:'🔥', flat:D.rageDmg, auto:true, note:'+'+D.rageDmg+' on Strength attacks while raging.' },
        D.berserker && c.mode === 'adv' && { key:'frenzy', label:'Frenzy', emoji:'😤', dice:D.rageDmg+'d6', type:w.dmgType, once:'turn', note:'You attacked recklessly while raging: the first target you hit this turn takes '+D.rageDmg+'d6 more.' }];
    },
    checkRows: k => S.active.rage && /^(Strength|Athletics)/.test(k.label) ? [optRow('🔥 Raging', [['', 'Advantage on Strength checks and saves: roll with advantage.']])] : [],
    // Reckless Attack: the attack setup's Advantage choice says so for Strength attacks
    advNote: w => !w.spell && w.a === 'str' ? 'Reckless Attack (enemies get advantage on you until your next turn)' : '',
    longRestNote: 'all Rages come back'
  },
  Monk: {
    derive: x => { const m = x.lvl('Monk'), f = x.act('Focus Points'), wb = x.act('Wholeness of Body'), um = x.act('Uncanny Metabolism');
      return { monk: m, attacksPerAction: m >= 5 ? 2 : 1, focusDC: 8 + x.pb + x.mod.wis, openHand: x.c.classes.some(c => c.name === 'Monk' && /Open Hand/.test(c.sub || '')),
        maDie: 'd'+(m >= 17 ? 12 : m >= 11 ? 10 : m >= 5 ? 8 : 6),
        focus: { max: (f && f.max) || m, used: f ? f.used : 0 },
        wholeness: wb && wb.max ? { max: wb.max, used: wb.used } : (wb ? { max: Math.max(1, x.mod.wis), used: wb.used } : null),
        metabolism: um ? { max: um.max || 1, used: um.used } : null }; },
    resources: D => [{ key:'focus', name:'Focus Points', emoji:'☯️', max:D.focus.max, used:D.focus.used, short:'all', unit:['Focus Point','Focus Points'], ddb:'Actions → Focus Points',
      terms:['Focus Points','Monk’s Focus','Flurry of Blows','Patient Defense','Step of the Wind','Stunning Strike'],
      desc:'Fuel for Monk techniques (bonus actions). Stunning Strike costs 1 on a hit. All back on a short rest.',
      buttons:[
        { label:'👊 Flurry', n:1, title:'Flurry of Blows', tip:'Bonus action: '+(D.monk >= 10 ? 'three' : 'two')+' unarmed strikes', attacks:{ w:'Unarmed Strike', n: D.monk >= 10 ? 3 : 2 } },
        { label:'🛡️ Patient', n:1, title:'Patient Defense', note:'Bonus action: Disengage <b>and</b> Dodge until the start of your next turn. (Free version, no Focus: Disengage only.)' },
        { label:'💨 Step', n:1, title:'Step of the Wind', note:'Bonus action: Disengage <b>and</b> Dash, and your jump distance doubles this turn. (Free version, no Focus: Dash only.)' } ] },
      D.wholeness && { key:'wholeness', name:'Wholeness of Body', emoji:'💚', max:D.wholeness.max, used:D.wholeness.used, short:0, unit:['use','uses'], terms:['Wholeness of Body'], ddb:'Actions → Wholeness of Body',
        desc:'Bonus action: heal yourself 1'+D.maDie+(D.mod.wis > 0 ? D.sgn(D.mod.wis) : '')+'. Back on a long rest.',
        buttons:[{ label:'💚 Heal', n:1, title:'Wholeness of Body', healRoll:'1'+D.maDie+(D.mod.wis > 0 ? D.sgn(D.mod.wis) : '') }] },
      D.metabolism && { key:'metabolism', name:'Uncanny Metabolism', emoji:'🍃', max:D.metabolism.max, used:D.metabolism.used, short:0, unit:['use','uses'], terms:['Uncanny Metabolism'], ddb:'Actions → Uncanny Metabolism',
        desc:'When you roll Initiative: all Focus Points back, and heal 1'+D.maDie+D.sgn(D.monk)+'. Once per long rest.',
        buttons:[{ label:'🍃 Use', n:1, title:'Uncanny Metabolism', restore:'focus', healRoll:'1'+D.maDie+D.sgn(D.monk), note:'All your Focus Points are back.' }] }],
    riders: (w, c) => {
      if (w.spell || w.ranged || !w.monkWeapon) return [];
      return [D.monk >= 5 && { key:'stun', label:'Stunning Strike', emoji:'⚡', cost:{ key:'focus', n:1 }, once:'turn', after:'DC '+D.focusDC+' Constitution save',
          note:'Target makes a <b>DC '+D.focusDC+' CON save</b> or is Stunned until the start of your next turn. On a success: speed halved, and the next attack against it has advantage.' },
        D.openHand && c.o.label === 'Flurry of Blows' && { key:'openhand', label:'Open Hand Technique', emoji:'🖐️', once:'hit', after:'push, topple or no reactions',
          note:'Pick one: <b>Addle</b> (no reactions until its next turn), <b>Push</b> (STR save DC '+D.focusDC+' or pushed 4.5 m), or <b>Topple</b> (DEX save DC '+D.focusDC+' or Prone).' }];
    }
  },
  Paladin: {
    derive: x => { const p = x.lvl('Paladin'), l = x.act('Lay On Hands: Healing Pool') || x.act('Lay on Hands'), cd = x.act('Channel Divinity');
      return { paladin: p, attacksPerAction: p >= 5 ? 2 : 1, loh: { max: (l && l.max) || 5*p, used: l ? l.used : 0 },
        channel: cd ? { max: cd.max, used: cd.used } : null, sacredBonus: Math.max(1, x.mod.cha),
        devotion: x.c.classes.some(c => c.name === 'Paladin' && /Devotion/.test(c.sub || '')) }; },
    resources: D => [{ key:'loh', name:'Lay on Hands', emoji:'🙌', pool:true, max:D.loh.max, used:D.loh.used, short:0, unit:['point','points'], ddb:'Actions → Lay On Hands: Healing Pool',
      terms:['Lay on Hands','Lay On Hands','Lay On Hands: Healing Pool','Lay On Hands: Heal'],
      desc:'Bonus action: touch a creature and restore Hit Points from this pool. 5 points also end the Poisoned condition. Refills on a long rest.',
      buttons:[{ label:'🙌 Heal me 5', n:5, title:'Lay on Hands', heal:5, note:'You restore 5 Hit Points to yourself.' }] },
      D.channel && D.channel.max && { key:'cd', name:'Channel Divinity', emoji:'✨', max:D.channel.max, used:D.channel.used, short:1, unit:['use','uses'],
        terms:['Channel Divinity','Sacred Weapon','Divine Sense'], ddb:'Actions → Channel Divinity',
        desc:'One use back on a short rest, all on a long rest.'+(D.devotion ? ' Sacred Weapon: +'+D.sacredBonus+' to hit with a melee weapon for 10 minutes.' : ''),
        buttons:[D.devotion && { label:'⚔️ Sacred Weapon', n:1, title:'Sacred Weapon', activate:'sacred',
            note:'As part of the Attack action: your melee weapon shines (bright light 6 m) and you add <b>+'+D.sacredBonus+'</b> to its attack rolls for 10 minutes. Its damage can be radiant. The sheet adds it for you.' },
          { label:'👁️ Divine Sense', n:1, title:'Divine Sense', note:'Bonus action: for 10 minutes you know the location of any Celestial, Fiend or Undead within 18 m, and of any consecrated or desecrated place.' }].filter(Boolean) }],
    // on/off states this class can have (shown as a strip on the Combat tab while on)
    actives: D => [D.devotion && { key:'sacred', chip:'⚔️ Sacred Weapon', off:'End', desc:'<b>+'+D.sacredBonus+'</b> to hit with your melee weapon (added for you). 10 minutes; ends if you drop the weapon.' }],
    hitRiders: (w, c) => S.active.sacred && !w.spell && !w.ranged ? [{ key:'sacred', label:'Sacred Weapon', emoji:'⚔️', flat:D.sacredBonus, auto:true, note:'+'+D.sacredBonus+' (your CHA) while your weapon shines.' }] : [],
    riders: (w, c) => {
      if (w.spell || w.ranged || !(DATA.spells||[]).some(s => s.name === 'Divine Smite')) return [];
      return RES.filter(r => r.spell && !r.freeOf && r.key !== 'pact' && r.max - S[r.key] > 0).map(r => ({ key:'smite'+r.slotLevel, group:'smite', once:'turn',
        label:'Divine Smite (lvl '+r.slotLevel+')', short:'Smite lvl '+r.slotLevel, emoji:'✨', dice:(1 + r.slotLevel)+'d8', type:'Radiant', cost:{ key:r.key, n:1 },
        note:'Bonus action, right after the hit: spend a level '+r.slotLevel+' slot. +1d8 more against Fiends and Undead.' }));
    },
    longRestNote: 'Lay on Hands refills'
  },
  Ranger: {
    derive: x => { const r = x.lvl('Ranger'), hm = x.act('Hunter’s Mark') || x.act("Hunter's Mark");
      return { ranger: r, attacksPerAction: r >= 5 ? 2 : 1, colossus: !!x.act('Colossus Slayer'), hmFree: hm ? { max: hm.max, used: hm.used } : null }; },
    resources: D => { const sp = (DATA.spells||[]).find(s => /^Hunter.s Mark$/.test(s.name));
      return [D.hmFree && D.hmFree.max && { key:'hmfree', name:'Hunter’s Mark (free casts)', emoji:'🎯', spell:true, freeOf: sp ? sp.name : 'Hunter’s Mark', max:D.hmFree.max, used:D.hmFree.used,
        short:0, unit:['free cast','free casts'], terms:['Hunter’s Mark',"Hunter's Mark"], ddb:'Actions → Hunter’s Mark' }]; },
    riders: (w, c) => {
      if (w.spell) return [];
      const marked = /^Hunter.s Mark$/.test(S.conc || '');
      return [{ key:'hm', label:'Hunter’s Mark', emoji:'🎯', dice:'1d6', type:'Force', auto: marked, note: marked ? 'Added: you’re concentrating on Hunter’s Mark. Only against the marked creature.' : 'Only against a creature you’ve marked (cast it as a bonus action first).' },
        D.colossus && { key:'colossus', label:'Colossus Slayer', emoji:'🗿', dice:'1d8', type:w.dmgType, once:'turn', note:'If the target is already missing any of its Hit Points.' }];
    }
  },
  Goliath: {
    match: d => /goliath/i.test(d.race && d.race.name || ''),
    derive: x => { const l = x.act('Activate Large Form'); return { largeForm: l ? { max: l.max || 1, used: l.used } : null }; },
    resources: D => [D.largeForm && { key:'large', name:'Large Form', emoji:'⛰️', max:D.largeForm.max, used:D.largeForm.used, short:0, unit:['Large Form','Large Form uses'],
      terms:['Large Form','Activate Large Form'], ddb:'Actions → Activate Large Form',
      desc:'Bonus action: become Large for 10 minutes. Advantage on Strength checks, +3 m speed. Once per long rest.',
      toggle:{ on:'⛰️ Grow', off:'Shrink back', onChip:'⛰️ Large Form', onDesc:'You’re <b>Large</b> for 10 minutes: <b>advantage on Strength checks</b> and <b>+3 m speed</b>.' } }],
    checkRows: k => S.active.large && / check$|^Athletics/.test(k.label) && /^(Strength|Athletics)/.test(k.label) ? [optRow('⛰️ Large Form', [['', 'Advantage on Strength checks: roll with advantage.']])] : []
  },
  Halfling: {
    match: d => /halfling/i.test(d.race && d.race.name || '') || ((d.race && d.race.traits) || []).some(t => t.name === 'Luck'),
    derive: () => ({ luck: true })
  }
};
