# Seearr

Seearr is a request manager for Radarr and Sonarr. Users browse movies and series from TMDB, request them, and Radarr or Sonarr downloads them. It is a fork of [Seerr](https://github.com/seerr-team/seerr) without media server integration: no Plex, Jellyfin or Emby, local accounts only.

## Direction

- Runs well on low-end hardware such as a Raspberry Pi. Prefer work that adds no memory, CPU or extra services; reuse the TMDB, Radarr and Sonarr connections the app already has.
- Stays easy to update from upstream. Prefer new fork-owned files over edits to upstream files, and keep unavoidable upstream edits small. Fork-maintained files belong in `.github/fork-owned`.
- Two install paths are first class: the Docker image (`ghcr.io/project516/seearr`) and bare metal (`setup.sh`, `start.sh`). An update must not break either; the `E2E upgrade` job checks the upgrade path.
- Simple over clever. No AI models in the product.

## Working in this repo

- Node 22 and pnpm. Before a PR: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm i18n:extract` when UI strings change.
- The server validates every request against `seerr-api.yml`. New routes and query parameters need a spec entry.
- PRs that change the UI need screenshots in the description; the PR Checks workflow enforces it.
- Merge upstream syncs with a merge commit, never a squash, so upstream history stays intact.

## Glossary

- **Upstream:** seerr-team/seerr. Syncs track its latest stable release.
- **Sync PR:** the pull request the Upstream Sync workflow opens for each new upstream release.
- **Fork-owned file:** a file listed in `.github/fork-owned`; on a sync conflict it keeps the fork's version.
- **Library:** media that Radarr or Sonarr has downloaded (status available or partially available).
- **Seed:** a recent request or library title that the recommendations start from.
