import { describe, expect, it } from 'vitest';
import { resolveMidiPercussionNoteNumber } from './music-debug-midi-drums.ts';
import {
  resolvePercussionVoiceName,
  resolvePercussionVoiceNameByMidiNote,
} from './procedural-music-percussion-voices.ts';
import {
  resolvePercussionFamilyFromInstrumentId,
  resolvePercussionVoiceNameFromInstrumentId,
  resolvePercussionVoiceIdFromInstrumentId,
} from './procedural-music-percussion.ts';

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

  it('supports note-level percussion family overrides encoded in instrument ids', () => {
    expect(
      resolvePercussionFamilyFromInstrumentId(
        'deep-forest:percussion:3:-2:perc-cymbals-49:0'
      )
    ).toBe('cymbals');
    expect(
      resolvePercussionFamilyFromInstrumentId(
        'deep-forest:percussion:3:-2:perc-kick-36:0'
      )
    ).toBe('kick');
    expect(
      resolvePercussionVoiceIdFromInstrumentId(
        'deep-forest:percussion:3:-2:perc-kick-36:0'
      )
    ).toBe('kick-36');
  });

  it('prefers an explicit percussion voice id over note-index rotation', () => {
    expect(
      resolveMidiPercussionNoteNumber({
        note: { frequency: 440, startMs: 120 },
        family: 'kick',
        noteIndex: 3,
        voiceId: 'kick-35',
      })
    ).toBe(35);
  });

  it('maps MIDI drum notes onto named percussion voices', () => {
    expect(
      resolvePercussionVoiceName({
        family: 'cymbals',
        noteIndex: 0,
      })
    ).toBe('crash');
    expect(
      resolvePercussionVoiceNameByMidiNote({
        family: 'cymbals',
        midiNote: 42,
      })
    ).toBe('closed-hat');
    expect(
      resolvePercussionVoiceNameByMidiNote({
        family: 'hand-percussion',
        midiNote: 61,
      })
    ).toBe('low-bongo');
    expect(
      resolvePercussionVoiceNameFromInstrumentId(
        'deep-forest:percussion:3:-2:perc-cymbals-51:0'
      )
    ).toBe('ride');
  });
});
