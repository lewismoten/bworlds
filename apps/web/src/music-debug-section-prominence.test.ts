import { describe, expect, it } from 'vitest';

import type { MusicDebugSectionLayerActivity } from './music-debug-section-analysis.ts';
import { createMusicDebugSectionProminence } from './music-debug-section-prominence.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('music debug section prominence', () => {
  it('scores prominence from density, volume, register, and competing layers', () => {
    const sections: ProceduralMusicSongSection[] = [
      createSection('a', 'Section A', 0),
      createSection('a-prime', "Section A'", 4_000),
    ];
    const notes: ProceduralMusicNote[] = [
      createNote('lead', 0, 240, 0.03, 60),
      createNote('lead', 1_000, 240, 0.03, 62),
      createNote('lead', 4_000, 340, 0.05, 67),
      createNote('lead', 4_800, 340, 0.05, 69),
      createNote('lead', 5_600, 340, 0.05, 71),
      createNote('harmony', 0, 1_600, 0.04, 55),
      createNote('harmony', 4_000, 800, 0.02, 52),
    ];
    const activities: MusicDebugSectionLayerActivity[] = [
      {
        sectionId: 'a',
        sectionLabel: 'Section A',
        roleCounts: {
          bass: 0,
          harmony: 1,
          lead: 2,
          percussion: 0,
        },
        soundingTimePercentageByRole: {
          bass: 0,
          harmony: 40,
          lead: 12,
          percussion: 0,
        },
        averageDurationMsByRole: {
          bass: 0,
          harmony: 1_600,
          lead: 240,
          percussion: 0,
        },
      },
      {
        sectionId: 'a-prime',
        sectionLabel: "Section A'",
        roleCounts: {
          bass: 0,
          harmony: 1,
          lead: 3,
          percussion: 0,
        },
        soundingTimePercentageByRole: {
          bass: 0,
          harmony: 20,
          lead: 26,
          percussion: 0,
        },
        averageDurationMsByRole: {
          bass: 0,
          harmony: 800,
          lead: 340,
          percussion: 0,
        },
      },
    ];

    const prominence = createMusicDebugSectionProminence({
      notes,
      sections,
      activities,
    });

    expect(prominence).toHaveLength(2);
    expect(prominence[1]!.roles.lead.prominenceScore).toBeGreaterThan(
      prominence[0]!.roles.lead.prominenceScore
    );
    expect(prominence[1]!.roles.lead.densityScore).toBeGreaterThan(
      prominence[0]!.roles.lead.densityScore
    );
    expect(prominence[1]!.roles.lead.registerScore).toBeGreaterThan(
      prominence[0]!.roles.lead.registerScore
    );
    expect(prominence[1]!.roles.lead.volumeScore).toBeGreaterThan(
      prominence[0]!.roles.lead.volumeScore
    );
    expect(prominence[0]!.roles.lead.competitionPenalty).toBeGreaterThan(
      prominence[1]!.roles.lead.competitionPenalty
    );
  });
});

function createSection(
  id: ProceduralMusicSongSection['id'],
  label: string,
  startOffsetMs: number
): ProceduralMusicSongSection {
  return {
    id,
    label,
    startOffsetMs,
    durationMs: 4_000,
    loopEligible: true,
    measureCount: 4,
    startMeasure: 1,
    endMeasure: 4,
    startTick: 0,
    endTick: 7_680,
  };
}

function createNote(
  role: ProceduralMusicNote['role'],
  startMs: number,
  durationMs: number,
  volume: number,
  midiNote: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: `${role}-test`,
    role,
    startMs,
    durationMs,
    frequency: 440 * Math.pow(2, (midiNote - 69) / 12),
    volume,
    waveform: 'sine',
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1_200,
      filterQ: 0.8,
    },
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0.4,
    pulseRate: 0,
  };
}
