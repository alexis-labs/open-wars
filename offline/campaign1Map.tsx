export {
  BOOT_CAMP_CAMPAIGN_DESCRIPTION as campaign1CampaignDescription,
  BOOT_CAMP_CAMPAIGN_NAME as campaign1MapName,
  tutorialMapIds,
} from './tutorial/shared.tsx';
export {
  tutorialMissions,
  resolveTutorialMissionMapId,
} from './tutorial/missions.tsx';
export {
  ensureTutorialCampaignMaps as ensureCampaign1TutorialMap,
  getDefaultTutorialMap,
  needsOfficialCampaignReseed,
} from './tutorial/seed.tsx';
export {
  isCampaign1MapName,
  isOfficialTutorialMap,
  tutorialCampaignVersion as campaign1TutorialVersion,
} from './tutorial/shared.tsx';

export const campaign1MapId = 'local-map-tutorial-1';

export const campaign1MissionName = 'First Contact';

export const campaign1MissionDescription =
  'Capture the neutral outpost to the east before the enemy can respond. A perfect introduction to Open Wars.';
