#!/bin/bash
# Local dev server for the web tests: PocketBase on 127.0.0.1:8090 with this repo's migrations and hooks, serving
# dist/web. usage: bash tools/devserver.sh [reset]   ("reset" starts from an empty database)
# Needs the official PocketBase binary at /home/claude/pbbin/pocketbase; works in /home/claude/pbtest and copies
# from /home/claude/sheetapp (the repo checkout). Run node tools/build.js first.
# Stops the previous server (pid in /tmp/pb.pid), migrates, makes the test superuser admin@example.test, and
# starts serving in the background (log in /tmp/pb.log). Prints the health answer when it is up.
cd /home/claude/pbtest || exit 1
[ -f /tmp/pb.pid ] && kill "$(cat /tmp/pb.pid)" 2>/dev/null; sleep 1
rm -rf pb_migrations pb_hooks && cp -r /home/claude/sheetapp/server/pb_migrations /home/claude/sheetapp/server/pb_hooks .   # fresh copies: no stale files
[ "$1" = "reset" ] && rm -rf pb_data
/home/claude/pbbin/pocketbase migrate up --dir=./pb_data --migrationsDir=./pb_migrations >/dev/null
/home/claude/pbbin/pocketbase superuser upsert admin@example.test 'TestPass-12345' --dir=./pb_data >/dev/null 2>&1
nohup /home/claude/pbbin/pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data --hooksDir=./pb_hooks --migrationsDir=./pb_migrations --publicDir=/home/claude/sheetapp/dist/web > /tmp/pb.log 2>&1 &
echo $! > /tmp/pb.pid; sleep 2; curl -s 127.0.0.1:8090/api/health
