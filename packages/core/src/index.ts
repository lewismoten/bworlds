export const CHUNK_SIZE = 32;
export const EARTH_CIRCUMFERENCE_METERS = 40075017;
export const TILE_METERS = 250;
export const WORLD_TILES_WIDE = Math.floor(
  EARTH_CIRCUMFERENCE_METERS / TILE_METERS
);
export const HALF_WORLD_TILES = WORLD_TILES_WIDE / 2;
export const DEFAULT_DAY_LENGTH_MS = 240000;
export const DEFAULT_YEAR_LENGTH_DAYS = 64;
export const DEFAULT_CONSTELLATION_COUNT = 8;
export const DEFAULT_SEASON_DAYLIGHT_AMPLITUDE = 0.41;
export const MOON_PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
] as const;
const CONSTELLATION_PREFIXES = [
  'Astral',
  'Aurora',
  'Celest',
  'Cinder',
  'Comet',
  'Crown',
  'Dawn',
  'Ember',
  'Ether',
  'Lumen',
  'Moon',
  'Nebula',
  'Nova',
  'Solstice',
  'Star',
  'Zephyr',
];
const CONSTELLATION_SUFFIXES = [
  'Arch',
  'Beacon',
  'Crown',
  'Drift',
  'Gate',
  'Halo',
  'Harp',
  'Lantern',
  'Mantle',
  'Omen',
  'Pillar',
  'Sail',
  'Spire',
  'Thread',
  'Veil',
  'Wake',
];
const CONSTELLATION_FIGURES = [
  'The Stag',
  'The Cedar',
  'The Giant',
  'The Heron',
  'The Lantern',
  'The Mariner',
  'The Orchard',
  'The Serpent',
  "Andre's Arm",
  "Mira's Crown",
  'The Open Hand',
  'The Wolf',
];
const PLANET_NAMES = ['Aurel', 'Brink', 'Cael', 'Damar'];
const METEOR_SHOWER_NAMES = ['Silver Wake', 'Ember Rain', 'Northfall'];
const COMET_NAMES = ['White Lantern', 'Pilgrim Tail'];

export interface ConstellationStarLike {
  id: string;
  x: number;
  y: number;
  brightness: number;
}

export interface ConstellationLike {
  id: string;
  name: string;
  stars: ConstellationStarLike[];
  connections: Array<[number, number]>;
  daylightBias: number;
  symbolRotation: number;
  ringJitter: number;
}

export interface CelestialCalendarLike {
  month: string;
  week: string;
  label: string;
}

export interface CelestialEventLike {
  type: 'planet' | 'meteor-shower' | 'comet';
  name: string;
  progress: number;
  intensity: number;
  azimuth: number;
  altitude: number;
  color: string;
  size: number;
  trailLength: number;
}

export interface MilkyWayBeltLike {
  azimuthOffset: number;
  inclination: number;
  width: number;
  opacity: number;
}

export interface OrreryBodyLike {
  id: string;
  type: 'sun' | 'moon' | 'planet' | 'comet';
  orbitRadius: number;
  angle: number;
  orbitTilt: number;
  orbitHeight: number;
  color: string;
  size: number;
  trailLength: number;
}

export interface CelestialRingEntryLike {
  constellationIndex: number;
  name: string;
  sunriseAzimuth: number;
  visualAzimuth: number;
}

