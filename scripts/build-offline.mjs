import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const offlineRoot = join(root, 'offline');
const offlinePublic = join(offlineRoot, 'public');
const distOffline = join(root, 'dist', 'offline');
const mobileOffline = join(root, 'mobile', 'dist', 'offline');
const electronOffline = join(root, 'electron', 'offline');
const staticAssets = ['Background.png', 'apple-touch-icon.png', 'fonts'];

await cleanBuildDirectory(distOffline);

run('corepack', [
  'pnpm',
  'vite',
  'build',
  '--outDir',
  '../dist/offline',
  '-c',
  './offline/vite.config.ts',
  './offline',
]);

if (!existsSync(distOffline)) {
  throw new Error('Expected Vite to create dist/offline.');
}

await copyStaticAssets();
await copyBuild(distOffline, mobileOffline);
await copyBuild(distOffline, electronOffline);

console.log('Offline production build copied to mobile/dist/offline and electron/offline.');

async function copyBuild(from, to) {
  await cleanBuildDirectory(to);
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
}

async function cleanBuildDirectory(directory) {
  try {
    await rm(directory, { force: true, recursive: true });
  } catch (error) {
    if (error?.code !== 'EBUSY') {
      throw error;
    }

    const { readdir } = await import('node:fs/promises');
    await mkdir(directory, { recursive: true });
    await Promise.all(
      (await readdir(directory)).map((entry) =>
        rm(join(directory, entry), { force: true, recursive: true }),
      ),
    );
  }
}

async function copyStaticAssets() {
  await cp(offlinePublic, distOffline, { recursive: true });

  for (const asset of staticAssets) {
    await cp(join(offlineRoot, asset), join(distOffline, asset), { recursive: true });
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
