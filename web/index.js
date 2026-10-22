// Web app home: sign in, your characters, add one by D&D Beyond link, sharing per sheet.
// Sign in with an emailed code (or email + password). Google sign-in comes later.
const pb = new PocketBase(location.origin);
const $ = s => document.querySelector(s);
// HTML-escape a value
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const VIS = { private: 'Only me', party: 'My party can see', public: 'Anyone signed in' };

// status line under the header (bad = shown as an error)
function msg(t, bad) { const m = $('#msg'); m.textContent = t || ''; m.className = 'msg' + (bad ? ' bad' : ''); }

// Sign in: an emailed code by default (new emails get an account on the way), or email + password underneath
let otpId = null, otpEmail = '';
function renderLogin() {
  $('#main').innerHTML = `
    <form id="login" class="card">
      <h2>Sign in</h2>
      <label>Email <input name="email" type="email" autocomplete="email" required value="${esc(otpEmail)}"></label>
      <div id="codebox" ${otpId ? '' : 'hidden'}>
        <p class="small">We sent a 6-digit code to <b>${esc(otpEmail)}</b>. It works for 10 minutes.</p>
        <label>Code <input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456"></label>
      </div>
      <div class="row">${otpId ? '<button class="btn primary" name="go" value="otp">Sign in</button><button class="btn" name="go" value="resend" formnovalidate>Send a new code</button>'
        : '<button class="btn primary" name="go" value="code">📧 Email me a code</button>'}</div>
      <p class="small muted">${otpId ? 'Not there? Check spam, or <a href="#" id="otpback">use another email</a>.' : 'No password needed: we email you a code. New here? The same code makes your account.'}</p>
      <details class="pwbox"><summary class="small">Use a password instead</summary>
        <label>Password <input name="password" type="password" autocomplete="current-password" minlength="8"></label>
        <div class="row"><button class="btn" name="go" value="in">Sign in</button><button class="btn" name="go" value="up">Create account</button></div>
      </details>
    </form>`;
  const back = $('#otpback'); if (back) back.onclick = e => { e.preventDefault(); otpId = null; renderLogin(); };
  // back to the page that sent you here: only a path on this site ("/x", never "//other.site" or "/\\other.site")
  const done = () => { const next = new URLSearchParams(location.search).get('next'); if (next && /^\/(?![/\\])/.test(next)) { location.href = next; return; } msg(''); renderHome(); };
  $('#login').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, go = e.submitter && e.submitter.value, email = f.email.value.trim();
    if (go === 'code' || go === 'resend') {
      if (!email) return msg('Type your email first.', true);
      msg('Sending a code…');
      try { otpId = (await pb.collection('users').requestOTP(email)).otpId; otpEmail = email; msg(''); renderLogin(); const c = document.querySelector('[name=code]'); if (c) c.focus(); }
      catch (err) { msg('Couldn’t send the email right now. Use a password for the moment (below).', true); }
      return;
    }
    if (go === 'otp') {
      const code = f.code.value.trim(); if (!/^\d{6}$/.test(code)) return msg('The code is 6 digits.', true);
      msg('Signing in…');
      try { await pb.collection('users').authWithOTP(otpId, code); otpId = null; done(); }
      catch (err) { msg('That code didn’t work. Check it, or send a new one.', true); }
      return;
    }
    const password = f.password.value, up = go === 'up';
    if (password.length < 8) { f.querySelector('.pwbox').open = true; return msg('Passwords are at least 8 characters.', true); }
    msg(up ? 'Creating your account…' : 'Signing in…');
    try {
      if (up) await pb.collection('users').create({ email, password, passwordConfirm: password });
      await pb.collection('users').authWithPassword(email, password);
      done();
    } catch (err) { msg(up ? 'Couldn’t create that account. Is the email already used, or the password under 8 characters?' : 'Email or password not right.', true); }
  });
}

