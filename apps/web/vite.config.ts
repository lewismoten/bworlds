import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { buildWorkspaceAliases } from './vite.workspace.ts';

const APP_DIR = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.join(APP_DIR, 'index.html'),
        debug: path.join(APP_DIR, 'debug', 'index.html'),
        debugAlias: path.join(APP_DIR, 'debug.html'),
        debugMusic: path.join(APP_DIR, 'debug', 'music', 'index.html'),
        debugMusicAlias: path.join(APP_DIR, 'debug', 'music.html'),
      },
    },
  },
  resolve: {
    alias: buildWorkspaceAliases(),
  },
});
