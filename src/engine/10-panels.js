/* ============================================================================
   §10 PANELS — the Combos, Stats and Combat tabs, the Notes tab's change list, and Action Resources (pips, pools)
   Defines: classEmo(), combosPanel / paintCombos, statsCards / skillsCard (also the desktop sidebars), throwHtml(),
   weaponCard / combatPanel / paintCombat, favourite attacks, autoEconomy(), TRACKED / baseline / changes() (the
   change list), pipsHtml(), useBlock / paintUse (trackers in bubbles), HAS_ARROWS, resHtml / paintRes, comboCard().
   Relies on: DATA, D, RES, resBy, MODS, USE_RES, WORD, ADDED, ddbQty, FIRST_NAME, esc, $ (§2), S, ui, saveUi, VIEW,
   DB, COINS, ARROW_N, freshState (§3), §4 deskFine / reduceMotion, §5 dmgTag, §8b spell helpers, §9 combos / SIG_W.
   At run time: linkify / decorate / G (§16), applySecOrder (§14), bindDragList (§18), syncTableHtml (§21) and the
   item helpers in §11. paintRes() is the usual "something changed" repaint: it also repaints the change list, vitals,
   ammo and the Spells tab. TRACKED and HAS_ARROWS are worked out from RES / DATA as this file loads.
   ============================================================================ */
// ability key → "STR"
const abbr = a => a.toUpperCase();
const CLASS_EMOJI = {Fighter:'⚔️', Rogue:'🗡️', Barbarian:'🪓', Bard:'🎻', Cleric:'✝️', Druid:'🌿', Monk:'👊', Paladin:'🛡️', Ranger:'🏹', Sorcerer:'🔥', Warlock:'👁️', Wizard:'🧙', Artificer:'⚙️'};
// emoji for a class (🎖️ for any other)
const classEmo = name => CLASS_EMOJI[name] || '🎖️';

