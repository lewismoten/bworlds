import { describe, expect, it } from 'vitest';
import { validateMusicDebugMotifPresence } from './music-debug-motif-validation.ts';

describe('music debug motif validation', () => {
  it('rejects songs when the configured motif never appears', () => {
    const validation = validateMusicDebugMotifPresence({
      leadMotif: [0, 2, 4, 2],
      sectionMotifMatches: [
        {
          sectionId: 'a',
          sectionLabel: 'Section A',
          exactMatchCount: 0,
          variedMatchCount: 0,
          matchCount: 0,
        },
        {
          sectionId: 'b',
          sectionLabel: 'Section B',
          exactMatchCount: 0,
          variedMatchCount: 0,
          matchCount: 0,
        },
      ],
    });

    expect(validation.totalMatchCount).toBe(0);
    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toEqual([
      'Configured lead motif 1-3-5-3 never appears in the generated song.',
    ]);
  });

  it('accepts songs when the motif appears exactly or with approved variation', () => {
    const validation = validateMusicDebugMotifPresence({
      leadMotif: [0, 2, 4, 2],
      sectionMotifMatches: [
        {
          sectionId: 'a',
          sectionLabel: 'Section A',
          exactMatchCount: 2,
          variedMatchCount: 0,
          matchCount: 2,
        },
        {
          sectionId: 'a-prime',
          sectionLabel: "Section A'",
          exactMatchCount: 0,
          variedMatchCount: 1,
          matchCount: 1,
        },
      ],
    });

    expect(validation.totalMatchCount).toBe(3);
    expect(validation.exactMatchCount).toBe(2);
    expect(validation.variedMatchCount).toBe(1);
    expect(validation.isValidForMidiExport).toBe(true);
    expect(validation.messages).toEqual([]);
  });

  it('prefers whole-song motif counts when section summaries miss a boundary-spanning match', () => {
    const validation = validateMusicDebugMotifPresence({
      leadMotif: [0, 2, 4, 2],
      sectionMotifMatches: [
        {
          sectionId: 'a',
          sectionLabel: 'Section A',
          exactMatchCount: 1,
          variedMatchCount: 0,
          matchCount: 1,
        },
        {
          sectionId: 'a-prime',
          sectionLabel: "Section A'",
          exactMatchCount: 2,
          variedMatchCount: 1,
          matchCount: 3,
        },
      ],
      overallExactMatchCount: 4,
      overallVariedMatchCount: 1,
    });

    expect(validation.totalMatchCount).toBe(5);
    expect(validation.exactMatchCount).toBe(4);
    expect(validation.variedMatchCount).toBe(1);
    expect(validation.isValidForMidiExport).toBe(true);
  });
});
