import { Criteria } from '@deities/athena/Objectives.tsx';
import MapData, { type TileMap } from '@deities/athena/MapData.tsx';
import { type PlainBuilding } from '@deities/athena/map/Building.tsx';
import { type PlainMapConfig } from '@deities/athena/map/PlainMap.tsx';
import { type PlainUnit } from '@deities/athena/map/Unit.tsx';
import { type PlainObjective } from '@deities/athena/Objectives.tsx';
import { act1StandardTerrain } from '../act1/shared.tsx';
import { act2DesertTerrain, act2Tiles } from '../act2/shared.tsx';
import { act3SnowTerrain, act3Tiles } from '../act3/shared.tsx';
import {
  blocklistUnitsExcept,
  standardTeams,
  standardTutorialTerrain,
  tutorialTiles,
} from '../tutorial/shared.tsx';
import { type MissionRegistryEntry } from './registry.ts';
import { buildingSymbol, unitSymbol } from './symbolMaps.ts';

const terrainByConstant: Record<string, ReadonlyArray<number>> = {
  act1StandardTerrain,
  act2DesertTerrain,
  act3SnowTerrain,
  standardTutorialTerrain,
};

const tilesByNamespace = {
  act2Tiles,
  act3Tiles,
  tutorialTiles,
} as const;

function arraysEqual(a: ReadonlyArray<number>, b: ReadonlyArray<number>) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeTileMap(mapTiles: TileMap): ReadonlyArray<number> {
  return mapTiles.map((tile) => (typeof tile === 'number' ? tile : tile[0]));
}

function formatPlainEntity(entity: PlainBuilding | PlainUnit, kind: 'building' | 'unit'): string {
  const parts: string[] = [];
  if ('g' in entity && entity.g != null) {
    parts.push(`g: ${entity.g}`);
  }
  parts.push(`h: ${entity.h}`);
  parts.push(`i: ${kind === 'building' ? buildingSymbol(entity.i) : unitSymbol(entity.i)}`);
  if ('l' in entity && entity.l != null) {
    parts.push(`l: ${entity.l}`);
  }
  parts.push(`p: ${entity.p}`);
  if ('b' in entity && entity.b != null) {
    const behaviors = Array.isArray(entity.b) ? entity.b : [entity.b];
    parts.push(`b: [${behaviors.join(', ')}]`);
  }
  if ('s' in entity && entity.s != null) {
    const skills = Array.isArray(entity.s) ? entity.s : [entity.s];
    parts.push(`s: [${skills.join(', ')}]`);
  }
  return `{ ${parts.join(', ')} }`;
}

function formatEntitiesList(
  list: ReadonlyArray<readonly [number, number, PlainBuilding | PlainUnit]>,
  kind: 'building' | 'unit',
): string {
  if (!list.length) {
    return '[]';
  }
  const lines = list.map(
    ([x, y, entity]) => `      [${x}, ${y}, ${formatPlainEntity(entity, kind)}],`,
  );
  return `[\n${lines.join('\n')}\n    ]`;
}

function formatBlocklistedUnits(units: ReadonlyArray<number>): string {
  for (let allowedId = 1; allowedId <= 60; allowedId++) {
    try {
      const expected = blocklistUnitsExcept(allowedId);
      if (arraysEqual(units, expected)) {
        return `blocklistUnitsExcept(${unitSymbol(allowedId)})`;
      }
    } catch {
      // ignore
    }
  }
  return JSON.stringify(units);
}

function formatObjectivesEntry(id: number, objective: PlainObjective): string {
  if (id === 0 && objective[0] === Criteria.Default) {
    return '[0, [0, 0, null]]';
  }
  const criteriaName = Criteria[objective[0] as Criteria];
  if (typeof criteriaName === 'string') {
    return `[Criteria.${criteriaName}, ${JSON.stringify(objective)}]`;
  }
  return `[${id}, ${JSON.stringify(objective)}]`;
}

function formatObjectives(objectives: PlainMapConfig['objectives']): string {
  if (!objectives?.length) {
    return '[[0, [0, 0, null]]]';
  }
  const lines = [...objectives].map(([id, objective]) => {
    return `        ${formatObjectivesEntry(id, objective)},`;
  });
  return `[\n${lines.join('\n')}\n      ]`;
}

function formatFog(fog: PlainMapConfig['fog']): string {
  if (fog === false) {
    return 'false';
  }
  if (fog === true) {
    return 'true';
  }
  return String(fog);
}

function formatConfig(config: PlainMapConfig): string {
  const lines = [
    `      blocklistedBuildings: ${JSON.stringify(config.blocklistedBuildings)},`,
    `      blocklistedSkills: ${JSON.stringify(config.blocklistedSkills || [])},`,
    `      blocklistedUnits: ${formatBlocklistedUnits(config.blocklistedUnits)},`,
    `      fog: ${formatFog(config.fog)},`,
    `      multiplier: ${config.multiplier},`,
    `      objectives: ${formatObjectives(config.objectives)},`,
    `      seedCapital: ${config.seedCapital},`,
  ];
  if (config.initialCharge != null) {
    lines.splice(5, 0, `      initialCharge: ${config.initialCharge},`);
  }
  return `{\n${lines.join('\n')}\n    }`;
}

function formatTerrain(mapTiles: TileMap, entry: MissionRegistryEntry, width: number): string {
  const tileIds = normalizeTileMap(mapTiles);
  const standard = terrainByConstant[entry.terrainConstant];
  if (standard && arraysEqual(tileIds, standard)) {
    return entry.terrainConstant;
  }

  const tileNamespace = tilesByNamespace[entry.tilesNamespace];
  const idToName = new Map<number, string>();
  for (const [name, id] of Object.entries(tileNamespace)) {
    idToName.set(id, `${entry.tilesNamespace}.${name}`);
  }

  void width;
  const tileNames = tileIds.map((id) => idToName.get(id) || String(id));
  return `[\n    ${tileNames.join(',\n    ')},\n  ]`;
}

function usesStandardTeams(teams: ReturnType<MapData['toJSON']>['teams']): boolean {
  const standard = standardTeams(teams[0]?.players[0]?.funds ?? 0);
  return JSON.stringify(teams) === JSON.stringify(standard);
}

export function generateMapConfig(map: MapData, entry: MissionRegistryEntry): string {
  const plain = map.toJSON();
  const sizeLine = entry.sizeConstant
    ? `size: ${entry.sizeConstant},`
    : `size: { height: ${plain.size.height}, width: ${plain.size.width} },`;
  const teamsLine = usesStandardTeams(plain.teams)
    ? 'teams: standardTeams(),'
    : `teams: ${JSON.stringify(plain.teams)},`;

  return `${entry.buildMapCall}({
    buildings: ${formatEntitiesList(plain.buildings, 'building')},
    config: ${formatConfig(plain.config)},
    map: ${formatTerrain(plain.map, entry, plain.size.width)},
    ${sizeLine}
    ${teamsLine}
    units: ${formatEntitiesList(plain.units, 'unit')},
  })`;
}
