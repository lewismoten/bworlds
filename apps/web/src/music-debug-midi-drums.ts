import {
  isPercussionFamily,
  resolvePercussionVoice,
  resolvePercussionVoiceById,
  type PercussionFamily,
  type PercussionVoiceId,
} from './procedural-music-percussion-voices.ts';
import type {
  ProceduralInstrument,
  ProceduralMusicNote,
} from './procedural-music.ts';

const DEFAULT_MELODIC_MIDI_NOTE = 60;

export function isMidiPercussionFamily(
  family: ProceduralInstrument['family']
): family is PercussionFamily {
  return isPercussionFamily(family);
}

export function resolveMidiPercussionNoteNumber(options: {
  note: Pick<ProceduralMusicNote, 'frequency' | 'startMs'>;
  family: ProceduralInstrument['family'];
  noteIndex: number;
  voiceId?: PercussionVoiceId;
}): number {
  if (!isMidiPercussionFamily(options.family)) {
    return DEFAULT_MELODIC_MIDI_NOTE;
  }

  if (options.voiceId) {
    return resolvePercussionVoiceById(options.voiceId).midiNote;
  }

  return resolvePercussionVoice({
    family: options.family,
    noteIndex: options.noteIndex,
  }).midiNote;
}
