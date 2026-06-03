import { type MapMetadata } from '@deities/apollo/MapMetadata.tsx';
import { Factory, HQ, House } from '@deities/athena/info/Building.tsx';
import { Forest, Mountain, Plain, Street } from '@deities/athena/info/Tile.tsx';
import { Artillery, Infantry, Jeep, Pioneer } from '@deities/athena/info/Unit.tsx';
import withModifiers from '@deities/athena/lib/withModifiers.tsx';
import MapData from '@deities/athena/MapData.tsx';

export const starterMapMetadata: MapMetadata = {
  name: 'Open Wars Training Grounds',
  tags: ['open-wars', 'starter'],
  teamPlay: false,
};

const tiles = {
  forest: Forest.id,
  mountain: Mountain.id,
  plain: Plain.id,
  street: Street.id,
};

export default withModifiers(
  MapData.createMap({
    buildings: [
      [1, 1, { h: 100, i: HQ.id, p: 1 }],
      [10, 8, { h: 100, i: HQ.id, p: 2 }],
      [2, 2, { h: 100, i: Factory.id, p: 1 }],
      [9, 7, { h: 100, i: Factory.id, p: 2 }],
      [4, 3, { h: 100, i: House.id, p: 0 }],
      [7, 6, { h: 100, i: House.id, p: 0 }],
    ],
    config: {
      blocklistedBuildings: [],
      blocklistedSkills: [],
      blocklistedUnits: [],
      fog: false,
      multiplier: 1,
      objectives: [[0, [0, 0, null]]],
      seedCapital: 1000,
    },
    map: [
      tiles.plain,
      tiles.plain,
      tiles.forest,
      tiles.mountain,
      tiles.plain,
      tiles.street,
      tiles.street,
      tiles.plain,
      tiles.forest,
      tiles.plain,

      tiles.plain,
      tiles.street,
      tiles.street,
      tiles.plain,
      tiles.forest,
      tiles.plain,
      tiles.street,
      tiles.plain,
      tiles.mountain,
      tiles.plain,

      tiles.forest,
      tiles.street,
      tiles.plain,
      tiles.plain,
      tiles.street,
      tiles.street,
      tiles.plain,
      tiles.plain,
      tiles.street,
      tiles.forest,

      tiles.plain,
      tiles.plain,
      tiles.mountain,
      tiles.street,
      tiles.plain,
      tiles.forest,
      tiles.plain,
      tiles.street,
      tiles.plain,
      tiles.plain,

      tiles.plain,
      tiles.plain,
      tiles.street,
      tiles.plain,
      tiles.forest,
      tiles.plain,
      tiles.street,
      tiles.mountain,
      tiles.plain,
      tiles.plain,

      tiles.forest,
      tiles.street,
      tiles.plain,
      tiles.plain,
      tiles.street,
      tiles.street,
      tiles.plain,
      tiles.plain,
      tiles.street,
      tiles.forest,

      tiles.plain,
      tiles.mountain,
      tiles.plain,
      tiles.street,
      tiles.plain,
      tiles.forest,
      tiles.plain,
      tiles.street,
      tiles.street,
      tiles.plain,

      tiles.plain,
      tiles.forest,
      tiles.plain,
      tiles.street,
      tiles.street,
      tiles.plain,
      tiles.mountain,
      tiles.forest,
      tiles.plain,
      tiles.plain,
    ],
    size: {
      height: 8,
      width: 10,
    },
    teams: [
      {
        id: 1,
        name: 'Blue',
        players: [
          {
            funds: 0,
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
    ],
    units: [
      [2, 3, { g: 40, h: 100, i: Pioneer.id, p: 1 }],
      [3, 2, { g: 40, h: 100, i: Infantry.id, p: 1 }],
      [4, 2, { g: 60, h: 100, i: Jeep.id, p: 1 }],
      [3, 4, { a: [[1, 6]], g: 50, h: 100, i: Artillery.id, p: 1 }],
      [9, 6, { g: 40, h: 100, i: Pioneer.id, p: 2 }],
      [8, 7, { g: 40, h: 100, i: Infantry.id, p: 2 }],
      [7, 7, { g: 60, h: 100, i: Jeep.id, p: 2 }],
      [8, 5, { a: [[1, 6]], g: 50, h: 100, i: Artillery.id, p: 2 }],
    ],
  }),
);
