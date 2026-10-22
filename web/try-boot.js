// Try-out sheets (try.html?c=brute|mage): one of two made-up characters (data/trial-*.json), no account needed.
// The engine runs exactly as on a real sheet; with no server behind it (window.claude is absent), the tracker and notes
// stay in this browser (localStorage). A bar on top says so and links to sign-up.
const BUILD_V = (() => { try { return new URL(document.currentScript.src).searchParams.get('v') || ''; } catch (_) { return ''; } })();
const withV = p => BUILD_V ? p + (p.includes('?') ? '&' : '?') + 'v=' + BUILD_V : p;
window.withV = withV;
(async () => {
  const app = document.getElementById('app');
  const TRIALS = { brute: 'trial-brute', mage: 'trial-mage' };
  const key = new URLSearchParams(location.search).get('c'), T = TRIALS[key];
  if (!T) { location.replace('/'); return; }
  let data;
  try { data = await (await fetch(withV('/trial/' + T + '.json'))).json(); }
  catch (_) { app.innerHTML = '<div class="boot"><p>Couldn’t load the try-out character.</p><p><a href="/">← Dungeon Tracker</a></p></div>'; return; }
  const dj = document.createElement('script');
  dj.type = 'application/json'; dj.id = T + '-data'; dj.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  document.body.appendChild(dj);
  document.title = data.name + ' · Try Dungeon Tracker';
  window.SHEET = {
    trial: true, mine: true, partyLog: false, character: { id: T },
    async pull() { throw new Error('This is a try-out character. Import your own from D&amp;D Beyond to sync it.'); },
  };
  const bar = document.createElement('div'); bar.className = 'trialbar wrap';
  bar.innerHTML = '<div class="trialin"><span>🎲 <b>Try-out character sheet.</b> Tap around: your changes stay on this device.</span><a class="btn" href="/#signin">Use my own character →</a></div>';
  document.body.insertBefore(bar, app);
  for (const src of ['/engine/themes.js', '/engine/classes.js', '/packs/' + T + '.js', '/engine/main.js']) await loadScript(withV(src));
})();
function loadScript(src) {
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.body.appendChild(s); });
}
