import { EndTurnAction } from '@deities/apollo/action-mutators/ActionMutators.tsx';
import executeGameAction from '@deities/apollo/actions/executeGameAction.tsx';
import mapWithAIPlayers from '@deities/apollo/lib/mapWithAIPlayers.tsx';
import validateMap from '@deities/athena/lib/validateMap.tsx';
import startGame from '@deities/athena/lib/startGame.tsx';
import updatePlayer from '@deities/athena/lib/updatePlayer.tsx';
import { Biome } from '@deities/athena/map/Biome.tsx';
import { HumanPlayer } from '@deities/athena/map/Player.tsx';
import AIRegistry from '@deities/dionysus/AIRegistry.tsx';
import { expect, test } from 'vitest';
import createQuickPlaySkirmish from '../../offline/createQuickPlaySkirmish.tsx';

const localUserId = 'open-wars-local-player';

test('offline quickplay creates a procedural map and advances through the AI turn', async () => {
  const [quickPlayMap, metadata] = createQuickPlaySkirmish();
  const [secondQuickPlayMap] = createQuickPlaySkirmish();
  const [validatedMap] = validateMap(quickPlayMap, AIRegistry);

  expect(metadata.tags).toContain('quick-play');
  expect(quickPlayMap).not.toBe(secondQuickPlayMap);
  expect(quickPlayMap.size.width).toBeGreaterThanOrEqual(10);
  expect(quickPlayMap.size.width).toBeLessThanOrEqual(15);
  expect(quickPlayMap.size.height).toBeGreaterThanOrEqual(10);
  expect(quickPlayMap.size.height).toBeLessThanOrEqual(12);
  expect(quickPlayMap.size.width).toBeGreaterThan(quickPlayMap.size.height);
  expect(quickPlayMap.config.biome).not.toBe(Biome.Spaceship);
  expect(validatedMap).toBeTruthy();

  const map = startGame(
    mapWithAIPlayers(
      quickPlayMap.copy({
        teams: updatePlayer(
          quickPlayMap.teams,
          HumanPlayer.from(quickPlayMap.getCurrentPlayer(), localUserId),
        ),
      }),
    ),
  );

  const [actionResponse, activeMap, gameState] = await executeGameAction(
    map,
    map.createVisionObject(map.getCurrentPlayer()),
    new Map(),
    EndTurnAction(),
    AIRegistry,
  );

  expect(actionResponse?.type).toBe('EndTurn');
  expect(activeMap?.getCurrentPlayer().isBot()).toBe(true);
  expect(gameState?.at(-1)?.[1].getCurrentPlayer().isHumanPlayer()).toBe(true);
});
