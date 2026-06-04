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
  act2DesertTerrain,
  act2MapIds,
  act2MapSize,
  buildAct2Map,
  type Act2MissionDefinition,
} from './shared.tsx';

const act2Tags = ['act-2', 'open-wars', 'campaign', 'desert'] as const;

const mission1: Act2MissionDefinition = {
  description:
    'Strike a neutral oasis relay at dawn before Red scouts raise the alarm across the wastes.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(
        Pioneer,
        'Commander, Kestrel crosses into the Sunder Wastes. The sun alone is an enemy here.',
        0,
      ),
      msg(
        Pioneer,
        'Sunrise Raid: capture the oasis relay before Red patrols wake the garrison.',
        1,
      ),
      msg(
        Infantry,
        'Move your Pioneer through the dunes to the marked building and choose Capture.',
        0,
      ),
    ],
    [
      msg(Pioneer, 'Oasis secured. The battalion has water and a foothold in the desert.', 0),
      msg(Infantry, 'A strong opening, Commander. Red will know we are here before noon.'),
    ],
    [
      msg(Pioneer, 'The relay still belongs to no one — and Red is closing in.', 1),
      msg(Infantry, 'Tip: reach the marked oasis building with a Pioneer and select Capture.', 0),
    ],
  ),
  id: act2MapIds[0],
  map: buildAct2Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [8, 5, { h: 100, i: House.id, l: 1, p: 0 }],
      [10, 9, { h: 100, i: HQ.id, p: 2 }],
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
    map: act2DesertTerrain,
    size: act2MapSize,
    teams: standardTeams(),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [9, 6, { g: 50, h: 75, i: Infantry.id, p: 2 }],
      [10, 8, { g: 50, h: 70, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 2-1: Sunrise Raid',
  missionName: 'Sunrise Raid',
  tags: [...act2Tags],
};

const mission2: Act2MissionDefinition = {
  description: 'Destroy the enemy squad waiting in the dunes along the supply route.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Red ambushers hold the dune crossing. Clear them or our column stops cold.', 0),
      msg(
        Infantry,
        'Use the open ground — move infantry into range and eliminate the marked squad.',
        0,
      ),
      msg(Pioneer, 'No mercy in the wastes, Commander. Break the ambush.', 1),
    ],
    [
      msg(Pioneer, 'Ambush broken. The supply route is open again.', 0),
      msg(Infantry, 'Red learns fast out here. Expect heavier resistance ahead.'),
    ],
    [
      msg(Pioneer, 'The squad still holds the crossing. We cannot advance.', 1),
      msg(
        Infantry,
        'Tip: move infantry into attack range and defeat the marked enemy soldiers.',
        0,
      ),
    ],
  ),
  id: act2MapIds[1],
  map: buildAct2Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [10, 9, { h: 100, i: HQ.id, p: 2 }],
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
    map: act2DesertTerrain,
    size: act2MapSize,
    teams: standardTeams(),
    units: [
      [3, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [4, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [8, 6, { g: 50, h: 80, i: Infantry.id, l: 1, p: 2 }],
      [9, 7, { g: 50, h: 75, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Act 2-2: Dune Ambush',
  missionName: 'Dune Ambush',
  tags: [...act2Tags],
};

const mission3: Act2MissionDefinition = {
  description: 'Use artillery and jeeps to destroy the enemy convoy crossing the open flats.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'A Red convoy crosses the flats — soft targets at long range if we act now.', 0),
      msg(
        Infantry,
        'Position artillery for clear shots. Use jeeps to reposition and finish survivors.',
        0,
      ),
      msg(Pioneer, 'Destroy every enemy unit. Leave nothing to report back to Red command.', 1),
    ],
    [
      msg(Pioneer, 'Convoy destroyed! Red logistics in this sector are bleeding.', 0),
      msg(Infantry, 'Combined arms in the desert — exactly what Kestrel was built for.'),
    ],
    [
      msg(Pioneer, 'The convoy still rolls. They will warn the garrison at the Burning Gate.', 1),
      msg(
        Infantry,
        'Tip: use artillery at range, jeeps to flank, and eliminate all enemy forces.',
        0,
      ),
    ],
  ),
  id: act2MapIds[2],
  map: buildAct2Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [10, 9, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id, Jeep.id, Artillery.id),
      fog: false,
      multiplier: 1,
      objectives: [[0, [0, 0, null]]],
      seedCapital: 500,
    },
    map: act2DesertTerrain,
    size: act2MapSize,
    teams: standardTeams(300),
    units: [
      [3, 5, { a: [[1, 8]], g: 40, h: 100, i: Artillery.id, p: 1 }],
      [4, 4, { g: 60, h: 100, i: Jeep.id, p: 1 }],
      [3, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [8, 6, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [9, 7, { g: 50, h: 85, i: Infantry.id, p: 2 }],
      [10, 8, { g: 50, h: 80, i: Jeep.id, p: 2 }],
    ],
  }),
  mapName: 'Act 2-3: Convoy Strike',
  missionName: 'Convoy Strike',
  tags: [...act2Tags],
};

const mission4: Act2MissionDefinition = {
  description:
    'Fight through a sandstorm to seize the enemy depot — reinforce, then hold the objective.',
  difficulty: 3,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'A sandstorm rolls in, Commander. Red thinks nature fights on their side.', 0),
      msg(
        Infantry,
        'End Turn for income, build infantry at your factory, then storm the marked depot.',
        0,
      ),
      msg(
        Pioneer,
        'Capture the depot before the storm clears and enemy reinforcements arrive.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Depot captured despite the storm. Kestrel does not break.', 0),
      msg(Infantry, 'One mission stands between us and the Burning Gate. Steel yourselves.'),
    ],
    [
      msg(Pioneer, 'The depot still flies Red colors. The storm will not wait forever.', 1),
      msg(
        Infantry,
        'Tip: End Turn, build units, fight through the garrison, and capture the depot.',
        0,
      ),
    ],
  ),
  id: act2MapIds[3],
  map: buildAct2Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [9, 5, { h: 100, i: House.id, l: 1, p: 0 }],
      [10, 9, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id, Jeep.id),
      fog: true,
      multiplier: 1,
      objectives: [
        [0, [0, 0, null]],
        [Criteria.CaptureLabel, [1, 0, [1], [1], null, 0, [], null]],
      ],
      seedCapital: 500,
    },
    map: act2DesertTerrain,
    size: act2MapSize,
    teams: standardTeams(600),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [4, 4, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [9, 6, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [10, 7, { g: 50, h: 85, i: Infantry.id, p: 2 }],
      [11, 8, { g: 60, h: 90, i: Jeep.id, p: 2 }],
    ],
  }),
  mapName: 'Act 2-4: Sandstorm Siege',
  missionName: 'Sandstorm Siege',
  tags: [...act2Tags],
};

