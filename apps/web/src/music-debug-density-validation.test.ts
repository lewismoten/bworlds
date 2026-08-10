import { describe, expect, it } from 'vitest';

import { validateMusicDebugDensity } from './music-debug-density-validation.ts';
import type { MusicDebugSectionLayerActivity } from './music-debug-section-analysis.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('music debug density validation', () => {
  it('accepts representative section note densities inside their planned ranges', () => {
    const validation = validateMusicDebugDensity({
      sections: TEST_SECTIONS,
      activities: [
        createActivity('intro', {
          bass: 4,
          harmony: 12,
          lead: 20,
          percussion: 0,
        }),
        createActivity('a', {
          bass: 16,
          harmony: 32,
          lead: 40,
          percussion: 24,
        }),
        createActivity('b', {
          bass: 14,
          harmony: 18,
          lead: 28,
          percussion: 20,
        }),
        createActivity('variation', {
          bass: 14,
          harmony: 20,
          lead: 22,
          percussion: 10,
        }),
        createActivity('return', {
          bass: 16,
          harmony: 30,
          lead: 38,
          percussion: 24,
        }),
        createActivity('outro', {
          bass: 4,
          harmony: 12,
          lead: 14,
          percussion: 0,
        }),
      ],
    });

    expect(validation.isValidForMidiExport).toBe(true);
    expect(validation.messages).toEqual([]);
    expect(validation.sections.every((section) => section.matchesPlan)).toBe(
      true
    );
  });

  it('flags sections whose role density exceeds the configured range', () => {
    const validation = validateMusicDebugDensity({
      sections: [TEST_SECTIONS[0]!, TEST_SECTIONS[1]!],
      activities: [
        createActivity('intro', {
          bass: 20,
          harmony: 40,
          lead: 60,
          percussion: 2,
        }),
        createActivity('a', { bass: 2, harmony: 4, lead: 8, percussion: 1 }),
      ],
    });

    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toContain(
      'Intro: percussion density 0.25 exceeded 0.00 notes/measure'
    );
    expect(
      validation.messages.some((message) =>
        message.includes('Section A: harmony density')
      )
    ).toBe(true);
  });
});

const TEST_SECTIONS: ProceduralMusicSongSection[] = [
  createSection('intro', 'Intro', 8),
  createSection('a', 'Section A', 16),
  createSection('b', 'Section B', 16),
  createSection('variation', 'Variation', 16),
  createSection('return', 'Return', 8),
  createSection('outro', 'Outro', 8),
];

function createSection(
  id: ProceduralMusicSongSection['id'],
  label: string,
  measureCount: number
): ProceduralMusicSongSection {
  return {
    id,
    label,
    startOffsetMs: 0,
    durationMs: measureCount * 1_000,
    loopEligible: id !== 'outro',
    measureCount,
    startMeasure: 1,
    endMeasure: measureCount,
    startTick: 0,
    endTick: measureCount * 240,
  };
}

function createActivity(
  sectionId: string,
  roleCounts: MusicDebugSectionLayerActivity['roleCounts']
): MusicDebugSectionLayerActivity {
  return {
    sectionId,
    sectionLabel: sectionId,
    roleCounts,
    soundingTimePercentageByRole: {
      bass: 0,
      harmony: 0,
      lead: 0,
      percussion: 0,
    },
    averageDurationMsByRole: {
      bass: 0,
      harmony: 0,
      lead: 0,
      percussion: 0,
    },
  };
}
