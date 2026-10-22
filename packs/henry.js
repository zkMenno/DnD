
/* ============================================================================
   CHARACTER PACK — Henry Gibbs, halfling Fighter/Rogue (Swashbuckler), Northlands campaign.
   Everything that is about *this* character or campaign lives here; #main is the generic engine.
   The engine reads PACK.* and degrades gracefully when an optional hook is missing.

   Pack functions run lazily (at render time), so they may use engine globals: D (derived sheet),
   DATA (raw D&D Beyond data), S (play state), sgn, esc, toolBonus, oilDC, comboCard, fmtTip, classEmo…
   Never touch those at the top level of this script — #main hasn't run yet.

   REQUIRED
     id            storage prefix. Keys: <id>-play-<charId>, <id>-ui, <id>-notes-<charId>, <id>-notes-cache-<charId>,
                   <id>-tab; db doc play/<id>; data script #<id>-data. Changing it orphans saved play state.
     theme         key in THEMES (#themes).
     tabs          [key, label, emoji] in strip order. Core panels: combat, combos, stats, gear, traits, notes.
   OPTIONAL
     campaignFeats names of DM handouts stored as feats (kept off the Feats list)
     toolNames     {itemId: name} for custom tool proficiencies D&D Beyond stores by id
     firstSession  session number the notes composer starts at
     panels        {tabKey: () => html} extra tabs, or overrides of a core tab
     signatureWeapon() → the weapon highlighted on Combat and used by combo steps that don't name one
     combos()      → [{id, title, when, steps:[[A|B|F|M|R, text]], formula, mode?, melee?, roll:[{w?, mode?, sneak, savage, noMod?, label}]}]
     turnEconomy() → [[tag, glossary term, [option, …]]] rows of the "turn at a glance" card
     attackNote()  → html under the Attacks card
     weaponTip(w)  → html under one weapon card ('' for none)
     gearExtras(inv) → html appended to the Gear tab
     backgroundBlurb() → html for the Background card
     abilityUse()  → {str…cha: one-line "what it does for you"} in ability bubbles
     profInfo()    → glossary entries for proficiencies (armour, weapons, tools, languages)
     glossary()    → glossary entries G (format at fmtTip in #main)
   NEW CHARACTER: copy this script, change the id/theme/tabs, rewrite the hooks you want, drop the rest,
   and put that character's compact D&D Beyond JSON in #<id>-data (Sync fills it in after the first load).
   ============================================================================ */
