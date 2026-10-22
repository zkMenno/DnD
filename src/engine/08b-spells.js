/* ============================================================================
   §8b SPELLS — the Spells tab: casting numbers, slots, the spell list, and casting through the roll flow
   ============================================================================ */
const SPELL_W = {};   // spell attacks, set up as weapons for the hit → damage flow
// feet → metres (5 ft = 1.5 m)
const ftM = ft => Math.round(ft/5*1.5*10)/10;
// dice for a spell at a slot level (or the character level, for cantrips): "8d6" + upcast dice
function spellDice(g, sp, lvl){
  if (!g || !g.dice) return null;
  const p = parseDice(g.dice), flat = +((String(g.dice).match(/[+-]\d+$/)||[0])[0]);
  let n = p.n, d = p.d;
  if (sp.scale === 'characterlevel') { const step = (g.up||[]).filter(([l]) => l <= D.totalLevel).pop(); if (step) { const q = parseDice(step[1]); n = q.n; d = q.d || d; } }
  else if ((g.up||[]).length && lvl > sp.level) { const q = parseDice(g.up[0][1]); n += q.n * Math.floor((lvl - sp.level) / (g.up[0][0] || 1)); }
  return {n, d, flat};
}
// {n, d, flat} → "2d8+3"
const diceTxt = x => x ? x.n+'d'+x.d+(x.flat ? sgn(x.flat) : '') : '';
// how many beams / darts / rays a spell makes at this level
function spellCount(sp, lvl){
  const base = ({'Magic Missile':3, 'Scorching Ray':3})[sp.name] || 1, ex = sp.extra || [];
  if (!ex.length) return base;
  if (sp.scale === 'characterlevel') return base + Math.max(0, ...ex.filter(([l]) => l <= D.totalLevel).map(([,v]) => v));
  return base + (lvl > sp.level ? (ex[0][1]||1) * Math.floor((lvl - sp.level) / (ex[0][0] || 1)) : 0);
}
// what one of a spell's multiple attacks is called (beam, ray, dart)
const spellWord = sp => ((sp.extra||[])[0]||[])[2] || 'beam';
// short lines about a spell: what it costs, how far, what you roll
function spellMeta(sp){
  const rng = sp.origin==='Touch' ? 'Touch' : sp.origin==='Self' && !sp.range ? 'Self' : sp.range ? ftM(sp.range)+' m' : sp.origin||'';
  const aoe = sp.aoe ? sp.aoe[0]+' '+ftM(sp.aoe[1])+' m' : '';
  return [sp.castTime, rng, aoe, sp.duration && !/^Instant/.test(sp.duration) ? sp.duration.replace(/Minute/,'min').replace(/Hour/,'h') : ''].filter(Boolean).join(' · ');
}
// a spell's dice line for the spell list (damage or healing at its base level)
function spellRollLine(sp){
  const st = spellStats(sp), out = [];
  if (sp.attack) out.push('To hit d20 '+sgn(st.atk)+(spellCount(sp, sp.level) > 1 ? ' × '+spellCount(sp, sp.level) : ''));
  if (sp.save) out.push('DC '+st.dc+' '+ABIL[sp.save-1].toUpperCase()+' save');
  const groups = spellGroups(sp, sp.level);
  if (groups.length) out.push(groups.map(g => diceTxt(g.x)+(g.mod ? sgn(g.mod) : '')+' '+(g.heal ? '💚' : g.type.split(' / ').map(t => dmgIcon(t)).join(''))+' '+(g.type||'')).join(' + ')+(groups[0].heal ? ' healing' : ''));
  return out.join(' · ');
}
// the dice groups a spell rolls: damage types (one roll when the options share a die, e.g. Chromatic Orb), or healing
function spellGroups(sp, lvl){
  const st = spellStats(sp), times = sp.attack ? 1 : spellCount(sp, lvl);
  if (sp.heal) { const x = spellDice(sp.heal, sp, lvl); return x ? [{x, mod: sp.heal.mod ? st.mod : 0, type:'', heal:true}] : []; }
  const ds = sp.dmg || [];
  if (!ds.length) return [];
  const same = ds.every(g => g.dice === ds[0].dice);
  const agon = sp.name === 'Eldritch Blast' && (DATA.maneuvers||[]).some(m => /^Agonizing Blast/.test(m.name)) ? st.mod : 0;
  return (same ? [ds[0]] : ds).map((g, i) => { const x = spellDice(g, sp, lvl); if (x && times > 1) { x.n *= times; x.flat *= times; }
    return {x, mod: i === 0 ? agon : 0, type: same ? ds.map(z => z.type).join(' / ') : g.type}; }).filter(g => g.x);
}
// Concentration on the Spells tab. Concentrating: a banner with the spell, how long it lasts, a CON save button for when
// you take damage, End and Change. Not concentrating (or Change): your concentration spells as cards in a fold-out list,
// for a spell cast earlier or tracked at the table; casting one sets it too. Rage (or anything with noSpells) locks it.
let concOpen = false;
function concBox(sp){
  const list = sp.filter(x => x.conc), lock = RES.find(r => r.toggle && r.toggle.noSpells && S.active[r.key]);
  if (!list.length && !S.conc) return '';
  const cur = S.conc ? spellBy(S.conc) : null, con = D.saves.find(x => x.a === 'con');
  const dur = x => x && x.duration && !/^Instant/.test(x.duration) ? 'up to '+x.duration.toLowerCase().replace(/^(\d+) (minute|hour|day|round)s?$/, (_, n, u) => n+' '+u+(+n > 1 ? 's' : '')) : '';
  const opt = x => '<button class="concopt'+(S.conc === x.name ? ' on' : '')+'" data-act="concset" data-k="'+esc(x.name)+'" aria-pressed="'+(S.conc === x.name)+'"'+(lock ? ' disabled' : '')+'>'
    + '<span class="cic" aria-hidden="true">'+spellIcon(x)+'</span><span class="ctx"><b>'+esc(x.name)+'</b><span class="small muted">'+[x.level ? ORD(x.level)+' level' : 'Cantrip', dur(x), x.from && !/^(class|race|feat|item|background)$/.test(x.from) ? x.from : ''].filter(Boolean).join(' · ')+'</span></span>'
    + (S.conc === x.name ? '<span class="cchk" aria-hidden="true">✓</span>' : '')+'</button>';
  const picker = '<div class="concopts">'+list.map(opt).join('')+'</div>';
  // the list folds away; this button opens and closes it (▾ / ▴)
  const toggle = label => list.length ? '<button class="btn small concopen'+(concOpen ? ' open' : '')+'" data-act="concopen" aria-expanded="'+concOpen+'">'+(concOpen ? 'Close' : label)+' <span class="cchev" aria-hidden="true">▾</span></button>' : '';
  if (S.conc) return '<div class="concbox on">'
    + '<div class="concnow"><span class="cbrain" aria-hidden="true">🧠</span><div class="ctx"><span class="eyebrow">Concentrating on</span><b class="cname">'+esc(S.conc)+'</b>'
    + '<span class="small muted">'+[dur(cur), 'a CON save when you take damage: DC 10 or half the damage'].filter(Boolean).join(' · ')+'</span></div></div>'
    + '<div class="concact">'+toggle('🔁 Change')+'<span class="concr">'
    + '<button class="btn small primary" data-save="con">🎲 CON save '+sgn(con.bonus)+'</button><button class="btn small" data-act="concend">End</button></span></div>'
    + (concOpen ? picker : '')+'</div>';
  return '<div class="concbox">'
    + '<div class="concnow off"><span class="cbrain" aria-hidden="true">🧠</span><div class="ctx"><b class="cname">Not concentrating</b>'
    + '<span class="small muted">'+(lock ? esc(lock.name)+' is on: no concentration until it ends.' : 'Casting a 🧠 spell sets it. Holding one from earlier? Pick it.')+'</span></div>'
    + (lock ? '' : toggle('🧠 Pick a spell'))+'</div>'
    + (concOpen && !lock ? picker : '')+'</div>';
}
// Spells tab: casting numbers, slots, filters and the spell list by level
function spellsPanel(){
  const sp = (DATA.spells||[]).filter(x => x.prepared);
  if (!sp.length) return '<section class="card"><h2><span class="emo" aria-hidden="true">🪄</span>Spells</h2><p class="small muted">No spells on the D&amp;D Beyond sheet yet.</p></section>';
  const casting = '<section class="card"><div class="cardhead"><h2><span class="emo" aria-hidden="true">🪄</span>Spellcasting</h2><button type="button" class="term hovertip" data-term="Concentration">🧠 Concentration</button></div>' + concBox(sp)
    + '<div class="castgrid">'+Object.values(SPELL.casters.reduce((g,c) => { const k = c.ab+c.atk; (g[k] = g[k] || {...c, list:[]}).list.push(c.cls); return g; }, {})).map(c => '<div class="caster"><b>'+c.list.map(n => classEmo(n)+' '+esc(n)).join(' · ')+'</b><span class="small muted">'+c.ab.toUpperCase()+'</span><span>Spell attack <b>d20 '+sgn(c.atk)+'</b></span><span>Save DC <b class="num">'+c.dc+'</b></span></div>').join('')+'</div></section>';
  const slots = RES.filter(r => r.spell && !r.freeOf);
  // two columns: 1st–4th level on the left, 5th–9th and Pact Magic on the right (each fills in as you level)
  const slotRow = r => '<div class="resrow"><div><b>'+(r.key==='pact' ? 'Pact Magic' : ORD(r.slotLevel)+'<span class="lvw"> level</span>')+'</b>'+(r.chip ? ' <span class="chip brass">'+esc(r.chip)+'</span>' : '')+(r.key==='pact' ? '<div class="small muted">Back on a short rest.</div>' : '')+'</div><div class="rctl">'+pipsHtml(r.max, S[r.key], r.key)+'</div></div>';
  const lo = slots.filter(r => r.key!=='pact' && r.slotLevel <= 4), hi = slots.filter(r => r.key==='pact' || r.slotLevel > 4);
  const slotCard = slots.length ? '<section class="card"><h2><span class="emo" aria-hidden="true">🔮</span>Spell slots</h2><div class="res slotcols'+(lo.length && hi.length ? ' two' : '')+'">'
    + (lo.length ? '<div class="slotcol">'+lo.map(slotRow).join('')+'</div>' : '') + (hi.length ? '<div class="slotcol">'+hi.map(slotRow).join('')+'</div>' : '') + '</div></section>' : '';
  const levels = [...new Set(sp.map(x => x.level))].sort((a,b) => a-b);
  const row = x => { const free = RES.find(r => r.freeOf === x.name);
    // tag icons are glossary terms: tap (or hover on desktop) to see what they mean
    const ic = (term, e) => '<button type="button" class="chip ic term hovertip" data-term="'+term+'" aria-label="'+term+'">'+e+'</button>';
    const tags = (x.conc ? ic('Concentration', '🧠') : '') + (x.ritual ? ic('Ritual', '📖') : '')
      + (/bonus action/.test(x.castTime||'') ? ic('Bonus action', '⚡') : /reaction/.test(x.castTime||'') ? ic('Reaction', '↩️') : '') + (/^(race|feat|item|background)$/.test(x.from||'') ? '<span class="chip">'+esc(x.from)+'</span>' : '');
    const fav = spIsFav(x.name);
    return '<div class="spell'+(S.conc===x.name?' concon':'')+(fav?' fav':'')+'" data-sk="'+esc(spellSearchText(x))+'" data-f="'+spellFlags(x)+'"><div class="spn"><button class="spstar'+(fav?' on':'')+'" data-act="spfav" data-k="'+esc(x.name)+'" aria-pressed="'+fav+'" aria-label="'+(fav?'Remove from':'Add to')+' favourites">'+(fav?'★':'☆')+'</button><button type="button" class="term" data-term="'+esc(x.name)+'">'+esc(x.name)+'</button> '+tags+'</div>'
      + '<div class="spm small muted">'+esc(spellMeta(x))+(x.from && !/^(class|race|feat|item|background)$/.test(x.from) ? ' · '+esc([x.from].concat(x.alsoFrom||[]).join(' / ')) : '')+'</div>'
      + (spellRollLine(x) ? '<div class="spr">'+spellRollLine(x)+'</div>' : '')
      + (free ? '<div class="spfree"><span class="small">Free cast</span>'+pipsHtml(free.max, S[free.key], free.key)+'</div>' : '')
      + '<button class="btn primary rollbtn spbtn" data-act="cast" data-spell="'+esc(x.name)+'">'+spellIcon(x)+' Cast</button></div>'; };
  // only the filters this sheet's spells can match (no 🎯 Attack chip without attack spells); a saved pick that no longer
  // matches anything (after a sync or a respec) is dropped so it can't hide the whole list
  const has = new Set(sp.flatMap(x => spellFlags(x).split(' ')));
  const F = [['all','All'],['atk','🎯 Attack'],['save','🛡️ Save'],['dmg','💥 Damage'],['conc','🧠 Concentration'],['rit','📖 Ritual'],['bonus','⚡ Bonus action'],['react','↩️ Reaction'],['free','✨ No slot']]
    .filter(([k]) => k === 'all' || has.has(k));
  if (Array.isArray(ui.spF) && ui.spF.some(k => !has.has(k))) { ui.spF = ui.spF.filter(k => has.has(k)); saveUi(); }
  if (Array.isArray(ui.spE) && ui.spE.some(k => !has.has('el-'+k))) { ui.spE = ui.spE.filter(k => has.has('el-'+k)); saveUi(); }
  const f = spSel('spF'), e = spSel('spE'), favs = sp.filter(x => spIsFav(x.name));
  // elements that actually occur in this character's spells, in a fixed order
  const present = new Set(sp.flatMap(x => (x.dmg||[]).map(g => g.type).concat(x.heal ? ['heal'] : [])));
  const els = ['heal', ...Object.keys(DMG_ICON)].filter(k => present.has(k)).map(k => [k, k==='heal' ? 'Healing' : k[0].toUpperCase()+k.slice(1), k==='heal' ? '💚' : DMG_ICON[k]]);
  const finder = '<section class="card spfind"><h2><span class="emo" aria-hidden="true">🔎</span>Filter spells</h2><input id="spq" class="qrsearch" type="search" placeholder="Search: fire, heal, ice, Fireball…" autocomplete="off" value="'+esc(ui.spQ||'')+'">'
    + '<div class="spfilters">'+F.map(([k,t]) => { const on = k==='all' ? !f.length : f.includes(k); return '<button class="chip toggle'+(on?' on':'')+'" data-act="spf" data-f="'+k+'" aria-pressed="'+on+'">'+t+'</button>'; }).join('')+'</div>'
    + (els.length > 1 ? '<div class="spfilters spels">'+[['all','All elements','']].concat(els).map(([k,t,ic]) => { const on = k==='all' ? !e.length : e.includes(k); return '<button class="chip toggle'+(on?' on':'')+'" data-act="spe" data-e="'+k+'" aria-pressed="'+on+'">'+(ic ? ic+' ' : '')+t+'</button>'; }).join('')+'</div>' : '')
    + '<p class="small muted spnone" hidden>No spells match. Try an element (fire, cold, lightning…), a spell name or another filter.</p></section>';
  const favCard = favs.length ? '<section class="card spsec"><h2><span class="emo" aria-hidden="true">⭐</span>Favourites'+(favs.length > 1 ? '<span class="qrdraghint">'+(deskFine() ? 'drag to reorder' : 'hold and drag to reorder')+'</span>' : '')+'</h2><div class="splist spfavlist">'+favs.sort((a,b) => (ui.spFav||[]).indexOf(a.name) - (ui.spFav||[]).indexOf(b.name)).map(row).join('')+'</div></section>' : '';
  return casting + slotCard + favCard + finder + levels.map(l => '<section class="card spsec"><h2><span class="emo" aria-hidden="true">'+(l ? '📜' : '✨')+'</span>'+(l ? ORD(l)+' level' : 'Cantrips')+'</h2><div class="splist">'
    + sp.filter(x => x.level === l).sort((a,b) => a.name.localeCompare(b.name)).map(row).join('')+'</div></section>').join('');
}
// repaint the Spells tab in place (keeps the scroll position)
function paintSpells(){ const el = document.querySelector('.panel[data-panel="spells"]'); if (!el) return;
  const q = document.activeElement && document.activeElement.id === 'spq';
  el.innerHTML = spellsPanel(); linkify(el); decorate(el); filterSpells();
  if (q) { const i = $('#spq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
// feet → metres in rules text: "60 feet" → "18 m", "5-foot-radius" → "1.5 m radius"
function ftText(t){
  const m = n => String(Math.round(n/5*1.5*10)/10).replace('.', '.');
  return String(t||'').replace(/(\d[\d,]*)-foot-(\w)/g, (_, n, c) => m(+n.replace(/,/g,''))+' m '+c).replace(/(\d[\d,]*)[- ](?:foot|feet)\b/g, (_, n) => m(+n.replace(/,/g,''))+' m');
}
// a spell's tooltip: the gist in bold, the rest plain, then cantrip upgrade / higher slots / casting facts in their own sections
// spell text → readable paragraphs: new paragraph at outcomes and follow-up actions ("On a hit…",
// "As a Magic action on later turns…"), and long stretches split every two sentences
const SP_BREAK = /^(On a (hit|miss|failed|successful)|On a failed save|If (the|a|you) (target|creature|spell)|At the (start|end) of|Until the spell ends|Whenever|While the spell|The spell ends|As an? (Magic |Bonus |Utilize )?[Aa]ction|As a Reaction|When you (cast|reach)|You can (also |use |dismiss )|Additionally|In addition|Once on each|For the duration)\b/;
// long spell text → short paragraphs, breaking before "On a hit", "At Higher Levels" and the like
function spellParas(text){
  const sents = String(text||'').split(/(?<=[.!?])\s+(?=[A-Z(])/).filter(Boolean), out = []; let para = [];
  const flush = () => { if (para.length) out.push(para.join(' ')); para = []; };
  sents.forEach(x => { if (para.length && (SP_BREAK.test(x) || para.length >= 2 || para.join(' ').length > 200)) flush(); para.push(x); });
  flush(); return out.join('\n');
}
// glossary bubble for a spell: casting line, what it does, higher levels
function spellTip(sp){
  let t = ftText(sp.text||'').replace(/\*/g,'').trim(), up = '', hi = '';
  const cut = (re) => { const m = t.match(re); if (!m) return ''; const part = t.slice(m.index + m[0].length).trim(); t = t.slice(0, m.index).trim(); return part; };
  hi = cut(/\s*(Using a Higher-Level Spell Slot|At Higher Levels)\.?\s*/i);
  up = cut(/\s*Cantrip Upgrade\.?\s*/i);
  const sent = t.match(/^.+?[.!?](\s|$)/), gist = sent ? sent[0].trim() : t;
  // outcomes get their own paragraph: "On a hit…", "On a failed save…", "At the start of…"
  const rest = spellParas(t.slice(gist.length).trim());
  const g = spellGroups(sp, sp.level)[0];
  return '**'+gist+'**' + (rest ? '\n'+rest : '')
    + (up ? '\n## 📈 Cantrip upgrade\n'+up.replace(/\s*\(([^)]+)\)/g, ' ($1)') + (g && sp.scale === 'characterlevel' ? '\n• At your level ('+D.totalLevel+'): **'+diceTxt(g.x)+(g.mod ? sgn(g.mod) : '')+'**' : '') : '')
    + (hi ? '\n## ⬆️ Higher slot\n'+hi : (sp.level && sp.higher ? '\n## ⬆️ Higher slot\n• Stronger when cast with a higher slot' : ''))
    + '\n## 📋 Casting'
    + (sp.castTime ? '\n• Time: '+sp.castTime : '')
    + (sp.origin==='Touch' ? '\n• Range: touch' : sp.range ? '\n• Range: '+ftM(sp.range)+' m' : sp.origin==='Self' ? '\n• Range: self' : '')
    + (sp.aoe ? '\n• Area: '+sp.aoe[0]+' '+ftM(sp.aoe[1])+' m' : '')
    + (sp.duration ? '\n• Duration: '+sp.duration.toLowerCase() : '')
    + (sp.conc ? '\n• 🧠 Concentration' : '') + (sp.ritual ? '\n• 📖 Ritual: no slot, takes 10 minutes longer' : '');
}
// spell filter picks (this device): several at once; tap a lit one to turn it off, All clears the row
const spSel = k => Array.isArray(ui[k]) ? ui[k] : (ui[k] && ui[k] !== 'all' ? [ui[k]] : []);
// toggle one spell filter chip ('all' clears the row)
function spToggle(k, v){ const cur = spSel(k).slice(), i = cur.indexOf(v); ui[k] = v === 'all' ? [] : i < 0 ? cur.concat(v) : cur.filter(x => x !== v); saveUi(); }
// favourite spells (this device)
const spIsFav = n => (ui.spFav||[]).includes(n);
// star or unstar a spell
function toggleSpFav(n){ const f = (ui.spFav||[]).slice(), i = f.indexOf(n); if (i < 0) f.push(n); else f.splice(i, 1); ui.spFav = f; saveUi(); paintSpells(); }
// what a spell is about, for the search box: name, school, damage types, source, the description
function spellSearchText(x){
  return [x.name, x.school, x.from, (x.dmg||[]).map(g => g.type).join(' '), x.heal ? 'healing heal' : '', x.conc ? 'concentration' : '', x.ritual ? 'ritual' : '', x.castTime, x.text].join(' ').toLowerCase();
}
// filter keys a spell matches (attack, save, damage, healing, concentration, ritual, bonus action…)
const spellFlags = x => [x.attack && 'atk', x.save && 'save', ((x.dmg||[]).length) && 'dmg', x.heal && 'heal', x.conc && 'conc', x.ritual && 'rit',
  /bonus action/.test(x.castTime||'') && 'bonus', /reaction/.test(x.castTime||'') && 'react', (!x.level || !x.slot) && 'free',
  ...(x.dmg||[]).map(g => 'el-'+g.type), x.heal && 'el-heal'].filter(Boolean).join(' ');
// search words that stand for an element or effect: "flame" finds fire spells, "ice" finds cold ones…
const SPELL_WORDS = {
  fire:['fire','flame','flames','burn','burning','heat','fiery','blaze','inferno','scorch'], cold:['cold','ice','icy','frost','freeze','freezing','snow','chill','winter'],
  lightning:['lightning','shock','electric','electricity','zap'], thunder:['thunder','sound','boom','sonic','loud'],
  acid:['acid','corrode','corrosive','melt'], poison:['poison','toxic','venom','sick'], necrotic:['necrotic','death','decay','drain','rot','wither'],
  radiant:['radiant','holy','sun','divine','sacred'], psychic:['psychic','mind','mental','madness'], force:['force','arcane','magic missile'],
  healing:['heal','healing','cure','revive'], bludgeoning:['bludgeoning','crush','smash'], piercing:['piercing','pierce'], slashing:['slashing','slash','cut'],
  charm:['charm','charmed','control','dominate','command'], fear:['fear','frightened','scare','terror'], movement:['teleport','fly','flight','speed','move','misty'],
  defence:['defence','defense','shield','protect','armour','armor','ac']
};
// a search word plus its synonyms ("fire" → burn, flame…)
function spellTerms(word){
  const out = new Set([word]);
  Object.entries(SPELL_WORDS).forEach(([k, list]) => { if (k === word || list.some(w => w === word || (word.length >= 3 && w.startsWith(word)))) { out.add(k); list.forEach(w => out.add(w)); } });
  return [...out];
}
const wordRe = w => new RegExp('(^|[^a-z])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));   // a word that starts with w
// show only the spells that match the search box and the filter chip; hide empty level cards
function filterSpells(){
  const box = document.querySelector('.panel[data-panel="spells"]'); if (!box) return;
  const q = (($('#spq')||{}).value || '').trim().toLowerCase(), f = spSel('spF'), e = spSel('spE');
  const words = q.split(/\s+/).filter(Boolean).map(spellTerms);
  let shown = 0;
  box.querySelectorAll('.spell[data-sk]').forEach(el => {
    const fl = ' '+el.dataset.f+' ';
    // several picks in one row: any of them (OR); the two rows and the search together: all of them (AND)
    const ok = (!f.length || f.some(k => fl.includes(' '+k+' '))) && (!e.length || e.some(k => fl.includes(' el-'+k+' '))) && words.every(alts => alts.some(w => wordRe(w).test(el.dataset.sk)));
    el.hidden = !ok; if (ok) shown++;
  });
  box.querySelectorAll('.spsec').forEach(sec => { sec.hidden = !sec.querySelector('.spell:not([hidden])'); });
  const none = box.querySelector('.spnone'); if (none) none.hidden = shown > 0;
}
document.addEventListener('input', e => { if (e.target && e.target.id === 'spq') { ui.spQ = e.target.value; filterSpells(); } });
// Cast: pick a slot (or a free cast / ritual), then roll. Cantrips go straight to the roll.
function castSpell(name){
  const sp = spellBy(name); if (!sp) return;
  cur = null; checkRoll = null; closeTip();
  const lock = RES.find(r => r.toggle && r.toggle.noSpells && S.active[r.key]);
  if (lock) return showRoll('<div class="head"><span class="title">'+esc(sp.name)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="bd">'+lock.toggle.noSpells+'</div><div class="nextrow"><button class="btn" data-act="resoff" data-k="'+lock.key+'">'+lock.toggle.off+'</button><button class="btn done" data-act="close">'+WORD.ok+'</button></div>');
  if (!sp.level) return castAt(name, 0, '');
  const opts = [];
  const free = RES.find(r => r.freeOf === sp.name);
  if (free && S[free.key] < free.max) opts.push(['free', sp.level, '✨ Free cast', (free.max - S[free.key])+' left · '+(free.short ? 'back on a short rest' : 'back on a long rest')]);
  RES.filter(r => r.spell && !r.freeOf && r.slotLevel >= sp.level).sort((a,b) => a.slotLevel - b.slotLevel).forEach(r => {
    const left = r.max - S[r.key]; if (left <= 0) return;
    opts.push([r.key, r.slotLevel, (r.key==='pact' ? '🔮 Pact slot · ' : '🪄 ')+ORD(r.slotLevel)+' level', left+' left'+(r.slotLevel > sp.level && sp.higher ? ' · stronger' : '')]); });
  if (sp.ritual) opts.push(['ritual', sp.level, '📖 As a ritual', 'No slot · takes 10 minutes longer']);
  if (!sp.slot && !free) opts.unshift(['', sp.level, '✨ Cast it', 'No slot needed']);
  if (!opts.length) return showRoll('<div class="head"><span class="title">'+esc(sp.name)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="bd">No slots of level '+sp.level+' or higher left. A long rest brings them back.</div>');
  showRoll('<div class="head"><span class="title">'+esc(sp.name)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + '<div class="stepnote"><b>🪄 Which slot?</b> '+esc(spellRollLine(sp).replace(/<[^>]+>/g,'') || spellMeta(sp))+'</div>'
    + '<div class="atkpick slotpick">'+opts.map(([k,l,t,why]) => '<button class="atkopt slotopt" data-act="castat" data-spell="'+esc(sp.name)+'" data-l="'+l+'" data-k="'+k+'"><b>'+t+'</b><span>'+why+'</span></button>').join('')+'</div>', false, 'next');
}
// cast a spell with a slot (or free cast / ritual): spend it, start concentration, then roll its attack, save or healing
function castAt(name, lvl, key){
  const sp = spellBy(name); if (!sp) return;
  const r = key && key !== 'ritual' ? (key === 'free' ? RES.find(x => x.freeOf === sp.name) : resBy(key)) : null;
  if (r) { if (S[r.key] >= r.max) return; S[r.key]++; }
  const ended = sp.conc && S.conc && S.conc !== sp.name ? S.conc : null;
  if (sp.conc) S.conc = sp.name;
  save(); paintRes();
  lvl = lvl || sp.level;
  const st = spellStats(sp);
  if (sp.attack) {
    const g = spellGroups(sp, lvl)[0], n = spellCount(sp, lvl);
    SPELL_W[sp.name] = { name: sp.name, spell: true, ranged: sp.attack === 2, finesse: false, a: st.ab, hit: st.atk,
      dice: g ? diceTxt(g.x) : '0d4', dmgMod: (g ? g.x.flat + g.mod : 0), dmgType: g ? (g.type||'').replace(/^./, c => c.toUpperCase()) : '', props: [], versatile: null, beams: n, beamWord: spellWord(sp).replace(/s$/,'') };
    return attackSetup(sp.name);
  }
  const rider = sp.conc && !sp.save && !sp.attack && !sp.heal && (sp.dmg||[]).length;
  if (!rider && (sp.heal || (sp.dmg||[]).length)) return spellEffect(sp, lvl, ended);
  // no roll: a short confirmation
  showRoll('<div class="head"><span class="title">'+esc(sp.name)+(lvl > sp.level ? ' · '+ORD(lvl)+' level' : '')+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + '<div class="bd"><div class="ln"><span class="lb">Cast</span>'+(key==='ritual' ? 'as a ritual' : r ? (key==='free' ? 'free cast' : ORD(r.slotLevel)+'-level '+(r.key==='pact'?'Pact slot':'slot')) : 'no slot')+'</div>'
    + (sp.save ? '<div class="ln"><span class="lb">Save</span>DC '+st.dc+' '+ABIL[sp.save-1].toUpperCase()+'</div>' : '')
    + (rider ? '<div class="ln"><span class="lb">Each hit</span>+'+spellGroups(sp, lvl).map(g => diceTxt(g.x)+' '+g.type).join(' + ')+'</div>' : '')
    + (sp.conc ? '<div class="ln"><span class="lb">🧠 Concentration</span>'+(ended ? esc(ended)+' ends' : 'on')+'</div>' : '') + '</div>'
    + '<div class="nextrow"><span></span><button class="btn done" data-act="close">'+WORD.ok+'</button></div>', false, 'next');
  autoCloseRoll();
}
// damage or healing from a save spell / auto-hit spell / healing spell: sheet first, then the dice, then the numbers
function spellEffect(sp, lvl, ended){
  const st = spellStats(sp), groups = spellGroups(sp, lvl).map(g => ({...g, v: rollDice(g.x.n, g.x.d)}));
  const total = groups.reduce((t,g) => t + sum(g.v) + g.x.flat + g.mod, 0), heal = !!sp.heal;
  const half = /half as much|half damage|half the damage/i.test(sp.text||'');
  const card = veil => (heal ? '<span hidden data-heal></span>' : '')
    + '<div class="head"><span class="title">'+esc(sp.name)+(lvl > sp.level ? ' · '+ORD(lvl)+' level' : '')+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + (sp.save ? '<div class="stepnote dmgc"><b>🛡️ DC '+st.dc+' '+ABIL[sp.save-1].toUpperCase()+' save</b> '+(half ? 'Half damage on a success.' : 'Targets roll to resist.')+'</div>' : '')
    + '<div class="nums"><span class="n'+(veil?' still':'')+'">'+(veil?'?':(heal?'+':'')+total)+'<small>'+(heal ? 'HP healed' : esc(groups.map(g => g.type).join(' + '))+' damage')+'</small></span></div>'
    + '<div class="bd">'+groups.map((g,i) => '<div class="ln"><span class="lb">'+(groups.length > 1 ? esc(g.type) : esc(sp.name))+'</span><span class="dc">'+g.x.n+'d'+g.x.d+'</span> '
        + (veil ? g.v.map(() => '<b class="die q">?</b>').join(' + ') : g.v.map(v => dieF(v, 'sp'+i)).join(' + '))+((g.x.flat + g.mod) ? ' <span class="mod">'+sgn(g.x.flat + g.mod)+'</span>' : '')+' = <b>'+(veil?'?':sum(g.v)+g.x.flat+g.mod)+'</b></div>').join('')
    + (sp.conc ? '<div class="ln"><span class="lb">🧠 Concentration</span>'+(ended ? esc(ended)+' ends' : 'on')+'</div>' : '') + '</div>'
    + (veil ? '' : '<div class="nextrow">'+(heal ? '<button class="btn" data-act="healself" data-v="'+total+'">❤️ Heal myself</button>' : '<span></span>')+'<button class="btn done" data-act="close">'+WORD.ok+'</button></div>');
  const dice = groups.flatMap(g => asDice(g.v, g.x.d)).slice(0, 12);
  showRoll(card(true), false, 'next');
  const fk = heal ? 'heal' : FX['el_'+String(spellEl(sp)).toLowerCase()] ? 'el_'+String(spellEl(sp)).toLowerCase() : 'spell';
  afterSheet(() => fx(fk, () => { groups.forEach((g,i) => flipKeys.add('sp'+i)); if (!$('#dock').hidden) showRoll(card(false), true); flipKeys.clear(); }, dice));
}
