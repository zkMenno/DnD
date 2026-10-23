#!/bin/bash
# Builds, lints and runs the tests. Browser tests use the built sheets in dist/claude; the web tests run only when
# a PocketBase binary is there (they start a fresh local server via tools/devserver.sh and the fake mail server
# tools/mailsink.py). Screenshots go to $OUT (default /tmp/sheet-tests). Exits non-zero if anything failed.
# Needs node, playwright + Chromium ($CHROMIUM, default /opt/pw-browsers/chromium), python3 with aiosmtpd for the
# mail server, and, for lint, npm install once (eslint).
# Web tests, from the environment (CI sets these; the defaults are this machine's):
#   PB_BIN        the PocketBase binary (default /home/claude/pbbin/pocketbase)
#   PB_PORT       its port on 127.0.0.1 (default 8090); PB_WORK, PB_PID, PB_LOG: see tools/devserver.sh
#   DDB_FIXTURES  a folder of saved D&D Beyond answers (tools/test/fixtures/ddb): the server never calls dndbeyond.com
#   MAILSINK, MAILSINK_PORT  the fake mail server's file and port (default /tmp/mailsink.txt, 2525)
# The server always serves this checkout (APP_DIR, default: the folder this script is in).
#   bash tools/test.sh          everything (about 10 minutes)
#   bash tools/test.sh sheets   build, lint, the claude.ai sheet tests (about 5 minutes)
#   bash tools/test.sh web      build, lint, server rules, web e2e, limits (about 2 minutes)
#   bash tools/test.sh lint     build + lint only (seconds; what CI runs before building the image: npm run check)
# Order: build first (lint and every test use dist/); limits.py last, because it uses up this IP's sign-in allowance.
set -u
cd "$(dirname "$0")/.." || exit 1
part=${1:-all}
fail=0
# Prints a step heading.
step(){ echo; echo "== $*"; }

# ── Build and lint ──────────────────────────────────────────────────────────────────────────────────────────
step build;  node tools/build.js || exit 1

step lint
# Each pack is linted as the browser sees it: themes + class modules + pack + engine in one file, so eslint can
# check names across them.
mkdir -p dist/lint
for pack in packs/*.js; do n=$(basename "$pack" .js); cat src/themes.js src/classes.js "$pack" dist/web/engine/main.js > "dist/lint/$n.js"; done
if [ -x node_modules/.bin/eslint ]; then node_modules/.bin/eslint dist/lint web tools src/looks || fail=1
else echo "(skipped: run npm install once to get eslint)"; fi
# CSS: one rule per selector, so a component's styles stay in one place (tools/css-check.js)
node tools/css-check.js || fail=1

[ "$part" = lint ] && { echo; [ $fail = 0 ] && echo "ALL GREEN (build + lint)" || echo "SOMETHING FAILED"; exit $fail; }

# ── claude.ai sheet tests ───────────────────────────────────────────────────────────────────────────────────
[ "$part" = web ] || for t in smoke combat items spells throw; do step "$t"; node tools/test/$t.js | grep -v '^PASS' ; [ "${PIPESTATUS[0]}" = 0 ] || fail=1; done

# ── Web app tests ───────────────────────────────────────────────────────────────────────────────────────────
# The service worker across two builds: needs no PocketBase (it serves copies of dist/web itself).
[ "$part" = sheets ] || { step "web e2e-sw (offline copy across deploys)"; node tools/test/web/e2e-sw.js | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1; }
# A fresh local PocketBase (tools/devserver.sh, binary $PB_BIN) serving this checkout. Several web tests use fixed
# accounts, so they need this fresh database; e2e runs before e2e-items, which uses its account.
PB_BIN=${PB_BIN:-/home/claude/pbbin/pocketbase}; export PB_BIN APP_DIR=${APP_DIR:-$PWD}
B=http://127.0.0.1:${PB_PORT:-8090}   # every web test takes the server URL as its first argument
# True once something accepts connections on 127.0.0.1:<port>.
listening(){ (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
if [ "$part" = sheets ]; then :
elif [ -x "$PB_BIN" ]; then
  step "server (fresh database${DDB_FIXTURES:+, saved D&D Beyond answers})"; bash tools/devserver.sh reset >/dev/null && echo started || { echo "SOMETHING FAILED (server)"; exit 1; }
  step "server rules"; python3 tools/test/web/apitest.py "$B" | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
  # fake mail server for the login codes (the tests give PocketBase its port as the SMTP server). One already
  # listening there is reused: it must write to the same $MAILSINK file.
  mp=${MAILSINK_PORT:-2525}
  listening "$mp" || { python3 tools/mailsink.py "${MAILSINK:-/tmp/mailsink.txt}" >/dev/null 2>&1 & }
  for _ in $(seq 1 20); do listening "$mp" && break; sleep 0.5; done
  listening "$mp" || { echo "FAIL mail server didn't start (pip install aiosmtpd)"; fail=1; }
  step "site admin (admin tick, emailed code, unlock)"; python3 tools/test/web/admintest.py "$B" | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
  for t in e2e e2e-items e2e-party e2e-codes e2e-shared e2e-offline e2e-merge e2e-look e2e-move e2e-verify e2e-links e2e-account e2e-feedback e2e-legal; do step "web $t"; node tools/test/web/$t.js "$B" | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1; done
  step "headers and rate limits (last: uses up this IP's sign-in allowance)"; python3 tools/test/web/limits.py "$B" | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
else echo; echo "(web tests skipped: no PocketBase binary)"; fi

echo; [ $fail = 0 ] && echo "ALL GREEN" || echo "SOMETHING FAILED"
exit $fail
