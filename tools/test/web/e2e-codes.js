// Sign in with an emailed code: a new email gets an account, the code arrives (fake mail server), signing in works,
// a wrong code doesn't, and the same email signs in again later. Needs tools/mailsink.py running; the test points
// the server's SMTP at it itself.
// Run: node tools/test/web/e2e-codes.js [server URL], or as part of bash tools/test.sh web. Default server:
// http://127.0.0.1:8090 (tools/devserver.sh). Prints PASS/FAIL per check and exits non-zero on a failure.
const fs = require('fs'), { chromium } = require('playwright'), watch = require('./watch');
const B = process.argv[2] || 'http://127.0.0.1:8090', MAIL = watch.MAIL;
(async () => {
  // Prints PASS/FAIL for one check and marks the run failed if it didn't pass.
  const ok = (n, c) => { if (!c) process.exitCode = 1; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  // point the server's mail at the fake mail server
  const su = await (await fetch(B+'/api/collections/_superusers/auth-with-password', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({identity:'admin@example.test', password:'TestPass-12345'}) })).json();
  await fetch(B+'/api/settings', { method:'PATCH', headers:{'content-type':'application/json', Authorization: su.token}, body: JSON.stringify({ meta:{ senderName:'Character sheets', senderAddress:'sheets@example.test' }, smtp:{ enabled:true, host:'127.0.0.1', port:watch.MAIL_PORT, tls:false } }) });
  // The newest code mailed to an address, read from the subject line "123456 is your code…" (polls for up to 10 s).
  const codeFor = async email => { for (let i = 0; i < 40; i++) { const t = fs.existsSync(MAIL) ? fs.readFileSync(MAIL, 'utf8') : ''; const parts = t.split('=== TO ').filter(x => x.startsWith(email)); const m = parts.length && parts[parts.length-1].match(/Subject: (\d{6}) is your code/); if (m) return m[1]; await new Promise(r => setTimeout(r, 250)); } return null; };
  fs.writeFileSync(MAIL, '');
  const b = await chromium.launch({ executablePath: watch.CHROMIUM });
  const p = await (await b.newContext({ viewport:{width:390, height:844} })).newPage(); p.setDefaultTimeout(15000);
  const email = 'code'+Date.now()+'@example.test';
  await p.goto(B + '/#signin'); await p.fill('input[name=email]', email); await p.click('button[value=code]');
  await p.waitForSelector('input[name=code]');
  const code = await codeFor(email); ok('a code arrives by email for a new address', !!code);
  await p.fill('input[name=code]', code === '000000' ? '111111' : '000000'); await p.click('button[value=otp]'); await p.waitForTimeout(800);
  ok('a wrong code is refused', /didn’t work/.test(await p.textContent('#msg')));
  await p.fill('input[name=code]', code); await p.click('button[value=otp]'); await p.waitForSelector('#add');
  ok('the right code signs in (account made on the way)', await p.evaluate(e => pb.authStore.record && pb.authStore.record.email === e && pb.authStore.record.verified === true, email));
  // signed out: the same email gets a new code and signs in again
  await p.evaluate(() => { pb.authStore.clear(); }); await p.goto(B + '/#signin');
  await p.fill('input[name=email]', email); await p.click('button[value=code]'); await p.waitForSelector('input[name=code]');
  await p.waitForTimeout(500); const code2 = await codeFor(email);
  await p.fill('input[name=code]', code2); await p.click('button[value=otp]'); await p.waitForSelector('#add');
  ok('the same email signs in again with a new code', code2 && code2 !== code);
  await b.close();
})();