// Sign out: forget the login and everything this device kept for offline use (sheets, list, unsent notes),
// so the next person on a shared phone or laptop can't read them (the app files themselves stay cached)
function signOut() {
  pb.authStore.clear();
  try { Object.keys(localStorage).filter(k => /^(sheet-cache-|note-queue-|sheet-list$)/.test(k) || /-play-|-notes-/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (_) {}
  $('#who').textContent = ''; renderLogin();
}

// signed in: add-a-character form, your characters, shared with you
async function renderHome() {
  const me = pb.authStore.record;
  $('#who').innerHTML = '<span title="' + esc(me.email) + '">@' + esc(me.username || me.email) + '</span> · <a href="#" id="out">Sign out</a>';
  $('#out').onclick = e => { e.preventDefault(); signOut(); };
  const auto = /^player-[a-z0-9]{5}$/.test(me.username || '');
  $('#main').innerHTML = (auto ? nameCard(me) : '') + `
    <form id="add" class="card">
      <h2>Add a character</h2>
      <label>D&amp;D Beyond link <input name="url" placeholder="https://www.dndbeyond.com/characters/12345678" required></label>
      <p class="small muted">The character must be public on D&amp;D Beyond (Character settings → Privacy → Public). This app only reads it, it never changes your sheet.</p>
      <button class="btn primary">Add</button>
    </form>
    <section class="card"><h2>Your characters</h2><div id="mine" class="list"><p class="muted">Loading…</p></div></section>
    <section class="card"><h2>Shared with you</h2><div id="shared" class="list"><p class="muted">Loading…</p></div></section>` + (auto ? '' : nameCard(me)) + dataCard();
  $('#add').addEventListener('submit', addCharacter); $('#uname').addEventListener('submit', saveName);
  $('#export').onclick = exportData; $('#delacct').onclick = askDelete;
  await loadLists();
}

// a sheet's address: /<username>/<D&D Beyond id>
const sheetLink = c => '/' + c.handle + '/' + c.ddb_id;

// Your username: it's in every sheet link. New accounts get player-xxxxx; the card sits on top until it's changed.
function nameCard(me) {
  const auto = /^player-[a-z0-9]{5}$/.test(me.username || '');
  return `<form id="uname" class="card"><h2>Your username</h2>
      <p class="small muted">Your sheet links look like <code>${esc(location.host)}/<b>${esc(me.username || 'name')}</b>/170557047</code>${auto ? ' — pick your own before you share any.' : '. Changing it changes those links.'}</p>
      <div class="row"><input name="u" value="${esc(me.username || '')}" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="20" pattern="[a-zA-Z0-9][a-zA-Z0-9-]{1,18}[a-zA-Z0-9]" aria-label="Username" required>
      <button class="btn${auto ? ' primary' : ''}">Save</button></div></form>`;
}
async function saveName(e) {
  e.preventDefault();
  const me = pb.authStore.record, u = e.target.u.value.trim().toLowerCase();
  if (u === me.username) return msg('That’s already your username.');
  try { const r = await pb.collection('users').update(me.id, { username: u }); pb.authStore.save(pb.authStore.token, r); msg('Saved. Your links now use ' + r.username + '.'); renderHome(); }
  catch (err) { msg((err && err.response && err.response.data && err.response.data.username && err.response.data.username.message) || (err && err.message) || 'Couldn’t save that username.', true); }
}

// Your data (GDPR, see /legal.html): download everything this app keeps about you, or delete it all
const dataCard = () => `<section class="card"><h2>Your data</h2>
    <p class="small muted">Everything this app keeps about you, stored in the EU. Details in <a href="/legal.html">Privacy &amp; terms</a>.</p>
    <div class="row"><button class="btn" id="export">⬇️ Download my data</button><button class="btn danger" id="delacct">Delete my account</button></div>
    <div id="delbox" hidden></div></section>`;
async function exportData() {
  const me = pb.authStore.record, mine = { m: me.id };
  msg('Collecting your data…');
  try {
    const [account, characters, trackers, notes] = await Promise.all([
      pb.collection('users').getOne(me.id),
      pb.collection('characters').getFullList({ filter: pb.filter('owner = {:m}', mine) }),
      pb.collection('play').getFullList({ filter: pb.filter('character.owner = {:m}', mine) }),
      pb.collection('notes').getFullList({ filter: pb.filter('author = {:m}', mine) }),
    ]);
    const data = { exported: new Date().toISOString(), account: { email: account.email, username: account.username, verified: account.verified, created: account.created }, characters, trackers, notes };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'character-sheets-' + (account.username || 'data') + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    msg('Downloaded: your account, ' + characters.length + ' character' + (characters.length === 1 ? '' : 's') + ', trackers and ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') + '.');
  } catch (e) { msg('Couldn’t collect your data. Try again in a moment.', true); }
}
// delete: say exactly what goes, and ask for the username typed out (no accidental taps)
function askDelete() {
  const me = pb.authStore.record, box = $('#delbox'); box.hidden = false;
  box.innerHTML = `<div class="claim"><p><b>Delete your account?</b> Your account, all your characters, trackers and notes (party log posts too)
      are deleted straight away and leave the backups within 7 days. This can’t be undone. Your D&amp;D Beyond characters aren’t touched.</p>
    <label>Type your username, <b>${esc(me.username)}</b>, to confirm <input id="delname" autocomplete="off" autocapitalize="none"></label>
    <div class="row"><button class="btn danger" id="delgo">Delete everything</button><button class="btn" id="delno">Keep my account</button></div></div>`;
  $('#delno').onclick = () => { box.hidden = true; };
  $('#delgo').onclick = async () => {
    if ($('#delname').value.trim().toLowerCase() !== me.username) return msg('That’s not your username.', true);
    try { await pb.collection('users').delete(me.id); signOut(); msg('Your account and everything in it are deleted.'); }
    catch (e) { msg('Couldn’t delete the account. Try again, or email the contact on the Privacy & terms page.', true); }
  };
}

// fill both character lists, with visibility and verify controls on your own
async function loadLists() {
  const me = pb.authStore.record.id;
  let list = [];
  try { list = await pb.collection('characters').getFullList({ sort: 'name', fields: 'id,name,owner,handle,campaign,visibility,verified,ddb_id,updated,data.race.name,data.classes,data.campaign' });
    try { localStorage.setItem('sheet-list', JSON.stringify(list)); } catch (_) {} }
  catch (e) {   // offline: the last list this device saw (sheets opened before open offline too)
    try { list = JSON.parse(localStorage.getItem('sheet-list')) || []; } catch (_) { list = []; }
    msg(navigator.onLine ? 'Couldn’t load your characters.' : '📴 Offline: showing the sheets saved on this device.', navigator.onLine); }
  const card = c => {
    const d = c.data || {}, cls = (d.classes || []).map(k => k.name + ' ' + k.level).join(' / ');
    const camp = d.campaign && d.campaign.name ? d.campaign.name : '';
    const own = c.owner === me;
    return `<div class="ch"><a class="open" href="${esc(sheetLink(c))}"><b>${esc(c.name || 'Character')}</b>
        <span class="small muted">${esc([d.race && d.race.name, cls].filter(Boolean).join(' · ') || 'Not synced yet')}${camp ? ' · ' + esc(camp) : ''}${!own && c.handle ? ' · @' + esc(c.handle) : ''}</span></a>
      ${own ? `<div class="chctl">${c.verified ? '<span class="vbadge" title="You proved this is your D&amp;D Beyond character">✓ Verified</span>' : `<button class="btn small" data-claim="${esc(c.id)}">Verify</button>`}
        <select data-vis="${esc(c.id)}" aria-label="Who can see the tracker">${Object.entries(VIS).map(([k, t]) => `<option value="${k}"${c.visibility === k ? ' selected' : ''}${k === 'party' && !c.verified ? ' disabled' : ''}>${t}${k === 'party' && !c.verified ? ' (verify first)' : ''}</option>`).join('')}</select></div>`
        : `<span class="small muted">${esc(VIS[c.visibility] || '')}</span>`}</div>
      <div class="claim" id="claim-${esc(c.id)}" hidden></div>`;
  };
  const mine = list.filter(c => c.owner === me), shared = list.filter(c => c.owner !== me);
  $('#mine').innerHTML = mine.length ? mine.map(card).join('') : '<p class="muted">None yet. Paste a D&amp;D Beyond link above.</p>';
  $('#shared').innerHTML = shared.length ? shared.map(card).join('') : '<p class="muted">Nobody has shared a sheet with you yet. Party members can share theirs from their own list.</p>';
  document.querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => startClaim(b.dataset.claim)));
  document.querySelectorAll('[data-vis]').forEach(s => s.addEventListener('change', async () => {
    try { await pb.collection('characters').update(s.dataset.vis, { visibility: s.value }); msg('Saved: ' + VIS[s.value] + '.'); }
    catch (e) { msg('Couldn’t change who can see it.', true); }
  }));
}

