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
      rootMidiNote: 55,
      scale: [0, 2, 4, 5, 7, 9, 10],
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
      scale: [0, 2, 4, 5, 7, 9, 10],
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
      scale: [0, 2, 4, 5, 7, 9, 10],
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

  it('accepts a precomputed root midi note when building the shared scale map', () => {
    expect(
      createProceduralScaleMap({
        rootMidiNote: 55,
        rootHz: 195.5,
        scale: [0, 2, 4, 5, 7, 9, 10],
      }).rootMidiNote
    ).toBe(55);
  });
});
