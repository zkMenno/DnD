// Offline support for the web app (service worker). tools/build.js fills in VERSION and FILES on every build, so a new
// version replaces the old cache. Pages: network first (fresh when online), the saved copy when offline. Everything else
// from this site (engine, packs, item list): the saved copy at once, refreshed in the background. The API is never cached
// here; sheet-boot.js keeps its own copy of the last character data for offline use.
const VERSION = '__VERSION__', FILES = /*__FILES__*/[];
const SHEET_PATH = /^\/(?:[a-z0-9-]{3,20}\/)?\d{4,12}\/?$/;   // /<username>/<D&D Beyond id>: the server answers with sheet.html
const CACHE = 'sheets-' + VERSION;   // fonts are self-hosted (/fonts), so they're in FILES like everything else
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sheets-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/_/')) return;
  if (u.pathname.startsWith('/media/')) return;   // the front page's demo videos: streamed (range requests), never cached here
  const key = SHEET_PATH.test(u.pathname) ? new Request(u.origin + '/sheet.html')                     // every sheet address is one page
    : u.pathname.endsWith('.html') || u.pathname.endsWith('/') ? new Request(u.origin + u.pathname) : r;   // pages: one copy, whatever the ?query
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(key, res.clone())); return res; })
      .catch(() => caches.match(key).then(hit => hit || caches.match(new Request(u.origin + '/index.html')))));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
      .catch(() => hit || caches.match(r, { ignoreSearch: true }));   // offline: the saved copy, whatever its ?v= build tag
    return hit || net;
  }));
});
