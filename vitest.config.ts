import { defineConfig } from 'vitest/config';
import { buildWorkspaceAliases } from './apps/web/vite.workspace.ts';

export default defineConfig({
  resolve: {
    alias: buildWorkspaceAliases(),
  },
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
    setupFiles: ['./apps/web/src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/src/**/*.ts', 'apps/web/src/**/*.ts'],
    },
    testTimeout: 1500,
    hookTimeout: 1000,
  },
});
