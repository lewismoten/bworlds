import { defineConfig } from 'vitest/config';
import { buildWorkspaceAliases } from './apps/web/vite.workspace.ts';

export default defineConfig({
  resolve: {
    alias: buildWorkspaceAliases(),
  },
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/src/**/*.ts'],
    },
  },
});
