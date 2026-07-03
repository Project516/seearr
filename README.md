<p align="center">
<img src="./public/logo_full.svg" alt="Seearr" style="margin: 20px 0;">
</p>
<p align="center">
<a href="https://github.com/seerr-team/seerr"><img src="https://img.shields.io/badge/upstream-seerr--team%2Fseerr-blue" alt="Based on"></a>
<a href="https://github.com/Project516/seearr/blob/seearr/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/seerr-team/seerr"></a>
</p>

**Seearr** is a fork of [Seerr](https://github.com/seerr-team/seerr) stripped down to a **Radarr/Sonarr-only media request manager**. No Plex, no Jellyfin, no Emby — just discover new media via TMDb and add it to your *arr services.

Designed for bare-metal self-hosting — no Docker required.

## What's different from Seerr

- **Plex, Jellyfin & Emby removed** — all related code, auth, scanners, settings, and UI stripped out
- **Radarr & Sonarr only** — discover via TMDb, request to your *arr services
- **No media server dependency** — no library scanning, no deep links, no watchlist sync
- **No Docker dependency** — run directly on bare metal
- **Portable** — config and data live in the same directory as the app
- **Auto-synced with upstream** — daily CI checks for new seerr-team/seerr releases

## Getting Started

```bash
git clone https://github.com/Project516/seearr.git
cd seearr
bash start.sh
```

The `start.sh` script will:
1. Check prerequisites (Node.js 22+, pnpm)
2. Install dependencies and build
3. Create a default `config/settings.json`
4. Start the server on port 5055

Or run setup and start separately:

```bash
bash setup.sh    # install + build only
bash start.sh    # run setup + start
```

Open http://localhost:5055 in your browser. The setup wizard will:
1. Create your admin account
2. Configure Radarr & Sonarr connections

### Quick start (manual)

```bash
CONFIG_DIRECTORY="$PWD/config" \
NODE_ENV=production \
PORT=5055 \
node dist/index.js
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5055` | HTTP port |
| `CONFIG_DIRECTORY` | `./config` | Path to config folder |
| `DB_TYPE` | `sqlite` | `sqlite` or `postgres` |
| `DB_HOST` | — | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | — | PostgreSQL user |
| `DB_PASS` | — | PostgreSQL password |
| `DB_NAME` | `seerr` | PostgreSQL database name |
| `HOST` | — | Listen address (e.g. `0.0.0.0`) |
| `API_KEY` | — | Override auto-generated API key |

## Updating

This fork auto-syncs with upstream via a daily CI workflow. When seerr-team/seerr publishes a new release, a PR is automatically created with the changes. Review and merge it.

To update manually:

```bash
git fetch upstream develop
git merge upstream/develop
# Resolve conflicts (if any) and commit
```

## Requirements

- **Node.js** 22+
- **pnpm** 10+
- **SQLite** (default) or **PostgreSQL** (optional)
- **Radarr** (for movies)
- **Sonarr** (for TV series)

## Features

- TMDb-powered discovery (trending, popular, genres, upcoming)
- Radarr & Sonarr integration (add movies/TV to download queue)
- SQLite & PostgreSQL support
- Customizable request system (per-season or full)
- Granular permission system
- Notification agents (Discord, Telegram, Email, Pushover, etc.)
- Blocklisting
- Mobile-friendly UI
- Full REST API (docs at `/api-docs`)
- Scheduled jobs (library scans, download sync, availability sync)

## Upstream

This project is a fork of [seerr-team/seerr](https://github.com/seerr-team/seerr). All credits to the original Seerr team.
