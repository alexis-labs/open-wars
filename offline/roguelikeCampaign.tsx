import dateNow from '@deities/apollo/lib/dateNow.tsx';
import { type MapMetadata } from '@deities/apollo/MapMetadata.tsx';
import {
  generateBuildings,
  generateRandomMap,
  generateSea,
} from '@deities/athena/generator/MapGenerator.tsx';
import {
  Airbase,
  Barracks,
  Factory,
  getAllBuildings,
  getBuildingInfoOrThrow,
  HQ,
  House,
  type BuildingInfo,
  RepairShop,
  Shipyard,
} from '@deities/athena/info/Building.tsx';
import { Skill } from '@deities/athena/info/Skill.tsx';
import { ConstructionSite } from '@deities/athena/info/Tile.tsx';
import {
  AntiAir,
  Artillery,
  HeavyArtillery,
  HeavyTank,
  Humvee,
  Infantry,
  Jeep,
  Medic,
  Pioneer,
  RocketLauncher,
  SmallTank,
  Sniper,
  type UnitInfo,
  getAllUnits,
  getUnitInfoOrThrow,
} from '@deities/athena/info/Unit.tsx';
import canDeploy from '@deities/athena/lib/canDeploy.tsx';
import updatePlayer from '@deities/athena/lib/updatePlayer.tsx';
import validateMap from '@deities/athena/lib/validateMap.tsx';
import withModifiers from '@deities/athena/lib/withModifiers.tsx';
import { Biome, Biomes } from '@deities/athena/map/Biome.tsx';
import { Charge } from '@deities/athena/map/Configuration.tsx';
import Player, { HumanPlayer } from '@deities/athena/map/Player.tsx';
import vec from '@deities/athena/map/vec.tsx';
import Vector from '@deities/athena/map/Vector.tsx';
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
  buildingId?: number;
  description: string;
  id: string;
  rarity: RewardRarity;
  skill?: Skill;
  title: string;
  type: 'building' | 'combat' | 'economy' | 'passive' | 'production' | 'strategic' | 'unit';
  unitId?: number;
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

export type RoguelikeRunTelemetry = Readonly<{
  aiFunds: ReadonlyArray<number>;
  battle: number;
  mapSize: string;
  node: RoguelikeNodeType;
  outcome?: 'loss' | 'win';
  playerFunds: number;
  rewardChosen?: string;
  turnsToWin?: number;
  unlockedBuildings: number;
  unlockedUnits: number;
}>;

type RoguelikePhase = 'early' | 'late' | 'mid';

type RoguelikeBattleProfile = Readonly<{
  aiFunds: number;
  aiStarterUnit: UnitInfo | null;
  minimumNeutralEconomy: number;
  playerProduction: BuildingInfo | null;
  size: SizeVector;
}>;

const validationRegistry = {
  has: () => false,
};

