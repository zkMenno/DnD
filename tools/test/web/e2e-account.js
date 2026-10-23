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
  const c1b = await codeFor(email); ok('a second code goes to the current address', !!c1b && c1b !== c1);
  await p.fill('#emcode', c1); await p.fill('#emcode2', c1b === '000000' ? '111111' : '000000'); await p.click('#emok'); await p.waitForTimeout(600);
  ok('a wrong code for the current address is refused (under the boxes)', /isn’t right/.test(await p.textContent('#secembox .pwerr')));
  await p.fill('#emcode2', c1b); await p.click('#emok'); await p.waitForFunction(e => document.querySelector('#secemail').textContent === e, email2);
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
  // someone signs up with a password for an email that isn't theirs; the real owner then signs in with a code:
  // that password stops working
  const email4 = 'squat'+Date.now()+'@example.test';
  await fetch(B + '/api/collections/users/records', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email: email4, password:'Squatter-123', passwordConfirm:'Squatter-123' }) });
  const z = await (await b.newContext()).newPage(); z.on('pageerror', e => errs.push(e.message));
  await z.goto(B + '/#signin'); await z.fill('input[name=email]', email4); await z.click('button[value=code]'); await z.waitForSelector('input[name=code]');
  const c4 = await (async () => { for (let i = 0; i < 40; i++) { const t = fs.readFileSync(MAIL, 'utf8'); const parts = t.split('=== TO ').filter(x => x.startsWith(email4)); const m = parts.length && parts[parts.length-1].replace(/=\r?\n/g, '').match(/<strong>(\d{6})<\/strong>/); if (m) return m[1]; await new Promise(r => setTimeout(r, 250)); } return null; })();
  await z.fill('input[name=code]', c4); await z.click('button[value=otp]'); await z.waitForSelector('#add');
  const r4 = await fetch(B + '/api/collections/users/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ identity: email4, password: 'Squatter-123' }) });
  ok('a password set before the owner proved the email stops working', !r4.ok);
  // Forgot your password? on the sign-in page: a code, then "Choose a new password" on the home page
  const f = await (await b.newContext({ viewport:{width:390, height:844} })).newPage(); f.setDefaultTimeout(15000); f.on('pageerror', e => errs.push(e.message));
  const otp = async to => { for (let i = 0; i < 40; i++) { const t = fs.readFileSync(MAIL, 'utf8'); const parts = t.split('=== TO ').filter(x => x.startsWith(to)); const m = parts.length && parts[parts.length-1].replace(/=\r?\n/g, '').match(/<strong>(\d{6})<\/strong>/); if (m) return m[1]; await new Promise(r => setTimeout(r, 250)); } return null; };
  fs.writeFileSync(MAIL, '');
  await f.goto(B + '/#signin'); await f.fill('input[name=email]', email3); await f.evaluate(() => { document.querySelector('.pwbox').open = true; });
  await f.click('#pwforgot'); await f.waitForSelector('input[name=code]');
  await f.fill('input[name=code]', await otp(email3)); await f.click('button[value=otp]'); await f.waitForSelector('#firstpw');
  ok('after Forgot your password? the home page asks for a new one', /Choose a new password/.test(await f.textContent('.pwprompt')));
  await f.fill('#firstpw', 'Fourth-pass-111'); await f.fill('#firstpw2', 'Fourth-pass-112'); await f.click('#firstpwok');
  ok('two different passwords: the error shows in the card, under the boxes', /aren’t the same/.test(await f.textContent('.pwprompt .pwerr')));
  await f.fill('#firstpw2', 'Fourth-pass-111'); await f.click('#firstpwok'); await f.waitForSelector('#donepop.show');
  const signIn = async (em, pw) => fetch(B + '/api/collections/users/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ identity: em, password: pw }) });
  ok('the new password works', (await signIn(email3, 'Fourth-pass-111')).ok);
  ok('the old one doesn’t', !(await signIn(email3, 'Third-pass-789')).ok);
  // Sign out everywhere else: another session's token stops working, this page stays signed in
  const other = await (await signIn(email3, 'Fourth-pass-111')).json();
  await f.goto(B + '/'); await f.click('[data-hometab=account]'); await f.click('#secout'); await f.click('.askpop [data-a="1"]'); await f.waitForSelector('#donepop.show');
  const ref = await fetch(B + '/api/collections/users/auth-refresh', { method:'POST', headers:{ Authorization: other.token } });
  ok('sign out everywhere else ends the other session', !ref.ok);
  ok('…and keeps this one', await f.evaluate(async () => { try { await pb.collection('users').authRefresh(); return true; } catch (_) { return false; } }));
  // Remove password: back to codes only
  await f.waitForSelector('#donepop', { state: 'detached' }); await f.click('#secpwrm'); await f.click('.askpop [data-a="1"]'); await f.waitForSelector('#donepop.show');
  ok('after Remove, the password no longer signs in', !(await signIn(email3, 'Fourth-pass-111')).ok);
  ok('the password row now offers Set a password', /Set a password/.test(await f.textContent('#secpw')));
  ok('no script errors', !errs.length);
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
