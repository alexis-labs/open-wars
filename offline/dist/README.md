# Sprites descarregados (offline)

Cópias locais dos PNGs em `https://art.athenacrisis.com/v19/`.

## Descarregar

```bash
pnpm download:sprites
```

## Uso automático no jogo

Se existir `art/downloaded/v19/`, o Vite serve estes ficheiros em `/v19/...` e o jogo deixa de ir ao CDN (ver `art/AssetInfo.tsx` e `infra/localArtPlugin.ts`).

- Forçar local: `VITE_USE_LOCAL_ART=1`
- Forçar CDN: `VITE_USE_LOCAL_ART=0`

## Estrutura

- `assets/` — ataques, UI, tiles, sombras (`hera/render/Images.tsx`)
- Raiz de `v19/` — variantes por jogador/bioma (`Units-Infantry-0.png`, etc.)

## Licença

A arte da Athena Crisis não é open source; uso apenas para desenvolvimento local do teu fork (`LICENSE.md`).
