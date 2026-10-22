// Dungeon Tracker home (/). Three states, drawn into #main:
//   signed out  → the front page (#landing, static HTML from src/landing.html) and, on "Get started" or #signin, the sign-in card
//   new player  → onboarding: ① add your D&D Beyond character (how to make it public, read-only promise), ② pick a username
//   returning   → your characters, shared with you, account (username, your data, sign out)
// Sign-in: an emailed code (new emails get an account on the way), Google / Microsoft / Apple when set up in the
// dashboard (OAuth2; only providers that are filled in show), or email + password, folded away.
const pb = new PocketBase(location.origin);
const $ = s => document.querySelector(s);
// HTML-escape a value
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const VIS = { private: 'Only me', party: 'My party can see', public: 'Anyone signed in' };
const PENDING = 'pending-ddb';   // a character link pasted on the front page, added right after sign-in (this tab only)
const isAuto = u => /^player-[a-z0-9]{5}$/.test(u || '');   // the name every new account starts with

// status line under the header (bad = shown as an error)
function msg(t, bad) { const m = $('#msg'); m.textContent = t || ''; m.className = 'msg' + (bad ? ' bad' : ''); }
// a D&D Beyond character id from a link (or a bare number), else null
const ddbId = t => { const m = String(t || '').match(/characters\/(\d{4,12})/) || String(t || '').match(/^\s*(\d{4,12})\s*$/); return m ? +m[1] : null; };
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (_) {} } };

// ── Signed out: the front page ──────────────────────────────────────────────────────────────────────
function showLanding() {
  const l = $('#landing'); l.hidden = false; $('#main').innerHTML = ''; $('#who').innerHTML = '<a href="#signin" data-go="signin">Log in</a>';
  document.body.classList.add('front');
}
// clicks on "Get started" / "Sign in" anywhere on the page
document.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a || pb.authStore.isValid) return; e.preventDefault(); renderLogin(a.dataset.go); });
// "Have your character link ready?": keep it for after sign-in
$('#quicklink').addEventListener('submit', e => {
  e.preventDefault();
  const id = ddbId(e.target.url.value), m = e.target.querySelector('.ql-msg');
  if (!id) { m.textContent = 'That doesn’t look like a D&D Beyond character link. It looks like dndbeyond.com/characters/12345678.'; return; }
  ss.set(PENDING, String(id)); renderLogin('signup');
});

