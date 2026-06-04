import { validateObjectives } from '@deities/athena/Objectives.tsx';
import { expect, test } from 'vitest';
import {
  CAMPAIGN_1_ID,
  getOfficialCampaigns,
  isMissionUnlocked,
} from '../../offline/campaignCatalog.tsx';
import { createTutorialMapObject } from '../../offline/tutorial/shared.tsx';
import { ensureTutorialCampaignMaps } from '../../offline/tutorial/seed.tsx';
import { tutorialMissions } from '../../offline/tutorial/missions.tsx';

const creator = {
  displayName: 'Commander',
  id: 'open-wars-local-player',
  username: 'commander',
};

test('tutorial campaign seeds six official missions', () => {
  const maps = ensureTutorialCampaignMaps([], creator);
  const campaigns = getOfficialCampaigns(maps);

  expect(campaigns[0]?.id).toBe(CAMPAIGN_1_ID);
  expect(campaigns[0]?.missions).toHaveLength(6);
  expect(campaigns[0]?.name).toBe('Boot Camp');
});

test('tutorial missions validate objectives', () => {
  for (const mission of tutorialMissions) {
    expect(validateObjectives(mission.map)).toBe(true);
  }
});

test('tutorial missions unlock sequentially', () => {
  const maps = ensureTutorialCampaignMaps([], creator);
  const campaign = getOfficialCampaigns(maps)[0];
  expect(campaign).toBeDefined();

  const completed = new Set<string>();
  expect(isMissionUnlocked(campaign!, 0, completed)).toBe(true);
  expect(isMissionUnlocked(campaign!, 1, completed)).toBe(false);

  completed.add(campaign!.missions[0]!.mapId);
  expect(isMissionUnlocked(campaign!, 1, completed)).toBe(true);
  expect(isMissionUnlocked(campaign!, 2, completed)).toBe(false);
});

test('legacy campaign 1 map id is preserved during seeding', () => {
  const legacy = createTutorialMapObject(tutorialMissions[0]!, creator, 'legacy-campaign-1');
  const maps = ensureTutorialCampaignMaps(
    [{ ...legacy, name: 'Campaign 1' }],
    creator,
  );

  expect(maps.find((map) => map.name.startsWith('Boot Camp 1'))?.id).toBe('legacy-campaign-1');
});

test('boot camp lists first contact when mission 1 uses legacy map id', () => {
  const legacy = createTutorialMapObject(
    tutorialMissions[0]!,
    creator,
    'local-map-campaign-1',
  );
  const otherTutorialMaps = ensureTutorialCampaignMaps([], creator).slice(1);
  const maps = ensureTutorialCampaignMaps([legacy, ...otherTutorialMaps], creator);
  const bootCamp = getOfficialCampaigns(maps).find((campaign) => campaign.id === CAMPAIGN_1_ID);

  expect(bootCamp?.missions[0]?.name).toBe('First Contact');
  expect(bootCamp?.missions[0]?.mapId).toBe('local-map-campaign-1');
  expect(bootCamp?.missions).toHaveLength(6);
});
