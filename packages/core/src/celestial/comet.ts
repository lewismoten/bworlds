import { fract } from '../math';
import type { CelestialEventLike } from './types';
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

export function appendCometEvents(options: {
  events: CelestialEventLike[];
  dayNumber: number;
  dayProgress: number;
  yearLengthDays: number;
  observerLatitudeDegrees: number;
  solarDeclination: number;
  sunriseAzimuth: number;
  sunsetAzimuth: number;
  daylight: number;
  night: number;
  starsOpacity: number;
  getOrbitalSkyPosition: (options: {
    orbitProgress: number;
    observerLatitudeDegrees?: number;
    declination?: number;
    sunriseAzimuth?: number;
    sunsetAzimuth?: number;
    azimuthShift?: number;
  }) => {
    altitude: number;
    azimuth: number;
  };
  getCelestialEventVisibility: (options: {
    type: CelestialEventLike['type'];
    altitude: number;
    intensity: number;
    daylight: number;
    night: number;
    starsOpacity: number;
  }) => number;
}): void {
  const {
    events,
    dayNumber,
    dayProgress,
    yearLengthDays,
    observerLatitudeDegrees,
    solarDeclination,
    sunriseAzimuth,
    sunsetAzimuth,
    daylight,
    night,
    starsOpacity,
    getOrbitalSkyPosition,
    getCelestialEventVisibility,
  } = options;
  
  COMET_NAMES.forEach((name, index) => {
    const cycleLength = 20 + index * 12;
    const cycleDay = ((dayNumber % cycleLength) + cycleLength) % cycleLength;
    if (cycleDay <= 3) {
      const orbitProfile = getCometOrreryProfile(name, index);
      const progress = getCometOrbitProgress(
        cycleDay + dayProgress,
        cycleLength,
        index * 0.18,
        orbitProfile.speedExponent
      );
      const intensity = 1 - cycleDay / 3;
      const orbitState = getOrbitalSkyPosition({
        orbitProgress: progress,
        observerLatitudeDegrees,
        declination:
          solarDeclination * -0.5 +
          Math.cos((dayNumber / cycleLength) * Math.PI * 2) * 0.2,
        sunriseAzimuth,
        sunsetAzimuth,
        azimuthShift: 1.1 - index * 0.38,
      });
      events.push({
        type: 'comet',
        name,
        progress,
        intensity,
        visibility: getCelestialEventVisibility({
          type: 'comet',
          altitude: orbitState.altitude,
          intensity,
          daylight,
          night,
          starsOpacity,
        }),
        azimuth: orbitState.azimuth,
        altitude: orbitState.altitude,
        color: '#dff5ff',
        size: 0.42,
        trailLength: 2.2 + index * 0.35,
      });
    }
  }
);
 }