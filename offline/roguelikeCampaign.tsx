import { type MapMetadata } from '@deities/apollo/MapMetadata.tsx';
import {
  generateBuildings,
  generateRandomMap,
  generateSea,
} from '@deities/athena/generator/MapGenerator.tsx';
import {
  filterBuildings,
  getAllBuildings,
  getBuildingInfoOrThrow,
} from '@deities/athena/info/Building.tsx';
import { Skill } from '@deities/athena/info/Skill.tsx';
import { getAllUnits, getUnitInfoOrThrow } from '@deities/athena/info/Unit.tsx';
import updatePlayer from '@deities/athena/lib/updatePlayer.tsx';
import validateMap from '@deities/athena/lib/validateMap.tsx';
import withModifiers from '@deities/athena/lib/withModifiers.tsx';
import { Biome, Biomes } from '@deities/athena/map/Biome.tsx';
import { Charge } from '@deities/athena/map/Configuration.tsx';
import Player, { HumanPlayer } from '@deities/athena/map/Player.tsx';
import MapData, { SizeVector } from '@deities/athena/MapData.tsx';
import starterMap, { starterMapMetadata } from './starterMap.tsx';

export type RewardRarity = 'common' | 'epic' | 'legendary' | 'rare';
export type RoguelikeNodeType =
  | 'boss'
  | 'elite'
  | 'event'
  | 'normal'
  | 'rest'
  | 'shop'
  | 'treasure';

export type RewardCard = Readonly<{
  amount?: number;
  description: string;
  id: string;
  rarity: RewardRarity;
  skill?: Skill;
  title: string;
  type: 'building' | 'combat' | 'economy' | 'passive' | 'production' | 'strategic' | 'unit';
  value?: number;
}>;

export type RoguelikeMetaProgression = Readonly<{
  bestBattle: number;
  experience: number;
  level: number;
  victories: number;
}>;

export type RoguelikeRunState = Readonly<{
  battle: number;
  battleLimit: number;
  economyBonus: number;
  extraRewardChoices: number;
  id: string;
  initialChargeBonus: number;
  metaLevelAtStart: number;
  node: RoguelikeNodeType;
  rewardHistory: ReadonlyArray<string>;
  seedCapitalBonus: number;
  skills: ReadonlyArray<Skill>;
  status: 'active' | 'defeat' | 'victory';
  unlockedBuildingIds: ReadonlyArray<number>;
  unlockedUnitIds: ReadonlyArray<number>;
  version: 1;
}>;

const validationRegistry = {
  has: () => false,
};

const defaultAI = 0;
const hardAI = 1;
const campaignBiomes = Biomes.filter((biome) => biome !== Biome.Spaceship);
const nodeBattleTypes = new Set<RoguelikeNodeType>(['boss', 'elite', 'normal']);
const defaultMetaProgression: RoguelikeMetaProgression = {
  bestBattle: 0,
  experience: 0,
  level: 1,
  victories: 0,
};

const skillRewards: ReadonlyArray<{
  description: string;
  rarity: RewardRarity;
  skill: Skill;
  title: string;
  type: RewardCard['type'];
}> = [
  {
    description: 'Your army deals a little more damage for the rest of this run.',
    rarity: 'common',
    skill: Skill.AttackIncreaseMinor,
    title: 'Sharpened Tactics',
    type: 'combat',
  },
  {
    description: 'Your units take a little less damage for the rest of this run.',
    rarity: 'common',
    skill: Skill.DefenseIncreaseMinor,
    title: 'Field Discipline',
    type: 'combat',
  },
  {
    description: 'Unit prices drop, but your forces accept a small combat tradeoff.',
    rarity: 'rare',
    skill: Skill.DecreaseUnitCostAttackAndDefenseDecreaseMinor,
    title: 'Lean Logistics',
    type: 'production',
  },
  {
    description: 'Ground vehicles move farther, but lose a little protection.',
    rarity: 'rare',
    skill: Skill.MovementIncreaseGroundUnitDefenseDecrease,
    title: 'Rapid Deployment',
    type: 'strategic',
  },
  {
    description: 'Long-range ground fire becomes more flexible once the power is charged.',
    rarity: 'rare',
    skill: Skill.ArtilleryRangeIncrease,
    title: 'Fire Support Doctrine',
    type: 'combat',
  },
  {
    description: 'Your counterattacks become much more dangerous when activated.',
    rarity: 'epic',
    skill: Skill.CounterAttackPower,
    title: 'Return Fire',
    type: 'combat',
  },
  {
    description: 'Recover some value from lost units during the run.',
    rarity: 'epic',
    skill: Skill.CostRecovery,
    title: 'Salvage Crews',
    type: 'passive',
  },
  {
    description: 'Start each battle with more charge toward your powers.',
    rarity: 'legendary',
    skill: Skill.Charge,
    title: 'Stored Momentum',
    type: 'passive',
  },
];

