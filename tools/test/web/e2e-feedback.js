// The 🐞 feedback box (web/feedback.js): send a bug report from the front page footer while signed out, check it is
// stored for the superuser only, and that a signed-out sender can't read feedback or pose as someone else.
const { chromium } = require('playwright');
const B = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.setDefaultTimeout(15000);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.click('.foot [data-feedback]'); await p.waitForSelector('#fbpop.show');
  await p.click('#fbpop .fbsend');
  ok('an empty message is refused in the box', /few words/.test(await p.textContent('#fbpop .fberr')));
  await p.click('[data-kind=idea]'); await p.fill('#fbtext', 'A dark-mode toggle on the front page would be nice'); await p.fill('#fbmail', 'fan@example.test');
  await p.click('#fbpop .fbsend'); await p.waitForSelector('.fbtick-big');
  ok('sending shows a thank-you', /Thank you/.test(await p.textContent('#fbpop')));
  const su = await (await fetch(B + '/api/collections/_superusers/auth-with-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: 'admin@example.test', password: 'TestPass-12345' }) })).json();
  const l = await (await fetch(B + '/api/collections/feedback/records?sort=-created', { headers: { Authorization: su.token } })).json();
  const f = l.items && l.items[0];
  ok('the superuser sees it, with kind, contact, page and device', f && f.kind === 'idea' && f.contact === 'fan@example.test' && f.page === '/' && /390×844/.test(f.device));
  const anon = await fetch(B + '/api/collections/feedback/records');
  const aj = await anon.json(); ok('nobody else can list feedback', anon.status >= 400 || !(aj.items || []).length);
  const fake = await fetch(B + '/api/collections/feedback/records', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'bug', text: 'pretending', author: f.author || 'abcdefghijklmno' }) });
  ok('a signed-out sender can’t name an author', fake.status >= 400);
  ok('no script errors', !errs.length);
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
