import { DEFAULT_YEAR_LENGTH_DAYS } from './time.ts';
import { clamp, lerp, normalizeAngle, smoothstep } from '../math.ts';
import { appendPlanetEvents } from './planet.ts';
import { appendCometEvents } from './comet.ts';
import { appendMeteorShowerEvents } from './meteor-shower.ts';
import type { CelestialEventLike } from './types.ts';

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

export function getOrbitalSkyPosition({
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

  const o = {
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
  };

  appendPlanetEvents(o);
  appendMeteorShowerEvents(o);
  appendCometEvents(o);

  return events;
}
