<!--
Title: a conventional commit in plain language, e.g. "fix(library): keep loaded titles when a page fails".
One change per PR. Link the issue with "Closes #N" when there is one.
-->

## Description

<!-- What changed and why. -->

## How Has This Been Tested?

<!-- The checks you ran and what you saw. Say what you could not check. -->

## Screenshots

<!--
Required when the PR changes the UI (anything under src/ outside src/i18n/).
Add before and after screenshots, plus a short recording when motion or interaction matters.
Upload them to GitHub and embed them here; do not commit PR-only assets.
-->

## Checklist

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass
- [ ] `pnpm i18n:extract` was run if UI strings changed
- [ ] Docs are updated if behavior changed
