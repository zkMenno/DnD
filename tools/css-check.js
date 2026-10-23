// CSS lint for the hand-written style sheets (src/app.css, web/home.css, src/theme.css, web/sheet.css, web/feedback.css):
// fails when the same selector is written in two separate rules of one file in the same @media / @supports context.
// Why: these files used to grow by appending override blocks at the end, so one component's styles ended up spread
// over several places and only the order decided which one won. One rule per selector and context keeps every
// component in one place, so reading its block tells you what it looks like.
// usage: node tools/css-check.js [file …]   (run by `bash tools/test.sh lint`; exits non-zero on a duplicate)
// Also exports parse(text) for other tools: the file as a tree of rules, at-rules and comments.
const fs = require('fs'), path = require('path');

// Duplicates that are on purpose, as 'file|context|selector' (context: the @media/@supports preludes joined with
// ' / ', empty at top level), each with a comment saying why.
const ALLOW = new Set([
  // the Aye button's letter spacing must come after .jumprow .btn{letter-spacing:0} (same specificity), so the ✓ in
  // the jump menu's "Reorder sections" row keeps it; the rest of .btn.done has to stay before the drawer rules that
  // resize buttons inside them (.hpq .btn, .mbtns .btn …)
  'src/app.css||.btn.done',
]);

// Parses CSS text into nodes: { type:'comment', text, start, end }, { type:'rule', sel, body, start, end },
// { type:'at', name, prelude, start, end, children (for @media/@supports/@layer/@container), body (others) }.
// Strings, comments and nested brackets are respected; positions are character offsets into text.
function parse(text, from = 0, to = text.length) {
  const nodes = []; let i = from;
  const skipWs = () => { while (i < to && /\s/.test(text[i])) i++; };
  // index of the brace that closes the block opened at text[open] ('{')
  const closeOf = open => {
    let d = 0;
    for (let j = open; j < to; j++) {
      const c = text[j];
      if (c === '/' && text[j + 1] === '*') { j = text.indexOf('*/', j + 2) + 1; if (j === 0) throw new Error('unclosed comment'); continue; }
      if (c === '"' || c === "'") { j = strEnd(j); continue; }
      if (c === '{') d++; else if (c === '}' && --d === 0) return j;
    }
    throw new Error('unclosed block at ' + lineOf(text, open));
  };
  const strEnd = j => { const q = text[j]; for (j++; j < to && text[j] !== q; j++) if (text[j] === '\\') j++; return j; };
  while (true) {
    skipWs(); if (i >= to) break;
    if (text[i] === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2); if (e < 0) throw new Error('unclosed comment at ' + lineOf(text, i));
      nodes.push({ type: 'comment', text: text.slice(i, e + 2), start: i, end: e + 2 }); i = e + 2; continue;
    }
    // the prelude runs to the first '{' or ';' outside strings, comments and brackets
    const s = i; let j = i, paren = 0;
    for (; j < to; j++) {
      const c = text[j];
      if (c === '/' && text[j + 1] === '*') { j = text.indexOf('*/', j + 2) + 1; continue; }
      if (c === '"' || c === "'") { j = strEnd(j); continue; }
      if (c === '(' || c === '[') paren++; else if (c === ')' || c === ']') paren--;
      else if (!paren && (c === '{' || c === ';')) break;
    }
    if (j >= to) throw new Error('unexpected end after ' + lineOf(text, s));
    const pre = text.slice(s, j).trim();
    if (text[j] === ';') { nodes.push({ type: 'at', name: pre.split(/[\s(]/)[0].slice(1), prelude: pre, start: s, end: j + 1 }); i = j + 1; continue; }
    const e = closeOf(j);
    if (pre[0] === '@') {
      const name = pre.slice(1).split(/[\s({]/)[0].toLowerCase();
      const n = { type: 'at', name, prelude: pre, start: s, end: e + 1, bodyStart: j + 1, bodyEnd: e };
      if (/^(media|supports|layer|container)$/.test(name)) n.children = parse(text, j + 1, e); else n.body = text.slice(j + 1, e);
      nodes.push(n);
    } else nodes.push({ type: 'rule', sel: pre, body: text.slice(j + 1, e), start: s, end: e + 1, bodyStart: j + 1, bodyEnd: e });
    i = e + 1;
  }
  return nodes;
}
// 1-based line number of a character offset.
const lineOf = (text, at) => text.slice(0, at).split('\n').length;
// A selector or prelude with comments dropped and spacing made uniform, so ".a > .b" and ".a>.b" compare equal.
const norm = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([>+~,(:)])\s*/g, '$1').trim();
// An at-rule prelude ("@media (hover: hover) and (pointer:fine)") with comments dropped and spacing made uniform.
const normPre = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*:\s*/g, ':').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();

// The duplicates in one file: [{ ctx, sel, lines: [line, …] }].
function duplicates(file, text) {
  const seen = new Map(), out = [];
  const walk = (nodes, ctx) => {
    for (const n of nodes) {
      if (n.type === 'rule') {
        const k = ctx.join(' / ') + '|' + norm(n.sel);
        if (!seen.has(k)) seen.set(k, []);
        seen.get(k).push(lineOf(text, n.start));
      } else if (n.children) walk(n.children, ctx.concat(normPre(n.prelude)));
    }
  };
  walk(parse(text), []);
  for (const [k, lines] of seen) if (lines.length > 1) {
    const [ctx, sel] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
    if (!ALLOW.has(file + '|' + ctx + '|' + sel)) out.push({ ctx, sel, lines });
  }
  return out;
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const files = process.argv.slice(2).length ? process.argv.slice(2) : ['src/app.css', 'web/home.css', 'src/theme.css', 'web/sheet.css', 'web/feedback.css'];
  let bad = 0;
  for (const f of files) {
    let d;
    try { d = duplicates(f, fs.readFileSync(path.join(root, f), 'utf8')); }
    catch (e) { console.log('FAIL ' + f + ': ' + e.message); bad++; continue; }
    for (const x of d) { bad++; console.log('FAIL ' + f + ': "' + x.sel + '"' + (x.ctx ? ' in ' + x.ctx.replace(/ \/ /g, ' › ') : '') + ' is written in ' + x.lines.length + ' rules (lines ' + x.lines.join(', ') + '): merge them into one'); }
  }
  if (bad) { console.log(bad + ' CSS problem' + (bad > 1 ? 's' : '')); process.exit(1); }
  console.log('PASS css-check: no selector written twice (' + files.join(', ') + ')');
}
module.exports = { parse, norm, normPre, lineOf, duplicates };
