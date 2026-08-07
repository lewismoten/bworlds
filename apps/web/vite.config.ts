import { defineConfig } from 'vite';
import { buildWorkspaceAliases } from './vite.workspace.ts';

export default defineConfig({
  resolve: {
    alias: buildWorkspaceAliases(),
  },
});