export function fract(value) {
  return value - Math.floor(value);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function getDaylightCycleState(
  timeMs,
  options: {
    dayLengthMs?: number;
    offsetMs?: number;
    yearLengthDays?: number;
    constellationCount?: number;
    constellationSeed?: string;
    seasonDaylightAmplitude?: number;
    observerLatitudeDegrees?: number;
  } = {}
) {
  const dayLengthMs = options.dayLengthMs ?? DEFAULT_DAY_LENGTH_MS;
  const offsetMs = options.offsetMs ?? 0;
  const cycleTime = timeMs + offsetMs;
  const dayProgress = fract(cycleTime / dayLengthMs);
  const dayNumber = Math.floor(cycleTime / dayLengthMs);
  const yearLengthDays = Math.max(1, options.yearLengthDays ?? DEFAULT_YEAR_LENGTH_DAYS);
  const constellationCount = Math.max(
    1,
    Math.floor(options.constellationCount ?? DEFAULT_CONSTELLATION_COUNT)
  );
  const constellationSeed = options.constellationSeed ?? 'bworlds-celestial';
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
        Math.cos(latitudeRadians) * Math.cos(moonDeclination) * Math.cos(moonHourAngle),
      -1,
      1
    )
  );
  const moonAngle = moonOrbitProgress * Math.PI * 2 - Math.PI / 2;
  const moonMidnightAngle = moonMidnightOrbitProgress * Math.PI * 2 - Math.PI / 2;
  const moonAltitude = moonAltitudeAngle / (Math.PI / 2);
  const moonAzimuth = normalizeAngle(
    lerp(sunriseAzimuth, sunsetAzimuth, clamp(moonOrbitProgress, 0, 1)) + Math.PI
  );
  const daylight = smoothstep(-0.16, 0.2, sunAltitude);
  const twilight = smoothstep(-0.28, 0.16, sunAltitude);
  const night = 1 - twilight;
  const starsOpacity = smoothstep(0.08, 0.82, night);
  const moonPhaseIndex =
    ((dayNumber % MOON_PHASE_NAMES.length) + MOON_PHASE_NAMES.length) %
    MOON_PHASE_NAMES.length;
  const moonPhaseName = MOON_PHASE_NAMES[moonPhaseIndex];
  const moonIllumination = [
    0,
    0.25,
    0.5,
    0.75,
    1,
    0.75,
    0.5,
    0.25,
  ][moonPhaseIndex];
  const constellations = generateConstellations(constellationSeed, {
    count: constellationCount,
  });
  const activeConstellationIndex =
    ((Math.floor(yearProgress * constellationCount) % constellationCount) +
      constellationCount) %
    constellationCount;
  const activeConstellation = constellations[activeConstellationIndex];
  const seasonLengthDays = Math.max(1, yearLengthDays / constellationCount);
  const seasonDay = ((dayNumber % yearLengthDays) + yearLengthDays) % yearLengthDays;
  const visibleEvents = getCelestialEventsForDay(dayNumber, {
    yearLengthDays,
    dayProgress,
    observerLatitudeDegrees,
    solarDeclination,
    sunriseAzimuth,
    sunsetAzimuth,
  });
  const calendar = formatCelestialDate(activeConstellation?.name ?? 'Unknown', moonPhaseName);
  const celestialRing = createCelestialRing(constellations);
  const milkyWay = getMilkyWayBeltState({
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
    daylight,
    twilight,
    night,
    starsOpacity,
    moonPhaseIndex,
    moonPhaseName,
    moonIllumination,
    constellations,
    activeConstellationIndex,
    activeConstellation,
    celestialRing,
    calendar,
    visibleEvents,
    milkyWay,
    orreryBodies,
    isNight: daylight < 0.22,
  };
}

export function getWorldTimeMs(
  realTimeMs,
  options: {
    timeOffsetMs?: number;
  } = {}
) {
  return realTimeMs + (options.timeOffsetMs ?? 0);
}

export function getWorldDaylightCycle(
  realTimeMs,
  options: {
    timeOffsetMs?: number;
    cycle?: {
      dayLengthMs?: number;
      offsetMs?: number;
    };
  } = {}
) {
  const worldTimeMs = getWorldTimeMs(realTimeMs, {
    timeOffsetMs: options.timeOffsetMs,
  });
  return {
    worldTimeMs,
    cycle: getDaylightCycleState(worldTimeMs, options.cycle ?? {}),
  };
}

