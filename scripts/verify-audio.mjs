import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const sfxRoot = join(root, 'ui/audio/sfx');
const licenses = join(root, 'ui/audio/LICENSES.md');
const soundNamesSource = readFileSync(join(root, 'ui/audio/soundNames.ts'), 'utf8');
const musicSource = readFileSync(join(root, 'athena/info/Music.tsx'), 'utf8');

const failures = [];

if (!existsSync(licenses)) {
  failures.push('Missing ui/audio/LICENSES.md');
}

const soundNamesBlock = soundNamesSource.match(
  /export const soundNames = \[([\s\S]*?)\] as const/,
)?.[1];

if (!soundNamesBlock) {
  failures.push('Could not parse ui/audio/soundNames.ts');
}

const declaredSounds = soundNamesBlock
  ? [...soundNamesBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
  : [];

const musicSounds = [
  ...musicSource.split('export type SongName')[0].matchAll(/^\s+\| '([^']+)'/gm),
].map((match) => match[1]);

for (const sound of musicSounds) {
  if (!declaredSounds.includes(sound)) {
    failures.push(`Sound '${sound}' is missing from ui/audio/soundNames.ts`);
  }
}

for (const sound of declaredSounds) {
  if (!musicSounds.includes(sound)) {
    failures.push(`Sound '${sound}' is listed in soundNames.ts but missing from Music.tsx`);
  }
}

async function listEncoded(categoryPath) {
  const files = new Set();
  if (!existsSync(categoryPath)) {
    return files;
  }

  for (const entry of await readdir(categoryPath, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      (entry.name.endsWith('.wav') ||
        entry.name.endsWith('.ogg') ||
        entry.name.endsWith('.aac'))
    ) {
      files.add(entry.name.replace(/\.(wav|ogg|aac)$/, ''));
    }
  }
  return files;
}

for (const sound of declaredSounds) {
  const slashIndex = sound.indexOf('/');
  const directory = slashIndex >= 0 ? join(sfxRoot, sound.slice(0, slashIndex)) : sfxRoot;
  const leaf = slashIndex >= 0 ? sound.slice(slashIndex + 1) : sound;
  const encoded = await listEncoded(directory);

  if (!encoded.has(leaf)) {
    failures.push(
      `Missing encoded audio for '${sound}' (expected ui/audio/sfx/${sound}.{ogg,aac})`,
    );
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Audio verification passed for ${declaredSounds.length} sounds.`);
