import { Criteria } from '@deities/athena/Objectives.tsx';
import {
  blocklistUnitsExcept,
  buildTutorialMap,
  createTutorialEffects,
  Factory,
  HQ,
  House,
  Infantry,
  Jeep,
  msg,
  Pioneer,
  standardTeams,
} from '../tutorial/shared.tsx';
import {
  act1MapIds,
  act1MapSize,
  act1StandardTerrain,
  type Act1MissionDefinition,
} from './shared.tsx';

const act1Tags = ['act-1', 'open-wars', 'campaign'] as const;

const mission1: Act1MissionDefinition = {
  description:
    'Scout the contested valley and capture the neutral relay station before Red forces notice.',
  difficulty: 1,
  effects: createTutorialEffects(
    [
      msg(
        Pioneer,
        'Commander, welcome to Kestrel Battalion. Boot Camp is behind us — this is Vera Pass.',
        0,
      ),
      msg(
        Pioneer,
        'Morning patrol: a neutral relay station sits ahead. Capture it before Red mobilizes.',
        1,
      ),
      msg(
        Infantry,
        'Move your Pioneer to the marked building and choose Capture. Stay clear of the enemy patrol for now.',
        0,
      ),
    ],
    [
      msg(Pioneer, 'Relay secured. Command will be pleased with your first real operation.', 0),
      msg(Infantry, 'Clean work, Commander. The battalion can push deeper into the pass tomorrow.'),
    ],
    [
      msg(Pioneer, 'The relay is still in neutral hands. Red could seize it any moment.', 1),
      msg(
        Infantry,
        'Tip: select the Pioneer, reach the marked relay building, and choose Capture.',
        0,
      ),
    ],
  ),
  id: act1MapIds[0],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [7, 4, { h: 100, i: House.id, l: 1, p: 0 }],
      [9, 6, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id),
      fog: false,
      multiplier: 1,
      objectives: [
        [0, [0, 0, null]],
        [Criteria.CaptureLabel, [1, 0, [1], [1], null, 0, [], null]],
      ],
      seedCapital: 500,
    },
    map: act1StandardTerrain,
    size: act1MapSize,
    teams: standardTeams(),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [9, 5, { g: 50, h: 70, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 1-1: Morning Patrol',
  missionName: 'Morning Patrol',
  tags: [...act1Tags],
};

const mission2: Act1MissionDefinition = {
  description: 'Clear the enemy roadblock blocking the main supply route into Vera Pass.',
  difficulty: 1,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Red infantry has dug in on the main road. We cannot advance until they are gone.', 0),
      msg(
        Infantry,
        'Move your soldier into attack range and strike the roadblock garrison. Watch for counterattacks.',
        0,
      ),
      msg(Pioneer, 'Defeat the marked enemy to reopen the supply route.', 1),
    ],
    [
      msg(Pioneer, 'Roadblock cleared. Supply convoys can move again.', 0),
      msg(Infantry, 'First blood in Vera Pass. The enemy will not forget this push.'),
    ],
    [
      msg(Pioneer, 'The roadblock still holds. Our advance is stalled.', 1),
      msg(
        Infantry,
        'Tip: move infantry adjacent to the enemy, attack, and finish them if they survive.',
        0,
      ),
    ],
  ),
  id: act1MapIds[1],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [10, 7, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id),
      fog: false,
      multiplier: 1,
      objectives: [[1, [Criteria.DefeatAmount, 0, 1, [1], null, 0, [], null]]],
      seedCapital: 500,
    },
    map: act1StandardTerrain,
    size: act1MapSize,
    teams: standardTeams(),
    units: [
      [3, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [7, 5, { g: 50, h: 65, i: Infantry.id, l: 1, p: 2 }],
    ],
  }),
  mapName: 'Act 1-2: Roadblock',
  missionName: 'Roadblock',
  tags: [...act1Tags],
};

