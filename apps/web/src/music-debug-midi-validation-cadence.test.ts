import { describe, expect, it } from 'vitest';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import { EXPORTABLE_TOWN_MIDI_SNAPSHOT } from './testing/music-debug-midi-test-support.ts';

describe('music debug midi validation cadence and percussion', () => {
  it('blocks MIDI export when percussion validation fails', () => {
    const snapshot = EXPORTABLE_TOWN_MIDI_SNAPSHOT;

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        percussionValidation: {
          isValidForMidiExport: false,
          messages: [
            'Variation percussion should stay thinner than Section A.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Variation percussion should stay thinner than Section A.'
    );
  });

  it('blocks MIDI export when the final cadence does not resolve to tonic', () => {
    const snapshot = EXPORTABLE_TOWN_MIDI_SNAPSHOT;

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        cadenceValidation: {
          ...snapshot.cadenceValidation,
          isValidForMidiExport: false,
          messages: [
            'Outro answer cadence at measure 80 missed its target tones (lead D4, bass G3).',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Outro answer cadence at measure 80 missed its target tones (lead D4, bass G3).'
    );
  });
});
