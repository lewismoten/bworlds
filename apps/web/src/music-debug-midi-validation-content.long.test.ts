import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  toExportableSnapshot,
  withValidLeadContourAnalysis,
  withValidPhraseIntentValidation,
  withValidProgressionDetections,
} from './testing/music-debug-midi-test-support.ts';

const exportableTownSnapshot = toExportableSnapshot(
  createMusicDebugSnapshot({
    tileKind: 'town',
    contextType: 'town',
    clusterX: 3,
    clusterY: -2,
  })
);
const validForestExportSnapshot = withValidPhraseIntentValidation(
  withValidProgressionDetections(
    withValidLeadContourAnalysis(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      })
    )
  )
);

describe('music debug midi validation content', () => {
  it('blocks MIDI export when SongDNA validation fails', () => {
    expect(() =>
      createMusicDebugMidiFile({
        ...exportableTownSnapshot,
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
    expect(() =>
      createMusicDebugMidiFile({
        ...validForestExportSnapshot,
        midiExportValidation: {
          ...validForestExportSnapshot.midiExportValidation,
          isValidForMidiExport: false,
          messages: ['Found 1 unexplained chromatic note.'],
        },
      })
    ).toThrow('Cannot export MIDI: Found 1 unexplained chromatic note.');
  });

  it('rejects MIDI export when timing validation fails', () => {
    expect(() =>
      createMusicDebugMidiFile({
        ...validForestExportSnapshot,
        midiExportValidation: {
          ...validForestExportSnapshot.midiExportValidation,
          isValidForMidiExport: true,
          messages: [],
        },
        timingValidation: {
          ...validForestExportSnapshot.timingValidation,
          isValidForMidiExport: false,
          messages: ['Loop range must stay inside the exported song duration.'],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Loop range must stay inside the exported song duration.'
    );
  });

  it('rejects MIDI export when the configured motif never appears', () => {
    expect(() =>
      createMusicDebugMidiFile({
        ...validForestExportSnapshot,
        motifValidation: {
          ...validForestExportSnapshot.motifValidation,
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
    expect(() =>
      createMusicDebugMidiFile({
        ...validForestExportSnapshot,
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
    expect(() =>
      createMusicDebugMidiFile({
        ...validForestExportSnapshot,
        harmonicAlignmentValidation: {
          isValidForMidiExport: false,
          messages: ['Bass root drifted at measure 12 (A vs G).'],
        },
      })
    ).toThrow('Cannot export MIDI: Bass root drifted at measure 12 (A vs G).');
  });

  it('rejects MIDI export when phrase-intent coherence falls below the minimum', () => {
    expect(() =>
      createMusicDebugMidiFile({
        ...validForestExportSnapshot,
        phraseIntentValidation: {
          isValidForMidiExport: false,
          messages: [
            'Phrase-intent score 32% stayed below the export minimum 60%.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Phrase-intent score 32% stayed below the export minimum 60%.'
    );
  });
});
