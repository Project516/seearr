#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
#  Seearr – Portable Setup Script
#  Everything stays in the current directory.
#  No root, no systemd, no /opt.
# ─────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="${CONFIG_DIRECTORY:-$APP_DIR/config}"

# ─────────────────────────────────────────────────────────
#  1. System checks
# ─────────────────────────────────────────────────────────
check_prereqs() {
  info "Checking system requirements..."

  if ! command -v node &>/dev/null; then
    error "Node.js is not installed. Install Node.js 22+ first."
  fi
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 22 ]; then
    error "Node.js 22+ required (found: $(node -v))."
  fi
  info "  Node.js $(node -v) [ok]"

  # Use the pinned pnpm from a local copy: a global pnpm of another major
  # can fail or hang trying to switch to the pinned version.
  PNPM_VER=$(node -p 'require(process.argv[1]).packageManager.split("@")[1].split("+")[0]' "$APP_DIR/package.json")
  PNPM_DIR="$APP_DIR/.tools/pnpm"
  if [ "$("$PNPM_DIR/bin/pnpm" -v 2>/dev/null)" != "$PNPM_VER" ]; then
    info "  Downloading pnpm $PNPM_VER into .tools/..."
    rm -rf "$PNPM_DIR" && mkdir -p "$PNPM_DIR/bin"
    curl -fsSL "https://registry.npmjs.org/pnpm/-/pnpm-$PNPM_VER.tgz" \
      | tar -xz -C "$PNPM_DIR" --strip-components=1 \
      || error "Could not download pnpm $PNPM_VER."
    printf '#!/bin/sh\nexec node "%s/bin/pnpm.cjs" "$@"\n' "$PNPM_DIR" > "$PNPM_DIR/bin/pnpm"
    chmod +x "$PNPM_DIR/bin/pnpm"
  fi
  export PATH="$PNPM_DIR/bin:$PATH"
  info "  pnpm $(pnpm -v) [ok]"
}

# ─────────────────────────────────────────────────────────
#  2. Install dependencies & build
# ─────────────────────────────────────────────────────────
install_and_build() {
  cd "$APP_DIR"

  # Always run: dependencies change between versions, and pnpm finishes in
  # seconds when nothing changed.
  info "Installing dependencies..."
  pnpm install --frozen-lockfile

  # Rebuild when artifacts are missing or older than any source change
  if [ -f ".next/BUILD_ID" ] && [ -f "dist/index.js" ]; then
    if [ -z "$(find src server public package.json pnpm-lock.yaml next.config.ts -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
      info "Build artifacts are up to date — skipping build."
      return
    fi
    warn "Source changed since the last build — rebuilding..."
  else
    info "No build artifacts found — building..."
  fi

  info "Building application..."
  rm -rf .next
  pnpm build
}

# ─────────────────────────────────────────────────────────
#  3. Configure settings & database
# ─────────────────────────────────────────────────────────
setup_config() {
  mkdir -p "$CONFIG_DIR/db" "$CONFIG_DIR/logs"

  if [ ! -f "$CONFIG_DIR/settings.json" ]; then
    info "Creating default settings.json..."
    cat > "$CONFIG_DIR/settings.json" <<- 'EOF'
{
 "main": {
  "apiKey": "",
  "applicationTitle": "Seearr",
  "applicationUrl": "http://localhost:5055",
  "cacheImages": false,
  "defaultPermissions": 1,
  "hideAvailable": false,
  "localLogin": true,
  "partialRequestsEnabled": true,
  "enableSpecialEpisodes": false,
  "locale": "en",
  "youtubeUrl": ""
 },
 "public": {
  "initialized": false
 }
}
EOF
    info "Created $CONFIG_DIR/settings.json"
  else
    info "settings.json already exists."
  fi
}

# ─────────────────────────────────────────────────────────
#  4. Print info
# ─────────────────────────────────────────────────────────
print_done() {
  cat <<- EOF

 ─────────────────────────────────────────────────
  Setup complete!
 ─────────────────────────────────────────────────

  App directory: $APP_DIR
  Config:        $CONFIG_DIR/settings.json
  Database:      $CONFIG_DIR/db/db.sqlite3 (auto-created on first run)

  ── Start ──

    CONFIG_DIRECTORY="$CONFIG_DIR" \\
    NODE_ENV=production \\
    PORT=5055 \\
    node dist/index.js

  ── Or with env file ──

    # .env
    NODE_ENV=production
    PORT=5055
    CONFIG_DIRECTORY=$CONFIG_DIR

    node dist/index.js

  ── PostgreSQL (optional) ──

    Add to .env:
      DB_TYPE=postgres
      DB_HOST=localhost
      DB_PORT=5432
      DB_USER=seearr
      DB_PASS=yourpassword
      DB_NAME=seearr

  ─────────────────────────────────────────────────
EOF
}

# ─────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────
main() {
  echo ""
  echo "  ╔══════════════════════════════════════╗"
  echo "  ║        Seearr – Portable Setup       ║"
  echo "  ╚══════════════════════════════════════╝"
  echo ""

  check_prereqs
  install_and_build
  setup_config
  print_done
}

main "$@"
