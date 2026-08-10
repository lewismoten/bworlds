import { describe, expect, it } from 'vitest';
import {
  createProceduralScaleMap,
  getProceduralScaleDegreeSemitones,
  isProceduralSemitoneInMode,
  resolveProceduralRootMidiNote,
  resolveProceduralScaleDegreeMidiNote,
  validateProceduralModePitchOffsets,
} from './procedural-music-scale.ts';
import {
  PROCEDURAL_MODE_MIXOLYDIAN,
  PROCEDURAL_MODE_NATURAL_MINOR,
} from './procedural-music-modes.ts';

describe('procedural music scale', () => {
  it('resolves 196 Hz to MIDI note G3', () => {
    expect(resolveProceduralRootMidiNote(196)).toBe(55);
  });

  it('maps G Mixolydian scale degrees across octaves', () => {
    const scaleMap = createProceduralScaleMap({
      rootMidiNote: 55,
      scale: PROCEDURAL_MODE_MIXOLYDIAN,
    });

    expect(scaleMap.rootMidiNote).toBe(55);
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

  it('keeps degree 1, 3, and 5 aligned to G, B, and D from the stored root', () => {
    const scaleMap = createProceduralScaleMap({
      rootMidiNote: 55,
      scale: PROCEDURAL_MODE_MIXOLYDIAN,
    });

    expect(
      resolveProceduralScaleDegreeMidiNote({
        scaleMap,
        degreeIndex: 0,
      })
    ).toBe(55);
    expect(
      resolveProceduralScaleDegreeMidiNote({
        scaleMap,
        degreeIndex: 2,
      })
    ).toBe(59);
    expect(
      resolveProceduralScaleDegreeMidiNote({
        scaleMap,
        degreeIndex: 4,
      })
    ).toBe(62);
  });

  it('renders the shared 1-3-5-3 motif as G-B-D-B in G Mixolydian', () => {
    const scaleMap = createProceduralScaleMap({
      rootMidiNote: 55,
      scale: PROCEDURAL_MODE_MIXOLYDIAN,
    });

    expect(
      [0, 2, 4, 2].map((degreeIndex) =>
        resolveProceduralScaleDegreeMidiNote({
          scaleMap,
          degreeIndex,
        })
      )
    ).toEqual([55, 59, 62, 59]);
  });

  it('keeps motif degree offsets separate from semitone offsets', () => {
    const mixolydian = PROCEDURAL_MODE_MIXOLYDIAN;

    expect(getProceduralScaleDegreeSemitones(mixolydian, 4)).toBe(7);
    expect(getProceduralScaleDegreeSemitones(mixolydian, 6)).toBe(10);
    expect(getProceduralScaleDegreeSemitones(mixolydian, 7)).toBe(12);
  });

  it('checks accidentals against one shared mode definition', () => {
    const mixolydian = PROCEDURAL_MODE_MIXOLYDIAN;

    expect(isProceduralSemitoneInMode(mixolydian, 0)).toBe(true);
    expect(isProceduralSemitoneInMode(mixolydian, 10)).toBe(true);
    expect(isProceduralSemitoneInMode(mixolydian, 11)).toBe(false);
    expect(isProceduralSemitoneInMode(mixolydian, 13)).toBe(false);
    expect(isProceduralSemitoneInMode(mixolydian, 14)).toBe(true);
  });

  it('accepts a precomputed root midi note when building the shared scale map', () => {
    expect(
      createProceduralScaleMap({
        rootMidiNote: 55,
        rootHz: 195.5,
        scale: PROCEDURAL_MODE_MIXOLYDIAN,
      }).rootMidiNote
    ).toBe(55);
  });

  it('uses the correct natural minor offsets', () => {
    expect(
      validateProceduralModePitchOffsets(PROCEDURAL_MODE_NATURAL_MINOR)
    ).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it('rejects duplicate scale degrees after pitch-class normalization', () => {
    expect(() => validateProceduralModePitchOffsets([0, 2, 4, 7, 12])).toThrow(
      /Duplicate scale degrees/
    );
  });

  it('rejects seven-note modes with fewer than seven unique offsets', () => {
    expect(() =>
      validateProceduralModePitchOffsets([0, 2, 4, 5, 7, 7, 10])
    ).toThrow(/seven unique offsets/i);
  });
});
