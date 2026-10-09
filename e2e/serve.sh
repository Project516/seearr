#!/usr/bin/env bash
# Usage: serve.sh <built checkout> <log file>
# Starts Seearr in the background, prints its PID, and waits until it answers.
# CONFIG_DIRECTORY selects the data directory.
set -euo pipefail

cd "$1"
NODE_ENV=production nohup node dist/index.js > "$2" 2>&1 &
pid=$!
for _ in $(seq 1 60); do
  if curl -fs http://localhost:5055/api/v1/status > /dev/null; then
    echo "$pid"
    exit 0
  fi
  sleep 2
done
cat "$2" >&2
exit 1
