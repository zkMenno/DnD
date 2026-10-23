// Try-out sheets (try.html?c=brute|mage): one of two made-up characters (data/trial-*.json, served from /trial/),
// no account needed. The engine runs exactly as on a real sheet; with no server behind it (window.claude is absent),
// the tracker and notes stay in this browser (localStorage). A bar on top says so and links to sign-up.
// Sets window.SHEET with trial: true (no sync, no party log), then loads themes → classes → the trial's pack → main.
// An unknown ?c= goes back to the home page.
// Globals: ASSET_V, withV (also window.withV), loadScript. Same build-tag scheme as web/sheet-boot.js.

// ASSET_V: path → content hash of each file loaded below (filled in by tools/build.js), so every file is the one this
// page was built with.
const ASSET_V = /*__ASSET_V__*/{};
// Add a file's content hash to its path; unchanged for a path the map doesn't know.
const withV = p => ASSET_V[p] ? p + (p.includes('?') ? '&' : '?') + 'v=' + ASSET_V[p] : p;
window.withV = withV;
// Load the trial character into the page, add the try-out bar, then the engine.
(async () => {
  const app = document.getElementById('app');
  const TRIALS = { brute: 'trial-brute', mage: 'trial-mage' };
  const q = new URLSearchParams(location.search), key = q.get('c'), T = TRIALS[key];
  if (!T) { location.replace('/'); return; }
  // Recording mode (Site admin → Record, web/admin.js): ?rec=1 leaves out the try-out bar, the feedback buttons, the
  // ↕ Sections button and the dice-set offer; &fresh=1 also forgets this character's tracker, notes and screen
  // state on this device first, so every take starts the same.
  const rec = q.get('rec') === '1';
  if (rec && q.get('fresh') === '1') { try { Object.keys(localStorage).filter(k => k.indexOf(T) >= 0).forEach(k => localStorage.removeItem(k)); } catch (_) {} }
  if (rec) document.documentElement.classList.add('rec');
  // replace the loading card with a message (HTML) and a way back
  const tfail = m => { app.innerHTML = '<div class="boot"><p>' + m + '</p><p><a href="/">← Dungeon Tracker</a></p></div>'; };
  let data;
  try { data = await (await fetch(withV('/trial/' + T + '.json'))).json(); }
  catch (_) { app.innerHTML = '<div class="boot"><p>Couldn’t load the try-out character.</p><p><a href="/">← Dungeon Tracker</a></p></div>'; return; }
  const dj = document.createElement('script');
  dj.type = 'application/json'; dj.id = T + '-data'; dj.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  document.body.appendChild(dj);
  window.pageTitle(window.possessive(data.name) + ' Character Sheet (try-out)');
  // the engine reads this like the real web app's window.SHEET; pull explains there's nothing to sync
  window.SHEET = {
    trial: true, rec, mine: true, partyLog: false, character: { id: T },
    async pull() { throw new Error('This is a try-out character. Import your own from D&amp;D Beyond to sync it.'); },
  };
  if (!rec) { const bar = document.createElement('div'); bar.className = 'trialbar wrap';
  bar.innerHTML = '<div class="trialin"><span class="trialtxt">🎲 <b>Try-out character sheet.</b> Tap around: your changes stay on this device.</span>'
    + '<span class="trialshort" title="Your changes stay on this device">🎲 <b>Try-out sheet</b></span><a class="btn" href="/#signin">Use my own character →</a></div>';
  document.body.insertBefore(bar, app); }
  // a script that doesn't load (bad connection, a deploy mid-way) or an engine that stops before drawing the sheet:
  // say so with a way out, instead of leaving "Opening your sheet…" up forever
  const stuck = () => { if (app.querySelector('.boot')) tfail('Couldn’t open the sheet. <a href="">Try again</a>'); };
  try { for (const src of ['/engine/themes.js', '/engine/classes.js', '/packs/' + T + '.js', '/engine/main.js']) await loadScript(withV(src)); }
  catch (_) { return stuck(); }
  setTimeout(stuck, 10000);
})();
// Load one script and wait for it; rejects when it fails to load.
function loadScript(src) {
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.body.appendChild(s); });
}
