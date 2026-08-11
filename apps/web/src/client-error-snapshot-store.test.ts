import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearClientErrorSnapshots,
  formatClientErrorSnapshotFileName,
  readRecentClientErrorSnapshots,
  removeClientErrorSnapshot,
  resolveClientErrorSnapshotFileName,
  saveClientErrorSnapshot,
} from '../client-error-snapshot-store.mjs';

describe('client error snapshot store', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses the stable message hash as the snapshot file name', () => {
    expect(
      formatClientErrorSnapshotFileName({
        messageHash: 'deadbeef',
      })
    ).toBe('deadbeef.json');
  });

  it('normalizes cleanup ids into snapshot file names', () => {
    expect(resolveClientErrorSnapshotFileName('deadbeef')).toBe(
      'deadbeef.json'
    );
    expect(resolveClientErrorSnapshotFileName('deadbeef.json')).toBe(
      'deadbeef.json'
    );
  });

  it('reuses one file for duplicate messages and updates the stored timestamp', async () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-client-error-snapshots-')
    );
    tempDirs.push(snapshotDir);

    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:00.000Z',
        message: 'Boom',
        stack: 'stack-a',
        source: 'console.error',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'samehash',
      },
      { snapshotDir }
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:01.000Z',
        message: 'Boom',
        stack: 'stack-b',
        source: 'window.error',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'samehash',
      },
      { snapshotDir }
    );

    expect(readdirSync(snapshotDir)).toEqual(['samehash.json']);
    expect(
      readRecentClientErrorSnapshots({
        snapshotDir,
        limit: 10,
      })
    ).toEqual([
      expect.objectContaining({
        createdAt: '2026-08-11T12:00:01.000Z',
        stack: 'stack-b',
        source: 'window.error',
      }),
    ]);
  });

  it('keeps different messages in separate files and lists most recent first', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-client-error-snapshots-')
    );
    tempDirs.push(snapshotDir);

    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:00.000Z',
        message: 'Older',
        stack: null,
        source: 'console.error',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'older',
      },
      { snapshotDir }
    );
    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:05.000Z',
        message: 'Newer',
        stack: null,
        source: 'unhandledrejection',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'newer',
      },
      { snapshotDir }
    );

    expect(
      readRecentClientErrorSnapshots({
        snapshotDir,
        limit: 10,
      }).map((snapshot) => snapshot.message)
    ).toEqual(['Newer', 'Older']);
  });

  it('removes one client error snapshot by hash or file name', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-client-error-snapshots-')
    );
    tempDirs.push(snapshotDir);

    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:00.000Z',
        message: 'Older',
        stack: null,
        source: 'console.error',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'older',
      },
      { snapshotDir }
    );
    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:05.000Z',
        message: 'Newer',
        stack: null,
        source: 'unhandledrejection',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'newer',
      },
      { snapshotDir }
    );

    expect(removeClientErrorSnapshot('older', { snapshotDir })).toBe(true);
    expect(removeClientErrorSnapshot('missing', { snapshotDir })).toBe(false);
    expect(
      readRecentClientErrorSnapshots({
        snapshotDir,
        limit: 10,
      }).map((snapshot) => snapshot.message)
    ).toEqual(['Newer']);
  });

  it('clears all saved client error snapshots', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-client-error-snapshots-')
    );
    tempDirs.push(snapshotDir);

    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:00.000Z',
        message: 'Older',
        stack: null,
        source: 'console.error',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'older',
      },
      { snapshotDir }
    );
    saveClientErrorSnapshot(
      {
        schemaVersion: 1,
        createdAt: '2026-08-11T12:00:05.000Z',
        message: 'Newer',
        stack: null,
        source: 'unhandledrejection',
        pageUrl: 'https://example.com/play',
        details: null,
        messageHash: 'newer',
      },
      { snapshotDir }
    );

    expect(clearClientErrorSnapshots({ snapshotDir })).toBe(2);
    expect(
      readRecentClientErrorSnapshots({
        snapshotDir,
        limit: 10,
      })
    ).toEqual([]);
  });
});
