import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  toExportableSnapshot,
  withValidLeadContourAnalysis,
  withValidProgressionDetections,
} from './testing/music-debug-midi-test-support.ts';

describe('music debug midi validation content', () => {
  it('blocks MIDI export when SongDNA validation fails', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      })
    );

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        songDnaValidation: {
          isValidForMidiExport: false,
          messages: [
            'SongDNA lead instrument trumpet does not match bank family flute.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: SongDNA lead instrument trumpet does not match bank family flute.'
    );
  });

  it('rejects MIDI export when chromatic-note validation fails', () => {
    const snapshot = withValidProgressionDetections(
      withValidLeadContourAnalysis(
        createMusicDebugSnapshot({
          tileKind: 'forest',
          contextType: 'overworld',
          clusterX: 0,
          clusterY: 0,
        })
      )
    );

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        midiExportValidation: {
          ...snapshot.midiExportValidation,
          isValidForMidiExport: false,
          messages: ['Found 1 unexplained chromatic note.'],
        },
      })
    ).toThrow('Cannot export MIDI: Found 1 unexplained chromatic note.');
  });

  it('rejects MIDI export when timing validation fails', () => {
    const snapshot = withValidProgressionDetections(
      withValidLeadContourAnalysis(
        createMusicDebugSnapshot({
          tileKind: 'forest',
          contextType: 'overworld',
          clusterX: 0,
          clusterY: 0,
        })
      )
    );

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        midiExportValidation: {
          ...snapshot.midiExportValidation,
          isValidForMidiExport: true,
          messages: [],
        },
        timingValidation: {
          ...snapshot.timingValidation,
          isValidForMidiExport: false,
          messages: ['Loop range must stay inside the exported song duration.'],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Loop range must stay inside the exported song duration.'
    );
  });

  it('rejects MIDI export when the configured motif never appears', () => {
    const snapshot = withValidProgressionDetections(
      withValidLeadContourAnalysis(
        createMusicDebugSnapshot({
          tileKind: 'forest',
          contextType: 'overworld',
          clusterX: 0,
          clusterY: 0,
        })
      )
    );

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        motifValidation: {
          ...snapshot.motifValidation,
          isValidForMidiExport: false,
          messages: [
            'Configured lead motif 1-3-5-3 never appears in the generated song.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Configured lead motif 1-3-5-3 never appears in the generated song.'
    );
  });

  it('rejects MIDI export when harmony chord-tone fit falls below the minimum', () => {
    const snapshot = withValidProgressionDetections(
      withValidLeadContourAnalysis(
        createMusicDebugSnapshot({
          tileKind: 'forest',
          contextType: 'overworld',
          clusterX: 0,
          clusterY: 0,
        })
      )
    );

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        harmonicAlignmentValidation: {
          isValidForMidiExport: false,
          messages: [
            'Harmony chord-tone score 40% stayed below the export minimum 75%.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Harmony chord-tone score 40% stayed below the export minimum 75%.'
    );
  });

  it('rejects MIDI export when bass roots drift from the planned progression', () => {
    const snapshot = withValidProgressionDetections(
      withValidLeadContourAnalysis(
        createMusicDebugSnapshot({
          tileKind: 'forest',
          contextType: 'overworld',
          clusterX: 0,
          clusterY: 0,
        })
      )
    );

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        harmonicAlignmentValidation: {
          isValidForMidiExport: false,
          messages: ['Bass root drifted at measure 12 (A vs G).'],
        },
      })
    ).toThrow('Cannot export MIDI: Bass root drifted at measure 12 (A vs G).');
  });
});
