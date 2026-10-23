// Site admin tab (home page → 🛡️ Site admin), for the site owner only. web/index.js adds the tab when
// GET /api/admin/me says this account is an admin, then loads this file and calls SiteAdmin.mount(el, pb).
// Locked until an emailed 6-digit code: /api/admin/code sends it, /api/admin/unlock swaps it for a 30-minute token
// (server/pb_hooks/admin.pb.js). The token is kept in sessionStorage (this tab of the browser only) and sent as
// X-Admin-Token. Unlocked, the tab shows: recording links for the try-out characters, site numbers, the feedback
// inbox, and links to the dashboard, staging and the deploys.
// No inline scripts or handlers (CSP): everything is bound here. Styles: web/admin.css.
(() => {
  const KEY = 'dt-admin';
  // ── Small helpers ──────────────────────────────────────────────────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // the saved unlock {token, until}, or null when missing or past its time
  const saved = () => { try { const t = JSON.parse(sessionStorage.getItem(KEY)); return t && t.until > Date.now() ? t : null; } catch (_) { return null; } };
  const keep = t => { try { t ? sessionStorage.setItem(KEY, JSON.stringify(t)) : sessionStorage.removeItem(KEY); } catch (_) {} };
  // "23 Oct, 14:05"
  const when = iso => { const d = new Date(String(iso).replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  // The try-out characters, with what each shows off best (for the front-page videos)
  const TRIALS = [
    { c: 'brute', name: 'Torgan Ironvow', what: 'Goliath Barbarian / Paladin: Rage, attacks, crits, Divine Smite, HP and rests' },
    { c: 'mage', name: 'Vexa Emberscale', what: 'Warlock: spells, slots, Eldritch Blast, concentration, initiative' }];

  function mount(el, pb){
    // a request to an admin route with the unlock token; a 403 locks the tab again
    const api = async (path, opt) => {
      const t = saved(); opt = Object.assign({ method: 'GET' }, opt || {});
      opt.headers = Object.assign({}, opt.headers, t ? { 'X-Admin-Token': t.token } : {});
      try { return await pb.send(path, opt); }
      catch (e) { if (e && e.status === 403) { keep(null); paint(); } throw e; }
    };

    // ── Locked: ask for a code, then unlock ─────────────────────────────────────────────────────────────────
    function paintLocked(sent, err){
      el.innerHTML = '<section class="card admlock"><h2><span class="emo" aria-hidden="true">🛡️</span>Site admin</h2>'
        + '<p>This tab is locked. A code goes to your account’s email; it opens the tab for 30 minutes on this browser tab.</p>'
        + (sent ? '<form class="admcode"><label class="eyebrow" for="admcode">Code sent to ' + esc(sent) + '</label><div class="row"><input id="admcode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digits" required><button class="btn primary">Unlock</button></div></form>'
          : '<div class="row"><button class="btn primary" id="admsend" type="button">✉️ Email me a code</button></div>')
        + '<p class="small admerr" role="alert">' + esc(err || '') + '</p></section>';
      const s = el.querySelector('#admsend');
      if (s) s.onclick = async () => { s.disabled = true;
        try { const r = await pb.send('/api/admin/code', { method: 'POST' }); paintLocked(r.sent); el.querySelector('#admcode').focus(); }
        catch (e) { paintLocked(null, (e && e.message) || 'Couldn’t send the code.'); } };
      const f = el.querySelector('.admcode');
      if (f) f.onsubmit = async ev => { ev.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
        try { keep(await pb.send('/api/admin/unlock', { method: 'POST', body: { code: f.querySelector('input').value } })); paint(); }
        catch (e) { paintLocked(sent, (e && e.message) || 'That didn’t work.'); } };
    }

    // ── Unlocked: the admin cards ──────────────────────────────────────────────────────────────────────────
    async function paintOpen(){
      const t = saved(), mins = Math.max(1, Math.round((t.until - Date.now()) / 60000));
      el.innerHTML = '<section class="card admhead"><div class="cardhead"><h2><span class="emo" aria-hidden="true">🛡️</span>Site admin</h2><button class="btn small" id="admlock" type="button">🔒 Lock now</button></div>'
        + '<p class="small muted">Unlocked for about ' + mins + ' more minute' + (mins === 1 ? '' : 's') + ' on this browser tab.</p></section>'
        + recordCard() + '<section class="card"><h2><span class="emo" aria-hidden="true">📊</span>Numbers</h2><div id="admnums" class="admnums"><p class="muted">Loading…</p></div></section>'
        + '<section class="card"><h2><span class="emo" aria-hidden="true">🐞</span>Feedback</h2><div id="admfb"><p class="muted">Loading…</p></div></section>'
        + linksCard();
      el.querySelector('#admlock').onclick = async () => { try { await pb.send('/api/admin/lock', { method: 'POST' }); } catch (_) {} keep(null); paint(); };
      let o; try { o = await api('/api/admin/overview'); } catch (e) { if (saved()) el.querySelector('#admnums').innerHTML = '<p>Couldn’t load: ' + esc(e && e.message) + '</p>'; return; }
      const c = o.counts || {}, N = [['Accounts', c.users], ['Verified emails', c.verified], ['New this week', c.newUsers7d], ['Characters', c.characters],
        ['Shared with party', c.sharedParty], ['Shared with all', c.sharedAll], ['Notes', c.notes], ['Feedback', c.feedback]];
      el.querySelector('#admnums').innerHTML = N.map(([k, v]) => '<div class="admnum"><b class="num">' + (v == null ? '–' : v) + '</b><span>' + k + '</span></div>').join('');
      paintFeedback(o.feedback || []);
    }
    // the feedback inbox: newest first, each with a Done button that deletes it
    function paintFeedback(list){
      const box = el.querySelector('#admfb'); if (!box) return;
      const KIND = { bug: '🐞 Bug', idea: '💡 Idea', other: '💬 Other' };
      box.innerHTML = list.length ? list.map(f => '<article class="admfbi" data-id="' + esc(f.id) + '"><div class="admfbh"><span class="chip">' + (KIND[f.kind] || esc(f.kind)) + '</span>'
          + '<span class="small muted">' + esc(when(f.created)) + (f.by ? ' · ' + esc(f.by) : '') + (f.page ? ' · ' + esc(f.page) : '') + '</span>'
          + '<button class="btn small" type="button" data-done="' + esc(f.id) + '">✓ Done</button></div>'
          + '<p class="admfbt">' + esc(f.text) + '</p>'
          + (f.contact ? '<p class="small">Reply to: <a href="mailto:' + esc(f.contact) + '">' + esc(f.contact) + '</a></p>' : '')
          + (f.device ? '<p class="small muted">' + esc(f.device) + '</p>' : '') + '</article>').join('')
        : '<p class="muted">Inbox empty. Nothing new from players.</p>';
      box.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => { b.disabled = true;
        try { await api('/api/admin/feedback/' + encodeURIComponent(b.dataset.done), { method: 'DELETE' }); b.closest('.admfbi').remove(); if (!box.querySelector('.admfbi')) paintFeedback([]); }
        catch (_) { b.disabled = false; } });
    }
    // Recording the try-out characters for the front-page videos
    const recordCard = () => '<section class="card"><h2><span class="emo" aria-hidden="true">🎬</span>Record the try-out characters</h2>'
      + '<p>Recording mode opens a try-out sheet without the try-out bar, the 🐞 button or the dice-set offer, and with a fresh tracker (full HP, nothing spent), so every take starts the same.</p>'
      + '<div class="admrec">' + TRIALS.map(t => '<div class="admrecr"><div><b>' + esc(t.name) + '</b><span class="small muted">' + esc(t.what) + '</span></div>'
        + '<div class="row"><a class="btn primary" href="/try.html?c=' + t.c + '&amp;rec=1&amp;fresh=1" target="_blank" rel="noopener">🎬 Record</a><a class="btn" href="/try.html?c=' + t.c + '" target="_blank" rel="noopener">As visitors see it</a></div></div>').join('') + '</div>'
      + '<ul class="small admtips"><li>The front-page videos are portrait, about 545 × 910 px. In Chrome: F12 → device toolbar (Ctrl+Shift+M) → a phone like Pixel 7, then record that area.</li>'
      + '<li>Record with Win+G (Windows) or Shift+Cmd+5 (Mac); no sound needed. Keep each clip 6–12 seconds: one action, start to finish.</li>'
      + '<li>Pick the look first in ☰ → Theme; recording mode keeps your look and light/dark choice.</li>'
      + '<li>Send the clips to Claude to trim, strip audio and convert to the site’s webm/mp4/webp.</li></ul></section>';
    // Links to the tools around the site
    const linksCard = () => '<section class="card"><h2><span class="emo" aria-hidden="true">🧰</span>Tools</h2><div class="admlinks">'
      + [['/_/', '🗄️ PocketBase dashboard', 'Accounts, characters, the admin tick, mail settings'], ['https://staging.dungeontracker.com', '🧪 Staging site', 'The test copy, deployed from the staging branch'],
         ['https://github.com/zkMenno/DungeonTracker/actions', '🚀 Deploys', 'Test and deploy runs on GitHub'], ['/health', '💓 Health check', 'Answers “ok” when the server is up']]
        .map(([h, t, d]) => '<a class="admlink" href="' + h + '" target="_blank" rel="noopener"><b>' + t + '</b><span class="small muted">' + d + '</span></a>').join('') + '</div></section>';

    function paint(){ if (saved()) paintOpen(); else paintLocked(); }
    paint();
  }
  window.SiteAdmin = { mount };
})();