export function createInitialRoguelikeRun(
  meta: RoguelikeMetaProgression = defaultMetaProgression,
): RoguelikeRunState {
  const basicUnitIds = getBasicUnitIds();
  const basicBuildingIds = getBasicBuildingIds();
  return {
    battle: 1,
    battleLimit: 6,
    economyBonus: 0,
    extraRewardChoices: 0,
    id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    initialChargeBonus: meta.level >= 2 ? 1 : 0,
    metaLevelAtStart: meta.level,
    node: 'normal',
    rewardHistory: [],
    seedCapitalBonus: meta.level >= 4 ? 100 : 0,
    skills: [],
    status: 'active',
    unlockedBuildingIds: basicBuildingIds,
    unlockedUnitIds: basicUnitIds,
    version: 1,
  };
}

export function createRoguelikeCampaignBattle(run: RoguelikeRunState): [MapData, MapMetadata] {
  for (let attempt = 0; attempt < 8; attempt++) {
    const [map] = validateMap(applyRunToMap(createProceduralMap(run), run), validationRegistry);
    if (map) {
      return [map, getRoguelikeMetadata(run)];
    }
  }

  return [applyRunToMap(starterMap, run), getRoguelikeMetadata(run, starterMapMetadata.name)];
}

export function getRoguelikeMetadata(
  run: RoguelikeRunState,
  fallbackName = 'Roguelike Campaign',
): MapMetadata {
  return {
    name: `${fallbackName}: ${formatNodeType(run.node)} ${run.battle}`,
    tags: ['open-wars', 'roguelike-campaign', run.node],
    teamPlay: false,
  };
}

export function applyRunPlayerBonuses(map: MapData, run: RoguelikeRunState): MapData {
  const player = map.getPlayers().find((player) => player.isHumanPlayer());
  if (!player) {
    return map;
  }

  return map.copy({
    teams: updatePlayer(
      map.teams,
      player.copy({
        charge: player.charge + run.initialChargeBonus * Charge,
        funds: player.funds + run.seedCapitalBonus,
        skills: new Set(run.skills),
      }),
    ),
  });
}

export function applyRunPlayerIdentity(
  map: MapData,
  userId: string,
  run: RoguelikeRunState | null,
): MapData {
  const human = HumanPlayer.from(map.getCurrentPlayer(), userId);
  return map.copy({
    teams: updatePlayer(
      map.teams,
      run
        ? human.copy({
            skills: new Set(run.skills),
          })
        : human,
    ),
  });
}

export function generateRewardChoices(
  run: RoguelikeRunState,
  count = getRewardChoiceCount(run),
): ReadonlyArray<RewardCard> {
  const rewards = getRewardPool(run);
  const selected = new Map<string, RewardCard>();
  let attempts = 0;

  while (selected.size < Math.min(count, rewards.length) && attempts++ < 200) {
    const rarity = rollRarity(run);
    const matchingRewards = rewards.filter((reward) => reward.rarity === rarity);
    const reward = randomEntry(matchingRewards.length ? matchingRewards : rewards);
    if (reward && !selected.has(reward.id)) {
      selected.set(reward.id, reward);
    }
  }

  return [...selected.values()];
}

export function applyReward(run: RoguelikeRunState, reward: RewardCard): RoguelikeRunState {
  const rewardHistory = [...run.rewardHistory, reward.id];
  switch (reward.type) {
    case 'unit':
      return {
        ...run,
        rewardHistory,
        unlockedUnitIds: addUnique(run.unlockedUnitIds, reward.value),
      };
    case 'building':
      return {
        ...run,
        rewardHistory,
        unlockedBuildingIds: addUnique(run.unlockedBuildingIds, reward.value),
      };
    case 'combat':
    case 'production':
    case 'strategic':
      return {
        ...run,
        rewardHistory,
        skills: reward.skill ? addUnique(run.skills, reward.skill) : run.skills,
      };
    case 'economy':
      return {
        ...run,
        economyBonus: run.economyBonus + (reward.amount || 0),
        rewardHistory,
        seedCapitalBonus: run.seedCapitalBonus + (reward.amount || 0),
      };
    case 'passive':
      return reward.skill
        ? {
            ...run,
            rewardHistory,
            skills: addUnique(run.skills, reward.skill),
          }
        : {
            ...run,
            initialChargeBonus: run.initialChargeBonus + (reward.amount || 0),
            rewardHistory,
          };
    default: {
      reward.type satisfies never;
      return run;
    }
  }
}

