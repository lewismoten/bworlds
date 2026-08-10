import { describe, expect, it } from 'vitest';
import { resolveSongFinalCadence } from './procedural-music-song-cadence.ts';
import {
  resolveMusicThemeById,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

function createLeadNote(
  startMs: number,
  frequency: number,
  instrumentId = 'deep-forest:lead:3:-2'
): ProceduralMusicNote {
  return {
    themeId: 'deep-forest',
    instrumentId,
    role: 'lead',
    startMs,
    durationMs: 400,
    frequency,
    volume: 0.1,
    waveform: 'triangle',
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1800,
      filterQ: 0.8,
    },
    attackMs: 12,
    releaseMs: 140,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 1,
  };
}

describe('procedural music song cadence', () => {
  it('resolves the final outro lead note to the tonic pitch class', () => {
    const sections: ProceduralMusicSongSection[] = [
      {
        id: 'a',
        label: 'Section A',
        startOffsetMs: 0,
        durationMs: 4_000,
        loopEligible: true,
        measureCount: 8,
        startMeasure: 1,
        endMeasure: 8,
        startTick: 0,
        endTick: 960,
      },
      {
        id: 'outro',
        label: 'Outro',
        startOffsetMs: 4_000,
        durationMs: 4_000,
        loopEligible: false,
        measureCount: 8,
        startMeasure: 9,
        endMeasure: 16,
        startTick: 960,
        endTick: 1_920,
      },
    ];
    const notes = [
      createLeadNote(3_600, 220),
      createLeadNote(4_400, 293.6647679174076),
      createLeadNote(7_600, 329.6275569128699),
    ];

    const resolved = resolveSongFinalCadence({
      notes,
      sections,
      songStartMs: 0,
    });
    const finalLead = resolved[resolved.length - 1]!;
    const theme = resolveMusicThemeById(finalLead.themeId);
    const finalPitchClass =
      ((Math.round(69 + 12 * Math.log2(finalLead.frequency / 440)) % 12) + 12) %
      12;

    expect(finalPitchClass).toBe(theme.rootMidiNote % 12);
    expect(finalLead.startMs).toBe(notes[2]!.startMs);
    expect(finalLead.durationMs).toBe(notes[2]!.durationMs);
  });
});