const mission3: Act1MissionDefinition = {
  description: 'Seize the enemy supply depot — earn income, build reinforcements, and hold the objective.',
  difficulty: 1,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Intel found a Red supply depot ahead. Capturing it will fund our next push.', 0),
      msg(
        Infantry,
        'End Turn to receive income, then build infantry at your factory. Use them to break the garrison.',
        0,
      ),
      msg(
        Pioneer,
        'Capture the marked depot once the guard is down. Logistics wins wars, Commander.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Depot captured! Our war chest just got a lot heavier.', 0),
      msg(Infantry, 'Supply lines secured. Kestrel Battalion is ready for a bigger fight.'),
    ],
    [
      msg(Pioneer, 'The depot still flies Red colors. We need those supplies.', 1),
      msg(
        Infantry,
        'Tip: End Turn for funds, build infantry, defeat the guard, then capture the depot.',
        0,
      ),
    ],
  ),
  id: act1MapIds[2],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [8, 4, { h: 100, i: House.id, l: 1, p: 0 }],
      [10, 7, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id),
      fog: false,
      multiplier: 1,
      objectives: [
        [0, [0, 0, null]],
        [Criteria.CaptureLabel, [1, 0, [1], [1], null, 0, [], null]],
      ],
      seedCapital: 500,
    },
    map: act1StandardTerrain,
    size: act1MapSize,
    teams: standardTeams(400),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [8, 5, { g: 50, h: 80, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 1-3: Supply Lines',
  missionName: 'Supply Lines',
  tags: [...act1Tags],
};

const mission4: Act1MissionDefinition = {
  description: 'Coordinate infantry and jeeps in a pincer attack against the enemy bridgehead.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Red holds a bridgehead across the river flats. We hit them from two sides at once.', 0),
      msg(
        Infantry,
        'Use jeeps to reposition quickly and infantry to hold the line. Defeat every enemy unit.',
        0,
      ),
      msg(
        Pioneer,
        'Strike hard, Commander. If even one Red soldier escapes, they will call reinforcements.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Bridgehead destroyed! The pincer worked perfectly.', 0),
      msg(
        Infantry,
        'Combined arms in the field — jeeps and infantry together. That is how Kestrel fights.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Enemy units still hold the bridgehead. Regroup and try the pincer again.', 1),
      msg(
        Infantry,
        'Tip: use jeeps to flank, infantry to attack, and eliminate all enemy forces.',
        0,
      ),
    ],
  ),
  id: act1MapIds[3],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [10, 7, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id, Jeep.id),
      fog: false,
      multiplier: 1,
      objectives: [[0, [0, 0, null]]],
      seedCapital: 500,
    },
    map: act1StandardTerrain,
    size: act1MapSize,
    teams: standardTeams(200),
    units: [
      [3, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [4, 4, { g: 60, h: 100, i: Jeep.id, p: 1 }],
      [7, 5, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [9, 6, { g: 50, h: 85, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 1-4: Pincer Move',
  missionName: 'Pincer Move',
  tags: [...act1Tags],
};

const mission5: Act1MissionDefinition = {
  description: 'Assault the enemy ridge headquarters and break Red resistance in Vera Pass.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(
        Pioneer,
        'This is it, Commander. Red command holds the ridge HQ. Capture it and Vera Pass is ours.',
        0,
      ),
      msg(
        Infantry,
        'Move a capture-capable unit onto the enemy headquarters and choose Capture to end the battle.',
        0,
      ),
      msg(
        Pioneer,
        'The garrison is dug in but outnumbered. Push through — Kestrel Battalion is counting on you.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Ridgefall is ours! Red forces are retreating from Vera Pass.', 0),
      msg(
        Infantry,
        'Act 1 complete, Commander. Kestrel holds the pass — but the war is far from over.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'The ridge HQ still stands. Red will not yield without a fight.', 1),
      msg(
        Infantry,
        'Tip: move infantry or a pioneer onto the enemy HQ and select Capture to claim victory.',
        0,
      ),
    ],
  ),
  id: act1MapIds[4],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [9, 6, { h: 100, i: HQ.id, l: 1, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id),
      fog: false,
      multiplier: 1,
      objectives: [
        [0, [0, 0, null]],
        [Criteria.CaptureLabel, [1, 0, [1], [1], null, 0, [], null]],
      ],
      seedCapital: 500,
    },
    map: act1StandardTerrain,
    size: act1MapSize,
    teams: standardTeams(),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [4, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [8, 6, { g: 50, h: 85, i: Infantry.id, p: 2 }],
      [9, 7, { g: 50, h: 80, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 1-5: Ridgefall',
  missionName: 'Ridgefall',
  tags: [...act1Tags],
};

export const act1Missions: ReadonlyArray<Act1MissionDefinition> = [
  mission1,
  mission2,
  mission3,
  mission4,
  mission5,
];

export function resolveAct1MissionMapId(
  missionIndex: number,
  maps: ReadonlyArray<{ id: string }>,
) {
  const mission = act1Missions[missionIndex];
  if (!mission) {
    return null;
  }

  return maps.find((mapObject) => mapObject.id === mission.id)?.id || mission.id;
}
