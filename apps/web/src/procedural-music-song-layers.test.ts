import { describe, expect, it } from 'vitest';
import {
  describeSongSectionLayerArrangement,
  resolveSongSectionLayerTreatment,
} from './procedural-music-song-layers.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

function createSection(
  id: ProceduralMusicSongSection['id']
): ProceduralMusicSongSection {
  return {
    id,
    label: id,
    startOffsetMs: 0,
    durationMs: 24_000,
    loopEligible: true,
    measureCount: 16,
    startMeasure: 1,
    endMeasure: 16,
    startTick: 0,
    endTick: 16 * 1920,
  };
}

describe('procedural music song layers', () => {
  it('thins instrumentation in the intro and outro sections', () => {
    expect(
      resolveSongSectionLayerTreatment(
        createSection('intro'),
        { role: 'percussion' },
        0
      ).muted
    ).toBe(true);
    expect(
      resolveSongSectionLayerTreatment(
        createSection('intro'),
        { role: 'bass' },
        1
      ).muted
    ).toBe(true);
    expect(
      resolveSongSectionLayerTreatment(
        createSection('outro'),
        { role: 'lead' },
        1
      ).muted
    ).toBe(true);
  });

  it('recombines section layers by muting or softening different roles per section', () => {
    const aPrimeLead = resolveSongSectionLayerTreatment(
      createSection('a-prime'),
      { role: 'lead' },
      0
    );
    const aHarmony = resolveSongSectionLayerTreatment(
      createSection('a'),
      { role: 'harmony' },
      6
    );
    const aPrimeHarmony = resolveSongSectionLayerTreatment(
      createSection('a-prime'),
      { role: 'harmony' },
      4
    );
    const bHarmony = resolveSongSectionLayerTreatment(
      createSection('b'),
      { role: 'harmony' },
      2
    );
    const bHarmonyAlternate = resolveSongSectionLayerTreatment(
      createSection('b'),
      { role: 'harmony' },
      1
    );
    const variationPercussion = resolveSongSectionLayerTreatment(
      createSection('variation'),
      { role: 'percussion' },
      4
    );
    const returnLead = resolveSongSectionLayerTreatment(
      createSection('return'),
      { role: 'lead' },
      0
    );
    const returnBass = resolveSongSectionLayerTreatment(
      createSection('return'),
      { role: 'bass' },
      0
    );
    const returnHarmony = resolveSongSectionLayerTreatment(
      createSection('return'),
      { role: 'harmony' },
      0
    );
    const returnPercussion = resolveSongSectionLayerTreatment(
      createSection('return'),
      { role: 'percussion' },
      0
    );

    expect(aPrimeLead.muted).toBe(false);
    expect(aPrimeLead.volumeMultiplier).toBeGreaterThan(1);
    expect(aHarmony.muted).toBe(false);
    expect(aHarmony.durationMultiplier).toBeLessThan(1);
    expect(aPrimeHarmony.muted).toBe(true);
    expect(aPrimeHarmony.durationMultiplier).toBeLessThan(1);
    expect(bHarmony.muted).toBe(true);
    expect(bHarmonyAlternate.muted).toBe(false);
    expect(bHarmony.volumeMultiplier).toBeLessThan(1);
    expect(bHarmonyAlternate.volumeMultiplier).toBeLessThan(
      aHarmony.volumeMultiplier
    );
    expect(bHarmonyAlternate.durationMultiplier).toBeLessThan(
      aHarmony.durationMultiplier
    );
    expect(variationPercussion.muted).toBe(true);
    expect(returnLead.muted).toBe(false);
    expect(returnLead.volumeMultiplier).toBeLessThan(1);
    expect(returnBass.muted).toBe(false);
    expect(returnBass.volumeMultiplier).toBeGreaterThan(1);
    expect(returnBass.durationMultiplier).toBeGreaterThan(1);
    expect(returnHarmony.muted).toBe(false);
    expect(returnHarmony.volumeMultiplier).toBeGreaterThan(
      aHarmony.volumeMultiplier
    );
    expect(returnHarmony.durationMultiplier).toBeGreaterThan(
      aHarmony.durationMultiplier
    );
    expect(returnHarmony.releaseMultiplier).toBeGreaterThan(1);
    expect(returnPercussion.muted).toBe(false);
  });

  it('describes the layer arrangement used by each section for debug inspection', () => {
    expect(
      describeSongSectionLayerArrangement(createSection('intro'))
    ).toContain('no percussion');
    expect(
      describeSongSectionLayerArrangement(createSection('variation'))
    ).toContain('stretched lead');
  });
});
