import validateMap from '@deities/athena/lib/validateMap.tsx';
import dropInactivePlayers from '@deities/athena/lib/dropInactivePlayers.tsx';
import { toTeamArray } from '@deities/athena/map/Team.tsx';
import AIRegistry from '@deities/dionysus/AIRegistry.tsx';
import { act1Missions } from '../../offline/act1/missions.tsx';
import { act2Missions } from '../../offline/act2/missions.tsx';
import { act3Missions } from '../../offline/act3/missions.tsx';
import { tutorialMissions } from '../../offline/tutorial/missions.tsx';
import { expect, test } from 'vitest';

const missions = [
  ...tutorialMissions,
  ...act1Missions,
  ...act2Missions,
  ...act3Missions,
];

test.each(missions.map((mission) => [mission.mapName, mission.map] as const))(
  '%s validates for save',
  (_name, map) => {
    const [validatedMap, error] = validateMap(
      map,
      AIRegistry,
      toTeamArray(dropInactivePlayers(map).teams),
    );
    expect(error, `expected map to validate, got ${error}`).toBeNull();
    expect(validatedMap).not.toBeNull();
  },
);
