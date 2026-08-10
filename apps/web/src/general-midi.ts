import type { ProceduralInstrumentRole } from './procedural-music.ts';

export type GeneralMidiInstrumentMetadata = Readonly<{
  programNumber: number | null;
  instrumentName: string;
  familyName: string;
}>;

export type GeneralMidiProgram = Readonly<{
  programNumber: number;
  instrumentName: string;
  familyName: string;
}>;

export type GeneralMidiFamilyGroup = Readonly<{
  familyName: string;
  programs: readonly GeneralMidiProgram[];
}>;

const GENERAL_MIDI_FAMILIES = [
  {
    familyName: 'Piano',
    instrumentNames: [
      'Acoustic Grand Piano',
      'Bright Acoustic Piano',
      'Electric Grand Piano',
      'Honky-tonk Piano',
      'Electric Piano 1',
      'Electric Piano 2',
      'Harpsichord',
      'Clavinet',
    ],
  },
  {
    familyName: 'Chromatic Percussion',
    instrumentNames: [
      'Celesta',
      'Glockenspiel',
      'Music Box',
      'Vibraphone',
      'Marimba',
      'Xylophone',
      'Tubular Bells',
      'Dulcimer',
    ],
  },
  {
    familyName: 'Organ',
    instrumentNames: [
      'Drawbar Organ',
      'Percussive Organ',
      'Rock Organ',
      'Church Organ',
      'Reed Organ',
      'Accordion',
      'Harmonica',
      'Tango Accordion',
    ],
  },
  {
    familyName: 'Guitar',
    instrumentNames: [
      'Acoustic Guitar (nylon)',
      'Acoustic Guitar (steel)',
      'Electric Guitar (jazz)',
      'Electric Guitar (clean)',
      'Electric Guitar (muted)',
      'Overdriven Guitar',
      'Distortion Guitar',
      'Guitar Harmonics',
    ],
  },
  {
    familyName: 'Bass',
    instrumentNames: [
      'Acoustic Bass',
      'Electric Bass (finger)',
      'Electric Bass (pick)',
      'Fretless Bass',
      'Slap Bass 1',
      'Slap Bass 2',
      'Synth Bass 1',
      'Synth Bass 2',
    ],
  },
  {
    familyName: 'Strings',
    instrumentNames: [
      'Violin',
      'Viola',
      'Cello',
      'Contrabass',
      'Tremolo Strings',
      'Pizzicato Strings',
      'Orchestral Harp',
      'Timpani',
    ],
  },
  {
    familyName: 'Ensemble',
    instrumentNames: [
      'String Ensemble 1',
      'String Ensemble 2',
      'SynthStrings 1',
      'SynthStrings 2',
      'Choir Aahs',
      'Voice Oohs',
      'Synth Voice',
      'Orchestra Hit',
    ],
  },
  {
    familyName: 'Brass',
    instrumentNames: [
      'Trumpet',
      'Trombone',
      'Tuba',
      'Muted Trumpet',
      'French Horn',
      'Brass Section',
      'SynthBrass 1',
      'SynthBrass 2',
    ],
  },
  {
    familyName: 'Reed',
    instrumentNames: [
      'Soprano Sax',
      'Alto Sax',
      'Tenor Sax',
      'Baritone Sax',
      'Oboe',
      'English Horn',
      'Bassoon',
      'Clarinet',
    ],
  },
  {
    familyName: 'Pipe',
    instrumentNames: [
      'Piccolo',
      'Flute',
      'Recorder',
      'Pan Flute',
      'Blown Bottle',
      'Shakuhachi',
      'Whistle',
      'Ocarina',
    ],
  },
  {
    familyName: 'Synth Lead',
    instrumentNames: [
      'Lead 1 (square)',
      'Lead 2 (sawtooth)',
      'Lead 3 (calliope)',
      'Lead 4 (chiff)',
      'Lead 5 (charang)',
      'Lead 6 (voice)',
      'Lead 7 (fifths)',
      'Lead 8 (bass + lead)',
    ],
  },
  {
    familyName: 'Synth Pad',
    instrumentNames: [
      'Pad 1 (new age)',
      'Pad 2 (warm)',
      'Pad 3 (polysynth)',
      'Pad 4 (choir)',
      'Pad 5 (bowed)',
      'Pad 6 (metallic)',
      'Pad 7 (halo)',
      'Pad 8 (sweep)',
    ],
  },
  {
    familyName: 'Synth Effects',
    instrumentNames: [
      'FX 1 (rain)',
      'FX 2 (soundtrack)',
      'FX 3 (crystal)',
      'FX 4 (atmosphere)',
      'FX 5 (brightness)',
      'FX 6 (goblins)',
      'FX 7 (echoes)',
      'FX 8 (sci-fi)',
    ],
  },
  {
    familyName: 'Ethnic',
    instrumentNames: [
      'Sitar',
      'Banjo',
      'Shamisen',
      'Koto',
      'Kalimba',
      'Bag pipe',
      'Fiddle',
      'Shanai',
    ],
  },
  {
    familyName: 'Percussive',
    instrumentNames: [
      'Tinkle Bell',
      'Agogo',
      'Steel Drums',
      'Woodblock',
      'Taiko Drum',
      'Melodic Tom',
      'Synth Drum',
      'Reverse Cymbal',
    ],
  },
  {
    familyName: 'Sound Effects',
    instrumentNames: [
      'Guitar Fret Noise',
      'Breath Noise',
      'Seashore',
      'Bird Tweet',
      'Telephone Ring',
      'Helicopter',
      'Applause',
      'Gunshot',
    ],
  },
] as const satisfies readonly {
  familyName: string;
  instrumentNames: readonly string[];
}[];

