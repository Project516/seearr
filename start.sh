#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="${CONFIG_DIRECTORY:-$APP_DIR/config}"

bash "$APP_DIR/setup.sh"

PORT="${PORT:-5055}"

# Open the app in a browser once the server responds
open_browser() {
  local url="http://localhost:${PORT}"
  for _ in $(seq 1 30); do
    if command -v curl >/dev/null 2>&1; then
      curl -sf -o /dev/null "$url" && break
    else
      sleep 2
      break
    fi
  done
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  fi
}
if [[ "${NO_BROWSER:-0}" != "1" ]] && { [[ -n "${DISPLAY:-}" ]] || [[ "$(uname)" == "Darwin" ]]; }; then
  open_browser &
fi

echo ""
echo "Starting Seearr on port ${PORT}..."
echo ""

CONFIG_DIRECTORY="$CONFIG_DIR" \
NODE_ENV="${NODE_ENV:-production}" \
PORT="${PORT}" \
node "$APP_DIR/dist/index.js"
