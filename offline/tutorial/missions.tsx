import { Criteria } from '@deities/athena/Objectives.tsx';
import {
  Artillery,
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
  standardTutorialTerrain,
  findTutorialMission1Map,
  type TutorialMissionDefinition,
  tutorialMapIds,
} from './shared.tsx';

const tutorialTags = ['tutorial', 'open-wars', 'boot-camp'] as const;

const mission1: TutorialMissionDefinition = {
  description:
    'Capture the neutral outpost to the east before the enemy can respond. A perfect introduction to Open Wars.',
  difficulty: 1,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Commander, welcome to Boot Camp. This is your first field mission.', 0),
      msg(
        Pioneer,
        'Intel reports a neutral outpost to the east. We need it before the enemy can react.',
        1,
      ),
      msg(
        Infantry,
        'Select your Pioneer, then tap a green tile to move. Highlighted tiles show where it can go.',
        0,
      ),
      msg(
        Pioneer,
        'When you reach the outpost, choose Capture. Buildings give map control and income.',
        2,
      ),
      msg(
        Infantry,
        'An enemy soldier is nearby, but ignore him for now. Focus on the capture. Good luck!',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Mission complete! You captured the outpost like a seasoned commander.', 0),
      msg(
        Infantry,
        'You now know movement and capture — the heart of Open Wars. On to the next lesson.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'The mission failed, Commander, but every attempt teaches something new.', 1),
      msg(
        Infantry,
        'Tip: select the Pioneer, move to the marked neutral building, and choose Capture.',
        0,
      ),
    ],
  ),
  id: tutorialMapIds[0],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [6, 4, { h: 100, i: House.id, l: 1, p: 0 }],
      [8, 5, { h: 100, i: House.id, p: 0 }],
      [9, 7, { h: 100, i: HQ.id, p: 2 }],
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
    map: standardTutorialTerrain,
    size: { height: 8, width: 10 },
    teams: standardTeams(),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [8, 4, { g: 40, h: 70, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Boot Camp 1: First Contact',
  missionName: 'First Contact',
  tags: [...tutorialTags],
};

const mission2: TutorialMissionDefinition = {
  description: 'Engage the enemy infantry and learn how attacking, health, and ammo work.',
  difficulty: 1,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Lesson two: combat basics. Your infantry is ready to fight.', 0),
      msg(
        Infantry,
        'Select your soldier, move into range, then choose Attack on the highlighted enemy.',
        0,
      ),
      msg(
        Pioneer,
        'Watch health and ammo in the unit panel. A counterattack may follow, so choose your target wisely.',
        1,
      ),
      msg(Infantry, 'Defeat the marked enemy soldier to complete this mission.', 1),
    ],
    [
      msg(Pioneer, 'Clean strike! You handled your first battle perfectly.', 0),
      msg(Infantry, 'You learned attack range, damage, and counterattacks. Ready for logistics next.'),
    ],
    [
      msg(Pioneer, 'Not this time, Commander. Regroup and study the battlefield.', 1),
      msg(
        Infantry,
        'Tip: move your infantry adjacent to the enemy, attack, and finish them if they survive.',
        0,
      ),
    ],
  ),
  id: tutorialMapIds[1],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [9, 7, { h: 100, i: HQ.id, p: 2 }],
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
    map: standardTutorialTerrain,
    size: { height: 8, width: 10 },
    teams: standardTeams(),
    units: [
      [3, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [6, 4, { g: 50, h: 60, i: Infantry.id, l: 1, p: 2 }],
    ],
  }),
  mapName: 'Boot Camp 2: First Strike',
  missionName: 'First Strike',
  tags: [...tutorialTags],
};

