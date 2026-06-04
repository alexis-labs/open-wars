import { type MapMetadata } from '@deities/apollo/MapMetadata.tsx';
import {
  generateBuildings,
  generateRandomMap,
  generateSea,
} from '@deities/athena/generator/MapGenerator.tsx';
import validateMap from '@deities/athena/lib/validateMap.tsx';
import withModifiers from '@deities/athena/lib/withModifiers.tsx';
import { Biome, Biomes } from '@deities/athena/map/Biome.tsx';
import MapData, { SizeVector } from '@deities/athena/MapData.tsx';
import starterMap, { starterMapMetadata } from './starterMap.tsx';

const quickPlayMetadata: MapMetadata = {
  name: 'Quick Play',
  tags: ['open-wars', 'quick-play', 'procedural'],
  teamPlay: false,
};

const validationRegistry = {
  has: () => false,
};

const quickPlayBiomes = Biomes.filter((biome) => biome !== Biome.Spaceship);

function createProceduralMap() {
  const height = randomMapHeight();
  const size = new SizeVector(randomMapWidth(height), height);
  return withModifiers(generateSea(generateBuildings(generateRandomMap(size), quickPlayBiomes)));
}

function randomMapHeight() {
  return randomInteger(10, 12);
}

function randomMapWidth(height: number) {
  return randomInteger(height + 2, 15);
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function createQuickPlaySkirmish(): [MapData, MapMetadata] {
  for (let attempt = 0; attempt < 6; attempt++) {
    const [map] = validateMap(createProceduralMap(), validationRegistry);
    if (map) {
      return [map, quickPlayMetadata];
    }
  }

  return [starterMap, starterMapMetadata];
}
