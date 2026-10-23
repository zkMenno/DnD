// ── §20 Events: one delegated click handler; data-act names the action ─────────────────────────────────────
// Every button on the sheet is handled here, on document: glossary terms (data-term), tabs (data-tab), rolls
// (data-hit, data-combo, data-check, data-save, data-tool, data-skill), resource pips (data-pip,
// data-pool), item counts (data-inv), and everything else by data-act through one switch.
// Also: the read-only guard for shared sheets (VIEW), and desktop hover tooltips for .hovertip terms.
// Calls into nearly every other section, so it loads late; the handlers run only after the page is built (§13).
// Adding a button: give it data-act="<name>", add a case here, and add the name to VIEW_OK if a viewer may use it.
// ── Read-only guard ────────────────────────────────────────────────────────────────────────────────────────
// Read-only (a shared sheet): what a viewer may still do: look things up, move around, change their own view prefs.
const VIEW_OK = new Set(['close','rollview','tipclose','tabprev','tabnext','tabl','tabr','reload','spfav','cbfav','fav','qrfav','trf','trs','trall','spf','spe',
  'restclose','rollboxclose','hpclose','menu','menuview','diceset','dsprev','diceedit','dsmove','dsgmove','jump','jumpto','jumpedit','secmove','wmove',
  'notescope','notefilter','copychanges','concopen','diceask','diceaskno','skinpick','skinmode','feedback']);
