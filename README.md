<p align="center">
<img src="./public/logo_full.svg" alt="Seearr" style="margin: 20px 0;">
</p>
<p align="center">
<a href="https://github.com/seerr-team/seerr"><img src="https://img.shields.io/badge/upstream-seerr--team%2Fseerr-blue" alt="Based on"></a>
<a href="https://github.com/Project516/seearr/blob/master/LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/github/license/Project516/seearr"></a>
</p>

**Seearr** is a fork of [Seerr](https://github.com/seerr-team/seerr) stripped down to a **Radarr/Sonarr-only media request manager**. No Plex, no Jellyfin, no Emby. Discover new media via TMDb and add it to your *arr services.

Designed for bare-metal self-hosting first. Multi-arch Docker images (amd64 and arm64) are also published to GHCR.

## Recommendations for every user

The Discover page has two rows built for whoever is signed in:

- **Recommended For You**: titles TMDB recommends for your recent requests and for what Radarr and Sonarr have downloaded. A title recommended for several of them ranks higher.
- **New For You**: the same list, limited to titles released in the last 180 days.

There is nothing to set up. The rows appear once the user has made a request or Radarr or Sonarr has downloaded something. They use the TMDB connection Seearr already has, with no extra service, API key or AI model. See [how titles are picked](https://seearr.project516.dev/using-seerr/recommendations).

![Discover page with Recommended For You and New For You rows](docs/images/discover-recommendations.jpg)

## Library

The Library page lists every movie and series Radarr and Sonarr have downloaded, and you can filter it by media type and sort it by date added or last updated. See [the Library docs](https://seearr.project516.dev/using-seerr/library).

![Library page showing downloaded movies and series](docs/images/library.jpg)

## What's different from Seerr

- **Plex, Jellyfin & Emby removed.** Their sign-in, scanners, settings and UI are gone
- **Radarr & Sonarr only.** Discover via TMDb, request to your *arr services
- **No media server dependency.** The library comes from Radarr and Sonarr. No deep links, no Plex watchlist sync
- **Personal recommendations.** [Recommended For You and New For You](#recommendations-for-every-user) rows on Discover, built from each user's requests and the library
- **Library page.** [Everything Radarr and Sonarr have downloaded](#library) in one list
- **First-run wizard.** Create your admin account without a media server sign-in
- **Portable.** Config and data live in the same directory as the app
- **Follows upstream releases.** A daily workflow opens a pull request for each new stable Seerr release

## Getting Started

You need Node.js 22+, pnpm 10+, and Radarr or Sonarr. On bare metal:

```bash
git clone https://github.com/Project516/seearr.git
cd seearr
./start.sh
```

`start.sh` installs dependencies, builds, and serves Seearr at http://localhost:5055, where the setup wizard creates your admin account and connects Radarr and Sonarr. To update, run `git pull` and `./start.sh` again.

Prefer Docker? Images for amd64 and arm64 are at `ghcr.io/project516/seearr:latest`; see the [Docker guide](https://seearr.project516.dev/getting-started/docker).

The [documentation](https://seearr.project516.dev/getting-started) covers both install paths, running as a service, PostgreSQL, environment variables and reverse proxies.

## Features

- TMDb-powered discovery (trending, popular, genres, upcoming)
- Radarr & Sonarr integration (add movies/TV to download queue)
- Personal "Recommended For You" and "New For You" rows on Discover
- Library page listing everything Radarr and Sonarr have downloaded
- SQLite & PostgreSQL support
- Customizable request system (per-season or full)
- Override rules that set the quality profile, root folder or tags based on the requesting user, genre, language or keywords
- Granular permission system
- Notification agents (Discord, Telegram, Email, Pushover, etc.)
- Blocklisting
- Mobile-friendly UI
- Full REST API (docs at `/api-docs`)
- Scheduled jobs (Radarr and Sonarr scans, download sync, availability sync)

## Support

- Read the [Seearr documentation](https://seearr.project516.dev) first. Your question might already be answered.
- Report bugs and request features in [GitHub Issues](https://github.com/Project516/seearr/issues).
- The API docs are served by your own install at http://localhost:5055/api-docs.

## Upstream

This project is a fork of [seerr-team/seerr](https://github.com/seerr-team/seerr). All credits to the original Seerr team.

## License

Seearr as a whole is licensed under the [GNU Affero General Public License v3.0 only](LICENSE) (AGPL-3.0-only). The fork's own changes are available only under that license.

The code that comes from Seerr stays under the [MIT License](LICENSE-MIT), copyright (c) 2020 sct, and you can still use those parts under MIT. Keep `LICENSE-MIT` with any copy of Seearr.

If you run a modified Seearr for other people over a network, the AGPL requires you to offer them the source of your version. The "Source code" links in the sidebar and on Settings > About point at this repository. Change `SOURCE_URL` in `src/components/Layout/SourceLink/index.tsx` to point them at yours.
