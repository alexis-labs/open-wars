# Roguelike Campaign Technical Summary

## Current Game Systems

- The offline app is a React/Vite shell in `offline/index.tsx`. Its local battle screen renders the existing `hera` `GameMap`, `MapInfo`, and `GameActions` components.
- Quick Play currently creates a procedural validated skirmish in `offline/createQuickPlaySkirmish.tsx` using `athena` map generation helpers: random terrain, generated HQs, production buildings, houses, roads, rivers, sea, biome conversion, modifiers, and map validation.
- Tactical state is owned by `athena` `MapData`: tiles, modifiers, config, teams, players, buildings, units, objectives, current player, round, fog, seed capital, blocklists, and biome.
- Battles start through `startGame`, which applies seed capital, initial charge, beginning funds, unit recovery, building recovery, unit naming, and seen-state updates.
- Local player setup converts the current placeholder player into a `HumanPlayer`; remaining placeholders are converted to bots by `apollo/lib/mapWithAIPlayers`.
- AI selection is data-driven through `dionysus/AIRegistry`. The default AI is `DionysusAlpha`, with harder/internal AI classes already registered.
- Units and buildings are catalog-driven in `athena/info/Unit.tsx` and `athena/info/Building.tsx`. Costs, buildable unit sets, movement types, attack profiles, abilities, building funds, healing, and creation rules live in those info objects.
- Production restrictions already exist through map config blocklists: `blocklistedUnits` and `blocklistedBuildings`. Unit production checks `getBuildableUnits`, while building creation checks `canBuild`.
- Player passives and unlocks already exist as `Skill`s in `athena/info/Skill.tsx`. Skills can unlock units/buildings, adjust attack/defense, change unit cost, alter movement/range, add recovery/charge effects, and set AI difficulty modifiers.
- Economy is based on building fund values, map multiplier, and seed capital. `calculateFunds` feeds turn income and `startGame` grants opening funds.
- Victory is engine-side. Default objectives end battles when players lose HQ/production/unit viability; action execution emits `GameEnd` with the winning player, which the offline shell already detects for campaign completion.

## Roguelike Integration Direction

- Keep tactical simulation and rendering unchanged.
- Add a serializable run layer in the offline package that chooses battle maps, applies blocklists/skills/bonuses, generates reward cards, advances nodes, and stores meta progression.
- Use existing blocklists for restricted starting production.
- Use existing skills for most combat, production, strategic, and special passive reward effects.
- Use browser storage for current run, tactical save, and permanent meta progression.
