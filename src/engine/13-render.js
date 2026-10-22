/* ============================================================================
   §13 RENDER — the whole page, built once; panels repaint themselves after that
   ============================================================================ */
// Tabs come from the pack: [key, label, emoji]. Core panels below; the pack can add its own (PACK.panels) or override one.
// a character with spells gets a Spells tab right after the first tab, unless the pack already places it
const PTABS = PACK.tabs.slice();
if ((DATA.spells||[]).length && !PTABS.some(t => t[0]==='spells')) PTABS.splice(1, 0, ['spells','Spells','🪄']);
// automatic combos give a character without a pack Combos tab one, right after Spells (or Combat)
if (!PTABS.some(t => t[0]==='combos') && !PACK.combos && autoCombos().length) PTABS.splice(PTABS.findIndex(t => t[0]==='spells') + 1 || 1, 0, ['combos','Combos','💥']);
const TABS = PTABS.map(([k,l]) => [k,l]);
const TAB_EMO = Object.fromEntries(PTABS.map(([k,,e]) => [k,e]));
const CORE_PANELS = { spells:spellsPanel, combat:combatPanel, combos:combosPanel, notes:notesPanel, stats:() => statsCards()+skillsCard(), gear:gearPanel, traits:traitsPanel };
// panel builder for a tab key (pack first, then core)
const panelFn = k => k === 'combos' ? combosPanel : (PACK.panels && PACK.panels[k]) || CORE_PANELS[k];
// DOM order of panels: the core ones in their historic order, then any pack tabs in tab order
const PANEL_ORDER = ['combat','combos','notes','stats','gear'].filter(k => TABS.some(t=>t[0]===k) || k==='stats')
  .concat(TABS.map(t=>t[0]).filter(k => !['combat','combos','notes','stats','gear'].includes(k)));
// build the whole page once; later updates repaint parts in place
function render(msg){
  document.body.classList.toggle('viewonly', VIEW);
  $('#app').innerHTML =
    '<header class="top"><div class="wrap"><div class="idrow"><button class="crest" data-act="reload" aria-label="Reload the sheet" title="Reload">'+esc(INITIALS)+'</button><div class="who"><h1><button class="namebtn" data-act="reload" title="Tap to reload">'+esc(DATA.name)+'</button></h1><button class="sub subbtn" data-act="reload" title="Tap to reload">'+esc(DATA.race.name)+' · '+esc(D.line)+' · Level '+D.totalLevel+' · PB '+sgn(D.pb)+'</button></div>'
    + '<div class="sync"><div class="hbtns"><button class="btn" data-act="rest" aria-expanded="false" id="restbtn">⛺ Rest</button><button class="btn menubtn" id="menubtn" data-act="menu" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div></div></div>'
    + '<div id="restbox" class="restbox" hidden></div><div id="menubox" class="restbox" hidden></div><div id="syncmsg" '+(msg?'':'hidden')+' class="syncmsg">'+(msg||'')+'</div>'
    + '<div class="vitals" id="vitals">'+vitalsHtml()+'</div><div id="hpedit" class="hpmenu" hidden></div><div id="rollbox" class="restbox" hidden></div>'
    + '<div class="tabwrap" id="tabwrap"><button class="iconbtn tabstep tsl" data-act="tabprev" aria-label="Previous section (left arrow key)" title="Previous section (←)">‹</button><button class="tabarrow l" data-act="tabl" aria-label="Show earlier tabs" tabindex="-1">‹</button>'
    + '<nav class="tabs" id="tabs" role="tablist" aria-label="Sheet sections">'+TABS.map(([k,l])=>'<button class="tab" role="tab" data-tab="'+k+'" aria-selected="'+(ui.tab===k)+'"><span class="emo" aria-hidden="true">'+TAB_EMO[k]+'</span>'+l+'</button>').join('')+'</nav>'
    + '<button class="tabarrow r" data-act="tabr" aria-label="Show more tabs" tabindex="-1">›</button>'
    + '<button class="iconbtn tabstep tsr" data-act="tabnext" aria-label="Next section (right arrow key)" title="Next section (→)">›</button></div></div></header>'
    + '<main><div class="wrap">'+(VIEW ? '<div class="viewbar"><span class="vic" aria-hidden="true">👀</span><span><b>'+esc(DATA.name)+'</b> · shared with you. You see their tracker live; only they can change it.</span></div>' : '')+'<div class="grid">'
    + '<aside class="col-stats">'+statsCards()+'</aside><aside class="col-skills">'+skillsCard()+'</aside>'
    + '<div id="panes" class="panes">'
    + PANEL_ORDER.map(k => '<div class="panel" data-panel="'+k+'">'+(panelFn(k) ? panelFn(k)() : '')+'</div>').join('')
    + '<nav class="pager" id="pager" aria-label="Previous and next section"></nav>'
    + '</div></div></div></main><button id="jumpbtn" class="jumpbtn" data-act="jump" aria-expanded="false" aria-label="Jump to a section" hidden>↕ Sections</button><div id="jumpmenu" class="jumpmenu" hidden></div><div id="dock" class="dock" hidden></div>';
  bindTabs(); paintRes(); showTab(ui.tab); paintNotes(); paintRest(); paintCoins(); bindTraits(); bindListDrags(); fitDock();
  document.querySelectorAll('main .panel, main aside').forEach(r => { linkify(r); decorate(r); });
  applyAllSecOrder();
}