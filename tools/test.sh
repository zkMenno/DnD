#!/bin/bash
# Build, lint and run the tests. Browser tests use the built sheets in dist/claude; the web tests run only when
# a PocketBase binary is there (they start a fresh local server). Screenshots go to $OUT (default /tmp/sheet-tests).
#   bash tools/test.sh          everything (about 10 minutes)
#   bash tools/test.sh sheets   build, lint, the claude.ai sheet tests (about 5 minutes)
#   bash tools/test.sh web      build, lint, server rules, web e2e, limits (about 2 minutes)
#   bash tools/test.sh lint     build + lint only (seconds; what CI runs before building the image: npm run check)
set -u
cd "$(dirname "$0")/.." || exit 1
part=${1:-all}
fail=0
step(){ echo; echo "== $*"; }
step build;  node tools/build.js || exit 1

step lint
mkdir -p dist/lint
for pack in packs/*.js; do n=$(basename "$pack" .js); cat src/themes.js src/classes.js "$pack" dist/web/engine/main.js > "dist/lint/$n.js"; done
if [ -x node_modules/.bin/eslint ]; then node_modules/.bin/eslint dist/lint web tools || fail=1
else echo "(skipped: run npm install once to get eslint)"; fi

[ "$part" = lint ] && { echo; [ $fail = 0 ] && echo "ALL GREEN (build + lint)" || echo "SOMETHING FAILED"; exit $fail; }

[ "$part" = web ] || for t in smoke combat items spells; do step "$t"; node tools/test/$t.js | grep -v '^PASS' ; [ "${PIPESTATUS[0]}" = 0 ] || fail=1; done

# web: a fresh local PocketBase (tools/devserver.sh needs the binary at /home/claude/pbbin/pocketbase)
if [ "$part" = sheets ]; then :
elif [ -x /home/claude/pbbin/pocketbase ]; then
  step "server (fresh database)"; bash tools/devserver.sh reset >/dev/null && echo started
  step "server rules"; python3 tools/test/web/apitest.py | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
  pgrep -f tools/mailsink.py >/dev/null || (python3 tools/mailsink.py >/dev/null 2>&1 &); sleep 1   # fake mail server for the login codes
  for t in e2e e2e-items e2e-party e2e-codes e2e-shared e2e-offline e2e-move e2e-verify e2e-links e2e-account e2e-feedback e2e-legal; do step "web $t"; node tools/test/web/$t.js | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1; done
  step "headers and rate limits (last: uses up this IP's sign-in allowance)"; python3 tools/test/web/limits.py | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
else echo; echo "(web tests skipped: no PocketBase binary)"; fi

echo; [ $fail = 0 ] && echo "ALL GREEN" || echo "SOMETHING FAILED"
exit $fail
