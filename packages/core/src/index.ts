export const CHUNK_SIZE = 32;
export const EARTH_CIRCUMFERENCE_METERS = 40075017;
export const TILE_METERS = 250;
export const WORLD_TILES_WIDE = Math.floor(
  EARTH_CIRCUMFERENCE_METERS / TILE_METERS
);
export const HALF_WORLD_TILES = WORLD_TILES_WIDE / 2;
export const DEFAULT_DAY_LENGTH_MINUTES = 42;
export const DEFAULT_DAY_LENGTH_MS = DEFAULT_DAY_LENGTH_MINUTES * 60 * 1000;
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
const PLANET_NAMES = ['Aurel', 'Brink', 'Cael', 'Damar', 'Vela'];
const METEOR_SHOWER_NAMES = ['Silver Wake', 'Ember Rain', 'Northfall'];
const COMET_NAMES = ['White Lantern', 'Pilgrim Tail'];
const PLANET_NAME_SET: ReadonlySet<string> = new Set(PLANET_NAMES);
const COMET_NAME_SET: ReadonlySet<string> = new Set(COMET_NAMES);
const PLANET_SKY_PROFILES = [
  {
    orbitLengthDays: 11,
    wobblePeriodDays: 6,
    wobbleAmplitude: 0.012,
    wobblePhase: 0.18,
    declinationFactor: 0.18,
    declinationWaveDays: 15,
    declinationWaveAmplitude: 0.05,
    azimuthShift: 0.08,
    intensityBase: 0.42,
    intensitySwing: 0.34,
    color: '#ffd7a6',
    size: 0.52,
    orbitTilt: 0.16,
    orbitEccentricity: 0.06,
    orbitRotation: 0.12,
  },
  {
    orbitLengthDays: 17,
    wobblePeriodDays: 9,
    wobbleAmplitude: 0.017,
    wobblePhase: 0.54,
    declinationFactor: 0.26,
    declinationWaveDays: 21,
    declinationWaveAmplitude: 0.08,
    azimuthShift: 0.34,
    intensityBase: 0.38,
    intensitySwing: 0.36,
    color: '#f7b8d7',
    size: 0.6,
    orbitTilt: 0.24,
    orbitEccentricity: 0.11,
    orbitRotation: 0.58,
  },
  {
    orbitLengthDays: 24,
    wobblePeriodDays: 13,
    wobbleAmplitude: 0.024,
    wobblePhase: 0.92,
    declinationFactor: 0.34,
    declinationWaveDays: 30,
    declinationWaveAmplitude: 0.12,
    azimuthShift: 0.56,
    intensityBase: 0.36,
    intensitySwing: 0.38,
    color: '#b8efff',
    size: 0.68,
    orbitTilt: -0.21,
    orbitEccentricity: 0.18,
    orbitRotation: 1.04,
  },
  {
    orbitLengthDays: 33,
    wobblePeriodDays: 18,
    wobbleAmplitude: 0.03,
    wobblePhase: 1.36,
    declinationFactor: 0.44,
    declinationWaveDays: 38,
    declinationWaveAmplitude: 0.16,
    azimuthShift: 0.82,
    intensityBase: 0.34,
    intensitySwing: 0.42,
    color: '#ffe08c',
    size: 0.76,
    orbitTilt: 0.31,
    orbitEccentricity: 0.24,
    orbitRotation: 1.52,
  },
  {
    orbitLengthDays: 41,
    wobblePeriodDays: 23,
    wobbleAmplitude: 0.034,
    wobblePhase: 1.86,
    declinationFactor: 0.5,
    declinationWaveDays: 45,
    declinationWaveAmplitude: 0.2,
    azimuthShift: 1.18,
    intensityBase: 0.32,
    intensitySwing: 0.44,
    color: '#9fd0ff',
    size: 0.84,
    orbitTilt: -0.36,
    orbitEccentricity: 0.29,
    orbitRotation: 1.96,
  },
] as const;
type ConstellationConnectionStyle = 'arc' | 'zigzag' | 'fork' | 'kite';
type ConstellationArchetypePoint = {
  angle: number;
  radial: number;
};
type ConstellationArchetype = {
  points: readonly ConstellationArchetypePoint[];
  verticalScale: number;
  connectionStyle: ConstellationConnectionStyle;
  rotation: number;
};
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
type PlanetSkyProfile = (typeof PLANET_SKY_PROFILES)[number];
type CometOrreryProfile = (typeof COMET_ORRERY_PROFILES)[number];

