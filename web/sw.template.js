// Offline support for the web app (service worker; built into dist/web/sw.js, registered by web/sw-register.js).
// tools/build.js (stamp) fills in FILES: [path, content hash] for every file this build may cache, with a third
// element 1 for the app shell, and VERSION, a hash of that list (each build has its own cache, "sheets-<VERSION>").
//   install:  the shell (the home page, sheet.html, their scripts, styles and the default look's fonts; the list is
//             SHELL in tools/build.js) must be saved, or the install fails and the previous version stays. Anything
//             an older cache already holds with the same hash is copied over (shell or not); only what changed or is
//             new comes from the network. Nothing optional is fetched, so a missing optional file can't break it.
//   activate: older builds' caches are deleted.
//   fetch:    pages: network first (fresh when online), the saved copy when offline; every sheet address is
//             sheet.html. Files in FILES: the saved copy if it has the content asked for (?v=<hash> on the address,
//             else this build's hash), otherwise the network, saved for next time (three.js, other looks' fonts,
//             items.json, icons and artwork are saved like this the first time they're used). Offline: any saved
//             copy. Not cached here: the API (/api/), the dashboard (/_/), the videos and anything not in FILES.
// Each saved copy carries its own content hash (header x-sw-hash, computed from what was saved, so it never lies).
// sheet-boot.js keeps its own copy of the last character data (localStorage); that's separate.
// The two placeholders on the next line are replaced by exact text (first match in the file): never repeat them in
// a comment above that line, or change their spelling.
const VERSION = '__VERSION__', FILES = /*__FILES__*/[];
const CACHE = 'sheets-' + VERSION, HASH = new Map(FILES.map(f => [f[0], f[1]]));
const SHEET_PATH = /^\/(?:[a-z0-9_-]{3,20}\/)?\d{4,12}\/?$/;   // /<username>/<D&D Beyond id>: the server answers with sheet.html
const TAGGED = /^[0-9a-f]{10}$/;   // a ?v= content hash (tools/build.js); other ?v= values (the icons' ?v=4) are plain cache-busters

// ── Saved copies ───────────────────────────────────────────────────────────────────────────────────────────
// The content hash of a body: the first 10 hex digits of its sha1, the same as tools/build.js.
async function hashOf(buf) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', buf)), b => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
}
// Save response res under path key in cache c, with its content hash in x-sw-hash. Only whole, same-site answers.
async function keep(c, key, res) {
  if (res.status !== 200 || res.type !== 'basic') return;
  const buf = await res.arrayBuffer(), headers = new Headers(res.headers);
  headers.set('x-sw-hash', await hashOf(buf));
  await c.put(key, new Response(buf, { status: 200, statusText: res.statusText, headers }));
}
// Hand res to the page and save a copy under key while the fetch event e lasts. The copy is taken now: once the page
// starts reading res, it can't be cloned any more.
function later(e, key, res) {
  const copy = res.clone();
  e.waitUntil(caches.open(CACHE).then(c => keep(c, key, copy)).catch(() => {}));
  return res;
}
// This build's saved copy of key if its content hash is want (null otherwise).
async function saved(key, want) {
  const hit = await (await caches.open(CACHE)).match(key);
  return hit && hit.headers.get('x-sw-hash') === want ? hit : null;
}
// Any saved copy of key, this build's first, whatever its content (offline).
async function anyCopy(key) {
  return (await (await caches.open(CACHE)).match(key)) || caches.match(key);
}

// ── Install, activate ──────────────────────────────────────────────────────────────────────────────────────
// install: copy what older caches hold unchanged, fetch the rest of the shell, and take over without waiting for old
// tabs to close.
self.addEventListener('install', e => { e.waitUntil(install().then(() => self.skipWaiting())); });
// Fill this build's cache: every file of FILES an older "sheets-" cache holds with the same hash is copied (a failed
// copy is just skipped), then each shell file still missing is fetched at its content-hash address. One failed
// shell file fails the install.
async function install() {
  const c = await caches.open(CACHE), olds = await Promise.all((await caches.keys()).filter(k => k.startsWith('sheets-') && k !== CACHE).map(k => caches.open(k)));
  const have = new Set();
  await Promise.all(FILES.map(async ([key, hash]) => {
    try {
      if ((await c.match(key) || { headers: new Headers() }).headers.get('x-sw-hash') === hash) return have.add(key);   // an earlier try of this install
      for (const o of olds) { const hit = await o.match(key); if (hit && hit.headers.get('x-sw-hash') === hash) { await c.put(key, hit); return have.add(key); } }
    } catch (_) {}
  }));
  await Promise.all(FILES.filter(f => f[2] && !have.has(f[0])).map(async ([key, hash]) => {
    const res = await fetch(key + '?v=' + hash);
    if (!res.ok) throw new Error('offline copy: ' + key + ' answered ' + res.status);
    await keep(c, key, res);
  }));
}
// activate: delete older builds' caches and control the open pages
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sheets-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

// ── Fetch ──────────────────────────────────────────────────────────────────────
// Only GETs to this site, outside /api/ and /_/ (the PocketBase dashboard). Other sites (the D&D Beyond
// portraits in the crest and the character lists) are left to the browser and its own cache.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/_/')) return;
  // pages: network first, saved for next time; offline, the saved page or else the home page
  if (r.mode === 'navigate') {
    const key = SHEET_PATH.test(u.pathname) ? '/sheet.html' : u.pathname === '/index.html' ? '/' : u.pathname;   // one copy per page, whatever the ?query
    e.respondWith(fetch(r).then(res => later(e, key, res))
      .catch(() => anyCopy(key).then(hit => hit || anyCopy('/'))));
    return;
  }
  // files of this build: the saved copy when it's the content asked for, else the network (saved for next time)
  const key = u.pathname, mine = HASH.get(key);
  if (!mine || r.headers.has('range')) return;   // not ours to cache (videos, unknown addresses), or part of a file
  const v = u.searchParams.get('v'), want = v && TAGGED.test(v) ? v : mine;
  e.respondWith(saved(key, want).then(hit => hit || fetch(r).then(res => later(e, key, res))
    .catch(() => anyCopy(key).then(hit => hit || Response.error()))));
});