export function advanceWorldTimeOffsetByHours(
  currentOffsetMs,
  hours,
  options: {
    dayLengthMs?: number;
  } = {}
) {
  const dayLengthMs = options.dayLengthMs ?? DEFAULT_DAY_LENGTH_MS;
  return currentOffsetMs + (hours / 24) * dayLengthMs;
}

export function alignWorldTimeOffsetToDayProgress(
  realTimeMs,
  currentOffsetMs,
  targetDayProgress,
  options: {
    dayLengthMs?: number;
    offsetMs?: number;
  } = {}
) {
  const { cycle } = getWorldDaylightCycle(realTimeMs, {
    timeOffsetMs: currentOffsetMs,
    cycle: options,
  });
  let deltaMs = (targetDayProgress - cycle.dayProgress) * cycle.dayLengthMs;
  if (deltaMs < 0) {
    deltaMs += cycle.dayLengthMs;
  }
  return currentOffsetMs + deltaMs;
}

export function advanceWorldTimeOffsetBySeasons(
  currentOffsetMs,
  seasons,
  options: {
    dayLengthMs?: number;
    yearLengthDays?: number;
    constellationCount?: number;
  } = {}
) {
  const dayLengthMs = options.dayLengthMs ?? DEFAULT_DAY_LENGTH_MS;
  const yearLengthDays = options.yearLengthDays ?? DEFAULT_YEAR_LENGTH_DAYS;
  const constellationCount = Math.max(
    1,
    Math.floor(options.constellationCount ?? DEFAULT_CONSTELLATION_COUNT)
  );
  const seasonLengthDays = yearLengthDays / constellationCount;
  return currentOffsetMs + seasons * seasonLengthDays * dayLengthMs;
}

export function generateConstellations(
  seed,
  options: {
    count?: number;
  } = {}
): ConstellationLike[] {
  const count = Math.max(1, Math.floor(options.count ?? DEFAULT_CONSTELLATION_COUNT));
  const usedNames = new Set<string>();
  const prefixCounts = new Map<string, number>();
  const suffixCounts = new Map<string, number>();
  const figureCounts = new Map<string, number>();

  return Array.from({ length: count }, (_, index) => {
    const starCount = 5 + Math.floor(hash2D(`${seed}:stars`, index, count) * 4);
    const archetype = getConstellationArchetype(seed, index);
    const stars = Array.from({ length: starCount }, (_, starIndex) => {
      const blueprint = archetype.points[starIndex % archetype.points.length];
      const radial =
        blueprint.radial * (0.82 + hash2D(`${seed}:r`, index, starIndex) * 0.36);
      const angle =
        blueprint.angle +
        hash2D(`${seed}:theta`, index, starIndex) * 0.72 +
        archetype.rotation;
      return {
        id: `${index}:${starIndex}`,
        x: 0.5 + Math.cos(angle) * radial,
        y:
          0.5 +
          Math.sin(angle) *
            radial *
            archetype.verticalScale *
            (0.8 + hash2D(`${seed}:stretch`, index, starIndex) * 0.46),
        brightness: 0.45 + hash2D(`${seed}:b`, index, starIndex) * 0.55,
      };
    }).sort((left, right) => left.x - right.x);

    const connections = buildConstellationConnections(stars.length, archetype.connectionStyle);

    let name = createConstellationName(
      seed,
      index,
      prefixCounts,
      suffixCounts,
      figureCounts
    );
    while (usedNames.has(name)) {
      name = `${name} ${index + 1}`;
    }
    usedNames.add(name);

    return {
      id: `constellation-${index + 1}`,
      name,
      stars,
      connections,
      daylightBias: -0.12 + hash2D(`${seed}:bias`, index, count) * 0.24,
      symbolRotation: hash2D(`${seed}:symbol-rotation`, index, count) * Math.PI * 2,
      ringJitter: (hash2D(`${seed}:ring-jitter`, index, count) * 2 - 1) * 0.28,
    };
  });
}

