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
    const lead = resolveMusicEqStages({
      role: 'lead',
      instrumentId: 'frontier-plains:lead:0:0',
      frequency: 440,
    });
    const harmony = resolveMusicEqStages({
      role: 'harmony',
      instrumentId: 'deep-forest:harmony:2:-1',
      frequency: 330,
    });
    const bass = resolveMusicEqStages({
      role: 'bass',
      instrumentId: 'frontier-plains:bass:0:0',
      frequency: 110,
    });
    const percussion = resolveMusicEqStages({
      role: 'percussion',
      instrumentId: 'frontier-plains:percussion:0:0',
      frequency: 880,
    });

    expect(lead.map((stage) => stage.type)).toEqual(['highpass', 'lowpass']);
    expect(harmony.map((stage) => stage.type)).toEqual(['highpass', 'lowpass']);
    expect(bass.map((stage) => stage.type)).toEqual(['lowpass']);
    expect(percussion.map((stage) => stage.type)).toEqual(['highpass']);
    expect(lead[0]!.frequencyHz).toBeGreaterThan(bass[0]!.frequencyHz);
  });

  it('splits overlapping harmony instruments into darker and brighter eq lanes', () => {
    const darkerHarmony = resolveMusicEqStages({
      role: 'harmony',
      instrumentId: 'deep-forest:harmony:2:-1',
      frequency: 520,
    });
    const brighterHarmony = resolveMusicEqStages({
      role: 'harmony',
      instrumentId: 'town-square:harmony:3:-2',
      frequency: 520,
    });

    expect(darkerHarmony[0]!.frequencyHz).not.toBe(
      brighterHarmony[0]!.frequencyHz
    );
    expect(darkerHarmony[1]!.frequencyHz).not.toBe(
      brighterHarmony[1]!.frequencyHz
    );
  });
});
