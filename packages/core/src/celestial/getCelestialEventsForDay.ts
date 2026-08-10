import { DEFAULT_YEAR_LENGTH_DAYS } from './time.ts';
import { hash2DWithSeed, registerHashLabel } from '../hash.ts';
import { clamp, fract, lerp, normalizeAngle, smoothstep } from '../math.ts';
import { PLANET_SKY_PROFILES, type PlanetSkyProfile } from './time.ts';
import {
  COMET_NAMES,
  PLANET_NAMES,
  getCometOrreryProfile,
  getPlanetSkyProfile,
} from './orbitProfiles.ts';
import { getPlanetaryOrbitProgress } from './planet.ts';
import { getCometOrbitProgress } from './comet.ts';
const METEOR_SHOWER_NAMES = ['Silver Wake', 'Ember Rain', 'Northfall'];

const PLANET_INTENSITY_SEED = registerHashLabel('planet-intensity');

export interface CelestialEventLike {
  type: 'planet' | 'meteor-shower' | 'comet';
  name: string;
  progress: number;
  intensity: number;
  visibility: number;
  azimuth: number;
  altitude: number;
  color: string;
  size: number;
  trailLength: number;
}

function getCelestialEventVisibility({
  type,
  altitude,
  intensity,
  daylight,
  night,
  starsOpacity,
}: {
  type: CelestialEventLike['type'];
  altitude: number;
  intensity: number;
  daylight: number;
  night: number;
  starsOpacity: number;
}) {
  const horizonVisibility = smoothstep(-0.12, 0.18, altitude);
  const twilightVisibility = smoothstep(0.12, 0.82, starsOpacity);
  const daySuppression = 1 - smoothstep(0.18, 0.92, daylight);

  if (type === 'meteor-shower') {
    return clamp(
      horizonVisibility *
        twilightVisibility *
        night *
        (0.55 + intensity * 0.45),
      0,
      1
    );
  }

  if (type === 'comet') {
    return clamp(
      horizonVisibility *
        (0.18 + twilightVisibility * 0.82) *
        (0.4 + intensity * 0.6) *
        (0.25 + daySuppression * 0.75),
      0,
      1
    );
  }

  return clamp(
    horizonVisibility *
      (0.22 + intensity * 0.22) *
      Math.max(0.18, 1 - daylight * 0.72) *
      (0.2 + twilightVisibility * 0.8),
    0,
    1
  );
}

function getOrbitalSkyPosition({
  orbitProgress,
  observerLatitudeDegrees = 0,
  declination = 0,
  sunriseAzimuth = 0,
  sunsetAzimuth = Math.PI,
  azimuthShift = 0,
}: {
  orbitProgress: number;
  observerLatitudeDegrees?: number;
  declination?: number;
  sunriseAzimuth?: number;
  sunsetAzimuth?: number;
  azimuthShift?: number;
}) {
  const latitudeRadians = (observerLatitudeDegrees / 180) * Math.PI;
  const hourAngle = orbitProgress * Math.PI * 2 - Math.PI;
  const altitude = Math.asin(
    clamp(
      Math.sin(latitudeRadians) * Math.sin(declination) +
        Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
      -1,
      1
    )
  );
  const azimuthProgress = clamp((Math.sin(hourAngle) + 1) * 0.5, 0, 1);
  return {
    altitude: altitude / (Math.PI / 2),
    azimuth: normalizeAngle(
      lerp(sunriseAzimuth, sunsetAzimuth, azimuthProgress) + azimuthShift
    ),
  };
}

export function getCelestialEventsForDay(
  dayNumber: number,
  options: {
    yearLengthDays?: number;
    dayProgress?: number;
    observerLatitudeDegrees?: number;
    solarDeclination?: number;
    sunriseAzimuth?: number;
    sunsetAzimuth?: number;
    daylight?: number;
    night?: number;
    starsOpacity?: number;
  } = {}
): CelestialEventLike[] {
  const yearLengthDays = options.yearLengthDays ?? DEFAULT_YEAR_LENGTH_DAYS;
  const dayProgress = options.dayProgress ?? 0;
  const observerLatitudeDegrees = options.observerLatitudeDegrees ?? 0;
  const solarDeclination = options.solarDeclination ?? 0;
  const sunriseAzimuth = options.sunriseAzimuth ?? 0;
  const sunsetAzimuth = options.sunsetAzimuth ?? Math.PI;
  const daylight = clamp(options.daylight ?? 0, 0, 1);
  const night = clamp(options.night ?? 1, 0, 1);
  const starsOpacity = clamp(options.starsOpacity ?? night, 0, 1);
  const events: CelestialEventLike[] = [];

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

  METEOR_SHOWER_NAMES.forEach((name, index) => {
    const seasonStart = Math.floor(
      (yearLengthDays / METEOR_SHOWER_NAMES.length) * index
    );
    const peakOffset =
      (((dayNumber - seasonStart) % yearLengthDays) + yearLengthDays) %
      yearLengthDays;
    if (peakOffset <= 4 || peakOffset >= yearLengthDays - 4) {
      const distance = Math.min(peakOffset, yearLengthDays - peakOffset);
      const progress = fract(dayProgress + index * 0.21);
      const intensity = 1 - distance / 4;
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
    }
  });

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
  });

  return events;
}
