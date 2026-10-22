#!/bin/bash
# Local dev server: fresh database (with "reset"), migrations, hooks, serving dist/web. Pid in /tmp/pb.pid.
cd /home/claude/pbtest || exit 1
[ -f /tmp/pb.pid ] && kill "$(cat /tmp/pb.pid)" 2>/dev/null; sleep 1
rm -rf pb_migrations pb_hooks && cp -r /home/claude/sheetapp/server/pb_migrations /home/claude/sheetapp/server/pb_hooks .   # fresh copies: no stale files
[ "$1" = "reset" ] && rm -rf pb_data
/home/claude/pbbin/pocketbase migrate up --dir=./pb_data --migrationsDir=./pb_migrations >/dev/null
/home/claude/pbbin/pocketbase superuser upsert admin@example.test 'TestPass-12345' --dir=./pb_data >/dev/null 2>&1
nohup /home/claude/pbbin/pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data --hooksDir=./pb_hooks --migrationsDir=./pb_migrations --publicDir=/home/claude/sheetapp/dist/web > /tmp/pb.log 2>&1 &
echo $! > /tmp/pb.pid; sleep 2; curl -s 127.0.0.1:8090/api/health
