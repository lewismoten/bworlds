import { describe, expect, it } from 'vitest';
import {
  buildHangDebugCommand,
  collectDescendantProcessIds,
  createVitestSupervisorState,
  parseProcessTable,
  parseSupervisorArgs,
  updateVitestSupervisorState,
} from '../../../scripts/vitest-supervisor.mjs';

describe('vitest supervisor', () => {
  it('treats argument-less runs as full-suite runs with the default timeout', () => {
    expect(parseSupervisorArgs([])).toEqual({
      passthroughArgs: [],
      positionalArgs: [],
      suiteTimeoutMs: 60_000,
      isFullSuiteRun: true,
    });
  });

  it('forwards file arguments without disabling normal worker parallelism', () => {
    expect(
      parseSupervisorArgs(['apps/web/src/music-debug-timeline.test.ts'])
    ).toEqual({
      passthroughArgs: ['apps/web/src/music-debug-timeline.test.ts'],
      positionalArgs: ['apps/web/src/music-debug-timeline.test.ts'],
      suiteTimeoutMs: 60_000,
      isFullSuiteRun: false,
    });
  });

  it('tracks recent test files and the last observed verbose test label', () => {
    const state = createVitestSupervisorState();

    updateVitestSupervisorState(
      state,
      ' ✓ apps/web/src/music-debug-timeline.test.ts > music debug timeline > renders short note bars'
    );
    updateVitestSupervisorState(
      state,
      ' ❯ packages/core/src/index.test.ts > core hash helpers > keeps seeds stable'
    );

    expect(state.recentTestFiles).toEqual([
      'apps/web/src/music-debug-timeline.test.ts',
      'packages/core/src/index.test.ts',
    ]);
    expect(state.lastStartedTest).toBe(
      'packages/core/src/index.test.ts > core hash helpers > keeps seeds stable'
    );
  });

  it('collects descendant worker pids from a process table snapshot', () => {
    const processes = parseProcessTable(`
      101 1 npm exec -- vitest run
      202 101 node /vitest/worker-a
      203 101 node /vitest/worker-b
      204 202 node /vitest/grandchild
      300 1 unrelated
    `);

    expect(collectDescendantProcessIds(processes, 101)).toEqual([
      202, 203, 204,
    ]);
  });

  it('builds a one-worker hang-debug command from observed files', () => {
    expect(
      buildHangDebugCommand([
        'apps/web/src/music-debug-timeline.test.ts',
        'packages/core/src/index.test.ts',
      ])
    ).toBe(
      'npm run test:hang-debug -- apps/web/src/music-debug-timeline.test.ts packages/core/src/index.test.ts'
    );
  });
});