function getPlanetSkyProfile(name: string, fallbackIndex = 0): PlanetSkyProfile {
  const index = PLANET_NAMES.indexOf(name);
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return PLANET_SKY_PROFILES[resolvedIndex % PLANET_SKY_PROFILES.length];
}

function getPlanetSkyProfileIndex(name: string, fallbackIndex = 0): number {
  const index = PLANET_NAMES.indexOf(name);
  return index >= 0 ? index : fallbackIndex % PLANET_SKY_PROFILES.length;
}

function getCometOrreryProfile(name: string, fallbackIndex = 0): CometOrreryProfile {
  const index = COMET_NAMES.indexOf(name);
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return COMET_ORRERY_PROFILES[resolvedIndex % COMET_ORRERY_PROFILES.length];
}

function getCometOrreryProfileIndex(name: string, fallbackIndex = 0): number {
  const index = COMET_NAMES.indexOf(name);
  return index >= 0 ? index : fallbackIndex % COMET_ORRERY_PROFILES.length;
}

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
    Math.sin((elapsedDays / profile.wobblePeriodDays) * Math.PI * 2 + profile.wobblePhase) *
    profile.wobbleAmplitude;
  const retrogradeBias =
    Math.sin((elapsedDays / (profile.orbitLengthDays * 1.4)) * Math.PI * 2 + profile.wobblePhase) *
    profile.wobbleAmplitude *
    0.46;
  return fract(baseProgress + wobble + retrogradeBias);
}

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
  visibility: number;
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

export interface AuroraBandLike {
  id: string;
  azimuthCenter: number;
  span: number;
  altitude: number;
  height: number;
  intensity: number;
  wavePhase: number;
  colorA: string;
  colorB: string;
}

export interface MilkyWayBandSampleLike {
  azimuth: number;
  centerPhi: number;
  innerPhi: number;
  outerPhi: number;
  opacity: number;
}

export interface OrreryBodyLike {
  id: string;
  type: 'sun' | 'moon' | 'planet' | 'comet';
  orbitRadius: number;
  angle: number;
  orbitTilt: number;
  orbitHeight: number;
  orbitEccentricity: number;
  orbitRotation: number;
  color: string;
  size: number;
  trailLength: number;
}

