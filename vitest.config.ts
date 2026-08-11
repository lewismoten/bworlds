import { defineConfig } from 'vitest/config';
import { buildWorkspaceAliases } from './apps/web/vite.workspace.ts';
import {
  resolveVitestSuiteMode,
  resolveVitestSuiteSelection,
} from './vitest.suite-mode.ts';

const suiteMode = resolveVitestSuiteMode(process.env.BWORLDS_VITEST_SUITE_MODE);
const suiteSelection = resolveVitestSuiteSelection(suiteMode);

export default defineConfig({
  resolve: {
    alias: buildWorkspaceAliases(),
  },
  test: {
    environment: 'node',
    include: [
      ...(suiteSelection.include ?? [
        'packages/**/src/**/*.test.ts',
        'apps/web/src/**/*.test.ts',
      ]),
    ],
    exclude: [...(suiteSelection.exclude ?? [])],
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
