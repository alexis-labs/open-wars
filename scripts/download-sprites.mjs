/**
 * Downloads Athena Crisis sprite PNGs from the CDN for offline editing.
 *
 * Output mirrors the CDN layout under art/downloaded/v19/
 * Run: node scripts/download-sprites.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outRoot = join(root, 'art', 'downloaded', 'v19');
const ASSET_DOMAIN = 'https://art.athenacrisis.com';
const VERSION = 'v19';
const CONCURRENCY = 12;

const PLAYER_VARIANTS = [0, 1, 2, 3, 4, 5, 6, 7];
const PORTRAIT_VARIANTS = [...PLAYER_VARIANTS, -1, -2, -3];
const BIOME_VARIANTS = [0, 1, 2, 3, 4, 5, 6];

function collectImagesUrls() {
  const imagesPath = join(root, 'hera', 'render', 'Images.tsx');
  const text = readFileSync(imagesPath, 'utf8');
  const urls = [...text.matchAll(/'(https:\/\/art\.athenacrisis\.com\/[^']+)'/g)].map((m) => m[1]);
  return [...new Set(urls)].filter((url) => !url.startsWith('data:'));
}

function collectSpriteVariants() {
  const path = join(root, 'athena', 'info', 'SpriteVariants.tsx');
  const text = readFileSync(path, 'utf8');
  return [...text.matchAll(/^\s*\| '([^']+)'/gm)].map((m) => m[1]);
}

function parseVariantConfiguration() {
  const path = join(root, 'art', 'VariantConfiguration.tsx');
  const text = readFileSync(path, 'utf8');
  const config = new Map();

  const entryRe = /\[\s*'([^']+)',\s*\{([^}]*)\}\s*,?\s*\]/g;
  for (const [, name, body] of text.matchAll(entryRe)) {
    config.set(name, {
      biomeOnly: body.includes('biomeVariantNames'),
      portraits: body.includes('dynamicPlayerVariantNames'),
      waterSwap: /waterSwap:\s*true/.test(body),
    });
  }

  return config;
}

function variantUrls(spriteName, { biomeOnly, portraits, waterSwap }) {
  const urls = [];
  const variants = biomeOnly ? BIOME_VARIANTS : portraits ? PORTRAIT_VARIANTS : PLAYER_VARIANTS;

  for (const variant of variants) {
    urls.push(`${ASSET_DOMAIN}/${VERSION}/${spriteName}-${variant}.png`);
    if (waterSwap) {
      for (const biome of BIOME_VARIANTS) {
        urls.push(`${ASSET_DOMAIN}/${VERSION}/${spriteName}-${variant}-${biome}.png`);
      }
    }
  }

  return urls;
}

function urlToLocalPath(url) {
  const prefix = `${ASSET_DOMAIN}/${VERSION}/`;
  if (!url.startsWith(prefix)) {
    throw new Error(`Unexpected URL: ${url}`);
  }
  return join(outRoot, url.slice(prefix.length));
}

async function downloadOne(url) {
  const dest = urlToLocalPath(url);
  if (existsSync(dest)) {
    return { url, status: 'skipped' };
  }

  mkdirSync(dirname(dest), { recursive: true });

  const response = await fetch(url);
  if (response.status === 404) {
    return { url, status: 'missing' };
  }
  if (!response.ok) {
    return { url, status: 'error', code: response.status };
  }

  await pipeline(response.body, createWriteStream(dest));
  return { url, status: 'ok' };
}

async function runPool(urls) {
  const stats = { ok: 0, skipped: 0, missing: 0, error: 0 };
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      const i = index++;
      const result = await downloadOne(urls[i]);
      stats[result.status === 'error' ? 'error' : result.status]++;
      if (result.status === 'error') {
        console.error(`Failed ${result.url}: HTTP ${result.code}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return stats;
}

const spriteVariants = collectSpriteVariants();
const variantConfig = parseVariantConfiguration();
const variantUrlsList = spriteVariants.flatMap((name) => {
  const config = variantConfig.get(name);
  if (!config) {
    console.warn(`No VariantConfiguration for ${name}, skipping variants.`);
    return [];
  }
  return variantUrls(name, config);
});

const imageUrls = collectImagesUrls();
const allUrls = [...new Set([...imageUrls, ...variantUrlsList])];

console.log(`Sprites to fetch: ${allUrls.length} (${imageUrls.length} from Images.tsx, ${variantUrlsList.length} palette variants)`);
console.log(`Output: ${outRoot}`);

mkdirSync(outRoot, { recursive: true });

const stats = await runPool(allUrls);
console.log('Done:', stats);
