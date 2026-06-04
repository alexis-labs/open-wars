import { type AttributeRange } from '@deities/athena/lib/getAttributeRange.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { type MapObject } from '@deities/hera/editor/Types.tsx';
import {
  ACT_1_CAMPAIGN_DESCRIPTION,
  ACT_1_CAMPAIGN_ID,
  ACT_1_CAMPAIGN_NAME,
  isOfficialAct1Map,
} from './act1/shared.tsx';
import { act1Missions, resolveAct1MissionMapId } from './act1/missions.tsx';
import {
  ACT_2_CAMPAIGN_DESCRIPTION,
  ACT_2_CAMPAIGN_ID,
  ACT_2_CAMPAIGN_NAME,
  isOfficialAct2Map,
} from './act2/shared.tsx';
import { act2Missions, resolveAct2MissionMapId } from './act2/missions.tsx';
import {
  ACT_3_CAMPAIGN_DESCRIPTION,
  ACT_3_CAMPAIGN_ID,
  ACT_3_CAMPAIGN_NAME,
  isOfficialAct3Map,
} from './act3/shared.tsx';
import { act3Missions, resolveAct3MissionMapId } from './act3/missions.tsx';
import {
  BOOT_CAMP_CAMPAIGN_DESCRIPTION,
  BOOT_CAMP_CAMPAIGN_NAME,
  isOfficialTutorialMap,
} from './tutorial/shared.tsx';
import { resolveTutorialMissionMapId, tutorialMissions } from './tutorial/missions.tsx';

export type OfflineCampaignMission = Readonly<{
  description: string;
  difficulty: AttributeRange;
  mapId: string;
  name: string;
}>;

export type OfflineCampaign = Readonly<{
  description: string;
  difficulty: AttributeRange;
  id: string;
  missions: ReadonlyArray<OfflineCampaignMission>;
  name: string;
  requiresCampaignId?: string;
}>;

export const CAMPAIGN_1_ID = 'campaign-1-boot-camp';
export const CUSTOM_MISSIONS_ID = 'custom-missions';

const difficultyLabels: Record<AttributeRange, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Normal',
  4: 'Hard',
  5: 'Very Hard',
};

export function isOfficialCampaignMap(mapObject: MapObject) {
  return (
    isOfficialTutorialMap(mapObject) ||
    isOfficialAct1Map(mapObject) ||
    isOfficialAct2Map(mapObject) ||
    isOfficialAct3Map(mapObject)
  );
}

export function getDifficultyLabel(difficulty: AttributeRange) {
  return difficultyLabels[difficulty];
}

export function getCampaignProgress(
  campaign: OfflineCampaign,
  completedMapIds: ReadonlySet<string>,
) {
  const completed = campaign.missions.filter((mission) => completedMapIds.has(mission.mapId)).length;
  return {
    completed,
    total: campaign.missions.length,
  };
}

export function isCampaignComplete(
  campaign: OfflineCampaign,
  completedMapIds: ReadonlySet<string>,
) {
  return campaign.missions.every((mission) => completedMapIds.has(mission.mapId));
}

export function isCampaignUnlocked(
  campaign: OfflineCampaign,
  completedMapIds: ReadonlySet<string>,
  campaigns: ReadonlyArray<OfflineCampaign>,
) {
  if (!campaign.requiresCampaignId) {
    return true;
  }

  const requiredCampaign = campaigns.find(({ id }) => id === campaign.requiresCampaignId);
  if (!requiredCampaign) {
    return true;
  }

  return isCampaignComplete(requiredCampaign, completedMapIds);
}

export function getCampaignUnlockRequirement(
  campaign: OfflineCampaign,
  campaigns: ReadonlyArray<OfflineCampaign>,
): string | null {
  if (!campaign.requiresCampaignId) {
    return null;
  }

  const requiredCampaign = campaigns.find(({ id }) => id === campaign.requiresCampaignId);
  return requiredCampaign ? `Complete "${requiredCampaign.name}" to unlock` : null;
}

export function isMissionUnlocked(
  campaign: OfflineCampaign,
  missionIndex: number,
  completedMapIds: ReadonlySet<string>,
) {
  if (missionIndex <= 0) {
    return true;
  }

  const previousMission = campaign.missions[missionIndex - 1];
  return previousMission ? completedMapIds.has(previousMission.mapId) : false;
}

export function getMissionUnlockRequirement(
  campaign: OfflineCampaign,
  missionIndex: number,
): string | null {
  if (missionIndex <= 0) {
    return null;
  }

  const previousMission = campaign.missions[missionIndex - 1];
  return previousMission ? `Complete "${previousMission.name}" to unlock` : null;
}

export function getMapSummary(mapObject: MapObject) {
  try {
    const map = MapData.fromJSON(mapObject.state);
    return map
      ? `${map.size.width}x${map.size.height} · ${map.active.length} players`
      : 'Unavailable';
  } catch {
    return 'Unavailable';
  }
}

export function estimateMapDifficulty(mapObject: MapObject): AttributeRange {
  try {
    const map = MapData.fromJSON(mapObject.state);
    if (!map) {
      return 3;
    }

    let difficulty = 1;
    const area = map.size.width * map.size.height;

    if (area > 144 || map.size.width > 12 || map.size.height > 12) {
      difficulty += 1;
    }

    if (map.active.length >= 3) {
      difficulty += 1;
    }

    if (map.units.size >= 12) {
      difficulty += 1;
    }

    if (map.buildings.size >= 8) {
      difficulty += 1;
    }

    return Math.min(5, Math.max(1, difficulty)) as AttributeRange;
  } catch {
    return 3;
  }
}