export function advanceRunAfterReward(run: RoguelikeRunState): RoguelikeRunState {
  const battle = run.battle + 1;
  if (battle > run.battleLimit) {
    return {
      ...run,
      battle: run.battleLimit,
      node: 'boss',
      status: 'victory',
    };
  }

  return {
    ...run,
    battle,
    node: getNodeForBattle(battle, run.battleLimit),
  };
}

export function resolveNonBattleNode(run: RoguelikeRunState): RoguelikeRunState {
  switch (run.node) {
    case 'event':
      return {
        ...run,
        seedCapitalBonus: run.seedCapitalBonus + 75,
      };
    case 'rest':
      return {
        ...run,
        initialChargeBonus: run.initialChargeBonus + 1,
      };
    case 'shop':
      return {
        ...run,
        seedCapitalBonus: run.seedCapitalBonus + 125,
      };
    case 'treasure':
      return {
        ...run,
        seedCapitalBonus: run.seedCapitalBonus + 150,
      };
    case 'boss':
    case 'elite':
    case 'normal':
      return run;
    default: {
      run.node satisfies never;
      return run;
    }
  }
}

export function advancePastNonBattleNode(run: RoguelikeRunState): RoguelikeRunState {
  if (isBattleNode(run.node)) {
    return run;
  }

  return {
    ...resolveNonBattleNode(run),
    node: getBattleNodeForBattle(run.battle, run.battleLimit),
  };
}

export function recordRunFinished(
  meta: RoguelikeMetaProgression,
  run: RoguelikeRunState,
  didWin: boolean,
): RoguelikeMetaProgression {
  const experience = meta.experience + run.battle * 25 + (didWin ? 150 : 0);
  return {
    bestBattle: Math.max(meta.bestBattle, run.battle),
    experience,
    level: Math.max(meta.level, 1 + Math.floor(experience / 250)),
    victories: meta.victories + (didWin ? 1 : 0),
  };
}

export function normalizeRunState(run: RoguelikeRunState | null): RoguelikeRunState | null {
  if (!run || run.version !== 1 || run.status !== 'active') {
    return null;
  }

  return {
    ...run,
    economyBonus: Number.isSafeInteger(run.economyBonus) ? run.economyBonus : 0,
    extraRewardChoices: Number.isSafeInteger(run.extraRewardChoices) ? run.extraRewardChoices : 0,
    initialChargeBonus: Number.isSafeInteger(run.initialChargeBonus) ? run.initialChargeBonus : 0,
    rewardHistory: Array.isArray(run.rewardHistory) ? run.rewardHistory : [],
    seedCapitalBonus: Number.isSafeInteger(run.seedCapitalBonus) ? run.seedCapitalBonus : 0,
    skills: normalizeNumbers(run.skills) as ReadonlyArray<Skill>,
    unlockedBuildingIds: normalizeNumbers(run.unlockedBuildingIds),
    unlockedUnitIds: normalizeNumbers(run.unlockedUnitIds),
  };
}

export function normalizeMetaProgression(
  meta: RoguelikeMetaProgression | null,
): RoguelikeMetaProgression {
  if (!meta) {
    return defaultMetaProgression;
  }

  return {
    bestBattle: Math.max(0, Math.floor(meta.bestBattle || 0)),
    experience: Math.max(0, Math.floor(meta.experience || 0)),
    level: Math.max(1, Math.floor(meta.level || 1)),
    victories: Math.max(0, Math.floor(meta.victories || 0)),
  };
}

export function formatNodeType(node: RoguelikeNodeType) {
  switch (node) {
    case 'boss':
      return 'Boss Battle';
    case 'elite':
      return 'Elite Battle';
    case 'event':
      return 'Event';
    case 'normal':
      return 'Battle';
    case 'rest':
      return 'Recovery';
    case 'shop':
      return 'Shop';
    case 'treasure':
      return 'Treasure';
    default: {
      node satisfies never;
      return 'Battle';
    }
  }
}

export function isBattleNode(node: RoguelikeNodeType) {
  return nodeBattleTypes.has(node);
}

export function getRewardChoiceCount(run: RoguelikeRunState) {
  return 3;
}

