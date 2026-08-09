import { describe, expect, it } from 'vitest';
import {
  resolveMusicThemeVocabulary,
  resolveRegionalMusicInfluence,
} from './procedural-music-vocabulary.ts';

describe('procedural music vocabulary', () => {
  it('gives each theme an explicit musical vocabulary', () => {
    const forest = resolveMusicThemeVocabulary('deep-forest', 0, 0);
    const plains = resolveMusicThemeVocabulary('frontier-plains', 0, 0);
    const cave = resolveMusicThemeVocabulary('cavern-echo', 0, 0);

    expect(forest.biomeLabel).toBe('forest');
    expect(forest.modeLabel).not.toBe(plains.modeLabel);
    expect(cave.tempoBandLabel).not.toBe(plains.tempoBandLabel);
    expect(forest.preferredIntervals.length).toBeGreaterThan(0);
    expect(forest.preferredIntervalUnit).toBe('semitones');
    expect(forest.instrumentFamilies.lead.length).toBeGreaterThan(0);
  });

  it('lets larger regional buckets influence the same theme vocabulary', () => {
    const nearby = resolveMusicThemeVocabulary('deep-forest', 6, 8);
    let distant = resolveMusicThemeVocabulary('deep-forest', 220, -180);

    for (let regionX = -4; regionX <= 4; regionX += 1) {
      for (let regionY = -4; regionY <= 4; regionY += 1) {
        const candidate = resolveMusicThemeVocabulary(
          'deep-forest',
          regionX * 48,
          regionY * 48
        );
        if (candidate.regionLabel !== nearby.regionLabel) {
          distant = candidate;
          regionX = 5;
          break;
        }
      }
    }

    expect(nearby.regionLabel).not.toBe(distant.regionLabel);
    expect(nearby.modeLabel).not.toBe(distant.modeLabel);
    expect(nearby.preferredIntervals).not.toEqual(distant.preferredIntervals);
  });

  it('stays stable inside the same coarse regional bucket', () => {
    expect(resolveRegionalMusicInfluence('town-square', 12, 18)).toEqual(
      resolveRegionalMusicInfluence('town-square', 40, 41)
    );
  });
});
