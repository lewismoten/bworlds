import { describe, expect, it } from 'vitest';
import {
  createProceduralScaleMap,
  getProceduralScaleDegreeSemitones,
  isProceduralSemitoneInMode,
  resolveProceduralRootMidiNote,
  resolveProceduralScaleDegreeMidiNote,
} from './procedural-music-scale.ts';

describe('procedural music scale', () => {
  it('resolves 196 Hz to MIDI note G3', () => {
    expect(resolveProceduralRootMidiNote(196)).toBe(55);
  });

  it('maps G Mixolydian scale degrees across octaves', () => {
    const scaleMap = createProceduralScaleMap({
      rootHz: 196,
      scale: [0, 2, 4, 5, 7, 9, 10],
    });

    expect(scaleMap.modePitchOffsets).toEqual([0, 2, 4, 5, 7, 9, 10]);
    expect(
      [0, 1, 2, 3, 4, 5, 6].map((degreeIndex) =>
        resolveProceduralScaleDegreeMidiNote({
          scaleMap,
          degreeIndex,
        })
      )
    ).toEqual([55, 57, 59, 60, 62, 64, 65]);
    expect(
      [7, 8, 9].map((degreeIndex) =>
        resolveProceduralScaleDegreeMidiNote({
          scaleMap,
          degreeIndex,
        })
      )
    ).toEqual([67, 69, 71]);
  });

  it('keeps motif degree offsets separate from semitone offsets', () => {
    const mixolydian = [0, 2, 4, 5, 7, 9, 10];

    expect(getProceduralScaleDegreeSemitones(mixolydian, 4)).toBe(7);
    expect(getProceduralScaleDegreeSemitones(mixolydian, 6)).toBe(10);
    expect(getProceduralScaleDegreeSemitones(mixolydian, 7)).toBe(12);
  });

  it('checks accidentals against one shared mode definition', () => {
    const mixolydian = [0, 2, 4, 5, 7, 9, 10];

    expect(isProceduralSemitoneInMode(mixolydian, 0)).toBe(true);
    expect(isProceduralSemitoneInMode(mixolydian, 10)).toBe(true);
    expect(isProceduralSemitoneInMode(mixolydian, 11)).toBe(false);
    expect(isProceduralSemitoneInMode(mixolydian, 13)).toBe(false);
    expect(isProceduralSemitoneInMode(mixolydian, 14)).toBe(true);
  });
});