const defaultAI = 0;
const hardAI = 1;
const campaignBiomes = Biomes.filter((biome) => biome !== Biome.Spaceship);
const nodeBattleTypes = new Set<RoguelikeNodeType>(['boss', 'elite', 'normal']);
const roguelikeFirstBattleSeedCapital = 100;
const earlyRewardUnits = [Pioneer, Jeep, RocketLauncher, SmallTank] as const;
const midRewardUnits = [Humvee, Artillery, AntiAir, Sniper, Medic] as const;
const lateRewardUnits = [HeavyTank, HeavyArtillery] as const;
const earlyRewardBuildings = [Barracks] as const;
const midRewardBuildings = [Factory, RepairShop] as const;
const lateRewardBuildings = [] as const;
const unsupportedTacticalShortBuildings = new Set([Airbase.id, Shipyard.id]);
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
    id: `run-${dateNow().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
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
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidateMap = applyRunToMap(shapeRoguelikeMap(createProceduralMap(run), run), run);
    if (!hasWellSeparatedHQs(candidateMap) || !hasEnoughNeutralEconomy(candidateMap, run)) {
      continue;
    }

    const [map] = validateMap(candidateMap, validationRegistry);
    if (map) {
      return [map, getRoguelikeMetadata(run)];
    }
  }

  return [applyRunToMap(starterMap, run), getRoguelikeMetadata(run, starterMapMetadata.name)];
}

export function createRoguelikeRunTelemetry(
  run: RoguelikeRunState,
  map: MapData,
  options: Readonly<{
    outcome?: RoguelikeRunTelemetry['outcome'];
    rewardChosen?: string;
    turnsToWin?: number;
  }> = {},
): RoguelikeRunTelemetry {
  const humanPlayer = map.getPlayers().find((player) => player.isHumanPlayer());
  return {
    aiFunds: map
      .getPlayers()
      .filter((player) => !player.isHumanPlayer())
      .map((player) => player.funds),
    battle: run.battle,
    mapSize: `${map.size.width}x${map.size.height}`,
    node: run.node,
    outcome: options.outcome,
    playerFunds: humanPlayer?.funds || 0,
    rewardChosen: options.rewardChosen,
    turnsToWin: options.turnsToWin,
    unlockedBuildings: run.unlockedBuildingIds.length,
    unlockedUnits: run.unlockedUnitIds.length,
  };
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
  for (const reward of getPriorityRewards(run, rewards)) {
    if (selected.size < count) {
      selected.set(reward.id, reward);
    }
  }

  let attempts = 0;

  while (selected.size < Math.min(count, rewards.length) && attempts++ < 200) {
    const rarity = rollRarity(run);
    const matchingRewards = rewards.filter((reward) => reward.rarity === rarity);
    const reward = randomEntry(matchingRewards.length ? matchingRewards : rewards);
    if (reward && !selected.has(reward.id) && shouldAddRewardChoice(selected, reward, rewards)) {
      selected.set(reward.id, reward);
    }
  }

  if (selected.size < Math.min(count, rewards.length)) {
    for (const reward of sortRewardsForRun(run, rewards)) {
      if (selected.size >= count) {
        break;
      }
      if (!selected.has(reward.id)) {
        selected.set(reward.id, reward);
      }
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
        unlockedUnitIds: addUnique(run.unlockedUnitIds, reward.unitId ?? reward.value),
      };
    case 'building':
      return {
        ...run,
        rewardHistory,
        unlockedBuildingIds: addUnique(run.unlockedBuildingIds, reward.buildingId ?? reward.value),
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
    unlockedUnitIds: addUnique(normalizeNumbers(run.unlockedUnitIds), Infantry.id),
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
  return [Infantry.id];
}

export function getBasicBuildingIds(): ReadonlyArray<number> {
  return [House.id];
}

export function getRoguelikeRewardPool(run: RoguelikeRunState): ReadonlyArray<RewardCard> {
  const unlockedUnits = new Set(run.unlockedUnitIds);
  const unlockedBuildings = new Set(run.unlockedBuildingIds);
  const skills = new Set(run.skills);
  const unitRewards = getRewardUnitsForRun(run)
    .filter((unit) => !unlockedUnits.has(unit.id))
    .map<RewardCard>((unit) => ({
      description: `Add ${unit.name} to your allowed production list for this run.`,
      id: `unit-${unit.id}`,
      rarity: rarityForCost(unit.getCostFor(createCatalogPlayer())),
      title: `Unlock ${unit.name}`,
      type: 'unit',
      unitId: unit.id,
      value: unit.id,
    }));
  const buildingRewards = getRewardBuildingsForRun(run)
    .filter((building) => !unlockedBuildings.has(building.id))
    .map<RewardCard>((building) => ({
      buildingId: building.id,
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

function getRewardPool(run: RoguelikeRunState): ReadonlyArray<RewardCard> {
  return getRoguelikeRewardPool(run);
}

function getRewardUnitsForRun(run: RoguelikeRunState): ReadonlyArray<UnitInfo> {
  const phase = getRoguelikePhase(run);
  switch (phase) {
    case 'early':
      return earlyRewardUnits;
    case 'mid':
      return [...earlyRewardUnits, ...midRewardUnits];
    case 'late':
      return [...earlyRewardUnits, ...midRewardUnits, ...lateRewardUnits];
    default: {
      phase satisfies never;
      return earlyRewardUnits;
    }
  }
}

function getRewardBuildingsForRun(run: RoguelikeRunState): ReadonlyArray<BuildingInfo> {
  const buildings =
    getRoguelikePhase(run) === 'early'
      ? earlyRewardBuildings
      : getRoguelikePhase(run) === 'mid'
        ? [...earlyRewardBuildings, ...midRewardBuildings]
        : [...earlyRewardBuildings, ...midRewardBuildings, ...lateRewardBuildings];
  return buildings.filter(
    (building) =>
      building.configuration.canBeCreated &&
      building.getCostFor(null) < Number.POSITIVE_INFINITY &&
      !unsupportedTacticalShortBuildings.has(building.id),
  );
}

function getPriorityRewards(
  run: RoguelikeRunState,
  rewards: ReadonlyArray<RewardCard>,
): ReadonlyArray<RewardCard> {
  const priorityRewards: Array<RewardCard> = [];
  if (!run.unlockedBuildingIds.includes(Barracks.id)) {
    const barracks = rewards.find((reward) => reward.buildingId === Barracks.id);
    if (barracks) {
      priorityRewards.push(barracks);
    }
  }

  if (run.battle >= 3 && !run.unlockedBuildingIds.includes(Factory.id)) {
    const factory = rewards.find((reward) => reward.buildingId === Factory.id);
    if (factory) {
      priorityRewards.push(factory);
    }
  }

  if (run.unlockedUnitIds.length <= 2) {
    const cheapCombatUnit = rewards.find(
      (reward) => reward.unitId === RocketLauncher.id || reward.unitId === SmallTank.id,
    );
    if (cheapCombatUnit) {
      priorityRewards.push(cheapCombatUnit);
    }
  }

  return priorityRewards;
}

function shouldAddRewardChoice(
  selected: ReadonlyMap<string, RewardCard>,
  reward: RewardCard,
  rewards: ReadonlyArray<RewardCard>,
) {
  const selectedTypes = new Map<RewardCard['type'], number>();
  for (const selectedReward of selected.values()) {
    selectedTypes.set(selectedReward.type, (selectedTypes.get(selectedReward.type) || 0) + 1);
  }

  if ((selectedTypes.get(reward.type) || 0) < 2) {
    return true;
  }

  return rewards
    .filter((availableReward) => !selected.has(availableReward.id))
    .every((availableReward) => availableReward.type === reward.type);
}

function sortRewardsForRun(
  run: RoguelikeRunState,
  rewards: ReadonlyArray<RewardCard>,
): ReadonlyArray<RewardCard> {
  const priorities = new Map(
    getPriorityRewards(run, rewards).map((reward, index) => [reward.id, index]),
  );
  return rewards.slice().sort((rewardA, rewardB) => {
    const priorityA = priorities.get(rewardA.id) ?? Number.POSITIVE_INFINITY;
    const priorityB = priorities.get(rewardB.id) ?? Number.POSITIVE_INFINITY;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return rewardPowerBudget(rewardA) - rewardPowerBudget(rewardB);
  });
}

function rewardPowerBudget(reward: RewardCard) {
  switch (reward.type) {
    case 'building':
      return 3;
    case 'combat':
    case 'production':
    case 'strategic':
      return 2;
    case 'unit':
      return 1;
    case 'economy':
      return 0;
    case 'passive':
      return reward.skill ? 2 : 1;
    default: {
      reward.type satisfies never;
      return 0;
    }
  }
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

  const configuredMap = map.copy({
    config: map.config.copy({
      blocklistedBuildings,
      blocklistedSkills: new Set(),
      blocklistedUnits,
      initialCharge: Math.max(0, map.config.initialCharge + run.initialChargeBonus),
      multiplier: Math.max(1, map.config.multiplier + run.economyBonus / 1000),
      seedCapital: getRoguelikeSeedCapital(run, map.config.seedCapital),
    }),
    teams: map.teams.map((team) =>
      team.copy({
        players: team.players.map((player) => applyDifficultyToPlayer(player, difficulty)),
      }),
    ),
  });

  return addRoguelikeStarterUnits(configuredMap, run);
}

function addRoguelikeStarterUnits(map: MapData, run: RoguelikeRunState): MapData {
  let units = map.units;
  const players = new Set(map.getPlayers().map((player) => player.id));

  for (const playerId of players) {
    const hqVector = [...map.buildings.entries()].find(
      ([, building]) => building.info.isHQ() && map.matchesPlayer(building, playerId),
    )?.[0];
    if (!hqVector) {
      continue;
    }

    if (run.battle === 1 && run.unlockedUnitIds.includes(Infantry.id)) {
      const deployVector = findDeployVector(map.copy({ units }), hqVector, Infantry);
      if (deployVector) {
        units = units.set(deployVector, Infantry.create(playerId));
      }
    }

    if (playerId > 1) {
      const pressureUnit = getBattleProfile(run).aiStarterUnit;
      const deployVector =
        pressureUnit && findDeployVector(map.copy({ units }), hqVector, pressureUnit);
      if (pressureUnit && deployVector) {
        units = units.set(deployVector, pressureUnit.create(playerId));
      }
    }
  }

  return units === map.units ? map : map.copy({ units });
}

function findDeployVector(map: MapData, hqVector: Vector, unit: UnitInfo) {
  return hqVector
    .expandStar()
    .find((vector) => canDeploy(map, unit, vector, true) && !map.units.has(vector));
}

function applyDifficultyToPlayer(player: Player, difficulty: number): Player {
  if (player.id <= 1) {
    return player;
  }

  const ai = difficulty >= 450 ? hardAI : defaultAI;
  return player.copy({
    ai,
    funds: player.funds + difficulty,
    skills:
      difficulty >= 450
        ? new Set([...player.skills, Skill.AttackAndDefenseIncreaseHard])
        : player.skills,
  });
}

export function getRoguelikeMapSize(battle: number): SizeVector {
  return getBattleProfile({ battle } as RoguelikeRunState).size;
}

export function getMinimumHQDistance(map: MapData) {
  return Math.max(6, Math.floor((map.size.width + map.size.height) * 0.45));
}

export function hasWellSeparatedHQs(map: MapData) {
  const hqs = getHQVectors(map);
  return (
    hqs.length >= 2 &&
    hqs.every((hq, index) =>
      hqs.slice(index + 1).every((otherHQ) => hq.distance(otherHQ) >= getMinimumHQDistance(map)),
    )
  );
}

function getRoguelikeSeedCapital(run: RoguelikeRunState, generatedCapital: number) {
  const base = run.battle === 1 ? roguelikeFirstBattleSeedCapital : generatedCapital;
  return base + Math.floor(run.seedCapitalBonus / 2);
}

function createProceduralMap(run: RoguelikeRunState) {
  const size = getBattleProfile(run).size;
  return withModifiers(generateSea(generateBuildings(generateRandomMap(size), campaignBiomes)));
}

function shapeRoguelikeMap(map: MapData, run: RoguelikeRunState) {
  let buildings = map.buildings;
  const mapFields = map.map.slice();
  const playerHQs = [...map.buildings.entries()].filter(
    ([, building]) => building.player > 0 && building.info === HQ,
  );
  const starterHouseByPlayer = new Map<number, boolean>();

  for (const [vector, building] of map.buildings) {
    if (building.player <= 0 || building.info === HQ) {
      continue;
    }

    if (building.info === House && !starterHouseByPlayer.has(building.player)) {
      starterHouseByPlayer.set(building.player, true);
      continue;
    }

    buildings = buildings.set(vector, building.neutralize(map.config.biome));
  }

  for (const [hqVector, hq] of playerHQs) {
    if (!starterHouseByPlayer.has(hq.player)) {
      const houseVector = hqVector
        .expandStar()
        .filter((vector) => map.contains(vector) && !vector.equals(hqVector))
        .sort((vectorA, vectorB) => vectorA.distance(hqVector) - vectorB.distance(hqVector))
        .find((vector) => !buildings.get(vector)?.info.isHQ() && !map.units.has(vector));

      if (houseVector) {
        mapFields[map.getTileIndex(houseVector)] = ConstructionSite.id;
        buildings = buildings.set(houseVector, House.create(hq.player));
      }
    }

    const production = getBattleProfile(run).playerProduction;
    if (production && run.unlockedBuildingIds.includes(production.id)) {
      const productionVector = findBuildingVector(map, buildings, hqVector, production);
      if (productionVector) {
        mapFields[map.getTileIndex(productionVector)] = ConstructionSite.id;
        buildings = buildings.set(productionVector, production.create(hq.player));
      }
    }
  }

  return withModifiers(addNeutralEconomyBuildings(map.copy({ buildings, map: mapFields }), run));
}

function findBuildingVector(
  map: MapData,
  buildings: MapData['buildings'],
  hqVector: Vector,
  building: BuildingInfo,
) {
  return hqVector
    .expandStar()
    .filter((vector) => map.contains(vector) && !vector.equals(hqVector))
    .sort((vectorA, vectorB) => vectorA.distance(hqVector) - vectorB.distance(hqVector))
    .find(
      (vector) =>
        !buildings.has(vector) &&
        !map.units.has(vector) &&
        building.canBeCreatedOn(ConstructionSite),
    );
}

function addNeutralEconomyBuildings(map: MapData, run: RoguelikeRunState): MapData {
  const target = getBattleProfile(run).minimumNeutralEconomy;
  let current = countNeutralEconomyBuildings(map);
  if (current >= target) {
    return map;
  }

  let buildings = map.buildings;
  const mapFields = map.map.slice();
  for (const vector of getCenterOutFields(map)) {
    if (current >= target) {
      break;
    }

    if (buildings.has(vector) || map.units.has(vector)) {
      continue;
    }

    mapFields[map.getTileIndex(vector)] = ConstructionSite.id;
    buildings = buildings.set(vector, House.create(0));
    current++;
  }

  return map.copy({ buildings, map: mapFields });
}

function hasEnoughNeutralEconomy(map: MapData, run: RoguelikeRunState) {
  return countNeutralEconomyBuildings(map) >= getBattleProfile(run).minimumNeutralEconomy;
}

function countNeutralEconomyBuildings(map: MapData) {
  return [...map.buildings.values()].filter(
    (building) => building.player === 0 && building.info.configuration.funds > 0,
  ).length;
}

function getCenterOutFields(map: MapData): ReadonlyArray<Vector> {
  const center = vec(Math.floor(map.size.width / 2), Math.floor(map.size.height / 2));
  return map
    .mapFields((vector) => vector)
    .sort((vectorA, vectorB) => vectorA.distance(center) - vectorB.distance(center));
}

function getHQVectors(map: MapData) {
  return [...map.buildings.entries()]
    .filter(([, building]) => building.info.isHQ())
    .map(([vector]) => vector);
}

function getNodeForBattle(battle: number, battleLimit: number): RoguelikeNodeType {
  if (battle === battleLimit) {
    return 'boss';
  }
  if (battle >= 4) {
    return 'elite';
  }
  return 'normal';
}

function getBattleNodeForBattle(battle: number, battleLimit: number): RoguelikeNodeType {
  if (battle === battleLimit) {
    return 'boss';
  }
  return battle >= 4 ? 'elite' : 'normal';
}

function getDifficulty(run: RoguelikeRunState) {
  return getBattleProfile(run).aiFunds;
}

function getRoguelikePhase(run: Pick<RoguelikeRunState, 'battle'>): RoguelikePhase {
  if (run.battle <= 2) {
    return 'early';
  }
  if (run.battle <= 4) {
    return 'mid';
  }
  return 'late';
}

function getBattleProfile(run: Pick<RoguelikeRunState, 'battle'>): RoguelikeBattleProfile {
  switch (Math.min(Math.max(1, run.battle), 6)) {
    case 1:
      return {
        aiFunds: 0,
        aiStarterUnit: null,
        minimumNeutralEconomy: 2,
        playerProduction: null,
        size: new SizeVector(8, 6),
      };
    case 2:
      return {
        aiFunds: 75,
        aiStarterUnit: null,
        minimumNeutralEconomy: 3,
        playerProduction: Barracks,
        size: new SizeVector(10, 7),
      };
    case 3:
      return {
        aiFunds: 125,
        aiStarterUnit: null,
        minimumNeutralEconomy: 4,
        playerProduction: Barracks,
        size: new SizeVector(12, 8),
      };
    case 4:
      return {
        aiFunds: 175,
        aiStarterUnit: SmallTank,
        minimumNeutralEconomy: 5,
        playerProduction: Factory,
        size: new SizeVector(14, 10),
      };
    case 5:
      return {
        aiFunds: 250,
        aiStarterUnit: HeavyTank,
        minimumNeutralEconomy: 6,
        playerProduction: Factory,
        size: new SizeVector(16, 11),
      };
    default:
      return {
        aiFunds: 450,
        aiStarterUnit: HeavyTank,
        minimumNeutralEconomy: 7,
        playerProduction: Factory,
        size: new SizeVector(18, 12),
      };
  }
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