// ── Combos tab ─────────────────────────────────────────────────────────────────────────────────────────────
// Favourite combos by id (ui.cbFav, this device). Automatic combo ids describe the role (auto-rider, auto-b-heal…),
// not the spell, so swapping a spell keeps the star; older per-spell auto-b-… ids are mapped onto the two roles.
const cbFavs = () => Array.isArray(ui.cbFav) ? [...new Set(ui.cbFav.map(id => /^auto-b-(?!heal$|other$)/.test(id) ? (/heal/.test(id) ? 'auto-b-heal' : 'auto-b-other') : id))] : [];
// star or unstar a combo and repaint the Combos tab
function toggleCbFav(id){ const f = cbFavs().slice(), i = f.indexOf(id); if (i < 0) f.push(id); else f.splice(i, 1); ui.cbFav = f; saveUi(); paintCombos(); }
// Combos tab: ⭐ favourites on top (starred order, drag to reorder), then the pack's own layout (PACK.panels.combos,
// sections and extra cards) or a plain list of combo cards
function combosPanel(){
  const all = combos(), favs = cbFavs().map(id => all.find(c => c.id === id)).filter(Boolean);
  const favSec = favs.length ? '<section class="card sechead"><h2><span class="emo" aria-hidden="true">⭐</span>Favourites'+(favs.length > 1 ? '<span class="qrdraghint">'+(deskFine() ? 'drag to reorder' : 'hold and drag to reorder')+'</span>' : '')+'</h2></section>'
    + '<div class="combos cbfavlist">'+favs.map(comboCard).join('')+'</div>' : '';
  // with favourites on top, the plain list gets its own heading so both read as sections (a pack layout brings its own)
  const allHead = favs.length ? '<section class="card sechead"><h2><span class="emo" aria-hidden="true">💥</span>All combos</h2></section>' : '';
  return favSec + (PACK.panels && PACK.panels.combos ? PACK.panels.combos() : allHead+'<div class="combos">'+all.map(comboCard).join('')+'</div>');
}
// repaint the Combos tab in place, keeping the scroll position
function paintCombos(){ const el = document.querySelector('[data-panel="combos"]'); if (!el) return; const y = window.scrollY; el.innerHTML = combosPanel(); linkify(el); decorate(el); window.scrollTo(0, y); }
// ── Stats tab ──────────────────────────────────────────────────────────────────────────────────────────────
// an emoji per ability (the same set as CHECK_ABIL_EMOJI, §7)
const ABIL_EMO = {str:'💪', dex:'🤸', con:'❤️', int:'🧠', wis:'🦉', cha:'🎭'};
// six ability tiles: roll bonus big (brass, like dice), score small in its own pill; each opens its glossary bubble
function abilitiesHtml(){
  return '<div class="abil">' + ['str','dex','con','int','wis','cha'].map(a =>
    '<button class="ab tile" data-term="'+esc(ABIL_NAME[a])+'" aria-label="'+esc(ABIL_NAME[a])+' '+sgn(D.mod[a])+', explain"><div class="k"><span class="ae" aria-hidden="true">'+ABIL_EMO[a]+'</span>'+esc(ABIL_NAME[a])+'</div><div class="m">'+sgn(D.mod[a])+'<small>roll bonus</small></div><div class="s">'+D.score[a]+'<small>score</small></div></button>').join('') + '</div>';
}
// a small d20 outline for roll pills and their legend
const D20 = '<svg class="d20" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2.2l8.5 4.9v9.8L12 21.8l-8.5-4.9V7.1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 7.5l4.3 7.6H7.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
// small d20 roll button next to a save or skill (attr = its data-save / data-skill attribute)
const rollPill = (attr, label, bonus) => '<button class="rollpill" '+attr+' aria-label="Roll '+esc(label)+' '+sgn(bonus)+'">'+D20+'<span>'+sgn(bonus)+'</span></button>';
// saving throw rows (dot = proficient), with any save notes (Brave) under them
function savesHtml(){
  return '<div class="list">' + D.saves.map(s => '<div class="row"><span class="dot '+(s.prof?'p':'')+'"></span><span class="nm"><button class="term" data-term="'+esc(s.name)+'">'+esc(s.name)+'</button></span>'+rollPill('data-save="'+s.a+'"', s.name+' save', s.bonus)+'</div>').join('') + '</div>'
    + '<p class="small muted" style="margin:8px 0 0">'+D20+' = roll bonus, tap to roll'+(D.saveNotes.length?'<br>'+esc(D.saveNotes.join(' · ')):'')+'</p>';
}
// skill rows (dot = proficient or expertise, then the ability) and the legend
function skillsHtml(){
  return '<div class="list">' + D.skills.map(s => '<div class="row"><span class="dot '+(s.exp?'e':s.prof?'p':'')+'"></span><span class="ab3">'+abbr(s.a)+'</span><span class="nm"><button class="term" data-term="'+esc(s.name)+'">'+esc(s.name)+'</button></span>'+rollPill('data-skill="'+esc(s.name)+'"', s.name, s.bonus)+'</div>').join('') + '</div>'
   + '<p class="small muted" style="margin:8px 0 0"><span class="dot p" style="display:inline-block"></span> <button type="button" class="term" data-term="Proficient">proficient</button> &nbsp; <span class="dot e" style="display:inline-block"></span> <button type="button" class="term" data-term="Expertise">expertise</button><br>'+D20+' = roll bonus, tap to roll</p>';
}
// passive Perception, Investigation and Insight
function sensesHtml(){
  return '<dl class="kv"><dt>Passive Perception</dt><dd class="num">'+D.passive.perception+'</dd><dt>Passive Investigation</dt><dd class="num">'+D.passive.investigation+'</dd><dt>Passive Insight</dt><dd class="num">'+D.passive.insight+'</dd></dl>';
}
// armour, weapon, tool and language proficiencies; each one opens its glossary bubble (§16)
function profsHtml(){
  const p = D.profs;
  const t = (label, key) => '<button type="button" class="term" data-term="'+esc(key||label)+'">'+esc(label)+'</button>';
  const list = arr => arr.length ? arr.join(', ') : '—';
  return '<dl class="kv"><dt>Armour</dt><dd>'+list(p.armor.map(x => t(x, x==='Shields' ? 'Shields' : x+' armour')))+'</dd>'
    + '<dt>Weapons</dt><dd>'+list(p.weapons.map(x => t(x, x+' weapons')))+'</dd>'
    + '<dt>Tools</dt><dd>'+list(p.tools.map(x => t(x, profKey(x))))+'</dd>'
    + '<dt>Languages</dt><dd>'+list(p.langs.map(x => t(x, profKey(x))))+'</dd></dl>'
    + '<p class="small muted" style="margin:8px 0 0">Tap any proficiency for what it lets you do.</p>';
}
// Stats tab left column (also the desktop sidebar)
const statsCards = () =>
  '<section class="card"><div class="cardhead"><h2><span class="emo" aria-hidden="true">💪</span>Abilities</h2><span class="small muted">tap for details</span></div>'+abilitiesHtml()+'</section>'
  + '<section class="card"><h2><span class="emo" aria-hidden="true">🛡️</span>Saving throws</h2>'+savesHtml()+'</section>'
  + '<section class="card"><h2><span class="emo" aria-hidden="true">👁️</span>Senses</h2>'+sensesHtml()+'</section>'
  + '<section class="card"><h2><span class="emo" aria-hidden="true">🎓</span>Proficiencies</h2>'+profsHtml()+'</section>';
// Stats tab skills card (also the desktop sidebar)
const skillsCard = () => '<section class="card"><h2><span class="emo" aria-hidden="true">🎲</span>Skills</h2>'+skillsHtml()+'</section>';

