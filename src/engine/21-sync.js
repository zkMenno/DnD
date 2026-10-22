/* ============================================================================
   §21 SYNC — Claude app browser → D&D Beyond JSON → republish this page
   ============================================================================ */
function textOf(res){
  const t = (res && res.content || []).filter(b=>b.type==='text').map(b=>b.text).join('\n');
  if (t) return t;
  return typeof (res && res.payload) === 'string' ? res.payload : JSON.stringify(res && res.payload || '');
}
// pull the first {"id"…} JSON object out of page text
function extractJson(text){
  const i = text.indexOf('{"id"'); if (i < 0) return null;
  let depth = 0, inStr = false, escp = false;
  for (let k = i; k < text.length; k++){
    const ch = text[k];
    if (inStr){ if (escp) escp = false; else if (ch === '\\') escp = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(i, k+1)); }
  }
  return null;
}
// Head bits the sync writes before the parts: title from the character, fonts from the theme.
function prefixHtml(){
  return '<title>'+esc(DATA.name)+'</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    + (THEME.fonts ? '<link href="'+THEME.fonts+'" rel="stylesheet">\n' : '');
}
// Rebuild this whole page with fresh character data. The page is a fixed list of parts (see the file map at the
// top of #main); every <style>/<script> part must be listed here or a sync will drop it.
function buildDoc(data){
  const reset = (document.head.querySelector('style')||{}).textContent || '';
  const json = JSON.stringify(data).replace(/</g,'\\u003c');
  const part = id => document.getElementById(id).textContent;
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+reset+'</style></head><body>\n'
    + prefixHtml()
    + '<style id="theme-css">'+part('theme-css')+'</style>\n<style id="css">'+part('css')+'</style>\n<div id="app"></div>\n'
    + '<script id="'+PACK.id+'-data" type="application/json">'+json+'<\/script>\n'
    + (document.getElementById('items-data') ? '<script id="items-data" type="application/json">'+part('items-data').replace(/</g,'\\u003c')+'<\/script>\n' : '')
    + ['themes','classes','pack','main'].map(id => '<script id="'+id+'">'+part(id)+'<\/script>').join('\n')
    + '\n</body></html>';
}
let syncing = false;
const REMOTE = 'Claude Code Remote';   // claude.ai connector that fires the pack's scheduled tasks
// The change list as a confirm-dialog body
function changeListHtml(c, note){
  return '<ul class="chlist">'+c.map(x=>'<li>'+esc(x.t)+'<span class="chw">'+esc(x.where)+'</span></li>').join('')+'</ul>'+(note?'<p>'+note+'</p>':'');
}
// Busy state on both menu buttons while a sync runs
function syncBusy(on, label){
  ['#pullbtn','#pushbtn'].forEach(id => { const b = $(id); if (b) b.disabled = on || (id==='#pushbtn' && !changes().length); });
  const b = $(label==='push' ? '#pushbtn' : '#pullbtn'), t = b && b.querySelector('b[data-label]'); if (t) t.innerHTML = on ? 'Working…' : t.dataset.label;
}
// Copy for connector failures when firing a scheduled task
function remoteMsg(code, what){
  return ({
    server_not_connected: what+' needs the Claude Code Remote connector. Check it’s on in claude.ai Settings → Connectors.',
    needs_reauth: 'Reconnect Claude Code Remote in claude.ai Settings → Connectors, then try again.',
    not_in_manifest: 'You turned off scheduled tasks for this page. Allow Claude Code Remote in the page’s permissions.',
    approval_required: what+' needs your OK to start a scheduled task. Tap again and allow it.',
    not_granted: what+' isn’t available in this view.', capability_disabled: what+' isn’t available in this view.',
    tool_error: 'The scheduled task didn’t start. Check “'+(what==='Push'?'Henry: push changes':'Henry: pull')+'” in your scheduled tasks.',
    server_unavailable: 'Couldn’t reach Claude just now. Try again in a minute.'
  })[code] || (what+' failed'+(code?' ('+esc(code)+')':'')+'. Try again in a moment.');
}

