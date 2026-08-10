import { fract } from '../math';
export const COMET_NAMES = ['White Lantern', 'Pilgrim Tail'];

export function getCometOrbitProgress(
  elapsedDays: number,
  cycleLengthDays: number,
  phaseOffset: number,
  speedExponent = 0.7
) {
  const localProgress = fract(elapsedDays / cycleLengthDays);
  const curvedProgress = Math.pow(localProgress, speedExponent);
  return fract(curvedProgress + phaseOffset);
}

const COMET_ORRERY_PROFILES = [
  {
    orbitTilt: 0.46,
    orbitEccentricity: 0.42,
    orbitRotation: 0.88,
    speedExponent: 0.72,
  },
  {
    orbitTilt: -0.38,
    orbitEccentricity: 0.56,
    orbitRotation: 1.74,
    speedExponent: 0.58,
  },
] as const;

export type CometOrreryProfile = (typeof COMET_ORRERY_PROFILES)[number];

export function getCometOrreryProfile(
  name: string,
  fallbackIndex = 0
): CometOrreryProfile {
  const index = COMET_NAMES.indexOf(name);
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return COMET_ORRERY_PROFILES[resolvedIndex % COMET_ORRERY_PROFILES.length];
}

export function getCometOrreryProfileIndex(
  name: string,
  fallbackIndex = 0
): number {
  const index = COMET_NAMES.indexOf(name);
  return index >= 0 ? index : fallbackIndex % COMET_ORRERY_PROFILES.length;
}
