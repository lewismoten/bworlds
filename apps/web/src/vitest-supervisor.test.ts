import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildHangDebugCommand,
  collectDescendantProcessIds,
  createVitestSupervisorState,
  isProcessActive,
  parseProcessTable,
  parseSupervisorArgs,
  readExistingLockMetadata,
  updateVitestSupervisorState,
  waitForFullSuiteLock,
} from '../../../scripts/vitest-supervisor.mjs';

describe('vitest supervisor', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
    );
  });

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

  it('detects inactive processes from lock metadata', () => {
    expect(isProcessActive(-1)).toBe(false);
    expect(isProcessActive(0)).toBe(false);
    expect(isProcessActive(Number.NaN)).toBe(false);
  });

  it('waits for an active full-suite lock to clear before acquiring it', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'vitest-supervisor-'));
    tempDirs.push(dir);
    const lockFilePath = path.join(dir, '.vitest-full-suite.lock');
    await writeFile(
      lockFilePath,
      JSON.stringify({ pid: 456, startedAt: '2026-08-10T00:00:00.000Z' })
    );

    const onWait = vi.fn(async () => {
      await rm(lockFilePath, { force: true });
    });

    const releaseLock = await waitForFullSuiteLock(lockFilePath, {
      pollMs: 1,
      onWait,
      isProcessActive: () => true,
    });

    expect(onWait).toHaveBeenCalledTimes(1);
    expect(await readExistingLockMetadata(lockFilePath)).toEqual(
      expect.objectContaining({ pid: expect.any(Number) })
    );

    await releaseLock();
    expect(await readExistingLockMetadata(lockFilePath)).toBeNull();
  });

  it('clears stale full-suite locks before retrying acquisition', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'vitest-supervisor-'));
    tempDirs.push(dir);
    const lockFilePath = path.join(dir, '.vitest-full-suite.lock');
    await writeFile(
      lockFilePath,
      JSON.stringify({ pid: 999_999, startedAt: '2026-08-10T00:00:00.000Z' })
    );

    const onWait = vi.fn();
    const releaseLock = await waitForFullSuiteLock(lockFilePath, {
      pollMs: 1,
      onWait,
      isProcessActive: () => false,
    });

    expect(onWait).not.toHaveBeenCalled();
    expect(await readExistingLockMetadata(lockFilePath)).toEqual(
      expect.objectContaining({ pid: expect.any(Number) })
    );

    await releaseLock();
  });
});
