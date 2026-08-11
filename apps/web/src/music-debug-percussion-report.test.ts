import { describe, expect, it } from 'vitest';

import {
  createMusicDebugPercussionEventSummaries,
  createMusicDebugPercussionVoiceCounts,
  formatMusicDebugPercussionEvents,
  formatMusicDebugPercussionVoiceCounts,
} from './music-debug-percussion-report.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('music debug percussion report', () => {
  it('lists every percussion event with its resolved drum name', () => {
    const notes = [
      createPercussionNote('deep-forest:percussion:3:-2:perc-kick-36:0', 0),
      createPercussionNote(
        'deep-forest:percussion:3:-2:perc-hand-percussion-54:1',
        750
      ),
      createPercussionNote(
        'deep-forest:percussion:3:-2:perc-shaker-69:2',
        1500
      ),
    ];

    expect(createMusicDebugPercussionEventSummaries(notes)).toEqual([
      expect.objectContaining({
        noteIndex: 0,
        grooveRole: null,
        voiceId: 'kick-36',
        voiceName: 'kick-center',
      }),
      expect.objectContaining({
        noteIndex: 1,
        grooveRole: null,
        voiceId: 'hand-percussion-54',
        voiceName: 'tambourine-hit',
      }),
      expect.objectContaining({
        noteIndex: 2,
        grooveRole: null,
        voiceId: 'shaker-69',
        voiceName: 'cabasa',
      }),
    ]);
    expect(formatMusicDebugPercussionEvents(notes)).toBe(
      'P1 0:00.0 kick (kick center) | P2 0:00.8 hand percussion (tambourine hit) | P3 0:01.5 shaker (cabasa)'
    );
  });

  it('counts percussion hits by resolved drum voice for the song report', () => {
    const notes = [
      createPercussionNote('deep-forest:percussion:3:-2:perc-kick-36:0', 0),
      createPercussionNote('deep-forest:percussion:3:-2:perc-kick-36:1', 500),
      createPercussionNote('deep-forest:percussion:3:-2:perc-shaker-69:2', 900),
    ];

    expect(createMusicDebugPercussionVoiceCounts(notes)).toEqual([
      expect.objectContaining({
        grooveRole: null,
        voiceId: 'kick-36',
        voiceName: 'kick-center',
        noteCount: 2,
      }),
      expect.objectContaining({
        grooveRole: null,
        voiceId: 'shaker-69',
        voiceName: 'cabasa',
        noteCount: 1,
      }),
    ]);
    expect(formatMusicDebugPercussionVoiceCounts(notes)).toBe(
      'kick (kick center) 2 | shaker (cabasa) 1'
    );
  });

  it('includes groove-role labels when percussion notes encode them', () => {
    const notes = [
      createPercussionNote(
        'deep-forest:percussion:3:-2:perc-cymbals-49:0:groove-accent',
        0
      ),
    ];

    expect(formatMusicDebugPercussionEvents(notes)).toBe(
      'P1 0:00.0 cymbals / accent (crash)'
    );
    expect(formatMusicDebugPercussionVoiceCounts(notes)).toBe(
      'cymbals / accent (crash) 1'
    );
  });
});

function createPercussionNote(
  instrumentId: string,
  startMs: number
): ProceduralMusicNote {
  return {
    themeId: 'deep-forest',
    instrumentId,
    role: 'percussion' as const,
    startMs,
    durationMs: 120,
    frequency: 440,
    volume: 0.02,
    velocity: 96,
    waveform: 'triangle' as const,
    timbre: {
      harmonicWaveform: 'triangle' as const,
      harmonicRatio: 1,
      filterType: 'bandpass' as const,
      filterCutoffHz: 1000,
      filterQ: 1,
    },
    attackMs: 8,
    releaseMs: 60,
    detuneCents: 0,
    harmonicGain: 0.1,
    pulseRate: 1,
  };
}
