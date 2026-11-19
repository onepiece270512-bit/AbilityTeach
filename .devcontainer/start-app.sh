#!/usr/bin/env bash
set -euo pipefail

pid_file="/tmp/abilityteach-dev.pid"
log_file="/tmp/abilityteach-dev.log"

if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
  exit 0
fi

nohup npm run dev -- --hostname 0.0.0.0 >"$log_file" 2>&1 </dev/null &
echo "$!" >"$pid_file"