// May a viewer press this button? Terms, tabs, VIEW_OK actions, and plain buttons inside a tooltip bubble.
const viewAllowed = el => !!(el.dataset.term || el.dataset.tab || VIEW_OK.has(el.dataset.act) || el.closest('.bubble') && !el.dataset.act && !el.dataset.pip);
let viewNoteT = null;
// A short note at the bottom when a viewer taps something that would change the tracker (hides after 2.2 s).
function viewNote(){
  let n = $('#viewnote'); if (!n) { n = document.createElement('div'); n.id = 'viewnote'; n.className = 'viewnote'; document.body.appendChild(n); }
  n.textContent = '👀 Read-only: this tracker belongs to '+DATA.name+'’s player.'; n.hidden = false;
  clearTimeout(viewNoteT); viewNoteT = setTimeout(() => { n.hidden = true; }, 2200);
}
// ── The click handler ──────────────────────────────────────────────────────────────────────────────────────
// Order matters: a click outside a tooltip closes it; coin cards (data-pick) pick a coin; then the read-only guard;
// then the data-* shortcuts; then the data-act switch. Each branch returns, so only one action runs per click.
document.addEventListener('click', e => {
  if (!e.target.closest('.bubble') && !e.target.closest('.term,.tile')) closeTip();
  const pick = !e.target.closest('button') && e.target.closest('[data-pick]'); if (pick) return pickCoin(pick.dataset.pick);
  const el = e.target.closest('button'); if (!el) return;
  if (VIEW && !viewAllowed(el)) { e.preventDefault(); return viewNote(); }
  // a term on a vitals tile opens that tile's drawer instead of a bubble
  if (el.dataset.term && el.closest('#vitals')) return openDrawer('term:'+el.dataset.term);
  // a coin's name picks that coin too, then shows its tooltip on the redrawn card
  if (el.dataset.term && el.closest('[data-pick]')) { const k = el.closest('[data-pick]').dataset.pick, t = el.dataset.term; pickCoin(k); const n = document.querySelector('[data-pick="'+k+'"] [data-term="'+CSS.escape(t)+'"]'); return n && toggleTip(n); }
  if (el.dataset.term) return toggleTip(el);
  const ds = el.dataset;
  if (ds.tab) return goTab(ds.tab);
  if (ds.hit) return attackSetup(ds.hit);
  if (ds.combo) return rollCombo(ds.combo);
  if (ds.check) { closeTip(); return rollCheck(ABIL_NAME[ds.check]+' check', D.mod[ds.check]); }
  if (ds.save) { closeTip(); const s = D.saves.find(x=>x.a===ds.save); return rollCheck(s.name+' save', s.bonus); }
  if (ds.tool) { closeTip(); return rollCheck(ds.tool, +ds.b); }
  if (ds.skill) { closeTip(); const s = D.skills.find(x=>x.name===ds.skill); return rollCheck(s.name, s.bonus); }
  // roll mode (advantage / normal / disadvantage), remembered on this device
  if (ds.mode) { ui.mode = ds.mode; saveUi(); document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.mode===ui.mode))); return; }
  // a resource pip: with data-i, flip that one pip (the mask keeps which pips are used); else one more or fewer used
  if (ds.pip) { const k = ds.pip, rr = resBy(k); if (!rr) return; const max = rr.max;
    if (ds.i != null) { const m = pipMask(k, max, S[k]); m[+ds.i] = ds.r === '1'; ui.pipMask[k] = m; S[k] = m.filter(Boolean).length; saveUi(); }
    else S[k] = Math.max(0, Math.min(max, S[k] + (ds.r==='1' ? 1 : -1)));
    save(); paintRes(); return paintUse(); }
  // a points pool: spend (+d) or get back (−d)
  if (ds.pool) { const rr = resBy(ds.pool); if (!rr) return; S[rr.key] = Math.max(0, Math.min(rr.max, S[rr.key] - (+ds.d))); save(); paintRes(); return paintUse(); }
  // − / + on an item count (arrows, potions): one more or one fewer than the inventory says
  if (ds.inv) { const n = ds.inv, d = +ds.d; if (d < 0 && itemLeft(n) <= 0) return; S.spent = Object.assign({}, S.spent, {[n]: ((S.spent||{})[n]||0) - d}); if (n === ARROW_N && d < 0) S.fired = (S.fired||0) + 1; save(); paintRes(); paintAmmo(); return paintInv(n); }
  // the hit dice tile opens a short rest
  if (ds.hd) { window.scrollTo({top:0, behavior: reduceMotion() ? 'auto' : 'smooth'}); return openRest('short'); }
  switch (ds.act){
    case 'close': return closeRoll();
    case 'inspmenu': return openDrawer('insp');
    case 'insptoggle': { S.insp = !S.insp; save(); paintVitals(); const box = $('#hpedit'); if (box && drawerKind === 'insp') { box.innerHTML = WINX + inspDrawer(); const v = $('#inspval'); if (v && v.animate && !reduceMotion()) v.animate([{transform:'scale(1.35)'},{transform:'scale(1)'}], {duration:260, easing:'cubic-bezier(.2,.8,.2,1)'}); }
      const chip = $('#inspchip'); if (chip) { chip.className = 'chip '+(S.insp?'brass':'ghost'); chip.textContent = S.insp?'⭐ have it':'none yet'; }
      return paintUse(); }
    // Second Wind: heal 1d10 + fighter level, one use
    case 'secondwind': {
      if (S.sw >= D.secondWind.max) return showRoll('<div class="head"><span class="title">Second Wind</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="bd">No uses left. A short rest gives one back.</div>');
      S.sw++; const v = r(10) + D.fighter; save(); paintRes(); paintUse();
      return fx('wind', () => { const g = healMe(v); showRoll('<span hidden data-heal></span><div class="head"><span class="title">Second Wind</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="nums"><span class="n">'+healNote(v, g)+'</span></div><div class="bd">1d10 '+(v-D.fighter)+' '+sgn(D.fighter)+'</div>') || autoCloseRoll(); }, [{s:10, v:v-D.fighter}]);
    }
    // on/off resources (Rage…): switching on spends a use and shows its note; switching off just ends it
    case 'reson': { const rr = resBy(ds.k); if (!rr || S[rr.key] >= rr.max) return; S[rr.key]++; S.active = Object.assign({}, S.active, {[rr.key]: true});
      const msg = rr.toggle.start ? rr.toggle.start() : ''; save(); paintRes(); paintUse(); paintCombat(); paintSpells();
      return showRoll('<div class="head"><span class="title">'+rr.toggle.onChip+'</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="bd">'+rr.toggle.onDesc+(msg ? '<p>'+msg+'</p>' : '')+'</div><div class="nextrow"><span></span><button class="btn done" data-act="close">'+WORD.ok+'</button></div>'); }
    case 'resoff': { const a = Object.assign({}, S.active); delete a[ds.k]; S.active = a; save(); if (el.closest('#dock')) closeRoll(); paintRes(); paintCombat(); return paintSpells(); }
    // a resource's quick button (Focus…): spend n uses, then heal, switch something on, restore, roll a heal or attack
    case 'resbtn': { const rr = resBy(ds.k), b = rr && rr.buttons && rr.buttons[+ds.i]; if (!b) return;
      if ((b.n||0) > rr.max - S[rr.key]) return; S[rr.key] += (b.n||0); let healed = null; if (b.heal) healed = healMe(b.heal);
      if (b.activate) { S.active = Object.assign({}, S.active, {[b.activate]: true}); paintCombat(); }   // switch on a state (Sacred Weapon)
      save(); paintRes(); paintUse(); paintVitals();
      if (b.restore) { S[b.restore] = 0; save(); paintRes(); }   // Uncanny Metabolism: all Focus Points back
      if (b.healRoll) { const p = parseDice(b.healRoll), flat = +(String(b.healRoll).match(/[+-]\d+$/)||[0])[0], dice = rollDice(p.n, p.d), v = sum(dice) + flat;   // a rolled self-heal
        return fx('heal', () => { const g = healMe(v); showRoll('<span hidden data-heal></span><div class="head"><span class="title">'+esc(b.title)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="nums"><span class="n">'+healNote(v, g)+'</span></div><div class="bd">'+p.n+'d'+p.d+' ['+dice.join(', ')+'] '+(flat ? sgn(flat) : '')+(b.note ? '<p>'+b.note+'</p>' : '')+'</div>') || autoCloseRoll(); }, asDice(dice, p.d)); }
      if (b.attacks) { const w = findW(b.attacks.w); if (w) { const s1 = {w, mode:'norm', sneak:false, savage:true, label:b.title}; return startAttack(w, b.attacks.n > 1 ? {...s1, title:b.title, queue: Array.from({length:b.attacks.n-1}, () => s1), step:'1 of '+b.attacks.n, n:b.attacks.n} : s1); } }
      return showRoll('<div class="head"><span class="title">'+esc(b.title)+'</span><button class="x" data-act="close" aria-label="Close">×</button></div><div class="bd">'+b.note+(healed != null ? ' <b>'+healNote(b.heal, healed)+'</b>' : '')+'</div><div class="nextrow"><span></span><button class="btn done" data-act="close">'+WORD.ok+'</button></div>'); }
    // attacks, damage, boosts and spells
    case 'rider': return toggleRider(ds.k, ds.kind || 'dmg');
    case 'ammo': AMMO[ds.w] = ds.n || ''; return attackSetup(ds.w, true);
    case 'spendres': { const rr = resBy(ds.k), n = +ds.n || 1; if (!rr || rr.max - S[rr.key] < n) return; S[rr.key] += n; save(); paintRes(); el.disabled = true; el.textContent = '✓ Spent'; return; }
    case 'useitem': return useItem(ds.item);
    case 'rolldmg': return cur && rollDamage(ds.v);
    case 'savage': return savageReroll();
    case 'luck': return doLuck();
    case 'inspre': return doInsp();
    case 'nextatk': return nextAttack();
    case 'rollview': return rollView(ds.v);
    case 'boost': return addBoost(ds.k, +ds.s);
    case 'inspdmg': return inspDmg();
    case 'inspgain': return inspGain();
    case 'bardsel': return bardSel(+ds.s);
    case 'atkmode': return pickMode(ds.m, ds.w);
    case 'cast': return castSpell(ds.spell);
    case 'castat': return castAt(ds.spell, +ds.l, ds.k);
    case 'concend': S.conc = null; concOpen = false; save(); return paintSpells();
    // concentration picker (Spells tab): tap a spell to hold it (tap it again to drop it); Change shows the list
    case 'concset': { const n = ds.k; if (RES.some(r => r.toggle && r.toggle.noSpells && S.active[r.key])) return;
      S.conc = S.conc === n ? null : n; concOpen = false; save(); return paintSpells(); }
    case 'concopen': concOpen = !concOpen; return paintSpells();
    case 'spfav': return toggleSpFav(ds.k);
    case 'cbfav': return toggleCbFav(ds.k);
    case 'trf': case 'trs': { const key = ds.act === 'trf' ? 'trF' : 'trS', cur = (ui[key]||[]).slice();
      if (ds.f === 'all') ui[key] = []; else { const i = cur.indexOf(ds.f); if (i < 0) cur.push(ds.f); else cur.splice(i, 1); ui[key] = cur; }
      saveUi(); el.closest('.spfilters').querySelectorAll('.chip').forEach(c => { const on = c.dataset.f === 'all' ? !ui[key].length : ui[key].includes(c.dataset.f); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
      return filterTraits(); }
    case 'trall': { ui.trOpen = !ui.trOpen; saveUi(); document.querySelectorAll('[data-panel="traits"] .tr').forEach(t => { if (!t.hidden) t.open = ui.trOpen; }); el.textContent = ui.trOpen ? 'Fold all' : 'Open all'; return; }
    case 'spf': spToggle('spF', ds.f); return paintSpells();
    case 'spe': spToggle('spE', ds.e); return paintSpells();
    // healing from a roll card, checks, potions
    case 'healself': { const v = +ds.v || 0, g = healMe(v); el.disabled = true; el.innerHTML = '❤️ '+healNote(v, g); return; }
    case 'chkmode': return rollCheckMode(ds.l, +ds.b, ds.m);
    case 'drink': return useItem(ds.item || potionNames()[0]);
    // rests and Quick roll (§18)
    case 'rest': return openRest(ds.rest || (restMode ? null : 'choose'));
    case 'hdroll': return rollHitDie(ds.cls);
    case 'hdpip': { const h = D.hitDice.find(x => x.cls === ds.cls);
      if (h && ds.i != null) { const m = pipMask('hd:'+h.cls, h.total, S.hd[h.cls]||0); m[+ds.i] = ds.r === '1'; ui.pipMask['hd:'+h.cls] = m; saveUi(); }   // only the tapped die flips
      return ds.r === '1' ? spendHitDie(ds.cls) : unspendHitDie(ds.cls); }
    case 'restmode': if (ds.rest === 'short') restRestored = false; return openRest(ds.rest);
    case 'srrestore': return restoreShort(false);
    case 'finishshort': return finishShortRest();
    case 'finishlong': return finishLongRest();
    case 'restclose': return closeRest();
    case 'rollflow': return openRollBox();
    case 'rollboxclose': return closeRollBox();
    case 'qroll': return quickRoll(ds.l, +ds.b);
    case 'qrfav': return toggleQrFav(ds.l);
    case 'maneuver': return useManeuver(ds.man);
    // HP drawer
    case 'hpedit': case 'hpmenu': return openDrawer('hp');
    case 'hpadj': { const n = +ds.n; if (n < 0) hurt(-n); else S.hp = Math.min(D.hpMax, S.hp + n); save(); return paintVitals(); }
    case 'hpfull': S.hp = D.hpMax; save(); return paintVitals();
    case 'dmg': case 'heal': case 'temp': {
      const n = Math.max(0, parseInt($('#hpamt').value,10)||0); if (!n) { $('#hpamt').focus(); return; } blurField();
      if (ds.act==='dmg') hurt(n);
      if (ds.act==='heal') S.hp = Math.min(D.hpMax, S.hp + n);
      if (ds.act==='temp') S.temp = Math.max(S.temp, n);
      $('#hpamt').value = ''; save(); return paintVitals();
    }
    case 'hpclose': return closeHpMenu();
    // ☰ menu: sync, feedback, move, ordering, dice sets, theme
    case 'sync': case 'pull': return window.SHEET ? syncWindow() : pull();
    case 'syncwin': return syncWindow();
    case 'feedback': if (menuOpen) { menuOpen = false; paintMenu(); } return window.openFeedback && window.openFeedback('bug');
    case 'moveout': return moveOut();
    case 'movein': return moveIn();
    case 'push': return push();
    case 'menu': return toggleMenu();
    case 'jump': return openJump();
    case 'jumpto': return jumpTo(+ds.i);
    case 'jumpedit': jumpEdit = !jumpEdit; return openJump(true);
    case 'secmove': return moveSec(+ds.i, +ds.d);
    case 'wmove': moveAtk(ds.k, +ds.d); if (jumpEdit) openJump(true); return;
    case 'diceset': return pickDiceSet(ds.k);
    case 'dsprev': return previewDiceSet(ds.k);
    case 'diceedit': diceEdit = !diceEdit; return paintMenu();
    case 'dsmove': return moveDiceSet(ds.k, +ds.d);
    case 'fav': return toggleFav(ds.k);
    case 'dsgmove': return moveDiceGroup(ds.g, +ds.d);
    case 'skinpick': return skinPick(ds.k);
    case 'skinmode': return skinMode(ds.m);
    case 'diceask': closeDiceAsk(); if (!menuOpen) toggleMenu(); menuView = 'dice'; return paintMenu();
    case 'diceaskno': ui.diceAuto = false; saveUi(); return closeDiceAsk();
    case 'menuview': menuView = menuView === ds.v ? 'main' : ds.v; if (menuView !== 'dice') diceEdit = false; return paintMenu();
    case 'tabprev': return stepTab(-1);
    case 'tabnext': return stepTab(1);
    // the crest reloads the page, first saving any tracker change still waiting for its debounced db write
    case 'reload': {
      document.querySelectorAll('.crest').forEach(c => c.classList.add('spin'));
      const go = () => { try { location.reload(); } catch(e) { render(); } };
      if (DB && remoteTimer) { clearTimeout(remoteTimer); remoteTimer = null; DB.doc(PLAY_DOC).set(JSON.parse(JSON.stringify(S))).then(go, go); } else go();
      return;
    }
    // arrows (recover half the fired ones) and coins (§19)
    case 'recover': { const n = Math.floor((S.fired||0)/2); if (!n) return; S.spent = Object.assign({}, S.spent, {[ARROW_N]: ((S.spent||{})[ARROW_N]||0) - n}); S.fired = 0; save(); paintRes(); return paintAmmo('Recovered '+n+' arrow'+(n>1?'s':'')+'. The rest were lost or broken.'); }
    case 'coingain': { const n = coinAmt(); if (!n) return; return gainCoins(coinKind, n); }
    case 'coinstep': { const d = +ds.d, k = ds.c; pickCoin(k); if (Math.abs(d) === 1) return quickCoin(k, d); return d > 0 ? gainCoins(k, d) : spendCoins(k, -d); }
    case 'coinspend': { const n = coinAmt(); if (!n) return; return spendCoins(coinKind, n); }
    case 'coinchange': { if (!coinNeed) return; const {k, n} = coinNeed; if (!makeChange(k, n)) return paintCoins('Not enough money.'); coinLog('−'+n+' '+k+' (paid with change)'); coinNeed = null; save(); paintRes(); const i = $('#coin-amt'); if (i) i.value=''; return paintCoins('Paid '+n+' '+k+' and counted out the change.'); }
    case 'tipclose': { const t = tipFor; closeTip(); if (t && t.isConnected) t.focus({preventScroll:true}); return; }
    case 'rollinit': closeTip(); closeDrawer(); return rollCheck('Initiative', D.initiative);
    case 'tabl': case 'tabr': { const nav = $('#tabs'); if (nav) nav.scrollBy({left: (ds.act==='tabr'?1:-1) * nav.clientWidth * 0.7, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
    // notes (§17)
    case 'addnote': return addNote();
    case 'sessstep': { pickedSession = Math.max(1, curSession() + (+ds.d)); return paintSession(); }
    case 'notescope': return setNoteScope(ds.k);
    case 'notekind': noteKind = ds.k; document.querySelectorAll('#notekinds button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.k===noteKind))); return;
    case 'notefilter': noteFilter = ds.f; return paintNotes();
    case 'notedone': { const n = NOTES.find(x=>x.id===ds.id); if (n) notesStore.update(n.id, {done: !n.done}).catch(()=>noteMsg('Couldn’t update that note.')); return; }
    case 'noteedit': editing = ds.id; paintNotes(); { const t = $('#note-edit'); if (t) t.focus(); } return;
    case 'notecancel': editing = null; return paintNotes();
    case 'notesave': { const t = $('#note-edit'); const text = t ? t.value.trim() : ''; if (!text) return; const sv = parseInt(($('#note-sess')||{}).value,10); const patch = {text}; if (sv > 0) patch.session = sv; editing = null; notesStore.update(ds.id, patch).catch(()=>noteMsg('Couldn’t save that edit.')); return paintNotes(); }
    case 'notedel': {
      const n = NOTES.find(x=>x.id===ds.id); const peek = n ? esc(n.text.slice(0,90))+(n.text.length>90?'…':'') : '';
      confirmBox('Delete this note?', (peek?'“'+peek+'”<br>':'')+'This can’t be undone.', 'Delete').then(ok => { if (ok) notesStore.del(ds.id).catch(()=>noteMsg('Couldn’t delete that note.')); });
      return;
    }
    // items added in the app, and the change list
    case 'additem': return openItemPicker();
    case 'itemeq': setAdded(ADDED.map(x => x.inv.id === ds.id ? Object.assign({}, x, {inv: Object.assign({}, x.inv, {equipped: !x.inv.equipped})}) : x)); return;
    case 'itemdel': {
      const x = ADDED.find(a => a.inv.id === ds.id); if (!x) return;
      confirmBox('Remove '+esc(x.inv.name)+'?', 'It comes off this sheet and the change list. Nothing changes in D&amp;D Beyond.', 'Remove').then(ok => { if (ok) { setAdded(ADDED.filter(a => a !== x)); } });
      return;
    }
    case 'clearchanges': {
      const n = changes().length;
      confirmBox('Clear the change list?', 'Only do this once the '+n+' change'+(n===1?' is':'s are')+' in D&amp;D Beyond. Your tracker numbers stay as they are.', 'Clear list').then(ok => { if (ok) { S.base = snapshotBase(); S.baseAt = Date.now(); ADDED.forEach(x => { x.entered = true; }); S.added = ADDED; save(); paintRes(); } });
      return;
    }
    case 'copychanges': {
      const text = changesText();
      const done = () => { el.textContent = 'Copied'; setTimeout(()=>{ el.textContent = 'Copy'; }, 1500); };
      try { navigator.clipboard.writeText(text).then(done, () => { el.textContent = 'Copy blocked'; }); } catch(e){ el.textContent = 'Copy blocked'; }
      return;
    }
  }
});
// ── Hover tooltips (desktop) ───────────────────────────────────────────────────────────────────────────────
// Desktop: hovering a .hovertip term (spell tag icons, 🧠 Concentration) opens its tooltip after 250 ms; it closes when
// the mouse leaves both the word and the bubble. A click still pins it, as on phones.
(() => {
  let timer = null, hoverEl = null;
  const fine = () => matchMedia('(hover:hover) and (pointer:fine)').matches;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('.hovertip'); if (!el || !fine() || tipFor === el) return;
    clearTimeout(timer); timer = setTimeout(() => { if (tipFor !== el) { toggleTip(el); hoverEl = el; } }, 250);
  });
  document.addEventListener('mouseout', e => {
    const to = e.relatedTarget, el = e.target.closest && e.target.closest('.hovertip, #bubble'); if (!el) return;
    if (to && to.closest && (to.closest('#bubble') || (hoverEl && to.closest('.hovertip') === hoverEl))) return;
    clearTimeout(timer);
    if (hoverEl && tipFor === hoverEl) { closeTip(); } hoverEl = null;
  });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.hovertip')) { clearTimeout(timer); hoverEl = null; } }, true);   // a click pins the bubble
})();
