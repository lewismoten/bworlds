
import {
  DEFAULT_CONSTELLATION_COUNT,
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_SEASON_DAYLIGHT_AMPLITUDE,
  DEFAULT_YEAR_LENGTH_DAYS,
} from './time';
import { DEFAULT_CONSTELLATION_SEED, generateConstellations } from './constellation';
import { createCelestialRing } from './createCelestialRing';
import { getEclipseAdjustedDaylight, getEclipseAdjustedTwilight, getSolarEclipseState } from './eclipse';
import { formatCelestialDate } from './formatCelestialDate';
import { getCelestialEventsForDay } from './getCelestialEventsForDay';
import { createHashSeed, type HashSeed } from '../hash';
import { clamp, fract, lerp, normalizeAngle, smoothstep } from '../math';
import { getMilkyWayBeltState } from './milky-way';
import { MOON_PHASE_NAMES } from './moon';
import { getOrreryBodies } from './orrery';
import type { AuroraBandLike } from './aurora';

export function getDaylightCycleState(
  timeMs: number,
  options: {
    dayLengthMs?: number;
    offsetMs?: number;
    yearLengthDays?: number;
    constellationCount?: number;
    constellationSeed?: HashSeed;
    seasonDaylightAmplitude?: number;
    observerLatitudeDegrees?: number;
  } = {}
) {
  const dayLengthMs = options.dayLengthMs ?? DEFAULT_DAY_LENGTH_MS;
  const offsetMs = options.offsetMs ?? 0;
  const cycleTime = timeMs + offsetMs;
  const dayProgress = fract(cycleTime / dayLengthMs);
  const dayNumber = Math.floor(cycleTime / dayLengthMs);
  const yearLengthDays = Math.max(
    1,
    options.yearLengthDays ?? DEFAULT_YEAR_LENGTH_DAYS
  );
  const constellationCount = Math.max(
    1,
    Math.floor(options.constellationCount ?? DEFAULT_CONSTELLATION_COUNT)
  );
  const constellationSeed = options.constellationSeed;
  const seasonDaylightAmplitude =
    options.seasonDaylightAmplitude ?? DEFAULT_SEASON_DAYLIGHT_AMPLITUDE;
  const observerLatitudeDegrees = clamp(
    options.observerLatitudeDegrees ?? 0,
    -90,
    90
  );
  const yearProgress = fract(dayNumber / yearLengthDays);
  const seasonAngle = yearProgress * Math.PI * 2;
  const solarDeclination = Math.sin(seasonAngle) * seasonDaylightAmplitude;
  const latitudeRadians = (observerLatitudeDegrees / 180) * Math.PI;
  const hourAngle = dayProgress * Math.PI * 2 - Math.PI;
  const sunAltitudeAngle = Math.asin(
    clamp(
      Math.sin(latitudeRadians) * Math.sin(solarDeclination) +
        Math.cos(latitudeRadians) *
          Math.cos(solarDeclination) *
          Math.cos(hourAngle),
      -1,
      1
    )
  );
  const sunAngle = dayProgress * Math.PI * 2 - Math.PI / 2;
  const sunAltitude = sunAltitudeAngle / (Math.PI / 2);
  const sunriseOffset = clamp(
    Math.sin(solarDeclination) * Math.cos(latitudeRadians),
    -0.92,
    0.92
  );
  const daylightDuration = clamp(0.5 + sunriseOffset * 0.36, 0.22, 0.78);
  const sunriseProgress = 0.5 - daylightDuration * 0.5;
  const sunsetProgress = 0.5 + daylightDuration * 0.5;
  const sunriseAzimuth = sunriseOffset * 0.8;
  const sunsetAzimuth = Math.PI - sunriseOffset * 0.8;
  const daylightProgress = clamp(
    (dayProgress - sunriseProgress) / Math.max(0.0001, daylightDuration),
    0,
    1
  );
  const sunAzimuth = normalizeAngle(
    lerp(sunriseAzimuth, sunsetAzimuth, daylightProgress)
  );
  const moonOrbitProgress = fract(
    dayProgress + dayNumber / 29.5 + 0.12 + Math.sin(seasonAngle * 1.7) * 0.02
  );
  const moonMidnightOrbitProgress = fract(
    dayNumber / 29.5 + 0.12 + Math.sin(seasonAngle * 1.7) * 0.02
  );
  const moonHourAngle = moonOrbitProgress * Math.PI * 2 - Math.PI;
  const moonDeclination =
    -solarDeclination * 0.55 + Math.sin((dayNumber / 17) * Math.PI * 2) * 0.12;
  const moonAltitudeAngle = Math.asin(
    clamp(
      Math.sin(latitudeRadians) * Math.sin(moonDeclination) +
        Math.cos(latitudeRadians) *
          Math.cos(moonDeclination) *
          Math.cos(moonHourAngle),
      -1,
      1
    )
  );
  const moonAngle = moonOrbitProgress * Math.PI * 2 - Math.PI / 2;
  const moonMidnightAngle =
    moonMidnightOrbitProgress * Math.PI * 2 - Math.PI / 2;
  const moonAltitude = moonAltitudeAngle / (Math.PI / 2);
  const moonAzimuth = normalizeAngle(
    lerp(sunriseAzimuth, sunsetAzimuth, clamp(moonOrbitProgress, 0, 1)) +
      Math.PI
  );
  const solarEclipse = getSolarEclipseState({
    dayNumber,
    dayProgress,
    yearProgress,
    sunAngle,
    sunAzimuth,
    sunAltitude,
    moonAngle,
    moonIlluminationHint:
      1 - Math.min(1, Math.abs(normalizeAngle(moonAngle - sunAngle)) / Math.PI),
  });
  const rawDaylight = smoothstep(-0.16, 0.2, sunAltitude);
  const rawTwilight = smoothstep(-0.28, 0.16, sunAltitude);
  const daylight = getEclipseAdjustedDaylight(rawDaylight, solarEclipse);
  const twilight = getEclipseAdjustedTwilight(rawTwilight, solarEclipse);
  const night = clamp(
    1 - twilight + solarEclipse.daylightReduction * 0.28,
    0,
    1
  );
  const starsOpacity = smoothstep(
    0.08,
    0.82,
    Math.max(night, solarEclipse.coverage * 0.72)
  );
  const moonPhaseIndex =
    ((dayNumber % MOON_PHASE_NAMES.length) + MOON_PHASE_NAMES.length) %
    MOON_PHASE_NAMES.length;
  const moonPhaseName = MOON_PHASE_NAMES[moonPhaseIndex];
  const moonIllumination = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25][
    moonPhaseIndex
  ];
  const constellationSeedHash =
    constellationSeed === undefined
      ? DEFAULT_CONSTELLATION_SEED
      : createHashSeed(constellationSeed);
  const constellations = generateConstellations(constellationSeedHash, {
    count: constellationCount,
  });
  const activeConstellationIndex =
    ((Math.floor(yearProgress * constellationCount) % constellationCount) +
      constellationCount) %
    constellationCount;
  const activeConstellation = constellations[activeConstellationIndex];
  const seasonLengthDays = Math.max(1, yearLengthDays / constellationCount);
  const seasonDay =
    ((dayNumber % yearLengthDays) + yearLengthDays) % yearLengthDays;
  const visibleEvents = getCelestialEventsForDay(dayNumber, {
    yearLengthDays,
    dayProgress,
    observerLatitudeDegrees,
    solarDeclination,
    sunriseAzimuth,
    sunsetAzimuth,
    daylight,
    night,
    starsOpacity,
  });
  const calendar = formatCelestialDate(
    activeConstellation?.name ?? 'Unknown',
    moonPhaseName
  );
  const celestialRing = createCelestialRing(constellations);
  const milkyWay = getMilkyWayBeltState({
    dayProgress,
    yearProgress,
    observerLatitudeDegrees,
    starsOpacity,
  });
  const orreryBodies = getOrreryBodies({
    moonAngle,
    moonIllumination,
    visibleEvents,
  });

  return {
    dayLengthMs,
    cycleTime,
    dayNumber,
    dayProgress,
    yearLengthDays,
    yearProgress,
    observerLatitudeDegrees,
    seasonDay,
    seasonLengthDays,
    sunAngle,
    sunAzimuth,
    sunAltitude,
    solarDeclination,
    moonAngle,
    moonMidnightAngle,
    moonAzimuth,
    moonAltitude,
    moonMidnightOrbitProgress,
    sunriseProgress,
    sunriseAzimuth,
    sunsetProgress,
    sunsetAzimuth,
    daylightDuration,
    rawDaylight,
    rawTwilight,
    daylight,
    twilight,
    night,
    starsOpacity,
    moonPhaseIndex,
    moonPhaseName,
    moonIllumination,
    solarEclipse,
    constellations,
    activeConstellationIndex,
    activeConstellation,
    celestialRing,
    calendar,
    visibleEvents,
    milkyWay,
    auroraBands: [] as AuroraBandLike[],
    orreryBodies,
    isNight: daylight < 0.22,
  };
}
