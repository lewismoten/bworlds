import { describe, expect, it } from 'vitest';

import { validateMusicDebugPhraseIntent } from './music-debug-phrase-intent-validation.ts';

describe('music debug phrase intent validation', () => {
  it('accepts phrase-intent scores that stay above the export thresholds', () => {
    expect(
      validateMusicDebugPhraseIntent({
        motif: {
          label: 'motif',
          score: 0.875,
          summary: '2 exact / 2 varied',
        },
        contour: {
          label: 'contour',
          score: 0.767,
          summary: '4/6 checkpoints in range, climax aligned, final tonic',
        },
        cadence: {
          label: 'cadence',
          score: 0.5,
          summary: '1/2 cadence checkpoints matched',
        },
        overallScore: 0.714,
      })
    ).toEqual({
      isValidForMidiExport: true,
      messages: [],
    });
  });

  it('rejects weak phrase-intent scores with concrete reasons', () => {
    expect(
      validateMusicDebugPhraseIntent({
        motif: {
          label: 'motif',
          score: 0.25,
          summary: '0 exact / 1 varied',
        },
        contour: {
          label: 'contour',
          score: 0.45,
          summary: '2/6 checkpoints in range, final tonic',
        },
        cadence: {
          label: 'cadence',
          score: 0.25,
          summary: '1/4 cadence checkpoints matched',
        },
        overallScore: 0.317,
      })
    ).toEqual({
      isValidForMidiExport: false,
      messages: [
        'Phrase-intent score 32% stayed below the export minimum 60%.',
        'Phrase-intent motif score 25% stayed below the export minimum 55% (0 exact / 1 varied).',
        'Phrase-intent contour score 45% stayed below the export minimum 60% (2/6 checkpoints in range, final tonic).',
        'Phrase-intent cadence score 25% stayed below the export minimum 50% (1/4 cadence checkpoints matched).',
      ],
    });
  });
});
