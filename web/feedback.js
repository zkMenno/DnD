// ── Feedback: report a bug, share an idea ──────────────────────────────────────────────────────────────────
// Loaded on every web app page (the shared <head> that tools/build.js writes). Any element with data-feedback opens
// a small dialog (🐞 Bug · 💡 Idea · 💬 Other, a text box, an optional reply email when signed out, and a tick box for
// page + device details). It posts straight to the PocketBase "feedback" collection
// (server/pb_migrations/1761800000_feedback.js): anyone may create, only the superuser can read.
// Defines window.openFeedback(kind); the engine's ☰ menu (src/engine/18 + 20) calls it too. Reads the PocketBase
// sign-in from localStorage, so it needs no PocketBase SDK and works on the sheet pages as well.
// No inline scripts or handlers (CSP); styles live in /feedback.css, added the first time the dialog opens.
(function () {
  // the three kinds: [value, emoji, label]
  const KINDS = [['bug', '🐞', 'Bug'], ['idea', '💡', 'Idea'], ['other', '💬', 'Other']];
  // the signed-in player's token and id, if any (PocketBase keeps them in localStorage under pocketbase_auth)
  const auth = () => { try { const a = JSON.parse(localStorage.getItem('pocketbase_auth') || 'null'); return a && a.token && a.record ? a : null; } catch (_) { return null; } };
  // feedback.css's content hash (?v=), filled in by tools/build.js (the same map as in web/sheet-boot.js)
  const ASSET_V = /*__ASSET_V__*/{}, V = ASSET_V['/feedback.css'] || '';
  // adds the dialog's stylesheet once, at its content-hash address
  const css = () => { if (document.getElementById('fbcss')) return;
    const l = document.createElement('link'); l.id = 'fbcss'; l.rel = 'stylesheet'; l.href = '/feedback.css' + (V ? '?v=' + V : ''); document.head.appendChild(l); };
  // Opens the dialog; kind ('bug' | 'idea' | 'other') preselects the kind. Does nothing if it's already open.
  function openFeedback(kind) {
    css(); if (document.getElementById('fbpop')) return;
    const me = auth(), p = document.createElement('div');
    p.id = 'fbpop'; p.className = 'fbpop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-labelledby', 'fbtitle');
    p.innerHTML = `<form class="fbcard" novalidate>
      <button type="button" class="fbx" aria-label="Close">×</button>
      <h2 id="fbtitle">Feedback</h2>
      <p class="fbsub">Found a bug, or have an idea? Tell Menno, who builds Dungeon Tracker. Every message gets read.</p>
      <div class="fbkinds" role="radiogroup" aria-label="What is it?">${KINDS.map(([k, e, t]) => `<button type="button" role="radio" data-kind="${k}" aria-checked="${k === (kind || 'bug')}"><span aria-hidden="true">${e}</span> ${t}</button>`).join('')}</div>
      <label class="fblbl" for="fbtext">What happened, or what would you like?</label>
      <textarea id="fbtext" rows="5" maxlength="4000" placeholder="For a bug: what you did, what you expected, what happened instead."></textarea>
      ${me ? '' : '<label class="fblbl" for="fbmail">Your email <span>(optional, if you’d like a reply)</span></label><input id="fbmail" type="email" autocomplete="email" placeholder="you@example.com">'}
      <label class="fbtick"><input type="checkbox" id="fbdev" checked> Include this page and my browser and screen size (helps with bugs)</label>
      <p class="fberr" role="alert" hidden></p>
      <div class="fbrow"><button type="button" class="btn fbcancel">Cancel</button><button type="submit" class="btn primary fbsend">Send <span aria-hidden="true">→</span></button></div>
    </form>`;
    // closes with a fade, then removes the dialog and its Escape listener
    const close = () => { p.classList.remove('show'); setTimeout(() => p.remove(), 200); document.removeEventListener('keydown', key); };
    // Escape closes
    const key = e => { if (e.key === 'Escape') close(); };
    // shows an error line under the form (empty text hides it)
    const err = t => { const e = p.querySelector('.fberr'); e.textContent = t || ''; e.hidden = !t; };
    // clicks: the backdrop, × or Cancel close; a kind button becomes the checked one
    p.addEventListener('click', e => {
      if (e.target === p || e.target.closest('.fbx,.fbcancel')) return close();
      const k = e.target.closest('[data-kind]'); if (k) p.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-checked', String(b === k)));
    });
    // Sends it: the text is required; page and device only when ticked; a signed-in player is the author.
    // On success the card turns into a thank-you; on failure the button comes back with a reason (rate limit, offline).
    p.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const text = p.querySelector('#fbtext').value.trim(), mail = p.querySelector('#fbmail'), dev = p.querySelector('#fbdev').checked;
      if (text.length < 3) { p.querySelector('#fbtext').focus(); return err('Write a few words first.'); }
      if (mail && mail.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim())) { mail.focus(); return err('That email doesn’t look right (or leave it empty).'); }
      const body = { kind: (p.querySelector('[data-kind][aria-checked="true"]') || {}).dataset.kind || 'other', text,
        contact: mail ? mail.value.trim() : '', page: dev ? location.pathname.slice(0, 300) : '',
        device: dev ? (navigator.userAgent.slice(0, 220) + ' · ' + innerWidth + '×' + innerHeight + ' · ' + (document.documentElement.getAttribute('data-skin') || 'pirate')).slice(0, 300) : '',
        author: me ? me.record.id : '' };
      const send = p.querySelector('.fbsend'); send.disabled = true; err('');
      try {
        const r = await fetch('/api/collections/feedback/records', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, me ? { Authorization: me.token } : {}), body: JSON.stringify(body) });
        if (r.status === 429) throw new Error('That’s a lot of messages in a short time. Try again in a few minutes.');
        if (!r.ok) throw new Error(navigator.onLine ? 'Couldn’t send that. Try again in a moment.' : 'You’re offline. Try again when you’re back online.');
        p.querySelector('.fbcard').innerHTML = '<span class="fbtick-big" aria-hidden="true">✓</span><h2>Thank you!</h2><p class="fbsub">Your message is in. ' + (body.contact || me ? 'If a reply helps, you’ll get one by email.' : '') + '</p><div class="fbrow"><button type="button" class="btn primary fbx2">Close</button></div>';
        p.querySelector('.fbx2').addEventListener('click', close); p.querySelector('.fbx2').focus();
      } catch (x) { send.disabled = false; err(x.message); }
    });
    document.addEventListener('keydown', key); document.body.appendChild(p);
    requestAnimationFrame(() => p.classList.add('show')); setTimeout(() => p.querySelector('#fbtext').focus(), 50);
  }
  window.openFeedback = openFeedback;
  // any [data-feedback] link or button opens it, with its value as the kind (footer, Account tab)
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-feedback]'); if (t) { e.preventDefault(); openFeedback(t.dataset.feedback || 'bug'); } });
})();
