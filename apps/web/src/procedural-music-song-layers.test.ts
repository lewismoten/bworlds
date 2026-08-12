import { describe, expect, it } from 'vitest';
import { createProceduralMusicSongSectionContext } from './procedural-music-song-section-context.ts';
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
        createContext(createSection('intro'), { role: 'percussion' }, 0)
      ).muted
    ).toBe(true);
    expect(
      resolveSongSectionLayerTreatment(
        createContext(createSection('intro'), { role: 'bass' }, 1)
      ).muted
    ).toBe(true);
    expect(
      resolveSongSectionLayerTreatment(
        createContext(createSection('outro'), { role: 'lead' }, 1)
      ).muted
    ).toBe(true);
  });

  it('recombines section layers by muting or softening different roles per section', () => {
    const aPrimeLead = resolveSongSectionLayerTreatment(
      createContext(createSection('a-prime'), { role: 'lead' }, 0)
    );
    const aHarmony = resolveSongSectionLayerTreatment(
      createContext(createSection('a'), { role: 'harmony' }, 6)
    );
    const aPrimeHarmony = resolveSongSectionLayerTreatment(
      createContext(createSection('a-prime'), { role: 'harmony' }, 4)
    );
    const bHarmony = resolveSongSectionLayerTreatment(
      createContext(createSection('b'), { role: 'harmony' }, 2)
    );
    const bHarmonyAlternate = resolveSongSectionLayerTreatment(
      createContext(createSection('b'), { role: 'harmony' }, 1)
    );
    const bPercussion = resolveSongSectionLayerTreatment(
      createContext(createSection('b'), { role: 'percussion' }, 2, 1_600)
    );
    const bPercussionAlternate = resolveSongSectionLayerTreatment(
      createContext(createSection('b'), { role: 'percussion' }, 1, 100)
    );
    const variationPercussion = resolveSongSectionLayerTreatment(
      createContext(createSection('variation'), { role: 'percussion' }, 4)
    );
    const returnPercussionEnergy = resolveSongSectionLayerTreatment(
      createContext(createSection('return'), { role: 'percussion' }, 0)
    );
    const returnLead = resolveSongSectionLayerTreatment(
      createContext(createSection('return'), { role: 'lead' }, 0)
    );
    const returnBass = resolveSongSectionLayerTreatment(
      createContext(createSection('return'), { role: 'bass' }, 0)
    );
    const returnBassCadence = resolveSongSectionLayerTreatment(
      createContext(createSection('return'), { role: 'bass' }, 7, 1_750)
    );
    const returnHarmony = resolveSongSectionLayerTreatment(
      createContext(createSection('return'), { role: 'harmony' }, 0)
    );
    const returnPercussion = resolveSongSectionLayerTreatment(
      createContext(createSection('return'), { role: 'percussion' }, 0)
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
    expect(bPercussion.muted).toBe(true);
    expect(bPercussionAlternate.muted).toBe(false);
    expect(bPercussionAlternate.volumeMultiplier).toBeLessThan(1);
    expect(bPercussionAlternate.velocityMultiplier).toBeLessThan(1);
    expect(variationPercussion.muted).toBe(true);
    expect(variationPercussion.velocityMultiplier).toBeGreaterThan(
      bPercussionAlternate.velocityMultiplier
    );
    expect(returnPercussionEnergy.velocityMultiplier).toBeGreaterThan(
      bPercussionAlternate.velocityMultiplier
    );
    expect(returnPercussionEnergy.velocityMultiplier).toBeLessThan(
      variationPercussion.velocityMultiplier
    );
    expect(returnLead.muted).toBe(false);
    expect(returnLead.volumeMultiplier).toBeLessThan(1);
    expect(returnBass.muted).toBe(false);
    expect(returnBass.volumeMultiplier).toBeLessThan(returnBassCadence.volumeMultiplier);
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
    expect(returnPercussion.velocityMultiplier).toBeGreaterThan(1);
  });

  it('describes the layer arrangement used by each section for debug inspection', () => {
    expect(
      describeSongSectionLayerArrangement(createSection('intro'))
    ).toContain('no percussion');
    expect(
      describeSongSectionLayerArrangement(createSection('variation'))
    ).toContain('stretched lead');
    expect(describeSongSectionLayerArrangement(createSection('b'))).toContain(
      'thinner percussion'
    );
  });

  it('applies section-level volume curves within the same section', () => {
    const introLeadStart = resolveSongSectionLayerTreatment(
      createContext(createSection('intro'), { role: 'lead' }, 0, 0)
    );
    const introLeadMiddle = resolveSongSectionLayerTreatment(
      createContext(createSection('intro'), { role: 'lead' }, 4, 6_000)
    );
    const outroLeadEarly = resolveSongSectionLayerTreatment(
      createContext(createSection('outro'), { role: 'lead' }, 0, 0)
    );
    const outroLeadLate = resolveSongSectionLayerTreatment(
      createContext(createSection('outro'), { role: 'lead' }, 6, 18_000)
    );
    const variationLeadEarly = resolveSongSectionLayerTreatment(
      createContext(createSection('variation'), { role: 'lead' }, 1, 1_500)
    );
    const variationLeadPeak = resolveSongSectionLayerTreatment(
      createContext(createSection('variation'), { role: 'lead' }, 5, 12_000)
    );

    expect(introLeadMiddle.volumeMultiplier).toBeGreaterThan(
      introLeadStart.volumeMultiplier
    );
    expect(outroLeadLate.volumeMultiplier).toBeLessThan(
      outroLeadEarly.volumeMultiplier
    );
    expect(variationLeadPeak.volumeMultiplier).toBeGreaterThan(
      variationLeadEarly.volumeMultiplier
    );
  });

  it('ducks accompaniment volume during lead-forward phrase positions', () => {
    const section = createSection('a');
    const earlyHarmony = resolveSongSectionLayerTreatment(
      createContext(section, { role: 'harmony' }, 2, 500)
    );
    const cadenceHarmony = resolveSongSectionLayerTreatment(
      createContext(section, { role: 'harmony' }, 7, 1_750)
    );
    const earlyBass = resolveSongSectionLayerTreatment(
      createContext(section, { role: 'bass' }, 2, 500)
    );
    const cadenceBass = resolveSongSectionLayerTreatment(
      createContext(section, { role: 'bass' }, 7, 1_750)
    );

    expect(earlyHarmony.volumeMultiplier).toBeLessThan(
      cadenceHarmony.volumeMultiplier
    );
    expect(earlyBass.volumeMultiplier).toBeLessThan(
      cadenceBass.volumeMultiplier
    );
  });
});

function createContext(
  section: ProceduralMusicSongSection,
  note: { role: 'lead' | 'harmony' | 'bass' | 'percussion' },
  noteIndexInSection: number,
  startMs = noteIndexInSection * 250
) {
  return createProceduralMusicSongSectionContext({
    section,
    note: {
      role: note.role,
      startMs,
      instrumentId: `${note.role}-test`,
    },
    noteIndexInSection,
    songStartMs: 0,
  });
}
