import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseListeningPidList,
  parsePathField,
  resolveRestartTargets,
} from './vite-dev-restart.mjs';

describe('vite dev restart helpers', () => {
  it('parses listening pids from lsof field output', () => {
    expect(parseListeningPidList('p123\np456\n')).toEqual([123, 456]);
  });

  it('parses cwd paths from lsof field output', () => {
    expect(parsePathField('p123\nfcwd\nn/Users/example/apps/web\n')).toBe(
      path.normalize('/Users/example/apps/web')
    );
  });

  it('restarts only listeners owned by the web app directory', () => {
    const appDir = path.normalize('/repo/apps/web');
    const processInfoByPid = new Map([
      [
        101,
        {
          command: 'node vite',
          cwd: '/repo/apps/web',
        },
      ],
      [
        202,
        {
          command: 'node another-app',
          cwd: '/repo/apps/admin',
        },
      ],
    ]);

    expect(
      resolveRestartTargets({
        appDir,
        listeningPids: [101, 202],
        managedPid: null,
        processInfoByPid,
      })
    ).toEqual({
      restartablePids: [101],
      blockingPids: [
        {
          pid: 202,
          command: 'node another-app',
          cwd: '/repo/apps/admin',
        },
      ],
    });
  });

  it('treats the recorded managed pid as restartable even without cwd data', () => {
    expect(
      resolveRestartTargets({
        appDir: '/repo/apps/web',
        listeningPids: [303],
        managedPid: 303,
        processInfoByPid: new Map(),
      })
    ).toEqual({
      restartablePids: [303],
      blockingPids: [],
    });
  });
});
