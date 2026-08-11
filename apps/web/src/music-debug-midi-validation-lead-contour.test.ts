import { describe, expect, it } from 'vitest';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  EXPORTABLE_TOWN_MIDI_SNAPSHOT,
  withValidLeadContourAnalysis,
} from './testing/music-debug-midi-test-support.ts';

describe('music debug midi validation lead contour', () => {
  it('blocks MIDI export when the lead contour ending misses its required tonic resolution', () => {
    const snapshot = EXPORTABLE_TOWN_MIDI_SNAPSHOT;

    expect(() =>
      createMusicDebugMidiFile({
        ...withValidLeadContourAnalysis(snapshot),
        leadContourAnalysis: {
          ...snapshot.leadContourAnalysis,
          finalResolvesToTonic: false,
          messages: [
            'Lead contour ending at measure 80 on D4 resolved to scale degree 2 instead of tonic.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Lead contour ending at measure 80 on D4 resolved to scale degree 2 instead of tonic.'
    );
  });

  it('blocks MIDI export when the lead contour climax occurs in the wrong phrase', () => {
    const snapshot = EXPORTABLE_TOWN_MIDI_SNAPSHOT;

    expect(() =>
      createMusicDebugMidiFile({
        ...withValidLeadContourAnalysis(snapshot),
        leadContourAnalysis: {
          ...snapshot.leadContourAnalysis,
          climaxNearPlannedPeak: false,
          messages: [
            'Lead contour climax peaked at measure 72 on C5 instead of the planned peak near measure 64.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Lead contour climax peaked at measure 72 on C5 instead of the planned peak near measure 64.'
    );
  });
});
