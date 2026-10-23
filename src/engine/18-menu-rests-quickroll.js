// ── §18 Menu, rests and Quick roll ─────────────────────────────────────────────────────────────────────────
// The three drawers on the top bar: ☰ menu (sync, theme, dice sets, feedback), 🎲 Quick roll (any check, save, skill
// or tool, with favourites) and the rest window (short rest with hit dice, long rest). Also bindDragList(), the
// drag-to-reorder helper that §10 uses for its favourite lists too, and autoCloseRoll() for confirmation sheets.
// Only one drawer is open at a time: each opener closes the others. On desktop (deskFine) they open as windows.
// Uses: S, save, ui, saveUi (§3); RES, D, DATA, WORD, esc (§2); DICE_SETS, DICE_GROUPS, DICE_LOOK, DICE_PREVIEW (§6);
//   fx, fxBusy (§5); showRoll, closeRoll, fitDock, deskFine, r (§4); G (§16); window.Skin (web/sw-register.js),
//   window.SHEET (web app).
// State: menuOpen, menuView ('main' | 'sync' | 'dice' | 'skin'), diceEdit, restMode, rollBoxOpen, restLog, restSpent.

// ── ☰ Menu ─────────────────────────────────────────────────────────────────────────────────────────────────
let menuOpen = false;
let menuView = 'main';
// Draws the ☰ menu: back to your characters (web app), Sync, Theme, Dice sets, Feedback. Sections fold open in place
// (menuView); diceEdit swaps the dice list for up/down arrows. Closing empties the box and resets the view.
function paintMenu(){
  const box = $('#menubox'), btn = $('#menubtn'); if (!box) return;
  fitDock();
  box.hidden = !menuOpen; if (btn) btn.setAttribute('aria-expanded', String(menuOpen));
  if (!menuOpen) { box.innerHTML = ''; menuView = 'main'; diceEdit = false; return; }
  // sw(set): a small d20 + d6 swatch in the set's colours, with a CSS hint of its texture (wood grain, frost…)
  const cur = DICE_SETS[ui.dice] ? ui.dice : DEFAULT_DICE, sw = s => { const bg = (s.tex === 'wood' ? 'repeating-linear-gradient(12deg,rgba(110,62,28,.28) 0 1px,transparent 1px 4px),' : s.tex === 'bone' ? 'radial-gradient(circle at 70% 30%,rgba(120,12,10,.6) 0 2px,transparent 3px),radial-gradient(circle at 30% 75%,rgba(120,12,10,.45) 0 1.5px,transparent 2.5px),'
      : s.tex === 'tar' ? 'radial-gradient(ellipse at 30% 25%,rgba(255,255,255,.22),transparent 55%),repeating-linear-gradient(8deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),'
      : s.tex === 'hammered' ? 'radial-gradient(ellipse at 30% 25%,rgba(255,255,255,.35),transparent 55%),repeating-linear-gradient(0deg,rgba(255,255,255,.12) 0 1px,transparent 1px 3px),'
      : s.tex === 'caustic' ? 'radial-gradient(ellipse at 35% 35%,rgba(255,255,255,.35) 0 1px,transparent 5px),radial-gradient(ellipse at 70% 65%,rgba(255,255,255,.25) 0 1px,transparent 5px),'
      : s.tex === 'char' ? 'linear-gradient(176deg,transparent 40%,rgba(255,110,20,.75) 42%,transparent 45%),linear-gradient(183deg,transparent 68%,rgba(255,90,10,.6) 70%,transparent 72%),repeating-linear-gradient(178deg,rgba(0,0,0,.35) 0 1px,transparent 1px 4px),'
      : s.tex === 'iron' ? 'radial-gradient(circle at 30% 35%,rgba(0,0,0,.5) 0 1.5px,transparent 2px),radial-gradient(circle at 65% 60%,rgba(0,0,0,.45) 0 1.5px,transparent 2px),radial-gradient(circle at 60% 25%,rgba(150,70,20,.45),transparent 40%),'
      : s.tex === 'map' ? 'radial-gradient(circle at 70% 30%,rgba(170,24,12,.9) 0 1.6px,transparent 2.4px),radial-gradient(circle at 35% 70%,rgba(120,80,40,.35),transparent 45%),repeating-linear-gradient(0deg,rgba(90,60,30,.18) 0 1px,transparent 1px 6px),repeating-linear-gradient(90deg,rgba(90,60,30,.18) 0 1px,transparent 1px 6px),'
      : s.tex === 'marble' ? 'linear-gradient(150deg,transparent 40%,rgba(0,0,0,.35) 42%,transparent 44%),linear-gradient(60deg,transparent 62%,rgba(0,0,0,.25) 63%,transparent 65%),radial-gradient(circle at 30% 30%,rgba(255,255,255,.3),transparent 50%),'
      : s.tex === 'nebula' ? 'radial-gradient(circle at 30% 30%,#fff 0 .8px,transparent 1.3px),radial-gradient(circle at 70% 60%,#fff 0 .8px,transparent 1.3px),radial-gradient(circle at 55% 25%,rgba(255,255,255,.9) 0 .6px,transparent 1px),radial-gradient(ellipse at 40% 60%,rgba(255,255,255,.3),transparent 55%),'
      : s.tex === 'moss' ? 'radial-gradient(circle at 30% 35%,rgba(255,255,255,.7) 0 1.6px,transparent 2.4px),radial-gradient(circle at 65% 65%,rgba(255,255,255,.6) 0 1.2px,transparent 2px),radial-gradient(circle at 60% 30%,rgba(0,0,0,.3),transparent 45%),'
      : s.tex === 'lava' ? 'linear-gradient(160deg,transparent 40%,rgba(255,150,40,.95) 43%,transparent 47%),linear-gradient(60deg,transparent 62%,rgba(255,110,20,.85) 64%,transparent 67%),'
      : s.tex === 'frost' ? 'radial-gradient(circle at 30% 30%,#fff 0 1px,transparent 2px),linear-gradient(135deg,transparent 45%,rgba(255,255,255,.7) 48%,transparent 52%),'
      : s.tex === 'acid' ? 'linear-gradient(90deg,transparent 40%,rgba(170,255,70,.9) 43% 47%,transparent 50%),radial-gradient(circle at 50% 50%,rgba(255,255,255,.18) 0 2px,transparent 3px) 0 0/5px 4px,'
      : s.tex === 'storm' ? 'linear-gradient(110deg,transparent 45%,rgba(235,220,255,.95) 47%,transparent 49%),radial-gradient(circle at 30% 30%,rgba(255,255,255,.35),transparent 45%),radial-gradient(circle at 70% 55%,rgba(255,255,255,.25),transparent 40%),'
      : s.tex === 'gem' ? 'linear-gradient(120deg,transparent 30%,rgba(255,255,255,.45) 45%,transparent 60%),radial-gradient(circle at 30% 30%,#fff 0 1px,transparent 2px),'
      : s.tex === 'seaglass' ? 'radial-gradient(circle at 35% 40%,rgba(255,255,255,.6) 0 1px,transparent 2px),radial-gradient(circle at 65% 70%,rgba(255,255,255,.5) 0 1px,transparent 2px),' : '')+'linear-gradient(160deg,'+s.css[0]+','+s.css[1]+')';
    return '<span class="dsw"><span class="dsw20" style="background:'+bg+';color:'+s.css[2]+'">20</span><span class="dsw6" style="background:'+bg+';color:'+s.css[2]+'">6</span></span>'; };
  const done = '<div class="mode menufoot" style="justify-content:flex-end;margin-top:10px"><button class="btn done" data-act="menu">'+WORD.ok+'</button></div>';
  // sections fold open in place (one at a time); tapping an open one folds it again
  const chev = open => '<span class="chev mchev'+(open?' open':'')+'" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  // last sync time and the number of differences from D&D Beyond (the change list)
  const when = new Date(DATA.syncedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}), pend = changes().length;
  const syncOpen = menuView === 'sync', diceOpen = menuView === 'dice', skinOpen = menuView === 'skin';
  // one sync option button (disabled while a sync runs)
  const opt = (act, ico, t, sub, off) => '<button class="dsopt syncopt" id="'+act+'btn" data-act="'+act+'"'+(off||syncing?' disabled':'')+'><span class="mico" aria-hidden="true">'+ico+'</span><span class="dst"><b data-label="'+t+'">'+(syncing?'Working…':t)+'</b><span>'+sub+'</span></span></button>';
  const syncBody = '<div class="msub"><div class="diceset">'
    + opt('pull', '⬇️', 'Pull from D&amp;D Beyond', 'D&amp;D Beyond → this app. Works on any device.')
    // push needs the pack's scheduled tasks (claude.ai, Henry); the web app only reads D&D Beyond
    + (PACK.sync && PACK.sync.pushTask && !window.SHEET ? opt('push', '⬆️', pend ? 'Push '+pend+' change'+(pend===1?'':'s') : 'Push changes', pend ? 'This app → D&amp;D Beyond, via Chrome on your computer.' : 'Nothing to push: matches D&amp;D Beyond.', !pend) : '')
    // moving to the web app: the claude.ai sheet gives a code, your own web-app copy takes it (§22)
    + (!window.SHEET ? opt('moveout', '📦', 'Move to the web app', 'Copy this tracker and your notes as a code to paste there.')
      : !VIEW && !window.SHEET.trial ? opt('movein', '📥', 'Bring over from claude.ai', 'Paste the code from the claude.ai sheet.') : '')
    + '</div></div>';
  // the dice-set list, grouped; in edit mode each group and set gets ↑ ↓ buttons
  const diceBody = '<div class="msub"><div class="jumprow dshint" style="margin:0 0 6px"><span class="small muted">'+(diceEdit?'Move groups or sets up and down.':'Tap a set to see it roll · tick the circle to use it.')+'</span><button class="btn small'+(diceEdit?' done':'')+'" data-act="diceedit">'+(diceEdit?''+WORD.ok+'':'↕ Reorder')+'</button></div>'
      + diceGroups().map(([gl, keys, gk], gi, groups) => (gl ? (diceEdit && gk
            ? '<div class="dsgh jumprow"><h4 class="menuh" style="margin:0">'+esc(gl)+'</h4><span class="jarrows"><button class="btn small" data-act="dsgmove" data-g="'+gk+'" data-d="-1"'+(gi?'':' disabled')+' aria-label="Move group up">▲</button><button class="btn small" data-act="dsgmove" data-g="'+gk+'" data-d="1"'+(gi<groups.filter(x=>x[2]).length-1?'':' disabled')+' aria-label="Move group down">▼</button></span></div>'
            : '<h4 class="menuh dsgh">'+esc(gl)+'</h4>') : '') + '<div class="diceset">'+keys.map((k,i,all) => { const s = DICE_SETS[k];
          return diceEdit
            ? '<div class="dsopt dsord">'+sw(s)+'<span class="dst"><b>'+esc(s.name)+'</b></span><span class="jarrows"><button class="btn small" data-act="dsmove" data-k="'+k+'" data-d="-1"'+(i?'':' disabled')+' aria-label="Move up">▲</button><button class="btn small" data-act="dsmove" data-k="'+k+'" data-d="1"'+(i<all.length-1?'':' disabled')+' aria-label="Move down">▼</button></span></div>'
            // the row previews a throw; the round box on the right is what picks the set
            : '<div class="dsopt dsrow'+(k===cur?' on':'')+'"><button class="dsprev" data-act="dsprev" data-k="'+k+'" aria-label="Preview '+esc(s.name)+'">'+sw(s)
              + '<span class="dst"><b>'+esc(s.name)+'</b><span>'+esc(s.desc)+'</span></span><span class="dsroll" aria-hidden="true">🎲</span></button>'
              + '<button class="dspick'+(k===cur?' on':'')+'" data-act="diceset" data-k="'+k+'" aria-pressed="'+(k===cur)+'" aria-label="'+(k===cur?'In use: ':'Use ')+esc(s.name)+'">'+(k===cur?'✓':'')+'</button></div>'; }).join('')+'</div>').join('') + '</div>';
  // web app: one Sync row that opens its own window (§21); claude.ai sheets fold the options open instead
  const webSync = window.SHEET && !VIEW
    ? '<button class="menulink" data-act="syncwin"><span class="mico" aria-hidden="true">🔄</span><span class="dst"><b>Sync with D&amp;D Beyond</b><span>Last synced '+esc(when)+(pend ? ' · '+pend+' difference'+(pend===1?'':'s') : '')+(DATA_OLD && !window.SHEET.trial ? ' · sync for new details' : '')+'</span></span><span class="mchev" aria-hidden="true">›</span></button>'
    : null;
  box.innerHTML = '<div class="cardhead" style="margin-bottom:8px"><h3>☰ Menu</h3><button class="x2" data-act="menu" aria-label="Close">×</button></div>'
    // web app: first the way back to your characters (claude.ai sheets have none), then sync, then dice
    + (window.SHEET && !diceEdit ? '<a class="menulink homelink" href="/"><span class="mico" aria-hidden="true">‹</span><span class="dst"><b>'+(window.SHEET.trial ? 'Back to Dungeon Tracker' : 'Back to all characters')+'</b></span></a><div style="height:8px"></div>' : '')
    + (window.SHEET ? (webSync || '') : '<button class="menulink'+(syncOpen?' open':'')+'" data-act="menuview" data-v="sync" aria-expanded="'+syncOpen+'"><span class="mico" aria-hidden="true">🔄</span><span class="dst"><b>Sync D&amp;D Beyond</b><span>Last synced '+esc(when)+(pend ? ' · '+pend+' to push' : '')+(DATA_OLD ? ' · sync for new details' : '')+'</span></span>'+chev(syncOpen)+'</button>'
    + (syncOpen ? syncBody : ''))
    + skinRow(skinOpen, chev)
    + '<div style="height:8px"></div>'
    + '<button class="menulink'+(diceOpen?' open':'')+'" data-act="menuview" data-v="dice" aria-expanded="'+diceOpen+'">'+sw(DICE_SETS[cur]).replace('class="dsw"','class="dsw one"')+'<span class="dst"><b>Dice Sets</b><span>'+esc(DICE_SETS[cur].name)+'</span></span>'+chev(diceOpen)+'</button>'
    + (diceOpen ? diceBody : '')
    // web app: report a bug or share an idea (web/feedback.js opens the box)
    + (window.SHEET && window.openFeedback && !diceEdit ? '<div style="height:8px"></div><button class="menulink" data-act="feedback"><span class="mico" aria-hidden="true">🐞</span><span class="dst"><b>Report a bug or share an idea</b><span>Goes straight to Menno, who builds Dungeon Tracker</span></span></button>' : '')
    + (diceEdit ? '' : done);
}
// Web app: ☰ → Theme. Eight looks (web/sw-register.js: window.Skin) and light / dark / follow the device.
// Empty on claude.ai sheets.
function skinRow(open, chev){
  const K = window.Skin; if (!K || !window.SHEET) return '';
  const cur = K.skin(), mode = K.mode(), it = K.list.find(x => x[0] === cur) || K.list[0], ML = {auto:'Auto', light:'Light', dark:'Dark'};
  return '<div style="height:8px"></div><button class="menulink'+(open?' open':'')+'" data-act="menuview" data-v="skin" aria-expanded="'+open+'"><span class="mico" aria-hidden="true">🎨</span><span class="dst"><b>Theme</b><span>'+esc(it[1])+' · '+ML[mode]+'</span></span>'+chev(open)+'</button>'
    + (open ? '<div class="msub skinpick"><div class="skingrid">'+K.list.map(([k, n, e, dk, ac, lt]) => '<button class="skinopt'+(k===cur?' on':'')+'" data-act="skinpick" data-k="'+k+'" aria-pressed="'+(k===cur)+'">'
          + '<span class="skinsw" style="background:linear-gradient(135deg,'+lt+' 0 50%,'+dk+' 50% 100%)"><span style="background:'+ac+'"></span></span><span class="skinn">'+e+' '+esc(n)+'</span></button>').join('')+'</div>'
        + '<div class="skinmode" role="group" aria-label="Light or dark">'+['auto','light','dark'].map(m => '<button data-act="skinmode" data-m="'+m+'" aria-pressed="'+(m===mode)+'">'+(m==='auto'?'🖥️ ':m==='light'?'☀️ ':'🌙 ')+ML[m]+'</button>').join('')+'</div>'
        + '<p class="small muted" style="margin:6px 2px 0">Saved on this device. Auto follows your phone or computer’s light/dark setting.</p></div>' : '');
}
// picks a look; a different look reloads the page (theme words and dice sets are read at load)
function skinPick(k){ const K = window.Skin; if (!K) return; const was = K.skin(); K.set(k, K.mode()); if (k !== was) location.reload(); }
// light / dark / auto: no reload needed (CSS only)
function skinMode(m){ const K = window.Skin; if (!K) return; K.set(K.skin(), m); paintMenu(); }
// Desktop windows (rest, menu, Quick roll) leave the way they arrived: fade, lift and shrink a touch; then done().
function winOut(box, done){
  box.getAnimations && box.getAnimations().forEach(x => x.cancel());
  const an = box.animate([{opacity:1, transform:'translate(-50%,0) scale(1)'}, {opacity:0, transform:'translate(-50%,-10px) scale(.97)'}], {duration:180, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'});
  an.onfinish = () => { done(); an.cancel(); };
}
// Opens or closes the ☰ menu. Opening closes the rest window, Quick roll and the HP drawer.
function toggleMenu(){
  const mb = $('#menubox');
  if (menuOpen && deskFine() && mb && !mb.hidden && !reduceMotion() && mb.animate) { menuOpen = false; return winOut(mb, () => { mb.hidden = true; paintMenu(); }); }
  menuOpen = !menuOpen;
  if (menuOpen) { if (restMode) closeRest(); if (rollBoxOpen) closeRollBox(); if (drawerKind && !$('#hpedit').hidden) closeDrawer(); }
  paintMenu();
}
// ── Dice sets in the menu ──────────────────────────────────────────────────────────────────────────────────
// diceEdit: the dice list shows ↑ ↓ arrows to reorder instead of picking
let diceEdit = false;
// Dice set keys in this device's order (ui.diceOrder), any new sets appended in the theme's order.
function diceKeys(){
  const all = Object.keys(DICE_SETS), saved = (ui.diceOrder || []).filter(k => all.includes(k));
  return saved.concat(all.filter(k => !saved.includes(k)));
}
// Sets grouped by style (DICE_GROUPS: the pirate groups, or the look's own), each group in this device's order.
// Returns [[label, keys, groupKey], …]; sets without a known group come last under "Other" (no groupKey).
function diceGroups(){
  const keys = diceKeys(), labels = DICE_GROUPS, out = [];
  diceGroupKeys().forEach(g => { const ks = keys.filter(k => DICE_SETS[k].group === g); if (ks.length) out.push([labels[g], ks, g]); });
  const rest = keys.filter(k => !labels[DICE_SETS[k].group]); if (rest.length) out.push([out.length ? 'Other' : '', rest]);
  return out;
}
// Group order: this device's (ui.diceGroupOrder), new groups appended in the theme's order.
function diceGroupKeys(){
  const all = Object.keys(DICE_GROUPS), saved = (ui.diceGroupOrder || []).filter(g => all.includes(g));
  return saved.concat(all.filter(g => !saved.includes(g)));
}
// moves a dice-set group up (d = -1) or down (d = 1) in the picker
function moveDiceGroup(g, d){
  const gs = diceGroupKeys(), i = gs.indexOf(g), j = i + d; if (i < 0 || j < 0 || j >= gs.length) return;
  [gs[i], gs[j]] = [gs[j], gs[i]]; ui.diceGroupOrder = gs; saveUi(); paintMenu();
}
// move a set up/down within its own group
function moveDiceSet(k, d){
  const keys = diceKeys(), g = DICE_SETS[k].group, same = keys.filter(x => DICE_SETS[x].group === g), a = same.indexOf(k), b = a + d;
  if (a < 0 || b < 0 || b >= same.length) return;
  const i = keys.indexOf(k), j = keys.indexOf(same[b]); [keys[i], keys[j]] = [keys[j], keys[i]]; ui.diceOrder = keys; saveUi(); paintMenu();
}
// Previews a set: a sample throw (a d20 and two random other dice) in it, without selecting it.
function previewDiceSet(k){
  // a short press flash on the card, only on a real tap (never while scrolling the list)
  const row = document.querySelector('.dsprev[data-k="'+k+'"]'); const card = row && row.closest('.dsrow');
  if (card) { card.classList.add('tapped'); setTimeout(() => card.classList.remove('tapped'), 180); }
  if (!DICE_SETS[k] || fxBusy) return;
  const others = [4,6,8,10,12].sort(() => Math.random() - .5).slice(0, 2).sort((x,y) => y - x);
  DICE_PREVIEW = k;
  fx(null, () => { DICE_PREVIEW = null; }, [20].concat(others).map(sd => ({s:sd, v:r(sd)})));
  if (!fxBusy) DICE_PREVIEW = null;   // reduced motion: nothing was thrown
}
// After a new player's first 3D throw (with the random set they were given): a small note offering the dice picker,
// once per device. It goes away by itself after 15 s.
function dicePromptMaybe(){
  if (!ui.diceAuto || ui.dicePrompted || VIEW) return;
  ui.dicePrompted = true; saveUi();
  const s = DICE_SETS[ui.dice] || {}, el = document.createElement('div'); el.className = 'diceask'; el.setAttribute('role', 'status');
  el.innerHTML = '<span>🎲 You just rolled the <b>'+esc(s.name||'')+'</b> dice. Fancy a different set?</span>'
    + '<span class="diceaskbtns"><button class="btn small" data-act="diceask">Choose dice</button><button class="btn small ghost" data-act="diceaskno">Keep these</button></span>';
  document.body.appendChild(el); setTimeout(() => el.remove(), 15000);
}
// removes that note
function closeDiceAsk(){ const el = document.querySelector('.diceask'); if (el) el.remove(); }
// Selects a set (no throw: the row's preview does that). Remembered on this device, per look (ui.diceBySkin).
function pickDiceSet(k){
  if (!DICE_SETS[k]) return; ui.dice = k; ui.diceAuto = false; ui.diceBySkin = Object.assign({}, ui.diceBySkin, { [DICE_LOOK]: k }); saveUi(); paintMenu();
  const b = document.querySelector('.dspick.on'); if (b && b.animate && !reduceMotion()) b.animate([{transform:'scale(.6)'},{transform:'scale(1.15)'},{transform:'scale(1)'}], {duration:260, easing:'cubic-bezier(.2,.8,.2,1)'});
}
// ── Rest window: open and close ────────────────────────────────────────────────────────────────────────────
// restMode: null (closed), 'choose', 'short', 'long' or 'done'; restLog: lines about what this rest did
let restMode = null, restLog = [];
// Opens the rest window in a mode (falsy closes it). Phones: it grows open from the top bar; desktop: a window.
function openRest(mode){
  if (!mode) return closeRest();
  if (drawerKind && !$('#hpedit').hidden) closeDrawer();
  if (menuOpen) { menuOpen = false; paintMenu(); }
  if (rollBoxOpen) closeRollBox();
  const box = $('#restbox'); if (!box) return;
  const wasOpen = !box.hidden, from = wasOpen ? box.offsetHeight : 0;
  restMode = mode; if (mode !== 'short') restLog = mode === 'long' ? [] : restLog;
  box.getAnimations && box.getAnimations().forEach(x => x.cancel());
  box.style.transform = box.style.opacity = box.style.transition = '';
  paintRest();
  if (reduceMotion() || !box.animate) return;
  const h = box.offsetHeight;
  if (wasOpen) { box.animate([{height:from+'px'},{height:h+'px'}], {duration:200, easing:'cubic-bezier(.2,.8,.2,1)'}); if (box.firstElementChild) box.querySelectorAll(':scope > *').forEach(c => c.animate([{opacity:0},{opacity:1}], {duration:160})); return; }
  if (deskFine()) return;   // desktop: it opens as a window with its own CSS animation, in place
  box.animate([{height:'0px', opacity:0, transform:'translateY(-8px)', paddingTop:'0px', paddingBottom:'0px', marginTop:'0px'},
               {height:h+'px', opacity:1, transform:'translateY(0)'}], {duration:240, easing:'cubic-bezier(.2,.8,.2,1)'});
}
// Closes the rest window. dir 'left' / 'right' slides it out that way (a swipe); otherwise it folds up.
function closeRest(dir){
  const box = $('#restbox'); if (!box || box.hidden) { restMode = null; restLog = []; return paintRest(); }
  const done = () => { restMode = null; restLog = []; box.style.transform = box.style.opacity = box.style.transition = ''; paintRest(); };
  if (reduceMotion() || !box.animate) return done();
  if (deskFine()) return winOut(box, done);   // desktop window: fade and lift out, the reverse of how it came in
  const h = box.offsetHeight;
  if (dir === 'left' || dir === 'right') {
    box.style.transition = 'transform .18s ease-in, opacity .18s ease-in'; box.style.transform = 'translateX('+(dir==='left'?'-':'')+'110%)'; box.style.opacity = '0';
    setTimeout(() => { box.style.transition = 'none'; const an = box.animate([{height:h+'px'},{height:'0px', paddingTop:'0px', paddingBottom:'0px', marginTop:'0px'}], {duration:160, easing:'ease-in'}); an.onfinish = done; }, 170);
    return;
  }
  const an = box.animate([{height:h+'px', opacity:+(box.style.opacity||1), transform:box.style.transform || 'translateY(0)'},
                          {height:'0px', opacity:0, transform:'translateY(-12px)', paddingTop:'0px', paddingBottom:'0px', marginTop:'0px'}], {duration:200, easing:'ease-in'});
  an.onfinish = done;
}
// ── Quick roll drawer ──────────────────────────────────────────────────────────────────────────────────────
let rollBoxOpen = false;
// Opens Quick roll (or closes it when it's open). Closes the menu, the rest window and the HP drawer.
function openRollBox(){
  const box = $('#rollbox'); if (!box) return;
  if (drawerKind && !$('#hpedit').hidden) closeDrawer();
  if (menuOpen) { menuOpen = false; paintMenu(); }
  if (rollBoxOpen) return closeRollBox();
  if (restMode) closeRest();
  rollBoxOpen = true;
  box.getAnimations && box.getAnimations().forEach(x => x.cancel());
  box.style.transform = box.style.opacity = box.style.transition = '';
  paintRollBox();
  if (reduceMotion() || !box.animate) return;
  const h = box.offsetHeight;
  if (deskFine()) return;
  box.animate([{height:'0px', opacity:0, transform:'translateY(-8px)', paddingTop:'0px', paddingBottom:'0px', marginTop:'0px'},
               {height:h+'px', opacity:1, transform:'translateY(0)'}], {duration:240, easing:'cubic-bezier(.2,.8,.2,1)'});
}
// Closes Quick roll; dir 'left' / 'right' slides it out that way (a swipe).
function closeRollBox(dir){
  const box = $('#rollbox'); if (!box || box.hidden) { rollBoxOpen = false; return paintRollBox(); }
  const done = () => { rollBoxOpen = false; box.style.transform = box.style.opacity = box.style.transition = ''; paintRollBox(); };
  if (reduceMotion() || !box.animate) return done();
  if (deskFine()) return winOut(box, done);
  const h = box.offsetHeight;
  if (dir === 'left' || dir === 'right') {
    box.style.transition = 'transform .18s ease-in, opacity .18s ease-in'; box.style.transform = 'translateX('+(dir==='left'?'-':'')+'110%)'; box.style.opacity = '0';
    setTimeout(() => { box.style.transition = 'none'; const an = box.animate([{height:h+'px'},{height:'0px', paddingTop:'0px', paddingBottom:'0px', marginTop:'0px'}], {duration:160, easing:'ease-in'}); an.onfinish = done; }, 170);
    return;
  }
  const an = box.animate([{height:h+'px', opacity:+(box.style.opacity||1), transform:box.style.transform || 'translateY(0)'},
                          {height:'0px', opacity:0, transform:'translateY(-12px)', paddingTop:'0px', paddingBottom:'0px', marginTop:'0px'}], {duration:200, easing:'ease-in'});
  an.onfinish = done;
}
// The Quick roll rows by section: [[title, rows, kind], …] with Favourites first. Each row is
// {term, label, bonus, sub, q}; q is the lower-case text the search box matches against.
function qrRows(){
  const tag = (s) => s.exp ? 'expertise' : s.prof ? 'proficient' : '';
  const row = (term, label, bonus, sub, q) => ({term, label, bonus, sub, q:(label+' '+sub+' '+(q||'')).toLowerCase()});
  const init = row('Initiative','Initiative',D.initiative,'DEX'+(/Rakish/.test(D.initNote)?' + CHA':'')+(/proficiency/.test(D.initNote)?' + PB':''),'init start fight combat');
  const skills = D.skills.map(s => row(s.name, s.name, s.bonus, abbr(s.a)+(tag(s)?' · '+tag(s):''), 'skill'));
  const saves = D.saves.map(s => row(ABIL_NAME[s.a], s.name+' save', s.bonus, abbr(s.a)+(s.prof?' · proficient':''), 'save saving throw'));
  const checks = [init].concat(['str','dex','con','int','wis','cha'].map(a => row(ABIL_NAME[a], ABIL_NAME[a]+' check', D.mod[a], abbr(a)+' raw', 'ability check')));
  // tools: the ones this character is proficient with, plus thieves' tools if they carry them
  const owned = n => (DATA.inventory||[]).some(i => i.name.toLowerCase().startsWith(n.toLowerCase()));
  const toolList = [...new Set(D.profs.tools.map(t => profKey(t)).concat(owned("Thieves' Tools") ? ["Thieves' Tools"] : []))];
  const tools = toolList.map(t => { const ab = toolAbility(t), base = t.split(/\s/)[0].replace(/[’']s?$/,'');
    return row(t, t.replace("'",'’'), toolBonus(ab, base), abbr(ab)+(toolProf(base)?' · proficient':''), 'tool '+(TOOL_WORDS[t]||'')); });
  // ⭐ Favourites: starred rolls, in the order they were starred
  const all = [].concat(skills, saves, checks, tools), fav = qrFavs().map(l => all.find(r => r.label === l)).filter(Boolean);
  return [['⭐ Favourites', fav, 'fav'], ['Skills', skills], ['Saving throws', saves], ['Ability checks', checks], ['Tools', tools]];
}
// Quick roll favourites (labels). Starts with the old "most used" set until the player changes it.
const qrFavs = () => Array.isArray(ui.qrFav) ? ui.qrFav : ['Initiative','Perception','Stealth','Insight','Investigation','Athletics','Acrobatics'];
// Stars or unstars a Quick roll row and repaints the list in place (search text and scroll positions kept).
function toggleQrFav(l){
  const f = qrFavs().slice(), i = f.indexOf(l); if (i < 0) f.push(l); else f.splice(i, 1); ui.qrFav = f; saveUi();
  const box = $('#rollbox'), q = ($('#qrsearch')||{}).value || '', top = box ? box.scrollTop : 0, lt = box && box.querySelector('.qrlist') ? box.querySelector('.qrlist').scrollTop : 0;
  paintRollBox(); const inp = $('#qrsearch'); if (inp && q) { inp.value = q; inp.dispatchEvent(new Event('input')); }
  if (box) { box.scrollTop = top; const ql = box.querySelector('.qrlist'); if (ql) ql.scrollTop = lt; }
}
// ── Drag to reorder ────────────────────────────────────────────────────────────────────────────────────────
// Drag to reorder a list. Mouse: press and drag. Touch: hold ~0.35 s, then drag (a quick swipe still scrolls).
// root: an element that stays on the page (listeners are bound once per name); name: which list on that root;
// rowSel: the draggable rows inside it; keyOf(row) → its key; done(order) gets the new order of keys;
// skip() → true pauses dragging. A drag never counts as a tap (the click after it is swallowed).
function bindDragList(root, name, rowSel, keyOf, done, skip){
  if (!root || (root._drags = root._drags || {})[name]) return; root._drags[name] = true;
  let d = null;
  // the visible sibling rows of a row
  const rowsNow = row => [...row.parentElement.children].filter(r => r.matches(rowSel) && !r.hidden);
  // the drag starts: measure the rows once, lift the row
  const begin = () => {
    if (!d) return; d.armed = true; d.rows = rowsNow(d.row); d.i = d.rows.indexOf(d.row); d.to = d.i;
    d.tops = d.rows.map(r => r.getBoundingClientRect().top); d.hs = d.rows.map(r => r.getBoundingClientRect().height);
    d.row.classList.add('dragging'); root.classList.add('dragmode'); d.rows.forEach(r => { if (r !== d.row) r.style.transition = 'transform .15s ease'; });
    if (d.touch && navigator.vibrate) try { navigator.vibrate(12); } catch(_){}
  };
  // follow the pointer; rows between the old and new place shift by the dragged row's height (plus the gap)
  const move = y => {
    const dy = y - d.y0; d.row.style.transform = 'translateY('+dy+'px)';
    const mid = d.tops[d.i] + d.hs[d.i]/2 + dy;
    const gap = d.rows.length > 1 ? (d.i + 1 < d.rows.length ? d.tops[d.i+1] - d.tops[d.i] - d.hs[d.i] : d.tops[d.i] - d.tops[d.i-1] - d.hs[d.i-1]) : 0;
    const h = d.hs[d.i] + Math.max(0, gap);
    d.to = d.rows.filter((r, j) => j !== d.i && d.tops[j] + d.hs[j]/2 < mid).length;
    d.rows.forEach((r, j) => { if (j === d.i) return;
      const shift = (d.i < d.to && j > d.i && j <= d.to) ? -h : (d.i > d.to && j >= d.to && j < d.i) ? h : 0;
      r.style.transform = shift ? 'translateY('+shift+'px)' : ''; });
  };
  // drop: reset styles, swallow the next click, report the new order if it changed
  const finish = () => {
    if (!d) return; clearTimeout(d.timer); const was = d; d = null;
    if (!was.armed) return;
    root.classList.remove('dragmode');
    was.rows.forEach(r => { r.style.transform = r.style.transition = ''; }); was.row.classList.remove('dragging');
    const eat = e => { e.stopPropagation(); e.preventDefault(); }; window.addEventListener('click', eat, {capture:true, once:true}); setTimeout(() => window.removeEventListener('click', eat, {capture:true}), 300);
    if (was.to === was.i) return;
    const order = was.rows.map(keyOf), [m] = order.splice(was.i, 1); order.splice(was.to, 0, m);
    done(order);
  };
  root.addEventListener('pointerdown', e => {
    const row = e.target.closest(rowSel); if (!row || !root.contains(row) || e.button > 0 || (skip && skip())) return;
    if (e.target.closest('input,textarea,select,summary')) return;
    if (rowsNow(row).length < 2) return;
    d = {row, y0:e.clientY, x0:e.clientX, pid:e.pointerId, touch: e.pointerType !== 'mouse', armed:false};
    if (d.touch) d.timer = setTimeout(begin, 350);
  });
  root.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.pid) return;
    const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
    if (!d.armed) { if (d.touch) { if (dist > 8) { clearTimeout(d.timer); d = null; } return; } if (dist < 6) return; begin(); }
    e.preventDefault(); move(e.clientY);
  });
  root.addEventListener('touchmove', e => { if (d && d.armed) e.preventDefault(); }, {passive:false});
  root.addEventListener('contextmenu', e => { if (d && d.touch) e.preventDefault(); });
  // stop the browser starting a text selection on a long press inside a draggable row
  root.addEventListener('selectstart', e => { if (e.target.closest && e.target.closest(rowSel) || (e.target.parentElement && e.target.parentElement.closest(rowSel))) e.preventDefault(); });
  ['pointerup','pointercancel'].forEach(t => root.addEventListener(t, e => { if (d && e.pointerId === d.pid) finish(); }));
}
// Makes Quick roll's favourites draggable (paused while searching); repaints with scroll positions kept.
function bindQrDrag(box){
  bindDragList(box, 'qr', '.qrfav .qrrow', r => r.querySelector('.qrgo').dataset.l, order => {
    ui.qrFav = order.concat(qrFavs().filter(l => !order.includes(l))); saveUi();
    const top = box.scrollTop, ql = box.querySelector('.qrlist'), lt = ql ? ql.scrollTop : 0;
    paintRollBox(); box.scrollTop = top; const q2 = box.querySelector('.qrlist'); if (q2) q2.scrollTop = lt;
  }, () => ($('#qrsearch')||{}).value);
}
// Draws Quick roll: pinned title and search, then the sections. The search hides rows that don't match and shows
// each match once.
function paintRollBox(){
  const box = $('#rollbox'), btn = $('#rollbtn'); if (!box) return;
  bindQrDrag(box);
  fitDock();
  box.hidden = !rollBoxOpen; if (btn) btn.setAttribute('aria-expanded', String(rollBoxOpen));
  if (!rollBoxOpen) { box.innerHTML = ''; return; }
  // title and search stay pinned at the top while the list scrolls
  box.innerHTML = '<div class="qrtop"><div class="cardhead" style="margin-bottom:8px"><h3>🎲 Quick roll</h3><button class="x2" data-act="rollboxclose" aria-label="Close">×</button></div>'
    + '<input id="qrsearch" class="qrsearch" type="search" placeholder="Search: perception, initiative, stealth, lock…" autocomplete="off">'
    + '</div>'
    + '<div class="qrlist">'+qrRows().map(([title, rows, kind]) => '<div class="qrsec'+(kind?' qr'+kind:'')+'"><h4 class="menuh">'+title+(kind === 'fav' && rows.length > 1 ? '<span class="qrdraghint">'+(deskFine() ? 'drag to reorder' : 'hold and drag to reorder')+'</span>' : '')+'</h4>'
        + (kind === 'fav' && !rows.length ? '<p class="small muted qrhint">Tap ☆ next to a roll to pin it here.</p>' : '')
        + rows.map(r => { const on = qrFavs().includes(r.label);
          return '<div class="qrrow" data-q="'+esc(r.q)+'"><div class="qrn"><span class="qrl"><button class="spstar'+(on?' on':'')+'" data-act="qrfav" data-l="'+esc(r.label)+'" aria-pressed="'+on+'" aria-label="'+(on?'Remove from':'Add to')+' favourites">'+(on?'★':'☆')+'</button><button type="button" class="term" data-term="'+esc(r.term)+'">'+esc(r.label)+'</button></span><span class="small muted">'+esc(r.sub)+'</span></div>'
          + '<button class="btn rollbtn qrgo '+(/ save$/.test(r.label)?'savebtn':'primary')+'" data-act="qroll" data-l="'+esc(r.label)+'" data-b="'+r.bonus+'">'+(/ save$/.test(r.label)?'🛡️ ':'🎲 ')+sgn(r.bonus)+'</button></div>'; }).join('') + '</div>').join('')
    + '<p class="small muted qrnone" hidden>Nothing matches. Try a skill, save or ability name.</p></div>';
  const inp = $('#qrsearch');
  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase(); let any = false;
    box.querySelectorAll('.qrsec').forEach(sec => { let n = 0; sec.querySelectorAll('.qrrow').forEach(r => { const on = !q || r.dataset.q.includes(q); r.hidden = !on; if (on) n++; }); sec.hidden = !n; if (n) any = true; });
    // with a search, show each match once (first section wins)
    if (q) { const seen = new Set(); box.querySelectorAll('.qrrow:not([hidden])').forEach(r => { const k = r.querySelector('.qrgo').dataset.l; if (seen.has(k)) r.hidden = true; seen.add(k); }); box.querySelectorAll('.qrsec').forEach(sec => { sec.hidden = !sec.querySelector('.qrrow:not([hidden])'); }); }
    box.querySelector('.qrnone').hidden = any;
    const h = box.querySelector('.qrhint'); if (h) { h.hidden = !!q; h.closest('.qrsec').hidden = !!q; }
  });
}
// rolls a check from Quick roll (closes the drawer first)
function quickRoll(label, bonus){ closeRollBox(); closeTip(); rollCheck(label, bonus); }
// ── Rests ──────────────────────────────────────────────────────────────────────────────────────────────────
// hit dice left for a class
function hdLeft(h){ return h.total - (S.hd[h.cls]||0); }
// hit-dice pips for the short rest window (tap to spend or undo one rolled with real dice)
function diePips(h, label){
  const left = hdLeft(h);
  return '<div class="pipwrap"><div class="pips">'+pipMask('hd:'+h.cls, h.total, h.total - left).map((u,i)=>{ const ready = !u;
      return '<button class="pip '+(ready?'ready':'used')+'" data-act="hdpip" data-cls="'+esc(h.cls)+'" data-i="'+i+'" data-r="'+(ready?1:0)+'" aria-label="'+esc(h.cls)+' '+h.die+' '+(i+1)+(ready?' (ready, tap when rolled)':' (rolled, tap to undo)')+'">'+(ready?'✓':'✕')+'</button>'; }).join('')+'</div>'
    + '<span class="piplbl'+(left?'':' none')+'">'+(label?label+' · ':'')+(left?left+' of '+h.total+' left':'all used')+'</span></div>';
}
// hit dice spent during this short rest, per class (for the summary)
let restSpent = {};
// What a short rest gives back, as text: "Action Surge", "all Ki points", "2 Superiority Dice"
const restBackList = () => RES.filter(r => r.short).map(r => r.max === 1 ? r.name : r.short === 'all' ? 'all '+r.unit[1] : r.short+' '+resWord(r, r.short));
// "Restore: Action Surge, 3 Superiority Dice, 1 Second Wind" with the counts that will actually come back; each is a
// tappable term. Says what's already full when nothing needs restoring.
function restNote(){
  const t = (term, label) => '<button type="button" class="term" data-term="'+esc(term)+'">'+esc(label)+'</button>';
  const parts = RES.filter(r => r.short && S[r.key] > 0).map(r => { const n = shortBack(r);
    return r.max === 1 ? t(r.name, r.name) : n+' '+t(r.name, resWord(r, n)); });
  if (restRestored) return 'Restored.';
  const shorts = RES.filter(r => r.short).map(r => r.name);
  if (!shorts.length) return 'Nothing comes back on a short rest except what your hit dice heal.';
  return parts.length ? 'Restore: '+parts.join(', ') : 'Nothing to restore: '+(shorts.length > 1 ? shorts.slice(0,-1).join(', ')+' and '+shorts.slice(-1) : shorts[0])+(shorts.length > 1 ? ' are all full.' : ' is full.');
}
// Short rest: give back the abilities (its own animation and a small result sheet). Done does it silently if you forgot.
let restRestored = false;
// Gives back what a short rest returns for free, once per rest. quiet: no animation or result sheet.
function restoreShort(quiet){
  if (restRestored) return; restRestored = true;
  const back = RES.filter(r => r.short), before = Object.fromEntries(back.map(r => [r.key, S[r.key]]));
  back.forEach(r => { S[r.key] = Math.max(0, S[r.key] - shortBack(r)); }); save(); paintRes();
  if (restBackList().length) restLog.push('Short rest: '+restBackList().join(', ')+' back.');
  if (quiet) return;
  paintRest();
  const ln = (lb, t) => '<div class="ln"><span class="lb">'+lb+'</span>'+t+'</div>';
  fx('restore', () => showRoll('<div class="head"><span class="title">Abilities restored</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + '<div class="bd">'
    + back.map(r => ln((r.emoji ? r.emoji+' ' : '')+esc(r.label||r.name), (r.max-before[r.key])+' → <b>'+(r.max-S[r.key])+'</b> / '+r.max+(r.die?' '+r.die:''))).join('')
    + '</div><div class="nextrow"><button class="btn done" data-act="close">'+WORD.ok+'</button></div>', false, 'next') || autoCloseRoll());
}
// Drawers that don't fit get a "scroll for more" strip until you reach the bottom (and a top one once scrolled).
// Binds its scroll and resize listeners once per box.
function markScroll(box){
  if (!box) return;
  const upd = () => {
    // a few pixels of overflow (rounding, margins) shouldn't make a scroll bar: hide it then
    box.classList.remove('noscroll'); const over = box.scrollHeight - box.clientHeight;
    if (over > 0 && over <= 24) { box.classList.add('noscroll'); box.scrollTop = 0; }
    box.classList.toggle('more', !box.classList.contains('noscroll') && box.scrollHeight - box.scrollTop - box.clientHeight > 10); box.classList.toggle('moreup', box.scrollTop > 10); };
  if (!box.dataset.scrollhint) { box.dataset.scrollhint = '1'; box.addEventListener('scroll', upd, {passive:true}); window.addEventListener('resize', upd); }
  requestAnimationFrame(upd);
}
// The summary sheet at the end of a rest: lines of [label, html]; closes itself after 5 s.
function restSummary(title, lines){
  const ln = (lb, t) => '<div class="ln"><span class="lb">'+lb+'</span>'+t+'</div>';
  showRoll('<span hidden data-heal></span><div class="head"><span class="title">'+title+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + '<div class="bd">'+lines.map(([a,b]) => ln(a,b)).join('')+'</div><div class="nextrow"><button class="btn done" data-act="close">'+WORD.ok+'</button></div>', false, 'next');
  autoCloseRoll(5000);
}
// Confirmation sheets (rests, restore, healing) close themselves after a few seconds: a thin bar runs out,
// then the sheet slides away. Touching the sheet keeps it open.
const AUTOCLOSE_MS = 4000;   // restore and healing sheets; rest summaries pass 5000
// Closes the roll sheet after ms (default AUTOCLOSE_MS), unless it's touched (then it stays) or hovered (paused).
function autoCloseRoll(ms){
  ms = ms || AUTOCLOSE_MS;
  const card = $('#dock .roll'); if (!card) return; let keep = false;
  card.insertAdjacentHTML('beforeend', '<div class="autobar" aria-hidden="true" style="animation-duration:'+ms+'ms"></div>');
  card.addEventListener('pointerdown', () => { keep = true; card.classList.add('kept'); clearTimeout(t); }, {once: true});
  // mouse hover pauses the countdown (bar freezes), leaving resumes it with the time that was left
  let left = ms, t0 = Date.now(), t = 0;
  const go = () => { t0 = Date.now(); t = setTimeout(() => { if (!keep && card.isConnected && $('#dock .roll') === card) closeRoll(); }, left); };
  card.addEventListener('mouseenter', () => { if (keep) return; clearTimeout(t); left = Math.max(300, left - (Date.now() - t0)); card.classList.add('paused'); });
  card.addEventListener('mouseleave', () => { if (keep || !card.classList.contains('paused')) return; card.classList.remove('paused'); go(); });
  if (card.matches(':hover')) { card.classList.add('paused'); } else go();
}
// Ends the short rest: restores anything not yet restored, closes the window, then the summary.
function finishShortRest(){
  const hp = S.hp, spent = Object.entries(restSpent).filter(([,n]) => n), wasRestored = restRestored;
  restoreShort(true); restSpent = {}; restRestored = false; closeRest();
  fx('shortrest', () => restSummary('Short rest done', [
    ['❤️ Hit points', '<b>'+hp+'</b> / '+D.hpMax],
    ['🎲 Hit dice', spent.length ? spent.map(([c,n]) => n+' '+esc(c)).join(', ')+' spent' : 'none spent'],
    restBackList().length && ['⚡ Abilities', wasRestored ? 'restored' : esc(restBackList().join(', '))+' back']
  ].filter(Boolean)));
}
// Long rest: full HP, all hit dice and uses back, temporary HP and concentration end; then the summary.
function finishLongRest(){
  const hp = S.hp;
  RES.forEach(r => { S[r.key] = 0; }); S.conc = null; S.hp = D.hpMax; S.temp = 0; Object.keys(S.hd).forEach(k => S.hd[k] = 0); save(); paintRes();
  restLog = ['Long rest done: full HP, all hit dice and abilities back.']; restSpent = {}; closeRest();
  fx('longrest', () => restSummary('Long rest done', [
    ['❤️ Hit points', hp+' → <b>'+D.hpMax+'</b> / '+D.hpMax],
    ['🎲 Hit dice', 'all back ('+D.hitDice.map(h => h.total+h.die).join(' + ')+')'],
    RES.length && ['⚡ Abilities', esc(RES.filter(r => !r.spell).map(r => r.max === 1 ? r.name : 'all '+r.unit[1]).concat(RES.some(r => r.spell) ? ['all spell slots'] : []).join(', '))+' back']
  ].filter(Boolean)));
}
// Short rest: roll one hit die in the app. Sheet first, then the animation and dice, then the result is written in;
// the die is ticked off and the healing added to HP at that moment (so the HP tile changes with the reveal).
// hdBusy: a hit-die roll is under way (ignore taps until it lands)
let hdBusy = false;
// Spends and rolls one hit die of a class during a short rest (heals d + CON, at least 0).
function rollHitDie(cls){
  const h = D.hitDice.find(x=>x.cls===cls); if (!h || hdLeft(h) <= 0 || hdBusy) return;
  hdBusy = true; cur = null; checkRoll = null;
  const sides = +h.die.slice(1), con = D.mod.con, v = r(sides), heal = Math.max(0, v + con), from = S.hp;
  const card = veil => '<span hidden data-heal></span><div class="head"><span class="title">Hit die · '+esc(cls)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div>'
    + '<div class="nums"><span class="n'+(veil?' still':'')+'">'+(veil?'?':'+'+heal)+'<small>HP healed</small></span></div>'
    + '<div class="bd"><div class="ln"><span class="lb">Hit die</span><span class="dc">1'+h.die+'</span> '+(veil?'<b class="die q">?</b>':dieF(v,'hd'))+' <span class="mod">'+sgn(con)+'</span> = <b>'+(veil?'?':heal)+'</b></div>'
    + (veil ? '' : '<div class="ln"><span class="lb">Hit points</span>'+from+' → <b>'+S.hp+'</b> / '+D.hpMax+'</div>') + '</div>'
    + (veil ? '' : '<div class="nextrow">'+(hdLeft(h) ? '<button class="btn" data-act="hdroll" data-cls="'+esc(cls)+'">🎲 Roll another</button>' : '')+'<button class="btn done" data-act="close">'+WORD.ok+'</button></div>');
  showRoll(card(true), false, 'next');
  afterSheet(() => fx('rest', () => {
    hdBusy = false;
    S.hd[cls] = (S.hd[cls]||0) + 1; restSpent[cls] = (restSpent[cls]||0) + 1; S.hp = Math.min(D.hpMax, S.hp + heal);
    restLog.push(cls+' '+h.die+': rolled '+v+' '+sgn(con)+' → +'+heal+' HP');
    save(); paintRes(); paintRest();
    flipKeys.add('hd'); if (!$('#dock').hidden) showRoll(card(false), true); flipKeys.clear();   // stays until you tap Aye: easy to miss otherwise
  }, [{s:sides, v}]));
}
// Short rest: spend a hit die rolled with real dice (healing is added by hand on the HP tile).
function spendHitDie(cls){
  const h = D.hitDice.find(x=>x.cls===cls); if (!h || hdLeft(h) <= 0) return;
  S.hd[cls] = (S.hd[cls]||0) + 1; restSpent[cls] = (restSpent[cls]||0) + 1; save(); paintRes(); paintRest();
}
// undo a spent hit die
function unspendHitDie(cls){
  if (!((S.hd[cls]||0) > 0)) return;
  S.hd[cls] = Math.max(0, (S.hd[cls]||0) - 1); if (restSpent[cls] > 0) restSpent[cls]--; save(); paintRes(); paintRest();
}
// Long rest tooltips: the glossary key for a resource (its own entry, or one made from its description and added
// to G).
function resTerm(r){
  const k = [r.name, ...(r.terms||[]), r.label].find(x => x && G[x]); if (k) return k;
  const txt = String(r.desc||'').replace(/<\/?b>/g, '**').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
  G[r.name] = [r.short ? 'Short rest' : 'Long rest', txt || ('**'+r.max+' use'+(r.max>1?'s':'')+'.**')];
  return r.name;
}
// Glossary entries for the rest screens (hit points, hit dice, spell slots, Pact Magic), added only when G has none.
function lrTerms(){
  const put = (k, v) => { if (!G[k]) G[k] = v; };
  put('Hit points', ['Health', '**'+D.hpMax+' at full.** At 0 you fall unconscious and make death saves.\n• A long rest heals you to full\n• Temporary HP go first and end on a long rest']);
  put('Hit dice', ['Rule', '**Heal on a short rest: roll a hit die + CON ('+sgn(D.mod.con)+').**\n• Yours: '+D.hitDice.map(h => h.total+h.die).join(' + ')+'\n• All of them come back on a long rest']);
  put('Spell slots', ['Spellcasting', '**Spend one to cast a spell of that level or lower.**\n• A higher slot often makes the spell stronger\n• Cantrips never use a slot\n• All come back on a long rest']);
  put('Pact Magic', ['Spellcasting', '**Warlock slots, all the same level.**\n• Every Pact Magic spell is cast at that level\n• All come back on a short or long rest']);
}
// Draws the rest window for restMode: choose, short rest (free restores + hit dice), long rest (what comes back), done.
function paintRest(){
  const box = $('#restbox'), btn = $('#restbtn'); if (!box) return;
  fitDock();
  box.hidden = !restMode; if (btn) btn.setAttribute('aria-expanded', String(!!restMode));
  if (!restMode) { box.innerHTML = ''; return; }
  const head = (t) => '<div class="cardhead" style="margin-bottom:6px"><h3>'+t+'</h3><button class="x2" data-act="restclose" aria-label="Close">×</button></div>';
  const log = restLog.length ? '<ul class="restlog">'+restLog.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>' : '';
  if (restMode === 'choose') {
    box.innerHTML = head('Take a rest') + '<div class="restpick">'
      + '<button class="restopt" data-act="restmode" data-rest="short"><b>⛺ Short rest</b><span>1 hour. Spend hit dice to heal.'+(restBackList().length ? ' '+esc(restBackList().join(', ').replace(/, ([^,]*)$/, ' and $1')).replace(/^./, ch => ch.toUpperCase())+' come back.' : '')+'</span></button>'
      + '<button class="restopt" data-act="restmode" data-rest="long"><b>🌙 Long rest</b><span>8 hours. Everything comes back: HP, hit dice and all uses.</span></button></div>'
      + '<div class="mode btnrow" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-act="restclose">Close</button></div>';
    return;
  }
  if (restMode === 'done') { box.innerHTML = head('Rested') + log + '<div class="mode" style="justify-content:flex-end"><button class="btn done" data-act="restclose">'+WORD.ok+'</button></div>'; return; }
  if (restMode === 'long') {
    // grouped cards: health, abilities, spellcasting, extras
    // every chip opens its tooltip (the feature, the spell, or how slots work)
    const chip = (ic, t, n, term) => '<button type="button" class="lrchip term" data-term="'+esc(term||t)+'">'+(ic ? '<span aria-hidden="true">'+ic+'</span> ' : '')+'<span class="lrt">'+esc(t)+'</span>'+(n ? ' <b>×'+n+'</b>' : '')+'</button>';
    const tm = (k, t) => '<button type="button" class="term" data-term="'+esc(k)+'">'+esc(t||k)+'</button>';
    lrTerms();
    const abil = RES.filter(r => !r.spell), slots = RES.filter(r => r.spell && !r.freeOf), free = RES.filter(r => r.freeOf);
    const grp = (ic, t, body) => '<div class="lrgrp"><div class="lrh"><span aria-hidden="true">'+ic+'</span> '+t+'</div>'+body+'</div>';
    const notes = MODS.map(m => m.longRestNote).filter(Boolean).concat('your DM may hand out Heroic Inspiration');
    box.innerHTML = head('🌙 Long rest · 8 hours')
      + '<p class="small muted" style="margin:0 0 10px">Everything comes back:</p><div class="lrgrid">'
      + grp('❤️', 'Health', '<div class="lrrow"><span>'+tm('Hit points')+'</span><b>'+S.hp+' → '+D.hpMax+'</b></div>'+(S.temp ? '<div class="lrrow small muted"><span>Temporary HP</span><span>ends</span></div>' : '')
          + '<div class="lrrow"><span>'+tm('Hit dice')+'</span><b>'+D.hitDice.map(h => h.total+h.die).join(' + ')+'</b></div>')
      + (abil.length ? grp('⚡', 'Abilities', '<div class="lrchips">'+abil.map(r => chip(r.emoji && r.emoji !== '🔋' ? r.emoji : '', r.label || r.name.replace(/^Font of Magic: /,''), r.max > 1 ? r.max : 0, resTerm(r))).join('')+'</div>') : '')
      + (slots.length || free.length ? grp('🪄', 'Spellcasting', '<div class="lrchips">'+slots.map(r => chip('', r.key==='pact' ? 'Pact Magic' : ORD(r.slotLevel), r.max, r.key==='pact' ? 'Pact Magic' : 'Spell slots')).join('')+free.map(r => chip('✨', r.freeOf, r.max > 1 ? r.max : 0, G[r.freeOf] ? r.freeOf : resTerm(r))).join('')+'</div>'
          + (slots.length ? '<div class="small muted" style="margin-top:6px">Spell slots by level, plus free casts.</div>' : '')) : '')
      + grp('📜', 'Also', '<ul class="lrnotes">'+notes.map(n => '<li>'+esc(n.replace(/^./, ch => ch.toUpperCase()))+'</li>').join('')+'</ul>')
      + '</div>'
      + '<div class="mode btnrow restnav"><span class="navl"><button class="btn" data-act="restmode" data-rest="choose">‹ Back</button><button class="btn" data-act="restclose">Cancel</button></span><button class="btn primary" data-act="finishlong">🌙 Take long rest</button></div>';
    return;
  }
  // short rest: a dice reminder; you throw them yourself and add the total with the HP tile
  const missing = D.hpMax - S.hp, con = D.mod.con;
  const order = D.hitDice.slice().sort((x,y)=> +y.die.slice(1) - +x.die.slice(1));
  box.innerHTML = head('⛺ Short rest · 1 hour')
    + '<div class="srhp"><span>HP <b class="num">'+S.hp+'/'+D.hpMax+'</b></span>'+(missing ? '<span class="srmiss">missing <b class="num">'+missing+'</b></span>' : '<span class="srfull">already full</span>')+'</div>'
    // first: what comes back for free, with its own Restore button (no dice needed)
    + (RES.some(r => r.short) ? '<div class="srdice srfree"><div class="srhead"><span class="eyebrow">⚡ Comes back for free</span></div>'
        + '<div class="srfrow"><div class="srfnote">'+restNote().replace(/^Restore: /, '')+'</div>'
        + '<button class="btn '+(restRestored?'srdone':'primary')+'" data-act="srrestore"'+(restRestored || !RES.some(r => r.short && S[r.key] > 0)?' disabled':'')+'>'+(restRestored?'✓ Restored':'⚡ Restore')+'</button></div></div>' : '')
    + '<div class="srdice"><div class="srhead"><span class="eyebrow">❤️‍🩹 Each die you roll heals you</span><button type="button" class="qbtn term" data-term="Rolling hit dice" aria-label="How hit dice work">?</button></div>'
    + order.map((h,i) => { const left = hdLeft(h);
        return '<div class="srrow'+(left?'':' out')+'"><div class="srformula">'+throwHtml('1'+h.die+sgn(con))+'</div>'
          + '<div class="srinfo">'+esc(h.cls)+' dice'+'</div>'
          + '<div class="srbtns">'+diePips(h)+'</div>'
          + '<div class="srroll"><button class="btn primary rollbtn hdroll" data-act="hdroll" data-cls="'+esc(h.cls)+'"'+(left?'':' disabled')+'>🎲 Roll</button></div></div>'; }).join('')
    + '</div>'
    + '<div class="srend restnav"><span class="navl"><button class="btn" data-act="restmode" data-rest="choose">‹ Back</button><button class="btn" data-act="restclose">Cancel</button></span>'
    + '<span class="navr"><button class="btn primary" data-act="finishshort">⛺ Short rest done</button></span></div>';
}



