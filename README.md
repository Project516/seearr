<p align="center">
<img src="./public/logo_full.svg" alt="Seearr" style="margin: 20px 0;">
</p>
<p align="center">
<a href="https://github.com/seerr-team/seerr"><img src="https://img.shields.io/badge/upstream-seerr/v3.3.0-blue" alt="Based on"></a>
<a href="https://github.com/Project516/seearr/blob/main/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/seerr-team/seerr"></a>
</p>

**Seearr** is a fork of [Seerr v3.3.0](https://github.com/seerr-team/seerr) with Jellyfin and Emby removed. It integrates with **[Plex](https://plex.tv)** as the media server and **[Sonarr](https://sonarr.tv/)** / **[Radarr](https://radarr.video/)** for media management.

Designed for bare-metal self-hosting — no Docker required.

## What's different from Seerr

- **Jellyfin & Emby removed** — all related code, auth, scanners, settings, and UI stripped out
- **Plex remains** as the supported media server
- **No Docker dependency** — run directly on bare metal
- **Portable** — config and data live in the same directory as the app

## Getting Started

```bash
git clone https://github.com/Project516/seearr.git
cd seearr
bash setup.sh
```

The setup script will:
1. Check prerequisites (Node.js 22+, pnpm)
2. Install dependencies and build
3. Create a default `config/settings.json`
4. Print instructions to start the server

Then start the server:

```bash
NODE_ENV=production PORT=5055 node dist/index.js
```

Open http://localhost:5055 in your browser and complete the setup wizard.

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

## Updating to future upstream releases

This fork tracks upstream seerr. Since it's based on the `v3.3.0` tag with full git history, you can merge upstream releases:

```bash
git remote add upstream https://github.com/seerr-team/seerr.git
git fetch upstream --tags
git checkout seearr-v3.3.0
git merge v3.4.0   # or whatever the latest tag is
# Resolve conflicts (if any) and commit
```

## Requirements

- **Node.js** 22+
- **pnpm** 10+
- **SQLite** (default) or **PostgreSQL** (optional)

## Current Features

- Plex integration (authentication, user import, library scan)
- Radarr & Sonarr integration
- SQLite & PostgreSQL support
- Movies, TV shows, and mixed libraries
- Customizable request system (per-season or full)
- Granular permission system
- Notification agents (Discord, Telegram, Email, Pushover, etc.)
- Watchlisting & blocklisting
- Mobile-friendly UI
- Full REST API (docs at `/api-docs`)
- Scheduled jobs (library scans, download sync, availability sync)

## Upstream

This project is a fork of [seerr-team/seerr](https://github.com/seerr-team/seerr). All credits to the original Seerr team.
