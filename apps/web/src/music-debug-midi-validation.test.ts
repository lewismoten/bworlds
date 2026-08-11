import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  toExportableSnapshot,
  withValidLeadContourAnalysis,
  withValidProgressionDetections,
} from './testing/music-debug-midi-test-support.ts';

describe('music debug midi validation', () => {
  it('blocks MIDI export when percussion validation fails', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });

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

  it('blocks MIDI export when the lead contour ending misses its required tonic resolution', () => {
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
});
