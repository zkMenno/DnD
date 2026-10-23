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
  await p.goto(B + '/#signin'); await p.fill('input[name=email]', email); await p.evaluate(() => { document.querySelector('.pwbox').open = true; }); await p.fill('input[name=password]', 'First-pass-123'); await p.evaluate(() => { const f = document.querySelector('#login'); document.querySelector('[data-pwmode=up]').click(); f.password2.value = f.password.value; }); await p.click('#pwgo');
  await p.waitForSelector('#add'); await p.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/170557047'); await p.click('#add button'); await watch.onboard(p);
  await p.waitForSelector('#vitals'); await p.goto(B + '/'); await p.click('[data-hometab=account]'); await p.waitForSelector('#secem');
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
  await p.fill('#pwcode', c2); await p.fill('#pwnew', 'Second-pass-456'); await p.fill('#pwnew2', 'Second-pass-456'); await p.click('#pwok'); await p.waitForTimeout(800);
  ok('still signed in after the password change', await p.evaluate(() => pb.authStore.isValid));
  const r = await fetch(B + '/api/collections/users/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ identity: email2, password: 'Second-pass-456' }) });
  ok('the new email and password sign in', r.ok);
  const r2 = await fetch(B + '/api/collections/users/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ identity: email2, password: 'First-pass-123' }) });
  ok('the old password no longer works', !r2.ok);
  // signed up with an emailed code: save a first password from the home page card, see the ✓ pop-up; the card goes away
  const q = await (await b.newContext({ viewport:{width:390, height:844} })).newPage(); q.setDefaultTimeout(15000); q.on('pageerror', e => errs.push(e.message));
  const email3 = 'otp'+Date.now()+'@example.test';
  await q.goto(B + '/#signin'); await q.fill('input[name=email]', email3); await q.click('button[value=code]'); await q.waitForSelector('input[name=code]');
  const c3 = await (async () => { for (let i = 0; i < 40; i++) { const t = fs.existsSync(MAIL) ? fs.readFileSync(MAIL, 'utf8') : ''; const parts = t.split('=== TO ').filter(x => x.startsWith(email3)); const m = parts.length && parts[parts.length-1].replace(/=\r?\n/g, '').match(/<strong>(\d{6})<\/strong>/); if (m) return m[1]; await new Promise(r => setTimeout(r, 250)); } return null; })(); ok('the sign-in code arrives', !!c3);
  await q.fill('input[name=code]', c3); await q.click('button[value=otp]'); await q.waitForSelector('#add');
  const u3 = await (await fetch(B+'/api/collections/users/records?filter='+encodeURIComponent('email="'+email3+'"'), { headers:{ Authorization: su.token } })).json();
  ok('the code sign-in time is kept in the database (survives a restart)', !!(u3.items[0] && u3.items[0].otp_at));
  await q.fill('#add input[name=url]', 'https://www.dndbeyond.com/characters/170557047'); await q.click('#add button'); await watch.onboard(q); await q.waitForSelector('#vitals');
  await q.goto(B + '/'); await q.waitForSelector('#firstpw');
  await q.fill('#firstpw', 'Third-pass-789'); await q.fill('#firstpw2', 'Third-pass-789'); await q.click('#firstpwok'); await q.waitForSelector('#donepop.show');
  ok('a ✓ pop-up confirms the saved password', /Password saved/.test(await q.textContent('#donepop')));
  ok('the password card goes away', !(await q.$('.pwprompt')));
  const r3 = await fetch(B + '/api/collections/users/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ identity: email3, password: 'Third-pass-789' }) });
  ok('that password signs in', r3.ok);
  // the sign-in page on this device: the password box opens by itself for that email; a wrong password shows under it
  await q.evaluate(() => pb.authStore.clear()); await q.goto(B + '/#signin'); await q.fill('input[name=email]', email3);
  ok('the password box opens for an email with a password', await q.evaluate(() => document.querySelector('.pwbox').open));
  await q.fill('input[name=password]', 'Wrong-pass-000'); await q.click('#pwgo'); await q.waitForSelector('#pwerr:not([hidden])');
  ok('a wrong password shows under the password box', /not right/.test(await q.textContent('#pwerr')));
  await q.fill('input[name=password]', 'Third-pass-789'); await q.click('#pwgo'); await q.waitForSelector('#mine, #add');
  ok('the right one signs in', await q.evaluate(() => pb.authStore.isValid));
  ok('no script errors', !errs.length);
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
