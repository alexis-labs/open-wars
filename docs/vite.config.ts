import { fileURLToPath } from 'node:url';
import babelPluginEmotion from '@emotion/babel-plugin';
import babel from '@rolldown/plugin-babel';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { vocs } from 'vocs/vite';
import presets from '../infra/babelPresets.tsx';
import createResolver from '../infra/createResolver.tsx';
import localArtPlugin from '../infra/localArtPlugin.ts';
import pixelarticonsPlugin from '../infra/pixelarticonsPlugin.ts';

const userStylesPath = normalizePath(
  fileURLToPath(new URL('./content/pages/_root.css', import.meta.url)),
);
const pagesPath = normalizePath(fileURLToPath(new URL('./content/pages/', import.meta.url)));
const mangledWindowsPagesPath = pagesPath.replaceAll('/', '');

export default defineConfig(async () => ({
  build: {
    target: 'esnext',
  },
  define: {
    'process.env.IS_LANDING_PAGE': `1`,
  },
  plugins: [
    localArtPlugin(),
    createResolver(),
    pixelarticonsPlugin(),
    babel({
      plugins: [babelPluginEmotion],
      presets,
    }),
    react(),
    {
      enforce: 'pre',
      load(id: string) {
        if (id === '\0virtual:vocs/user-styles') {
          return `import styles from ${JSON.stringify(`${userStylesPath}?url`)}; export default styles;`;
        }
        if (id === '\0virtual:vocs/user-styles?inline') {
          return `import styles from ${JSON.stringify(`${userStylesPath}?inline`)}; export default styles;`;
        }
      },
      name: 'windows-vocs-user-styles',
      resolveId(id: string) {
        if (id.startsWith(mangledWindowsPagesPath)) {
          return pagesPath + id.slice(mangledWindowsPagesPath.length);
        }
        if (id === 'virtual:vocs/user-styles') {
          return '\0virtual:vocs/user-styles';
        }
        if (id === 'virtual:vocs/user-styles?inline') {
          return '\0virtual:vocs/user-styles?inline';
        }
      },
    },
    await vocs(),
  ],
  resolve: {
    alias: [
      {
        find: 'canvas',
        replacement: 'canvas/browser.js',
      },
      {
        find: 'vocs/waku/middleware',
        replacement: fileURLToPath(new URL('./wakuMiddleware.ts', import.meta.url)),
      },
    ],
  },
}));
