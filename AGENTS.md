# Open Wars Agent Guide

This repository is a fork of `alexis-labs/open-wars`, based on the open-source Athena Crisis codebase. The working goal is to build a custom turn-based strategy game inspired by Advance Wars, starting with local single-player only and leaving multiplayer for later.

## Current Direction

- Prioritize a local, offline-first single-player loop before touching accounts, backend, realtime, or multiplayer.
- Use the existing engine packages as the base instead of rewriting the game from scratch.
- Replace proprietary Athena Crisis content over time: art, music, story, characters, unit descriptions, names, and any brand-specific references.
- Keep changes incremental and easy to test in the docs/playground first.

## Environment

- Use Windows-compatible commands unless the current shell is explicitly bash.
- The repo expects Node `>=23`. On this machine, a portable Node is installed at:
  `C:\Users\amartinho\AppData\Local\Programs\node-v24.16.0-win-x64`
- Before running project commands in PowerShell, prepend that Node to `PATH`:

```powershell
$env:Path="$env:LOCALAPPDATA\Programs\node-v24.16.0-win-x64;$env:Path"
```

- The project uses `pnpm`. Prefer `corepack pnpm` if the global `pnpm` version is wrong.
- For package scripts on Windows, Git Bash should be configured as the npm script shell:

```powershell
npm config set script-shell "C:\Program Files\git\bin\bash.exe"
```

## Common Commands

Install dependencies:

```powershell
$env:Path="$env:LOCALAPPDATA\Programs\node-v24.16.0-win-x64;$env:Path"
corepack pnpm install
```

Generate project files:

```powershell
$env:Path="$env:LOCALAPPDATA\Programs\node-v24.16.0-win-x64;$env:Path"
corepack pnpm dev:setup
```

Run the docs and playground:

```powershell
$env:Path="$env:LOCALAPPDATA\Programs\node-v24.16.0-win-x64;$env:Path"
corepack pnpm --dir docs dev
```

Open:

```text
http://localhost:3003/open-source/
```

Run checks when making core changes:

```powershell
$env:Path="$env:LOCALAPPDATA\Programs\node-v24.16.0-win-x64;$env:Path"
corepack pnpm test
```

For smaller changes, prefer targeted commands such as `corepack pnpm tsc:check`, `corepack pnpm lint`, or relevant `vitest` tests.

## Important Packages

- `athena`: map state, terrain, units, funds, buildings, and map-level rules.
- `apollo`: game state, actions, action responses, turns, and higher-level gameplay state.
- `hera`: client game engine and rendering.
- `ui`: shared design system and reusable UI pieces.
- `dionysus`: AI logic.
- `hermes`: campaign-related structures. Useful later, but avoid coupling early single-player work to campaign systems.
- `docs`: docs and interactive playground. Best first integration surface.
- `codegen`: generated action/route/schema/translation helpers. Run `corepack pnpm codegen` after changing action or response definitions.
- `ares` and `artemis`: mostly placeholders in this open-source repo; avoid depending on private app/server code.

## Development Strategy

1. Explore through `docs/content/playground` before creating a separate app shell.
2. Get one local skirmish flow working: choose map, start game, select unit, move/attack/capture, end turn, basic win condition.
3. Keep the first version fully local. Persist saves in browser storage only after the basic loop is stable.
4. Add AI as the first opponent before adding network multiplayer.
5. Add multiplayer later by isolating deterministic game actions and replaying them over a transport layer.

## Codegen Notes

Run codegen when changing:

- action definitions
- action responses
- route/schema-related generated files
- campaign name generated data

Command:

```powershell
$env:Path="$env:LOCALAPPDATA\Programs\node-v24.16.0-win-x64;$env:Path"
corepack pnpm codegen
```

Generated files can include maps such as `apollo/ActionMap.json` and `apollo/ConditionMap.json`. Review generated diffs carefully and only keep them when they correspond to intentional source changes.

## Windows Notes

- The docs playground uses Vocs/Waku/Vite and has had Windows path issues. A local compatibility plugin in `docs/vite.config.ts` normalizes malformed Vocs imports such as `C:Users...`.
- Do not remove that Windows compatibility code unless the underlying dependency is upgraded and verified on Windows.
- First load of `/open-source/` can take 30 seconds or more while Vocs builds the search index and Vite compiles RSC modules.

## Content And Licensing

- The code is MIT-licensed, but Athena Crisis content is not open source.
- Before publishing a custom game, replace Athena Crisis-specific assets, unit descriptions, characters, story, music, branding, and remote asset references.
- Pay special attention to `hera/render/Images.tsx` and `athena/info/Unit.tsx` when removing upstream content.
- Local sprites: run `pnpm download:sprites` once. If `art/downloaded/v19/` exists, dev servers use `/v19/...` from disk instead of the CDN (`art/AssetInfo.tsx`, `infra/localArtPlugin.ts`). Force CDN with `VITE_USE_LOCAL_ART=0`.

## Agent Working Rules

- Read existing code before editing; this monorepo has strong local patterns.
- Prefer small, reversible changes.
- Do not introduce multiplayer, backend, login, payments, or account assumptions during the first single-player phase.
- Do not rewrite generated files manually unless the generator is unavailable and the change is clearly mechanical.
- Do not revert user changes. Check `git status --short --branch` before and after edits.
- Use `rg` / `rg --files` for exploration.
- When changing gameplay rules, add or update focused tests near the affected package.
- Keep new abstractions close to existing package boundaries: map rules in `athena`, game actions in `apollo`, rendering in `hera`, interface in `ui` or `docs`.

## Immediate Next Ideas

- Map the docs playground entry points and identify the smallest local skirmish screen.
- Find how sample maps are loaded and define a custom starter map.
- Trace a basic move action from UI selection through `apollo` action application.
- Document the action pipeline before changing rules.
- Create a dedicated `open-wars` playground page once the existing flow is understood.
