// Theme (☰ → Theme, or Account): which look (data-skin: fantasy, space, woodland, gothic, underdark, icewind, avernus; none = pirate) and light/dark
// (data-theme; none = follow the device). Set here, in the page head, so the first paint already has the right colours.
(function () {
  const d = document.documentElement, get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  // [key, name, emoji, swatch: dark background, accent, light background]
  const SKINS = [['pirate', 'Pirate', '🏴‍☠️', '#0C141C', '#E2B04A', '#ECE2CC'], ['fantasy', 'Dragon Keep', '🏰', '#171B36', '#E9C766', '#F1EBDD'],
    ['space', 'Starfarer', '🚀', '#0D1424', '#4FE0EE', '#E9EEF5'], ['woodland', 'Feywild', '🍃', '#132119', '#DCB867', '#E6ECD8'], ['gothic', 'Ravenloft', '🦇', '#161118', '#D9B26A', '#E9E4E2'],
    ['underdark', 'Underdark', '🍄', '#0A0710', '#5EF0D2', '#E8E3EE'], ['icewind', 'Icewind', '❄️', '#08111A', '#9EDBFF', '#E8EFF3'], ['avernus', 'Avernus', '🔥', '#120806', '#FFB347', '#F0E4DA']];
  // The front page (the one visitors see first) always wears the pirate look; only light/dark follows the choice.
  // index.js calls Skin.front(true/false) when it shows or leaves it; here we guess for the first paint.
  let front = location.pathname === '/' && (location.hash === '#front' || !get('pocketbase_auth'));
  let cur = get('dt-skin');
  const apply = (s, m) => {
    cur = s;
    if (s && s !== 'pirate' && !front) d.setAttribute('data-skin', s); else d.removeAttribute('data-skin');
    if (m === 'light' || m === 'dark') d.setAttribute('data-theme', m); else d.removeAttribute('data-theme');
  };
  apply(get('dt-skin'), get('dt-mode'));
  window.Skin = {
    list: SKINS,
    skin: () => cur || 'pirate',
    front(on) { if (front === !!on) return; front = !!on; apply(cur, get('dt-mode')); },
    mode: () => d.getAttribute('data-theme') || 'auto',
    set(s, m) { try { localStorage.setItem('dt-skin', s); localStorage.setItem('dt-mode', m); } catch (_) {} apply(s, m); },
  };
})();
// Offline support: register the service worker (dist/web/sw.js, built from web/sw.template.js).
// A file of its own because the Content-Security-Policy allows no inline scripts.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// On staging.dungeontracker.com (the test copy), a small fixed STAGING badge on every page, so it's never mistaken for live.
if (/^staging\./.test(location.hostname)) addEventListener('DOMContentLoaded', () => {
  const b = document.createElement('div'); b.textContent = 'STAGING'; b.setAttribute('aria-hidden', 'true');
  b.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9999;pointer-events:none;padding:4px 10px;border-radius:999px;'
    + 'background:#c2410c;color:#fff;font:700 12px/1.4 system-ui,sans-serif;letter-spacing:.12em;box-shadow:0 2px 10px rgba(0,0,0,.4);opacity:.92';
  document.body.appendChild(b);
});
