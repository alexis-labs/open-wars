# Indice do Projeto

Este ficheiro e um mapa rapido para navegar pelo monorepo. O projeto e um fork de Open Wars baseado no open core de Athena Crisis, com foco atual em jogo local, single-player e offline-first.

## Por Onde Comecar

- `AGENTS.md`: direcao atual do fork, notas de Windows, comandos recomendados e limites importantes para desenvolvimento.
- `README.md`: contexto upstream do Athena Crisis, setup basico e explicacao dos pacotes.
- `offline/`: shell de producao do Open Wars, PWA/mobile e fluxo offline.
- `docs/`: documentacao e playground interativo; melhor lugar para prototipos e exploracao visual.
- `athena/`, `apollo/`, `hera/`, `ui/`: caminho principal para entender regras, estado, motor cliente e interface.

## Mapa Mental

Leia o motor nesta ordem quando estiver a investigar uma mecanica de jogo:

1. `athena/`: regras e estruturas de mapa, terreno, unidades, edificios, fundos, visao e validacao de mapa.
2. `apollo/`: estado de jogo, acoes, respostas de acoes, turnos, objetivos e aplicacao de regras em partidas.
3. `hera/`: motor cliente, renderizacao, interacoes, comportamentos, editor de mapa e UI especifica do jogo.
4. `ui/`: design system compartilhado, controles, icones, audio e hooks de interface.

Pacotes auxiliares:

- `dionysus/`: inteligencia artificial.
- `hermes/`: campanhas, fixtures, turn state e conversoes para estado de cliente.
- `art/`: assets, sprites, variantes e resolucao local/CDN.
- `i18n/`: internacionalizacao.
- `codegen/`: geradores para actions, rotas, GraphQL e traducoes.
- `infra/`: plugins e configuracoes de build/teste compartilhadas.

## Apps e Superficies

- `offline/index.tsx`: entrada React do shell de producao offline.
- `offline/index.html`: HTML do shell offline.
- `offline/starterMap.tsx`: mapa inicial usado pelo shell offline.
- `offline/public/`: manifest, service worker e icones PWA.
- `offline/PRODUCTION.md`: guia de producao/release do shell offline.
- `docs/content/playground/ClientComponent.tsx`: hub do playground interativo.
- `docs/content/playground/PlaygroundMainMenu.tsx`: menu principal do playground.
- `docs/content/pages/`: paginas MDX da documentacao.
- `docs/vocs.config.ts`: configuracao Vocs da documentacao.
- `docs/vite.config.ts`: Vite do playground/docs, incluindo compatibilidade Windows.

## Diretorios de Topo

- `.github/workflows/`: CI e checks de producao.
- `apollo/`: regras de jogo e action pipeline.
- `ares/`: placeholder upstream para cliente privado; em geral ignore neste fork.
- `art/`: camada de assets.
- `artemis/`: placeholder upstream para API privada; em geral ignore neste fork.
- `athena/`: regras e estruturas de mapa.
- `codegen/`: geracao de codigo.
- `deimos/`: placeholder upstream para splash/site privado.
- `dionysus/`: IA.
- `docs/`: docs e playground.
- `eslint-plugin/`: regras locais de lint.
- `fixtures/`: mapas e dados de exemplo do fork.
- `git-hooks/`: hooks configurados pelo `preinstall`.
- `hera/`: motor cliente, renderizacao e editor.
- `hermes/`: estruturas de campanha e estado de turno.
- `i18n/`: traducoes.
- `offline/`: app offline-first do Open Wars.
- `patches/`: patches aplicados pelo pnpm.
- `scripts/`: scripts de build, verificacao e assets.
- `tests/`: testes e2e/visuais.
- `ui/`: componentes e utilitarios de UI compartilhados.
- `zeus/`: placeholder/area upstream para benchmarks de IA.

## Ficheiros Ancora

Motor e regras:

