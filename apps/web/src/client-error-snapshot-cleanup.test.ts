import { describe, expect, it, vi } from 'vitest';

import {
  parseClientErrorSnapshotCleanupArgs,
  runClientErrorSnapshotCleanup,
} from '../../../scripts/client-error-snapshot-cleanup.mjs';

vi.mock('../client-error-snapshot-store.mjs', () => ({
  clearClientErrorSnapshots: vi.fn(() => 3),
  removeClientErrorSnapshot: vi.fn(() => true),
}));

describe('client error snapshot cleanup script', () => {
  it('parses remove and clear cleanup commands', () => {
    expect(parseClientErrorSnapshotCleanupArgs(['remove', 'deadbeef'])).toEqual(
      {
        command: 'remove',
        snapshotId: 'deadbeef',
      }
    );
    expect(parseClientErrorSnapshotCleanupArgs(['clear'])).toEqual({
      command: 'clear',
    });
  });

  it('rejects missing snapshot ids and unknown commands', () => {
    expect(() => parseClientErrorSnapshotCleanupArgs(['remove'])).toThrow(
      'Expected a client error snapshot id or file name for the remove command.'
    );
    expect(() => parseClientErrorSnapshotCleanupArgs(['unknown'])).toThrow(
      'Expected one of: remove <snapshot-id>, clear'
    );
  });

  it('runs the remove command and logs success', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(
      Promise.resolve(runClientErrorSnapshotCleanup(['remove', 'deadbeef']))
    ).resolves.toBe(0);
    expect(consoleLog).toHaveBeenCalledWith(
      'Removed client error snapshot deadbeef.'
    );
  });

  it('returns a failing exit code when the remove target does not exist', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const cleanupModule = await import('../client-error-snapshot-store.mjs');
    vi.mocked(cleanupModule.removeClientErrorSnapshot).mockReturnValueOnce(
      false
    );

    await expect(
      Promise.resolve(runClientErrorSnapshotCleanup(['remove', 'missing']))
    ).resolves.toBe(1);
    expect(consoleError).toHaveBeenCalledWith(
      'Client error snapshot not found: missing'
    );
  });

  it('runs the clear command and logs the number of removed files', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(
      Promise.resolve(runClientErrorSnapshotCleanup(['clear']))
    ).resolves.toBe(0);
    expect(consoleLog).toHaveBeenCalledWith(
      'Removed 3 client error snapshot(s).'
    );
  });
});
