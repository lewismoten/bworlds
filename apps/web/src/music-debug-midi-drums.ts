import type {
  ProceduralInstrument,
  ProceduralMusicNote,
} from './procedural-music.ts';

const DEFAULT_MELODIC_MIDI_NOTE = 60;

const PERCUSSION_PATTERNS: Record<PercussionFamily, readonly number[]> = {
  kick: [36, 35, 36, 41],
  snare: [38, 37, 40, 39],
  cymbals: [49, 51, 46, 42],
  shaker: [69, 54, 42, 70],
  'hand-percussion': [60, 61, 54, 69],
};

type PercussionFamily = Extract<
  ProceduralInstrument['family'],
  'kick' | 'snare' | 'cymbals' | 'shaker' | 'hand-percussion'
>;

export function isMidiPercussionFamily(
  family: ProceduralInstrument['family']
): family is PercussionFamily {
  return (
    family === 'kick' ||
    family === 'snare' ||
    family === 'cymbals' ||
    family === 'shaker' ||
    family === 'hand-percussion'
  );
}

export function resolveMidiPercussionNoteNumber(options: {
  note: Pick<ProceduralMusicNote, 'frequency' | 'startMs'>;
  family: ProceduralInstrument['family'];
  noteIndex: number;
}): number {
  if (!isMidiPercussionFamily(options.family)) {
    return DEFAULT_MELODIC_MIDI_NOTE;
  }

  const pattern = PERCUSSION_PATTERNS[options.family];
  const patternIndex = options.noteIndex % pattern.length;

  return pattern[patternIndex] ?? pattern[0] ?? DEFAULT_MELODIC_MIDI_NOTE;
}
