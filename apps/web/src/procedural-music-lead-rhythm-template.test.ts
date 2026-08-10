import { describe, expect, it } from 'vitest';
import {
  PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT,
  resolveProceduralLeadRhythmPhraseTemplate,
} from './procedural-music-lead-rhythm-template.ts';

describe('procedural music lead rhythm template', () => {
  it('builds a deterministic reusable eight-measure phrase template', () => {
    const first = resolveProceduralLeadRhythmPhraseTemplate({
      themeId: 'frontier-plains',
      clusterX: 3,
      clusterY: -2,
    });
    const second = resolveProceduralLeadRhythmPhraseTemplate({
      themeId: 'frontier-plains',
      clusterX: 3,
      clusterY: -2,
    });

    expect(first).toEqual(second);
    expect(first.measures).toHaveLength(8);
    expect(
      first.measures.every(
        (measure) => measure.attacks.length >= 2 && measure.attacks.length <= 3
      )
    ).toBe(true);
    expect(
      first.measures.every(
        (measure, measureIndex) =>
          measure.attacks.every(
            (attack) =>
              attack.offsetRatio * PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT ===
                attack.subdivisionStep &&
              attack.durationRatio *
                PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT ===
                attack.subdivisionLength
        ) &&
        measure.tailRestSubdivisionCount ===
          ((measureIndex + 1) % 4 === 0 ? 4 : 0)
      )
    ).toBe(true);
  });

  it('changes phrase templates across different music contexts', () => {
    const plains = resolveProceduralLeadRhythmPhraseTemplate({
      themeId: 'frontier-plains',
      clusterX: 3,
      clusterY: -2,
    });
    const town = resolveProceduralLeadRhythmPhraseTemplate({
      themeId: 'town-square',
      clusterX: 3,
      clusterY: -2,
    });

    expect(
      plains.measures.map((measure) => measure.attacks.length)
    ).not.toEqual(town.measures.map((measure) => measure.attacks.length));
  });
});
