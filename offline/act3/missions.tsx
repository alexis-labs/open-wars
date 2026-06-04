import { Criteria } from '@deities/athena/Objectives.tsx';
import { Artillery, ArtilleryHumvee, Infantry, Jeep, Pioneer } from '@deities/athena/info/Unit.tsx';
import {
  blocklistUnitsExcept,
  createTutorialEffects,
  Factory,
  HQ,
  House,
  msg,
  standardTeams,
} from '../tutorial/shared.tsx';
import {
  act3MapIds,
  act3MapSize,
  act3SnowTerrain,
  buildAct3Map,
  type Act3MissionDefinition,
} from './shared.tsx';

const act3Tags = ['act-3', 'open-wars', 'campaign', 'snow'] as const;

const mission1: Act3MissionDefinition = {
  description:
    'Cross the frozen border and seize a neutral supply hut before Red fortifies the ridge.',
  difficulty: 3,
  effects: createTutorialEffects(
    [
      msg(
        Pioneer,
        'Commander… the Sunder Wastes are behind us. Ahead lies White Ridge — cold enough to kill.',
        0,
      ),
      msg(
        Pioneer,
        'Frozen Crossing: capture the neutral supply hut. Without it, the battalion freezes before we fight.',
        1,
      ),
      msg(
        Infantry,
        'Move your Pioneer to the marked building and choose Capture. Watch the ice — every step counts.',
        0,
      ),
    ],
    [
      msg(Pioneer, 'Supply hut secured. Kestrel has a breath of warmth in this wasteland.', 0),
      msg(
        Infantry,
        'We made it onto the ridge, Commander. Red will not welcome us quietly.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'The hut still stands empty while our soldiers shiver. We cannot wait.', 1),
      msg(Infantry, 'Tip: reach the marked supply hut with a Pioneer and select Capture.', 0),
    ],
  ),
  id: act3MapIds[0],
  map: buildAct3Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [9, 5, { h: 100, i: House.id, l: 1, p: 0 }],
      [13, 9, { h: 100, i: HQ.id, p: 2 }],
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
    map: act3SnowTerrain,
    size: act3MapSize,
    teams: standardTeams(),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [10, 6, { g: 50, h: 80, i: Infantry.id, p: 2 }],
      [12, 8, { g: 50, h: 75, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 3-1: Frozen Crossing',
  missionName: 'Frozen Crossing',
  tags: [...act3Tags],
};

const mission2: Act3MissionDefinition = {
  description: 'Break the enemy picket line holding the silent snow fields east of your camp.',
  difficulty: 3,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Red pickets ahead — barely visible in the white. They will not see us coming.', 0),
      msg(
        Infantry,
        'Move infantry into range and eliminate the marked squad before they call reinforcements.',
        0,
      ),
      msg(Pioneer, 'White Silence, Commander. Out here, the dead make no sound.', 1),
    ],
    [
      msg(Pioneer, 'Picket line destroyed. The ridge opens a little wider.', 0),
      msg(Infantry, 'Each victory up here costs more than the last. Keep the men moving.'),
    ],
    [
      msg(Pioneer, 'The pickets still hold. Red will tighten the noose around us.', 1),
      msg(
        Infantry,
        'Tip: move infantry into attack range and defeat the marked enemy soldiers.',
        0,
      ),
    ],
  ),
  id: act3MapIds[1],
  map: buildAct3Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [13, 9, { h: 100, i: HQ.id, p: 2 }],
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
    map: act3SnowTerrain,
    size: act3MapSize,
    teams: standardTeams(),
    units: [
      [3, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [4, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [9, 6, { g: 50, h: 85, i: Infantry.id, l: 1, p: 2 }],
      [11, 7, { g: 50, h: 80, i: Infantry.id, p: 2 }],
      [12, 8, { g: 50, h: 75, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 3-2: White Silence',
  missionName: 'White Silence',
  tags: [...act3Tags],
};

const mission3: Act3MissionDefinition = {
  description:
    'Supply lines are collapsing in the blizzard — rebuild your force and capture the frozen depot.',
  difficulty: 3,
  effects: createTutorialEffects(
    [
      msg(
        Pioneer,
        'The cold is eating our supplies faster than Red can. We need that depot or we starve.',
        0,
      ),
      msg(
        Infantry,
        'End Turn for income, build infantry at your factory, then fight through to the marked depot.',
        0,
      ),
      msg(
        Pioneer,
        'Capture it, Commander. Kestrel cannot march on empty stomachs and frozen fuel.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Depot captured. The battalion lives to fight another day on the ridge.', 0),
      msg(
        Infantry,
        'Losses are mounting, sir. Cairn Pass lies ahead — the hardest miles of the war.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Without that depot, White Ridge will bury us all.', 1),
      msg(
        Infantry,
        'Tip: End Turn, build units at the factory, defeat the garrison, and capture the depot.',
        0,
      ),
    ],
  ),
  id: act3MapIds[2],
  map: buildAct3Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [9, 5, { h: 100, i: House.id, l: 1, p: 0 }],
      [13, 9, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id, Jeep.id),
      fog: false,
      multiplier: 1,
      objectives: [
        [0, [0, 0, null]],
        [Criteria.CaptureLabel, [1, 0, [1], [1], null, 0, [], null]],
      ],
      seedCapital: 500,
    },
    map: act3SnowTerrain,
    size: act3MapSize,
    teams: standardTeams(700),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [4, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [10, 6, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [11, 7, { g: 50, h: 85, i: Infantry.id, p: 2 }],
      [12, 8, { g: 60, h: 90, i: Jeep.id, p: 2 }],
    ],
  }),
  mapName: 'Act 3-3: Supply Collapse',
  missionName: 'Supply Collapse',
  tags: [...act3Tags],
};

const mission4: Act3MissionDefinition = {
  description:
    'Hold Cairn Pass against the enemy counterattack — Pioneer stays behind so the battalion can advance.',
  difficulty: 4,
  effects: createTutorialEffects(
    [
      msg(
        Pioneer,
        'Commander… Cairn Pass is the only way through. Someone must hold it while the column moves.',
        0,
      ),
      msg(
        Pioneer,
        'That someone is me. Take the battalion forward. I will buy you the time you need.',
        1,
      ),
      msg(
        Infantry,
        'Sir — defeat every enemy unit in the pass. We cannot let Pioneer\'s stand be for nothing.',
        0,
      ),
    ],
    [
      msg(
        Pioneer,
        'The pass… is clear. Go, Commander. Tell them… I kept my promise.',
        0,
      ),
      msg(
        Pioneer,
        'Kestrel… remember the ridge. Remember…',
        1,
      ),
      msg(
        Infantry,
        '…Pioneer is gone, Commander. Cairn Pass is ours, but we lost the heart of this battalion.',
        0,
      ),
    ],
    [
      msg(Pioneer, 'The pass cannot fall. Not while I still draw breath. Try again, Commander.', 1),
      msg(
        Infantry,
        'Tip: eliminate all enemy forces in the pass. Hold the line for Pioneer\'s sacrifice.',
        0,
      ),
    ],
  ),
  id: act3MapIds[3],
  map: buildAct3Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [13, 9, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(
        Pioneer.id,
        Infantry.id,
        Jeep.id,
        Artillery.id,
      ),
      fog: true,
      multiplier: 1,
      objectives: [[0, [0, 0, null]]],
      seedCapital: 600,
    },
    map: act3SnowTerrain,
    size: act3MapSize,
    teams: standardTeams(400),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [4, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [4, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [3, 5, { g: 60, h: 100, i: Jeep.id, p: 1 }],
      [9, 6, { g: 50, h: 95, i: Infantry.id, p: 2 }],
      [10, 7, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [11, 6, { a: [[1, 7]], g: 40, h: 100, i: Artillery.id, p: 2 }],
      [12, 8, { g: 50, h: 85, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 3-4: Last Stand at Cairn Pass',
  missionName: 'Last Stand at Cairn Pass',
  tags: [...act3Tags],
};

const mission5: Act3MissionDefinition = {
  description:
    'Without Pioneer, lead the final assault on Red’s frozen headquarters atop White Ridge.',
  difficulty: 4,
  effects: createTutorialEffects(
    [
      msg(
        Infantry,
        'Commander… Pioneer is gone. But Kestrel still has a war to win.',
        0,
      ),
      msg(
        Infantry,
        'We take the ridge HQ for everyone who fell in the snow — especially for Pioneer.',
        1,
      ),
      msg(
        Infantry,
        'Move a capture unit onto the enemy headquarters. Make this victory mean something.',
        0,
      ),
    ],
    [
      msg(
        Infantry,
        'White Ridge is ours, Commander. Red retreats from the frozen front.',
        0,
      ),
      msg(
        Infantry,
        'Act 3 is complete — but victory tastes like ash without Pioneer beside us.',
        1,
      ),
    ],
    [
      msg(
        Infantry,
        'The HQ still stands. We fight on — for Pioneer, and for every soldier lost in the cold.',
        0,
      ),
      msg(
        Infantry,
        'Tip: break the garrison and capture the enemy HQ. Finish what Pioneer started.',
        0,
      ),
    ],
  ),
  id: act3MapIds[4],
  map: buildAct3Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [12, 8, { h: 100, i: HQ.id, l: 1, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(
        Pioneer.id,
        Infantry.id,
        Jeep.id,
        Artillery.id,
        ArtilleryHumvee.id,
      ),
      fog: true,
      multiplier: 1,
      objectives: [
        [0, [0, 0, null]],
        [Criteria.CaptureLabel, [1, 0, [1], [1], null, 0, [], null]],
      ],
      seedCapital: 600,
    },
    map: act3SnowTerrain,
    size: act3MapSize,
    teams: standardTeams(500),
    units: [
      [3, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [4, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [3, 4, { g: 40, h: 100, i: ArtilleryHumvee.id, p: 1 }],
      [4, 5, { g: 60, h: 100, i: Jeep.id, p: 1 }],
      [9, 6, { g: 50, h: 95, i: Infantry.id, p: 2 }],
      [10, 7, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [11, 8, { g: 50, h: 85, i: Infantry.id, p: 2 }],
      [11, 6, { a: [[1, 7]], g: 40, h: 100, i: Artillery.id, p: 2 }],
      [13, 9, { g: 50, h: 80, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 3-5: White Ridge Falls',
  missionName: 'White Ridge Falls',
  tags: [...act3Tags],
};

export const act3Missions: ReadonlyArray<Act3MissionDefinition> = [
  mission1,
  mission2,
  mission3,
  mission4,
  mission5,
];

export function resolveAct3MissionMapId(
  missionIndex: number,
  maps: ReadonlyArray<{ id: string }>,
) {
  const mission = act3Missions[missionIndex];
  if (!mission) {
    return null;
  }

  return maps.find((mapObject) => mapObject.id === mission.id)?.id || mission.id;
}
