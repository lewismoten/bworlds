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
  rootHz: number;
  semitones: number;
  role: ProceduralMusicPitchRole;
  octaveShiftSemitones?: number;
}): number {
  const totalSemitones =
    options.semitones +
    ROLE_REGISTER_SHIFT_SEMITONES[options.role] +
    (options.octaveShiftSemitones ?? 0);

  return options.rootHz * Math.pow(2, totalSemitones / 12);
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