function getConstellationArchetype(seed, index) {
  const baseArchetypes = [
    {
      points: [
        { angle: -1.4, radial: 0.3 },
        { angle: -0.7, radial: 0.16 },
        { angle: -0.2, radial: 0.24 },
        { angle: 0.35, radial: 0.15 },
        { angle: 1.1, radial: 0.3 },
      ],
      verticalScale: 1.05,
      connectionStyle: 'arc',
    },
    {
      points: [
        { angle: -1.5, radial: 0.26 },
        { angle: -0.9, radial: 0.12 },
        { angle: -0.15, radial: 0.28 },
        { angle: 0.6, radial: 0.14 },
        { angle: 1.35, radial: 0.27 },
      ],
      verticalScale: 0.68,
      connectionStyle: 'zigzag',
    },
    {
      points: [
        { angle: -1.35, radial: 0.18 },
        { angle: -0.8, radial: 0.28 },
        { angle: -0.15, radial: 0.1 },
        { angle: 0.55, radial: 0.27 },
        { angle: 1.25, radial: 0.18 },
      ],
      verticalScale: 1.22,
      connectionStyle: 'fork',
    },
    {
      points: [
        { angle: -1.2, radial: 0.22 },
        { angle: -0.55, radial: 0.3 },
        { angle: 0.1, radial: 0.18 },
        { angle: 0.72, radial: 0.31 },
        { angle: 1.4, radial: 0.2 },
      ],
      verticalScale: 0.92,
      connectionStyle: 'kite',
    },
  ] as const;

  const base =
    baseArchetypes[
      Math.floor(hash2D(`${seed}:constellation-archetype`, index, 0) * baseArchetypes.length)
    ];
  return {
    ...base,
    rotation: hash2D(`${seed}:constellation-rotation`, index, 1) * Math.PI * 2,
  };
}

function buildConstellationConnections(
  starCount: number,
  style: 'arc' | 'zigzag' | 'fork' | 'kite'
) {
  const chain = Array.from({ length: Math.max(0, starCount - 1) }, (_, starIndex) => [
    starIndex,
    starIndex + 1,
  ] as [number, number]);
  if (starCount < 4) {
    return chain;
  }

  if (style === 'arc') {
    return [...chain, [0, Math.floor(starCount / 2)] as [number, number]];
  }
  if (style === 'zigzag') {
    return [...chain, [1, starCount - 1] as [number, number]];
  }
  if (style === 'fork') {
    return [...chain, [0, Math.floor(starCount / 2)] as [number, number], [2, starCount - 1] as [number, number]];
  }
  return [...chain, [0, starCount - 2] as [number, number], [1, starCount - 1] as [number, number]];
}

export function createConstellationName(
  seed,
  index,
  prefixCounts = new Map<string, number>(),
  suffixCounts = new Map<string, number>(),
  figureCounts = new Map<string, number>()
) {
  const useFigure = hash2D(`${seed}:constellation-form`, index, 0) < 0.28;
  if (useFigure) {
    const figure = pickLimitedNamePart(
      CONSTELLATION_FIGURES,
      figureCounts,
      2,
      hash2D(`${seed}:constellation-figure`, index, 0)
    );
    return figure;
  }

  const prefix = pickLimitedNamePart(
    CONSTELLATION_PREFIXES,
    prefixCounts,
    2,
    hash2D(`${seed}:constellation-prefix`, index, 0)
  );
  const suffix = pickLimitedNamePart(
    CONSTELLATION_SUFFIXES,
    suffixCounts,
    2,
    hash2D(`${seed}:constellation-suffix`, 0, index)
  );
  return `${prefix} ${suffix}`;
}

function pickLimitedNamePart(parts, counts, maxCount, seedValue) {
  const startIndex = Math.floor(seedValue * parts.length) % parts.length;
  for (let offset = 0; offset < parts.length; offset += 1) {
    const candidate = parts[(startIndex + offset) % parts.length];
    const currentCount = counts.get(candidate) ?? 0;
    if (currentCount < maxCount) {
      counts.set(candidate, currentCount + 1);
      return candidate;
    }
  }

  const fallback = parts[startIndex];
  counts.set(fallback, (counts.get(fallback) ?? 0) + 1);
  return fallback;
}