// ── Sign in ─────────────────────────────────────────────────────────────────────────────────────────
let otpId = null, otpEmail = '', providers = null;
async function renderLogin(mode) {
  $('#landing').hidden = true; document.body.classList.remove('front'); $('#who').innerHTML = '';
  if (location.hash !== '#signin') history.replaceState(null, '', '/#signin');
  if (providers === null) { try { const m = await pb.collection('users').listAuthMethods(); providers = (m.oauth2 && m.oauth2.enabled && m.oauth2.providers) || []; } catch (_) { providers = []; } }
  const pend = ss.get(PENDING);
  $('#main').innerHTML = `
    <form id="login" class="card auth">
      <h2>${mode === 'signin' ? 'Welcome back' : 'Start your adventure'}</h2>
      <p class="small muted">${pend ? 'Sign in and we’ll add your character straight away. ' : ''}New here? Signing in makes your account. No password needed.</p>
      ${providers.length ? `<div class="oauth">${providers.map(p => `<button class="btn wide" type="button" data-oauth="${esc(p.name)}">Continue with ${esc(p.displayName || p.name)}</button>`).join('')}</div>
        <p class="or"><span>or with your email</span></p>` : ''}
      <label>Email <input name="email" type="email" autocomplete="email" required value="${esc(otpEmail)}"></label>
      <div id="codebox" ${otpId ? '' : 'hidden'}>
        <p class="small">We sent a 6-digit code to <b>${esc(otpEmail)}</b>. It works for 10 minutes.</p>
        <label>Code <input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456"></label>
      </div>
      <div class="row">${otpId ? '<button class="btn primary" name="go" value="otp">Sign in</button><button class="btn" name="go" value="resend" formnovalidate>Send a new code</button>'
        : '<button class="btn primary" name="go" value="code">📧 Email me a code</button>'}</div>
      <p class="small muted">${otpId ? 'Not there? Check spam, or <a href="#" id="otpback">use another email</a>.' : 'We email you a code to sign in.'}</p>
      <details class="pwbox"><summary class="small">Use a password instead</summary>
        <label>Password <input name="password" type="password" autocomplete="current-password" minlength="8"></label>
        <div class="row"><button class="btn" name="go" value="in">Sign in</button><button class="btn" name="go" value="up">Create account</button></div>
      </details>
      <p class="small"><a href="/" id="tofront">← Back to the front page</a></p>
    </form>`;
  const back = $('#otpback'); if (back) back.onclick = e => { e.preventDefault(); otpId = null; renderLogin(mode); };
  $('#tofront').onclick = e => { e.preventDefault(); history.replaceState(null, '', '/'); msg(''); showLanding(); };
  document.querySelectorAll('[data-oauth]').forEach(b => b.onclick = async () => {
    msg('Opening ' + b.textContent.replace('Continue with ', '') + '…');
    try { await pb.collection('users').authWithOAuth2({ provider: b.dataset.oauth }); msg(''); signedIn(); }
    catch (err) { msg('That sign-in didn’t finish. Try again, or use your email.', true); }
  });
  $('#login').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, go = e.submitter && e.submitter.value, email = f.email.value.trim();
    if (go === 'code' || go === 'resend') {
      if (!email) return msg('Type your email first.', true);
      msg('Sending a code…');
      try { otpId = (await pb.collection('users').requestOTP(email)).otpId; otpEmail = email; msg(''); renderLogin(mode); const c = document.querySelector('[name=code]'); if (c) c.focus(); }
      catch (err) { msg('Couldn’t send the email right now. Use a password for the moment (below).', true); }
      return;
    }
    if (go === 'otp') {
      const code = f.code.value.trim(); if (!/^\d{6}$/.test(code)) return msg('The code is 6 digits.', true);
      msg('Signing in…');
      try { await pb.collection('users').authWithOTP(otpId, code); otpId = null; msg(''); signedIn(); }
      catch (err) { msg('That code didn’t work. Check it, or send a new one.', true); }
      return;
    }
    const password = f.password.value, up = go === 'up';
    if (password.length < 8) { f.querySelector('.pwbox').open = true; return msg('Passwords are at least 8 characters.', true); }
    msg(up ? 'Creating your account…' : 'Signing in…');
    try {
      if (up) await pb.collection('users').create({ email, password, passwordConfirm: password });
      await pb.collection('users').authWithPassword(email, password);
      msg(''); signedIn();
    } catch (err) { msg(up ? 'Couldn’t create that account. Is the email already used, or the password under 8 characters?' : 'Email or password not right.', true); }
  });
}

// Just signed in: back to where you came from, or add the character pasted on the front page, or onboarding, or home
async function signedIn() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  const next = new URLSearchParams(location.search).get('next');
  if (next && /^\/(?![/\\])/.test(next)) { location.href = next; return; }   // only a path on this site ("/x", never "//other.site")
  const pend = ss.get(PENDING); ss.set(PENDING, null);
  if (pend) return addById(+pend, true);
  let count = 1;
  try { count = (await pb.collection('characters').getList(1, 1, { filter: pb.filter('owner = {:m}', { m: pb.authStore.record.id }), fields: 'id' })).totalItems; } catch (_) {}
  return count ? renderHome() : renderOnboarding();
}

