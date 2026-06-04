import { type MapObject } from '@deities/hera/editor/Types.tsx';
import { act1Missions } from '../act1/missions.tsx';
import { act1MapIds, createAct1MapObject, isOfficialAct1Map } from '../act1/shared.tsx';
import { act2Missions } from '../act2/missions.tsx';
import { act2MapIds, createAct2MapObject, isOfficialAct2Map } from '../act2/shared.tsx';
import { act3Missions } from '../act3/missions.tsx';
import { act3MapIds, createAct3MapObject, isOfficialAct3Map } from '../act3/shared.tsx';
import { tutorialMissions } from './missions.tsx';
import {
  createTutorialMapObject,
  findTutorialMission1Map,
  isOfficialTutorialMap,
  tutorialMapIds,
} from './shared.tsx';

export function needsOfficialCampaignReseed(maps: ReadonlyArray<MapObject>) {
  const hasTutorialMission1 = Boolean(findTutorialMission1Map(maps));

  if (!hasTutorialMission1) {
    return true;
  }

  if (
    tutorialMapIds
      .slice(1)
      .some((mapId) => !maps.some((mapObject) => mapObject.id === mapId))
  ) {
    return true;
  }

  if (act1MapIds.some((mapId) => !maps.some((mapObject) => mapObject.id === mapId))) {
    return true;
  }

  if (act2MapIds.some((mapId) => !maps.some((mapObject) => mapObject.id === mapId))) {
    return true;
  }

  return act3MapIds.some((mapId) => !maps.some((mapObject) => mapObject.id === mapId));
}

export function ensureOfficialCampaignMaps(
  maps: ReadonlyArray<MapObject>,
  creator: MapObject['creator'],
): ReadonlyArray<MapObject> {
  const legacyMission1 = findTutorialMission1Map(maps);

  const preservedTutorialIds = new Map<number, string>();
  if (legacyMission1) {
    preservedTutorialIds.set(0, legacyMission1.id);
  }

  const nextMaps = maps.filter(
    (mapObject) =>
      !isOfficialTutorialMap(mapObject) &&
      !isOfficialAct1Map(mapObject) &&
      !isOfficialAct2Map(mapObject) &&
      !isOfficialAct3Map(mapObject) &&
      !tutorialMapIds.includes(mapObject.id as (typeof tutorialMapIds)[number]),
  );

  const tutorialSeeded = tutorialMissions.map((mission, index) => {
    const id = preservedTutorialIds.get(index) || mission.id;
    return createTutorialMapObject(mission, creator, id);
  });

  const act1Seeded = act1Missions.map((mission) => createAct1MapObject(mission, creator, mission.id));

  const act2Seeded = act2Missions.map((mission) => createAct2MapObject(mission, creator, mission.id));

  const act3Seeded = act3Missions.map((mission) => createAct3MapObject(mission, creator, mission.id));

  return [...tutorialSeeded, ...act1Seeded, ...act2Seeded, ...act3Seeded, ...nextMaps];
}

export const ensureTutorialCampaignMaps = ensureOfficialCampaignMaps;

export function getDefaultTutorialMap(maps: ReadonlyArray<MapObject>) {
  return (
    findTutorialMission1Map(maps) ||
    maps.find((mapObject) => isOfficialTutorialMap(mapObject)) ||
    null
  );
}
