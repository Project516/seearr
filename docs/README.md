---
slug: /
sidebar_position: 1
---

# Introduction

Welcome to the Seearr Documentation.

**Seearr** is a free and open source media request manager for **Radarr and Sonarr**. It discovers content via TMDb and sends requests to your *arr services, with no media server required.

This is a fork of [Seerr](https://github.com/seerr-team/seerr) that removes Plex, Jellyfin, and Emby to create a lightweight, focused request management tool.

## Features

- **Discover via TMDb**. Browse and search movies and TV shows from The Movie Database.
- **Integrates with Radarr and Sonarr**. Send requests directly to your *arr services.
- **No media server required**. Lightweight and focused on request management.
- Supports Movies and TV Shows.
- Optionally set **Override rules** for requests to match with your defined conditions.
- **Easy to use request system** allowing users to request individual seasons or movies in a friendly, clean UI.
- **Simple request management UI**. Don't dig through the app to approve recent requests.
- **Mobile-friendly design**, for when you need to approve requests on the go.
- Granular permission system.
- Localization into other languages.
- Support for **PostgreSQL** and **SQLite** databases.
- Support for various notification agents.
- Easily **Watchlist** or **Blocklist** media.
- More features to come!

## About This Fork

Seearr strips away media server integrations (Plex, Jellyfin, Emby) to focus purely on the request workflow: discover content, send to Radarr/Sonarr, and track status. This makes it lighter, simpler to set up, and easier to maintain.

It also adds a portable bare-metal setup (`setup.sh` and `start.sh`), a first-run wizard that creates your admin account without any media server sign-in, and multi-arch Docker images published to GitHub Container Registry.

The fork tracks upstream [Seerr](https://github.com/seerr-team/seerr) closely. A daily GitHub Actions workflow merges new upstream commits, so fixes and features from Seerr land here shortly after release.

Based on [Seerr](https://github.com/seerr-team/seerr) v3.4.1.
