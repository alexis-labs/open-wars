import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProceduralSoundProfile } from './proceduralProfiles.ts';
import { soundNames } from './soundNames.ts';
import { proceduralSampleRate, renderProceduralSamples } from './synthesize.ts';

const root = dirname(fileURLToPath(import.meta.url));
const sfxRoot = join(root, 'sfx');

const ffmpegBinary =
  spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', shell: process.platform === 'win32' })
    .status === 0
    ? 'ffmpeg'
    : null;

function writeWav(path: string, samples: Float32Array) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(proceduralSampleRate, 24);
  buffer.writeUInt32LE(proceduralSampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  writeFileSync(path, buffer);
}

function encodeWithFfmpeg(wavPath: string, outPath: string, format: 'ogg' | 'aac') {
  const args =
    format === 'ogg'
      ? [
          '-y',
          '-i',
          wavPath,
          '-ac',
          '1',
          '-ar',
          String(proceduralSampleRate),
          '-c:a',
          'libvorbis',
          '-q:a',
          '6',
          outPath,
        ]
      : [
          '-y',
          '-i',
          wavPath,
          '-ac',
          '1',
          '-ar',
          String(proceduralSampleRate),
          '-c:a',
          'aac',
          '-b:a',
          '96k',
          outPath,
        ];
  const result = spawnSync(ffmpegBinary!, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `ffmpeg failed for ${outPath}`);
  }
}

mkdirSync(sfxRoot, { recursive: true });

let wavCount = 0;
let encodedCount = 0;

for (const name of soundNames) {
  const profile = getProceduralSoundProfile(name);
  const samples = renderProceduralSamples(profile, 1);
  const slashIndex = name.indexOf('/');
  const directory = slashIndex >= 0 ? join(sfxRoot, name.slice(0, slashIndex)) : sfxRoot;
  const leaf = slashIndex >= 0 ? name.slice(slashIndex + 1) : name;
  mkdirSync(directory, { recursive: true });
  const base = join(directory, leaf);
  const wavPath = `${base}.wav`;

  writeWav(wavPath, samples);
  wavCount++;

  if (ffmpegBinary) {
    encodeWithFfmpeg(wavPath, `${base}.ogg`, 'ogg');
    encodeWithFfmpeg(wavPath, `${base}.aac`, 'aac');
    encodedCount += 2;
  }
}

console.log(
  `Generated ${wavCount} WAV files${ffmpegBinary ? ` and ${encodedCount} compressed files via ffmpeg.` : '. Install ffmpeg to also emit OGG/AAC.'}`,
);
