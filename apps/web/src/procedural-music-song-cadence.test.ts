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

function createBassNote(
  startMs: number,
  frequency: number,
  instrumentId = 'deep-forest:bass:3:-2'
): ProceduralMusicNote {
  return {
    ...createLeadNote(startMs, frequency, instrumentId),
    role: 'bass',
    waveform: 'sine',
  };
}

describe('procedural music song cadence', () => {
  it('gives the midpoint of a sixteen-measure phrase an unstable question cadence', () => {
    const sections: ProceduralMusicSongSection[] = [
      {
        id: 'a',
        label: 'Section A',
        startOffsetMs: 0,
        durationMs: 16_000,
        loopEligible: true,
        measureCount: 16,
        startMeasure: 1,
        endMeasure: 16,
        startTick: 0,
        endTick: 3_840,
      },
    ];
    const notes = [
      createLeadNote(7_000, 261.6255653005986),
      createBassNote(7_100, 130.8127826502993),
      createLeadNote(15_600, 261.6255653005986),
      createBassNote(15_700, 130.8127826502993),
    ];

    const resolved = resolveSongFinalCadence({
      notes,
      sections,
      songStartMs: 0,
    });
    const midpointLead = resolved[0]!;
    const midpointBass = resolved[1]!;
    const leadPitchClass =
      ((Math.round(69 + 12 * Math.log2(midpointLead.frequency / 440)) % 12) +
        12) %
      12;
    const bassPitchClass =
      ((Math.round(69 + 12 * Math.log2(midpointBass.frequency / 440)) % 12) +
        12) %
      12;
    const theme = resolveMusicThemeById(midpointLead.themeId);

    expect(leadPitchClass).not.toBe(theme.rootMidiNote % 12);
    expect(bassPitchClass).not.toBe((theme.rootMidiNote - 12) % 12);
    expect(midpointLead.durationMs).toBeLessThanOrEqual(notes[0]!.durationMs);
  });

  it('adds a weaker interior cadence at non-final section boundaries', () => {
    const sections: ProceduralMusicSongSection[] = [
      {
        id: 'intro',
        label: 'Intro',
        startOffsetMs: 0,
        durationMs: 4_000,
        loopEligible: false,
        measureCount: 8,
        startMeasure: 1,
        endMeasure: 8,
        startTick: 0,
        endTick: 960,
      },
      {
        id: 'a',
        label: 'Section A',
        startOffsetMs: 4_000,
        durationMs: 4_000,
        loopEligible: true,
        measureCount: 8,
        startMeasure: 9,
        endMeasure: 16,
        startTick: 960,
        endTick: 1_920,
      },
    ];
    const notes = [
      createLeadNote(3_600, 261.6255653005986),
      createBassNote(3_650, 130.8127826502993),
      createLeadNote(7_600, 293.6647679174076),
    ];

    const resolved = resolveSongFinalCadence({
      notes,
      sections,
      songStartMs: 0,
    });
    const introLead = resolved[0]!;
    const introBass = resolved[1]!;
    const theme = resolveMusicThemeById(introLead.themeId);
    const introLeadPitchClass =
      ((Math.round(69 + 12 * Math.log2(introLead.frequency / 440)) % 12) + 12) %
      12;
    const introBassPitchClass =
      ((Math.round(69 + 12 * Math.log2(introBass.frequency / 440)) % 12) + 12) %
      12;

    expect(introLeadPitchClass).not.toBe(theme.rootMidiNote % 12);
    expect(introBassPitchClass).not.toBe((theme.rootMidiNote - 12) % 12);
    expect(introLead.durationMs).toBeGreaterThanOrEqual(notes[0]!.durationMs);
  });

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
      createBassNote(3_700, 110),
      createLeadNote(4_400, 293.6647679174076),
      createBassNote(4_500, 146.8323839587038),
      createLeadNote(7_600, 329.6275569128699),
      createBassNote(7_650, 164.81377845643496),
    ];

    const resolved = resolveSongFinalCadence({
      notes,
      sections,
      songStartMs: 0,
    });
    const finalLead = resolved[resolved.length - 2]!;
    const finalBass = resolved[resolved.length - 1]!;
    const theme = resolveMusicThemeById(finalLead.themeId);
    const finalPitchClass =
      ((Math.round(69 + 12 * Math.log2(finalLead.frequency / 440)) % 12) + 12) %
      12;
    const finalBassPitchClass =
      ((Math.round(69 + 12 * Math.log2(finalBass.frequency / 440)) % 12) + 12) %
      12;

    expect(finalPitchClass).toBe(theme.rootMidiNote % 12);
    expect(finalBassPitchClass).toBe((theme.rootMidiNote - 12) % 12);
    expect(finalLead.startMs).toBe(notes[4]!.startMs);
    expect(finalLead.durationMs).toBeGreaterThanOrEqual(notes[4]!.durationMs);
  });
});
