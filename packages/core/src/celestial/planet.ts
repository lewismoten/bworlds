import { hash2DWithSeed, registerHashLabel } from '../hash.ts';
import { fract } from '../math';
import type { CelestialEventLike } from './types.ts';
import { PLANET_SKY_PROFILES, type PlanetSkyProfile } from './time.ts';

export const PLANET_NAMES = ['Aurel', 'Brink', 'Cael', 'Damar', 'Vela'];
const PLANET_INTENSITY_SEED = registerHashLabel('planet-intensity');

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

export function appendPlanetEvents(options: {
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

  PLANET_NAMES.forEach((name, index) => {
    const profile = getPlanetSkyProfile(name, index);
    const orbitLength = profile.orbitLengthDays;
    const orbitProgress = getPlanetaryOrbitProgress(
      dayNumber + dayProgress,
      profile
    );
    const intensity =
      profile.intensityBase +
      hash2DWithSeed(PLANET_INTENSITY_SEED, index, dayNumber % orbitLength) *
        profile.intensitySwing;
    const orbitState = getOrbitalSkyPosition({
      orbitProgress,
      observerLatitudeDegrees,
      declination:
        solarDeclination * profile.declinationFactor +
        Math.sin((dayNumber / profile.declinationWaveDays) * Math.PI * 2) *
          profile.declinationWaveAmplitude,
      sunriseAzimuth,
      sunsetAzimuth,
      azimuthShift: profile.azimuthShift,
    });
    events.push({
      type: 'planet',
      name,
      progress: orbitProgress,
      intensity,
      visibility: getCelestialEventVisibility({
        type: 'planet',
        altitude: orbitState.altitude,
        intensity,
        daylight,
        night,
        starsOpacity,
      }),
      azimuth: orbitState.azimuth,
      altitude: orbitState.altitude,
      color: profile.color,
      size: profile.size,
      trailLength: 0,
    });
  });
}
