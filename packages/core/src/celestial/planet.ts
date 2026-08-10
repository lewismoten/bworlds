import { fract } from '../math';
import { PLANET_SKY_PROFILES, type PlanetSkyProfile } from './time.ts';

export const PLANET_NAMES = ['Aurel', 'Brink', 'Cael', 'Damar', 'Vela'];

export function getPlanetaryOrbitProgress(
  elapsedDays: number,
  profile: {
    orbitLengthDays: number;
    wobblePeriodDays: number;
    wobbleAmplitude: number;
    wobblePhase: number;
  }
) {
  const baseProgress = elapsedDays / profile.orbitLengthDays;
  const wobble =
    Math.sin(
      (elapsedDays / profile.wobblePeriodDays) * Math.PI * 2 +
        profile.wobblePhase
    ) * profile.wobbleAmplitude;
  const retrogradeBias =
    Math.sin(
      (elapsedDays / (profile.orbitLengthDays * 1.4)) * Math.PI * 2 +
        profile.wobblePhase
    ) *
    profile.wobbleAmplitude *
    0.46;
  return fract(baseProgress + wobble + retrogradeBias);
}

export function getPlanetSkyProfile(
  name: string,
  fallbackIndex = 0
): PlanetSkyProfile {
  const index = PLANET_NAMES.indexOf(name);
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return PLANET_SKY_PROFILES[resolvedIndex % PLANET_SKY_PROFILES.length];
}

export function getPlanetSkyProfileIndex(
  name: string,
  fallbackIndex = 0
): number {
  const index = PLANET_NAMES.indexOf(name);
  return index >= 0 ? index : fallbackIndex % PLANET_SKY_PROFILES.length;
}
