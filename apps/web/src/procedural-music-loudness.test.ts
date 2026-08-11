import { describe, expect, it } from 'vitest';
import {
  normalizeProceduralMusicLoudness,
  PROCEDURAL_MUSIC_TARGET_LOUDNESS,
  PROCEDURAL_MUSIC_ROLE_LOUDNESS_WEIGHTS,
  resolveProceduralMusicLoudnessPolicy,
  resolveProceduralMusicLoudness,
  resolveProceduralMusicRoleLoudnessTargets,
} from './procedural-music-loudness.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

function createNote(
  role: ProceduralMusicNote['role'],
  volume: number,
  durationMs: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: `test:${role}`,
    role,
    startMs: 0,
    durationMs,
    frequency: 220,
    volume,
    waveform: 'sine',
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1200,
      filterQ: 0.8,
    },
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 1,
  };
}

describe('procedural music loudness', () => {
  it('defines explicit loudness targets for each song role from one shared target band', () => {
    const policy = resolveProceduralMusicLoudnessPolicy();
    const targets = resolveProceduralMusicRoleLoudnessTargets();

    expect(policy.targetLoudness).toBe(PROCEDURAL_MUSIC_TARGET_LOUDNESS);
    expect(policy.roleWeights).toEqual(PROCEDURAL_MUSIC_ROLE_LOUDNESS_WEIGHTS);
    expect(targets.lead).toBeCloseTo(PROCEDURAL_MUSIC_TARGET_LOUDNESS, 6);
    expect(targets.harmony).toBeLessThan(targets.lead);
    expect(targets.bass).toBeLessThan(targets.harmony);
    expect(targets.percussion).toBeLessThan(targets.bass);
  });

  it('measures louder note groups above quieter ones', () => {
    const quiet = [
      createNote('lead', 0.018, 260),
      createNote('harmony', 0.015, 320),
      createNote('bass', 0.014, 360),
    ];
    const loud = [
      createNote('lead', 0.03, 260),
      createNote('harmony', 0.025, 320),
      createNote('bass', 0.024, 360),
    ];

    expect(resolveProceduralMusicLoudness(loud)).toBeGreaterThan(
      resolveProceduralMusicLoudness(quiet)
    );
  });

  it('pulls louder and quieter groups toward a shared target band', () => {
    const quiet = [
      createNote('lead', 0.016, 260),
      createNote('harmony', 0.014, 320),
      createNote('bass', 0.013, 360),
    ];
    const loud = [
      createNote('lead', 0.032, 260),
      createNote('harmony', 0.028, 320),
      createNote('bass', 0.025, 360),
    ];

    const beforeGap = Math.abs(
      resolveProceduralMusicLoudness(loud) -
        resolveProceduralMusicLoudness(quiet)
    );
    normalizeProceduralMusicLoudness(quiet);
    normalizeProceduralMusicLoudness(loud);
    const afterGap = Math.abs(
      resolveProceduralMusicLoudness(loud) -
        resolveProceduralMusicLoudness(quiet)
    );

    expect(afterGap).toBeLessThan(beforeGap);
    expect(afterGap).toBeLessThan(0.004);
    expect(resolveProceduralMusicLoudness(quiet)).toBeCloseTo(
      PROCEDURAL_MUSIC_TARGET_LOUDNESS,
      3
    );
    expect(resolveProceduralMusicLoudness(loud)).toBeCloseTo(
      PROCEDURAL_MUSIC_TARGET_LOUDNESS,
      3
    );
  });
});