// ── New player: ① add your character ──────────────────────────────────────────────────────────────────
function header() {
  const me = pb.authStore.record;
  $('#landing').hidden = true; document.body.classList.remove('front');
  $('#who').innerHTML = '<span title="' + esc(me.email) + '">@' + esc(me.username || me.email) + '</span> · <a href="#" id="out">Sign out</a>';
  $('#out').onclick = e => { e.preventDefault(); signOut(); };
}
function renderOnboarding() {
  header();
  $('#main').innerHTML = `
    <form id="add" class="card onb">
      <p class="stepno">Step 1 of 2</p>
      <h2>Add your character</h2>
      <label>Your D&amp;D Beyond character link <input name="url" placeholder="https://www.dndbeyond.com/characters/12345678" required autocomplete="off" inputmode="url"></label>
      <button class="btn primary">Add my character</button>
      <div class="howto">
        <h3>First, make it public on D&amp;D Beyond</h3>
        <ol><li>Open your character on <b>dndbeyond.com</b>.</li>
          <li>Go to <b>Character Settings</b> → <b>Character Privacy</b> and pick <b>Public</b>.</li>
          <li>Copy the address from your browser (it looks like dndbeyond.com/characters/12345678) and paste it above.</li></ol>
        <p class="promise">📖 <b>Read-only.</b> Dungeon Tracker only reads your sheet. It never changes anything on D&amp;D Beyond.</p>
      </div>
    </form>`;
  $('#add').addEventListener('submit', addCharacter);
  const u = $('#add [name=url]'); if (u) u.focus();
}

// ── New player: ② a username (it's in every sheet link) ─────────────────────────────────────────────
function renderUsernameStep(c) {
  header();
  const me = pb.authStore.record;
  $('#main').innerHTML = `
    <form id="ustep" class="card onb">
      <p class="stepno">Step 2 of 2</p>
      <h2>${esc(c.name || 'Your character')} is in!</h2>
      <p>Pick a username for Dungeon Tracker. It’s in your sheet links, so your party can find your character:</p>
      <p class="linkpreview"><code>${esc(location.host)}/<b id="upv">${esc(me.username)}</b>/${esc(c.ddb_id)}</code></p>
      <label>Username <input name="u" value="${esc(me.username || '')}" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="20" required></label>
      <p class="small muted">3–20 letters, digits or dashes. You can change it later.</p>
      <div class="row"><button class="btn primary" value="go">Open my sheet</button></div>
    </form>`;
  const inp = $('#ustep [name=u]');
  inp.oninput = () => { $('#upv').textContent = inp.value.trim().toLowerCase() || '…'; };
  $('#ustep').addEventListener('submit', async e => {
    e.preventDefault();
    const u = inp.value.trim().toLowerCase();
    if (u !== me.username) {
      try { const r = await pb.collection('users').update(me.id, { username: u }); pb.authStore.save(pb.authStore.token, r); }
      catch (err) { return msg((err && err.response && err.response.data && err.response.data.username && err.response.data.username.message) || (err && err.message) || 'Couldn’t save that username.', true); }
    }
    location.href = '/' + (pb.authStore.record.username) + '/' + c.ddb_id;
  });
}