export function getBasicUnitIds(): ReadonlyArray<number> {
  const player = createCatalogPlayer();
  const units = getAllUnits().filter((unit) => unit.getCostFor(player) < Number.POSITIVE_INFINITY);
  const cheapest = Math.min(...units.map((unit) => unit.getCostFor(player)));
  return units.filter((unit) => unit.getCostFor(player) === cheapest).map((unit) => unit.id);
}

export function getBasicBuildingIds(): ReadonlyArray<number> {
  const buildings = filterBuildings(
    (building) =>
      building.configuration.canBeCreated &&
      building.getCostFor(null) < Number.POSITIVE_INFINITY &&
      (building.configuration.funds > 0 || building.canBuildUnits()),
  );
  const economyBuildings = buildings.filter((building) => building.configuration.funds > 0);
  const productionBuildings = buildings.filter((building) => building.canBuildUnits());
  const cheapestEconomy = Math.min(
    ...economyBuildings.map((building) => building.getCostFor(null)),
  );
  const cheapestProduction = Math.min(
    ...productionBuildings.map((building) => building.getCostFor(null)),
  );
  return [
    ...new Set([
      ...economyBuildings
        .filter((building) => building.getCostFor(null) === cheapestEconomy)
        .map((building) => building.id),
      ...productionBuildings
        .filter((building) => building.getCostFor(null) === cheapestProduction)
        .map((building) => building.id),
    ]),
  ];
}

function getRewardPool(run: RoguelikeRunState): ReadonlyArray<RewardCard> {
  const unlockedUnits = new Set(run.unlockedUnitIds);
  const unlockedBuildings = new Set(run.unlockedBuildingIds);
  const skills = new Set(run.skills);
  const unitRewards = getAllUnits()
    .filter((unit) => unit.getCostFor(createCatalogPlayer()) < Number.POSITIVE_INFINITY)
    .filter((unit) => !unlockedUnits.has(unit.id))
    .map<RewardCard>((unit) => ({
      description: `Add ${unit.name} to your allowed production list for this run.`,
      id: `unit-${unit.id}`,
      rarity: rarityForCost(unit.getCostFor(createCatalogPlayer())),
      title: `Unlock ${unit.name}`,
      type: 'unit',
      value: unit.id,
    }));
  const buildingRewards = getAllBuildings()
    .filter(
      (building) =>
        building.configuration.canBeCreated &&
        building.getCostFor(null) < Number.POSITIVE_INFINITY &&
        !unlockedBuildings.has(building.id),
    )
    .map<RewardCard>((building) => ({
      description: `Allow your builder-capable units to create ${building.name}.`,
      id: `building-${building.id}`,
      rarity: rarityForCost(building.getCostFor(null) * 2),
      title: `Unlock ${building.name}`,
      type: 'building',
      value: building.id,
    }));
  const availableSkillRewards = skillRewards
    .filter((reward) => !skills.has(reward.skill))
    .map<RewardCard>((reward) => ({
      ...reward,
      id: `skill-${reward.skill}`,
    }));
  const economyRewards: ReadonlyArray<RewardCard> = [
    {
      amount: 100 + run.battle * 25,
      description: 'Start each remaining battle with more funds.',
      id: `economy-${run.battle}-common`,
      rarity: 'common',
      title: 'Supply Cache',
      type: 'economy',
    },
    {
      amount: 200 + run.battle * 40,
      description: 'Start each remaining battle with a much larger treasury.',
      id: `economy-${run.battle}-rare`,
      rarity: 'rare',
      title: 'Forward Depot',
      type: 'economy',
    },
  ];
  const passiveRewards: ReadonlyArray<RewardCard> = [
    {
      amount: 1,
      description: 'Start future battles with more charge toward your powers.',
      id: `passive-choice-${run.battle}`,
      rarity: 'epic',
      title: 'Reserve Batteries',
      type: 'passive',
    },
  ];

  return [
    ...unitRewards,
    ...buildingRewards,
    ...availableSkillRewards,
    ...economyRewards,
    ...passiveRewards,
  ];
}