export interface SolarEclipseLike {
  active: boolean;
  coverage: number;
  totality: number;
  daylightReduction: number;
  moonAzimuth: number;
  moonAltitude: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface CelestialRingEntryLike {
  constellationIndex: number;
  name: string;
  sunriseAzimuth: number;
  visualAzimuth: number;
}

export type PoiNameType =
  | (
      | 'town'
      | 'cave'
      | 'dungeon'
      | 'ruins'
      | 'quarry'
      | 'lighthouse'
      | 'ship'
      | 'observatory'
    )
  | (string & {});
type CardinalDirection = 'N' | 'S' | 'E' | 'W';
type CoreWorldContextType =
  | 'overworld'
  | 'town'
  | 'building'
  | 'depth'
  | 'cave'
  | 'dungeon'
  | (string & {});
type CoreWorldTileKind =
  | 'unknown'
  | 'plains'
  | 'shore'
  | 'mountain'
  | 'forest'
  | 'interior'
  | 'floor'
  | 'wall'
  | 'door'
  | 'road'
  | 'ruins'
  | 'ocean'
  | 'river'
  | 'bridge'
  | 'sign'
  | 'town'
  | 'cave'
  | 'dungeon'
  | 'quarry'
  | 'lighthouse'
  | 'ship'
  | 'observatory'
  | 'shop'
  | 'stairsUp'
  | 'stairsDown'
  | (string & {});

type WorldPositionLike = {
  x: number;
  y: number;
};

type FacingPositionLike = WorldPositionLike & {
  facing?: number;
};

type CoreTileDefinitionLike = {
  name: string;
  color: string;
  miniColor: string;
  walkable: boolean;
  wallHeight: number;
};

type CoreWorldTileLike = {
  kind: CoreWorldTileKind;
};

type CoreWorldContextLike = {
  id: string;
  label: string;
  type: CoreWorldContextType;
  depth: number;
  origin: WorldPositionLike;
  returnTo?: FacingPositionLike;
};

type CoreWorldActionLike = {
  type?: 'enter' | 'deepen' | (string & {});
  context?: CoreWorldContextLike;
  spawn?: WorldPositionLike;
  facing?: number;
  returnTo?: FacingPositionLike;
  note?: string;
  label?: string;
};

type CoreWorldMapLike = {
  getTile(x: number, y: number, state?: CoreWorldStateLike): CoreWorldTileLike;
  getAction?(x: number, y: number, state?: CoreWorldStateLike): unknown;
  getExit?(x?: number, y?: number): unknown;
};

type CoreWorldExitLike = {
  spawn?: FacingPositionLike;
  facing?: number;
};

function isCoreWorldActionLike(value: unknown): value is CoreWorldActionLike & {
  type: string;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const action = value as CoreWorldActionLike;
  return typeof action.type === 'string';
}

function isCoreWorldTransitionAction(
  action: CoreWorldActionLike
): action is CoreWorldActionLike & {
  context: CoreWorldContextLike;
  spawn: WorldPositionLike;
} {
  return (
    typeof action.context?.id === 'string' &&
    typeof action.context?.label === 'string' &&
    typeof action.context?.type === 'string' &&
    typeof action.context?.depth === 'number' &&
    typeof action.spawn?.x === 'number' &&
    typeof action.spawn?.y === 'number'
  );
}

function isCoreWorldExitLike(value: unknown): value is CoreWorldExitLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const action = value as CoreWorldExitLike;
  return (
    typeof action.spawn === 'undefined' ||
    action.spawn === null ||
    (typeof action.spawn.x === 'number' && typeof action.spawn.y === 'number')
  );
}

type CoreWorldGeneratorLike = {
  getMap(context: CoreWorldContextLike, player?: FacingPositionLike): CoreWorldMapLike;
};

type CoreWorldStateLike = {
  generator: CoreWorldGeneratorLike;
  player: FacingPositionLike & { facing: number };
  timeMs?: number;
  playerLevel?: number;
  playerProfession?: string;
  completedQuestIds?: string[];
  inspection?: {
    contextId: string;
    x: number;
    y: number;
    note: string;
    label?: string;
  } | null;
  stack: CoreWorldContextLike[];
  viewMode: '2d';
  getCurrentContext(): CoreWorldContextLike;
  getCurrentMap(): CoreWorldMapLike;
  getCurrentTile(x?: number, y?: number): CoreWorldTileLike;
  getTileDefinition(kind: CoreWorldTileKind): CoreTileDefinitionLike;
  canWalk(x: number, y: number): boolean;
  interact(): boolean;
  tryExit(): boolean;
};

