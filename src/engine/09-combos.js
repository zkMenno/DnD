/* ============================================================================
   §9  COMBOS — multi-attack recipes from PACK.combos(); each "🎲 Roll" queues the attacks through the roll flow
   ============================================================================ */
// The weapon a combo step uses when it doesn't name one (the pack's signature weapon, else the first equipped).
const SIG_W = (PACK.signatureWeapon && PACK.signatureWeapon()) || D.weapons.find(w=>w.equipped) || D.weapons[0];
// is this the pack's signature weapon?
// the pack's combo list (empty without one)
const combos = () => PACK.combos ? PACK.combos() : autoCombos();
// Automatic combos for characters without hand-written ones, built from simple rules over the sheet:
// a rider spell (Hex) + an attack cantrip, Quickened Spell + a cantrip, a bonus-action spell + a cantrip,
// Breath Weapon + a bonus-action escape, Extra Attack. They appear and disappear as the pieces do.
let AUTO_COMBOS = null;
// Automatic combos (see above); memoised for the page
function autoCombos(){
  if (AUTO_COMBOS) return AUTO_COMBOS;
  const out = [];
  try {
    const sp = (DATA.spells||[]).filter(x => x.prepared || x.always || !x.level);
    const castBtn = n => '<button class="btn small primary rollbtn" data-act="cast" data-spell="'+esc(n)+'">🪄 Cast</button>';
    const fav = n => spIsFav(n) ? 1 : 0;
    const dmgOf = (x, lvl) => spellGroups(x, lvl).map(g => diceTxt(g.x)).filter(Boolean).join(' + ');
    const size = x => spellGroups(x, x.level || 0).reduce((t, g) => t + (g.x ? g.x.n * (g.x.d + 1) / 2 + (g.x.flat||0) : 0), 0);
    const isAct = x => /1 action$/.test(x.castTime||''), isBonus = x => /bonus action/.test(x.castTime||'');
    const cantrips = sp.filter(x => !x.level && isAct(x) && (x.dmg||[]).length).sort((a,b) => fav(b.name)-fav(a.name) || size(b)-size(a));
    const best = cantrips[0] || null;
    const how = x => x.attack ? 'spell attack' : x.save ? ABIL_NAME[ABIL[x.save-1]]+' save' : '';
    const riders = sp.filter(x => isBonus(x) && x.conc && !x.save && !x.attack && !x.heal && (x.dmg||[]).length);
    const beams = x => { try { return spellCount(x, 0) || 1; } catch(_) { return 1; } };
    const riderC = cantrips.filter(x => x.attack).sort((a,b) => beams(b)-beams(a) || fav(b.name)-fav(a.name))[0];
    if (riders[0] && riderC) { const h = riders[0], c = riderC, nb = beams(c);
      out.push({ id:'auto-rider', title: h.name+' + '+c.name, when:'Set it up once, then every hit hurts more. Lasts while you concentrate.',
        steps:[['B','Cast '+h.name+' on your target (concentration, a level '+h.level+'+ slot).', castBtn(h.name)],
               ['A','Cast '+c.name+' at it ('+how(c)+').', castBtn(c.name)],
               ['F','Every hit adds '+dmgOf(h, h.level)+' '+(h.dmg[0].type||'')+(nb > 1 ? ' (each of the '+nb+' beams is its own hit)' : '')+'. Next turns: just the cantrip, no new slot.']],
        formula: [c, h].map(x => spellGroups(x, x === h ? h.level : 0).map(g => g.x ? (g.x.n * nb)+'d'+g.x.d+(g.x.flat ? sgn(g.x.flat * nb) : '') : '').filter(Boolean).join(' + ')).join(' + ') }); }
    const quick = (DATA.actions||[]).some(a => /^Metamagic: Quickened Spell/.test(a.name)), sorc = RES.find(r => /Sorcery Points/.test(r.name));
    const lvlAct = sp.filter(x => x.level && isAct(x) && ((x.dmg||[]).length || x.heal)).sort((a,b) => fav(b.name)-fav(a.name) || b.level-a.level || size(b)-size(a));
    if (quick && sorc && lvlAct[0] && best) { const q = lvlAct[0];
      out.push({ id:'auto-quick', title:'Quickened '+q.name+' + '+best.name, when:'Two spells in one turn. Only one of them can use a slot, so the other is a cantrip.',
        steps:[['B','Quickened Spell (2 Sorcery Points): cast '+q.name+' as a bonus action.', castBtn(q.name)],
               ['A','Cast '+best.name+' with your action ('+how(best)+').', castBtn(best.name)]],
        formula: (q.heal ? '' : dmgOf(q, q.level)+' + ')+dmgOf(best, 0) }); }
    const bonusSp = sp.filter(x => isBonus(x) && !riders.includes(x)).sort((a,b) => fav(b.name)-fav(a.name) || (b.heal?1:0)-(a.heal?1:0));
    const NAME = {'Healing Word':'Heal and hit', 'Misty Step':'Blink and blast', 'Mass Healing Word':'Rally and blast'};
    const pickB = bonusSp.filter(x => NAME[x.name] || (x.dmg||[]).length), heal1 = pickB.find(x => x.heal), other1 = pickB.find(x => !x.heal);
    [heal1, other1].filter(Boolean).forEach(b => { if (!best) return;
      out.push({ id: b.heal ? 'auto-b-heal' : 'auto-b-other', title: NAME[b.name] || (b.name+' + '+best.name), when: b.heal ? 'Pick an ally back up and still deal damage.' : /Misty Step/.test(b.name) ? 'Teleport 9 m out of trouble (or into a better angle), then attack.' : 'A bonus-action spell and a cantrip in the same turn.',
        steps:[['B','Cast '+b.name+'.', castBtn(b.name)], ['A','Cast '+best.name+' ('+how(best)+').', castBtn(best.name)]],
        formula: (b.heal || !(b.dmg||[]).length ? '' : dmgOf(b, b.level)+' + ')+dmgOf(best, 0) }); });
    const breath = (DATA.actions||[]).find(a => /^Breath Weapon/.test(a.name)), escape = bonusSp.find(x => x.name === 'Misty Step');
    if (breath && escape) out.push({ id:'auto-breath', title:'Breathe and vanish', when:'Hit a group with your breath, then get out before they swing back.',
      steps:[['A','Take the Attack action and use '+breath.name+' instead of an attack (cone or line, a DEX save).'], ['B','Cast '+escape.name+': teleport 9 m away.', castBtn(escape.name)]], formula:'' });
    // martial combos: one bonus action per turn, so each of these is a different way to spend it
    const avg = w => { const p = parseDice(w.dice); return p.n*(p.d+1)/2 + w.dmgMod; };
    const melee = D.weapons.filter(x => x.equipped && !x.ranged && !x.unarmed && x.a === 'str').sort((a,b) => avg(b)-avg(a))[0];
    const bow = D.weapons.filter(x => x.equipped && x.ranged).sort((a,b) => avg(b)-avg(a))[0];
    const fist = D.weapons.filter(x => x.equipped && x.monkWeapon).sort((a,b) => avg(b)-avg(a))[0];
    const two = D.attacksPerAction >= 2, atkN = D.attacksPerAction, atkSteps = (w, extra) => Array.from({length:atkN}, (_, i) => ({w, label: i ? 'Extra Attack' : 'First attack', ...(extra||{})}));
    const spend = (k, n, t) => '<button class="btn small rollbtn" data-act="spendres" data-k="'+k+'" data-n="'+n+'">'+t+'</button>';
    if (resBy('rage') && melee) out.push({ id:'auto-rage', title:'Rage and swing', when:'Your big melee turn. Reckless Attack gives you advantage (and enemies advantage against you).', mode:'adv',
      steps:[['B','Rage (bonus action): +'+D.rageDmg+' damage on every Strength hit.', '<button class="btn small rollbtn" data-act="reson" data-k="rage">🔥 Rage</button>'],
             ['A','Attack with your '+melee.name+(two ? ' twice (Extra Attack)' : '')+', recklessly.'],
             D.berserker && ['F','Frenzy: your first hit adds '+D.rageDmg+'d6.']].filter(Boolean),
      formula: Array(atkN).fill(melee.dice+sgn(melee.dmgMod+D.rageDmg)).join(' + '), roll: atkSteps(melee, {mode:'adv'}) });
    if (resBy('focus') && fist) out.push({ id:'auto-flurry', title:'Attack and Flurry', when:'The most hits in one turn: '+(atkN+2)+' attacks.', mode:'norm',
      steps:[['A','Attack with your '+fist.name+(two ? ' twice' : '')+'.'], ['B','Flurry of Blows: two unarmed strikes (1 Focus Point).', spend('focus', 1, '☯️ Spend 1')]],
      formula: Array(atkN).fill(fist.dice+sgn(fist.dmgMod)).concat(['1d'+parseDice(findW('Unarmed Strike').dice).d+sgn(findW('Unarmed Strike').dmgMod), '1d'+parseDice(findW('Unarmed Strike').dice).d+sgn(findW('Unarmed Strike').dmgMod)]).join(' + '),
      roll: atkSteps(fist, {mode:'norm'}).concat([{w:findW('Unarmed Strike'), label:'Flurry 1', mode:'norm'}, {w:findW('Unarmed Strike'), label:'Flurry 2', mode:'norm'}]) });
    const hm = sp.find(x => /^Hunter.s Mark$/.test(x.name));
    if (hm && bow) out.push({ id:'auto-mark', title:'Mark and shoot', when:'Mark one target, then every hit adds 1d6 force. Lasts while you concentrate (not while raging).', mode:'norm',
      steps:[['B','Cast Hunter’s Mark on your target.', castBtn(hm.name)], ['A','Shoot it with your '+bow.name+(two ? ' twice' : '')+'.'], ['F','Each hit adds 1d6 force'+(resBy('hmfree') || D.colossus ? '; Colossus Slayer adds 1d8 once a turn if it’s hurt' : '')+'.']],
      formula: Array(atkN).fill(bow.dice+sgn(bow.dmgMod)+' + 1d6').join(' + '), roll: atkSteps(bow, {mode:'norm'}) });
    if (sp.some(x => x.name === 'Divine Smite') && melee) out.push({ id:'auto-smite', title:'Hit, then Smite', when:'Save your slot until you know it hit (or crit: the smite dice double too).', mode:'norm',
      steps:[['A','Attack with your '+melee.name+'.'], ['B','It hit? Divine Smite: spend a slot for 2d8 radiant (+1d8 per slot level above 1st). Pick it on the damage step.']],
      formula: melee.dice+sgn(melee.dmgMod)+' + 2d8', roll: atkSteps(melee, {mode:'norm'}) });
    const ea = !out.some(c => /^auto-(rage|flurry|mark|smite)$/.test(c.id)) && (DATA.classes||[]).some(c => /Fighter|Barbarian|Monk|Paladin|Ranger/.test(c.name) && c.level >= 5), w = SIG_W;
    if (ea && w) out.push({ id:'auto-ea', title:'Extra Attack', when:'Two attacks with one Attack action.', mode:'norm',
      steps:[['A','Attack with your '+w.name.toLowerCase()+' ('+sgn(w.hit)+' to hit).'], ['A','Extra Attack: a second swing.']], formula: w.dice+sgn(w.dmgMod)+' + '+w.dice+sgn(w.dmgMod),
      roll:[{label:'First attack'},{label:'Extra Attack'}] });
  } catch (e) { console.warn('auto combos', e); }
  return (AUTO_COMBOS = out.slice(0, 6));
}
// run a combo: queue its attacks through the roll flow
function rollCombo(id){
  const cb = combos().find(x=>x.id===id); if (!cb) return;
  const mode = cb.mode || 'adv';
  // Step 1 uses the combo's mode (default advantage); later steps use their own `mode`, else advantage.
  const specs = cb.roll.map((o,i) => ({ w:o.w || SIG_W, mode: o.mode || (i===0 ? mode : 'adv'), sneak:o.sneak, savage:o.savage, noMod:o.noMod, label:o.label }));
  const [first, ...rest] = specs, n = specs.length;
  startAttack(first.w, {...first, title:cb.title, queue:rest, n, step: n>1 ? '1 of '+n : ''});
}