// ⬇️ PULL: D&D Beyond → this page. Two confirmations when it would overwrite table changes.
// Desktop app with its browser: done right here (fast). Anywhere else: a cloud scheduled task does it and
// republishes the page, which reloads every open view (a few minutes).
async function pull(){
  if (syncing) return;
  const c = changes();
  if (c.length) {
    if (!await confirmBox('Pull from D&amp;D Beyond?', changeListHtml(c, 'These '+c.length+' change'+(c.length===1?' isn’t':'s aren’t')+' in D&amp;D Beyond yet. Pulling replaces them with D&amp;D Beyond’s numbers.'), 'Continue', false)) return;
    if (!await confirmBox('Overwrite '+c.length+' change'+(c.length===1?'':'s')+'?', 'They’ll be gone from this app. Push them first if you want to keep them.', 'Pull anyway', true)) return;
  }
  syncing = true; syncBusy(true, 'pull');
  const done = html => { syncing = false; syncBusy(false, 'pull'); setMsg(html); };
  // standalone web app: the server fetches D&D Beyond, we compact and save, then reload
  if (window.SHEET) {
    try { setMsg('Reading D&amp;D Beyond…'); await window.SHEET.pull(compact); return done('Synced. Reloading…'); }
    catch (e) { return done(esc((e && e.message) || 'Sync failed. Try again in a moment.')); }
  }
  const mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null;
  if (!mcp) return done('Syncing needs this page open in Claude (app or claude.ai).');
  try {
    await pullHere(mcp);
    done('Synced. Reloading…');
  } catch (e) {
    const code = e && e.code;
    if (code === 'no_host' || code === 'server_not_connected') {   // no app browser here: hand it to the cloud
      try {
        await mcp.callTool(REMOTE, 'fire_trigger', { trigger_id: PACK.sync.pullTask, text: 'Requested from the '+DATA.name+' app.' }, { cache:false });
        return done('☁️ Claude is pulling from D&amp;D Beyond. This page reloads with the new numbers in a few minutes.');
      } catch (e2) { return done(remoteMsg(e2 && e2.code, 'Pull')); }
    }
    const msgs = {
      not_in_manifest: 'You turned off browser access for this page. Allow it from the page’s permissions to sync.',
      approval_required: 'The Claude app needs your OK to open D&amp;D Beyond. Tap Pull again and allow it.',
      cancelled: 'Sync cancelled.',
      not_writer: 'Only '+esc(FIRST_NAME)+'’s owner can save a synced version.', conflict: 'Another save landed first. The page reloaded with it.',
      tool_error: 'The Claude app’s browser hit an error reading D&amp;D Beyond. Check the site is reachable and try again.',
      no_data: 'D&amp;D Beyond didn’t send character data. Check the character is still public, then try again.',
      truncated: 'The character data came back cut short. Try again; if it keeps happening, the cloud pull from your phone works too.',
      wrong_char: 'That page held a different character. Nothing changed.',
      no_save: 'Pulled the latest, but this view can’t save the page. Open it in Claude as the owner to keep it.'
    };
    done(msgs[code] || ('Sync failed'+(code?' ('+esc(code)+')':'')+'. Try again in a moment.'));
  }
}
// The fast path: read D&D Beyond's JSON in the Claude app's own browser, rebuild, republish. Throws {code}.
async function pullHere(mcp){
  const fail = code => { throw {code}; };
  const listed = await mcp.listTools(HOST).catch(() => null);
  if (!listed || !listed.servers || !listed.servers.length) fail('no_host');
  const URL = 'https://character-service.dndbeyond.com/character/v5/character/' + DATA.id;
  setMsg('Opening your character in the Claude app’s browser…');
  let tabId = ls.get(PACK.id+'-tab');
  if (tabId) { try { await mcp.callTool(HOST, 'navigate', {tabId, url: URL}, {cache:false}); } catch(e){ if (e && e.code === 'server_not_connected') throw e; tabId = null; } }
  if (!tabId) {
    const res = await mcp.callTool(HOST, 'preview_start', {url: URL}, {cache:false});
    const m = textOf(res).match(/tabId[\s:"]+([A-Za-z0-9_-]+)/); tabId = m ? m[1] : null; ls.set(PACK.id+'-tab', tabId);
  }
  setMsg('Reading D&amp;D Beyond…');
  const page = await mcp.callTool(HOST, 'get_page_text', tabId ? {tabId, max_chars: 3000000} : {max_chars: 3000000}, {cache:false});
  const text = textOf(page);
  let full = null; try { full = extractJson(text); } catch(e){}
  if (!full || !full.data) fail(/truncated/i.test(text) ? 'truncated' : 'no_data');
  if (full.data.id !== DATA.id) fail('wrong_char');
  const art = await window.claude.use('artifact');
  if (!art) fail('no_save');
  setMsg('Saving the new version…');
  await art.publish(buildDoc(compact(full)));
}

// ⬆️ PUSH: this app's changes → D&D Beyond. Two confirmations, the first showing exactly what goes over.
// A scheduled task on Menno's computer enters them in Chrome (signed in to D&D Beyond), then fires pull,
// so this page comes back with D&D Beyond's numbers and an empty change list.
async function push(){
  if (syncing) return;
  const c = changes();
  if (!c.length) return setMsg('Nothing to push: the app matches D&amp;D Beyond.');
  if (!await confirmBox('Push '+c.length+' change'+(c.length===1?'':'s')+' to D&amp;D Beyond?', changeListHtml(c, 'Claude will open your character in Chrome on your computer and enter these.'), 'Next', false)) return;
  if (!await confirmBox('Edit your D&amp;D Beyond sheet now?', 'Keep your computer on, with Chrome open and signed in to D&amp;D Beyond. When Claude is done, this page pulls the new numbers by itself.', 'Push now', false)) return;
  syncing = true; syncBusy(true, 'push');
  const done = html => { syncing = false; syncBusy(false, 'push'); setMsg(html); };
  const mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null;
  if (!mcp) return done('Pushing needs this page open in Claude (app or claude.ai).');
  try {
    await mcp.callTool(REMOTE, 'fire_trigger', { trigger_id: PACK.sync.pushTask, text: changesText() }, { cache:false });
    done('⬆️ Claude is entering '+c.length+' change'+(c.length===1?'':'s')+' in D&amp;D Beyond on your computer. This page reloads when it’s done.');
  } catch (e) { done(remoteMsg(e && e.code, 'Push')); }
}

// every drawer repaint re-checks whether it needs the "scroll for more" strip
[['paintMenu','#menubox'], ['paintRollBox','#rollbox'], ['paintRest','#restbox']].forEach(([fn, sel]) => {
  const orig = window[fn]; window[fn] = function(){ const r = orig.apply(this, arguments); markScroll($(sel)); return r; };
});
render();
bootStore();
// Every dice mention anywhere gets the dice style, whatever painted it (bubbles, drawers, dialogs, roll cards…)
new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => {
  if (n.nodeType === 1) decorate(n); else if (n.nodeType === 3 && n.parentElement) decorate(n.parentElement);
})); }).observe(document.body, {childList:true, subtree:true});
