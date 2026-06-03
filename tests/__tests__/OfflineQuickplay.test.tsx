import { EndTurnAction } from '@deities/apollo/action-mutators/ActionMutators.tsx';
import executeGameAction from '@deities/apollo/actions/executeGameAction.tsx';
import mapWithAIPlayers from '@deities/apollo/lib/mapWithAIPlayers.tsx';
import startGame from '@deities/athena/lib/startGame.tsx';
import updatePlayer from '@deities/athena/lib/updatePlayer.tsx';
import { HumanPlayer } from '@deities/athena/map/Player.tsx';
import AIRegistry from '@deities/dionysus/AIRegistry.tsx';
import { expect, test } from 'vitest';
import starterMap from '../../offline/starterMap.tsx';

const localUserId = 'open-wars-local-player';

test('offline quickplay advances through the AI turn', async () => {
  const map = startGame(
    mapWithAIPlayers(
      starterMap.copy({
        teams: updatePlayer(
          starterMap.teams,
          HumanPlayer.from(starterMap.getCurrentPlayer(), localUserId),
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
