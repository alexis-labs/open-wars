import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const offline = join(root, 'offline');

const requiredFiles = [
  '../scripts/build-offline.mjs',
  'index.html',
  'index.tsx',
  'starterMap.tsx',
  'capacitor.config.json',
  'public/icon.svg',
  'public/manifest.json',
  'public/service-worker.js',
  'release-checklist.json',
];

const forbiddenPatterns = [
  /Athena Crisis/i,
  /athenacrisis/i,
  /CLIENT_URL/,
  /Please connect/i,
  /Try again/i,
  /keyart/i,
  /map-fixtures/i,
  /demo-1/i,
];

const sourceExtensions = new Set(['.html', '.js', '.json', '.md', '.ts', '.tsx']);

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(join(offline, file))) {
    failures.push(`Missing required production file: offline/${file}`);
  }
}

verifyStarterMap();
verifyBuildConfiguration();
verifyManifest();
verifyServiceWorker();
verifyRuntimeFallback();
verifyProductionOptions();
verifyMainMenu();
verifyLocalSave();
verifyInstallPrompt();
verifyServiceWorkerUpdates();

for (const file of await listFiles(offline)) {
  if (!sourceExtensions.has(file.slice(file.lastIndexOf('.')))) {
    continue;
  }

  const contents = readFileSync(file, 'utf8');
  const displayPath = relative(root, file).replaceAll('\\', '/');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(contents)) {
      failures.push(`Forbidden production reference ${pattern} in ${displayPath}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Production shell verification passed.');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function readOffline(file) {
  return readFileSync(join(offline, file), 'utf8');
}

function verifyStarterMap() {
  const source = readOffline('starterMap.tsx');
  const width = Number(source.match(/width:\s*(\d+)/)?.[1]);
  const height = Number(source.match(/height:\s*(\d+)/)?.[1]);
  const tileCount = source.match(/tiles\.[a-z]+/g)?.length || 0;

  if (!width || !height) {
    failures.push('Starter map must define numeric width and height.');
    return;
  }

  if (tileCount !== width * height) {
    failures.push(`Starter map has ${tileCount} tiles but size requires ${width * height}.`);
  }

  if (!/Open Wars Training Grounds/.test(source)) {
    failures.push('Starter map metadata must use the Open Wars starter map name.');
  }

  if (!/withModifiers\(MapData\.createMap/.test(source)) {
    failures.push('Starter map must calculate tile modifiers before rendering.');
  }

  if (!/p:\s*1/.test(source) || !/p:\s*2/.test(source)) {
    failures.push('Starter map must include units or buildings for both players.');
  }
}

function verifyBuildConfiguration() {
  const viteSource = readOffline('vite.config.ts');
  const workflowSource = readFileSync(join(root, '.github', 'workflows', 'production.yml'), 'utf8');
  const buildSource = readFileSync(join(root, 'scripts', 'build-offline.mjs'), 'utf8');

  if (!/base:\s*['"]\.\//.test(viteSource)) {
    failures.push('Offline Vite config must use relative asset paths for mobile wrappers.');
  }

  if (!/createResolver\(\)/.test(viteSource)) {
    failures.push('Offline Vite config must resolve engine virtual asset modules.');
  }

  if (!/pixelarticonsPlugin\(\)/.test(viteSource)) {
    failures.push('Offline Vite config must transform pixelarticons SVG imports.');
  }

  if (!/pnpm build:offline/.test(workflowSource)) {
    failures.push('Production workflow must run the root build:offline release bundle.');
  }

  if (!/mobile['"], ['"]dist['"], ['"]offline/.test(buildSource)) {
    failures.push('Root offline build must copy the bundle into mobile/dist/offline.');
  }

  for (const asset of ['offlinePublic', 'Background.png', 'apple-touch-icon.png', 'fonts']) {
    if (!buildSource.includes(asset)) {
      failures.push(`Root offline build must copy ${asset} into dist/offline.`);
    }
  }
}

function verifyManifest() {
  const manifest = JSON.parse(readOffline('public/manifest.json'));

  if (manifest.name !== 'Open Wars' || manifest.short_name !== 'Open Wars') {
    failures.push('Manifest must be branded as Open Wars.');
  }

  if (!['fullscreen', 'standalone'].includes(manifest.display)) {
    failures.push('Manifest display should be fullscreen or standalone for mobile.');
  }

  for (const icon of manifest.icons || []) {
    const path = resolvePublicPath(icon.src);
    if (!existsSync(path)) {
      failures.push(`Manifest icon does not exist: ${icon.src}`);
    }
  }
}

function verifyServiceWorker() {
  const source = readOffline('public/service-worker.js');
  const cachedPaths = [...source.matchAll(/'([^']+)'/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith('/'));

  for (const cachedPath of cachedPaths) {
    if (cachedPath === '/' || cachedPath === '/index.html') {
      continue;
    }

    if (!existsSync(resolvePublicPath(cachedPath))) {
      failures.push(`Service worker caches missing asset: ${cachedPath}`);
    }
  }

  if (!/event\.request\.mode === 'navigate'/.test(source)) {
    failures.push('Service worker must include a navigation fallback for PWA reloads.');
  }
}

function verifyRuntimeFallback() {
  const source = readOffline('index.tsx');

  if (!/class ProductionErrorBoundary/.test(source)) {
    failures.push('Production app must include a ProductionErrorBoundary.');
  }

  if (!/window\.location\.reload\(\)/.test(source)) {
    failures.push('Production error fallback must offer a reload action.');
  }

  if (!/<ProductionErrorBoundary>/.test(source)) {
    failures.push('Production root must be wrapped in ProductionErrorBoundary.');
  }
}

function verifyProductionOptions() {
  const source = readOffline('index.tsx');

  if (/Coming soon/.test(source)) {
    failures.push('Production options must not contain placeholder "Coming soon" copy.');
  }

  if (!/AudioPlayer\.pause\(\)/.test(source) || !/AudioPlayer\.resume\(\)/.test(source)) {
    failures.push('Production options must include a real sound toggle.');
  }

  if (!/fullscreenPreferenceKey/.test(source)) {
    failures.push('Production options must persist fullscreen preference.');
  }

  if (!/useResponsiveGameScale/.test(source)) {
    failures.push('Production game view must adjust scale for narrow mobile widths.');
  }
}

function verifyMainMenu() {
  const source = readOffline('index.tsx');
  const primaryMenu = source.match(/<div className={buttonStack}>[\s\S]*?<\/div>/)?.[0];

  if (!primaryMenu) {
    failures.push('Production main menu button stack was not found.');
    return;
  }

  let previousIndex = -1;

  for (const label of ['Quick play', 'Options', 'Exit']) {
    const index = primaryMenu.indexOf(label);
    if (index === -1) {
      failures.push(`Production main menu must include ${label}.`);
    } else if (index < previousIndex) {
      failures.push('Production main menu must order labels as Quick play, Options, Exit.');
    }
    previousIndex = index;
  }

  for (const label of ['Continue', 'Delete Save', 'Install App', 'Update App']) {
    if (primaryMenu.includes(label)) {
      failures.push(`Production secondary action "${label}" must stay out of the primary menu.`);
    }
  }

  if (!/window\.close\(\)/.test(source)) {
    failures.push('Production exit action must attempt window.close().');
  }
}

function verifyLocalSave() {
  const source = readOffline('index.tsx');

  if (!/savedGameKey/.test(source)) {
    failures.push('Production shell must define a local saved game key.');
  }

  if (!/savedGameVersion/.test(source) || !/savedAt:\s*Date\.now\(\)/.test(source)) {
    failures.push('Production saves must be versioned and timestamped.');
  }

  if (!/MapData\.fromObject/.test(source) || !/map\.toJSON\(\)/.test(source)) {
    failures.push('Production shell must load and save MapData through engine serialization.');
  }

  if (!/Continue/.test(source)) {
    failures.push('Production menu must expose Continue when a local save exists.');
  }

  if (!/Delete Save/.test(source)) {
    failures.push('Production menu must expose Delete Save when a local save exists.');
  }

  if (!/localStorage\.removeItem\(savedGameKey\)/.test(source)) {
    failures.push('Production shell must clear old saves when starting a new game.');
  }
}

function verifyInstallPrompt() {
  const source = readOffline('index.tsx');

  if (!/beforeinstallprompt/.test(source)) {
    failures.push('Production shell must listen for beforeinstallprompt.');
  }

  if (!/Install App/.test(source)) {
    failures.push('Production menu must expose Install App when installable.');
  }

  if (!/prompt\.prompt\(\)/.test(source)) {
    failures.push('Production install action must call the native PWA prompt.');
  }
}

function verifyServiceWorkerUpdates() {
  const appSource = readOffline('index.tsx');
  const workerSource = readOffline('public/service-worker.js');

  if (!/updatefound/.test(appSource) || !/Update App/.test(appSource)) {
    failures.push('Production shell must expose service worker update UI.');
  }

  if (!/SKIP_WAITING/.test(appSource) || !/SKIP_WAITING/.test(workerSource)) {
    failures.push('Production service worker update flow must support SKIP_WAITING.');
  }
}

function resolvePublicPath(path) {
  const withoutSlash = path.replace(/^\//, '');
  const publicPath = join(offline, 'public', withoutSlash);
  return existsSync(publicPath) ? publicPath : join(offline, withoutSlash);
}