const PACK = (() => {
  // Henry's key weapons, looked up fresh each call (the sheet can change on sync)
  const loadout = () => {
    const bow = D.weapons.find(w=>w.name==='Shortbow') || D.weapons.find(w=>w.ranged);
    const blade = D.weapons.find(w=>w.name==='Shortsword') || D.weapons.find(w=>w.finesse);
    const dagger = D.weapons.find(w=>w.name==='Dagger');
    return { bow, blade, dagger, SA: D.sneakDice ? D.sneakDice+'d6' : null, EA: D.attacksPerAction > 1 };
  };

  /* ---- Combos tab: archer-rogue turn recipes ---- */
  function combos(){
    const {bow, blade, dagger, SA, EA} = loadout();
    if (!bow) return [];
    const bowStr = bow.dice+sgn(bow.dmgMod);
    const list = [
      { id:'steady', title:'Steady Shot', when:'Your bread and butter. Any turn you can stay put.',
        steps:[['B','Steady Aim. Only if you haven’t moved yet this turn; your speed drops to 0.'],
               ['A','Shoot the shortbow with advantage ('+sgn(bow.hit)+' to hit).'],
               ['F','On a hit: '+bowStr+' + Sneak Attack '+SA+'. Savage Attacker lets you roll the bow die twice and keep the better one.'],
               ['F','Vex: your next shot at that target before the end of your next turn has advantage.']]
               .concat(EA?[['A','Extra Attack: second shot, already at advantage thanks to Vex (no second Sneak Attack).']]:[]),
        formula: bowStr+' + '+SA+(EA?' + '+bowStr:''),
        roll:[{sneak:true,savage:true,label:'Steady Aim shot'}].concat(EA?[{sneak:false,savage:false,label:'Extra Attack (Vex)'}]:[]) },
      { id:'vex', title:'Vex Chain', when:'You hit the same target last turn. Advantage is already banked.',
        steps:[['M','Move wherever you like. Vex doesn’t care.'],
               ['A','Shoot the same target: advantage from Vex, so Sneak Attack applies.'],
               ['B','Bonus action is free: Cunning Action to Hide, Dash or Disengage.'],
               ['F','Hit again and Vex refreshes for next turn.']],
        formula: bowStr+' + '+SA, roll:[{sneak:true,savage:true,label:'Vex shot'}] },
    ];
    if (D.actionSurge) list.push(
      { id:'surge', title:'Surge Volley', when:'Your double shot today. Once per short rest, for the fight that matters.',
        steps:[['B','Steady Aim (don’t move first).'],
               ['A','Shot one with advantage: '+bowStr+' + '+SA+' Sneak Attack. A hit triggers Vex.'],
               ['F','Action Surge: take a second action.'],
               ['A','Shot two at the same target with advantage from Vex: '+bowStr+'. Sneak Attack is once per turn, so no extra dice.']]
               .concat(EA?[['A','With Extra Attack each action is two shots: four arrows in one turn.']]:[]),
        formula: bowStr+' + '+SA+' + '+bowStr+(EA?' ×3':''),
        roll:[{sneak:true,savage:true,label:'Shot 1 (Steady Aim)'},{sneak:false,savage:false,label:'Shot 2 (Action Surge, Vex)'}].concat(EA?[{sneak:false,savage:false,label:'Shot 3'},{sneak:false,savage:false,label:'Shot 4'}]:[]) });
    list.push(
      { id:'hide', title:'Halfling Shadow Shot', when:'You need to move and you don’t have Vex. Naturally Stealthy makes this easy.',
        steps:[['M','Move so a creature at least one size larger than you (any Medium ally) blocks the enemy’s view.'],
               ['B','Cunning Action: Hide. Stealth '+sgn(D.sk('Stealth'))+' against DC 15.'],
               ['A','Shoot while hidden: advantage, so Sneak Attack. The shot gives away your position.']],
        formula: bowStr+' + '+SA, roll:[{sneak:true,savage:true,label:'Shot from hiding'}] },
      { id:'buddy', title:'Buddy Shot', when:'An ally is within 1.5 m of your target. No advantage needed.',
        steps:[['A','Shoot normally. Sneak Attack works when an ally is next to the target and you don’t have disadvantage.'],
               ['B','Bonus action stays free: Hide now to set up advantage for next turn, or Second Wind if you’re hurt.']],
        formula: bowStr+' + '+SA, mode:'norm', roll:[{sneak:true,savage:true,label:'Ally-adjacent shot'}] });
    if (blade) list.push(
      { id:'duel', melee:true, title:'Swashbuckler Stab and Go', when:'Something got into your face. One-on-one, nobody else next to you.',
        steps:[['A','Stab with the '+blade.name.toLowerCase()+' ('+sgn(blade.hit)+'): Rakish Audacity grants Sneak Attack when it’s just you and the target.'],
               ].concat(dagger && D.masteries.Dagger==='Nick' && blade.light ? [['F','Nick: off-hand dagger stab as part of the same action, '+dagger.dice+' (no ability modifier).']] : [])
               .concat([['F','Fancy Footwork: that target can’t make opportunity attacks against you this turn.'],
               ['M','Walk away to shooting range. Cunning Action: Dash if you need more distance.']]),
        formula: blade.dice+sgn(blade.dmgMod)+' + '+SA+(dagger && D.masteries.Dagger==='Nick'?' + '+dagger.dice:''), mode:'norm',
        roll:[{w:blade, sneak:true, savage:true, label:blade.name}].concat(dagger && D.masteries.Dagger==='Nick' ? [{w:dagger, mode:'norm', sneak:false, savage:false, noMod:true, label:'Nick dagger'}] : []) });
    return list;
  }
  function combosPanel(){
    const all = combos(), melee = all.filter(c => c.melee), ranged = all.filter(c => !c.melee);
    const head = (emo, t, p) => '<section class="card sechead"><h2><span class="emo" aria-hidden="true">'+emo+'</span>'+t+'</h2>'+(p?'<p class="muted" style="margin:4px 0 0">'+p+'</p>':'')+'</section>';
    const sd = D.superiorityDice;
    return head('🏹','Ranged combos','Most-used first. Each 🎲 Roll walks you through the shots with the right advantage, and spends arrows.')
      + '<div class="combos">'+ranged.map(comboCard).join('')+'</div>'
      + (melee.length ? head('🗡️','Melee combos','When something gets into your face.') + '<div class="combos">'+melee.map(comboCard).join('')+'</div>' : '')
      // Battle Master: Superiority Dice is the resource (with its tracker); each maneuver is one way to spend a die.
      + (sd ? head('⚔️','Battle Master maneuvers','One resource, three ways to spend it. One maneuver per attack; the buttons show up on roll results.')
        + '<div class="combos"><section class="card combo mnv"><div class="cardhead" style="margin:0"><h3>Superiority Dice</h3><span class="chip brass">'+sd.max+' × '+sd.die+'</span></div>'
        + '<div class="why">Your Battle Master resource. All of them come back on a short or long rest.</div>'
        + useBlock('Superiority Dice')
        + '<div class="eyebrow mnvh">Spend one on</div><ul class="steps opts">'
        + [['A','To hit','Precision Attack','After your attack roll, add a '+sd.die+' to it. Turns a near-miss into a hit.'],
           ['R','Damage','Menacing Attack','On a hit, add a '+sd.die+' to damage. The target makes a DC '+D.maneuverDC+' WIS save or is Frightened until the end of your next turn.'],
           ['B','Check','Commanding Presence','Add a '+sd.die+' to an Intimidation, Performance or Persuasion check.']]
          .filter(([,,n]) => !D.maneuvers.length || D.maneuvers.some(m => m.name === n))
          .map(([k,t,n,x]) => '<li><button class="tag term '+k+'" data-term="'+esc(n)+'">'+t+'</button><span><b>'+esc(n)+'</b><br>'+esc(x)+'</span></li>').join('')
        + '</ul></section></div>' : '')
      + '<section class="card"><h2><span class="emo" aria-hidden="true">🍀</span>Rerolls and saves</h2><div class="feat"><b>Savage Attacker</b><p>Once per turn on a weapon hit, roll the weapon’s damage dice twice and keep either. Read strictly, that’s the bow’s d6, not the Sneak Attack dice. Check with your DM.</p></div>'
      + '<div class="feat"><b>Halfling Luck</b><p>Natural 1 on an attack, check or save: reroll and keep the new roll.</p></div>'
      + '<div class="feat"><b>Heroic Inspiration <span class="chip '+(S.insp?'brass':'ghost')+'" id="inspchip">'+(S.insp?'⭐ have it':'none yet')+'</span></b><p>Reroll any one die and keep the new result. The DM hands it out for great play, or your bard can pass you theirs.</p><button class="btn small" style="margin-top:6px" data-act="inspmenu">Gained one / used it</button></div>'
      + '<div class="feat"><b>Tactical Mind</b><p>Failed an ability check? Spend a Second Wind use and add 1d10. If you still fail, the use isn’t spent.</p></div>'
      + '<div class="feat"><b>Critical hits</b><p>A natural 20 doubles every damage die, Sneak Attack included. Advantage roughly doubles your crit chance.</p></div></section>';
  }
  /* ---- Combat tab ---- */
  function turnEconomy(){
    const {bow, SA, EA} = loadout(), sw = D.secondWind, as = D.actionSurge;
    return [
      ['A','Action',[bow?'Attack: shortbow '+sgn(bow.hit)+(EA?' (×2 with Extra Attack)':''):'Attack','Dash, Disengage, Dodge, Help, Hide, Search','Throw a flask of Oil, use Thieves’ Tools','Ready a shot for when an enemy appears']],
      ['B','Bonus action',['Steady Aim (0 m speed this turn)','Cunning Action: Dash, Disengage or Hide', sw ? 'Second Wind: heal yourself '+sw.heal : '', 'Drink a potion']],
      ['R','Reaction',['Opportunity attack when an enemy leaves your reach','Readied shot']],
      ['F','Free / once per turn',[SA?'Sneak Attack +'+SA+' (advantage, or ally next to target)':'', D.savage?'Savage Attacker: roll weapon dice twice, keep better':'', as?'Action Surge: one extra action (1 per short rest)':'', 'Fancy Footwork: melee hit, no opportunity attacks from that target','Halfling Luck: reroll a natural 1']]
    ];
  }
  const attackNote = () => 'Shortbow includes +'+D.archery+' from Archery. Tap 🎲 Attack: it rolls to hit, then offers damage. Halfling Luck and Savage Attacker are buttons on the result when they apply. A bow hit roll spends one arrow from the tracker.';
  const weaponTip = w => (w.versatile ? '<p class="tip">Tip: with your bow in the other hand it’s '+esc(w.dice+sgn(w.dmgMod))+'. Both hands on the '+esc(w.name.toLowerCase())+' in melee makes it '+esc(w.versatile+sgn(w.dmgMod))+'. Drop the bow (free) or stow it as part of the attack. Thrown is always '+esc(w.dice+sgn(w.dmgMod))+'.</p>' : '');

  /* ---- Gear tab: tricks with what's in the pack, and spares worth selling ---- */
  function gearExtras(inv){
    const dupes = ['Shortbow','Spear','Quiver','Dagger'].filter(n => inv.filter(i=>i.name===n).length>1);
    const have = n => inv.some(i=>i.name===n);
    const tricks = [
      have('Oil') && have('Tinderbox') ? ['Fire wall', 'Pour a flask of oil across a doorway or corridor (your action), then light it with the tinderbox (bonus action). It burns for 2 rounds and anything walking through takes 5 fire damage. Buys time to shoot. Check the action timing with your DM.'] : null,
      have('Ball Bearings') ? ['Escape carpet', 'Spill ball bearings behind you as you run. Chasers fall prone on a failed DC 10 DEX save. Shooting at a prone target gives you disadvantage, so use this to get away, not to set up shots.'] : null,
      have('Bell') && have('Rope') ? ['Camp alarm', 'Run the rope at ankle height across the approach to camp and tie the bell to it. Anyone tripping it can be heard 18 m away.'] : null,
      have('Hooded Lantern') ? ['Dark approach', 'Lower the lantern hood (bonus action) to dim light 1.5 m. You can still see your feet without lighting yourself up for archers.'] : null,
      have('Crowbar') && have("Thieves' Tools") ? ['Two ways through a door', 'Quiet: thieves’ tools, DC 15, '+sgn(toolBonus('dex','Thieves'))+'. Loud: crowbar for advantage on the Strength check.'] : null
    ].filter(Boolean);
    return (tricks.length ? '<section class="card"><h2><span class="emo" aria-hidden="true">🏴‍☠️</span>Tricks from the sea chest</h2>'+tricks.map(([t,x])=>'<div class="feat"><b>'+esc(t)+'</b><p>'+esc(x)+'</p></div>').join('')+'</section>' : '')
      + (dupes.length ? '<p class="note">You’re carrying spares: '+esc(dupes.join(', '))+'. Selling the spare shortbow alone covers most of a herbalism kit and your first batch of healing potions.</p>' : '');
  }

  /* ---- Brew and Grow tabs (Henry's own goals: potion brewing, the Fighter 5 / Rogue 5 plan) ---- */
  function brewPanel(){
    const oil = DATA.inventory.find(i=>i.name==='Oil');
    const kit = DATA.inventory.find(i=>/Healer/.test(i.name));
    const potion = DATA.inventory.some(i => i.name === 'Potion of Healing');
    const hasHerb = D.profs.tools.some(t=>/Herbalism/i.test(t));
    const hasArcana = D.skills.find(s=>s.name==='Arcana').prof;
    return '<section class="card"><h2><span class="emo" aria-hidden="true">🧪</span>On hand</h2><div class="items">'
      + (potion ? '<div class="item"><span class="n"><b class="iname">Potion of Healing</b> <span class="qty" data-invq="Potion of Healing">'+itemCountTxt('Potion of Healing')+'</span><br><span class="small muted">Heals 2d4+2. Drinking it is a bonus action under the 2024 rules.</span></span><button class="btn small" data-act="drink" data-item="Potion of Healing" data-invbtn="Potion of Healing" '+(itemLeft('Potion of Healing')?'':'disabled')+'>Drink</button></div>' : '')
      + (oil ? '<div class="item"><span class="n"><b class="iname">Oil flask</b> <span class="qty" data-invq="Oil">'+itemCountTxt('Oil')+'</span><br><span class="small muted">'+esc(USES.Oil().text)+'</span></span>'+useBtn('Oil')+'</div>' : '')
      + (kit ? '<div class="item"><span class="n"><b class="iname">Healer’s Kit</b>'+(kit.uses?' <span class="qty">'+(kit.uses.max-kit.uses.used)+' uses</span>':'')+'<br><span class="small muted">Stabilise a creature at 0 HP without a Medicine check.</span></span></div>' : '')
      + '</div></section>'
      + '<section class="card"><h2><span class="emo" aria-hidden="true">⚗️</span>Becoming a brewer</h2><ol class="road">'
      + '<li class="'+(hasHerb?'':'goal')+'"><span class="lv">Step 1</span><div><b>Herbalism Kit proficiency</b> '+(hasHerb?'<span class="chip">done</span>':'<span class="chip warn">not yet</span>')+'<p class="small muted" style="margin:2px 0 0">Cheapest route: ask your DM to let you swap the Soldier’s dice set for the Herbalism Kit, then add it on D&D Beyond as a custom proficiency (the Soldier dropdown only lists gaming sets). The by-the-book route is the Skilled feat at your next feat level.</p></div></li>'
      + '<li><span class="lv">Step 2</span><div><b>Buy the kit</b><p class="small muted" style="margin:2px 0 0">About 5 gp. You have '+(S.coins.gp||0)+' gp.</p></div></li>'
      + '<li><span class="lv">Step 3</span><div><b>Brew Potions of Healing and Antitoxin</b><p class="small muted" style="margin:2px 0 0">Mundane crafting: raw materials cost half the item price, and work takes days in proportion to the price. A healing potion comes to roughly 25 gp of herbs and about 5 days. These numbers come from the 2024 crafting rules; confirm with your DM.</p></div></li>'
      + '<li class="goal"><span class="lv">Step 4</span><div><b>Magic buff potions</b> '+(hasArcana?'<span class="chip">Arcana ✓</span>':'<span class="chip warn">needs Arcana</span>')+'<p class="small muted" style="margin:2px 0 0">The 2024 DMG requires Arcana proficiency plus the herbalism kit and a formula. A common potion costs about 50 gp and 5 days, uncommon about 200 gp and 10 days. The Skilled feat is the easiest way to pick up Arcana.</p></div></li>'
      + '</ol></section>'
      + '<section class="card"><h2><span class="emo" aria-hidden="true">🔮</span>Potions worth chasing for an archer</h2>'
      + '<div class="feat"><b>Potion of Speed</b><p>Haste for a minute: an extra action each turn that can make one weapon attack. A true double shot. Very rare.</p></div>'
      + '<div class="feat"><b>Potion of Heroism</b><p>10 temporary HP and Bless for an hour, so +1d4 on every attack. Rare.</p></div>'
      + '<div class="feat"><b>Potion of Invisibility</b><p>Invisible until you attack. The first shot from invisibility has advantage, so Sneak Attack lands. Very rare.</p></div>'
      + '<div class="feat"><b>Potion of Climbing</b><p>Climb speed for an hour. Gets you onto rooftops and cliffs for sniping. Common, so a realistic first magic brew.</p></div>'
      + '<p class="small muted" style="margin:8px 0 0">Rarities are from the core rules; your DM sets what’s available in the Northlands.</p></section>';
  }
  function growPanel(){
    const unused = Object.entries(D.masteries).filter(([w]) => !D.weapons.some(x=>x.name===w && x.equipped));
    const want = D.weapons.filter(w=>w.equipped && !w.mastery && w.masteryOnItem);
    const f = D.fighter, rg = D.rogue, L = D.totalLevel;
    const steps = [];
    if (f < 3) steps.push(['Lvl 3', 'Fighter', '**Subclass — pick one:**\n• **Champion**: crits on 19–20, and every crit doubles Sneak Attack dice\nOR\n• **Battle Master**: maneuvers like Precision Attack to turn misses into hits']);
    if (f < 4) steps.push(['Lvl 4', 'Fighter', '**A feat — pick one:**\n• **Poisoner**: poison arrows, the direct unlock\nOR\n• **Sharpshooter**: ignore half and three-quarters cover, no long-range disadvantage\nOR\n• **Skilled**: '+(D.profs.tools.some(t=>/Herbalism/.test(t))?'Arcana for magic potions, plus two more skills or tools':'herbalism kit and Arcana for brewing')]);
    if (f < 5) steps.push(['Lvl 5', 'Fighter', '**Extra Attack: the real double shot.**\n• Two shots every Attack action\n• Four with Action Surge', true]);
    if (rg < 4) steps.push(['Lvl 4', 'Rogue', '**Ability score or feat — pick one:**\n• **+2 DEX** (to '+Math.min(20,D.score.dex+2)+')\nOR\n• The feat you skipped at Fighter 4']);
    if (rg < 5) steps.push(['Lvl 5', 'Rogue', '**Two upgrades:**\n• **Uncanny Dodge**: halve one attack’s damage, as a reaction\n• **Sneak Attack** rises to 3d6', true]);
    return '<section class="card"><h2><span class="emo" aria-hidden="true">📈</span>Level '+L+'</h2>'
      + DATA.classes.map(k => '<p class="small" style="margin:4px 0 0">'+classEmo(k.name)+' '+esc(k.name)+' '+k.level+(k.sub?' — '+esc(k.sub.replace(/\s*\(.*\)/,'')):'')+'</p>').join('')
      + '</section>'
      + '<section class="card"><h2><span class="emo" aria-hidden="true">🧭</span>Progression plan</h2>'
      + '<p style="margin:0 0 8px">'+(D.attacksPerAction>1?'You have Extra Attack. Steady Aim on shot one, Vex carries advantage into shot two.':'Today your double shot is Action Surge: two Attack actions, once per short rest. For two shots every turn you need Fighter level 5.')+'</p>'
      + (steps.length ? '<ol class="plan">'+steps.map(([lv,cls,t,goal],i)=>{ const n = +String(lv).replace(/\D/g,'');
          return '<li class="pstep'+(goal?' goal':'')+'"><div class="plv">Level '+(L+i+1)+(goal?' <span class="chip brass">key step</span>':'')+'</div>'
            + '<div class="pcls">'+classEmo(cls)+' '+esc(cls)+' '+(n-1)+' → '+esc(cls)+' '+n+'</div><div class="bx pdesc">'+fmtTip(t)+'</div></li>'; }).join('')+'</ol>'
          + '<p class="small muted" style="margin:8px 0 0">Taking everything above puts you at Fighter '+Math.max(f,5)+' / Rogue '+Math.max(rg,5)+' — character level '+(L+steps.length)+'. Order and picks here are the current direction, not locked in.</p>' : '')
      + '</section>'
      + ((unused.length || want.length) ? '<section class="card"><h2><span class="emo" aria-hidden="true">🛠️</span>Fix your weapon masteries</h2>'
        + '<p style="margin:0 0 8px">'+(unused.length?'You picked masteries for weapons you don’t carry: '+esc(unused.map(([w,m])=>w+' ('+m+')').join(', '))+'.':'')+'</p>'
        + (want.length ? '<p style="margin:0 0 8px">Swap them for what’s in your hands: '+esc(want.map(w=>w.name+' ('+w.masteryOnItem+')').join(', '))+'. Shortsword Vex sets up Sneak Attack in melee; Spear Sap gives the enemy disadvantage on its next attack.</p>' : '')
        + '<p class="small muted" style="margin:0">Your Fighter masteries can change one weapon per long rest. Rogue masteries can all change on a long rest.</p></section>' : '')
      + '<section class="card"><h2><span class="emo" aria-hidden="true">💪</span>Ability scores</h2><p style="margin:0">DEX '+D.score.dex+' drives everything you do. '+(D.score.dex%2 ? 'A feat with +1 DEX (Sharpshooter and several others include one) takes you to '+(D.score.dex+1)+': +1 to hit, damage, AC and initiative.' : 'At '+D.score.dex+' a +1 does nothing yet; the Ability Score Improvement feat’s +2 DEX takes you to '+(D.score.dex+2)+': +1 to hit, damage, AC and initiative.')+(D.score.str%2 ? ' STR '+D.score.str+' is odd, so a half-feat with +1 STR would also pay off for your spear.' : '')+'</p></section>';
  }
  /* ---- Glossary: rules explained for Henry's build ---- */
  const abilityUse = () => ({
      str: 'Spear hits, climbing, jumping, forcing things open.',
      dex: 'Your main stat: bow and finesse attacks, AC, initiative, dodging.',
      con: 'Hit points (+'+Math.max(0,D.mod.con)+' per level) and resisting poison.',
      int: 'Lore and working things out. Arcana is needed for magic potions.',
      wis: 'Noticing things, reading people, resisting mind magic.',
      cha: 'Persuading, lying, threatening. Also boosts your initiative (Rakish Audacity).'
  });
  function profInfo(){
    const dex = D.mod.dex, tb = (a, n) => D.mod[a] + (D.profs.tools.some(t => profKey(t).startsWith(n)) ? D.pb : 0);
    const armourAC = (base, cap) => base + (cap == null ? dex : Math.min(dex, cap));
    return {
      'Light armour': ['Armour', 'No penalty to wear: AC = armour + your full DEX. Padded (11), **leather (11, what you wear: AC '+armourAC(11)+')**, studded leather (12). Studded leather would give you **AC '+armourAC(12)+'** for 45 gp, with no Stealth penalty.'],
      'Medium armour': ['Armour', 'AC = armour + DEX, but DEX counts for **at most +2**. For you: chain shirt **AC '+armourAC(13,2)+'** (50 gp), breastplate **AC '+armourAC(14,2)+'** (400 gp). Scale mail and half plate give disadvantage on Stealth, which hurts a sneaky archer.'],
      'Heavy armour': ['Armour', 'High fixed AC that ignores DEX. Slow and loud; not a fit for Henry.'],
      'Shields': ['Armour', '**+2 AC**, but it fills a hand. Your shortbow needs both hands, so a shield only makes sense on melee days. Putting one on or off takes your action.'],
      'Simple weapons': ['Weapons', 'Daggers, spears, clubs, darts, slings, light crossbows and **shortbows**. You add your proficiency bonus (+'+D.pb+') to hit with all of them.'],
      'Martial weapons': ['Weapons', 'Swords, axes, rapiers, hand crossbows and **longbows**. A longbow hits harder (1d8, range 45/180 m) but its mastery is Slow, not Vex, so you’d lose easy Sneak Attack set-ups.'],
      "Thieves' Tools": ['Tool · DEX', '**Pick a lock (DC 15)** or **disarm a trap (DC 15)**. Proficient, so you roll **'+sgn(tb('dex',"Thieves"))+'**.', null, '<button class="btn primary rollbtn" data-tool="Thieves’ Tools" data-b="'+tb('dex',"Thieves")+'">🎲 Roll '+sgn(tb('dex',"Thieves"))+'</button>'],
      'Herbalism Kit': ['Tool · INT', '**Identify a plant (DC 10)**, and craft **Potions of Healing**, antitoxin and healer’s kits. Proficient, so you roll **'+sgn(tb('int','Herbalism'))+'**. You still need to buy the kit itself (5 gp).', null, '<button class="btn primary rollbtn" data-tool="Herbalism Kit" data-b="'+tb('int','Herbalism')+'">🎲 Roll '+sgn(tb('int','Herbalism'))+'</button>'],
      'Dice Set': ['Tool · WIS', 'Gaming set: **spot a cheat (DC 10)** or **win a game (DC 20)**.'],
      'Common': ['Language', 'Spoken by nearly everyone in the realms. Your default for talking to anyone.'],
      'Gnomish': ['Language', 'The language of gnomes: tinkerers, illusionists and burrow-dwellers.'],
      'Elvish': ['Language', 'Spoken by elves and many fey. Common in old songs, ruins and magical writing.'],
      'Halfling': ['Language', 'Your own people’s tongue, often used in close-knit halfling communities.'],
      'Dwarvish': ['Language', 'Spoken by dwarves; carved into many old halls and runes.'],
      "Thieves' Cant": ['Language · Rogue', 'A secret mix of slang, hand signs and chalk marks. Lets you pass hidden messages in plain conversation and read marks left by other rogues. Only rogues and criminals understand it.'],
      'Undercommon': ['Language', 'The trade tongue of the Underdark, used by drow, duergar and other creatures below.']
    };
  }
  function glossary(){
    const {bow} = loadout(), sw = D.secondWind, as = D.actionSurge, pb = D.pb;
    return {
      'Vex': ['Weapon mastery', '**Hit and deal damage → advantage on your next attack against that target.**\n## ⏱️ How long\n• Until the end of your next turn\n• Used up by that next attack, hit or miss\n## 💡 Why it matters\n• Advantage turns on Sneak Attack, no Steady Aim needed', 'Only you.'],
      'Nick': ['Weapon mastery', '**Your Light-weapon extra attack is free.**\n• Part of the Attack action, so it doesn’t cost your bonus action\n• Once per turn', 'Only you.'],
      'Topple': ['Weapon mastery', '**Hit → the target makes a CON save or falls prone.**\n• Save DC: 8 + the attack’s ability modifier + '+D.pb+'\n## 🤝 Against a prone target\n• Melee attacks from within 1.5 m: advantage\n• Ranged attacks, yours too: disadvantage', 'Allies fighting in melee.'],
      'Sap': ['Weapon mastery', '**Hit → the target has disadvantage on its next attack.**\n• Lasts until the start of your next turn', 'The whole party: it protects whoever gets attacked next.'],
      'Advantage': ['Rule', '**Roll two d20s, keep the higher.** Turns on Sneak Attack.\n## 🎯 How you get it\n• **Steady Aim**: bonus action, before you move\n• **Hide**: attack while unseen\n• **Vex**: your next attack after a Vex hit\n## ⚠️ Catch\n• Any disadvantage cancels it out'],
      'Disadvantage': ['Rule', '**Roll two d20s, keep the lower.** Blocks Sneak Attack.\n## ⚠️ You get it when\n• Shooting beyond normal range ('+(bow?bow.range.split('/')[0]:'24')+' m)\n• Shooting with an enemy within 1.5 m of you\n## ⚖️ Cancelling\n• Any advantage cancels it, however many sources'],
      'Sneak Attack': ['Rogue', '**+'+D.sneakDice+'d6 damage, once per turn**, on a finesse or ranged hit. Never with disadvantage.\n## 🎯 Needs one of\n• Advantage\n• An ally within 1.5 m of the target\n• One-on-one in melee (Rakish Audacity)\n## 📈 Progression\n• **'+Math.ceil((D.rogue+2)/2)+'d6** at Rogue '+(D.rogue+(D.rogue%2?2:1))+', +1d6 per odd level after', 'Your attacks. Allies help by standing next to the target.'],
      'Steady Aim': ['Rogue · bonus action', '**Advantage on your next attack this turn.**\n## ⚠️ Catch\n• Only if you haven’t moved this turn\n• Your speed becomes 0 until the turn ends', 'Only you.'],
      'Savage Attacker': ['Feat', '**Reroll your weapon damage dice and keep the better.** Once per turn, on a hit.\n## 🎲 In the app\n• Tap 🪓 Savage Attacker on the damage result', 'Only your weapon hits.'],
      'Action Surge': ['Fighter', '**One extra action this turn.** Anything except Magic.\n## 🔁 Uses\n• '+(as?as.max:1)+' per short or long rest\n## 💡 Tip\n• With the bow it’s a second Attack action: your double shot', 'Only you.'],
      'Second Wind': ['Fighter · bonus action', '**Heal '+(sw?sw.heal:'1d10')+' HP.**\n## 🔁 Uses\n• '+(sw?sw.max:2)+' per long rest\n• A short rest gives one back', 'Only you.'],
      'Tactical Mind': ['Fighter', '**Failed an ability check? Spend a Second Wind use to add 1d10.**\n• Still a fail → the use isn’t spent', 'Only your own checks.'],
      'Cunning Action': ['Rogue · bonus action', '**Dash, Disengage or Hide as a bonus action.**', 'Only you.'],
      'Fancy Footwork': ['Swashbuckler', '**Make a melee attack → that creature can’t make opportunity attacks against you this turn.**\n## 💡 Tip\n• Stab, then walk away freely', 'Only you.'],
      'Rakish Audacity': ['Swashbuckler', '**Two perks.**\n## ⚡ Initiative\n• Add your CHA ('+sgn(D.mod.cha)+')\n## 🗡️ Solo Sneak Attack\n• You’re within 1.5 m of the target\n• No other creature within 1.5 m of you\n• You don’t have disadvantage', 'Only you.'],
      'Halfling Luck': ['Halfling', '**Rolled a natural 1? Reroll it and use the new roll.**\n• Attacks, ability checks and saves\n## 🎲 In the app\n• Tap 🍀 Halfling Luck on the result', 'Only your own d20 rolls.'],
      'Brave': ['Halfling', '**Advantage on saves against being Frightened.**', 'Only you.'],
      'Naturally Stealthy': ['Halfling', '**Hide behind any creature bigger than you.**\n• Any Medium ally works as walking cover', 'Only you.'],
      'Halfling Nimbleness': ['Halfling', '**Move through the space of bigger creatures.**\n• You can’t stop there', 'Only you.'],
      'Heroic Inspiration': ['Rule', '**Reroll any one die right after rolling it.** Use the new roll.\n## 🎁 Where it comes from\n• The DM, or another player’s feature\n## 🎲 In the app\n• Tap ⭐ Inspiration on a roll result\n• Toggle it in Combos → “Rerolls and saves”', 'Your rolls. Gain a second? Pass it to a player who has none.'],
      'Expertise': ['Rogue', '**Double proficiency on a skill: +'+(2*pb)+' instead of +'+pb+'.**\n• Yours: Acrobatics and Stealth', 'Only you.'],
      'Archery': ['Fighting style', '**+2 to hit with ranged weapons.**\n• Already in your shortbow’s '+(bow?sgn(bow.hit):''), 'Your ranged attacks.'],
      'Extra Attack': ['Fighter 5', '**Attack twice with each Attack action.**\n• With Action Surge: four shots in one turn', 'Only you.'],
      'Finesse': ['Weapon property', '**Use STR or DEX for attack and damage.**\n• Can deliver Sneak Attack in melee'],
      'Light': ['Weapon property', '**Attack with a second Light weapon as a bonus action.**\n• No ability modifier on that damage\n• Nick makes it free'],
      'Thrown': ['Weapon property', '**Throw it for a ranged attack.**\n• Same ability as in melee\n• Archery doesn’t apply'],
      'Two-Handed': ['Weapon property', '**Needs both hands to attack.**\n• Drawing an arrow is part of the attack'],
      'Versatile': ['Weapon property', '**One or two hands.** Two hands use the bigger die in brackets.'],
      'Hide': ['Action', '**Stealth ('+sgn(D.sk('Stealth'))+') vs DC 15 to become hidden.**\n## 📋 You need\n• Heavy obscurement, or three-quarters or total cover\n• To be out of the enemy’s sight\n## ✨ While hidden\n• You’re Invisible: your attacks have advantage\n• Attacking gives you away', 'Only you.'],
      'Invisible': ['Condition', '**Your attacks: advantage. Attacks on you: disadvantage.**\n• From hiding, it ends when you attack'],
      'Thieves’ Tools': ['Tool · action', '**Pick a lock or disarm a trap: DC 15 each.**\n• You roll **'+sgn(toolBonus('dex','Thieves'))+'**'+(toolProf('Thieves')?' (proficient)':'')],
      'Oil': ['Item', '**Throw it, or pour it and set it alight.**\n## 🫗 Throw (replaces one attack)\n• Target within 6 m: DC '+oilDC+' DEX save\n• On a fail: +5 fire damage the next time it takes fire damage, within a minute\n## 🔥 Pour and light\n• A 1.5 m square burns for 2 rounds\n• 5 fire damage to anyone in it\n## 🏮 Also\n• Lantern fuel'],
      'Dodge': ['Action', '**Hard to hit until your next turn.**\n• Attacks against you: disadvantage, if you can see the attacker\n• Your DEX saves: advantage\n## ⚠️ Ends early\n• If you’re Incapacitated or your speed drops to 0'],
      'Help': ['Action', '**Give an ally advantage.** Pick one:\n• Their next check for a task, before your next turn\n• Their next attack this turn on an enemy within 1.5 m of you'],
      'Search': ['Action', '**Look, listen, find.**\n• A Perception or Investigation check, the DM picks'],
      'Ready': ['Action', '**Set a trigger and a response.**\n• Uses your reaction when it triggers\n• No trigger → the action is wasted\n## 💡 Example\n• “I shoot the first one through the door.”'],
      ...(D.superiorityDice ? {
        'Battle Master': ['Fighter 3 · subclass', '**Your Fighter subclass: tactics powered by Superiority Dice.**\n• '+D.superiorityDice.max+' '+D.superiorityDice.die+'s, back on a short or long rest\n• Spend one to power a maneuver, one per attack\n• Maneuver save DC '+D.maneuverDC+'\n## 🎯 Your maneuvers\n'+(D.maneuvers.length ? D.maneuvers.map(m=>'• '+m.name).join('\n') : '• Precision Attack\n• Menacing Attack\n• Commanding Presence')+'\n## 📈 Progression\n• Fighter 7: a fifth die, two more maneuvers\n• Fighter 10: dice become d10'],
        'Superiority Dice': ['Battle Master', '**'+D.superiorityDice.max+' '+D.superiorityDice.die+'s that power your maneuvers.**\n• One maneuver per attack or check\n• Maneuver save DC '+D.maneuverDC+'\n## 🔁 Back\n• All of them on a short or long rest\n## 🎲 In the app\n• Maneuver buttons appear on roll results'+([[7,'a fifth die'],[10,'dice become d10'],[15,'a sixth die'],[18,'dice become d12']].filter(x=>x[0]>D.fighter).slice(0,2).map((x,i)=>(i?'':'\n## 📈 Progression')+'\n• Fighter '+x[0]+': '+x[1]).join(''))],
        'Precision Attack': ['Maneuver', '**Add a '+D.superiorityDice.die+' to an attack roll.**\n• Use it after you see the roll, before the DM says hit or miss', 'Only your attacks.'],
        'Menacing Attack': ['Maneuver', '**On a hit, add a '+D.superiorityDice.die+' to damage.**\n• The target makes a DC '+D.maneuverDC+' WIS save\n• Fail: Frightened of you until the end of your next turn', 'The party: a Frightened enemy has disadvantage on its attacks while it can see you.'],
        'Commanding Presence': ['Maneuver', '**Add a '+D.superiorityDice.die+' to an Intimidation, Performance or Persuasion check.**', 'Only your checks.']
      } : {}),
      'Uncanny Dodge': ['Rogue 5 · reaction', '**An attack hits you → halve that damage.**\n• You must see the attacker\n## 📈 Progression\n• Unlocks at Rogue 5, next on your growth plan'],
      'Platinum': ['🪙 Coin · pp', 'Rare. For big deals: magic items, a horse.', null, null, '1 pp = 10 gp = 1,000 cp'],
      'Gold': ['🪙 Coin · gp', '**The everyday unit for gear.**\n• 20 arrows: 1 gp\n• Herbalism kit: 5 gp\n• Potion of Healing: 50 gp', null, null, '1 gp = 10 sp = 100 cp'],
      'Electrum': ['🪙 Coin · ep', 'An old, rarely used coin. **2 ep = 1 gp.**', null, null, '1 ep = 5 sp = 50 cp'],
      'Silver': ['🪙 Coin · sp', 'Small purchases. A day’s rations: **5 sp**.', null, null, '1 sp = 10 cp = ⅒ gp'],
      'Copper': ['🪙 Coin · cp', 'Pocket change. A candle: **1 cp**.', null, null, '1 cp = ⅒ sp = 1/100 gp'],
      'Piercing': ['Damage type', '**Arrows, daggers, spears, fangs.**\n## ⚖️ When it matters\n• Resistant creatures take half\n• Vulnerable creatures take double\n• Skeletons and oozes can react differently than to slashing or bludgeoning'],
      'Slashing': ['Damage type', '**Swords, axes, claws.**\n• Matters against resistance (half) or vulnerability (double)'],
      'Bludgeoning': ['Damage type', '**Clubs, fists, hammers, falling.**\n• Skeletons are often vulnerable: double damage'],
      'Armour Class': ['Defence', '**AC '+D.ac+': an attack hits you if it meets or beats this.**'+(D.armor?'\n## 🧮 Made of\n• '+D.armor.name+' armour '+D.armor.ac+'\n• DEX '+sgn(D.mod.dex):''), null],
      'Initiative': ['Combat', '**d20 '+sgn(D.initiative)+' when a fight starts.** Highest goes first.\n## 🧮 Yours\n• DEX '+sgn(D.mod.dex)+(D.initNote?'\n• CHA '+sgn(D.mod.cha)+' (Rakish Audacity)':'')+'\n## 💡 Tip\n• Go early, shoot before they close in', null, '<button class="btn primary rollbtn" data-act="rollinit">🎲 Roll</button>'],
      'Speed': ['Movement', '**'+D.speedM+' m per turn** ('+D.speedFt+' ft, '+(D.speedFt/5)+' squares).\n• Split it before and after your action\n## 🏃 What changes it\n• **Dash** (action): another '+D.speedM+' m this turn\n• **Steady Aim** (bonus action): speed 0 this turn'],
      'Dash': ['Action', '**Move another '+D.speedM+' m this turn.**', 'Only you.'],
      'Disengage': ['Action', '**Move without provoking opportunity attacks this turn.**', 'Only you.'],
      'Opportunity attack': ['Reaction', '**An enemy leaves your reach → one melee attack against it.**\n• Uses your reaction\n• Disengage prevents it'],
      'Critical hit': ['Rule', '**Natural 20: always hits, damage dice doubled.**\n• Sneak Attack dice double too\n• Modifiers are added once'],
      'Temporary HP': ['Rule', '**A buffer you lose before real HP.**\n• Doesn’t stack: keep the higher amount\n• Gone after a long rest'],
      'Passive Perception': ['Rule', '**'+D.passive.perception+' = 10 + Perception.** Noticing things without rolling.\n## 👀 The DM uses it for\n• Ambushes and sneaking enemies\n• Hidden things in plain view'],
      'Passive Investigation': ['Rule', '**'+D.passive.investigation+' = 10 + Investigation.** Working things out without rolling.\n## 🔍 For example\n• A hidden compartment or a forged letter\n• How a trap works\n## 💡 Difference\n• Seeing a trap is Perception; understanding it is Investigation'],
      'Passive Insight': ['Rule', '**'+D.passive.insight+' = 10 + Insight.** Sensing lies without rolling.\n• The DM compares it to their Deception'],
      'Hit dice': ['Rule', '**Heal on a short rest: roll a hit die + CON ('+sgn(D.mod.con)+').**\n• Spend as many as you have left\n## 🔁 Back\n• All of them on a long rest', 'Only you.'],
      'Short rest': ['Rule', '**At least 1 hour of downtime.**\n## 🔁 Comes back\n• Action Surge\n'+(D.superiorityDice?'• All Superiority Dice\n':'')+'• One Second Wind use\n## ❤️ Heal\n• Spend hit dice'],
      'Long rest': ['Rule', '**8 hours.** Everything comes back:\n• Full HP\n• All hit dice and limited uses'],
      'Action': ['Your turn', '**One per turn.**\n• Attack, Dash, Disengage, Dodge, Help, Hide, Search, Ready, use an object\n• Action Surge gives you a second'],
      'Bonus action': ['Your turn', '**One per turn, only for things that say so.**\n• Steady Aim, Cunning Action, Second Wind, drinking a potion'],
      'Reaction': ['Your turn', '**One per round, even on other creatures’ turns.**\n• An opportunity attack or a readied shot\n• Back at the start of your turn'],
      'Free': ['Your turn', '**Rides along with something else.**\n• Sneak Attack and Savage Attacker, on a hit\n• Vex, after a hit\n• Halfling Luck, on a 1'],
      'Free / once per turn': ['Your turn', '**Rides along with something else.**\n• Sneak Attack and Savage Attacker, on a hit\n• Vex, after a hit\n• Halfling Luck, on a 1'],
      'Move': ['Your turn', '**Up to '+D.speedM+' m**, split around your actions.\n## ⚠️ Catch\n• Moving at all rules out Steady Aim']
    };
  }

  return {
    id: 'henry',
    theme: 'pirate',
    campaignFeats: ['Dark Bargain','Character Threads','Runestones'],
    toolNames: {123:'Herbalism Kit'},
    firstSession: 3,
    // Scheduled tasks (claude.ai) the ☰ menu fires through the Claude Code Remote connector:
    // pull = cloud run that fetches D&D Beyond and republishes this page (works from any device);
    // push = run on Menno's computer that types the change list into D&D Beyond in Chrome, then fires pull.
    sync: { pullTask: 'trig_01WtKZtbgk1SGk3XhzzY96sY', pushTask: 'trig_01ESAWjHqDuQbs2JQuXe7awZ' },
    tabs: [['combat','Combat','⚔️'],['combos','Combos','💥'],['stats','Stats','📊'],['gear','Gear','🎒'],['brew','Brew','🧪'],['traits','Traits','✨'],['grow','Grow','📈'],['notes','Notes','📜']],
    panels: { combos: combosPanel, brew: brewPanel, grow: growPanel },
    signatureWeapon: () => loadout().bow,
    combos, turnEconomy, attackNote, weaponTip, gearExtras,
    backgroundBlurb: () => 'Trained for war as soon as you reached adulthood. Gave you <button type="button" class="term" data-term="Athletics">Athletics</button>, <button type="button" class="term" data-term="Intimidation">Intimidation</button>, a <button type="button" class="term" data-term="Dice Set">dice set</button> and <button type="button" class="term" data-term="Savage Attacker">Savage Attacker</button>.',
    abilityUse, profInfo, glossary
  };
})();
