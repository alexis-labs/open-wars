import { encodeEffects, type Effects } from '@deities/apollo/Effects.tsx';
import toSlug from '@deities/apollo/lib/toSlug.tsx';
import { Campsite, Mountain, Plain, Ruins, Street } from '@deities/athena/info/Tile.tsx';
import { Biome } from '@deities/athena/map/Biome.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { type MapObject } from '@deities/hera/editor/Types.tsx';
import { buildTutorialMap } from '../tutorial/shared.tsx';

export const ACT_2_CAMPAIGN_ID = 'act-2-sunder-wastes';
export const ACT_2_CAMPAIGN_NAME = 'Act 2: Sunder Wastes';
export const ACT_2_CAMPAIGN_DESCRIPTION =
  'Five epic desert operations as Kestrel Battalion crosses the scorching wastes to break Red’s southern line.';

export const act2MapIds = [
  'local-map-act2-1',
  'local-map-act2-2',
  'local-map-act2-3',
  'local-map-act2-4',
  'local-map-act2-5',
] as const;

export type Act2MapId = (typeof act2MapIds)[number];

export type Act2MissionDefinition = Readonly<{
  description: string;
  difficulty: 2 | 3;
  effects: Effects;
  id: Act2MapId;
  map: MapData;
  mapName: string;
  missionName: string;
  tags: ReadonlyArray<string>;
}>;

export const act2MapSize = { height: 12, width: 14 } as const;

export const act2Tiles = {
  campsite: Campsite.id,
  mountain: Mountain.id,
  plain: Plain.id,
  ruins: Ruins.id,
  street: Street.id,
} as const;

const row = (...tiles: ReadonlyArray<number>) => tiles;

export const act2DesertTerrain = [
  ...row(
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.ruins,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.mountain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.campsite,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.ruins,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.mountain,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.ruins,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.campsite,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.ruins,
    act2Tiles.plain,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
  ),
  ...row(
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.mountain,
    act2Tiles.plain,
    act2Tiles.street,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.plain,
    act2Tiles.mountain,
  ),
];

export function buildAct2Map(config: Parameters<typeof MapData.createMap>[0]) {
  return buildTutorialMap({
    ...config,
    config: {
      ...config.config,
      biome: Biome.Desert,
    },
  });
}

export function createAct2MapObject(
  mission: Act2MissionDefinition,
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

export function isOfficialAct2Map(mapObject: MapObject) {
  return act2MapIds.includes(mapObject.id as Act2MapId) || mapObject.tags.includes('act-2');
}