- `athena/MapData.tsx`: estrutura central do mapa.
- `athena/lib/startGame.tsx`: inicializacao de jogo a partir de mapa.
- `athena/info/Unit.tsx`: definicoes de unidades.
- `apollo/Action.tsx`: tipos de acoes.
- `apollo/actions/executeGameAction.tsx`: execucao de acoes.
- `apollo/actions/validateAction.tsx`: validacao de acoes.
- `apollo/ActionMap.json`: mapa gerado de actions.
- `apollo/ConditionMap.json`: mapa gerado de conditions.
- `hera/GameMap.tsx`: componente/mapa principal do cliente.
- `hera/render/Images.tsx`: resolucao de imagens e sprites.
- `hera/ui/GameActions.tsx`: UI de acoes do jogo.
- `hermes/game/toClientGame.tsx`: conversao para estado de cliente.
- `hermes/game/undo.tsx`: suporte de undo/turn state.

Producao offline:

- `offline/package.json`: scripts do shell offline.
- `offline/vite.config.ts`: build Vite do shell offline.
- `scripts/build-offline.mjs`: build de producao e copia para alvos mobile/electron.
- `scripts/verify-production.mjs`: verificacoes de release.
- `offline/release-checklist.json`: checklist automatizavel de release.
- `offline/capacitor.config.json`: configuracao mobile Capacitor.

Testes:

- `vitest.config.ts`: configuracao raiz de testes.
- `tests/setup.tsx`: setup global.
- `tests/viteServer.tsx`: servidor Vite usado pelos testes.
- `tests/playwrightServer.tsx`: servidor/browser para screenshots.
- `tests/__tests__/`: testes e2e/visuais.
- `athena/**/__tests__/`, `apollo/__tests__/`, `dionysus/__tests__/`, `hermes/__tests__/`: testes por pacote.

## Comandos Frequentes

No Windows, o projeto espera Node `>=23`. Se necessario, prependa o Node portatil indicado em `AGENTS.md` antes de correr comandos.

```powershell
$env:Path="$env:LOCALAPPDATA\Programs\node-v24.16.0-win-x64;$env:Path"
```

Setup inicial:

```powershell
corepack pnpm install
corepack pnpm dev:setup
```

Docs e playground:

```powershell
corepack pnpm --dir docs dev
```

Shell offline:

```powershell
corepack pnpm --dir offline dev
```

Checks principais:

```powershell
corepack pnpm tsc:check
corepack pnpm lint
corepack pnpm test
```

Producao offline:

```powershell
corepack pnpm verify:production
corepack pnpm build:offline
```

Geracao de codigo:

```powershell
corepack pnpm codegen
```

## Quando Rodar Codegen

Use `corepack pnpm codegen` quando alterar:

- definicoes de actions;
- action responses;
- rotas/schemas relacionados;
- dados gerados de campanhas ou traducoes.

Revise os ficheiros gerados antes de manter o diff. Exemplos comuns incluem `apollo/ActionMap.json` e `apollo/ConditionMap.json`.

## Fluxos de Trabalho

Para prototipar uma funcionalidade:

1. Explore primeiro em `docs/content/playground/`.
2. Encontre a regra em `athena/` ou `apollo/`.
3. Ligue a interacao em `hera/` ou `ui/`.
4. Integre no shell final em `offline/` apenas quando o fluxo estiver estavel.
5. Adicione ou atualize testes focados perto do pacote afetado.

Para mexer em gameplay:

1. Comece por `athena/` se a mudanca envolve mapa, terreno, unidades, edificios ou validacao.
2. Va para `apollo/` se envolve turnos, actions, objectives ou resposta a comandos.
3. Ajuste `hera/` quando a mudanca precisa de input, renderizacao, animacao ou feedback visual.
4. Atualize `docs/` ou `offline/` conforme a superficie onde a feature aparece.

Para preparar release offline:

1. Verifique `offline/PRODUCTION.md`.
2. Rode `corepack pnpm verify:production`.
3. Rode `corepack pnpm build:offline`.
4. Confirme PWA, service worker, manifest e ausencia de referencias indevidas a Athena Crisis.

## Notas Importantes

- O codigo e MIT, mas conteudo do Athena Crisis como arte, musica, historia, personagens, descricoes e branding nao e open source.
- Antes de distribuir um jogo proprio, substitua assets e referencias especificas do Athena Crisis.
- `ares/`, `artemis/`, `deimos/` e parte de `zeus/` sao placeholders neste fork; evite depender deles para Open Wars.
- O foco atual e single-player local. Evite introduzir contas, backend, realtime ou multiplayer antes do loop offline estar solido.
- Em Windows, preserve a compatibilidade existente em `docs/vite.config.ts` salvo se validar a substituicao.
