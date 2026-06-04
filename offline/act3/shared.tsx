import { encodeEffects, type Effects } from '@deities/apollo/Effects.tsx';
import toSlug from '@deities/apollo/lib/toSlug.tsx';
import { Campsite, Mountain, Plain, Ruins, Street } from '@deities/athena/info/Tile.tsx';
import { Biome } from '@deities/athena/map/Biome.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { type MapObject } from '@deities/hera/editor/Types.tsx';
import { buildTutorialMap } from '../tutorial/shared.tsx';

export const ACT_3_CAMPAIGN_ID = 'act-3-white-ridge';
export const ACT_3_CAMPAIGN_NAME = 'Act 3: White Ridge';
export const ACT_3_CAMPAIGN_DESCRIPTION =
  'Five frozen operations on the White Ridge front — an epic advance paid for in blood and silence.';

export const act3MapIds = [
  'local-map-act3-1',
  'local-map-act3-2',
  'local-map-act3-3',
  'local-map-act3-4',
  'local-map-act3-5',
] as const;

export type Act3MapId = (typeof act3MapIds)[number];

export type Act3MissionDefinition = Readonly<{
  description: string;
  difficulty: 3 | 4;
  effects: Effects;
  id: Act3MapId;
  map: MapData;
  mapName: string;
  missionName: string;
  tags: ReadonlyArray<string>;
}>;

export const act3MapSize = { height: 12, width: 16 } as const;

export const act3Tiles = {
  campsite: Campsite.id,
  mountain: Mountain.id,
  plain: Plain.id,
  ruins: Ruins.id,
  street: Street.id,
} as const;

const row = (...tiles: ReadonlyArray<number>) => tiles;

export const act3SnowTerrain = [
  ...row(
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.ruins,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.mountain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.campsite,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.ruins,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.ruins,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.campsite,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.ruins,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
  ),
  ...row(
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
    act3Tiles.street,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.plain,
    act3Tiles.mountain,
    act3Tiles.plain,
  ),
];

export function buildAct3Map(config: Parameters<typeof MapData.createMap>[0]) {
  return buildTutorialMap({
    ...config,
    config: {
      ...config.config,
      biome: Biome.Snow,
    },
  });
}

export function createAct3MapObject(
  mission: Act3MissionDefinition,
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

export function isOfficialAct3Map(mapObject: MapObject) {
  return act3MapIds.includes(mapObject.id as Act3MapId) || mapObject.tags.includes('act-3');
}
