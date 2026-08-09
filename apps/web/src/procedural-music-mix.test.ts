import { describe, expect, it } from 'vitest';
import {
  resolveMusicEqStages,
  resolveMusicStereoPan,
} from './procedural-music-mix.ts';

describe('procedural music mix', () => {
  it('places lead and harmony wider than bass in the stereo field', () => {
    const leadPan = resolveMusicStereoPan({
      role: 'lead',
      instrumentId: 'deep-forest:lead:2:-1',
    });
    const harmonyPan = resolveMusicStereoPan({
      role: 'harmony',
      instrumentId: 'deep-forest:harmony:2:-1',
    });
    const bassPan = resolveMusicStereoPan({
      role: 'bass',
      instrumentId: 'deep-forest:bass:2:-1',
    });

    expect(Math.abs(leadPan)).toBeGreaterThan(0.2);
    expect(Math.abs(harmonyPan)).toBeGreaterThan(0.25);
    expect(Math.abs(bassPan)).toBeLessThanOrEqual(0.16);
  });

  it('keeps bass mostly centered even when spatial panning is strong', () => {
    const bassPan = resolveMusicStereoPan(
      {
        role: 'bass',
        instrumentId: 'town-square:bass:3:-2',
      },
      1
    );

    expect(Math.abs(bassPan)).toBeLessThanOrEqual(0.16);
  });

  it('builds instrument-specific eq stages that protect lead space and low end', () => {
    const lead = resolveMusicEqStages({ role: 'lead', frequency: 440 });
    const harmony = resolveMusicEqStages({ role: 'harmony', frequency: 330 });
    const bass = resolveMusicEqStages({ role: 'bass', frequency: 110 });
    const percussion = resolveMusicEqStages({
      role: 'percussion',
      frequency: 880,
    });

    expect(lead.map((stage) => stage.type)).toEqual(['highpass', 'lowpass']);
    expect(harmony.map((stage) => stage.type)).toEqual(['highpass', 'lowpass']);
    expect(bass.map((stage) => stage.type)).toEqual(['lowpass']);
    expect(percussion.map((stage) => stage.type)).toEqual(['highpass']);
    expect(lead[0]!.frequencyHz).toBeGreaterThan(bass[0]!.frequencyHz);
  });
});
