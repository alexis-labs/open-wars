import { act1MapIds } from '../act1/shared.tsx';
import { act2MapIds } from '../act2/shared.tsx';
import { act3MapIds } from '../act3/shared.tsx';
import { LEGACY_CAMPAIGN_1_MAP_ID, tutorialMapIds } from '../tutorial/shared.tsx';

export const OFFICIAL_MAP_IDS = new Set<string>([
  ...tutorialMapIds,
  LEGACY_CAMPAIGN_1_MAP_ID,
  ...act1MapIds,
  ...act2MapIds,
  ...act3MapIds,
]);

export function isOfficialEditorMapId(mapId: string) {
  return OFFICIAL_MAP_IDS.has(mapId);
}
