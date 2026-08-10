import { describe, expect, it } from 'vitest';

import {
  describeProceduralChordProgression,
  describeProceduralChordQuality,
  resolveProceduralChordProgression,
  resolveProceduralChordProgressionProfile,
} from './procedural-music-chord-progression.ts';

const MIXOLYDIAN_SCALE = [0, 2, 4, 5, 7, 9, 10] as const;

describe('procedural music chord progression', () => {
  it('uses curated cadence profiles that return to the tonic on the final chord', () => {
    const progression = resolveProceduralChordProgression({
      themeId: 'frontier-plains',
      clusterX: 3,
      clusterY: -2,
    });

    expect(progression).toHaveLength(4);
    expect(progression[0]).toBe(0);
    expect(progression.at(-1)).toBe(0);
  });

  it('biases plains progressions toward the 1-5-6-1 cadence family', () => {
    const profile = resolveProceduralChordProgressionProfile({
      themeId: 'frontier-plains',
      clusterX: 3,
      clusterY: -2,
    });

    expect(['1-5-6-1', '1-4-5-1']).toContain(profile.label);
  });

  it('describes chord 5 and chord 6 in G Mixolydian as minor triads', () => {
    expect(describeProceduralChordQuality(MIXOLYDIAN_SCALE, 4)).toBe('minor');
    expect(describeProceduralChordQuality(MIXOLYDIAN_SCALE, 5)).toBe('minor');
  });

  it('renders progression summaries with explicit degree and quality labels', () => {
    expect(
      describeProceduralChordProgression(MIXOLYDIAN_SCALE, [0, 4, 5, 0])
    ).toEqual(['1 major', '5 minor', '6 minor', '1 major']);
  });
});
