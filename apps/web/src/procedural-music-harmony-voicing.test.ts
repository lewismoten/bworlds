import { describe, expect, it } from 'vitest';

import { resolveProceduralHarmonyChordVoicing } from './procedural-music-harmony-voicing.ts';

describe('procedural music harmony voicing', () => {
  it('keeps shared chord tones close when neighboring triads overlap', () => {
    const first = resolveProceduralHarmonyChordVoicing({
      chord: {
        rootSemitones: 0,
        thirdSemitones: 4,
        fifthSemitones: 7,
      },
    });
    const second = resolveProceduralHarmonyChordVoicing({
      chord: {
        rootSemitones: 9,
        thirdSemitones: 12,
        fifthSemitones: 16,
      },
      previousChord: {
        rootSemitones: 0,
        thirdSemitones: 4,
        fifthSemitones: 7,
      },
    });

    expect(first).toEqual([12, 16, 19]);
    expect(second).toEqual([12, 16, 21]);
    expect(
      second.filter((semitones) =>
        first.some(
          (previousSemitones) =>
            ((previousSemitones % 12) + 12) % 12 ===
            ((semitones % 12) + 12) % 12
        )
      )
    ).toHaveLength(2);
    expect(
      second.every(
        (semitones, index) =>
          Math.abs(semitones - (first[index] ?? semitones)) <= 2
      )
    ).toBe(true);
  });

  it('avoids octave-sized voice jumps as the default chord motion', () => {
    const first = resolveProceduralHarmonyChordVoicing({
      chord: {
        rootSemitones: 0,
        thirdSemitones: 4,
        fifthSemitones: 7,
      },
    });
    const second = resolveProceduralHarmonyChordVoicing({
      chord: {
        rootSemitones: 7,
        thirdSemitones: 10,
        fifthSemitones: 14,
      },
      previousChord: {
        rootSemitones: 0,
        thirdSemitones: 4,
        fifthSemitones: 7,
      },
    });

    expect(second).toHaveLength(3);
    expect(
      second.every(
        (semitones, index) =>
          Math.abs(semitones - (first[index] ?? semitones)) <= 7
      )
    ).toBe(true);
  });

  it('keeps voiced harmony triads out of the lead register ceiling', () => {
    const voicing = resolveProceduralHarmonyChordVoicing({
      chord: {
        rootSemitones: 9,
        thirdSemitones: 12,
        fifthSemitones: 16,
      },
    });

    expect(voicing).toHaveLength(3);
    expect(Math.max(...voicing)).toBeLessThanOrEqual(26);
  });
});
