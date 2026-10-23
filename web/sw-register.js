// Loaded in the <head> of every web app page (tools/build.js), before anything is drawn. Three jobs:
//   theme:   sets <html data-skin> and <html data-theme> from this device's choice, so the first paint already has the
//            right colours, and exposes window.Skin for ☰ → Theme (engine) and the Account screen (web/index.js)
//   offline: registers the service worker (/sw.js, built from web/sw.template.js)
//   staging: a Staging bar on top of every page of staging.dungeontracker.com
// A file of its own because the Content-Security-Policy allows no inline scripts.

// ── Theme ──────────────────────────────────────────────────────────────────────────────────────────────────
// Which look (data-skin: a key from src/looks/, none = pirate) and light/dark (data-theme; none = follow the device).
// Stored in localStorage as dt-skin and dt-mode.
(function () {
  // get: localStorage read that returns null when storage is blocked
  const d = document.documentElement, get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  // [key, name, emoji, swatch: dark background, accent, light background] per look, pirate first: filled in by
  // tools/build.js from src/looks/*.js (tools/looks.js)
  const SKINS = /*__LOOKS__*/[];
  // The front page (the one visitors see first) always wears the pirate look; only light/dark follows the choice.
  // index.js calls Skin.front(true/false) when it shows or leaves it; here we guess for the first paint.
  let front = location.pathname === '/' && (location.hash === '#front' || !get('pocketbase_auth'));
  let cur = get('dt-skin');
  // Apply skin s and mode m ('light', 'dark', anything else = auto) to <html>. The front page keeps the pirate look.
  const apply = (s, m) => {
    cur = s;
    if (s && s !== 'pirate' && !front) d.setAttribute('data-skin', s); else d.removeAttribute('data-skin');
    if (m === 'light' || m === 'dark') d.setAttribute('data-theme', m); else d.removeAttribute('data-theme');
  };
  apply(get('dt-skin'), get('dt-mode'));
  // list: the skins for the picker; skin()/mode(): the current choice; front(on): entering/leaving the front page;
  // set(s, m): save a new choice and apply it
  window.Skin = {
    list: SKINS,
    skin: () => cur || 'pirate',
    front(on) { if (front === !!on) return; front = !!on; apply(cur, get('dt-mode')); },
    mode: () => d.getAttribute('data-theme') || 'auto',
    set(s, m) { try { localStorage.setItem('dt-skin', s); localStorage.setItem('dt-mode', m); } catch (_) {} apply(s, m); },
  };
})();
// ── Page titles ────────────────────────────────────────────────────────────────────────────────────────────
// Every page's browser-tab title follows one pattern: "<what this page is> - Dungeon Tracker" (the front page alone
// leads with the name and the one-line pitch). Pages call pageTitle() instead of setting document.title by hand;
// tools/build.js uses the same pattern (TITLE) for the titles written into the built pages.
//   pageTitle("Sign In") → "Sign In - Dungeon Tracker"; pageTitle() → the front page's title.
// Also used for possessives: possessive("Henry Gibbs") → "Henry Gibbs's".
window.possessive = n => String(n || '') + "'s";
window.pageTitle = what => { document.title = what ? what + ' - Dungeon Tracker' : 'Dungeon Tracker: the easiest way to role-play your D&D Beyond character'; };
// ── Offline ────────────────────────────────────────────────────────────────────────────────────────────────
// Register the service worker (dist/web/sw.js, built from web/sw.template.js). Failing is fine: the site just has no
// offline copy.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// ── Staging bar ────────────────────────────────────────────────────────────────────────────────────────────
// On staging.dungeontracker.com (the test copy), a bar at the very top of every page, so it's never mistaken for
// live. It lines up with the page header's content (same left and right edges as the logo row), measured from the
// header itself because the home page and the sheets have different widths; re-measured when the window resizes.
if (/^staging\./.test(location.hostname)) addEventListener('DOMContentLoaded', () => {
  const b = document.createElement('div'); b.className = 'stagebar'; b.setAttribute('role', 'note');
  b.innerHTML = '<b style="flex:none">🧪 Staging</b><span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Test copy · data may be wiped</span>';
  b.style.cssText = 'display:flex;gap:10px;align-items:baseline;box-sizing:border-box;margin-top:10px;padding:8px 14px;border-radius:12px;'
    + 'background:#c2410c;color:#fff;font:500 14px/1.4 system-ui,sans-serif;position:relative;z-index:30';
  document.body.insertBefore(b, document.body.firstChild);
  // line the bar up with the header's content box
  const fit = () => {
    const h = document.querySelector('.top .wrap') || document.querySelector('header.top') || document.querySelector('.top');
    if (!h) { b.style.margin = '10px 16px 0'; return; }
    const r = h.getBoundingClientRect(), cs = getComputedStyle(h), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
    b.style.marginLeft = (r.left + pl) + 'px'; b.style.width = Math.max(0, r.width - pl - pr) + 'px';
  };
  fit(); addEventListener('resize', fit); setTimeout(fit, 600);
});
