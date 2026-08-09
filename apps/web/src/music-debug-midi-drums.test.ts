import { describe, expect, it } from 'vitest';
import { resolveMidiPercussionNoteNumber } from './music-debug-midi-drums.ts';

describe('music debug midi drums', () => {
  it('maps cymbal-family percussion notes onto multiple GM drum samples', () => {
    const note = {
      frequency: 880,
      startMs: 0,
    };

    const mapped = [
      resolveMidiPercussionNoteNumber({
        note,
        family: 'cymbals',
        noteIndex: 0,
      }),
      resolveMidiPercussionNoteNumber({
        note: { ...note, startMs: 120 },
        family: 'cymbals',
        noteIndex: 1,
      }),
      resolveMidiPercussionNoteNumber({
        note: { ...note, startMs: 240 },
        family: 'cymbals',
        noteIndex: 2,
      }),
      resolveMidiPercussionNoteNumber({
        note: { ...note, startMs: 360 },
        family: 'cymbals',
        noteIndex: 3,
      }),
    ];

    expect(mapped).toEqual([49, 51, 46, 42]);
  });

  it('maps shaker and hand percussion families onto cabasa and tambourine-capable notes', () => {
    expect(
      resolveMidiPercussionNoteNumber({
        note: { frequency: 440, startMs: 0 },
        family: 'shaker',
        noteIndex: 0,
      })
    ).toBe(69);
    expect(
      resolveMidiPercussionNoteNumber({
        note: { frequency: 440, startMs: 120 },
        family: 'hand-percussion',
        noteIndex: 1,
      })
    ).toBe(61);
  });
});
