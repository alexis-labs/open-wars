import { Plain } from '@deities/athena/info/Tile.tsx';
import { Flamethrower, Pioneer, Saboteur, Sniper } from '@deities/athena/info/Unit.tsx';
import withModifiers from '@deities/athena/lib/withModifiers.tsx';
import { Fog } from '@deities/athena/map/PlainMap.tsx';
import MapData from '@deities/athena/MapData.tsx';

const map = Array.from({ length: 100 }, () => Plain.id);

export default withModifiers(
  MapData.createMap({
    config: {
      fog: Fog.Exploration,
    },
    map,
    size: { height: 10, width: 10 },
    units: [
      [2, 5, Sniper.create(1).toJSON()],
      [3, 5, Saboteur.create(1).toJSON()],
      [4, 6, Flamethrower.create(1).toJSON()],
      [4, 7, Pioneer.create(1).toJSON()],
    ],
  }),
);