const mission3: TutorialMissionDefinition = {
  description: 'End your turn, spend funds, and produce a new infantry unit at your factory.',
  difficulty: 1,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Supply lines matter. This mission is about economy and reinforcements.', 0),
      msg(
        Infantry,
        'Select End Turn to advance the clock and receive income from your buildings.',
        0,
      ),
      msg(
        Pioneer,
        'Then select your factory, choose Create Unit, and build an infantry soldier.',
        1,
      ),
      msg(
        Infantry,
        'Use your new recruit to defeat the enemy blocking the eastern outpost. Capture it to win.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'Excellent logistics! You funded, built, and deployed in one operation.', 0),
      msg(Infantry, 'End Turn, income, and production — now you can sustain a real campaign.'),
    ],
    [
      msg(Pioneer, 'The outpost is still beyond our reach. Let us rethink the supply plan.', 1),
      msg(
        Infantry,
        'Tip: End Turn for funds, build infantry at the factory, defeat the guard, then capture.',
        0,
      ),
    ],
  ),
  id: tutorialMapIds[2],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [6, 4, { h: 100, i: House.id, l: 1, p: 0 }],
      [9, 7, { h: 100, i: HQ.id, p: 2 }],
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
    map: standardTutorialTerrain,
    size: { height: 8, width: 10 },
    teams: standardTeams(400),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [7, 4, { g: 50, h: 80, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Boot Camp 3: Reinforcements',
  missionName: 'Reinforcements',
  tags: [...tutorialTags],
};

const mission4: TutorialMissionDefinition = {
  description: 'Use artillery range to defeat an enemy without closing to melee distance.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Artillery changes the battlefield. Range is your greatest weapon here.', 0),
      msg(
        Artillery,
        'Move into a clear firing lane, then attack from two tiles away. I do my best work at distance.',
        0,
      ),
      msg(
        Infantry,
        'Keep our gunner protected — if the enemy reaches us, the artillery is vulnerable.',
        0,
      ),
      msg(Pioneer, 'Eliminate the enemy infantry to complete this range exercise.', 1),
    ],
    [
      msg(Pioneer, 'Direct hit! You used range and positioning like a professional.', 0),
      msg(Artillery, 'Remember: stay behind the front line and let the shells do the talking.'),
    ],
    [
      msg(Pioneer, 'The enemy is still standing. Adjust your angle and try again.', 1),
      msg(
        Infantry,
        'Tip: move the artillery into range, attack from distance, and avoid enemy counter-fire.',
        0,
      ),
    ],
  ),
  id: tutorialMapIds[3],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [9, 7, { h: 100, i: HQ.id, p: 2 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: blocklistUnitsExcept(Pioneer.id, Infantry.id, Artillery.id),
      fog: false,
      multiplier: 1,
      objectives: [[1, [Criteria.DefeatAmount, 0, 1, [1], null, 0, [], null]]],
      seedCapital: 500,
    },
    map: standardTutorialTerrain,
    size: { height: 8, width: 10 },
    teams: standardTeams(),
    units: [
      [3, 4, { a: [[1, 6]], g: 50, h: 100, i: Artillery.id, p: 1 }],
      [7, 4, { g: 50, h: 70, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Boot Camp 4: Long Shot',
  missionName: 'Long Shot',
  tags: [...tutorialTags],
};

const mission5: TutorialMissionDefinition = {
  description: 'Assault the enemy headquarters and learn the classic Open Wars victory condition.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Every campaign ends at the enemy HQ. Capturing it wins the battle.', 0),
      msg(
        Infantry,
        'Move a capture-capable unit onto the enemy headquarters and choose Capture.',
        0,
      ),
      msg(
        Pioneer,
        'The garrison is light, but do not rush blindly. Secure the approach first.',
        1,
      ),
      msg(Infantry, 'Capture the marked enemy HQ to claim victory.', 1),
    ],
    [
      msg(Pioneer, 'The enemy HQ is ours! That is how wars are won in Open Wars.', 0),
      msg(Infantry, 'HQ capture ends the fight and gives you control of enemy buildings.'),
    ],
    [
      msg(Pioneer, 'The headquarters still flies their colors. Plan another assault.', 1),
      msg(
        Infantry,
        'Tip: move infantry onto the enemy HQ tile and select Capture to finish the mission.',
        0,
      ),
    ],
  ),
  id: tutorialMapIds[4],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [8, 5, { h: 100, i: HQ.id, l: 1, p: 2 }],
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
    map: standardTutorialTerrain,
    size: { height: 8, width: 10 },
    teams: standardTeams(),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [4, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [7, 6, { g: 50, h: 80, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Boot Camp 5: Take the HQ',
  missionName: 'Take the HQ',
  tags: [...tutorialTags],
};

const mission6: TutorialMissionDefinition = {
  description:
    'Combine movement, combat, and capture in a short field exercise against a live enemy.',
  difficulty: 2,
  effects: createTutorialEffects(
    [
      msg(Pioneer, 'Final exam, Commander. Everything you learned comes together here.', 0),
      msg(
        Infantry,
        'Use infantry to fight, jeeps to reposition quickly, and pioneers to capture buildings.',
        0,
      ),
      msg(
        Pioneer,
        'Win by defeating all enemy units or capturing their HQ — just like a real battle.',
        1,
      ),
      msg(Infantry, 'Stay focused. This is your graduation mission. Make it count.', 1),
    ],
    [
      msg(Pioneer, 'Outstanding! You are ready for real campaign operations.', 0),
      msg(
        Infantry,
        'Boot Camp complete. Movement, combat, economy, range, and victory — you have it all.',
        1,
      ),
    ],
    [
      msg(Pioneer, 'The enemy still holds the field. Review your tactics and attack again.', 1),
      msg(
        Infantry,
        'Tip: defeat the remaining enemy forces or capture their HQ to secure victory.',
        0,
      ),
    ],
  ),
  id: tutorialMapIds[5],
  map: buildTutorialMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [6, 4, { h: 100, i: House.id, l: 1, p: 0 }],
      [9, 7, { h: 100, i: HQ.id, p: 2 }],
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
    map: standardTutorialTerrain,
    size: { height: 8, width: 10 },
    teams: standardTeams(200),
    units: [
      [3, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [4, 3, { g: 50, h: 100, i: Infantry.id, p: 1 }],
      [3, 4, { g: 60, h: 100, i: Jeep.id, p: 1 }],
      [7, 4, { g: 50, h: 90, i: Infantry.id, p: 2 }],
      [8, 6, { g: 50, h: 90, i: Infantry.id, p: 2 }],
    ],
  }),
  mapName: 'Boot Camp 6: Field Command',
  missionName: 'Field Command',
  tags: [...tutorialTags],
};

export const tutorialMissions: ReadonlyArray<TutorialMissionDefinition> = [
  mission1,
  mission2,
  mission3,
  mission4,
  mission5,
  mission6,
];

export function getTutorialMissionById(id: string) {
  return tutorialMissions.find((mission) => mission.id === id);
}

export function resolveTutorialMissionMapId(
  missionIndex: number,
  maps: ReadonlyArray<{ id: string; name: string }>,
) {
  const mission = tutorialMissions[missionIndex];
  if (!mission) {
    return null;
  }

  if (missionIndex === 0) {
    const mission1Map = findTutorialMission1Map(maps);
    if (mission1Map) {
      return mission1Map.id;
    }
  }

  return maps.find((mapObject) => mapObject.id === mission.id)?.id || mission.id;
}
