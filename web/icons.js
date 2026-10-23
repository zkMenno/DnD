// ── Icons: the app's own drawings instead of emoji ───────────────────────────────────────────────────────────────
// Loaded on every web page (the shared head written by tools/build.js). Watches the page and swaps each known emoji
// in visible text for <svg class="ic"><use href="/icons.svg#i-<name>"></svg>: the sprite and the emoji → name map
// come from tools/gen-icons.py (src/icons.svg, src/icons.json; build.js stamps the map and the build tag in here).
// Text where an <svg> can't go is left alone: form fields, <option>, <title>, scripts, and anything inside
// [data-noicons]. The page's own strings keep their emoji, so screen readers, copy/paste and the claude.ai sheets
// (which don't load this) are unchanged; the icon gets the emoji as its accessible label only where the emoji
// carried meaning on its own. No inline scripts (CSP).
(function () {
  const MAP = /*__ICON_MAP__*/{};
  let V = ''; try { V = new URL(document.currentScript.src).searchParams.get('v') || ''; } catch (_) {}
  const SPRITE = '/icons.svg' + (V ? '?v=' + V : '');
  // every emoji with and without its variation selector (U+FE0F), longest first so sequences win
  const keys = new Set(); Object.keys(MAP).forEach(k => { keys.add(k); keys.add(k.replace(/️/g, '')); });
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RX = new RegExp('(' + [...keys].filter(Boolean).sort((a, b) => b.length - a.length).map(esc).join('|') + ')\\uFE0F?', 'g');
  const nameOf = e => MAP[e] || MAP[e + '️'] || MAP[e.replace(/️/g, '')];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT', 'TITLE', 'NOSCRIPT', 'CODE']);
  const NS = 'http://www.w3.org/2000/svg';
  // one icon element for an emoji
  function icon(name, emoji, alone) {
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'ic ic-' + name);
    if (alone) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', emoji); } else svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(NS, 'use'); use.setAttribute('href', SPRITE + '#i-' + name); svg.appendChild(use);
    return svg;
  }
  // whether a text node is somewhere an <svg> can go
  function ok(node) {
    for (let e = node.parentElement; e; e = e.parentElement) {
      if (SKIP.has(e.tagName) || e.namespaceURI === NS || e.isContentEditable || e.hasAttribute('data-noicons')) return false;
      if (e === document.body) return true;
    }
    return false;
  }
  // replaces the emoji in one text node with icons
  function swap(node) {
    const t = node.nodeValue; RX.lastIndex = 0; if (!RX.test(t) || !ok(node)) return;
    RX.lastIndex = 0; const frag = document.createDocumentFragment(); let at = 0, m;
    const alone = t.replace(RX, '').trim() === '';
    while ((m = RX.exec(t))) {
      const name = nameOf(m[1]); if (!name) continue;
      if (m.index > at) frag.appendChild(document.createTextNode(t.slice(at, m.index)));
      frag.appendChild(icon(name, m[1], alone)); at = m.index + m[0].length;
    }
    if (at < t.length) frag.appendChild(document.createTextNode(t.slice(at)));
    node.parentNode.replaceChild(frag, node);
  }
  // all text nodes under root
  function scan(root) {
    if (root.nodeType === 3) return swap(root);
    if (root.nodeType !== 1 || SKIP.has(root.tagName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), todo = [];
    for (let n; (n = w.nextNode());) { RX.lastIndex = 0; if (RX.test(n.nodeValue)) todo.push(n); }
    todo.forEach(swap);
  }
  // batch DOM changes: the sheet redraws big parts of the page at once
  let pending = new Set(), queued = false;
  const flush = () => { queued = false; const list = [...pending]; pending = new Set(); list.forEach(n => { if (n.isConnected) scan(n); }); };
  const start = () => {
    scan(document.body);
    new MutationObserver(ms => { ms.forEach(m => { if (m.type === 'characterData') pending.add(m.target); else m.addedNodes.forEach(n => pending.add(n)); });
      if (!queued) { queued = true; queueMicrotask(flush); } }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
