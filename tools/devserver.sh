#!/bin/bash
# Local dev server for the web tests: PocketBase on 127.0.0.1:8090 with this repo's migrations and hooks, serving
# dist/web. usage: bash tools/devserver.sh [reset] [fixtures]
#   reset     start from an empty database
#   fixtures  answer D&D Beyond requests from saved files (tools/test/fixtures/ddb/<id>.json) instead of the network:
#             sets DDB_FIXTURES for PocketBase (see ddbGet in server/pb_hooks/ddb_utils.js). A DDB_FIXTURES already in
#             the environment is passed on as it is, with or without this word.
# Run node tools/build.js first. Every path can be changed with an environment variable (defaults: this machine):
#   PB_BIN   the PocketBase binary            (/home/claude/pbbin/pocketbase; CI builds it from server/)
#   APP_DIR  the checkout to serve            (/home/claude/sheetapp: its server/ hooks + migrations and dist/web)
#   PB_WORK  where pb_data and the copies go  (/home/claude/pbtest; made if missing)
#   PB_PORT  the port on 127.0.0.1            (8090)
#   PB_PID, PB_LOG  pid and log files         (/tmp/pb.pid, /tmp/pb.log)
# Stops the previous server (pid in $PB_PID), migrates, makes the test superuser admin@example.test, and starts
# serving in the background. Prints the health answer when it is up; exits non-zero if it doesn't come up.
PB_BIN=${PB_BIN:-/home/claude/pbbin/pocketbase}
APP_DIR=${APP_DIR:-/home/claude/sheetapp}
PB_WORK=${PB_WORK:-/home/claude/pbtest}
PB_PORT=${PB_PORT:-8090}
PB_PID=${PB_PID:-/tmp/pb.pid}
PB_LOG=${PB_LOG:-/tmp/pb.log}
reset=0
for a in "$@"; do
  case "$a" in
    reset) reset=1 ;;
    fixtures) export DDB_FIXTURES=${DDB_FIXTURES:-$APP_DIR/tools/test/fixtures/ddb} ;;
    *) echo "usage: bash tools/devserver.sh [reset] [fixtures]" >&2; exit 2 ;;
  esac
done
APP_DIR=$(cd "$APP_DIR" && pwd) || exit 1
# absolute, because PocketBase runs in $PB_WORK
if [ -n "${DDB_FIXTURES:-}" ]; then DDB_FIXTURES=$(cd "$DDB_FIXTURES" && pwd) || exit 1; export DDB_FIXTURES; fi
mkdir -p "$PB_WORK" && cd "$PB_WORK" || exit 1
[ -f "$PB_PID" ] && kill "$(cat "$PB_PID")" 2>/dev/null; sleep 1
rm -rf pb_migrations pb_hooks && cp -r "$APP_DIR/server/pb_migrations" "$APP_DIR/server/pb_hooks" .   # fresh copies: no stale files
[ $reset = 1 ] && rm -rf pb_data
"$PB_BIN" migrate up --dir=./pb_data --migrationsDir=./pb_migrations >/dev/null
"$PB_BIN" superuser upsert admin@example.test 'TestPass-12345' --dir=./pb_data >/dev/null 2>&1
[ -n "${DDB_FIXTURES:-}" ] && echo "D&D Beyond answers from $DDB_FIXTURES (no network)" >&2
nohup "$PB_BIN" serve --http=127.0.0.1:"$PB_PORT" --dir=./pb_data --hooksDir=./pb_hooks --migrationsDir=./pb_migrations --publicDir="$APP_DIR/dist/web" > "$PB_LOG" 2>&1 &
echo $! > "$PB_PID"
for _ in $(seq 1 30); do curl -sf "127.0.0.1:$PB_PORT/api/health" && exit 0; sleep 0.5; done
echo "PocketBase didn't start; log: $PB_LOG" >&2; tail -20 "$PB_LOG" >&2; exit 1
