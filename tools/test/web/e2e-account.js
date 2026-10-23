// Sign-in & security on the home page: change the email (code sent to the new address) and set a password (code sent
// to the current email), then sign in with the new email and password. Needs tools/mailsink.py, like e2e-codes.
const fs = require('fs'), { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090', MAIL = '/tmp/mailsink.txt';
(async () => {
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const su = await (await fetch(B+'/api/collections/_superusers/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({identity:'admin@example.test', password:'TestPass-12345'}) })).json();
  await fetch(B+'/api/settings', { method:'PATCH', headers:{'content-type':'application/json', Authorization: su.token}, body: JSON.stringify({ meta:{ senderName:'Character sheets', senderAddress:'sheets@example.test' }, smtp:{ enabled:true, host:'127.0.0.1', port:2525, tls:false } }) });
  const codeFor = async to => { for (let i = 0; i < 40; i++) { const t = fs.existsSync(MAIL) ? fs.readFileSync(MAIL, 'utf8') : ''; const parts = t.split('=== TO ').filter(x => x.startsWith(to)); const m = parts.length && parts[parts.length-1].match(/code: (\d{6})/); if (m) return m[1]; await new Promise(r => setTimeout(r, 250)); } return null; };
  fs.writeFileSync(MAIL, '');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport:{width:390, height:844} })).newPage(); p.setDefaultTimeout(15000);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const email = 'acct'+Date.now()+'@example.test', email2 = 'new'+Date.now()+'@example.test';
  await p.goto(B + '/#signin'); await p.fill('input[name=email]', email); await p.click('.pwbox summary'); await p.fill('input[name=password]', 'First-pass-123'); await p.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('#pw2box').hidden = false; f.password2.value = f.password.value; }); await p.click('button[value=up]');
  await p.waitForSelector('#add'); await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/170557047'); await p.click('#add button'); await watch.onboard(p);
  await p.waitForSelector('#vitals'); await p.goto(B + '/'); await p.waitForSelector('#secem');
  // change email: wrong code refused, right code changes it
  await p.click('#secem'); await p.fill('#newemail', email2); await p.click('#emsend'); await p.waitForSelector('#emcode');
  const c1 = await codeFor(email2); ok('the email-change code goes to the new address', !!c1);
  await p.fill('#emcode', c1 === '000000' ? '111111' : '000000'); await p.click('#emok'); await p.waitForTimeout(600);
  ok('a wrong code is refused', /isn’t right/.test(await p.textContent('#msg')));
  await p.fill('#emcode', c1); await p.click('#emok'); await p.waitForFunction(e => document.querySelector('#secemail').textContent === e, email2);
  ok('the email changes', await p.evaluate(() => pb.authStore.record.email) === email2);
  // set a password with a code sent to the (new) email
  await p.click('#secpw'); await p.click('#pwsend'); await p.waitForSelector('#pwcode');
  const c2 = await codeFor(email2); ok('the password code goes to the account email', !!c2);
  await p.fill('#pwcode', c2); await p.fill('#pwnew', 'Second-pass-456'); await p.click('#pwok'); await p.waitForTimeout(800);
  ok('still signed in after the password change', await p.evaluate(() => pb.authStore.isValid));
  const r = await fetch(B + '/api/collections/users/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ identity: email2, password: 'Second-pass-456' }) });
  ok('the new email and password sign in', r.ok);
  const r2 = await fetch(B + '/api/collections/users/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ identity: email2, password: 'First-pass-123' }) });
  ok('the old password no longer works', !r2.ok);
  ok('no script errors', !errs.length);
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
