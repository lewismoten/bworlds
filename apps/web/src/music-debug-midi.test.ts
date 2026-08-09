import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugMidiFile,
  downloadMusicDebugMidiFile,
} from './music-debug-midi.ts';

describe('music debug midi', () => {
  it('encodes the current generated song as a midi file with a stable filename', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
      dayProgress: 0.25,
      yearProgress: 0.75,
    });

    const file = createMusicDebugMidiFile(snapshot);

    expect(file.fileName).toBe('bworlds-town-square-3--2.mid');
    expect(file.mimeType).toBe('audio/midi');
    expect(Array.from(file.bytes.slice(0, 4))).toEqual([
      0x4d, 0x54, 0x68, 0x64,
    ]);
    expect(Array.from(file.bytes.slice(14, 18))).toEqual([
      0x4d, 0x54, 0x72, 0x6b,
    ]);
    expect(file.bytes.length).toBeGreaterThan(256);
  });

  it('downloads the encoded midi file through a blob url', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });
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

    downloadMusicDebugMidiFile(snapshot, {
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
});
