# Security headers and rate limits (schema migration settings, hooks/ddb.pb.js). Run LAST against a server:
# it uses up this IP's sign-in allowance, so later tests on the same server would be refused.
import urllib.request, urllib.error, json, sys
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090'
ok = True
def check(name, cond):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ')+name)
def get(path):
    try:
        with urllib.request.urlopen(B+path) as f: return f.status, f.headers
    except urllib.error.HTTPError as e: return e.code, e.headers
def post(path, body):
    r = urllib.request.Request(B+path, method='POST', data=json.dumps(body).encode(), headers={'content-type':'application/json'})
    try:
        with urllib.request.urlopen(r) as f: return f.status
    except urllib.error.HTTPError as e: return e.code
s,h = get('/'); csp = h.get('Content-Security-Policy') or ''
check('app pages send a strict CSP (no inline scripts)', "script-src 'self'" in csp and 'unsafe-inline' not in csp.split('script-src')[1].split(';')[0])
check('app pages refuse framing', "frame-ancestors 'none'" in csp)
check('nosniff on every answer', (h.get('X-Content-Type-Options') or '') == 'nosniff')
s,h = get('/_/'); check('the dashboard keeps PocketBase\'s own policy', "base-uri 'none'" not in (h.get('Content-Security-Policy') or ''))
codes = [post('/api/collections/users/auth-with-password', {'identity':'nobody@example.test','password':'wrong-%d' % i}) for i in range(30)]
check('password guessing is rate limited (20 a minute per IP)', 429 in codes)
codes = [post('/api/collections/users/request-otp', {'email':'flood@example.test'}) for i in range(26)]
check('code emails are rate limited (20 per 10 minutes per IP)', 429 in codes)
print('ALL PASS' if ok else 'SOME FAILED')
sys.exit(0 if ok else 1)
