# Open Wars audio

## Sound effects

Gameplay SFX live in `sfx/` as WAV files (and optionally OGG/AAC when `ffmpeg` is available during generation).

**Step 1 — action catalog:** [`actionCatalog.ts`](actionCatalog.ts) lists every gameplay action (weapons, movement types, turn change, UI, etc.) and its `SoundName`.

**Step 2 — sound design:** [`proceduralProfiles.ts`](proceduralProfiles.ts) defines a distinct profile per weapon and vehicle; [`synthesize.ts`](synthesize.ts) bakes them to WAV.

```bash
pnpm audio:generate
pnpm audio:verify
```

`manifest.ts` maps each `SoundName` to bundled assets. Missing files fall back to the same synthesis in `AudioPlayer`.

## Music

Music tracks in `ui/Audio.tsx` still use placeholder `Empty.ogg` / `Empty.aac` files until separately licensed tracks are added.
