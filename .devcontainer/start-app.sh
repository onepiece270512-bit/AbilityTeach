#!/usr/bin/env bash
set -euo pipefail

pid_file="/tmp/abilityteach-dev.pid"
log_file="/tmp/abilityteach-dev.log"

# Reuse a healthy server when Codespaces reconnects. Check the port itself so
# a stale PID file cannot cause another Next.js server to take port 3001.
if curl -sS -o /dev/null --max-time 2 http://127.0.0.1:3000; then
  exit 0
fi

if [ -f "$pid_file" ]; then
  old_pid="$(cat "$pid_file")"
  if [[ "$old_pid" =~ ^[0-9]+$ ]] && kill -0 "$old_pid" 2>/dev/null; then
    old_command="$(ps -p "$old_pid" -o args= 2>/dev/null || true)"
    case "$old_command" in
      *"npm run dev"*|*"next dev"*) kill "$old_pid" 2>/dev/null || true ;;
    esac
  fi
  rm -f "$pid_file"
fi

nohup npm run dev -- --hostname 0.0.0.0 --port 3000 >"$log_file" 2>&1 </dev/null &
server_pid="$!"
echo "$server_pid" >"$pid_file"

for _ in $(seq 1 30); do
  if curl -sS -o /dev/null --max-time 2 http://127.0.0.1:3000; then
    exit 0
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat "$log_file"
    rm -f "$pid_file"
    exit 1
  fi
  sleep 1
done

cat "$log_file"
echo "AbilityTeach did not start on port 3000 within 30 seconds." >&2
exit 1
