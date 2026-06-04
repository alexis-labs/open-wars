import babel from '@rolldown/plugin-babel';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ViteMinifyPlugin as minifyHTMLPlugin } from 'vite-plugin-minify';
import { viteSingleFile } from 'vite-plugin-singlefile';
import presets from '../infra/babelPresets.tsx';
import createResolver from '../infra/createResolver.tsx';
import localArtPlugin from '../infra/localArtPlugin.ts';
import offlineEditorSavePlugin from '../infra/offlineEditorSavePlugin.ts';
import pixelarticonsPlugin from '../infra/pixelarticonsPlugin.ts';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
  },
  define: {
    'process.env.IS_LANDING_PAGE': `false`,
    'process.env.NATIVE_APP_VERSION': JSON.stringify(''),
  },
  plugins: [
    offlineEditorSavePlugin(),
    localArtPlugin(),
    createResolver(),
    pixelarticonsPlugin(),
    babel({
      presets,
    }),
    react(),
    viteSingleFile(),
    minifyHTMLPlugin(),
  ],
});