function applyRunToMap(map: MapData, run: RoguelikeRunState): MapData {
  const allUnitIds = getAllUnits().map((unit) => unit.id);
  const allBuildingIds = getAllBuildings()
    .filter((building) => building.configuration.canBeCreated)
    .map((building) => building.id);
  const unlockedUnits = new Set(run.unlockedUnitIds);
  const unlockedBuildings = new Set(run.unlockedBuildingIds);
  const blocklistedUnits = new Set(allUnitIds.filter((id) => !unlockedUnits.has(id)));
  const blocklistedBuildings = new Set(allBuildingIds.filter((id) => !unlockedBuildings.has(id)));
  const difficulty = getDifficulty(run);

  return map.copy({
    config: map.config.copy({
      blocklistedBuildings,
      blocklistedSkills: new Set(),
      blocklistedUnits,
      initialCharge: Math.max(0, map.config.initialCharge + run.initialChargeBonus),
      multiplier: Math.max(1, map.config.multiplier + run.economyBonus / 1000),
      seedCapital: map.config.seedCapital + Math.floor(run.seedCapitalBonus / 2),
    }),
    teams: map.teams.map((team) =>
      team.copy({
        players: team.players.map((player) => applyDifficultyToPlayer(player, difficulty)),
      }),
    ),
  });
}

function applyDifficultyToPlayer(player: Player, difficulty: number): Player {
  if (player.id <= 1) {
    return player;
  }

  const ai = difficulty >= 5 ? hardAI : defaultAI;
  return player.copy({
    ai,
    funds: player.funds + difficulty * 75,
    skills:
      difficulty >= 4
        ? new Set([...player.skills, Skill.AttackAndDefenseIncreaseHard])
        : player.skills,
  });
}

function createProceduralMap(run: RoguelikeRunState) {
  const height = randomInteger(10, Math.min(15, 12 + Math.floor(run.battle / 2)));
  const width = randomInteger(height + 2, Math.min(18, 15 + Math.floor(run.battle / 2)));
  const size = new SizeVector(width, height);
  return withModifiers(generateSea(generateBuildings(generateRandomMap(size), campaignBiomes)));
}

function getNodeForBattle(battle: number, battleLimit: number): RoguelikeNodeType {
  if (battle === battleLimit) {
    return 'boss';
  }
  if (battle > 1 && battle % 3 === 0) {
    return 'elite';
  }

  const roll = Math.random();
  if (roll < 0.12) {
    return 'treasure';
  }
  if (roll < 0.22) {
    return 'event';
  }
  if (roll < 0.3) {
    return 'rest';
  }
  if (roll < 0.36) {
    return 'shop';
  }
  return 'normal';
}

function getBattleNodeForBattle(battle: number, battleLimit: number): RoguelikeNodeType {
  if (battle === battleLimit) {
    return 'boss';
  }
  return battle > 1 && battle % 3 === 0 ? 'elite' : 'normal';
}

function getDifficulty(run: RoguelikeRunState) {
  const nodeBonus = run.node === 'boss' ? 4 : run.node === 'elite' ? 2 : 0;
  return run.battle + nodeBonus;
}

function rollRarity(run: RoguelikeRunState): RewardRarity {
  const legendaryChance = Math.min(0.08, 0.02 + run.battle * 0.006);
  const epicChance = Math.min(0.2, 0.08 + run.battle * 0.012);
  const rareChance = Math.min(0.35, 0.22 + run.battle * 0.01);
  const roll = Math.random();
  if (roll < legendaryChance) {
    return 'legendary';
  }
  if (roll < legendaryChance + epicChance) {
    return 'epic';
  }
  if (roll < legendaryChance + epicChance + rareChance) {
    return 'rare';
  }
  return 'common';
}

function rarityForCost(cost: number): RewardRarity {
  if (cost >= 1800) {
    return 'legendary';
  }
  if (cost >= 1000) {
    return 'epic';
  }
  if (cost >= 500) {
    return 'rare';
  }
  return 'common';
}

function createCatalogPlayer() {
  return new HumanPlayer(
    1,
    'catalog',
    1,
    0,
    undefined,
    new Set(),
    new Set(),
    0,
    null,
    0,
    null,
    null,
  );
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEntry<T>(items: ReadonlyArray<T>): T | null {
  return items[Math.floor(Math.random() * items.length)] || null;
}

function addUnique<T>(items: ReadonlyArray<T>, item: T | undefined): ReadonlyArray<T> {
  return item != null && !items.includes(item) ? [...items, item] : items;
}

function normalizeNumbers(items: ReadonlyArray<number> | undefined): ReadonlyArray<number> {
  return Array.isArray(items) ? items.filter((item) => Number.isSafeInteger(item) && item > 0) : [];
}

export function describeRunUnlocks(run: RoguelikeRunState): string {
  const unitNames = run.unlockedUnitIds.map((id) => getUnitInfoOrThrow(id).name);
  const buildingNames = run.unlockedBuildingIds.map((id) => getBuildingInfoOrThrow(id).name);
  return `${unitNames.length} units, ${buildingNames.length} buildings`;
}
