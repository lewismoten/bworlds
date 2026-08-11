import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
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
  runVitest,
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
      suiteMode: 'all',
      isFullSuiteRun: true,
    });
  });

  it('forwards file arguments without disabling normal worker parallelism', () => {
    expect(
      parseSupervisorArgs(['apps/web/src/music-debug-timeline.long.test.ts'])
    ).toEqual({
      passthroughArgs: ['apps/web/src/music-debug-timeline.long.test.ts'],
      positionalArgs: ['apps/web/src/music-debug-timeline.long.test.ts'],
      suiteTimeoutMs: 60_000,
      suiteMode: 'all',
      isFullSuiteRun: false,
    });
  });

  it('parses explicit suite-mode arguments for fast and long suites', () => {
    expect(parseSupervisorArgs(['--suite-mode', 'fast'])).toEqual({
      passthroughArgs: [],
      positionalArgs: [],
      suiteTimeoutMs: 60_000,
      suiteMode: 'fast',
      isFullSuiteRun: true,
    });
    expect(parseSupervisorArgs(['--suite-mode', 'long'])).toEqual({
      passthroughArgs: [],
      positionalArgs: [],
      suiteTimeoutMs: 60_000,
      suiteMode: 'long',
      isFullSuiteRun: true,
    });
  });

  it('keeps option values out of positional file detection', () => {
    expect(
      parseSupervisorArgs([
        '--suite-mode',
        'long',
        '--reporter',
        'json',
        '--outputFile',
        '/tmp/vitest.json',
      ])
    ).toEqual({
      passthroughArgs: [
        '--reporter',
        'json',
        '--outputFile',
        '/tmp/vitest.json',
      ],
      positionalArgs: [],
      suiteTimeoutMs: 60_000,
      suiteMode: 'long',
      isFullSuiteRun: true,
    });
  });

  it('tracks recent test files and the last observed verbose test label', () => {
    const state = createVitestSupervisorState();

    updateVitestSupervisorState(
      state,
      ' ✓ apps/web/src/music-debug-timeline.long.test.ts > music debug timeline > renders short note bars'
    );
    updateVitestSupervisorState(
      state,
      ' ❯ packages/core/src/index.test.ts > core hash helpers > keeps seeds stable'
    );

    expect(state.recentTestFiles).toEqual([
      'apps/web/src/music-debug-timeline.long.test.ts',
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
        'apps/web/src/music-debug-timeline.long.test.ts',
        'packages/core/src/index.test.ts',
      ])
    ).toBe(
      'npm run test:hang-debug -- apps/web/src/music-debug-timeline.long.test.ts packages/core/src/index.test.ts'
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

  it('prints timeout diagnostics and kills a hung full-suite run', async () => {
    vi.useFakeTimers();
    const child = createMockVitestChild(321);
    const consoleRef = {
      log: vi.fn(),
      error: vi.fn(),
    };
    const killVitestProcessGroup = vi.fn(async () => {
      child.emit('exit', null, 'SIGKILL');
    });
    const releaseLock = vi.fn(async () => {});

    const runPromise = runVitest(['--suite-timeout-ms', '25'], {
      console: consoleRef,
      cwd: '/repo',
      env: {},
      spawn: () => child,
      getWorkerPids: async () => [901, 902],
      killVitestProcessGroup,
      waitForFullSuiteLock: async () => releaseLock,
    });

    await Promise.resolve();

    child.stdout.emit(
      'data',
      ' ❯ apps/web/src/hanging-a.test.ts > hanging suite > starts\n'
    );
    child.stderr.emit(
      'data',
      ' ✓ packages/core/src/hanging-b.test.ts > helper suite > stays busy\n'
    );

    await vi.advanceTimersByTimeAsync(25);

    await expect(runPromise).resolves.toBe(1);
    expect(killVitestProcessGroup).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
    expect(consoleRef.error).toHaveBeenCalledWith(
      'Vitest supervisor: suite timeout exceeded after 0s.'
    );
    expect(consoleRef.error).toHaveBeenCalledWith(
      'Vitest supervisor: active test files: apps/web/src/hanging-a.test.ts, packages/core/src/hanging-b.test.ts.'
    );
    expect(consoleRef.error).toHaveBeenCalledWith(
      'Vitest supervisor: last started test: packages/core/src/hanging-b.test.ts > helper suite > stays busy.'
    );
    expect(consoleRef.error).toHaveBeenCalledWith(
      'Vitest supervisor: worker PIDs: 901, 902.'
    );
    expect(consoleRef.error).toHaveBeenCalledWith(
      'Vitest supervisor: rerun likely hanging files with npm run test:hang-debug -- apps/web/src/hanging-a.test.ts packages/core/src/hanging-b.test.ts'
    );
  });

  it('passes the selected full-suite mode to Vitest through the environment', async () => {
    const child = createMockVitestChild(321);
    const spawn = vi.fn(() => {
      queueMicrotask(() => child.emit('exit', 0, null));
      return child;
    });

    await expect(
      runVitest(['--suite-mode', 'fast'], {
        cwd: '/repo',
        env: { TEST_ENV: '1' },
        spawn,
        waitForFullSuiteLock: async () => async () => {},
      })
    ).resolves.toBe(0);

    expect(spawn).toHaveBeenCalledWith(
      'npm',
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          TEST_ENV: '1',
          BWORLDS_VITEST_SUITE_MODE: 'fast',
        }),
      })
    );
  });
});

function createMockVitestChild(pid: number) {
  const child = new EventEmitter() as EventEmitter & {
    pid: number;
    stdout: EventEmitter & { setEncoding: (encoding: string) => void };
    stderr: EventEmitter & { setEncoding: (encoding: string) => void };
  };

  child.pid = pid;
  child.stdout = createMockVitestStream();
  child.stderr = createMockVitestStream();

  return child;
}

function createMockVitestStream() {
  const stream = new EventEmitter() as EventEmitter & {
    setEncoding: (encoding: string) => void;
  };
  stream.setEncoding = () => {};
  return stream;
}
