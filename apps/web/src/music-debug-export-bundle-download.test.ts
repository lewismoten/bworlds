import { describe, expect, it, vi } from 'vitest';

import { downloadMusicDebugExportBundle } from './music-debug-export-bundle.ts';
import { TOWN_EXPORTABLE_SNAPSHOT } from './testing/music-debug-export-bundle-fixtures.ts';

describe('music debug export bundle download', () => {
  it('downloads the bundled zip through a blob url', () => {
    const snapshot = TOWN_EXPORTABLE_SNAPSHOT;
    const remove = vi.fn();
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
      remove,
    };
    const appendAnchor = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:bundle');
    const revokeObjectURL = vi.fn();

    downloadMusicDebugExportBundle(
      snapshot,
      {
        createObjectURL,
        revokeObjectURL,
        createAnchor: () => anchor,
        appendAnchor,
      },
      {
        createdAt: new Date('2026-08-10T00:00:00.000Z'),
      }
    );

    expect(anchor.href).toBe('blob:bundle');
    expect(anchor.download).toBe('bworlds-town-square-3--2-export.zip');
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(appendAnchor).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:bundle');
  }, 10_000);
});
