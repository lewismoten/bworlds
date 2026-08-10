import type { ProceduralInstrumentRole } from './procedural-music.ts';

export type GeneralMidiInstrumentMetadata = Readonly<{
  programNumber: number | null;
  instrumentName: string;
  familyName: string;
}>;

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

export function resolveGeneralMidiMetadataForRole(
  role: ProceduralInstrumentRole
): GeneralMidiInstrumentMetadata {
  return GENERAL_MIDI_ROLE_METADATA[role];
}
