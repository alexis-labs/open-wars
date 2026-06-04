# Open Wars Production Target

The `offline` package is the production shell for Open Wars on web and mobile. The docs playground remains available for experimentation, but the shippable app starts here.

## Build Targets

- Web/PWA: `corepack pnpm --dir offline build`
- Web and mobile/electron release bundle: `corepack pnpm build:offline`
- Mobile wrapper: use `offline/capacitor.config.json` after `dist/offline` exists.

## Required Verification

Before release:

1. Run `corepack pnpm install --no-frozen-lockfile` if dependencies are missing.
2. Run `corepack pnpm verify:production`.
3. Run `corepack pnpm build:offline`.
4. Run `corepack pnpm --dir offline preview` and verify:
   - main menu renders on desktop and mobile widths
   - `Quick play` starts a new local skirmish
   - `Continue` resumes a versioned local save after reload
   - `Delete Save` removes the local save
   - `options` toggles sound/fullscreen and returns to menu
   - PWA manifest loads
   - service worker registers without console errors
   - installable browsers expose `Install App`
   - service worker updates expose `Update App`
5. Build and smoke test the mobile wrapper with the generated `dist/offline` assets.

The same release gates are tracked in `offline/release-checklist.json` for agents and CI scripts.
Pull requests also run `.github/workflows/production.yml`, which installs dependencies, runs `verify:production`, and builds/copies the `offline` web/mobile shell with `build:offline`.

`verify:production` checks that:

- required production shell files exist
- forbidden upstream/demo references are absent from `offline`
- the starter map tile count matches its declared size
- the starter map includes both players
- manifest icons resolve to real files
- service worker cached assets resolve to real files
- service worker includes a navigation fallback
- the React root is wrapped in a production error fallback with a reload action
- options expose real sound/fullscreen controls without placeholder copy
- main menu includes `Quick play`, `options`, and `Exit`
- local save uses versioned `MapData` serialization and exposes `Continue`/`Delete Save`
- installable browsers can trigger the native PWA install prompt
- service worker updates can be applied from the menu

## Current Constraints

- The production shell no longer depends on the upstream key art image.
- The first skirmish now uses an Open Wars-owned starter map in `offline/starterMap.tsx`.
- Open Wars ships original CC0 sound effects under `ui/audio/sfx/` (see `ui/audio/LICENSES.md`). Regenerate with `pnpm audio:generate` and verify with `pnpm audio:verify`.
- Proprietary upstream in-game art, unit descriptions, character references, and **background music** remain release blockers before public distribution.
