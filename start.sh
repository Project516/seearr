#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="${CONFIG_DIRECTORY:-$APP_DIR/config}"

bash "$APP_DIR/setup.sh"

echo ""
echo "Starting Seearr on port ${PORT:-5055}..."
echo ""

CONFIG_DIRECTORY="$CONFIG_DIR" \
NODE_ENV="${NODE_ENV:-production}" \
PORT="${PORT:-5055}" \
node "$APP_DIR/dist/index.js"
