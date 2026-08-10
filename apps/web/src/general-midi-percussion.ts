import type { PercussionFamily } from './procedural-music-percussion-voices.ts';

export type GeneralMidiPercussionNote = Readonly<{
  family: PercussionFamily;
  midiNote: number;
  name: string;
}>;

const GENERAL_MIDI_PERCUSSION_NOTES: readonly GeneralMidiPercussionNote[] = [
  { family: 'kick', midiNote: 35, name: 'Acoustic Bass Drum' },
  { family: 'kick', midiNote: 36, name: 'Bass Drum 1' },
  { family: 'snare', midiNote: 37, name: 'Side Stick' },
  { family: 'snare', midiNote: 38, name: 'Acoustic Snare' },
  { family: 'snare', midiNote: 39, name: 'Hand Clap' },
  { family: 'snare', midiNote: 40, name: 'Electric Snare' },
  { family: 'kick', midiNote: 41, name: 'Low Floor Tom' },
  { family: 'cymbals', midiNote: 42, name: 'Closed Hi-Hat' },
  { family: 'kick', midiNote: 43, name: 'High Floor Tom' },
  { family: 'cymbals', midiNote: 44, name: 'Pedal Hi-Hat' },
  { family: 'kick', midiNote: 45, name: 'Low Tom' },
  { family: 'cymbals', midiNote: 46, name: 'Open Hi-Hat' },
  { family: 'kick', midiNote: 47, name: 'Low-Mid Tom' },
  { family: 'kick', midiNote: 48, name: 'Hi-Mid Tom' },
  { family: 'cymbals', midiNote: 49, name: 'Crash Cymbal 1' },
  { family: 'kick', midiNote: 50, name: 'High Tom' },
  { family: 'cymbals', midiNote: 51, name: 'Ride Cymbal 1' },
  { family: 'cymbals', midiNote: 52, name: 'Chinese Cymbal' },
  { family: 'cymbals', midiNote: 53, name: 'Ride Bell' },
  { family: 'shaker', midiNote: 54, name: 'Tambourine' },
  { family: 'cymbals', midiNote: 55, name: 'Splash Cymbal' },
  { family: 'cymbals', midiNote: 57, name: 'Crash Cymbal 2' },
  { family: 'cymbals', midiNote: 59, name: 'Ride Cymbal 2' },
  { family: 'hand-percussion', midiNote: 60, name: 'Hi Bongo' },
  { family: 'hand-percussion', midiNote: 61, name: 'Low Bongo' },
  { family: 'hand-percussion', midiNote: 62, name: 'Mute Hi Conga' },
  { family: 'hand-percussion', midiNote: 63, name: 'Open Hi Conga' },
  { family: 'hand-percussion', midiNote: 64, name: 'Low Conga' },
  { family: 'hand-percussion', midiNote: 65, name: 'High Timbale' },
  { family: 'hand-percussion', midiNote: 66, name: 'Low Timbale' },
  { family: 'hand-percussion', midiNote: 67, name: 'High Agogo' },
  { family: 'hand-percussion', midiNote: 68, name: 'Low Agogo' },
  { family: 'shaker', midiNote: 69, name: 'Cabasa' },
  { family: 'shaker', midiNote: 70, name: 'Maracas' },
  { family: 'hand-percussion', midiNote: 71, name: 'Short Whistle' },
  { family: 'hand-percussion', midiNote: 72, name: 'Long Whistle' },
  { family: 'hand-percussion', midiNote: 73, name: 'Short Guiro' },
  { family: 'hand-percussion', midiNote: 74, name: 'Long Guiro' },
  { family: 'hand-percussion', midiNote: 75, name: 'Claves' },
  { family: 'hand-percussion', midiNote: 76, name: 'Hi Wood Block' },
  { family: 'hand-percussion', midiNote: 77, name: 'Low Wood Block' },
  { family: 'hand-percussion', midiNote: 78, name: 'Mute Cuica' },
  { family: 'hand-percussion', midiNote: 79, name: 'Open Cuica' },
  { family: 'hand-percussion', midiNote: 80, name: 'Mute Triangle' },
  { family: 'hand-percussion', midiNote: 81, name: 'Open Triangle' },
] as const;

export function listGeneralMidiPercussionNotesForFamily(
  family: PercussionFamily
): readonly GeneralMidiPercussionNote[] {
  return GENERAL_MIDI_PERCUSSION_NOTES.filter((note) => note.family === family);
}
