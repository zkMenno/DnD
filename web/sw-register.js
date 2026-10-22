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
