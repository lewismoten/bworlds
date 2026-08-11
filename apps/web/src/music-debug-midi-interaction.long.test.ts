import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { downloadMusicDebugMidiFile } from './music-debug-midi.ts';
import { resolveMusicDebugMidiExportRoles } from './music-debug-midi-export-variant.ts';
import { toExportableSnapshot } from './testing/music-debug-midi-test-support.ts';

describe('music debug midi interaction', () => {
  it('downloads the encoded midi file through a blob url', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      })
    );
    const exportableSnapshot = {
      ...snapshot,
      midiExportValidation: {
        ...snapshot.midiExportValidation,
        isValidForMidiExport: true,
        messages: [],
      },
    };
    const remove = vi.fn();
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
      remove,
    };
    const appendAnchor = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:music');
    const revokeObjectURL = vi.fn();

    downloadMusicDebugMidiFile(exportableSnapshot, {
      createObjectURL,
      revokeObjectURL,
      createAnchor: () => anchor,
      appendAnchor,
    });

    expect(anchor.href).toBe('blob:music');
    expect(anchor.download).toBe('bworlds-deep-forest-0-0.mid');
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(appendAnchor).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:music');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['full', ['bass', 'harmony', 'lead', 'percussion']],
    ['melody-only', ['lead']],
    ['harmony-and-bass', ['bass', 'harmony']],
  ] as const)(
    'maps the %s export variant onto the intended role set',
    (variant, roles) => {
      expect(resolveMusicDebugMidiExportRoles(variant)).toEqual(roles);
    }
  );
});
