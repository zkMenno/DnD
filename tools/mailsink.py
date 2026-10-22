# A fake mail server for tests: accepts every email on 127.0.0.1:2525 and appends it to the file given (default /tmp/mailsink.txt).
# usage: python3 tools/mailsink.py [file] &
import sys, asyncio
from aiosmtpd.controller import Controller
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mailsink.txt'
class Sink:
    async def handle_DATA(self, server, session, envelope):
        with open(OUT, 'a') as f: f.write('=== TO ' + ','.join(envelope.rcpt_tos) + '\n' + envelope.content.decode('utf8', 'replace') + '\n')
        return '250 OK'
Controller(Sink(), hostname='127.0.0.1', port=2525).start()
asyncio.get_event_loop().run_forever()
