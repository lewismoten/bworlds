import { clamp, fract } from '../math.ts';
import type { CelestialEventLike } from './types.ts';

const METEOR_SHOWER_NAMES = ['Silver Wake', 'Ember Rain', 'Northfall'] as const;

export function appendMeteorShowerEvents(options: {
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

  METEOR_SHOWER_NAMES.forEach((name, index) => {
    const seasonStart = Math.floor(
      (yearLengthDays / METEOR_SHOWER_NAMES.length) * index
    );
    const peakOffset =
      (((dayNumber - seasonStart) % yearLengthDays) + yearLengthDays) %
      yearLengthDays;
    if (peakOffset > 4 && peakOffset < yearLengthDays - 4) {
      return;
    }

    const distance = Math.min(peakOffset, yearLengthDays - peakOffset);
    const progress = fract(dayProgress + index * 0.21);
    const intensity = clamp(1 - distance / 4, 0, 1);
    const orbitState = getOrbitalSkyPosition({
      orbitProgress: progress,
      observerLatitudeDegrees,
      declination:
        solarDeclination * -0.35 +
        Math.sin((dayNumber / (8 + index * 3)) * Math.PI * 2) * 0.12,
      sunriseAzimuth,
      sunsetAzimuth,
      azimuthShift: -0.9 + index * 0.5,
    });

    events.push({
      type: 'meteor-shower',
      name,
      progress,
      intensity,
      visibility: getCelestialEventVisibility({
        type: 'meteor-shower',
        altitude: orbitState.altitude,
        intensity,
        daylight,
        night,
        starsOpacity,
      }),
      azimuth: orbitState.azimuth,
      altitude: orbitState.altitude,
      color: '#eef6ff',
      size: 0.34,
      trailLength: 1.6 + index * 0.2,
    });
  });
}
