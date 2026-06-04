import { EndTurnAction } from '@deities/apollo/action-mutators/ActionMutators.tsx';
import executeGameAction from '@deities/apollo/actions/executeGameAction.tsx';
import mapWithAIPlayers from '@deities/apollo/lib/mapWithAIPlayers.tsx';
import { Barracks, Factory, HQ, House } from '@deities/athena/info/Building.tsx';
import { HeavyTank, Infantry, SmallTank } from '@deities/athena/info/Unit.tsx';
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
  createRoguelikeRunTelemetry,
  generateRewardChoices,
  getMinimumHQDistance,
  getRoguelikeRewardPool,
  getRoguelikeMapSize,
  hasWellSeparatedHQs,
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
  expect(run.unlockedUnitIds).toContain(Infantry.id);
  expect(run.unlockedUnitIds).toEqual([Infantry.id]);
  expect(getRoguelikeMapSize(run.battle).width).toBe(8);
  expect(getRoguelikeMapSize(run.battle).height).toBe(6);
  expect(run.unlockedBuildingIds.length).toBeGreaterThan(0);
  expect(campaignMap.config.blocklistedUnits.size).toBeGreaterThan(0);
  expect(campaignMap.config.blocklistedBuildings.size).toBeGreaterThan(0);
  expect(hasWellSeparatedHQs(campaignMap)).toBe(true);
  expect(validatedMap).toBeTruthy();

  const hqs = [...campaignMap.buildings.entries()]
    .filter(([, building]) => building.info.isHQ())
    .map(([vector]) => vector);
  expect(hqs).toHaveLength(2);
  expect(hqs[0].distance(hqs[1])).toBeGreaterThanOrEqual(getMinimumHQDistance(campaignMap));

  for (const playerId of campaignMap.active) {
    const ownedBuildings = [...campaignMap.buildings.values()].filter(
      (building) => building.player === playerId,
    );
    expect(ownedBuildings.filter((building) => building.info === HQ)).toHaveLength(1);
    expect(ownedBuildings.filter((building) => building.info === House)).toHaveLength(1);
    expect(
      ownedBuildings.every((building) => building.info === HQ || building.info === House),
    ).toBe(true);
  }

  const neutralEconomyBuildings = [...campaignMap.buildings.values()].filter(
    (building) => building.player === 0 && building.info.configuration.funds > 0,
  );
  expect(neutralEconomyBuildings.length).toBeGreaterThan(0);

  for (const unitId of run.unlockedUnitIds) {
    expect(campaignMap.config.blocklistedUnits.has(unitId)).toBe(false);
  }
  expect(campaignMap.config.blocklistedBuildings.has(Barracks.id)).toBe(true);
  expect(campaignMap.config.blocklistedBuildings.has(Factory.id)).toBe(true);

  const map = applyRunPlayerBonuses(
    startGame(mapWithAIPlayers(applyRunPlayerIdentity(campaignMap, localUserId, run))),
    run,
  );

  expect(campaignMap.config.seedCapital).toBe(100);
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
    unitId: Math.max(...run.unlockedUnitIds) + 1,
    value: Math.max(...run.unlockedUnitIds) + 1,
  };

  expect(choices).toHaveLength(3);
  expect(choices.some((reward) => reward.buildingId === Barracks.id)).toBe(true);
  expect(
    choices.every(
      (reward) => reward.unitId == null || !run.unlockedUnitIds.includes(reward.unitId),
    ),
  ).toBe(true);

  const rewardedRun = applyReward(run, unitReward);
  expect(rewardedRun.unlockedUnitIds).toContain(unitReward.unitId);
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

test('roguelike reward pools are phased for tactical short runs', () => {
  const earlyRun = createInitialRoguelikeRun();
  const earlyPool = getRoguelikeRewardPool(earlyRun);
  expect(earlyPool.some((reward) => reward.buildingId === Barracks.id)).toBe(true);
  expect(earlyPool.some((reward) => reward.unitId === SmallTank.id)).toBe(true);
  expect(earlyPool.some((reward) => reward.buildingId === Factory.id)).toBe(false);
  expect(earlyPool.some((reward) => reward.unitId === HeavyTank.id)).toBe(false);

  const midRun = { ...earlyRun, battle: 3, unlockedBuildingIds: [House.id, Barracks.id] };
  const midPool = getRoguelikeRewardPool(midRun);
  expect(midPool.some((reward) => reward.buildingId === Barracks.id)).toBe(false);
  expect(midPool.some((reward) => reward.buildingId === Factory.id)).toBe(true);
  expect(midPool.some((reward) => reward.unitId === HeavyTank.id)).toBe(false);

  const lateRun = {
    ...midRun,
    battle: 6,
    unlockedBuildingIds: [House.id, Barracks.id, Factory.id],
  };
  const latePool = getRoguelikeRewardPool(lateRun);
  expect(latePool.some((reward) => reward.unitId === HeavyTank.id)).toBe(true);
});

test('roguelike boss battle has valid spacing, stronger AI pressure, and telemetry', () => {
  const run = {
    ...createInitialRoguelikeRun(),
    battle: 6,
    node: 'boss' as const,
    unlockedBuildingIds: [House.id, Barracks.id, Factory.id],
    unlockedUnitIds: [Infantry.id, SmallTank.id, HeavyTank.id],
  };
  const [bossMap] = createRoguelikeCampaignBattle(run);
  const [validatedMap] = validateMap(bossMap, AIRegistry);

  expect(validatedMap).toBeTruthy();
  expect(hasWellSeparatedHQs(bossMap)).toBe(true);
  expect(getRoguelikeMapSize(run.battle).width).toBe(18);
  expect(getRoguelikeMapSize(run.battle).height).toBe(12);
  expect(
    [...bossMap.units.values()].some((unit) => unit.player > 1 && unit.info === HeavyTank),
  ).toBe(true);
  for (const playerId of bossMap.active) {
    expect(
      [...bossMap.buildings.values()].some(
        (building) => building.player === playerId && building.info === Factory,
      ),
    ).toBe(true);
  }
  expect(bossMap.config.blocklistedBuildings.has(Factory.id)).toBe(false);

  const telemetry = createRoguelikeRunTelemetry(run, bossMap, {
    outcome: 'win',
    rewardChosen: 'test',
    turnsToWin: 12,
  });
  expect(telemetry).toMatchObject({
    battle: 6,
    mapSize: '18x12',
    node: 'boss',
    outcome: 'win',
    rewardChosen: 'test',
    turnsToWin: 12,
    unlockedBuildings: 3,
    unlockedUnits: 3,
  });
});