// Sign out: forget the login and everything this device kept for offline use (sheets, list, unsent notes),
// so the next person on a shared phone or laptop can't read them (the app files themselves stay cached)
function signOut() {
  pb.authStore.clear();
  try { Object.keys(localStorage).filter(k => /^(sheet-cache-|note-queue-|sheet-list$)/.test(k) || /-play-|-notes-/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (_) {}
  msg(''); history.replaceState(null, '', '/'); showLanding();
}

// ── Returning player: your characters, shared with you, account ─────────────────────────────────────
async function renderHome() {
  header();
  const me = pb.authStore.record, auto = isAuto(me.username);
  $('#main').innerHTML = '<div id="cont"></div>' + (auto ? nameCard(me) : '') + `
    <section class="card"><h2>Your characters</h2><div id="mine" class="list"><p class="muted">Loading…</p></div>
      <form id="add" class="addrow"><input name="url" placeholder="Add a character: paste its D&amp;D Beyond link" required autocomplete="off" inputmode="url" aria-label="D&amp;D Beyond character link"><button class="btn primary">Add</button></form>
      <p class="small muted">The character must be public on D&amp;D Beyond (Character Settings → Character Privacy → Public). Dungeon Tracker only reads it.</p></section>
    <section class="card"><h2>Shared with you</h2><div id="shared" class="list"><p class="muted">Loading…</p></div></section>` + inviteCard() + (auto ? '' : nameCard(me)) + dataCard();
  $('#add').addEventListener('submit', addCharacter); $('#uname').addEventListener('submit', saveName);
  $('#export').onclick = exportData; $('#delacct').onclick = askDelete; bindInvite();
  await loadLists();
}

// Invite your party: the front page's address with a short note, through the phone's share sheet or the clipboard.
// No referral codes or tracking: the link is the plain front page.
const INVITE = 'I track my D&D Beyond character with Dungeon Tracker: every roll one tap away, HP and spell slots kept as we play. Free, and it never changes your D&D Beyond sheet.';
const inviteCard = () => `<section class="card invite"><h2>Invite your party</h2>
    <p class="small muted">Playing with friends who use D&amp;D Beyond? Send them the link. Once their characters are in the same campaign, you can share trackers and a party log.</p>
    <div class="row"><button class="btn primary" id="invshare">📨 Share invite</button><button class="btn" id="invcopy">🔗 Copy link</button></div></section>`;
function bindInvite() {
  const url = location.origin + '/';
  const copy = async () => { try { await navigator.clipboard.writeText(INVITE + ' ' + url); msg('Copied. Paste it in your group chat.'); } catch (_) { msg('Copy this link: ' + url); } };
  $('#invcopy').onclick = copy;
  $('#invshare').onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Dungeon Tracker', text: INVITE, url }); } catch (_) {} } else copy();
  };
}

// "Continue with …": the last sheet opened on this device, if it's still in one of your lists
function continueCard(list) {
  let last = null; try { last = JSON.parse(localStorage.getItem('last-sheet')); } catch (_) {}
  const c = last && list.find(x => x.id === last.id);
  $('#cont').innerHTML = c ? `<a class="btn cta contbtn" href="${esc(sheetLink(c))}"><svg class="d20i" aria-hidden="true" viewBox="0 0 100 100"><use href="#d20"/></svg> Continue with ${esc(c.name || last.name)}</a>` : '';
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
    <p class="small muted">Everything this app keeps about you, stored in the EU.</p>
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
    a.download = 'dungeon-tracker-' + (account.username || 'data') + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    msg('Downloaded: your account, ' + characters.length + ' character' + (characters.length === 1 ? '' : 's') + ', trackers and ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') + '.');
  } catch (e) { msg('Couldn’t collect your data. Try again in a moment.', true); }
}
// delete: say exactly what goes, and ask for the username typed out (no accidental taps)
function askDelete() {
  const me = pb.authStore.record, box = $('#delbox'); box.hidden = false;
  box.innerHTML = `<div class="claim"><p><b>Delete your account?</b> Your account, all your characters, trackers and notes (party log posts too)
      are deleted straight away and leave the backups within 15 days. This can’t be undone. Your D&amp;D Beyond characters aren’t touched.</p>
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
  try { list = await pb.collection('characters').getFullList({ sort: 'name', fields: 'id,name,owner,handle,campaign,visibility,verified,ddb_id,updated,pinned,archived,sort,data.race.name,data.classes,data.campaign' });
    try { localStorage.setItem('sheet-list', JSON.stringify(list)); } catch (_) {} }
  catch (e) {   // offline: the last list this device saw (sheets opened before open offline too)
    try { list = JSON.parse(localStorage.getItem('sheet-list')) || []; } catch (_) { list = []; }
    msg(navigator.onLine ? 'Couldn’t load your characters.' : '📴 Offline: showing the sheets saved on this device.', navigator.onLine); }
  const card = c => {
    const d = c.data || {}, cls = (d.classes || []).map(k => k.name + ' ' + k.level).join(' / ');
    const camp = d.campaign && d.campaign.name ? d.campaign.name : '';
    const own = c.owner === me;
    const tools = own ? `<button class="chstar${c.pinned ? ' on' : ''}" data-pin="${esc(c.id)}" aria-pressed="${!!c.pinned}" title="${c.pinned ? 'Playing now' : 'Mark as playing now'}" aria-label="${c.pinned ? 'Playing now: tap to unmark' : 'Mark as playing now'}">${c.pinned ? '★' : '☆'}</button>` : '';
    const more = own ? `<details class="chmore"><summary aria-label="More for ${esc(c.name || 'this character')}">⋯</summary><div class="chmenu">
        ${c.archived ? '' : `<button class="btn small" data-move="${esc(c.id)}" data-d="-1">↑ Move up</button><button class="btn small" data-move="${esc(c.id)}" data-d="1">↓ Move down</button>`}
        <button class="btn small" data-arch="${esc(c.id)}">${c.archived ? '↩︎ Unarchive' : '🗄️ Archive'}</button>
        <button class="btn small danger" data-rm="${esc(c.id)}">Remove…</button></div></details>` : '';
    return `<div class="ch${c.archived ? ' archived' : ''}">${tools}<a class="open" href="${esc(sheetLink(c))}"><b>${esc(c.name || 'Character')}</b>
        <span class="small muted">${esc([d.race && d.race.name, cls].filter(Boolean).join(' · ') || 'Not synced yet')}${camp ? ' · ' + esc(camp) : ''}${!own && c.handle ? ' · @' + esc(c.handle) : ''}</span></a>
      ${own ? `<div class="chctl">${c.verified ? '<span class="vbadge" title="You proved this is your D&amp;D Beyond character">✓ Verified</span>' : `<button class="btn small" data-claim="${esc(c.id)}">Verify</button>`}
        <select data-vis="${esc(c.id)}" aria-label="Who can see the tracker">${Object.entries(VIS).map(([k, t]) => `<option value="${k}"${c.visibility === k ? ' selected' : ''}${k === 'party' && !c.verified ? ' disabled' : ''}>${t}${k === 'party' && !c.verified ? ' (verify first)' : ''}</option>`).join('')}</select></div>`
        : `<span class="small muted">${esc(VIS[c.visibility] || '')}</span>`}${more}</div>
      <div class="claim" id="claim-${esc(c.id)}" hidden></div>`;
  };
  continueCard(list);
  // your list: ⭐ playing now first, then your own order (sort), then by name; archived ones folded away below
  const order = (a, b) => (b.pinned - a.pinned) || ((a.sort || 1e6) - (b.sort || 1e6)) || String(a.name).localeCompare(String(b.name));
  const mine = list.filter(c => c.owner === me).sort(order), shared = list.filter(c => c.owner !== me);
  const active = mine.filter(c => !c.archived), arch = mine.filter(c => c.archived);
  $('#mine').innerHTML = (active.length ? active.map(card).join('') : '<p class="muted">' + (arch.length ? 'All your characters are archived.' : 'None yet. Paste a D&amp;D Beyond link below.') + '</p>')
    + (arch.length ? `<details class="archlist"><summary>🗄️ Archived (${arch.length})</summary>${arch.map(card).join('')}</details>` : '');
  bindListTools(active);
  $('#shared').innerHTML = shared.length ? shared.map(card).join('') : '<p class="muted">Nobody has shared a sheet with you yet. Party members can share theirs from their own list.</p>';
  document.querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => startClaim(b.dataset.claim)));
  document.querySelectorAll('[data-vis]').forEach(s => s.addEventListener('change', async () => {
    try { await pb.collection('characters').update(s.dataset.vis, { visibility: s.value }); msg('Saved: ' + VIS[s.value] + '.'); }
    catch (e) { msg('Couldn’t change who can see it.', true); }
  }));
}

// your list's tools: ⭐ playing now, move up/down, archive, remove (with a confirm that says what goes and what stays)
function bindListTools(active) {
  const save = async (id, data, done) => { try { await pb.collection('characters').update(id, data); if (done) msg(done); loadLists(); } catch (e) { msg('Couldn’t save that. Try again.', true); } };
  document.querySelectorAll('[data-pin]').forEach(b => b.onclick = () => save(b.dataset.pin, { pinned: b.getAttribute('aria-pressed') !== 'true' }));
  document.querySelectorAll('[data-arch]').forEach(b => b.onclick = () => { const c = active.find(x => x.id === b.dataset.arch);
    save(b.dataset.arch, c ? { archived: true, pinned: false } : { archived: false }, c ? 'Archived. It’s under “Archived” at the bottom of your list.' : 'Back in your list.'); });
  document.querySelectorAll('[data-move]').forEach(b => b.onclick = async () => {
    // number the active list in its shown order, swap this one with its neighbour, save the changed ones
    const ids = active.map(c => c.id), i = ids.indexOf(b.dataset.move), j = i + +b.dataset.d;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await Promise.all(ids.map((id, k) => (active.find(c => c.id === id).sort !== k + 1) ? pb.collection('characters').update(id, { sort: k + 1 }) : null)); loadLists(); }
    catch (e) { msg('Couldn’t save the order. Try again.', true); }
  });
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
    const ch = b.closest('.ch'), name = ch.querySelector('.open b').textContent, box = document.getElementById('claim-' + b.dataset.rm);
    ch.querySelector('.chmore').open = false; box.hidden = false;
    box.innerHTML = `<div class="rmbox"><p><b>Remove ${esc(name)} from Dungeon Tracker?</b> Its tracker here (HP, slots, uses) and your notes for it are deleted,
        party log posts too. Don’t worry: ${esc(name)} is still on D&amp;D Beyond, and you can import it again any time.</p>
      <div class="row"><button class="btn danger" data-rmgo>Remove</button><button class="btn" data-rmno>Keep</button></div></div>`;
    box.querySelector('[data-rmno]').onclick = () => { box.hidden = true; };
    box.querySelector('[data-rmgo]').onclick = async () => {
      try { await pb.collection('characters').delete(b.dataset.rm); msg(name + ' is removed. Paste its D&D Beyond link to bring it back.'); loadLists(); }
      catch (e) { msg('Couldn’t remove it. Try again.', true); }
    };
  });
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
function addCharacter(e) {
  e.preventDefault();
  const id = ddbId(e.target.url.value);
  if (!id) return msg('That doesn’t look like a D&D Beyond character link. It looks like dndbeyond.com/characters/12345678.', true);
  return addById(id, !!document.querySelector('form.onb'));
}
// first = during onboarding: go on to the username step (if the name is still player-xxxxx), else straight to the sheet
// a short "reading your character" overlay while the import runs (a spinning d20; still with reduce-motion), then
// a brief ✓ with the name, under a second in all
function importFx(state, name) {
  let el = $('#importfx');
  if (state === 'off') { if (el) el.remove(); return Promise.resolve(); }
  if (!el) { el = document.createElement('div'); el.id = 'importfx'; el.className = 'importfx'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = state === 'done'
    ? '<div class="ifbox done"><span class="ifok" aria-hidden="true">✓</span><p><b>' + esc(name || 'Your character') + '</b> is in!</p></div>'
    : '<div class="ifbox"><svg class="ifd20" viewBox="0 0 100 100" aria-hidden="true"><use href="#d20"/></svg><p>Reading your character from D&amp;D Beyond…</p></div>';
  return new Promise(r => setTimeout(r, state === 'done' ? 450 : 0));
}
async function addById(id, first) {
  msg(''); importFx('on');
  try {
    const c = await pb.collection('characters').create({ ddb_id: id, owner: pb.authStore.record.id, visibility: 'private', data: {} });
    await importFx('done', c.name); importFx('off');
    if (first && isAuto(pb.authStore.record.username)) return renderUsernameStep(c);
    location.href = sheetLink(c);
  } catch (err) {
    importFx('off');
    const t = (err && err.response && (err.response.message || JSON.stringify(err.response.data || ''))) || '';
    if (/ddb_id|unique/i.test(t)) { msg('That character is already in your list.'); return renderHome(); }
    if (!document.querySelector('#add')) renderOnboarding();
    msg(t.includes('D&D Beyond') ? t + ' (Character Settings → Character Privacy → Public)' : 'Couldn’t add it. Is the character public on D&D Beyond?', true);
  }
}

// #signin in the address (a link, or Back/Forward): the sign-in card, if signed out
window.addEventListener('hashchange', () => { if (location.hash === '#signin' && !pb.authStore.isValid) renderLogin('signin'); });

(async () => {
  // signed in (offline too: keep the saved login; the list comes from this device's last copy)
  if (pb.authStore.isValid) {
    try { await pb.collection('users').authRefresh(); return signedIn(); }
    catch (e) { if (!navigator.onLine || !e || !e.status) return renderHome(); pb.authStore.clear(); }
  }
  if (location.hash === '#signin' || new URLSearchParams(location.search).get('next')) return renderLogin('signin');
  showLanding();
})();
