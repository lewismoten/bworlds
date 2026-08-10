import { describe, expect, it } from 'vitest';

import { validateMusicDebugCadences } from './music-debug-cadence-validation.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('music debug cadence validation', () => {
  it('accepts cadence notes that match their targets and active harmony', () => {
    const validation = validateMusicDebugCadences({
      notes: [
        createNote('lead', 3_500, 293.6647679174076),
        createNote('bass', 3_540, 195.99771799087463),
        createNote('harmony', 3_200, 195.99771799087463),
        createNote('harmony', 3_200, 293.6647679174076),
        createNote('harmony', 3_200, 233.08188075904496),
        createNote('lead', 7_480, 261.6255653005986),
        createNote('bass', 7_520, 130.8127826502993),
        createNote('harmony', 7_100, 130.8127826502993),
        createNote('harmony', 7_100, 164.81377845643496),
        createNote('harmony', 7_100, 195.99771799087463),
      ],
      sections: TEST_SECTIONS,
      songStartMs: 0,
      rootMidiNote: 48,
      scale: [0, 2, 4, 5, 7, 9, 10],
    });

    expect(validation.isValidForMidiExport).toBe(true);
    expect(validation.detections).toEqual([
      expect.objectContaining({
        sectionId: 'return',
        kind: 'loop',
        measureNumber: 8,
        leadPitchLabel: 'D',
        bassPitchLabel: 'G',
        leadNoteLabel: 'D4',
        bassNoteLabel: 'G3',
        matchesCadenceTarget: true,
        matchesHarmony: true,
      }),
      expect.objectContaining({
        sectionId: 'outro',
        kind: 'answer',
        measureNumber: 16,
        leadPitchLabel: 'C',
        bassPitchLabel: 'C',
        leadNoteLabel: 'C4',
        bassNoteLabel: 'C3',
        matchesCadenceTarget: true,
        matchesHarmony: true,
      }),
    ]);
  });

  it('flags cadence notes that drift outside the planned harmony', () => {
    const validation = validateMusicDebugCadences({
      notes: [
        createNote('lead', 3_500, 261.6255653005986),
        createNote('bass', 3_540, 130.8127826502993),
        createNote('harmony', 3_200, 195.99771799087463),
        createNote('harmony', 3_200, 293.6647679174076),
        createNote('harmony', 3_200, 369.9944227116344),
      ],
      sections: [TEST_SECTIONS[0]!],
      songStartMs: 0,
      rootMidiNote: 48,
      scale: [0, 2, 4, 5, 7, 9, 10],
    });

    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toContain(
      'Return answer cadence at measure 8 drifted outside the active harmony (D, F#, G; lead C4, bass C3).'
    );
  });
});

const TEST_SECTIONS: ProceduralMusicSongSection[] = [
  {
    id: 'return',
    label: 'Return',
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

function createNote(
  role: ProceduralMusicNote['role'],
  startMs: number,
  frequency: number
): ProceduralMusicNote {
  return {
    themeId: 'deep-forest',
    instrumentId: `deep-forest:${role}:3:-2`,
    role,
    startMs,
    durationMs: 600,
    frequency,
    volume: 0.1,
    waveform: role === 'bass' ? 'sine' : 'triangle',
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
