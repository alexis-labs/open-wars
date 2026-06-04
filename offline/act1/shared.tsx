import { encodeEffects, type Effects } from '@deities/apollo/Effects.tsx';
import toSlug from '@deities/apollo/lib/toSlug.tsx';
import { type MapObject } from '@deities/hera/editor/Types.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { tutorialTiles } from '../tutorial/shared.tsx';

export const ACT_1_CAMPAIGN_ID = 'act-1-vera-pass';
export const ACT_1_CAMPAIGN_NAME = 'Act 1: Vera Pass';
export const ACT_1_CAMPAIGN_DESCRIPTION =
  'Five story missions with Kestrel Battalion as you push through the Vera Pass against Red forces.';

export const act1MapIds = [
  'local-map-act1-1',
  'local-map-act1-2',
  'local-map-act1-3',
  'local-map-act1-4',
  'local-map-act1-5',
] as const;

export type Act1MapId = (typeof act1MapIds)[number];

export type Act1MissionDefinition = Readonly<{
  description: string;
  difficulty: 1 | 2;
  effects: Effects;
  id: Act1MapId;
  map: MapData;
  mapName: string;
  missionName: string;
  tags: ReadonlyArray<string>;
}>;

export const act1MapSize = { height: 10, width: 12 } as const;

const row = (...tiles: ReadonlyArray<number>) => tiles;

export const act1StandardTerrain = [
  ...row(
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.forest,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.mountain,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.forest,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.plain,
    tutorialTiles.mountain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.mountain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.street,
    tutorialTiles.plain,
  ),
  ...row(
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.street,
    tutorialTiles.street,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.forest,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.plain,
    tutorialTiles.mountain,
  ),
];

export function createAct1MapObject(
  mission: Act1MissionDefinition,
  creator: MapObject['creator'],
  id = mission.id,
): MapObject {
  return {
    campaigns: {
      edges: [],
    },
    canEdit: true,
    creator,
    effects: JSON.stringify(encodeEffects(mission.effects)),
    id,
    name: mission.mapName,
    slug: toSlug(mission.mapName),
    state: JSON.stringify(mission.map.toJSON()),
    tags: [...mission.tags],
  };
}

export function isOfficialAct1Map(mapObject: MapObject) {
  return (
    act1MapIds.includes(mapObject.id as Act1MapId) || mapObject.tags.includes('act-1')
  );
}
