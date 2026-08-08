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
export const DEFAULT_SEASON_DAYLIGHT_AMPLITUDE = 0.18;
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
}

export interface CelestialRingEntryLike {
  constellationIndex: number;
  name: string;
  sunriseAzimuth: number;
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
  const yearProgress = fract(dayNumber / yearLengthDays);
  const seasonAngle = yearProgress * Math.PI * 2;
  const solarDeclination = Math.sin(seasonAngle) * seasonDaylightAmplitude;
  const sunAngle = dayProgress * Math.PI * 2 - Math.PI / 2;
  const sunAltitude = Math.sin(sunAngle) + solarDeclination;
  const daylightDuration = clamp(0.5 + solarDeclination * 0.95, 0.32, 0.68);
  const sunriseProgress = 0.5 - daylightDuration * 0.5;
  const sunsetProgress = 0.5 + daylightDuration * 0.5;
  const sunAzimuth = normalizeAngle((dayProgress - sunriseProgress) * Math.PI);
  const moonAngle = sunAngle + Math.PI;
  const moonAltitude = Math.sin(moonAngle);
  const moonAzimuth = normalizeAngle(sunAzimuth + Math.PI);
  const daylight = smoothstep(-0.16, 0.2, sunAltitude);
  const twilight = smoothstep(-0.28, 0.16, sunAltitude);
  const night = 1 - twilight;
  const starsOpacity = smoothstep(0.08, 0.82, night);
  const sunriseAzimuth = solarDeclination * 0.8;
  const sunsetAzimuth = Math.PI - solarDeclination * 0.8;
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
  });
  const calendar = formatCelestialDate(activeConstellation?.name ?? 'Unknown', moonPhaseName);
  const celestialRing = createCelestialRing(constellations);

  return {
    dayLengthMs,
    cycleTime,
    dayNumber,
    dayProgress,
    yearLengthDays,
    yearProgress,
    seasonDay,
    seasonLengthDays,
    sunAngle,
    sunAzimuth,
    sunAltitude,
    solarDeclination,
    moonAngle,
    moonAzimuth,
    moonAltitude,
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

  return Array.from({ length: count }, (_, index) => {
    const starCount = 5 + Math.floor(hash2D(`${seed}:stars`, index, count) * 4);
    const stars = Array.from({ length: starCount }, (_, starIndex) => {
      const radial = 0.18 + hash2D(`${seed}:r`, index, starIndex) * 0.22;
      const angle =
        (starIndex / starCount) * Math.PI * 2 +
        hash2D(`${seed}:theta`, index, starIndex) * 0.9;
      return {
        id: `${index}:${starIndex}`,
        x: 0.5 + Math.cos(angle) * radial,
        y: 0.5 + Math.sin(angle) * radial * (0.7 + hash2D(`${seed}:stretch`, index, starIndex) * 0.6),
        brightness: 0.45 + hash2D(`${seed}:b`, index, starIndex) * 0.55,
      };
    }).sort((left, right) => left.x - right.x);

    const connections = stars.slice(1).map((_, starIndex) => [starIndex, starIndex + 1] as [number, number]);
    if (stars.length > 4) {
      connections.push([0, Math.floor(stars.length / 2)]);
    }

    let name = createConstellationName(seed, index);
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
    };
  });
}

export function createConstellationName(seed, index) {
  const prefix = pickFrom(
    CONSTELLATION_PREFIXES,
    hash2D(`${seed}:constellation-prefix`, index, 0)
  );
  const suffix = pickFrom(
    CONSTELLATION_SUFFIXES,
    hash2D(`${seed}:constellation-suffix`, 0, index)
  );
  return `${prefix} ${suffix}`;
}

export function createCelestialRing(
  constellations: ConstellationLike[]
): CelestialRingEntryLike[] {
  const count = Math.max(1, constellations.length);
  return constellations.map((constellation, index) => ({
    constellationIndex: index,
    name: constellation.name,
    sunriseAzimuth: normalizeAngle((index / count) * Math.PI * 2),
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
  } = {}
): CelestialEventLike[] {
  const yearLengthDays = options.yearLengthDays ?? DEFAULT_YEAR_LENGTH_DAYS;
  const events: CelestialEventLike[] = [];

  PLANET_NAMES.forEach((name, index) => {
    const orbitLength = 9 + index * 4;
    events.push({
      type: 'planet',
      name,
      progress: fract(dayNumber / orbitLength + hash2D('planet-progress', index, dayNumber)),
      intensity: 0.35 + hash2D('planet-intensity', index, dayNumber % orbitLength) * 0.45,
    });
  });

  METEOR_SHOWER_NAMES.forEach((name, index) => {
    const seasonStart = Math.floor((yearLengthDays / METEOR_SHOWER_NAMES.length) * index);
    const peakOffset = ((dayNumber - seasonStart) % yearLengthDays + yearLengthDays) % yearLengthDays;
    if (peakOffset <= 4 || peakOffset >= yearLengthDays - 4) {
      const distance = Math.min(peakOffset, yearLengthDays - peakOffset);
      events.push({
        type: 'meteor-shower',
        name,
        progress: distance / 4,
        intensity: 1 - distance / 4,
      });
    }
  });

  COMET_NAMES.forEach((name, index) => {
    const cycleLength = 20 + index * 12;
    const cycleDay = ((dayNumber % cycleLength) + cycleLength) % cycleLength;
    if (cycleDay <= 3) {
      events.push({
        type: 'comet',
        name,
        progress: cycleDay / 3,
        intensity: 1 - cycleDay / 3,
      });
    }
  });

  return events;
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
