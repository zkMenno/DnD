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
// a short note in a pop-up at the top of the screen: gone after a few seconds (problems stay longer), or tap it away.
// Something still in progress ("Sending a code…", ending in …) stays until the next message replaces it.
let msgTimer = 0;
function msg(t, bad) {
  const m = $('#msg'); clearTimeout(msgTimer);
  m.textContent = t || ''; m.className = 'msg' + (bad ? ' bad' : '') + (t ? ' show' : '');
  if (t && !/…$/.test(t)) msgTimer = setTimeout(() => { m.classList.remove('show'); setTimeout(() => { if (!m.classList.contains('show')) m.textContent = ''; }, 250); }, bad ? 12000 : 3500);
}
// a short centred pop-up for things that should feel finished (a password saved): a big ✓, gone after a moment or a tap
function done(title, text) {
  const old = $('#donepop'); if (old) old.remove();
  const p = document.createElement('div'); p.id = 'donepop'; p.className = 'donepop'; p.setAttribute('role', 'status');
  p.innerHTML = `<div class="donecard"><span class="donetick" aria-hidden="true">✓</span><b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}</div>`;
  document.body.appendChild(p); requestAnimationFrame(() => p.classList.add('show'));
  const bye = () => { p.classList.remove('show'); setTimeout(() => p.remove(), 250); };
  p.onclick = bye; setTimeout(bye, 3200);
}
// emails that have a password, as far as this device knows: the sign-in page opens the password box for them
const PWK = 'dt-pw-emails';
const pwKnown = em => { try { return (JSON.parse(localStorage.getItem(PWK) || '[]')).includes(String(em || '').trim().toLowerCase()); } catch (_) { return false; } };
const pwRemember = em => { try { const l = JSON.parse(localStorage.getItem(PWK) || '[]'), e = String(em || '').trim().toLowerCase();
  if (e && !l.includes(e)) { l.push(e); localStorage.setItem(PWK, JSON.stringify(l.slice(-5))); } } catch (_) {} };
// a D&D Beyond character id from a link (or a bare number), else null
const ddbId = t => { const m = String(t || '').match(/characters\/(\d{4,12})/) || String(t || '').match(/^\s*(\d{4,12})\s*$/); return m ? +m[1] : null; };
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (_) {} } };

// ── Signed out: the front page ──────────────────────────────────────────────────────────────────────
function showLanding() {
  const l = $('#landing'); l.hidden = false; $('#main').innerHTML = '';
  // signed in: the front page is still there to look at (logo or /#front); the button leads back to your characters
  $('#who').innerHTML = pb.authStore.isValid ? '<a class="btn login toplogin" href="/" id="tohome">Your characters <span aria-hidden="true">→</span></a>'
    : '<a class="btn login toplogin" href="#signin" data-go="signin">Log in <span aria-hidden="true">→</span></a>';
  if (pb.authStore.isValid) $('#tohome').onclick = e => { e.preventDefault(); history.replaceState(null, '', '/'); renderHome(); window.scrollTo(0, 0); };
  document.body.classList.add('front'); window.Skin && window.Skin.front(true);
}
$('#msg').addEventListener('click', () => msg(''));
// clicks on "Get started" / "Sign in" anywhere on the page
document.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault();
  if (pb.authStore.isValid) { history.replaceState(null, '', '/'); renderHome(); window.scrollTo(0, 0); return; }   // signed in: Get started = your characters
  renderLogin(a.dataset.go); });
// "Have your character link ready?": keep it for after sign-in
// (the same box is in the hero and in How it works, step II)
document.querySelectorAll('form.quicklink').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault();
  const id = ddbId(e.target.url.value), m = e.target.querySelector('.ql-msg');
  if (!id) { m.textContent = 'That doesn’t look like a D&D Beyond character link. It looks like dndbeyond.com/characters/12345678.'; return; }
  ss.set(PENDING, String(id)); if (pb.authStore.isValid) signedIn(); else renderLogin('signup');   // signed in: add it straight away
}));