export function fract(value: number): number {
  return value - Math.floor(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(
  edge0: number,
  edge1: number,
  value: number
): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function getDaylightCycleState(
  timeMs: number,
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
  const night = clamp(1 - twilight + solarEclipse.daylightReduction * 0.28, 0, 1);
  const starsOpacity = smoothstep(
    0.08,
    0.82,
    Math.max(night, solarEclipse.coverage * 0.72)
  );
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
    daylight,
    night,
    starsOpacity,
  });
  const calendar = formatCelestialDate(activeConstellation?.name ?? 'Unknown', moonPhaseName);
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

export function applyCelestialEnvironmentOverrides(
  cycle: ReturnType<typeof getDaylightCycleState>,
  overrides: {
    constellations?: ConstellationLike[];
    activeConstellationIndex?: number;
    visibleEvents?: CelestialEventLike[];
    visibleEventsAppend?: CelestialEventLike[];
    removeVisibleEventTypes?: Array<CelestialEventLike['type']>;
    milkyWay?: MilkyWayBeltLike;
    auroraBands?: AuroraBandLike[];
    orreryBodies?: OrreryBodyLike[];
    deriveOrreryFromVisibleEvents?: boolean;
    solarEclipse?: SolarEclipseLike;
  } = {}
) {
  const visibleEventsBase = overrides.visibleEvents ?? cycle.visibleEvents;
  const visibleEventsFiltered =
    (overrides.removeVisibleEventTypes?.length ?? 0) > 0
      ? visibleEventsBase.filter(
          (event) => !overrides.removeVisibleEventTypes?.includes(event.type)
        )
      : visibleEventsBase;
  const visibleEvents = [
    ...visibleEventsFiltered,
    ...(overrides.visibleEventsAppend ?? []),
  ];
  const derivedOrreryBodies = overrides.deriveOrreryFromVisibleEvents
    ? getOrreryBodies({
        moonAngle: cycle.moonAngle,
        moonIllumination: cycle.moonIllumination,
        visibleEvents,
      })
    : null;
  const solarEclipse = overrides.solarEclipse ?? cycle.solarEclipse;
  const rawDaylight = cycle.rawDaylight ?? cycle.daylight;
  const rawTwilight = cycle.rawTwilight ?? cycle.twilight;
  const daylight =
    overrides.solarEclipse != null
      ? getEclipseAdjustedDaylight(rawDaylight, solarEclipse)
      : cycle.daylight;
  const twilight =
    overrides.solarEclipse != null
      ? getEclipseAdjustedTwilight(rawTwilight, solarEclipse)
      : cycle.twilight;
  const night =
    overrides.solarEclipse != null
      ? clamp(1 - twilight + solarEclipse.daylightReduction * 0.28, 0, 1)
      : cycle.night;
  const starsOpacity =
    overrides.solarEclipse != null
      ? smoothstep(0.08, 0.82, Math.max(night, solarEclipse.coverage * 0.72))
      : cycle.starsOpacity;
  return {
    ...cycle,
    constellations: overrides.constellations ?? cycle.constellations,
    activeConstellationIndex:
      overrides.activeConstellationIndex ?? cycle.activeConstellationIndex,
    rawDaylight,
    rawTwilight,
    daylight,
    twilight,
    night,
    starsOpacity,
    solarEclipse,
    visibleEvents,
    milkyWay: overrides.milkyWay ?? cycle.milkyWay,
    auroraBands: overrides.auroraBands ?? cycle.auroraBands ?? [],
    orreryBodies:
      overrides.orreryBodies ?? derivedOrreryBodies ?? cycle.orreryBodies,
    isNight: daylight < 0.22,
  };
}

export function getSolarEclipseState({
  dayNumber,
  dayProgress,
  yearProgress,
  sunAngle,
  sunAzimuth,
  sunAltitude,
  moonAngle,
  moonIlluminationHint = 0,
}: {
  dayNumber: number;
  dayProgress: number;
  yearProgress: number;
  sunAngle: number;
  sunAzimuth: number;
  sunAltitude: number;
  moonAngle: number;
  moonIlluminationHint?: number;
}): SolarEclipseLike {
  const phaseDelta = normalizeAngle(moonAngle - sunAngle);
  const phaseAlignment = 1 - smoothstep(0.06, 0.18, Math.abs(phaseDelta));
  const nodePhase = (dayNumber + dayProgress) / 173.3 + yearProgress * 0.12 + 0.17;
  const nodeOffset = Math.sin(nodePhase * Math.PI * 2);
  const nodeAlignment = 1 - smoothstep(0.16, 0.52, Math.abs(nodeOffset));
  const daylightFactor = smoothstep(-0.04, 0.26, sunAltitude);
  const coverage = clamp(
    phaseAlignment *
      nodeAlignment *
      daylightFactor *
      (0.72 + moonIlluminationHint * 0.28),
    0,
    1
  );
  const totality = smoothstep(0.82, 0.98, coverage);
  const daylightReduction = coverage * (0.55 + totality * 0.35);
  const trackX = clamp(phaseDelta / 0.1, -1, 1);
  const trackY = clamp(nodeOffset * 0.68, -1, 1);

  return {
    active: coverage > 0.03,
    coverage,
    totality,
    daylightReduction,
    moonAzimuth: normalizeAngle(sunAzimuth + trackX * 0.06 + trackY * 0.018),
    moonAltitude: clamp(sunAltitude + trackY * 0.08, -1, 1),
    shadowOffsetX: trackX,
    shadowOffsetY: trackY,
  };
}

function getEclipseAdjustedDaylight(
  daylight: number,
  solarEclipse: SolarEclipseLike
) {
  return clamp(
    daylight * (1 - solarEclipse.daylightReduction),
    0,
    1
  );
}

function getEclipseAdjustedTwilight(
  twilight: number,
  solarEclipse: SolarEclipseLike
) {
  return clamp(
    twilight - solarEclipse.daylightReduction * 0.34,
    0,
    1
  );
}

export function getWorldTimeMs(
  realTimeMs: number,
  options: {
    timeOffsetMs?: number;
  } = {}
) {
  return realTimeMs + (options.timeOffsetMs ?? 0);
}

export function getWorldDaylightCycle(
  realTimeMs: number,
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
  currentOffsetMs: number,
  hours: number,
  options: {
    dayLengthMs?: number;
  } = {}
) {
  const dayLengthMs = options.dayLengthMs ?? DEFAULT_DAY_LENGTH_MS;
  return currentOffsetMs + (hours / 24) * dayLengthMs;
}

export function alignWorldTimeOffsetToDayProgress(
  realTimeMs: number,
  currentOffsetMs: number,
  targetDayProgress: number,
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
  currentOffsetMs: number,
  seasons: number,
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
  seed: string,
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

function getConstellationArchetype(seed: string, index: number): ConstellationArchetype {
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
  style: ConstellationConnectionStyle
): [number, number][] {
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
  seed: string,
  index: number,
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

function pickLimitedNamePart(
  parts: readonly string[],
  counts: Map<string, number>,
  maxCount: number,
  seedValue: number
) {
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

export function formatCelestialDate(
  constellationName: string,
  moonPhaseName: string
): CelestialCalendarLike {
  return {
    month: constellationName,
    week: moonPhaseName,
    label: `${constellationName} / ${moonPhaseName}`,
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
    const orbitProgress = getPlanetaryOrbitProgress(dayNumber + dayProgress, profile);
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
      intensity:
        profile.intensityBase +
        hash2D('planet-intensity', index, dayNumber % orbitLength) * profile.intensitySwing,
      visibility: getCelestialEventVisibility({
        type: 'planet',
        altitude: orbitState.altitude,
        intensity:
          profile.intensityBase +
          hash2D('planet-intensity', index, dayNumber % orbitLength) * profile.intensitySwing,
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
    const seasonStart = Math.floor((yearLengthDays / METEOR_SHOWER_NAMES.length) * index);
    const peakOffset = ((dayNumber - seasonStart) % yearLengthDays + yearLengthDays) % yearLengthDays;
    if (peakOffset <= 4 || peakOffset >= yearLengthDays - 4) {
      const distance = Math.min(peakOffset, yearLengthDays - peakOffset);
      const progress = fract(dayProgress + index * 0.21);
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
        intensity: 1 - distance / 4,
        visibility: getCelestialEventVisibility({
          type: 'meteor-shower',
          altitude: orbitState.altitude,
          intensity: 1 - distance / 4,
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
        intensity: 1 - cycleDay / 3,
        visibility: getCelestialEventVisibility({
          type: 'comet',
          altitude: orbitState.altitude,
          intensity: 1 - cycleDay / 3,
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
    return clamp(horizonVisibility * twilightVisibility * night * (0.55 + intensity * 0.45), 0, 1);
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

export function getMilkyWayBeltState({
  dayProgress,
  yearProgress,
  observerLatitudeDegrees,
  starsOpacity,
}: {
  dayProgress?: number;
  yearProgress: number;
  observerLatitudeDegrees?: number;
  starsOpacity?: number;
}): MilkyWayBeltLike {
  const latitudeRadians = ((observerLatitudeDegrees ?? 0) / 180) * Math.PI;
  const dailyRotation = (dayProgress ?? 0) * Math.PI * 2;
  return {
    azimuthOffset:
      dailyRotation +
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

export function getMilkyWayBandSamples(
  belt: MilkyWayBeltLike,
  yearProgress: number,
  sampleCount = 72
): MilkyWayBandSampleLike[] {
  const resolvedSampleCount = Math.max(8, Math.floor(sampleCount));
  const halfBandWidth = belt.width * 0.7;
  return Array.from({ length: resolvedSampleCount + 1 }, (_, index) => {
    const progress = index / resolvedSampleCount;
    const azimuth = progress * Math.PI * 2 + belt.azimuthOffset;
    const latitudeWave =
      Math.sin(
        progress * Math.PI * 2 * 3 +
          belt.azimuthOffset * 1.2 +
          yearProgress * Math.PI * 2
      ) * belt.width;
    const centerPhi = belt.inclination + latitudeWave;
    const edgeFade = Math.cos(progress * Math.PI * 2 - Math.PI / 2) * 0.08;
    return {
      azimuth,
      centerPhi,
      innerPhi: centerPhi - halfBandWidth,
      outerPhi: centerPhi + halfBandWidth,
      opacity: clamp(belt.opacity * (0.84 + edgeFade), 0, 1),
    };
  });
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
      orbitEccentricity: 0,
      orbitRotation: 0,
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
      orbitEccentricity: 0.08,
      orbitRotation: 0.36,
      color: '#dce8ff',
      size: 0.42 + moonIllumination * 0.16,
      trailLength: 0,
    },
  ];

  let unknownPlanetIndex = PLANET_NAMES.length;
  let unknownCometIndex = COMET_NAMES.length;
  visibleEvents.forEach((event) => {
    if (event.type === 'meteor-shower') {
      return;
    }

    const orbitProfile =
      event.type === 'planet'
        ? getPlanetSkyProfile(event.name, unknownPlanetIndex)
        : getCometOrreryProfile(event.name, unknownCometIndex);
    const orbitRadius =
      event.type === 'planet'
        ? 3.6 + getPlanetSkyProfileIndex(event.name, unknownPlanetIndex) * 0.75
        : 8.1 + getCometOrreryProfileIndex(event.name, unknownCometIndex) * 0.95;
    if (event.type === 'planet' && !PLANET_NAME_SET.has(event.name)) {
      unknownPlanetIndex += 1;
    }
    if (event.type === 'comet' && !COMET_NAME_SET.has(event.name)) {
      unknownCometIndex += 1;
    }
    bodies.push({
      id: `${event.type}:${event.name}`,
      type: event.type === 'planet' ? 'planet' : 'comet',
      orbitRadius,
      angle: normalizeTurns(event.progress),
      orbitTilt:
        orbitProfile.orbitTilt +
        (event.type === 'planet'
          ? 0
          : getCometOrreryProfileIndex(event.name, 0) % 2 === 0
            ? 0.04
            : -0.04),
      orbitHeight: event.altitude * 0.35,
      orbitEccentricity: orbitProfile.orbitEccentricity,
      orbitRotation: orbitProfile.orbitRotation,
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

export function getOrbitalSkyPosition({
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

export function hash2D(seed: string | number, x: number, y: number): number {
  return hash2DWithSeed(getCachedHashSeed(seed), x, y);
}

export function createHashSeed(seed: string | number): number {
  return getCachedHashSeed(seed);
}

export function appendHashSeedPart(
  seedHash: number,
  value: string | number
): number {
  return mixHashString(mixHashCharacter(seedHash, 58), value);
}

export function hash2DWithSeed(seedHash: number, x: number, y: number): number {
  let hash = seedHash;
  hash = mixHashCharacter(hash, 58);
  hash = mixHashString(hash, x);
  hash = mixHashCharacter(hash, 58);
  hash = mixHashString(hash, y);
  return (hash >>> 0) / 4294967295;
}

const HASH_2D_SEED_CACHE_LIMIT = 4096;
const hash2dSeedCache = new Map<string | number, number>();

function getCachedHashSeed(seed: string | number): number {
  const cached = hash2dSeedCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  let hash = 2166136261;
  hash = mixHashString(hash, seed);
  hash2dSeedCache.set(seed, hash);
  if (hash2dSeedCache.size > HASH_2D_SEED_CACHE_LIMIT) {
    const oldest = hash2dSeedCache.keys().next().value;
    if (oldest !== undefined) {
      hash2dSeedCache.delete(oldest);
    }
  }
  return hash;
}

function mixHashString(hash: number, value: string | number): number {
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = mixHashCharacter(hash, text.charCodeAt(index));
  }
  return hash;
}

function mixHashCharacter(hash: number, charCode: number): number {
  hash ^= charCode;
  return Math.imul(hash, 16777619);
}

function normalizeTurns(value: number): number {
  return ((value % 1) + 1) % 1;
}

export function valueNoise2D(
  seed: string | number,
  x: number,
  y: number
): number {
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
  seed: string | number,
  x: number,
  y: number,
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
  seed: string | number,
  x: number,
  y: number,
  options: {
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
  } = {}
) {
  return 1 - Math.abs(octaveNoise2D(seed, x, y, options) * 2 - 1);
}

export function wrapLongitude(longitude: number): number {
  if (longitude > 180) return longitude - 360;
  if (longitude < -180) return longitude + 360;
  return longitude;
}

export function toGps(
  x: number,
  y: number
): { latitude: number; longitude: number } {
  const longitude = wrapLongitude((x / WORLD_TILES_WIDE) * 360);
  const latitude = clamp((-y / WORLD_TILES_WIDE) * 180, -90, 90);
  return {
    latitude: Object.is(latitude, -0) ? 0 : latitude,
    longitude: Object.is(longitude, -0) ? 0 : longitude,
  };
}

export function normalizeAngle(angle: number): number {
  const tau = Math.PI * 2;
  let next = angle % tau;
  if (next < 0) next += tau;
  return next;
}

export function cardinalFromAngle(angle: number): CardinalDirection {
  const normalized = normalizeAngle(angle);
  if (normalized < Math.PI * 0.25 || normalized >= Math.PI * 1.75) return 'E';
  if (normalized < Math.PI * 0.75) return 'S';
  if (normalized < Math.PI * 1.25) return 'W';
  return 'N';
}

function pickFrom<T>(list: readonly T[], seedValue: number): T {
  return list[Math.floor(seedValue * list.length) % list.length];
}

export function getRegionalPoiNameStyle(
  seed: string | number,
  x: number,
  y: number
): {
  regionX: number;
  regionY: number;
  prefixes: string[];
  suffixes: string[];
} {
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

export function generatePoiName(
  seed: string | number,
  type: PoiNameType,
  x: number,
  y: number
) {
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

  if (type === 'quarry') {
    const nouns = ['Quarry', 'Cut', 'Excavation', 'Pit', 'Works', 'Stone'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  if (type === 'lighthouse') {
    const nouns = ['Beacon', 'Light', 'Watch', 'Lantern', 'Signal', 'Point'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  if (type === 'ship') {
    const nouns = ['Mariner', 'Brig', 'Galleon', 'Hulk', 'Harbor', 'Mast'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  if (type === 'observatory') {
    const nouns = ['Observatory', 'Dome', 'Lens', 'Crown', 'Apex', 'Spire'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  if (type === 'station') {
    const nouns = ['Station', 'Depot', 'Platform', 'Junction', 'Terminal', 'Rail'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  return `${prefix}${suffix}`;
}

export const DEFAULT_TILE_DEFINITION: CoreTileDefinitionLike = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};

export function getTileDefinition(kind: CoreWorldTileKind): CoreTileDefinitionLike {
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

export function snapWorldCoordinate(value: number): number {
  return Math.round(value);
}

export function createWorldState({
  generator,
  player,
  resolveTileDefinition,
}: {
  generator: CoreWorldGeneratorLike;
  player: FacingPositionLike & { facing: number };
  resolveTileDefinition?: (kind: CoreWorldTileKind) => CoreTileDefinitionLike;
}) {
  const getResolvedTileDefinition =
    resolveTileDefinition ?? ((kind: CoreWorldTileKind) => getTileDefinition(kind));
  const stack: CoreWorldContextLike[] = [
    {
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
      origin: { x: 0, y: 0 },
    },
  ];

  const state: CoreWorldStateLike = {
    generator,
    player,
    inspection: null,
    stack,
    viewMode: '2d' as const,
    getCurrentContext() {
      return this.stack[this.stack.length - 1];
    },
    getCurrentMap() {
      return this.generator.getMap(this.getCurrentContext(), this.player);
    },
    getCurrentTile(this: CoreWorldStateLike, x = this.player.x, y = this.player.y) {
      return this.getCurrentMap().getTile(
        snapWorldCoordinate(x),
        snapWorldCoordinate(y),
        this
      );
    },
    getTileDefinition(kind: CoreWorldTileKind) {
      return getResolvedTileDefinition(kind);
    },
    canWalk(x: number, y: number) {
      const map = this.getCurrentMap();
      const probes = [
        [x, y],
        [x + 0.3, y],
        [x - 0.3, y],
        [x, y + 0.3],
        [x, y - 0.3],
      ];

      return probes.every(
        ([probeX, probeY]) => {
          if (typeof map.canWalk === 'function') {
            return map.canWalk(probeX, probeY, this);
          }
          return this.getTileDefinition(this.getCurrentTile(probeX, probeY).kind)
            .walkable;
        }
      );
    },
    interact() {
      const map = this.getCurrentMap();
      const interactionX = snapWorldCoordinate(this.player.x);
      const interactionY = snapWorldCoordinate(this.player.y);
      const action = map.getAction?.(
        interactionX,
        interactionY,
        this
      );
      if (!isCoreWorldActionLike(action)) return false;
      if (action.type === 'inspect' && typeof action.note === 'string') {
        this.inspection = {
          contextId: this.getCurrentContext().id,
          x: interactionX,
          y: interactionY,
          note: action.note,
          ...(typeof action.label === 'string' ? { label: action.label } : {}),
        };
        return true;
      }
      if (!isCoreWorldTransitionAction(action)) return false;
      const nextContext = {
        ...action.context,
        returnTo: action.returnTo ?? {
          x: interactionX,
          y: interactionY,
          facing: this.player.facing,
        },
      };
      if (action.type === 'enter') {
        this.inspection = null;
        this.stack.push(nextContext);
        this.player.x = action.spawn.x;
        this.player.y = action.spawn.y;
        if (typeof action.facing === 'number') {
          this.player.facing = action.facing;
        }
        return true;
      }
      if (action.type === 'deepen') {
        this.inspection = null;
        this.stack.push(nextContext);
        this.player.x = action.spawn.x;
        this.player.y = action.spawn.y;
        return true;
      }
      return false;
    },
    tryExit() {
      const map = this.getCurrentMap();
      const action = map.getExit?.(
        snapWorldCoordinate(this.player.x),
        snapWorldCoordinate(this.player.y)
      );
      if (!isCoreWorldExitLike(action)) return false;
      this.inspection = null;
      const currentContext = this.getCurrentContext();
      this.stack.pop();
      const spawn = action.spawn ?? currentContext.returnTo;
      if (!spawn) {
        return false;
      }
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      if (typeof action.facing === 'number') {
        this.player.facing = action.facing;
      } else if (typeof action.spawn?.facing === 'number') {
        this.player.facing = action.spawn.facing;
      } else if (typeof currentContext.returnTo?.facing === 'number') {
        this.player.facing = currentContext.returnTo.facing;
      } else if (typeof spawn.facing === 'number') {
        this.player.facing = spawn.facing;
      }
      return true;
    },
  };

  return state;
}
