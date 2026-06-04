import type { SoundName } from '@deities/athena/info/Music.tsx';
import { EmptyOGG } from './placeholders.ts';
import { soundNames } from './soundNames.ts';

const wavModules = import.meta.glob('./sfx/**/*.wav', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const oggModules = import.meta.glob('./sfx/**/*.ogg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const aacModules = import.meta.glob('./sfx/**/*.aac', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const toSoundKey = (path: string) => path.replace(/^\.\/sfx\//, '').replace(/\.(wav|ogg|aac)$/, '');

const wavBySound = new Map<string, string>();
const oggBySound = new Map<string, string>();
const aacBySound = new Map<string, string>();

for (const [path, url] of Object.entries(wavModules)) {
  wavBySound.set(toSoundKey(path), url);
}
for (const [path, url] of Object.entries(oggModules)) {
  oggBySound.set(toSoundKey(path), url);
}
for (const [path, url] of Object.entries(aacModules)) {
  aacBySound.set(toSoundKey(path), url);
}

export function buildSoundsMap(useOGG: boolean): Map<SoundName, string> {
  const compressed = useOGG ? oggBySound : aacBySound;
  const fallback = EmptyOGG;
  const map = new Map<SoundName, string>();

  for (const name of soundNames) {
    map.set(
      name,
      compressed.get(name) ?? wavBySound.get(name) ?? fallback,
    );
  }

  return map;
}

export function getBundledSoundCount() {
  return Math.max(wavBySound.size, oggBySound.size, aacBySound.size);
}
