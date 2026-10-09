# Contributing to Seearr

Seearr is a fork of [Seerr](https://github.com/seerr-team/seerr) for Radarr and Sonarr only. It runs without a media server, with local accounts, and with a bare-metal setup that also suits low-end hardware such as a Raspberry Pi.

## Getting started

You need Node 22 and [pnpm](https://pnpm.io/installation).

```bash
git clone https://github.com/Project516/seearr.git
cd seearr
pnpm install
pnpm dev
```

The app runs at http://localhost:5055. Data lives in `config/`, or in `CONFIG_DIRECTORY` when it is set.

## Making a change

1. Branch from `master`. Keep one change per pull request.
2. Run the checks CI runs:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm format:check
   pnpm test
   ```

3. If you changed UI strings, run `pnpm i18n:extract` and commit the updated `src/i18n/locale/en.json`.
4. The browser smoke tests in `e2e/` run in CI against a production build. To run them locally, build and start the app, then run `pnpm install`, `pnpm exec playwright install chromium` and `pnpm test` inside `e2e/`.
5. Open a pull request and fill in the template:
   - Titles follow [Conventional Commits](https://www.conventionalcommits.org/), for example `fix(library): keep loaded titles when a page fails`.
   - Pull requests that change the UI must include before and after screenshots, and a short recording when motion or interaction matters. A check fails the pull request without them.

`master` is protected. Pull requests merge once CI passes, including the end-to-end and upgrade tests.

## Working with upstream

Upstream Seerr releases are merged in by the Upstream Sync workflow. Two habits keep those merges clean:

- Prefer new files over edits to upstream files. A new route, component or migration of our own rarely conflicts, and an edited upstream line can conflict on every sync.
- Files the fork deleted stay deleted on sync, and the files listed in `.github/fork-owned` keep the fork's version on conflict. Add a file to that list when the fork maintains it independently.

## Migrations

If you are adding a new feature that requires a database migration, you will need to create 2 migrations: one for SQLite and one for PostgreSQL. Here is how you could do it:

1. Create a PostgreSQL database or use an existing one:

```bash
sudo docker run --name postgres-seerr -e POSTGRES_PASSWORD=postgres -d -p 127.0.0.1:5432:5432/tcp postgres:latest
```

2. Reset the SQLite database and the PostgreSQL database:

```bash
rm config/db/db.*
rm config/settings.*
PGPASSWORD=postgres sudo docker exec -it postgres-seerr /usr/bin/psql -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS seerr;"
PGPASSWORD=postgres sudo docker exec -it postgres-seerr /usr/bin/psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE seerr;"
```

3. Switch to the `master` branch and create the original database for SQLite and PostgreSQL so that TypeORM can automatically generate the migrations:

```bash
git switch master
pnpm i
rm -r .next dist; pnpm build
pnpm start
DB_TYPE="postgres" DB_USER=postgres DB_PASS=postgres pnpm start
```

(You can shutdown the server once the message "Server ready on 5055" appears)

4. Let TypeORM generate the migrations:

```bash
git switch -c your-feature-branch
pnpm i
pnpm migration:generate server/migration/sqlite/YourMigrationName
DB_TYPE="postgres" DB_USER=postgres DB_PASS=postgres pnpm migration:generate server/migration/postgres/YourMigrationName
```
