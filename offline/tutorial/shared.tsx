import CharacterMessage from '@deities/apollo/CharacterMessage.tsx';
import { encodeEffects, type Effects } from '@deities/apollo/Effects.tsx';
import toSlug from '@deities/apollo/lib/toSlug.tsx';
import { Factory, HQ, House } from '@deities/athena/info/Building.tsx';
import { Forest, Mountain, Plain, Street } from '@deities/athena/info/Tile.tsx';
import { Artillery, Infantry, Jeep, Pioneer } from '@deities/athena/info/Unit.tsx';
import withModifiers from '@deities/athena/lib/withModifiers.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { type MapObject } from '@deities/hera/editor/Types.tsx';
import { type CharacterMessageEffectAction } from '@deities/apollo/Action.tsx';

export const BOOT_CAMP_CAMPAIGN_NAME = 'Boot Camp';
export const BOOT_CAMP_CAMPAIGN_DESCRIPTION =
  'Six guided missions that teach movement, combat, economy, and victory conditions in Open Wars.';

export const tutorialCampaignVersion = 6;

export const tutorialMapIds = [
  'local-map-tutorial-1',
  'local-map-tutorial-2',
  'local-map-tutorial-3',
  'local-map-tutorial-4',
  'local-map-tutorial-5',
  'local-map-tutorial-6',
] as const;

export type TutorialMapId = (typeof tutorialMapIds)[number];

const blocklistedUnitPool = [
  2, 6, 7, 12, 14, 15, 16, 18, 19, 22, 23, 25, 26, 36, 38, 39, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56,
] as const;

export function blocklistUnitsExcept(...allowed: ReadonlyArray<number>) {
  const allowedSet = new Set(allowed);
  return blocklistedUnitPool.filter((id) => !allowedSet.has(id));
}

export const tutorialTiles = {
  forest: Forest.id,
  mountain: Mountain.id,
  plain: Plain.id,
  street: Street.id,
};

export const standardTutorialTerrain = [
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
  tutorialTiles.plain,
  tutorialTiles.street,
  tutorialTiles.plain,
  tutorialTiles.forest,
  tutorialTiles.plain,
  tutorialTiles.street,
  tutorialTiles.plain,
  tutorialTiles.plain,

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
  tutorialTiles.forest,
  tutorialTiles.plain,
  tutorialTiles.street,
  tutorialTiles.street,
  tutorialTiles.plain,
  tutorialTiles.mountain,
  tutorialTiles.forest,
  tutorialTiles.plain,
  tutorialTiles.plain,
];

export function standardTeams(playerFunds = 0) {
  return [
    {
      id: 1,
      name: 'Blue',
      players: [
        {
          funds: playerFunds,
          id: 1,
          skills: [],
        },
      ],
    },
    {
      id: 2,
      name: 'Red',
      players: [
        {
          funds: 0,
          id: 2,
          skills: [],
        },
      ],
    },
  ];
}

export function createTutorialEffects(
  startMessages: ReadonlyArray<CharacterMessageEffectAction>,
  winMessages: ReadonlyArray<CharacterMessageEffectAction>,
  loseMessages: ReadonlyArray<CharacterMessageEffectAction>,
): Effects {
  return new Map([
    [
      'Start',
      new Set([
        {
          actions: startMessages,
        },
      ]),
    ],
    [
      'GameEnd',
      new Set([
        {
          actions: winMessages,
          conditions: [{ type: 'GameEnd', value: 'win' }],
        },
        {
          actions: loseMessages,
          conditions: [{ type: 'GameEnd', value: 'lose' }],
        },
      ]),
    ],
  ]);
}

export function msg(
  unit: typeof Pioneer | typeof Infantry | typeof Artillery | typeof Jeep,
  message: string,
  variant = 0,
) {
  return CharacterMessage(unit, message, 'self', variant);
}

export type TutorialMissionDefinition = Readonly<{
  description: string;
  difficulty: 1 | 2;
  effects: Effects;
  id: TutorialMapId;
  map: MapData;
  mapName: string;
  missionName: string;
  tags: ReadonlyArray<string>;
}>;

export function createTutorialMapObject(
  mission: TutorialMissionDefinition,
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

export function buildTutorialMap(
  config: Parameters<typeof MapData.createMap>[0],
): MapData {
  return withModifiers(MapData.createMap(config));
}

export const LEGACY_CAMPAIGN_1_MAP_ID = 'local-map-campaign-1';

export function isCampaign1MapName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === 'campaign 1' || normalized === 'campain 1';
}

export function findTutorialMission1Map(
  maps: ReadonlyArray<{ id: string; name: string }>,
) {
  return (
    maps.find((mapObject) => mapObject.id === tutorialMapIds[0]) ||
    maps.find((mapObject) => mapObject.id === LEGACY_CAMPAIGN_1_MAP_ID) ||
    maps.find((mapObject) => isCampaign1MapName(mapObject.name))
  );
}

export function isOfficialTutorialMap(mapObject: MapObject) {
  return (
    tutorialMapIds.includes(mapObject.id as TutorialMapId) ||
    isCampaign1MapName(mapObject.name) ||
    mapObject.tags.includes('tutorial')
  );
}

export { Factory, HQ, House, Pioneer, Infantry, Artillery, Jeep };
