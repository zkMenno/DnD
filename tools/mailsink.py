# A fake mail server for the web tests: accepts every email on 127.0.0.1:2525 and appends it to the file given
# (default /tmp/mailsink.txt), each one after a "=== TO <recipients>" line. The tests read sign-in codes from there.
# usage: python3 tools/mailsink.py [file] &   (tools/test.sh starts it; the tests point PocketBase's SMTP at it)
# Needs aiosmtpd (pip install aiosmtpd). Runs until killed.
import sys, asyncio
from aiosmtpd.controller import Controller
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mailsink.txt'
# The aiosmtpd handler: every message is accepted and written down.
class Sink:
    # Appends one message to OUT and says OK, so PocketBase thinks it was delivered.
    async def handle_DATA(self, server, session, envelope):
        with open(OUT, 'a') as f: f.write('=== TO ' + ','.join(envelope.rcpt_tos) + '\n' + envelope.content.decode('utf8', 'replace') + '\n')
        return '250 OK'
Controller(Sink(), hostname='127.0.0.1', port=2525).start()
asyncio.get_event_loop().run_forever()
