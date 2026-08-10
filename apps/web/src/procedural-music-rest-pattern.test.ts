import { describe, expect, it } from 'vitest';
import {
  isPhraseBoundaryWindow,
  shouldUsePhraseBoundaryRest,
} from './procedural-music-rest-pattern.ts';

describe('procedural music rest pattern', () => {
  it('only treats phrase-adjacent steps as valid melodic rest windows', () => {
    expect(
      Array.from({ length: 8 }, (_, step) => isPhraseBoundaryWindow(step, 8))
    ).toEqual([false, true, false, false, false, false, true, true]);
  });

  it('keeps rest decisions deterministic inside phrase-boundary windows', () => {
    const first = shouldUsePhraseBoundaryRest({
      themeId: 'frontier-plains',
      role: 'lead',
      phraseStep: 6,
      phraseLength: 8,
      clusterX: 3,
      clusterY: -2,
    });
    const second = shouldUsePhraseBoundaryRest({
      themeId: 'frontier-plains',
      role: 'lead',
      phraseStep: 6,
      phraseLength: 8,
      clusterX: 3,
      clusterY: -2,
    });

    expect(first).toBe(second);
    expect(
      shouldUsePhraseBoundaryRest({
        themeId: 'frontier-plains',
        role: 'lead',
        phraseStep: 3,
        phraseLength: 8,
        clusterX: 3,
        clusterY: -2,
      })
    ).toBe(false);
  });
});