// ── Combat tab: attacks ────────────────────────────────────────────────────────────────────────────────────
// What to throw at the table, from "1d8+3 + 2d6": big dice, smaller flat bonus, "+" between the parts. A part that
// isn't dice ("1d6 ×2" is fine) is shown as plain text.
function throwHtml(str){
  return String(str).split(/\s\+\s/).map(part => {
    const m = part.trim().match(/^(\d*d\d+)\s*([+−-]\s*\d+)?\s*(×\d+)?$/);
    if (!m) return '<span class="throw"><span class="tbon">'+esc(part)+'</span></span>';
    return '<span class="throw"><span class="dice tdie">'+m[1]+'</span>'+(m[2]?'<span class="tbon">'+esc(m[2].replace(/\s/g,''))+'</span>':'')+(m[3]?'<span class="tbon">'+m[3]+'</span>':'')+'</span>';
  }).join('<span class="tplus">+</span>');
}
// one weapon on the Combat tab: star, name, 🎲 Attack, range, hit, damage, mastery (or an unpicked one, greyed)
// and properties, then the pack's weaponTip if it has one
function weaponCard(w){
  const m = w.mastery ? '<span class="chip">'+esc(w.mastery)+'</span>' : (w.masteryOnItem ? '<span class="chip ghost" title="Pick this weapon as a mastery to use it">'+esc(w.masteryOnItem)+': not picked</span>' : '');
  const row = (lbl, thr, meta) => '<span class="wl">'+lbl+'</span><span class="wt">'+thr+'</span><span class="wm">'+(meta||'')+'</span>';
  return '<div class="atk '+(isFav(w.name)?'hero':'')+'">'+favBtn(w.name)+'<div class="atkhead"><div class="t">'+esc(w.name)+(w.equipped?'':' <span class="small muted">(spare)</span>')+'</div><button class="btn primary go atkbtn" data-hit="'+esc(w.name)+'">🎲 Attack</button></div>'
    + (w.range ? '<div class="small muted wrange">Range '+esc(w.range)+'</div>' : '')
    + '<div class="wgrid">'
    + row('To hit', throwHtml('d20'+sgn(w.hit)), '')
    + '<span class="wl">Damage</span><span class="wt">'+throwHtml(w.dice+sgn(w.dmgMod))+'</span><span class="wm">'+dmgTag(w.dmgType)+'</span>'
    + (w.versatile ? '<span class="wl">Two-handed</span><span class="wt">'+throwHtml(w.versatile+sgn(w.dmgMod))+'</span><span class="wm"></span>' : '')
    + '</div>'
    + '<div class="chips">'+m+w.props.map(p=>'<span class="chip ghost">'+esc(p)+'</span>').join('')+'</div>'
    + (PACK.weaponTip ? PACK.weaponTip(w) : '')
    + '</div>';
}
// Favourite attacks by name: outlined cards with a filled star (ui.favs, this device). Until you star or unstar
// one, it's the signature weapon (SIG_W, §9).
const favs = () => Array.isArray(ui.favs) ? ui.favs : (SIG_W ? [SIG_W.name] : []);
// is this attack starred?
const isFav = n => favs().includes(n);
// ☆ / ★ button on an attack card
const favBtn = n => '<button class="favbtn'+(isFav(n)?' on':'')+'" data-act="fav" data-k="'+esc(n)+'" aria-pressed="'+isFav(n)+'" aria-label="'+(isFav(n)?'Remove from':'Add to')+' favourites">'+(isFav(n)?'★':'☆')+'</button>';
// star or unstar an attack and repaint the Combat tab
function toggleFav(n){ const f = favs().slice(), i = f.indexOf(n); if (i < 0) f.push(n); else f.splice(i, 1); ui.favs = f; saveUi(); paintCombat(); }
// Attack list order: your own (ui.wOrder, this device), changed by dragging the cards or in ↕ Sections → Reorder.
// atkEdit = inline ▲ / ▼ arrows on each card. No button sends 'atkedit' any more, so it stays false.
let atkEdit = false;
// [name, card HTML] for the equipped weapons + the plain unarmed strike (when Martial Arts doesn't make it a weapon),
// in this device's saved order; names not in the saved order keep their place at the end
function atkItems(){
  const items = D.weapons.filter(w=>w.equipped).map(w => [w.name, weaponCard(w)])
    .concat(!D.unarmed ? [] : [[D.unarmed.name, '<div class="atk'+(isFav(D.unarmed.name)?' hero':'')+'">'+favBtn(D.unarmed.name)+'<div><div class="t">'+esc(D.unarmed.name)+'</div><div class="stats"><span>Hit <b>'+sgn(D.unarmed.hit)+'</b></span><span>Damage <b>'+D.unarmed.flat+'</b> bludgeoning</span></div></div></div>']]);
  const ord = ui.wOrder || [], pos = k => { const i = ord.indexOf(k); return i < 0 ? 999 : i; };
  return items.map((x,i)=>[x,i]).sort((a,b) => (pos(a[0][0]) - pos(b[0][0])) || (a[1]-b[1])).map(x=>x[0]);
}
// repaint the Combat tab in place (then Action Resources, the saved card order and the drag handles)
function paintCombat(){ const el = document.querySelector('[data-panel="combat"]'); if (!el) return; el.innerHTML = combatPanel(); linkify(el); decorate(el); paintRes(); applySecOrder(el); bindListDrags(); }
// drag to reorder: attack cards (Combat, not while the ▲ / ▼ arrows show), favourite combos (Combos) and favourite
// spells (Spells); each drop saves the new order and repaints that tab
function bindListDrags(){
  bindDragList(document.querySelector('[data-panel="combat"]'), 'atk', '.atklist > .atkdrag', r => r.dataset.key, order => { ui.wOrder = order; saveUi(); paintCombat(); }, () => atkEdit);
  bindDragList(document.querySelector('[data-panel="combos"]'), 'cbfav', '.cbfavlist > .combo', r => r.dataset.cb, order => {
    ui.cbFav = order.concat(cbFavs().filter(n => !order.includes(n))); saveUi(); paintCombos(); });
  bindDragList(document.querySelector('[data-panel="spells"]'), 'spfav', '.spfavlist > .spell', r => r.querySelector('.spstar').dataset.k, order => {
    ui.spFav = order.concat((ui.spFav||[]).filter(n => !order.includes(n))); saveUi(); paintSpells(); });
}
// Move an attack one place up (d = -1) or down (d = 1) and save the order: the ▲ / ▼ in ↕ Sections → Reorder (§14).
// The slide animation only finds a card while the inline arrows (atkEdit) show.
function moveAtk(k, d){
  const keys = atkItems().map(x=>x[0]), i = keys.indexOf(k), j = i + d; if (i < 0 || j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]]; ui.wOrder = keys; saveUi();
  const el = document.querySelector('.reordwrap[data-key="'+CSS.escape(k)+'"]'), y0 = el ? el.getBoundingClientRect().top : 0;
  paintCombat();
  const el2 = document.querySelector('.reordwrap[data-key="'+CSS.escape(k)+'"]');
  if (el2 && el2.animate && !reduceMotion()) { const dy = y0 - el2.getBoundingClientRect().top; el2.animate([{transform:'translateY('+dy+'px)'},{transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'}); el2.classList.add('moved'); setTimeout(()=>el2.classList.remove('moved'), 500); }
}
// ── Turn at a glance ───────────────────────────────────────────────────────────────────────────────────────
// "Turn at a glance" for any character, built from the sheet: attacks, spells by casting time, and D&D Beyond
// actions by activation type. Returns [tag, glossary term, [options…]] rows (Action, Bonus action, Reaction,
// Free). A pack's turnEconomy() replaces it with hand-written advice.
function autoEconomy(){
  const uniq = a => [...new Set(a.filter(Boolean))];
  const acts = t => uniq((DATA.actions||[]).filter(a => a.act === t).map(a => a.name.replace(/^Font of Magic: /,'')).filter(n => !/^Circle Spell:|^Create Spell Slot/.test(n)));
  const sp = (DATA.spells||[]).filter(x => x.prepared || x.always || !x.level);
  const cast = re => uniq(sp.filter(x => re.test(x.castTime||'')).sort((a,b) => (spIsFav(b.name)-spIsFav(a.name)) || a.level - b.level).map(x => x.name));
  const list = (pre, a, n) => a.length ? pre + a.slice(0, n).join(', ') + (a.length > n ? '…' : '') : '';
  const w = D.weapons.filter(x => x.equipped).sort((a,b) => (isFav(b.name)-isFav(a.name)))[0];
  const atkSp = cast(/action$/).filter(n => { const x = sp.find(y => y.name === n); return x && !x.level && (x.dmg||[]).length; });
  const ea = (DATA.classes||[]).some(c => /Fighter|Barbarian|Monk|Paladin|Ranger/.test(c.name) && c.level >= 5);
  return [
    ['A','Action', [w ? 'Attack: '+w.name.toLowerCase()+' '+sgn(w.hit)+(ea?' (×2 with Extra Attack)':'') : 'Attack',
      list('Cantrip: ', atkSp, 3), list('Cast a spell: ', cast(/1 action$/).filter(n => (sp.find(y => y.name === n)||{}).level > 0), 4), list('', acts(1), 3),
      'Dash, Disengage, Dodge, Help, Hide, Search']],
    ['B','Bonus action', [list('Cast: ', cast(/bonus action/), 5), list('', acts(3).filter(n => !/^Create Spell Slot/.test(n)), 4), 'Drink a potion']],
    ['R','Reaction', ['Opportunity attack when an enemy leaves your reach', list('Cast: ', cast(/reaction/), 4), list('', acts(4), 3)]],
    ['F','Free / once per turn', [list('', acts(2), 3), list('', uniq((DATA.actions||[]).filter(a => /^Metamagic/.test(a.name)).map(a => a.name.replace(/^Metamagic: /,''))).length ? ['Metamagic: '+uniq((DATA.actions||[]).filter(a => /^Metamagic/.test(a.name)).map(a => a.name.replace(/^Metamagic: /,''))).join(', ')] : [], 1),
      'Move up to '+D.speedM+' m, split around your action', 'Talk, or interact with one object']]
  ].map(([k,t,l]) => [k, t, l.filter(Boolean)]);
}
// Combat tab: the strip of active states (Rage…), attacks, the turn-at-a-glance card, and an empty #res card that
// paintRes() fills with Action Resources
function combatPanel(){
  const econ = PACK.turnEconomy ? PACK.turnEconomy() : autoEconomy();   // [tag, glossary term, [options…]] rows for the turn card
  return activeBar()+'<section class="card"><div class="cardhead"><h2><span class="emo" aria-hidden="true">🎯</span>Attacks</h2><span class="atktools"><button type="button" class="term modeinfo" data-term="Advantage">ⓘ Getting advantage</button></span></div><div class="atklist'+(atkEdit?' editing':'')+'">'
    + atkItems().map(([k, html], i, all) => atkEdit ? '<div class="reordwrap" data-key="'+esc(k)+'"><div class="reord"><button class="btn small" data-act="wmove" data-k="'+esc(k)+'" data-d="-1"'+(i?'':' disabled')+' aria-label="Move up">▲</button><button class="btn small" data-act="wmove" data-k="'+esc(k)+'" data-d="1"'+(i<all.length-1?'':' disabled')+' aria-label="Move down">▼</button></div>'+html+'</div>' : '<div class="atkdrag" data-key="'+esc(k)+'">'+html+'</div>').join('')
    + '</div>'+(PACK.attackNote ? '<p class="small muted" style="margin:10px 0 0">'+PACK.attackNote()+'</p>' : '')+'</section>'
    + '<section class="card"><h2><span class="emo" aria-hidden="true">🧭</span>'+WORD.turn+'</h2><div class="econ rows">' + econ.map(([k,t,l],i) => '<div class="ecr"><button class="tag term '+k+'" data-term="'+esc(t)+'"><span class="ecnum" aria-hidden="true">'+(i+1)+'</span>'+esc(t)+'</button><ul class="ecl">'+l.filter(Boolean).map(x=>'<li><span>'+esc(x)+'</span></li>').join('')+'</ul></div>').join('') + '</div></section>'
    + '<section class="card" id="res"></section>';
}
// ── Change list ────────────────────────────────────────────────────────────────────────────────────────────
// the parts of S the change list compares (every resource key included)
const TRACKED = ['hp','temp','insp',...RES.map(r => r.key),'spent','hd','coins'];
// the reference state that changes are measured against: the snapshot from the last Clear, else D&D Beyond's numbers
function baseline(){ return S.base || freshState(); }
// deep copy of the tracked parts of S, taken when you clear the change list (the caller stores it as S.base)
function snapshotBase(){ const b = {}; TRACKED.forEach(k => b[k] = JSON.parse(JSON.stringify(S[k]))); return b; }
// Every difference between S and the baseline, as a list of changes to make in D&D Beyond: HP, temp HP,
// inspiration, resources, items used, coins, hit dice, and items added here that D&D Beyond doesn't have yet.
function changes(){
  // each change: t (one line), where (how to enter it on D&D Beyond), and for the sync table: what, here (this sheet), ddb
  const f = baseline(), out = [], add = (t, where, what, here, ddb) => out.push({t, where, what, here: here == null ? '' : String(here), ddb: ddb == null ? '' : String(ddb)});
  if (S.hp !== f.hp) { const d = S.hp - f.hp; add('HP '+f.hp+' → '+S.hp+' (of '+D.hpMax+')', 'Tap Hit Points, enter '+Math.abs(d)+' and press '+(d<0?'Damage':'Heal'), 'Hit points', S.hp, f.hp); }
  if (S.temp !== f.temp) add('Temporary HP '+f.temp+' → '+S.temp, 'Hit Points panel → Temp HP: set to '+S.temp, 'Temporary HP', S.temp, f.temp);
  if (S.insp !== f.insp) add('Heroic Inspiration '+(S.insp?'gained':'used'), (S.insp?'Switch on':'Switch off')+' Inspiration at the top of the sheet', 'Heroic Inspiration', S.insp?'Yes':'No', f.insp?'Yes':'No');
  RES.forEach(r => { const a = f[r.key]||0, b = S[r.key]||0, where = r.ddb || ('Actions → '+r.name); if (a === b) return;
    if (r.pool) add(r.name+' '+(r.max-a)+' → '+(r.max-b)+' points left (of '+r.max+')', where+': '+(r.max-b)+' points left ('+b+' used)', r.name, (r.max-b)+' of '+r.max+' left', (r.max-a)+' of '+r.max+' left');
    else if (r.max === 1) add(r.name+' '+(b>a?'spent':'recovered'), where+': '+(b?'tick':'untick')+' the box', r.name, b?'Used':'Ready', a?'Used':'Ready');
    else add(r.name+' spent '+a+' → '+b+' (of '+r.max+')', where+': '+b+' box'+(b===1?'':'es')+' ticked', r.name, b+' of '+r.max+' used', a+' of '+r.max+' used'); });
  const newOnly = n => !ddbQty(n) && ADDED.some(x => x.inv.name === n);   // counted here, but D&D Beyond doesn't list it yet: the Add line covers it
  const sp0 = f.spent||{}, sp1 = S.spent||{};
  new Set([...Object.keys(sp0), ...Object.keys(sp1)]).forEach(n => { const a = sp0[n]||0, b = sp1[n]||0; if (a === b || newOnly(n)) return;
    if (n==='Ball Bearings') add('Ball Bearings '+(b?'spilled':'picked back up'), 'Inventory → Ball Bearings: '+(b?'remove the bag':'keep the bag'), 'Ball Bearings', b?'Spilled':'In the bag', a?'Spilled':'In the bag');
    else { const q = invQty(n); add(n+' '+(q-a)+' → '+(q-b), 'Inventory → '+n+': quantity '+(q-b), n, q-b, q-a); } });
  COINS.forEach(([k,n]) => { const a = f.coins[k]||0, b = S.coins[k]||0; if (a !== b) add(n+' '+a+' → '+b+' ('+sgn(b-a)+' '+k+')', 'Inventory → Currency: set '+n+' to '+b, n, b+' '+k, a+' '+k); });
  D.hitDice.forEach(h => { const a = f.hd[h.cls]||0, b = S.hd[h.cls]||0; if (a !== b) add(h.cls+' hit dice spent '+a+' → '+b+' (of '+h.total+' '+h.die+')', 'Short Rest → '+h.cls+' '+h.die+': '+b+' used', h.cls+' hit dice ('+h.die+')', b+' of '+h.total+' used', a+' of '+h.total+' used'); });
  ADDED.filter(x => !x.entered).forEach(x => { let i = x.inv;
    const q = !ddbQty(i.name) && (S.spent||{})[i.name] ? itemLeft(i.name) : i.qty;   // used or topped up at the table before it's in D&D Beyond
    if (q < 1) return;
    i = Object.assign({}, i, {qty: q});
    add('Add '+(i.qty>1 ? i.qty+'× ' : '')+i.name, 'Inventory → Add Items → search “'+(x.find||i.name)+'”'+(x.pick ? ', pick '+x.pick : '')+(i.qty>1 ? ', quantity '+i.qty : '')+(i.equipped ? ', add it and tick Equipped' : ', add it'), i.name, i.qty+' (added here)', 'not there yet'); });
  return out;
}
// the change list as plain text, for the Copy button
function changesText(){
  const when = new Date(S.base ? S.baseAt : DATA.syncedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return DATA.name+', changes to enter in D&D Beyond (since '+(S.base?'last cleared':'sync')+', '+when+'):\n' + changes().map(x=>'- '+x.t+'\n    → '+x.where).join('\n');
}
// the change list card on the Notes tab (Copy, Clear and the table), or a one-line "matches D&D Beyond"
function changesHtml(){
  const c = changes();
  if (!c.length) return '<div class="changes ok"><span class="dot p"></span><span>'+WORD.clean+' Matches D&amp;D Beyond, nothing to enter.</span></div>';
  return '<div class="changes"><div class="cardhead" style="margin-bottom:6px"><h3><span class="emo" aria-hidden="true">📝</span>To enter in D&amp;D Beyond <span class="chip brass">'+c.length+'</span></h3><div class="chbtns"><button class="btn small" data-act="copychanges">Copy</button><button class="btn small" data-act="clearchanges">Clear</button></div></div>'
    // the same table as the Sync with D&D Beyond window (§21): what, this sheet, D&D Beyond, and where to change it
    + syncTableHtml(c)
    + '<p class="small muted" style="margin:6px 0 0">'+(window.SHEET ? 'Change these on D&amp;D Beyond (website or app), then tap Clear. Syncing with D&amp;D Beyond clears the list too.'
      : 'Enter these in the D&amp;D Beyond app, then tap Clear. Syncing clears the list too. Or tell Claude “push '+esc(FIRST_NAME)+'”.')+'</p></div>';
}
// repaint the change list (save() calls this on every change)
function paintChanges(){ const n = $('#notechanges'); if (n) { n.innerHTML = changesHtml(); } }

// ── Usage pips and trackers ────────────────────────────────────────────────────────────────────────────────
// Which pips are spent (true = spent). Only the pip you tap changes, so the layout is remembered per tracker
// (ui.pipMask, this device; not saved here); when the count changes elsewhere (a rest, the tooltip, a sync) pips
// change from the end to match.
function pipMask(key, max, used){
  const all = ui.pipMask || (ui.pipMask = {});
  let m = Array.isArray(all[key]) && all[key].length === max ? all[key].slice() : Array.from({length:max}, (_, i) => i >= max - used);
  let n = m.filter(Boolean).length;
  for (let i = max - 1; n > used && i >= 0; i--) if (m[i]) { m[i] = false; n--; }
  for (let i = max - 1; n < used && i >= 0; i--) if (!m[i]) { m[i] = true; n++; }
  all[key] = m; return m;
}
// usage pips (✓ ready, ✕ spent, in pipMask's layout) with an "n of m left" label; tap one to flip it (data-pip, §20)
function pipsHtml(max, used, key){ const left = max - used;
  return '<div class="pipwrap"><div class="pips">'+pipMask(key, max, used).map((u,i)=>{ const ready = !u;
    return '<button class="pip '+(ready?'ready':'used')+'" data-pip="'+key+'" data-i="'+i+'" data-r="'+(ready?1:0)+'" aria-label="'+key+' use '+(i+1)+(ready?' (ready, tap to spend)':' (spent, tap to restore)')+'">'+(ready?'✓':'✕')+'</button>'; }).join('')+'</div>'
    + '<span class="piplbl'+(left?'':' none')+'">'+(left?left+' of '+max+' left':'all used')+'</span></div>';
}
// The usage tracker shown inside a glossary bubble or drawer for a feature with limited uses (Second Wind, Action
// Surge…, via USE_RES), with its button when the term is the resource itself; Heroic Inspiration gets a toggle.
// '' for terms without one.
function useBlock(term){
  if (term==='Heroic Inspiration') return '<div class="binv buse" data-use="'+esc(term)+'"><span><b>'+(S.insp?'⭐ You have it':'⭐ None right now')+'</b></span><button class="btn small" data-act="insptoggle">'+(S.insp?'Used it':'Gained one')+'</button></div>';
  const k = USE_RES[term], r = k && resBy(k);
  if (!r) return '';
  return '<div class="binv buse" data-use="'+esc(term)+'"><span class="ulb"><b>🔋 Uses</b>'+(r.die?' <span class="small">('+r.die+')</span>':'')+'</span>'+pipsHtml(r.max, S[k], k)
    + (r.button && term===r.name ? '<button class="btn primary rollbtn" data-act="'+r.button.act+'"'+(S[k]>=r.max?' disabled':'')+'>'+(r.button.use||r.button.label)+'</button>' : '') + '</div>';
}
// refresh every usage tracker on screen (in open bubbles and drawers)
function paintUse(){ document.querySelectorAll('[data-use]').forEach(el => { const n = useBlock(el.dataset.use); if (n) el.outerHTML = n; }); }
// ── Action Resources card ──────────────────────────────────────────────────────────────────────────────────
// arrows only matter for characters who carry them or wield a bow (addedChanged, §11, can turn it on, never off)
let HAS_ARROWS = (DATA.inventory||[]).some(i => /Arrow/.test(i.name)) || D.weapons.some(w => /bow\b/i.test(w.name) && !/crossbow/i.test(w.name));
// Action Resources card (the inside of #res): every non-spell resource (pips, a points pool, buttons, on/off toggle),
// arrows, healing potions, hit dice, and the Short / Long rest buttons. The corner says where the tracker is kept.
function resHtml(){
  const pips = pipsHtml;
  // − / + for an inventory count (arrows, potions): moves S.spent for that item
  const stepper = (item, label) => '<div class="stepper"><button class="iconbtn" data-inv="'+esc(item)+'" data-d="-1" aria-label="One less '+label+'">−</button><output class="num" data-invn="'+esc(item)+'">'+itemLeft(item)+'</output><button class="iconbtn" data-inv="'+esc(item)+'" data-d="1" aria-label="One more '+label+'">+</button></div>';
  return '<div class="cardhead"><h2><span class="emo" aria-hidden="true">⏳</span>Action Resources</h2><span class="small muted">'+(VIEW ? '👀 their tracker, live' : DB ? 'saved to your account' : 'tracked on this device')+'</span></div><div class="res">'
    + RES.filter(x => !x.spell).map(x => '<div class="resrow'+(x.toggle && S.active[x.key] ? ' on' : '')+(x.buttons || x.pool ? ' wide' : '')+'"><div><b>'+esc(x.name)+'</b>'+((x.chip||x.die) ? ' <span class="chip brass">'+esc(x.chip||x.die)+'</span>' : '')
        + (x.toggle && S.active[x.key] ? ' <span class="chip onchip">'+esc(x.toggle.onChip)+'</span>' : '')+'<div class="small muted">'+(x.toggle && S.active[x.key] ? x.toggle.onDesc : x.desc)+'</div></div>'
        + '<div class="rctl'+(x.button || x.buttons || x.toggle ? ' col' : '')+'">'+resButtons(x)+(x.pool ? poolCtl(x) : pips(x.max,S[x.key],x.key))+'</div></div>').join('')
    + (HAS_ARROWS ? '<div class="resrow"><div><b>Arrows</b><div class="small muted">Recover half after a fight (1 minute).</div></div><div class="rctl">'+stepper(ARROW_N,'arrow')+'</div></div>' : '')
    + potionNames().map(n => '<div class="resrow"><div><b>'+esc(n)+'</b><div class="small muted">'+potionDice(n)+'. Bonus action: drink it yourself or give it to an ally within 1.5 m.</div></div><div class="rctl col"><button class="btn primary actbtn" data-act="useitem" data-item="'+esc(n)+'" data-invbtn="'+esc(n)+'"'+(itemLeft(n)?'':' disabled')+'>🧪 Drink</button>'+stepper(n, 'potion')+'</div></div>').join('')
    + '<div class="resrow"><div><b>Hit dice</b><div class="small muted">Your healing dice for short rests: each heals the roll '+sgn(D.mod.con)+'.</div></div><div class="rctl col">'+D.hitDice.slice().sort((x,y)=> +y.die.slice(1) - +x.die.slice(1)).map(h=>diePips(h, h.die)).join('')+'</div></div>'
    + '<div class="rest"><button class="btn" data-act="rest" data-rest="short">⛺ Short rest</button><button class="btn" data-act="rest" data-rest="long">🌙 Long rest</button><span class="small muted" id="restmsg"></span></div></div>';
}
// On/off states that are on right now (Rage, or states a module's actives() lists, like Sacred Weapon), as cards on
// top of the Combat tab, each with its off button
function activeBar(){
  const on = RES.filter(r => r.toggle && S.active[r.key]).map(r => ({key:r.key, chip:r.toggle.onChip, off:r.toggle.off, desc:r.toggle.onDesc}))
    .concat(MODS.flatMap(m => m.actives ? m.actives(D) : []).filter(a => a && S.active[a.key]));   // states a resource button switched on (Sacred Weapon)
  if (!on.length) return '';
  return on.map(a => '<section class="card activebar"><div class="cardhead"><h2>'+a.chip+'</h2><button class="btn small" data-act="resoff" data-k="'+a.key+'">'+a.off+'</button></div><p class="small" style="margin:0">'+a.desc+'</p></section>').join('');
}
// A resource's quick buttons: an on/off switch (Rage), a row of spend buttons (Focus: Flurry…) with their cost, or a
// single module button. Disabled when there's not enough left (or a button's when() says no).
function resButtons(x){
  if (x.toggle) return S.active[x.key] ? '<button class="btn actbtn" data-act="resoff" data-k="'+x.key+'">'+x.toggle.off+'</button>'
    : '<button class="btn primary actbtn" data-act="reson" data-k="'+x.key+'"'+(S[x.key]>=x.max?' disabled':'')+'>'+x.toggle.on+'</button>';
  if (x.buttons) return '<div class="resbtns">'+x.buttons.map((b,i) => '<button class="btn small actbtn'+(i?'':' primary')+'" data-act="resbtn" data-k="'+x.key+'" data-i="'+i+'"'+(x.max - S[x.key] < (b.n||0) || (b.when && !b.when()) ? ' disabled' : '')+' title="'+esc(b.tip||'')+'">'+b.label+(b.n ? ' <span class="cost">'+b.n+'</span>' : '')+'</button>').join('')+'</div>';
  return x.button ? '<button class="btn primary actbtn" data-act="'+x.button.act+'" '+(S[x.key]>=x.max?'disabled':'')+'>'+x.button.label+'</button>' : '';
}
// A pool of points (Lay on Hands): spend 1 or 5, give 1 back
function poolCtl(x){
  const left = x.max - S[x.key];
  return '<div class="pool"><button class="iconbtn" data-pool="'+x.key+'" data-d="-5" aria-label="Spend 5 points"'+(left<5?' disabled':'')+'>−5</button><button class="iconbtn" data-pool="'+x.key+'" data-d="-1" aria-label="Spend 1 point"'+(left<1?' disabled':'')+'>−1</button>'
    + '<output class="num"><b>'+left+'</b><small>/'+x.max+'</small></output><button class="iconbtn" data-pool="'+x.key+'" data-d="1" aria-label="Give 1 point back"'+(left>=x.max?' disabled':'')+'>+1</button></div>'
    + '<span class="piplbl'+(left?'':' none')+'">'+(left ? left+' of '+x.max+' points left' : 'pool empty')+'</span>';
}
// The usual repaint after S changes: Action Resources, the change list, the vitals row, ammo and the Spells tab.
// (Trackers in open bubbles repaint with paintUse().)
function paintRes(){ const el = $('#res'); if (el) { el.innerHTML = resHtml(); linkify(el); decorate(el); } paintChanges(); paintVitals(); paintAmmo(); paintSpells(); }

// ── Combo cards ────────────────────────────────────────────────────────────────────────────────────────────
// one combo card: star, title, 🎲 Roll (when it has attacks to roll), when to use it, steps tagged A/B/F/M/R (each tag
// a glossary term), and the damage throw
function comboCard(cb){
  const fav = cbFavs().includes(cb.id);
  return '<section class="card combo'+(fav?' fav':'')+'" data-cb="'+esc(cb.id)+'"><div class="cardhead" style="margin:0"><h3><button class="spstar'+(fav?' on':'')+'" data-act="cbfav" data-k="'+esc(cb.id)+'" aria-pressed="'+fav+'" aria-label="'+(fav?'Remove from':'Add to')+' favourites">'+(fav?'★':'☆')+'</button> '+esc(cb.title)+'</h3>'+(cb.roll ? '<button class="btn primary" data-combo="'+cb.id+'">🎲 Roll</button>' : '')+'</div>'
    + '<div class="why">'+esc(cb.when)+'</div><ol class="steps">'+cb.steps.map(([k,t,btn])=>'<li'+(btn?' class="hasbtn"':'')+'><button class="tag term '+k+'" data-term="'+({A:'Action',B:'Bonus action',F:G['Free']?'Free':'Free / once per turn',M:'Move',R:'Reaction'})[k]+'">'+({A:'Action',B:'Bonus',F:'Free',M:'Move',R:'Reaction'})[k]+'</button><span>'+esc(t)+'</span>'+(btn||'')+'</li>').join('')+'</ol>'
    + (cb.formula ? '<div class="dmg"><span class="dmgthrow">'+throwHtml(cb.formula)+'</span></div>' : '')+'</section>';
}

