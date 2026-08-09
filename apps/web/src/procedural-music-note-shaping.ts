import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';

export type ProceduralMusicPitchRole =
  'lead' | 'harmony' | 'bass' | 'percussion';

const ROLE_REGISTER_SHIFT_SEMITONES: Record<ProceduralMusicPitchRole, number> =
  {
    lead: 0,
    harmony: 0,
    bass: -12,
    percussion: 12,
  };

export function resolveProceduralNoteFrequency(options: {
  rootMidiNote: number;
  semitones: number;
  role: ProceduralMusicPitchRole;
  octaveShiftSemitones?: number;
}): number {
  const totalSemitones =
    options.semitones +
    ROLE_REGISTER_SHIFT_SEMITONES[options.role] +
    (options.octaveShiftSemitones ?? 0);

  return resolveProceduralMidiNoteFrequency(
    options.rootMidiNote + totalSemitones
  );
}

export function resolveProceduralNoteHarmonicGain(options: {
  baseHarmonicGain: number;
  harmonicGainMultiplier: number;
  moodBrightness: number;
  brightnessMultiplier: number;
}): number {
  return (
    options.baseHarmonicGain *
    options.harmonicGainMultiplier *
    options.moodBrightness *
    options.brightnessMultiplier
  );
}