const GENERAL_MIDI_PROGRAMS: readonly GeneralMidiProgram[] =
  GENERAL_MIDI_FAMILIES.flatMap((family, familyIndex) =>
    family.instrumentNames.map((instrumentName, instrumentIndex) => ({
      programNumber: familyIndex * 8 + instrumentIndex,
      instrumentName,
      familyName: family.familyName,
    }))
  );

const GENERAL_MIDI_PROGRAMS_BY_NUMBER = new Map(
  GENERAL_MIDI_PROGRAMS.map((program) => [program.programNumber, program])
);

const GENERAL_MIDI_ROLE_METADATA: Record<
  ProceduralInstrumentRole,
  GeneralMidiInstrumentMetadata
> = {
  lead: {
    programNumber: 80,
    instrumentName: 'Lead 1 (square)',
    familyName: 'Synth Lead',
  },
  harmony: {
    programNumber: 48,
    instrumentName: 'String Ensemble 1',
    familyName: 'Ensemble',
  },
  bass: {
    programNumber: 33,
    instrumentName: 'Electric Bass (finger)',
    familyName: 'Bass',
  },
  percussion: {
    programNumber: null,
    instrumentName: 'Standard Drum Kit',
    familyName: 'Percussion Kit',
  },
};

export function listGeneralMidiPrograms(): readonly GeneralMidiProgram[] {
  return GENERAL_MIDI_PROGRAMS;
}

export function listGeneralMidiFamilyNames(): readonly string[] {
  return GENERAL_MIDI_FAMILIES.map((family) => family.familyName);
}

export function listGeneralMidiProgramsByFamily(): readonly GeneralMidiFamilyGroup[] {
  return GENERAL_MIDI_FAMILIES.map((family) => ({
    familyName: family.familyName,
    programs: GENERAL_MIDI_PROGRAMS.filter(
      (program) => program.familyName === family.familyName
    ),
  }));
}

export function resolveGeneralMidiProgram(
  programNumber: number
): GeneralMidiProgram | null {
  return GENERAL_MIDI_PROGRAMS_BY_NUMBER.get(programNumber) ?? null;
}

export function resolveGeneralMidiMetadataForRole(
  role: ProceduralInstrumentRole
): GeneralMidiInstrumentMetadata {
  return GENERAL_MIDI_ROLE_METADATA[role];
}