function resolveMissionMap(missions: ReadonlyArray<OfflineCampaignMission>, maps: ReadonlyArray<MapObject>) {
  return missions.flatMap((mission) => {
    const mapObject = maps.find((map) => map.id === mission.mapId);
    return mapObject ? [{ mission, mapObject }] : [];
  });
}

function buildBootCampCampaign(maps: ReadonlyArray<MapObject>): OfflineCampaign | null {
  const missions: ReadonlyArray<OfflineCampaignMission> = tutorialMissions.map((mission, index) => ({
    description: mission.description,
    difficulty: mission.difficulty,
    mapId: resolveTutorialMissionMapId(index, maps) || mission.id,
    name: mission.missionName,
  }));

  const bootCamp: OfflineCampaign = {
    description: BOOT_CAMP_CAMPAIGN_DESCRIPTION,
    difficulty: 1,
    id: CAMPAIGN_1_ID,
    missions,
    name: BOOT_CAMP_CAMPAIGN_NAME,
  };

  const resolved = resolveMissionMap(bootCamp.missions, maps);
  if (!resolved.length) {
    return null;
  }

  return {
    ...bootCamp,
    missions: resolved.map(({ mission }) => mission),
  };
}

function buildAct1Campaign(maps: ReadonlyArray<MapObject>): OfflineCampaign | null {
  const missions: ReadonlyArray<OfflineCampaignMission> = act1Missions.map((mission, index) => ({
    description: mission.description,
    difficulty: mission.difficulty,
    mapId: resolveAct1MissionMapId(index, maps) || mission.id,
    name: mission.missionName,
  }));

  const act1: OfflineCampaign = {
    description: ACT_1_CAMPAIGN_DESCRIPTION,
    difficulty: 1,
    id: ACT_1_CAMPAIGN_ID,
    missions,
    name: ACT_1_CAMPAIGN_NAME,
    requiresCampaignId: CAMPAIGN_1_ID,
  };

  const resolved = resolveMissionMap(act1.missions, maps);
  if (!resolved.length) {
    return null;
  }

  return {
    ...act1,
    missions: resolved.map(({ mission }) => mission),
  };
}

function buildAct2Campaign(maps: ReadonlyArray<MapObject>): OfflineCampaign | null {
  const missions: ReadonlyArray<OfflineCampaignMission> = act2Missions.map((mission, index) => ({
    description: mission.description,
    difficulty: mission.difficulty,
    mapId: resolveAct2MissionMapId(index, maps) || mission.id,
    name: mission.missionName,
  }));

  const act2: OfflineCampaign = {
    description: ACT_2_CAMPAIGN_DESCRIPTION,
    difficulty: 3,
    id: ACT_2_CAMPAIGN_ID,
    missions,
    name: ACT_2_CAMPAIGN_NAME,
    requiresCampaignId: ACT_1_CAMPAIGN_ID,
  };

  const resolved = resolveMissionMap(act2.missions, maps);
  if (!resolved.length) {
    return null;
  }

  return {
    ...act2,
    missions: resolved.map(({ mission }) => mission),
  };
}

function buildAct3Campaign(maps: ReadonlyArray<MapObject>): OfflineCampaign | null {
  const missions: ReadonlyArray<OfflineCampaignMission> = act3Missions.map((mission, index) => ({
    description: mission.description,
    difficulty: mission.difficulty,
    mapId: resolveAct3MissionMapId(index, maps) || mission.id,
    name: mission.missionName,
  }));

  const act3: OfflineCampaign = {
    description: ACT_3_CAMPAIGN_DESCRIPTION,
    difficulty: 4,
    id: ACT_3_CAMPAIGN_ID,
    missions,
    name: ACT_3_CAMPAIGN_NAME,
    requiresCampaignId: ACT_2_CAMPAIGN_ID,
  };

  const resolved = resolveMissionMap(act3.missions, maps);
  if (!resolved.length) {
    return null;
  }

  return {
    ...act3,
    missions: resolved.map(({ mission }) => mission),
  };
}

export function getOfficialCampaigns(maps: ReadonlyArray<MapObject>): ReadonlyArray<OfflineCampaign> {
  return [
    buildBootCampCampaign(maps),
    buildAct1Campaign(maps),
    buildAct2Campaign(maps),
    buildAct3Campaign(maps),
  ].filter(Boolean) as ReadonlyArray<OfflineCampaign>;
}

export function getCustomMissionsCampaign(
  maps: ReadonlyArray<MapObject>,
): OfflineCampaign | null {
  const customMaps = maps.filter((mapObject) => !isOfficialCampaignMap(mapObject));

  if (!customMaps.length) {
    return null;
  }

  const missions = customMaps.map((mapObject) => ({
    description: 'A custom mission created in the map editor.',
    difficulty: estimateMapDifficulty(mapObject),
    mapId: mapObject.id,
    name: mapObject.name || 'Untitled Map',
  }));

  const averageDifficulty = Math.round(
    missions.reduce((sum, mission) => sum + mission.difficulty, 0) / missions.length,
  ) as AttributeRange;

  return {
    description: 'Play maps you created in the map editor.',
    difficulty: Math.min(5, Math.max(1, averageDifficulty)) as AttributeRange,
    id: CUSTOM_MISSIONS_ID,
    missions,
    name: 'Custom Missions',
  };
}

export function getCampaignCatalog(maps: ReadonlyArray<MapObject>): ReadonlyArray<OfflineCampaign> {
  return [
    ...getOfficialCampaigns(maps),
    ...([getCustomMissionsCampaign(maps)].filter(Boolean) as ReadonlyArray<OfflineCampaign>),
  ];
}

export function findCampaignMap(
  maps: ReadonlyArray<MapObject>,
  mapId: string,
): MapObject | undefined {
  return maps.find((mapObject) => mapObject.id === mapId);
}
