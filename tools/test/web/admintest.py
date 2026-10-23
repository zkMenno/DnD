# Site admin routes (server/pb_hooks/admin.pb.js): only an account with users.admin ticked gets in, only after an
# emailed code, and the admin tick can't be set from the browser.
# Run: python3 tools/test/web/admintest.py [server URL], or via bash tools/test.sh web (after the mail sink starts).
# Reads codes from the mail sink file ($MAILSINK, default /tmp/mailsink.txt); needs the test superuser.
import json, os, re, time, urllib.request, urllib.error, sys
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090'
SINK = os.environ.get('MAILSINK', '/tmp/mailsink.txt')
# One JSON request: (status, parsed answer). HTTP errors are returned, not raised.
def req(method, path, body=None, tok=None, hdr=None):
    h = {'content-type':'application/json', **({'Authorization':tok} if tok else {}), **(hdr or {})}
    r = urllib.request.Request(B+path, method=method, data=json.dumps(body).encode() if body is not None else None, headers=h)
    try:
        with urllib.request.urlopen(r) as f: return f.status, json.loads(f.read() or 'null')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or 'null')
ok = True
# Prints PASS/FAIL for one check and remembers a failure.
def check(name, cond):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ')+name)
# The newest 6-digit admin code mailed to addr (waits up to 5 s).
def code(addr):
    for _ in range(25):
        try: t = open(SINK, encoding='utf8', errors='replace').read()
        except FileNotFoundError: t = ''
        parts = [p for p in t.split('=== TO ') if p.startswith(addr) and 'admin code' in p]
        if parts:
            m = re.search(r'admin code: (\d{6})', parts[-1])
            if m: return m.group(1)
        time.sleep(0.2)
    return None
SU = req('POST','/api/collections/_superusers/auth-with-password',{'identity':'admin@example.test','password':'TestPass-12345'})[1]['token']
mp = int(os.environ.get('MAILSINK_PORT', '2525'))
req('PATCH','/api/settings',{'meta':{'senderName':'Dungeon Tracker','senderAddress':'sheets@example.test'},'smtp':{'enabled':True,'host':'127.0.0.1','port':mp}},SU)
# two accounts: the owner-to-be and someone else
def user(n):
    req('POST','/api/collections/users/records',{'email':n+'@example.test','password':'Passw0rd-'+n,'passwordConfirm':'Passw0rd-'+n})
    s,d = req('POST','/api/collections/users/auth-with-password',{'identity':n+'@example.test','password':'Passw0rd-'+n}); return d['token'], d['record']['id']
(to,io),(tx,ix) = user('owner'), user('mallory')

s,d = req('GET','/api/admin/me',tok=tx); check('a normal account is not an admin', s==200 and d['admin'] is False)
s,_ = req('PATCH','/api/collections/users/records/'+ix,{'admin':True},tx)
s,d = req('GET','/api/admin/me',tok=tx); check('an account can’t tick admin on itself', d['admin'] is False)
s,d = req('GET','/api/collections/users/records/'+ix,tok=tx); check('the admin field is never sent to the browser', 'admin' not in (d or {}))
s,_ = req('POST','/api/admin/code',tok=tx); check('a non-admin can’t ask for an admin code (looks like no such route)', s==404)
s,_ = req('GET','/api/admin/overview',tok=tx); check('a non-admin can’t read the overview', s==404)
s,_ = req('GET','/api/admin/me'); check('signed out: refused', s==401)

req('PATCH','/api/collections/users/records/'+io,{'admin':True},SU)
s,d = req('GET','/api/admin/me',tok=to); check('the superuser can make an account admin', d['admin'] is True)
s,_ = req('GET','/api/admin/overview',tok=to); check('an admin without the code is locked out', s==403)
s,_ = req('GET','/api/admin/overview',tok=to,hdr={'X-Admin-Token':'guess'}); check('a made-up unlock token doesn’t work', s==403)
s,d = req('POST','/api/admin/code',tok=to); check('an admin gets a code by email', s==200 and d['sent']=='owner@example.test')
s,_ = req('POST','/api/admin/code',tok=to); check('one code a minute', s==400)
c = code('owner@example.test'); check('the code arrives', c)
s,_ = req('POST','/api/admin/unlock',{'code':'000000' if c!='000000' else '111111'},tok=to); check('a wrong code is refused', s==400)
s,_ = req('POST','/api/admin/unlock',{'code':c},tok=tx); check('someone else can’t use the admin’s code', s==404)
s,u = req('POST','/api/admin/unlock',{'code':c},tok=to); check('the right code unlocks for 30 minutes', s==200 and u.get('token') and u['until'] > time.time()*1000 + 29*60000)
s,_ = req('POST','/api/admin/unlock',{'code':c},tok=to); check('a code works once', s==400)
T = {'X-Admin-Token': u['token']}
s,_ = req('GET','/api/admin/overview',tok=tx,hdr=T); check('the token is useless on another account', s==404)
req('POST','/api/collections/feedback/records',{'kind':'idea','text':'A test idea for the inbox','page':'/'})
s,o = req('GET','/api/admin/overview',tok=to,hdr=T); check('unlocked: numbers and feedback', s==200 and o['counts']['users']>=2 and any(f['text']=='A test idea for the inbox' for f in o['feedback']))
fid = next(f['id'] for f in o['feedback'] if f['text']=='A test idea for the inbox')
s,_ = req('DELETE','/api/admin/feedback/'+fid,tok=to,hdr=T); check('Done removes a feedback note', s==200)
s,o = req('GET','/api/admin/overview',tok=to,hdr=T); check('…and it’s gone', not any(f['id']==fid for f in o['feedback']))
req('POST','/api/admin/lock',tok=to)
s,_ = req('GET','/api/admin/overview',tok=to,hdr=T); check('Lock now ends the unlock', s==403)
req('PATCH','/api/collections/users/records/'+io,{'admin':False},SU)
sys.exit(0 if ok else 1)