export function createCelestialRing(
  constellations: ConstellationLike[]
): CelestialRingEntryLike[] {
  const count = Math.max(1, constellations.length);
  return constellations.map((constellation, index) => ({
    constellationIndex: index,
    name: constellation.name,
    sunriseAzimuth: normalizeAngle((index / count) * Math.PI * 2),
    visualAzimuth: normalizeAngle(
      (index / count) * Math.PI * 2 + constellation.ringJitter
    ),
  }));
}

export function formatCelestialDate(constellationName, moonPhaseName): CelestialCalendarLike {
  return {
    month: constellationName,
    week: moonPhaseName,
    label: `${constellationName} / ${moonPhaseName}`,
  };
}

export function getCelestialEventsForDay(
  dayNumber,
  options: {
    yearLengthDays?: number;
    dayProgress?: number;
    observerLatitudeDegrees?: number;
    solarDeclination?: number;
    sunriseAzimuth?: number;
    sunsetAzimuth?: number;
  } = {}
): CelestialEventLike[] {
  const yearLengthDays = options.yearLengthDays ?? DEFAULT_YEAR_LENGTH_DAYS;
  const dayProgress = options.dayProgress ?? 0;
  const observerLatitudeDegrees = options.observerLatitudeDegrees ?? 0;
  const solarDeclination = options.solarDeclination ?? 0;
  const sunriseAzimuth = options.sunriseAzimuth ?? 0;
  const sunsetAzimuth = options.sunsetAzimuth ?? Math.PI;
  const events: CelestialEventLike[] = [];

  PLANET_NAMES.forEach((name, index) => {
    const orbitLength = 9 + index * 4;
    const orbitProgress = fract(dayNumber / orbitLength + dayProgress / orbitLength);
    const orbitState = getOrbitState({
      orbitProgress,
      observerLatitudeDegrees,
      declination:
        solarDeclination * (0.22 + index * 0.08) +
        Math.sin((dayNumber / (orbitLength + 3)) * Math.PI * 2) * (0.08 + index * 0.02),
      sunriseAzimuth,
      sunsetAzimuth,
      azimuthShift: index * 0.26,
    });
    events.push({
      type: 'planet',
      name,
      progress: orbitProgress,
      intensity: 0.35 + hash2D('planet-intensity', index, dayNumber % orbitLength) * 0.45,
      azimuth: orbitState.azimuth,
      altitude: orbitState.altitude,
      color: ['#ffd7a6', '#f7b8d7', '#b8efff', '#ffe08c'][index % 4],
      size: 0.52 + index * 0.08,
      trailLength: 0,
    });
  });

  METEOR_SHOWER_NAMES.forEach((name, index) => {
    const seasonStart = Math.floor((yearLengthDays / METEOR_SHOWER_NAMES.length) * index);
    const peakOffset = ((dayNumber - seasonStart) % yearLengthDays + yearLengthDays) % yearLengthDays;
    if (peakOffset <= 4 || peakOffset >= yearLengthDays - 4) {
      const distance = Math.min(peakOffset, yearLengthDays - peakOffset);
      const progress = fract(dayProgress + index * 0.21);
      const orbitState = getOrbitState({
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
        intensity: 1 - distance / 4,
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
      const progress = fract((cycleDay + dayProgress) / cycleLength + index * 0.18);
      const orbitState = getOrbitState({
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
        intensity: 1 - cycleDay / 3,
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

export function getMilkyWayBeltState({
  yearProgress,
  observerLatitudeDegrees,
  starsOpacity,
}: {
  yearProgress: number;
  observerLatitudeDegrees?: number;
  starsOpacity?: number;
}): MilkyWayBeltLike {
  const latitudeRadians = ((observerLatitudeDegrees ?? 0) / 180) * Math.PI;
  return {
    azimuthOffset:
      yearProgress * Math.PI * 2 * 0.16 +
      Math.sin(latitudeRadians) * 0.42,
    inclination:
      1.04 +
      Math.cos(yearProgress * Math.PI * 2) * 0.12 +
      Math.sin(latitudeRadians) * 0.18,
    width: 0.22 + Math.abs(Math.sin(latitudeRadians)) * 0.06,
    opacity: 0.03 + (starsOpacity ?? 0) * 0.16,
  };
}

export function getOrreryBodies({
  moonAngle,
  moonIllumination,
  visibleEvents,
}: {
  moonAngle: number;
  moonIllumination: number;
  visibleEvents: CelestialEventLike[];
}): OrreryBodyLike[] {
  const bodies: OrreryBodyLike[] = [
    {
      id: 'sun',
      type: 'sun',
      orbitRadius: 0,
      angle: 0,
      orbitTilt: 0,
      orbitHeight: 0,
      color: '#ffd06e',
      size: 0.92,
      trailLength: 0,
    },
    {
      id: 'moon',
      type: 'moon',
      orbitRadius: 2.6,
      angle: normalizeTurns((moonAngle + Math.PI / 2) / (Math.PI * 2)),
      orbitTilt: 0.34,
      orbitHeight: -0.12,
      color: '#dce8ff',
      size: 0.42 + moonIllumination * 0.16,
      trailLength: 0,
    },
  ];

  let orbitIndex = 0;
  visibleEvents.forEach((event) => {
    if (event.type === 'meteor-shower') {
      return;
    }

    orbitIndex += 1;
    bodies.push({
      id: `${event.type}:${event.name}`,
      type: event.type === 'planet' ? 'planet' : 'comet',
      orbitRadius: 3.6 + orbitIndex * 0.75,
      angle: normalizeTurns(event.progress),
      orbitTilt:
        (event.type === 'planet' ? 0.18 : 0.28) +
        (orbitIndex % 2 === 0 ? 1 : -1) * 0.08,
      orbitHeight: event.altitude * 0.35,
      color: event.color,
      size: Math.max(
        0.24,
        event.size * (event.type === 'planet' ? 0.5 : 0.42)
      ),
      trailLength: event.trailLength,
    });
  });

  return bodies;
}

function getOrbitState({
  orbitProgress,
  observerLatitudeDegrees,
  declination,
  sunriseAzimuth,
  sunsetAzimuth,
  azimuthShift = 0,
}: {
  orbitProgress: number;
  observerLatitudeDegrees: number;
  declination: number;
  sunriseAzimuth: number;
  sunsetAzimuth: number;
  azimuthShift?: number;
}) {
  const latitudeRadians = (observerLatitudeDegrees / 180) * Math.PI;
  const hourAngle = orbitProgress * Math.PI * 2 - Math.PI;
  const altitudeAngle = Math.asin(
    clamp(
      Math.sin(latitudeRadians) * Math.sin(declination) +
        Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
      -1,
      1
    )
  );
  return {
    altitude: altitudeAngle / (Math.PI / 2),
    azimuth: normalizeAngle(
      lerp(sunriseAzimuth, sunsetAzimuth, clamp(orbitProgress, 0, 1)) +
        Math.PI * orbitProgress +
        azimuthShift
    ),
  };
}

export function hash2D(seed, x, y) {
  let hash = 2166136261;
  const input = `${seed}:${x}:${y}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function normalizeTurns(value: number) {
  return ((value % 1) + 1) % 1;
}

export function valueNoise2D(seed, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(0, 1, fract(x));
  const ty = smoothstep(0, 1, fract(y));
  const v00 = hash2D(seed, x0, y0);
  const v10 = hash2D(seed, x1, y0);
  const v01 = hash2D(seed, x0, y1);
  const v11 = hash2D(seed, x1, y1);
  const a = lerp(v00, v10, tx);
  const b = lerp(v01, v11, tx);
  return lerp(a, b, ty);
}

export function octaveNoise2D(
  seed,
  x,
  y,
  options: {
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
  } = {}
) {
  const octaves = options.octaves ?? 4;
  const persistence = options.persistence ?? 0.5;
  const lacunarity = options.lacunarity ?? 2;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let normalizer = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(seed, x * frequency, y * frequency) * amplitude;
    normalizer += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / normalizer;
}

export function ridgedNoise2D(
  seed,
  x,
  y,
  options: {
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
  } = {}
) {
  return 1 - Math.abs(octaveNoise2D(seed, x, y, options) * 2 - 1);
}

export function wrapLongitude(longitude) {
  if (longitude > 180) return longitude - 360;
  if (longitude < -180) return longitude + 360;
  return longitude;
}

export function toGps(x, y) {
  const longitude = wrapLongitude((x / WORLD_TILES_WIDE) * 360);
  const latitude = clamp((-y / WORLD_TILES_WIDE) * 180, -90, 90);
  return {
    latitude: Object.is(latitude, -0) ? 0 : latitude,
    longitude: Object.is(longitude, -0) ? 0 : longitude,
  };
}

export function normalizeAngle(angle) {
  const tau = Math.PI * 2;
  let next = angle % tau;
  if (next < 0) next += tau;
  return next;
}

export function cardinalFromAngle(angle) {
  const normalized = normalizeAngle(angle);
  if (normalized < Math.PI * 0.25 || normalized >= Math.PI * 1.75) return 'E';
  if (normalized < Math.PI * 0.75) return 'S';
  if (normalized < Math.PI * 1.25) return 'W';
  return 'N';
}

function pickFrom(list, seedValue) {
  return list[Math.floor(seedValue * list.length) % list.length];
}

export function getRegionalPoiNameStyle(seed, x, y) {
  const regionX = Math.floor(x / 48);
  const regionY = Math.floor(y / 48);
  const prefixSets = [
    ['Ash', 'Briar', 'Cinder', 'Dawn', 'Elder', 'Frost'],
    ['Green', 'High', 'Low', 'Moss', 'Oak', 'Stone'],
    ['Red', 'Silver', 'Sun', 'Thorn', 'West', 'Wind'],
    ['Moon', 'Raven', 'River', 'Storm', 'Vale', 'Wild'],
  ];
  const suffixSets = [
    ['ford', 'gate', 'grove', 'hollow', 'mere', 'watch'],
    ['barrow', 'crest', 'fell', 'hearth', 'rest', 'run'],
    ['bridge', 'field', 'keep', 'pass', 'reach', 'ward'],
    ['den', 'depths', 'hall', 'rift', 'spire', 'way'],
  ];

  return {
    regionX,
    regionY,
    prefixes:
      prefixSets[
        Math.floor(
          hash2D(`${seed}:name-prefix-set`, regionX, regionY) *
            prefixSets.length
        )
      ],
    suffixes:
      suffixSets[
        Math.floor(
          hash2D(`${seed}:name-suffix-set`, regionX, regionY) *
            suffixSets.length
        )
      ],
  };
}

export function generatePoiName(seed, type, x, y) {
  const style = getRegionalPoiNameStyle(seed, x, y);
  const stem = `${seed}:${type}:${x}:${y}`;
  const prefix = pickFrom(style.prefixes, hash2D(`${stem}:prefix`, x, y));
  const suffix = pickFrom(style.suffixes, hash2D(`${stem}:suffix`, y, x));

  if (type === 'town') {
    const forms = [
      `${prefix}${suffix}`,
      `${prefix} ${suffix}`,
      `${prefix}${pickFrom(
        ['haven', 'stead', 'wick', 'port'],
        hash2D(`${stem}:tail`, x + y, y)
      )}`,
    ];
    return pickFrom(forms, hash2D(`${stem}:form`, x - y, y - x));
  }

  if (type === 'cave') {
    const nouns = ['Cave', 'Grotto', 'Hollow', 'Mouth', 'Den', 'Sink'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  if (type === 'dungeon') {
    const nouns = ['Barrow', 'Crypt', 'Depths', 'Hall', 'Vault', 'Warren'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  if (type === 'ruins') {
    const nouns = ['Ruins', 'Forum', 'Temple', 'Sanctum', 'Court', 'Stones'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  return `${prefix}${suffix}`;
}

export const DEFAULT_TILE_DEFINITION = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};

export function getTileDefinition(kind) {
  return {
    ...DEFAULT_TILE_DEFINITION,
    name: kind
      ? `${String(kind).slice(0, 1).toUpperCase()}${String(kind).slice(1)}`
      : DEFAULT_TILE_DEFINITION.name,
  };
}

export function createPlayer(
  overrides: {
    x?: number;
    y?: number;
    facing?: number;
  } = {}
) {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    facing: overrides.facing ?? 0,
  };
}

export function snapWorldCoordinate(value) {
  return Math.round(value);
}

export function createWorldState({
  generator,
  player,
  resolveTileDefinition,
}: {
  generator: {
    getMap(context: unknown, player?: unknown): {
      getTile(x: number, y: number): { kind: string };
      getAction?(x: number, y: number): any;
      getExit?(x?: number, y?: number): any;
    };
  };
  player: {
    x: number;
    y: number;
    facing: number;
  };
  resolveTileDefinition?: (kind: string) => any;
}) {
  const getResolvedTileDefinition =
    resolveTileDefinition ?? ((kind) => getTileDefinition(kind));
  const stack = [
    {
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
      origin: { x: 0, y: 0 },
    },
  ];

  const state = {
    generator,
    player,
    stack,
    viewMode: '2d',
    getCurrentContext() {
      return this.stack[this.stack.length - 1];
    },
    getCurrentMap() {
      return this.generator.getMap(this.getCurrentContext(), this.player);
    },
    getCurrentTile(x = this.player.x, y = this.player.y) {
      return this.getCurrentMap().getTile(
        snapWorldCoordinate(x),
        snapWorldCoordinate(y)
      );
    },
    getTileDefinition(kind) {
      return getResolvedTileDefinition(kind);
    },
    canWalk(x, y) {
      const probes = [
        [x, y],
        [x + 0.3, y],
        [x - 0.3, y],
        [x, y + 0.3],
        [x, y - 0.3],
      ];

      return probes.every(
        ([probeX, probeY]) =>
          this.getTileDefinition(this.getCurrentTile(probeX, probeY).kind)
            .walkable
      );
    },
    interact() {
      const map = this.getCurrentMap();
      const action = map.getAction(
        snapWorldCoordinate(this.player.x),
        snapWorldCoordinate(this.player.y)
      );
      if (!action) return false;
      const nextContext = {
        ...action.context,
        returnTo: action.returnTo ?? {
          x: snapWorldCoordinate(this.player.x),
          y: snapWorldCoordinate(this.player.y),
          facing: this.player.facing,
        },
      };
      if (action.type === 'enter') {
        this.stack.push(nextContext);
        this.player.x = action.spawn.x;
        this.player.y = action.spawn.y;
        if (typeof action.facing === 'number') {
          this.player.facing = action.facing;
        }
        return true;
      }
      if (action.type === 'deepen') {
        this.stack.push(nextContext);
        this.player.x = action.spawn.x;
        this.player.y = action.spawn.y;
        return true;
      }
      return false;
    },
    tryExit() {
      const map = this.getCurrentMap();
      const action = map.getExit(
        snapWorldCoordinate(this.player.x),
        snapWorldCoordinate(this.player.y)
      );
      if (!action) return false;
      const currentContext = this.getCurrentContext();
      this.stack.pop();
      const spawn = action.spawn ?? currentContext.returnTo;
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      if (typeof action.facing === 'number') {
        this.player.facing = action.facing;
      } else if (typeof spawn.facing === 'number') {
        this.player.facing = spawn.facing;
      }
      return true;
    },
  };

  return state;
}