const mission5: Act2MissionDefinition = {
  description: 'Assault the Burning Gate — Red’s desert fortress and the key to the southern front.',
  difficulty: 3,
  effects: createTutorialEffects(
    [
      msg(
        Pioneer,
        'The Burning Gate, Commander. Red’s desert HQ — take it and the wastes are ours.',
        0,
      ),
      msg(
        Infantry,
        'Combined assault: infantry to the walls, mobile guns to suppress, Pioneer ready to capture.',
        0,
      ),
      msg(
        Pioneer,
        'This is the battle they will remember. Capture the enemy headquarters and end Act 2.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'The Burning Gate has fallen! Red retreats from the Sunder Wastes!', 0),
      msg(
        Infantry,
        'Act 2 complete, Commander. Kestrel stands victorious — but the war marches on.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'The fortress still stands. Red will not yield the wastes without blood.', 1),
      msg(
        Infantry,
        'Tip: break the garrison, move a capture unit onto the enemy HQ, and choose Capture.',
        0,
      ),
    ],
  ),
  id: act2MapIds[4],
  map: buildAct2Map({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [10, 8, { h: 100, i: HQ.id, l: 1, p: 2 }],
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
      seedCapital: 500,
    },
    map: act2DesertTerrain,
    size: act2MapSize,
    teams: standardTeams(400),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [4, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [3, 5, { g: 40, h: 100, i: ArtilleryHumvee.id, p: 1 }],
      [4, 4, { g: 60, h: 100, i: Jeep.id, p: 1 }],
      [8, 7, { g: 50, h: 95, i: Infantry.id, p: 2 }],
      [9, 8, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [10, 9, { g: 50, h: 85, i: Infantry.id, p: 2 }],
      [11, 7, { g: 40, h: 100, i: Artillery.id, p: 2 }],
    ],
  }),
  mapName: 'Act 2-5: The Burning Gate',
  missionName: 'The Burning Gate',
  tags: [...act2Tags],
};

export const act2Missions: ReadonlyArray<Act2MissionDefinition> = [
  mission1,
  mission2,
  mission3,
  mission4,
  mission5,
];

export function resolveAct2MissionMapId(
  missionIndex: number,
  maps: ReadonlyArray<{ id: string }>,
) {
  const mission = act2Missions[missionIndex];
  if (!mission) {
    return null;
  }

  return maps.find((mapObject) => mapObject.id === mission.id)?.id || mission.id;
}
