#!/bin/bash
# Builds, lints and runs the tests. Browser tests use the built sheets in dist/claude; the web tests run only when
# a PocketBase binary is there (they start a fresh local server via tools/devserver.sh and the fake mail server
# tools/mailsink.py). Screenshots go to $OUT (default /tmp/sheet-tests). Exits non-zero if anything failed.
# Needs node, playwright + Chromium (/opt/pw-browsers/chromium) and, for lint, npm install once (eslint).
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
if [ -x node_modules/.bin/eslint ]; then node_modules/.bin/eslint dist/lint web tools || fail=1
else echo "(skipped: run npm install once to get eslint)"; fi

[ "$part" = lint ] && { echo; [ $fail = 0 ] && echo "ALL GREEN (build + lint)" || echo "SOMETHING FAILED"; exit $fail; }

# ── claude.ai sheet tests ───────────────────────────────────────────────────────────────────────────────────
[ "$part" = web ] || for t in smoke combat items spells; do step "$t"; node tools/test/$t.js | grep -v '^PASS' ; [ "${PIPESTATUS[0]}" = 0 ] || fail=1; done

# ── Web app tests ───────────────────────────────────────────────────────────────────────────────────────────
# The service worker across two builds: needs no PocketBase (it serves copies of dist/web itself).
[ "$part" = sheets ] || { step "web e2e-sw (offline copy across deploys)"; node tools/test/web/e2e-sw.js | grep -v '^PASS'; [ "${PIPESTATUS[0]}" = 0 ] || fail=1; }
# A fresh local PocketBase (tools/devserver.sh needs the binary at /home/claude/pbbin/pocketbase). Several web
# tests use fixed accounts, so they need this fresh database; e2e runs before e2e-items, which uses its account.
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
