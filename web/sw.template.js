// Offline support for the web app (service worker; built into dist/web/sw.js, registered by web/sw-register.js).
// tools/build.js fills in VERSION (a hash of the build) and FILES (every file to pre-cache) on every build, so a new
// version replaces the old cache. Pages: network first (fresh when online), the saved copy when offline. Everything
// else from this site (engine, packs, item list): the saved copy at once, refreshed in the background. The API, the
// dashboard and the demo videos are never cached here; sheet-boot.js keeps its own copy of the last character data.
// The two placeholders on the next line are replaced by exact text (first match in the file): never repeat them in
// a comment above that line, or change their spelling.
const VERSION = '__VERSION__', FILES = /*__FILES__*/[];
const SHEET_PATH = /^\/(?:[a-z0-9_-]{3,20}\/)?\d{4,12}\/?$/;   // /<username>/<D&D Beyond id>: the server answers with sheet.html
const CACHE = 'sheets-' + VERSION;   // fonts are self-hosted (/fonts), so they're in FILES like everything else
// install: pre-cache every file of this build, and take over without waiting for old tabs to close
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
// activate: delete older builds' caches and control the open pages
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sheets-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// fetch: only GETs to this site, outside /api/ and /_/ (the PocketBase dashboard)
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/_/')) return;
  if (u.pathname.startsWith('/media/')) return;   // the front page's demo videos: streamed (range requests), never cached here
  const key = SHEET_PATH.test(u.pathname) ? new Request(u.origin + '/sheet.html')                     // every sheet address is one page
    : u.pathname.endsWith('.html') || u.pathname.endsWith('/') ? new Request(u.origin + u.pathname) : r;   // pages: one copy, whatever the ?query
  // pages: network first, saved for next time; offline, the saved page or else the home page
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(key, res.clone())); return res; })
      .catch(() => caches.match(key).then(hit => hit || caches.match(new Request(u.origin + '/index.html')))));
    return;
  }
  // everything else: the saved copy at once if there is one, while the network refreshes it
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
      .catch(() => hit || caches.match(r, { ignoreSearch: true }));   // offline: the saved copy, whatever its ?v= build tag
    return hit || net;
  }));
});
