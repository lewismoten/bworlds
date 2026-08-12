import { describe, expect, it } from 'vitest';

import {
  createMusicDebugSectionVelocityStats,
  formatMusicDebugSectionVelocitySummary,
} from './music-debug-section-velocity.ts';
import type { ProceduralInstrumentTimbre } from './music-instrument-timbres.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralMusicSongSectionId } from './procedural-music-blueprint.ts';
import type { MusicRegionThemeId } from './procedural-music-vocabulary.ts';

describe('music debug section velocity', () => {
  it('reports min, max, and average velocity by section and role', () => {
    const stats = createMusicDebugSectionVelocityStats({
      sections: [
        createSection('intro', 'Intro', 0, 2_000),
        createSection('a', 'A', 2_000, 2_000),
      ],
      notes: [
        createNote('lead', 0, 500, 440, 80),
        createNote('lead', 700, 400, 493.88, 92),
        createNote('bass', 200, 1_200, 110, 64),
        createNote('lead', 2_100, 500, 523.25, 78),
        createNote('harmony', 2_300, 900, 329.63, 70),
        createNote('percussion', 2_400, 120, 220, 96),
      ],
    });

    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({
      sectionId: 'intro',
      sectionLabel: 'Intro',
      velocityByRole: {
        lead: {
          noteCount: 2,
          minVelocity: 80,
          maxVelocity: 92,
          averageVelocity: 86,
          dynamicRange: 12,
        },
        bass: {
          noteCount: 1,
          minVelocity: 64,
          maxVelocity: 64,
          averageVelocity: 64,
          dynamicRange: 0,
        },
      },
    });
    expect(stats[1]?.velocityByRole.harmony).toMatchObject({
      noteCount: 1,
      minVelocity: 70,
      maxVelocity: 70,
      averageVelocity: 70,
      dynamicRange: 0,
    });
    expect(stats[1]?.velocityByRole.percussion).toMatchObject({
      noteCount: 1,
      minVelocity: 96,
      maxVelocity: 96,
      averageVelocity: 96,
      dynamicRange: 0,
    });
  });

  it('formats section velocity summaries for the debug page', () => {
    const summary = formatMusicDebugSectionVelocitySummary([
      {
        sectionId: 'intro',
        sectionLabel: 'Intro',
        velocityByRole: {
          lead: {
            noteCount: 2,
            minVelocity: 80,
            maxVelocity: 92,
            averageVelocity: 86,
            dynamicRange: 12,
          },
          harmony: {
            noteCount: 0,
            minVelocity: null,
            maxVelocity: null,
            averageVelocity: 0,
            dynamicRange: 0,
          },
          bass: {
            noteCount: 1,
            minVelocity: 64,
            maxVelocity: 64,
            averageVelocity: 64,
            dynamicRange: 0,
          },
          percussion: {
            noteCount: 0,
            minVelocity: null,
            maxVelocity: null,
            averageVelocity: 0,
            dynamicRange: 0,
          },
        },
      },
    ]);

    expect(summary).toBe(
      'Intro Melody 80-92 dyn 12 avg 86 / Harmony n/a / Bass 64-64 dyn 0 avg 64 / Percussion n/a'
    );
  });
});

function createSection(
  id: ProceduralMusicSongSectionId,
  label: string,
  startOffsetMs: number,
  durationMs: number
): ProceduralMusicSongSection {
  return {
    id,
    label,
    startOffsetMs,
    durationMs,
    loopEligible: false,
    startTick: 0,
    endTick: 0,
    measureCount: 1,
    startMeasure: 1,
    endMeasure: 1,
  };
}

function createNote(
  role: ProceduralMusicNote['role'],
  startMs: number,
  durationMs: number,
  frequency: number,
  velocity: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains' satisfies MusicRegionThemeId,
    instrumentId: `${role}-instrument`,
    role,
    startMs,
    durationMs,
    frequency,
    volume: 0.8,
    velocity,
    waveform: 'sine',
    timbre: createTestTimbre(),
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0,
    pulseRate: 0,
  };
}

function createTestTimbre(): ProceduralInstrumentTimbre {
  return {
    harmonicWaveform: 'sine',
    harmonicRatio: 1,
    filterType: 'lowpass',
    filterCutoffHz: 2_000,
    filterQ: 0,
    noiseMix: 0,
  };
}