// Optional: prove this account can edit the D&D Beyond sheet. Unlocks party sharing and the party log.
async function startClaim(id) {
  const box = document.getElementById('claim-' + id); box.hidden = false; box.innerHTML = '<p class="small muted">Getting a code…</p>';
  try {
    const { code } = await pb.send('/api/claim/' + id, { method: 'POST' });
    box.innerHTML = `<p><b>Verify it’s your character</b> (optional)</p>
      <ol class="small"><li>On D&amp;D Beyond, open this character → <b>Notes</b> (or Backstory) and paste <code class="code">${esc(code)}</code> anywhere. Save.</li>
      <li>Come back and tap <b>Check</b>. You can delete the code from D&amp;D Beyond afterwards.</li></ol>
      <p class="small muted">This only proves you can edit the sheet. The app never changes anything on D&amp;D Beyond.</p>
      <div class="row"><button class="btn primary" data-check>Check</button><button class="btn" data-cancel>Not now</button></div>`;
    box.querySelector('[data-cancel]').onclick = () => { box.hidden = true; };
    box.querySelector('[data-check]').onclick = async () => {
      msg('Reading D&D Beyond…');
      try { const r = await pb.send('/api/claim/' + id + '/check', { method: 'POST' });
        if (r.verified) { msg('Verified. You can now share this tracker with your party.'); loadLists(); }
        else msg('The code isn’t on the sheet yet. Saved it on D&D Beyond? It can take a minute to show.', true); }
      catch (e) { msg((e && e.message) || 'Couldn’t check D&D Beyond. Try again in a moment.', true); }
    };
  } catch (e) { box.innerHTML = '<p class="small muted">Couldn’t get a code. Try again.</p>'; }
}

// add a character by D&D Beyond link (the server checks it is public and fills name and campaign)
async function addCharacter(e) {
  e.preventDefault();
  const m = e.target.url.value.match(/characters\/(\d{4,12})/) || e.target.url.value.match(/^\s*(\d{4,12})\s*$/);
  if (!m) return msg('That doesn’t look like a D&D Beyond character link.', true);
  const id = +m[1];
  msg('Checking D&D Beyond…');
  try {
    const c = await pb.collection('characters').create({ ddb_id: id, owner: pb.authStore.record.id, visibility: 'private', data: {} });
    location.href = sheetLink(c);
  } catch (err) {
    const t = (err && err.response && (err.response.message || JSON.stringify(err.response.data || ''))) || '';
    msg(/ddb_id|unique/i.test(t) ? 'That character is already in your list.' : (t.includes('D&D Beyond') ? t : 'Couldn’t add it. Is the character public on D&D Beyond?'), true);
  }
}

(async () => {
  // offline: keep the saved login (the list below comes from this device's last copy)
  if (pb.authStore.isValid) { try { await pb.collection('users').authRefresh(); return renderHome(); } catch (e) { if (!navigator.onLine || !e || !e.status) return renderHome(); pb.authStore.clear(); } }
  renderLogin();
})();
