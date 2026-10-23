// ── §2 Boot: parse the data, derive the sheet, resources, theme words, small helpers ───────────────────────
// Runs once at load, top to bottom. Reads the page's data script (<script id="<PACK.id>-data">), upgrades and
// compacts it into DATA, merges items added in the app, and derives D (read-only sheet numbers).
// Defines: DATA, DATA_V, DATA_OLD, D, MODS, RES (every tracked resource: module ones, automatic counters, spell
//   slots, free casts), SPELL, THEME, SKIN, WORD, FIRST_NAME, INITIALS, AVATAR, and helpers used everywhere: esc, sgn, $, ls,
//   itemKey, ddbQty, keepAdded, mergeAdded, fillTpl, spellBy, spellStats, resBy, resWord, srcTag.
// Uses: PACK (#pack), THEMES (#themes), compact(), derive(), activeModules(), ABIL, slug (§1),
//   ftText() (§8b, a function declaration, so hoisted).
// Order-sensitive: RES is filled here before §3 builds the play state from it; esc is defined near the end, so code
//   above it that runs at load (the automatic counters) has its own escaper. ADDED is reassigned in §3 and §11.
// Sheet data format. Bump DATA_V when compact() starts keeping something new, and add a step to upgradeData()
// so older saved data still works (missing fields get safe defaults; the menu suggests a sync).
//   v1  first format            v2  actions keep their activation type (act); traits/feats keep paragraphs, lists and tables
//   v3  items keep their base weapon, magic +N bonus and extra damage (Flame Tongue…)
const DATA_V = 3;
// Brings stored DATA from an older format up to DATA_V with safe defaults. Mutates d; d.vFrom keeps the old version.
function upgradeData(d){
  const from = d.v || 1;
  if (from < 2) { (d.actions||[]).forEach(a => { if (!('act' in a)) a.act = null; }); }
  if (from < 3) { (d.inventory||[]).forEach(i => { if (!('xdmg' in i)) { i.base = null; i.xdmg = []; i.bonus = i.bonus || 0; } }); }
  d.vFrom = from; d.v = DATA_V; return d;
}
// The data script holds this page's compact DATA, or (web app, first open) D&D Beyond's raw JSON, compacted here.
const DATA = upgradeData((j => j && j.data && 'success' in j ? compact(j) : j)(JSON.parse(document.getElementById(PACK.id+'-data').textContent)));
const DATA_OLD = DATA.vFrom < DATA_V;   // saved before the newest format: some details only appear after a sync
// Items added in this app that aren't in D&D Beyond yet (Gear → ➕ Add item). They live in the play state (S.added,
// so they follow the tracker to other devices) and join DATA.inventory as if D&D Beyond had them, marked added:true.
// Each remembers how many D&D Beyond had when it was added (had); once a sync shows more, it's in D&D Beyond: dropped.
const DDB_INV = DATA.inventory;
// Item name → comparison key, so "Leather Armor" and "Leather", "Longsword, +1" and "+1 Longsword" match
const itemKey = n => String(n||'').toLowerCase().replace(/[’']/g,'').replace(/\barmou?r\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean).sort().join(' ');
// How many of an item D&D Beyond itself lists (ignores items added in the app).
const ddbQty = n => { const k = itemKey(n); return DDB_INV.filter(i => itemKey(i.name) === k).reduce((a,i) => a+(i.qty||1), 0); };
// Added items that D&D Beyond doesn't have yet (the rest were entered there and synced in): those are dropped.
const keepAdded = list => (Array.isArray(list) ? list : []).filter(a => a && a.inv && ddbQty(a.inv.name) < (a.had||0) + (a.inv.qty||1));
// This device's saved list of added items (empty for a shared sheet: the owner's list comes with their tracker).
let ADDED = keepAdded((() => { if (window.SHEET && window.SHEET.mine === false) return null;   // a shared sheet: its owner's list arrives with their tracker
  try { const s = JSON.parse(localStorage.getItem(PACK.id+'-play-'+DATA.id)); return s && s.added; } catch(_) { return null; } })());
// Rebuilds DATA.inventory = D&D Beyond's items + the ones added in the app (copies, so edits don't leak back).
const mergeAdded = () => { DATA.inventory = DDB_INV.concat(ADDED.map(a => Object.assign({}, a.inv))); };
mergeAdded();
const D = derive(DATA);
const MODS = activeModules(DATA);
// ── Resources ──────────────────────────────────────────────────────────────────────────────────────────────
// Limited-use resources, from the modules (#classes). Keys live flat in S, so they must not clash with core keys.
// RES grows below: automatic counters, spell slots, Pact Magic, free casts.
const CORE_KEYS = ['stamp','hp','temp','insp','arrows','potions','spent','hd','coins','coinLog','fired','base','conc','active','added'];
const RES = MODS.flatMap(m => m.resources ? m.resources(D) : []).filter(Boolean).filter(r => {
  if (CORE_KEYS.includes(r.key)) { console.warn('resource key clashes with play state:', r.key); return false; } return true; });
// Fill D&D Beyond {{template}} snippets in feature text, e.g. {{modifier:wis@min:1#unsigned}}, {{5*classlevel}},
// {{(modifier:dex+classlevel)#signed}}, {{savedc:wis}}. lv = the owning class's level; ex.limiteduse / ex.scalevalue when
// known (a number, or a die like "1d8"). Arithmetic is parsed here (no eval). Anything unknown reads "some".
// Flags: @min:N, @max:N, @roundup (else rounds down), #signed. Returns the text with every {{…}} replaced.
function fillTpl(t, lv, ex){
  ex = ex || {};
  const words = { classlevel: lv, characterlevel: D.totalLevel, proficiency: D.pb, limiteduse: ex.limiteduse, scalevalue: ex.scalevalue };
  // + - * / and brackets over numbers (a small recursive-descent parser; throws on anything else)
  const calc = src => { let i = 0; const peek = () => src[i], num = () => { const m = src.slice(i).match(/^\d+(\.\d+)?/); if (!m) throw 0; i += m[0].length; return +m[0]; };
    const atom = () => { if (peek() === '(') { i++; const v = expr(); if (src[i++] !== ')') throw 0; return v; } if (peek() === '-') { i++; return -atom(); } return num(); };
    const term = () => { let v = atom(); while (peek() === '*' || peek() === '/') v = src[i++] === '*' ? v * atom() : v / atom(); return v; };
    const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') v = src[i++] === '+' ? v + term() : v - term(); return v; };
    const v = expr(); if (i !== src.length) throw 0; return v; };
  return String(t||'').replace(/\{\{([^}]+)\}\}/g, (all, body) => {
    const m = body.match(/^(.*?)((?:[@#][\w:-]+)*)$/), flags = m[2], e = m[1].replace(/\s+/g, '');
    if (e === 'scalevalue' && typeof ex.scalevalue === 'string') return ex.scalevalue;   // a die: "1d8"
    let ok = true;
    const src = e.replace(/savedc:(\w+)/g, (_, a) => 8 + D.pb + (D.mod[a]||0)).replace(/modifier:(\w+)/g, (_, a) => '('+(D.mod[a]||0)+')')
      .replace(/[a-z]+/g, w => typeof words[w] === 'number' ? '('+words[w]+')' : (ok = false, '0'));
    let v; try { v = ok ? calc(src) : NaN; } catch (_) { v = NaN; }
    if (!isFinite(v)) return 'some';
    v = /@roundup/.test(flags) ? Math.ceil(v) : Math.floor(v);
    const mn = flags.match(/@min:(-?\d+)/), mx = flags.match(/@max:(-?\d+)/);
    if (mn) v = Math.max(+mn[1], v); if (mx) v = Math.min(+mx[1], v);
    return /#signed/.test(flags) ? (v >= 0 ? '+' : '')+v : String(v);
  });
}
// Automatic counters: any limited-use action from D&D Beyond that no module already tracks becomes a resource
// (key x_<slug>, made unique). Max uses: D&D Beyond's number, else the ability modifier (min 1), else the proficiency
// bonus. reset 1 = short rest; anything else (long rest, dawn…) is treated as a long rest.
(() => {
  const claimed = new Set(RES.flatMap(r => [r.name, ...(r.terms||[])]));
  const used = new Set(RES.map(r => r.key));
  (DATA.actions||[]).forEach(a => {
    if (claimed.has(a.name)) return;
    let max = a.max || 0;
    if (!max && a.statUses) max = Math.max(1, D.mod[ABIL[a.statUses-1]] || 0);
    if (!max && a.pbUses) max = D.pb;
    if (!max) return;
    let key = 'x_'+slug(a.name); while (used.has(key) || CORE_KEYS.includes(key)) key += '_';
    used.add(key); claimed.add(a.name);
    const short = a.reset === 1;
    // esc() isn't defined yet when this runs (const, further down), so a local escaper
    const htmlEsc = t => t.replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    const owner = DATA.classes.find(k => k.features.some(f => a.name === f.name || a.name.startsWith(f.name+':') || f.name.startsWith(a.name)));
    const lv = owner ? owner.level : D.totalLevel;
    // What {{limiteduse}} and {{scalevalue}} mean here: {{limiteduse}} and "{{scalevalue}} times" are the use count;
    // any other {{scalevalue}} is the class's die where we know it (Monk Martial Arts, Bard Bardic Inspiration).
    const cls = owner ? owner.name : '', die = cls === 'Monk' ? '1d'+(lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6) : cls === 'Bard' ? 'd'+(lv >= 15 ? 12 : lv >= 10 ? 10 : lv >= 5 ? 8 : 6) : undefined;
    const fill = t => fillTpl(String(t||'').replace(/\{\{scalevalue\}\}(?= times)/g, String(max)), lv, { limiteduse: max, scalevalue: die });
    const text = ftText(fill(a.text)).replace(/\s+/g,' ').trim();
    RES.push({ key, name:a.name, emoji:'🔋', max, used: Math.min(max, a.used||0), auto:true,
      desc: htmlEsc(text.length > 160 ? text.slice(0,157).replace(/\s\S*$/,'')+'…' : text) + (text ? ' ' : '') + (short ? 'Back on a short rest.' : 'Back on a long rest.'),
      short: short ? 'all' : 0, unit:[a.name, a.name+' uses'], terms:[a.name], ddb:'Actions → '+a.name });
  });
})();
// ── Spellcasting ───────────────────────────────────────────────────────────────────────────────────────────
// Slot totals come from the rules tables (D&D Beyond only stores what is used).
// 1 → "1st", 2 → "2nd", 11 → "11th"
const ORD = n => n+(['th','st','nd','rd'][(n%100>10 && n%100<14) ? 0 : n%10] || 'th');
// multiclass spellcaster table: slots per spell level, by caster level 0–20
const SLOT_TABLE = [[],[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
// 1 = full caster, 2 = half caster (third casters are found by subclass below)
const CASTER = {Bard:1, Cleric:1, Druid:1, Sorcerer:1, Wizard:1, Paladin:2, Ranger:2, Artificer:2};
// Casting numbers per class, slot totals (multiclass table) and Pact Magic: {slots, pact: {n, lvl} | null, casters}
const SPELL = (() => {
  const cls = DATA.classes, third = k => /Eldritch Knight|Arcane Trickster/.test(k.sub||'');
  const multi = cls.filter(k => CASTER[k.name] || third(k)).length > 1;
  // full casters count every level, half casters half (rounded up), third casters a third (rounded down when multiclassed)
  const lv = cls.reduce((t,k) => t + (CASTER[k.name]===1 ? k.level : CASTER[k.name]===2 ? Math.ceil(k.level/2) : third(k) ? (multi ? Math.floor(k.level/3) : Math.ceil(k.level/3)) : 0), 0);
  const wl = (cls.find(k => k.name==='Warlock') || {level:0}).level;
  const casters = cls.filter(k => k.spellAbility).map(k => { const ab = ABIL[k.spellAbility-1], atk = D.pb + D.mod[ab]; return {cls:k.name, ab, atk, dc: 8 + atk}; });
  return { slots: SLOT_TABLE[Math.min(20, lv)] || [], pact: wl ? {n: wl >= 17 ? 4 : wl >= 11 ? 3 : wl >= 2 ? 2 : 1, lvl: Math.min(5, Math.ceil(wl/2))} : null, casters };
})();
// spell slots (sl1…sl9, long rest), Pact Magic slots (short rest) and limited free casts become resources too
SPELL.slots.forEach((n, i) => RES.push({ key:'sl'+(i+1), name: ORD(i+1)+'-level slots', label: ORD(i+1)+'-level slots', emoji:'🪄', spell:true, slotLevel:i+1, max:n,
  used: Math.min(n, (DATA.slotsUsed||[])[i]||0), short:0, unit:[ORD(i+1)+'-level slot', ORD(i+1)+'-level slots'], terms:[], ddb:'Spells → '+ORD(i+1)+' level slots' }));
if (SPELL.pact) RES.push({ key:'pact', name:'Pact Magic slots', emoji:'🪄', spell:true, slotLevel:SPELL.pact.lvl, max:SPELL.pact.n, chip: ORD(SPELL.pact.lvl)+' level',
  used: Math.min(SPELL.pact.n, (DATA.pactUsed||[])[SPELL.pact.lvl-1]||0), short:'all', unit:['Pact Magic slot','Pact Magic slots'], terms:['Pact Magic'], ddb:'Spells → Pact Magic slots' });
(DATA.spells||[]).filter(sp => sp.lu).forEach(sp => { const key = 'sp_'+slug(sp.name);
  if (!RES.some(r => r.key === key)) RES.push({ key, name: sp.name+' (free cast)', emoji:'✨', spell:true, freeOf: sp.name, max: sp.lu.max, used: Math.min(sp.lu.max, sp.lu.used),
    short: sp.lu.reset===1 ? 'all' : 0, unit:[sp.name+' free cast', sp.name+' free casts'], terms:[], ddb:'Spells → '+sp.name+': limited use' }); });
// ── Lookups and helpers ────────────────────────────────────────────────────────────────────────────────────
// a spell on this sheet by name
const spellBy = n => (DATA.spells||[]).find(x => x.name === n);
// The casting numbers for one spell: its own ability (feats), its class's, or the best caster's.
// Returns {ab, atk, dc, mod}; falls back to Charisma when the sheet has no caster.
function spellStats(sp){
  const byCls = SPELL.casters.filter(c => c.cls === sp.from || (sp.alsoFrom||[]).includes(c.cls)).sort((a,b) => b.atk - a.atk)[0], best = SPELL.casters.slice().sort((a,b) => b.atk - a.atk)[0];
  const ab = sp.ab ? ABIL[sp.ab-1] : byCls ? byCls.ab : best ? best.ab : 'cha', atk = D.pb + D.mod[ab];
  return { ab, atk, dc: 8 + atk, mod: D.mod[ab] };
}
// a tracked resource by key
const resBy = k => RES.find(r => r.key === k);
// glossary term → resource key (a resource's terms, or its name)
const USE_RES = Object.fromEntries(RES.flatMap(r => (r.terms||[r.name]).map(t => [t, r.key])));
const shortBack = r => r.short === 'all' ? S[r.key] : Math.min(r.short||0, S[r.key]);   // uses a short rest gives back now
// singular or plural unit for a resource count
const resWord = (r, n) => n === 1 ? r.unit[0] : r.unit[1];
// Where a glossary term comes from on the character's own sheet, e.g. "Rogue 3" or "Halfling"; the glossary falls
// back to its hand-written category when nothing matches.
const FEATURE_SRC = {};
DATA.classes.forEach(c => c.features.forEach(f => { FEATURE_SRC[f.name] = c.name+' '+f.level; }));
DATA.race.traits.forEach(t => { FEATURE_SRC[t.name] = DATA.race.name; });
if (DATA.background) FEATURE_SRC[DATA.background.feat] = DATA.background.name+' background';
(DATA.feats||[]).forEach(f => { FEATURE_SRC[f.name] = 'Feat'; });
// where a feature comes from on this sheet ("Rogue 3", "Halfling"), or null
const srcTag = term => FEATURE_SRC[term] || null;
// the claude.ai browser tool that Sync (§21) reads D&D Beyond through
const HOST = 'host:claude_browser';
// ── Theme and wording ──────────────────────────────────────────────────────────────────────────────────────
// Active theme (#themes): wording, dice sets, fonts. WORD falls back to plain English for keys a theme leaves out.
const THEME = THEMES[PACK.theme] || THEMES[Object.keys(THEMES)[0]];
// The web app's other looks (☰ → Theme, <html data-skin>) speak their own few words; no skin = the pack's theme.
const SKIN = document.documentElement.getAttribute('data-skin') || '';
// { <look>: words }: each look's words (src/looks/*.js), filled in by tools/build.js for the web app only (the
// claude.ai sheets are always pirate, so theirs stays empty).
const SKIN_WORDS = /*__SKIN_WORDS__*/{};
// a skin's words replace the theme's; plain English fills any gaps
const WORD = Object.assign({ ok:'Done ✓', cancel:'Cancel', log:'Notes', turn:'Your turn at a glance', clean:'✓ All clear.',
  notesHint: n => 'Who you met, what you found, what '+n+' wants next…', critIcon:'✦' }, SKIN && SKIN_WORDS[SKIN] ? SKIN_WORDS[SKIN] : THEME.words);
// the character's first name and initials (for hints and the avatar)
const FIRST_NAME = DATA.name.split(/\s+/)[0];
const INITIALS = DATA.name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
// HTML-escape anything that came from data
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));   // safe in text and in quoted attributes
// The D&D Beyond portrait for the crest (§13): DATA.avatar when it is an https link on dndbeyond.com or one of its
// subdomains, else ''. Web app only (window.SHEET): a claude.ai artifact's CSP may not allow images from other
// sites, so those sheets keep the initials. A portrait that fails to load shows the initials too (bindCrest, §13).
const AVATAR = (() => { if (!window.SHEET || !DATA.avatar) return '';
  try { const u = new URL(String(DATA.avatar)); return u.protocol === 'https:' && /(^|\.)dndbeyond\.com$/i.test(u.hostname) ? u.href : ''; } catch(_) { return ''; } })();
// the theme's confirm tick gets a gentle pulse (same rhythm as the next-step arrows); WORD.ok is HTML from here on
WORD.ok = esc(WORD.ok).replace(/\s*(✓|✔)\s*$/, ' <span class="okmk">$1</span>');
// +n / −n
const sgn = D.sgn;
// first element matching a selector
const $ = s => document.querySelector(s);
// localStorage as JSON; never throws (private mode, full storage): get returns null, set does nothing
const ls = {
  get(k){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

