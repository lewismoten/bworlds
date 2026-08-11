import { describe, expect, it } from 'vitest';

import { createMusicDebugExportBundle } from './music-debug-export-bundle.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import { TOWN_EXPORTABLE_SNAPSHOT } from './testing/music-debug-export-bundle-fixtures.ts';

describe('music debug export bundle fallback', () => {
  it('still packages an export zip when strict midi export would reject the snapshot', () => {
    const snapshot = {
      ...TOWN_EXPORTABLE_SNAPSHOT,
      cadenceValidation: {
        isValidForMidiExport: false,
        messages: [
          'Outro answer cadence at measure 80 drifted outside the active harmony (G#; lead B4, bass B1).',
        ],
        detections: [],
      },
    };

    expect(() => createMusicDebugMidiFile(snapshot)).toThrow(
      'Cannot export MIDI: Outro answer cadence at measure 80 drifted outside the active harmony'
    );

    const bundle = createMusicDebugExportBundle(snapshot, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });

    expect(bundle.fileName).toBe('bworlds-town-square-3--2-export.zip');
    expect(bundle.entries.map((entry) => entry.fileName)).toContain(
      'bworlds-town-square-3--2.mid'
    );
  }, 10_000);
});
