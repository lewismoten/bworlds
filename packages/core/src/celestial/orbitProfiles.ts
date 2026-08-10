import { PLANET_SKY_PROFILES, type PlanetSkyProfile } from './time.ts';

export const PLANET_NAMES = ['Aurel', 'Brink', 'Cael', 'Damar', 'Vela'];
export const COMET_NAMES = ['White Lantern', 'Pilgrim Tail'];

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
