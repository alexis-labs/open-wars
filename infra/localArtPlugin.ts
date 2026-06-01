import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import root from './root.ts';

const downloadedV19 = join(root, 'art', 'downloaded', 'v19');

export function hasDownloadedArt(): boolean {
  return existsSync(downloadedV19);
}

function isLocalArtEnabled(): boolean {
  const flag = process.env.VITE_USE_LOCAL_ART;
  if (flag === '0' || flag === 'false') {
    return false;
  }
  if (flag === '1' || flag === 'true') {
    return true;
  }
  return hasDownloadedArt();
}

export default function localArtPlugin(): Plugin {
  const enabled = isLocalArtEnabled();

  return {
    name: 'athena-crisis-local-art',
    config() {
      if (!enabled) {
        return {
          define: {
            __USE_LOCAL_ART__: 'false',
          },
        };
      }

      return {
        define: {
          __USE_LOCAL_ART__: 'true',
        },
        publicDir: join(root, 'art', 'downloaded'),
      };
    },
    configureServer() {
      if (
        (process.env.VITE_USE_LOCAL_ART === '1' || process.env.VITE_USE_LOCAL_ART === 'true') &&
        !hasDownloadedArt()
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          '[athena-crisis-local-art] VITE_USE_LOCAL_ART is set but art/downloaded/v19 is missing. Run: pnpm download:sprites',
        );
      }
    },
  };
}
