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
    const bHarmony = resolveSongSectionLayerTreatment(
      createSection('b'),
      { role: 'harmony' },
      5
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

    expect(bHarmony.muted).toBe(true);
    expect(variationPercussion.muted).toBe(true);
    expect(returnLead.muted).toBe(false);
    expect(returnLead.volumeMultiplier).toBeLessThan(1);
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