// ── Sign in ─────────────────────────────────────────────────────────────────────────────────────────
let otpId = null, otpEmail = '', providers = null;
async function renderLogin(mode) {
  $('#landing').hidden = true; document.body.classList.remove('front'); window.Skin && window.Skin.front(false); $('#who').innerHTML = '';
  if (location.hash !== '#signin') history.replaceState(null, '', '/#signin');
  if (providers === null) { try { const m = await pb.collection('users').listAuthMethods(); providers = (m.oauth2 && m.oauth2.enabled && m.oauth2.providers) || []; } catch (_) { providers = []; } }
  const pend = ss.get(PENDING);
  // one card: sign-in providers on top when the server has any (Google, Apple, Microsoft, Proton… as they're switched on),
  // then email with a one-time code, then an optional password; every choice is a real button
  const ICON = { google: 'G', apple: '', microsoft: '⊞', proton: '🟣' };
  $('#main').innerHTML = `
    <form id="login" class="card auth">
      <p class="eyebrow">${mode === 'signin' ? 'Sign in' : 'Create your account'}</p>
      <h2>${mode === 'signin' ? 'Welcome back' : 'Start your adventure'}</h2>
      <p class="muted authlede">${pend ? 'Sign in and we’ll add your character straight away. ' : ''}New here? Signing in makes your account. No password needed.</p>
      ${providers.length ? `<div class="oauth">${providers.map(p => `<button class="btn oauthbtn" type="button" data-oauth="${esc(p.name)}"><span class="oico" aria-hidden="true">${esc(ICON[p.name] || '🔑')}</span>Continue with ${esc(p.displayName || p.name)}</button>`).join('')}</div>
        <p class="or"><span>or with your email</span></p>` : ''}
      <label class="authlbl" for="authemail">Email</label>
      <div class="authrow">
        <input id="authemail" name="email" type="email" autocomplete="email" required value="${esc(otpEmail)}" placeholder="you@example.com">
        ${otpId ? '' : '<button class="btn primary" name="go" value="code">📧 Email me a code</button>'}
      </div>
      ${otpId ? `<div id="codebox" class="codebox">
        <p>We sent a 6-digit code to <b>${esc(otpEmail)}</b>. It works for 10 minutes.</p>
        <div class="authrow"><input name="code" class="codein" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" aria-label="Code">
          <button class="btn primary" name="go" value="otp">Roll in <span aria-hidden="true">→</span></button></div>
        <div class="row authsub"><button class="btn" name="go" value="resend" formnovalidate>Send a new code</button><button class="btn" type="button" id="otpback">Use another email</button></div>
        <p class="small muted">Not there? Check your spam folder.</p>
      </div>` : '<p class="small muted authhint">We email you a 6-digit code. No password to remember.</p>'}
      <details class="pwbox"${pwKnown(otpEmail) || mode === 'signup-pw' ? ' open' : ''}><summary class="btn">🔑 Use a password instead <span class="xchev" aria-hidden="true"></span></summary>
        <div class="pwpanel">
          <div class="pwseg" role="group" aria-label="Sign in or make a new account">
            <button type="button" data-pwmode="in" aria-pressed="true">I have a password</button><button type="button" data-pwmode="up" aria-pressed="false">New account</button></div>
          <label class="authlbl" for="authpw">Password</label>
          <input id="authpw" name="password" type="password" autocomplete="current-password" minlength="8" placeholder="Your password">
          <div id="pw2box" hidden><label class="authlbl" for="authpw2">Repeat the password</label>
            <input id="authpw2" name="password2" type="password" autocomplete="new-password" minlength="8" placeholder="The same password again"></div>
          <div class="row authsub"><button class="btn primary" name="go" value="in" id="pwgo">Roll in <span aria-hidden="true">→</span></button></div>
          <p class="pwerr" id="pwerr" role="alert" hidden></p>
        </div>
      </details>
      <div class="authfoot"><a class="btn" href="/" id="tofront">← Roll back to home</a></div>
    </form>`;
  const back = $('#otpback'); if (back) back.onclick = e => { e.preventDefault(); otpId = null; renderLogin(mode); };
  // the password box: sign in with one, or make a new account with it (asked twice)
  const pwMode = m => { document.querySelectorAll('[data-pwmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pwmode === m)));
    $('#pw2box').hidden = m !== 'up'; $('#authpw').autocomplete = m === 'up' ? 'new-password' : 'current-password';
    $('#authpw').placeholder = m === 'up' ? 'At least 8 characters' : 'Your password';
    $('#pwgo').value = m; $('#pwgo').innerHTML = m === 'up' ? 'Create account <span aria-hidden="true">→</span>' : 'Roll in <span aria-hidden="true">→</span>'; };
  document.querySelectorAll('[data-pwmode]').forEach(b => b.onclick = () => { pwMode(b.dataset.pwmode); $('#authpw').focus(); });
  if (mode === 'signup') pwMode('up');
  // an email this device knows has a password: open the password box straight away
  const em = $('#authemail'), pwOpen = () => { if (pwKnown(em.value)) { const d = document.querySelector('.pwbox'); if (!d.open) { d.open = true; pwMode('in'); } } };
  em.addEventListener('input', pwOpen); em.addEventListener('change', pwOpen); pwOpen();
  if (otpId) { const c = document.querySelector('[name=code]'); if (c) c.focus(); }
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
    const perr = (t, bad) => { const p = $('#pwerr'); if (!p) return msg(t, bad); msg(''); p.textContent = t || ''; p.hidden = !t; };
    const password = f.password.value, up = go === 'up';
    if (!email) { f.email.focus(); return perr('Type your email first.', true); }
    if (password.length < 8) { f.querySelector('.pwbox').open = true; return perr('Passwords are at least 8 characters.', true); }
    if (up && f.password2.value !== password) { $('#authpw2').focus(); return perr('The two passwords aren’t the same.', true); }
    perr(''); msg(up ? 'Creating your account…' : 'Signing in…');
    try {
      if (up) await pb.collection('users').create({ email, password, passwordConfirm: password });
      await pb.collection('users').authWithPassword(email, password);
      pwRemember(email); msg(''); signedIn();
    } catch (err) {
      msg('');
      const taken = up && err && err.response && err.response.data && err.response.data.email;
      if (taken) return perr('That email already has an account. Sign in with your password, or press “Email me a code” if you never set one: you can save a password on your account page after.', true);
      perr(up ? 'Couldn’t create that account. Check the email, and use at least 8 characters for the password.'
        : 'Email or password not right. Never set a password? Press “Email me a code” to sign in, then save one on your account page.', true);
    }
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
  $('#landing').hidden = true; document.body.classList.remove('front'); window.Skin && window.Skin.front(false);
  $('#who').innerHTML = '<span title="' + esc(me.email) + '">@' + esc(me.username || me.email) + '</span> · <a href="#" id="out">Sign out</a>';
  const brand = document.querySelector('.top .brand'); if (brand) brand.setAttribute('href', '/#front');   // the logo shows the front page
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
      <p class="small muted">3–20 letters, digits, dashes or underscores. You can change it later.</p>
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
  // tabs keep the page short: Characters · Party · Account · Your data (the last one opened is remembered)
  const TABS = [['chars', '🎲', 'Characters'], ['party', '🍻', 'Party'], ['account', '⚙️', 'Account'], ['data', '🗄️', 'Your data']];
  $('#main').innerHTML = (auto ? nameCard(me) : '')
    + '<nav class="hometabs" role="tablist" aria-label="Sections">' + TABS.map(([k, e, t]) => `<button type="button" role="tab" data-hometab="${k}"><span aria-hidden="true">${e}</span> ${t}</button>`).join('') + '</nav>'
    + `<div class="htab" data-tab="chars">
    <section class="card"><h2>Your characters</h2><div id="mine" class="list"><p class="muted">Loading…</p></div>
      <form id="add" class="addrow"><input name="url" placeholder="Add a character: paste its D&amp;D Beyond link" required autocomplete="off" inputmode="url" aria-label="D&amp;D Beyond character link"><button class="btn primary">Add</button></form>
      <p class="small muted visinfo"><b>Who can see your tracker?</b> <i>Only me</i>: just you. <i>My party can see</i>: other verified players whose characters are in the same D&amp;D Beyond campaign can look at it (read-only), and you share a party log under Notes. <i>Anyone signed in</i>: anyone with the link. Verify a character first to share it with your party.</p>
      <p class="small muted">The character must be public on D&amp;D Beyond (Character Settings → Character Privacy → Public). Dungeon Tracker only reads it.</p></section>
    </div>
    <div class="htab" data-tab="party"><section class="card"><h2>Shared with you</h2><div id="shared" class="list"><p class="muted">Loading…</p></div></section>` + inviteCard() + '</div>'
    + '<div class="htab" data-tab="account">' + (auto ? '' : nameCard(me)) + looksCard() + secCard(me) + '</div><div class="htab" data-tab="data">' + dataCard() + '</div>';
  const showTab = k => { document.querySelectorAll('.htab').forEach(t => { t.hidden = t.dataset.tab !== k; });
    document.querySelectorAll('[data-hometab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.hometab === k))); try { localStorage.setItem('home-tab', k); } catch (_) {} };
  document.querySelectorAll('[data-hometab]').forEach(b => b.onclick = () => showTab(b.dataset.hometab));
  let last = 'chars'; try { last = localStorage.getItem('home-tab') || 'chars'; } catch (_) {}
  showTab(TABS.some(t => t[0] === last) ? last : 'chars');
  pwPrompt(me);
  $('#add').addEventListener('submit', addCharacter); $('#uname').addEventListener('submit', saveName);
  { const u = $('#uname [name=u]'); u.addEventListener('input', () => { $('#unpv').textContent = u.value.trim().toLowerCase() || 'name'; }); }   // the example link follows what you type
  bindSec(); bindLooks(); $('#export').onclick = exportData; $('#delacct').onclick = askDelete; bindInvite();
  await loadLists();
}

// Invite your party: the front page's address with a short note, through the phone's share sheet or the clipboard.
// No referral codes or tracking: the link is the plain front page.
const INVITE = 'Hey! I found an awesome new way to track my D&D Beyond character, check it out!';
const inviteCard = () => `<section class="card invite"><h2>Invite your party</h2>
    <p class="small muted">Playing with friends who use D&amp;D Beyond? Send them the link. Once their characters are in the same campaign, you can share trackers and a party log.</p>
    <div class="row saverow"><button class="btn" id="invcopy">🔗 Copy link</button><button class="btn primary" id="invshare">✉️ Share invite</button></div></section>`;
function bindInvite() {
  const url = location.origin + '/';
  const copy = async () => { try { await navigator.clipboard.writeText(INVITE + ' ' + url); msg('Copied. Paste it in your group chat.'); } catch (_) { msg('Copy this link: ' + url); } };
  $('#invcopy').onclick = copy;
  $('#invshare').onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Dungeon Tracker', text: INVITE, url }); } catch (_) {} } else copy();
  };
}

// "Continue with …": the last sheet opened on this device, if it's still in one of your lists
// sits in that character's row, on the right: 🎲 Continue →
function lastSheetId() { try { const l = JSON.parse(localStorage.getItem('last-sheet')); return l && l.id; } catch (_) { return null; } }

// a sheet's address: /<username>/<D&D Beyond id>
const sheetLink = c => '/' + c.handle + '/' + c.ddb_id;

// Your username: it's in every sheet link. New accounts get player-xxxxx; the card sits on top until it's changed.
function nameCard(me) {
  const auto = /^player-[a-z0-9]{5}$/.test(me.username || '');
  return `<form id="uname" class="card"><h2>Your username</h2>
      <p class="small muted">Your sheet links look like <code>${esc(location.host)}/<b id="unpv">${esc(me.username || 'name')}</b>/123456789</code>${auto ? ' — pick your own before you share any.' : '. Changing it changes those links.'}</p>
      <div class="row"><input name="u" value="${esc(me.username || '')}" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="20" pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]{1,18}[a-zA-Z0-9]" aria-label="Username" required>
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
// 👁 show/hide on every password field on screen (added once per field)
function peek() {
  document.querySelectorAll('input[type=password]:not([data-peek])').forEach(inp => {
    inp.dataset.peek = '1'; const w = document.createElement('span'); w.className = 'pwwrap'; inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pwpeek'; b.setAttribute('aria-label', 'Show password'); b.textContent = '👁';
    b.onclick = () => { const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.classList.toggle('on', show); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); };
    w.appendChild(b);
  });
}
new MutationObserver(() => peek()).observe(document.getElementById('main'), { childList: true, subtree: true });
// No password yet (the account came from an emailed code): suggest saving one, so next time signing in is instant and
// doesn't use an email. Right after a code sign-in it's one field; later the Sign-in & security flow (with a code) does it.
function pwPrompt(me) {
  let skip = false; try { skip = !!localStorage.getItem('pw-later-' + me.id); } catch (_) {}
  if (me.pw_set || skip) return;
  const card = document.createElement('section'); card.className = 'card pwprompt';
  card.innerHTML = `<h2>🔑 Save a password for next time</h2>
    <p class="small muted">Sign in straight away next time, without waiting for an email. You can still use emailed codes too.</p>
    <div class="pwpair"><input id="firstpw" type="password" autocomplete="new-password" minlength="8" placeholder="New password (at least 8 characters)" aria-label="New password">
      <input id="firstpw2" type="password" autocomplete="new-password" minlength="8" placeholder="The same password again" aria-label="Repeat the password"></div>
    <div class="row authsub saverow"><button class="btn" type="button" id="firstpwno">Not now</button>
<button class="btn primary" type="button" id="firstpwok">Save password ✓</button></div>`;
  const list = $('#mine') && $('#mine').closest('section'); (list ? list.parentNode.insertBefore(card, list) : $('#main').prepend(card));
  $('#firstpwno').onclick = () => { try { localStorage.setItem('pw-later-' + me.id, '1'); } catch (_) {} card.remove(); };
  $('#firstpwok').onclick = async () => {
    const pw = $('#firstpw').value; if (pw.length < 8) return msg('Passwords are at least 8 characters.', true);
    if ($('#firstpw2').value !== pw) return msg('The two passwords aren’t the same.', true);
    try { const r = await pb.send('/api/account/first-password', { method: 'POST', body: { password: pw } });
      pb.authStore.save(r.token, Object.assign({}, r.record, { email: r.email })); pwRemember(r.email); card.remove();
      done('Password saved', 'Next time, sign in with your email and this password.'); }
    catch (e) { const t = (e && e.response && e.response.message) || '';
      if (t === 'fresh-code-needed') { card.remove(); $('#secpw').click(); $('#secpw').scrollIntoView({ block: 'center' }); msg('For safety we email you a code first. Press “Email me a code”.'); }
      else msg(t || 'Couldn’t save that. Try again.', true); }
  };
}
// Theme: the same five looks and light/dark as ☰ → Theme on a sheet (web/sw-register.js: window.Skin), saved on this device
const looksCard = () => `<section class="card looks"><h2>Theme</h2><p class="small muted">How Dungeon Tracker and your sheets look on this device.</p><div id="looks"></div></section>`;
function bindLooks() {
  const K = window.Skin, box = $('#looks'); if (!K || !box) return;
  const ML = { auto: '🖥️ Auto', light: '☀️ Light', dark: '🌙 Dark' };
  const paint = () => { const cur = K.skin(), mode = K.mode();
    box.innerHTML = '<div class="skingrid">' + K.list.map(([k, n, e, dk, ac, lt]) => `<button type="button" class="skinopt${k === cur ? ' on' : ''}" data-skin="${k}" aria-pressed="${k === cur}"><span class="skinsw" style="background:linear-gradient(135deg,${lt} 0 50%,${dk} 50% 100%)"><span style="background:${ac}"></span></span><span class="skinn">${e} ${esc(n)}</span></button>`).join('') + '</div>'
      + '<div class="skinmode" role="group" aria-label="Light or dark">' + Object.entries(ML).map(([m, t]) => `<button type="button" data-mode="${m}" aria-pressed="${m === mode}">${t}</button>`).join('') + '</div>';
    box.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { K.set(b.dataset.skin, K.mode()); paint(); });
    box.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { K.set(K.skin(), b.dataset.mode); paint(); }); };
  paint();
}
// Sign-in & security: change your email or set/change your password. Both confirm with a 6-digit code
// (server/pb_hooks/account.pb.js): for a password it goes to your email, for a new email to the new address.
const secCard = me => `<section class="card sec"><h2>Sign-in &amp; security</h2>
    <div class="secrow"><div><b>Email</b><span class="small muted" id="secemail">${esc(me.email || '')}</span></div><button class="btn xbtn" type="button" id="secem" aria-expanded="false">Change email <span class="xchev" aria-hidden="true"></span></button></div>
    <div class="secbox" id="secembox" hidden></div>
    <div class="secrow"><div><b>Password</b><span class="small muted">Optional: you can always sign in with an emailed code.</span></div><button class="btn xbtn" type="button" id="secpw" aria-expanded="false">Set or change password <span class="xchev" aria-hidden="true"></span></button></div>
    <div class="secbox" id="secpwbox" hidden></div></section>`;
function bindSec() {
  const api = (path, body) => pb.send('/api/account/' + path, { method: 'POST', body });
  const err = e => (e && e.response && e.response.message) || (e && e.message) || 'That didn’t work. Try again.';
  const toggle = (box, html, other) => { $(other).hidden = true; const b = $(box); b.hidden = !b.hidden; if (!b.hidden) b.innerHTML = html;
    $('#secem').setAttribute('aria-expanded', String(!$('#secembox').hidden)); $('#secpw').setAttribute('aria-expanded', String(!$('#secpwbox').hidden)); return !b.hidden; };
  $('#secem').onclick = () => {
    if (!toggle('#secembox', `<label class="authlbl" for="newemail">New email</label><div class="authrow"><input id="newemail" type="email" autocomplete="email" placeholder="you@example.com"><button class="btn primary" type="button" id="emsend">Send a code</button></div>
      <p class="small muted">We send a 6-digit code to the new address to check it’s yours.</p><div id="emstep2"></div>`, '#secpwbox')) return;
    $('#emsend').onclick = async () => {
      const email = $('#newemail').value.trim(); if (!email) return msg('Type the new email first.', true);
      try { await api('code', { purpose: 'email', email }); msg('Code sent to ' + email + '.');
        $('#emstep2').innerHTML = `<div class="authrow"><input id="emcode" class="codein" inputmode="numeric" maxlength="6" placeholder="123456" aria-label="Code"><button class="btn primary" type="button" id="emok">Change email</button></div>`;
        $('#emcode').focus();
        $('#emok').onclick = async () => {
          try { const r = await api('confirm', { code: $('#emcode').value }); if (r.token) pb.authStore.save(r.token, Object.assign({}, r.record, { email: r.email }));
            $('#secemail').textContent = r.email; $('#secembox').hidden = true; $('#secem').setAttribute('aria-expanded', 'false'); done('Email changed', 'You now sign in with ' + r.email + '.'); }
          catch (e) { msg(err(e), true); } };
      } catch (e) { msg(err(e), true); }
    };
  };
  $('#secpw').onclick = () => {
    if (!toggle('#secpwbox', `<p class="small muted">First we email you a code, to check it’s you.</p><button class="btn primary" type="button" id="pwsend">Email me a code</button><div id="pwstep2"></div>`, '#secembox')) return;
    $('#pwsend').onclick = async () => {
      try { const r = await api('code', { purpose: 'password' }); msg('Code sent to ' + r.sent + '.'); $('#pwsend').hidden = true;
        $('#pwstep2').innerHTML = `<label class="authlbl" for="pwcode">Code</label><input id="pwcode" class="codein" inputmode="numeric" maxlength="6" placeholder="123456">
          <label class="authlbl" for="pwnew">New password</label><input id="pwnew" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters">
          <label class="authlbl" for="pwnew2">Repeat it</label><input id="pwnew2" type="password" autocomplete="new-password" minlength="8" placeholder="The same password again">
          <div class="row authsub saverow"><button class="btn primary" type="button" id="pwok">Save password ✓</button></div>`;
        $('#pwcode').focus();
        $('#pwok').onclick = async () => {
          const pw = $('#pwnew').value; if (pw.length < 8) return msg('Passwords are at least 8 characters.', true);
          if ($('#pwnew2').value !== pw) return msg('The two passwords aren’t the same.', true);
          try { const r = await api('confirm', { code: $('#pwcode').value, password: pw }); if (r.token) pb.authStore.save(r.token, Object.assign({}, r.record, { email: r.email }));
            try { localStorage.setItem('has-password-' + r.record.id, '1'); } catch (_) {}
            pwRemember(r.email); $('#secpwbox').hidden = true; $('#secpw').setAttribute('aria-expanded', 'false');
            done('Password saved', 'Sign in with it, or with an emailed code.'); }
          catch (e) { msg(err(e), true); } };
      } catch (e) { msg(err(e), true); }
    };
  };
}
const dataCard = () => `<section class="card"><h2>Your data</h2>
    <p class="small muted">Everything this app keeps about you, stored in the EU.</p>
    <div class="row"><button class="btn" id="export">⬇️ Download my data</button></div></section>
  <section class="card dangerzone"><h2>The danger zone</h2>
    <p class="small muted">Deleting your account removes your characters, trackers and notes for good. Download your data first if you want a copy.</p>
    <div class="row"><button class="btn danger xbtn" id="delacct" aria-expanded="false">Delete my account <span class="xchev" aria-hidden="true"></span></button></div>
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
// delete: say exactly what goes, ask for the username typed out (with or without quotes), then one last yes/no
function askDelete() {
  const me = pb.authStore.record, box = $('#delbox'); box.hidden = false; $('#delacct').setAttribute('aria-expanded', 'true');
  box.innerHTML = `<div class="claim delclaim"><p><b>Delete your account?</b> Your account, all your characters, trackers and notes (party log posts too)
      are deleted straight away and leave the backups within 15 days. This can’t be undone. Your D&amp;D Beyond characters aren’t touched.</p>
    <p class="delask"><label for="delname">Type your username, “<b>${esc(me.username)}</b>”, to confirm.</label></p>
    <input id="delname" autocomplete="off" autocapitalize="none" spellcheck="false">
    <div class="row"><button class="btn danger" id="delgo">Delete everything</button><button class="btn" id="delno">Keep my account</button></div></div>`;
  $('#delno').onclick = () => { box.hidden = true; $('#delacct').setAttribute('aria-expanded', 'false'); };
  $('#delgo').onclick = () => {
    const typed = $('#delname').value.trim().toLowerCase().replace(/^["“”'‘’]+|["“”'‘’]+$/g, '');
    if (typed !== me.username) return msg('That’s not your username.', true);
    msg('');
    box.innerHTML = `<div class="claim delclaim dellast"><p><b>Last check.</b> Delete <b>@${esc(me.username)}</b> and everything in it, for good?</p>
      <div class="row"><button class="btn danger solid" id="delyes">Yes, delete forever</button><button class="btn" id="delno2">No, keep my account</button></div></div>`;
    $('#delno2').onclick = () => { box.hidden = true; $('#delacct').setAttribute('aria-expanded', 'false'); };
    $('#delyes').onclick = async () => {
      try { await pb.collection('users').delete(me.id); signOut(); msg('Your account and everything in it are deleted.'); }
      catch (e) { msg('Couldn’t delete the account. Try again, or email the contact on the Privacy & terms page.', true); }
    };
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
  const lastId = lastSheetId();
  const card = c => {
    const cont = c.id === lastId && !c.archived ? `<a class="btn primary small contbtn" href="${esc(sheetLink(c))}" title="Open ${esc(c.name || 'this character')} again"><svg class="d20i" aria-hidden="true" viewBox="0 0 100 100"><use href="#d20"/></svg> Continue <span aria-hidden="true">→</span></a>` : '';
    const d = c.data || {}, cls = (d.classes || []).map(k => k.name + ' ' + k.level).join(' / ');
    const camp = d.campaign && d.campaign.name ? d.campaign.name : '';
    const own = c.owner === me;
    const tools = own ? `<button class="chstar${c.pinned ? ' on' : ''}" data-pin="${esc(c.id)}" aria-pressed="${!!c.pinned}" title="${c.pinned ? 'Playing now' : 'Mark as playing now'}" aria-label="${c.pinned ? 'Playing now: tap to unmark' : 'Mark as playing now'}">${c.pinned ? '★' : '☆'}</button>` : '';
    const more = own ? `<details class="chmore"><summary aria-label="More for ${esc(c.name || 'this character')}">⋯</summary><div class="chmenu">
        ${c.archived ? '' : `<button class="btn small" data-move="${esc(c.id)}" data-d="-1">↑ Move up</button><button class="btn small" data-move="${esc(c.id)}" data-d="1">↓ Move down</button>`}
        <button class="btn small" data-arch="${esc(c.id)}">${c.archived ? '↩︎ Unarchive' : '🗄️ Archive'}</button>
        <button class="btn small danger" data-rm="${esc(c.id)}">Remove…</button></div></details>` : '';
    return `<div class="ch${c.archived ? ' archived' : ''}${cont ? ' chlast' : ''}">${tools}<a class="open" href="${esc(sheetLink(c))}"><b>${esc(c.name || 'Character')}${own && c.verified ? '<span class="vtick" tabindex="0" aria-label="Verified" data-tip="Verified: you proved this is your D&amp;D Beyond character, so you can share it with your party.">✓</span>' : ''}</b>
        <span class="small muted">${esc([d.race && d.race.name, cls].filter(Boolean).join(' · ') || 'Not synced yet')}${camp ? ' · ' + esc(camp) : ''}${!own && c.handle ? ' · @' + esc(c.handle) : ''}</span></a>
      ${own ? `<div class="chctl">${c.verified ? '' : `<button class="btn small" data-claim="${esc(c.id)}">Verify</button>`}
        <select data-vis="${esc(c.id)}" aria-label="Who can see the tracker">${Object.entries(VIS).map(([k, t]) => `<option value="${k}"${c.visibility === k ? ' selected' : ''}${k === 'party' && !c.verified ? ' disabled' : ''}>${t}${k === 'party' && !c.verified ? ' (verify first)' : ''}</option>`).join('')}</select></div>`
        : `<span class="small muted">${esc(VIS[c.visibility] || '')}</span>`}${more}${cont}</div>
      <div class="claim" id="claim-${esc(c.id)}" hidden></div>`;
  };
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
// a ⋯ menu closes when you tap anywhere outside it (or open another one)
document.addEventListener('click', e => { document.querySelectorAll('details.chmore[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
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
    msg(t.includes('D&D Beyond') ? t : 'Couldn’t add it. Is the character public on D&D Beyond? (Manage → Character Settings → Character Privacy → Public)', true);
  }
}

// #signin in the address (a link, or Back/Forward): the sign-in card, if signed out
window.addEventListener('hashchange', () => {
  if (location.hash === '#signin' && !pb.authStore.isValid) renderLogin('signin');
  if (location.hash === '#front' && pb.authStore.isValid) { showLanding(); window.scrollTo(0, 0); }
});

(async () => {
  // signed in (offline too: keep the saved login; the list comes from this device's last copy)
  if (pb.authStore.isValid) {
    try { await pb.collection('users').authRefresh(); if (location.hash === '#front') return showLanding(); return signedIn(); }
    catch (e) { if (!navigator.onLine || !e || !e.status) return renderHome(); pb.authStore.clear(); }
  }
  if (location.hash === '#signin' || new URLSearchParams(location.search).get('next')) return renderLogin('signin');
  showLanding();
})();
