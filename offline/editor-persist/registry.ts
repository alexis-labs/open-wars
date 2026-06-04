import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function getRepoRoot(): string {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  if (existsSync(join(repoRoot, 'offline', 'tutorial'))) {
    return repoRoot;
  }

  const cwd = process.cwd();
  if (existsSync(join(cwd, 'tutorial'))) {
    return join(cwd, '..');
  }

  return repoRoot;
}

const repoRoot = getRepoRoot();
import { act1MapIds } from '../act1/shared.tsx';
import { act2MapIds } from '../act2/shared.tsx';
import { act3MapIds } from '../act3/shared.tsx';
import { LEGACY_CAMPAIGN_1_MAP_ID, tutorialMapIds } from '../tutorial/shared.tsx';

export type MissionRegistryEntry = Readonly<{
  buildMapCall: 'buildTutorialMap' | 'buildAct2Map' | 'buildAct3Map';
  mapId: string;
  missionVariable: string;
  missionsFile: string;
  sizeConstant: string | null;
  tagsConstant: string;
  terrainConstant: string;
  tilesNamespace: 'tutorialTiles' | 'act2Tiles' | 'act3Tiles';
}>;

function entry(
  partial: Omit<MissionRegistryEntry, 'missionsFile'> & { act: 'tutorial' | 'act1' | 'act2' | 'act3' },
): MissionRegistryEntry {
  return {
    ...partial,
    missionsFile: join(repoRoot, 'offline', partial.act, 'missions.tsx'),
  };
}

const tutorialEntries: ReadonlyArray<MissionRegistryEntry> = tutorialMapIds.map((mapId, index) =>
  entry({
    act: 'tutorial',
    buildMapCall: 'buildTutorialMap',
    mapId,
    missionVariable: `mission${index + 1}`,
    sizeConstant: null,
    tagsConstant: 'tutorialTags',
    terrainConstant: 'standardTutorialTerrain',
    tilesNamespace: 'tutorialTiles',
  }),
);

const act1Entries: ReadonlyArray<MissionRegistryEntry> = act1MapIds.map((mapId, index) =>
  entry({
    act: 'act1',
    buildMapCall: 'buildTutorialMap',
    mapId,
    missionVariable: `mission${index + 1}`,
    sizeConstant: 'act1MapSize',
    tagsConstant: 'act1Tags',
    terrainConstant: 'act1StandardTerrain',
    tilesNamespace: 'tutorialTiles',
  }),
);

const act2Entries: ReadonlyArray<MissionRegistryEntry> = act2MapIds.map((mapId, index) =>
  entry({
    act: 'act2',
    buildMapCall: 'buildAct2Map',
    mapId,
    missionVariable: `mission${index + 1}`,
    sizeConstant: 'act2MapSize',
    tagsConstant: 'act2Tags',
    terrainConstant: 'act2DesertTerrain',
    tilesNamespace: 'act2Tiles',
  }),
);

const act3Entries: ReadonlyArray<MissionRegistryEntry> = act3MapIds.map((mapId, index) =>
  entry({
    act: 'act3',
    buildMapCall: 'buildAct3Map',
    mapId,
    missionVariable: `mission${index + 1}`,
    sizeConstant: 'act3MapSize',
    tagsConstant: 'act3Tags',
    terrainConstant: 'act3SnowTerrain',
    tilesNamespace: 'act3Tiles',
  }),
);

export const missionRegistry = new Map<string, MissionRegistryEntry>([
  ...tutorialEntries,
  ...act1Entries,
  ...act2Entries,
  ...act3Entries,
].map((registryEntry) => [registryEntry.mapId, registryEntry]));

export function getMissionRegistryEntry(mapId: string): MissionRegistryEntry | null {
  const entry = missionRegistry.get(mapId);
  if (entry) {
    return entry;
  }

  if (mapId === LEGACY_CAMPAIGN_1_MAP_ID) {
    return missionRegistry.get(tutorialMapIds[0]) || null;
  }

  return null;
}
