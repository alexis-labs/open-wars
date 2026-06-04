import { EndTurnAction } from '@deities/apollo/action-mutators/ActionMutators.tsx';
import executeGameAction from '@deities/apollo/actions/executeGameAction.tsx';
import mapWithAIPlayers from '@deities/apollo/lib/mapWithAIPlayers.tsx';
import startGame from '@deities/athena/lib/startGame.tsx';
import updatePlayer from '@deities/athena/lib/updatePlayer.tsx';
import validateMap from '@deities/athena/lib/validateMap.tsx';
import { Biome } from '@deities/athena/map/Biome.tsx';
import { HumanPlayer } from '@deities/athena/map/Player.tsx';
import AIRegistry from '@deities/dionysus/AIRegistry.tsx';
import { expect, test } from 'vitest';
import createQuickPlaySkirmish from '../../offline/createQuickPlaySkirmish.tsx';
import {
  applyReward,
  applyRunPlayerBonuses,
  applyRunPlayerIdentity,
  createInitialRoguelikeRun,
  createRoguelikeCampaignBattle,
  generateRewardChoices,
  recordRunFinished,
  type RewardCard,
} from '../../offline/roguelikeCampaign.tsx';

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

test('roguelike campaign starts with restricted production and advances through the AI turn', async () => {
  const run = createInitialRoguelikeRun();
  const [campaignMap, metadata] = createRoguelikeCampaignBattle(run);
  const [validatedMap] = validateMap(campaignMap, AIRegistry);

  expect(metadata.tags).toContain('roguelike-campaign');
  expect(run.unlockedUnitIds.length).toBeGreaterThan(0);
  expect(run.unlockedBuildingIds.length).toBeGreaterThan(0);
  expect(campaignMap.config.blocklistedUnits.size).toBeGreaterThan(0);
  expect(campaignMap.config.blocklistedBuildings.size).toBeGreaterThan(0);
  expect(validatedMap).toBeTruthy();

  for (const unitId of run.unlockedUnitIds) {
    expect(campaignMap.config.blocklistedUnits.has(unitId)).toBe(false);
  }

  const map = applyRunPlayerBonuses(
    startGame(mapWithAIPlayers(applyRunPlayerIdentity(campaignMap, localUserId, run))),
    run,
  );

  expect(map.getCurrentPlayer().isHumanPlayer()).toBe(true);
  expect(map.getCurrentPlayer().skills).toEqual(new Set(run.skills));

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

test('roguelike reward choices apply run-only progression and meta progress survives defeat', () => {
  const run = createInitialRoguelikeRun();
  const choices = generateRewardChoices(run);
  const unitReward: RewardCard = {
    description: 'Test unlock',
    id: 'test-unit-unlock',
    rarity: 'common',
    title: 'Unlock Test Unit',
    type: 'unit',
    value: Math.max(...run.unlockedUnitIds) + 1,
  };

  expect(choices).toHaveLength(3);

  const rewardedRun = applyReward(run, unitReward);
  expect(rewardedRun.unlockedUnitIds).toContain(unitReward.value);
  expect(rewardedRun.rewardHistory).toContain(unitReward.id);

  const defeatedMeta = recordRunFinished(
    { bestBattle: 0, experience: 0, level: 1, victories: 0 },
    rewardedRun,
    false,
  );
  expect(defeatedMeta.experience).toBeGreaterThan(0);
  expect(defeatedMeta.bestBattle).toBe(rewardedRun.battle);
  expect(defeatedMeta.victories).toBe(0);
});
