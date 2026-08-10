import { type ConstellationLike } from './celestial/constellation.ts';
import {
  CHUNK_SIZE,
  EARTH_CIRCUMFERENCE_METERS,
  HALF_WORLD_TILES,
  TILE_METERS,
  WORLD_TILES_WIDE,
} from './const.ts';
import {
  DEFAULT_CONSTELLATION_COUNT,
  DEFAULT_DAY_LENGTH_MINUTES,
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_SEASON_DAYLIGHT_AMPLITUDE,
  DEFAULT_YEAR_LENGTH_DAYS,
  getWorldTimeMs,
} from './celestial/time.ts';
import {
  getEclipseAdjustedDaylight,
  getEclipseAdjustedTwilight,
  type SolarEclipseLike,
} from './celestial/eclipse.ts';
import { type CelestialEventLike } from './celestial/getCelestialEventsForDay.ts';
import {
  appendHashSeedLabel,
  appendHashSeedPart,
  hash2DWithSeed,
  registerHashLabel,
  registerHashLabels,
} from './hash.ts';
import { type MilkyWayBeltLike } from './celestial/milky-way.ts';
import { clamp, fract, lerp, normalizeAngle, smoothstep } from './math.ts';
import { getOrreryBodies, type OrreryBodyLike } from './celestial/orrery.ts';
import {
  getDaylightCycleState,
  type AuroraBandLike,
} from './celestial/getDaylightCycleState.ts';
import { getWorldDaylightCycle } from './celestial/daylight.ts';

export {
  appendHashSeedLabel,
  appendHashSeedPart,
  createHashSeed,
  hash2D,
  hash2DWithSeed,
  resolveHashSeedInput,
  type HashSeed,
  registerHashLabel,
  registerHashSeed,
  registerHashLabels,
  registerHashSeeds,
  resolveHashSeed,
} from './hash.ts';

export { createRandom } from './prng.ts';
export { clamp, fract, lerp, normalizeAngle, smoothstep } from './math.ts';

export {
  CHUNK_SIZE,
  EARTH_CIRCUMFERENCE_METERS,
  HALF_WORLD_TILES,
  TILE_METERS,
  WORLD_TILES_WIDE,
  DEFAULT_DAY_LENGTH_MINUTES,
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_YEAR_LENGTH_DAYS,
  DEFAULT_CONSTELLATION_COUNT,
  DEFAULT_SEASON_DAYLIGHT_AMPLITUDE,
};
export { DEFAULT_CONSTELLATION_SEED } from './celestial/constellation.ts';
export {
  createConstellationName,
  generateConstellations,
  type ConstellationLike,
  type ConstellationStarLike,
} from './celestial/constellation.ts';
export {
  createCelestialRing,
  type CelestialRingEntryLike,
} from './celestial/createCelestialRing.ts';
export {
  getSolarEclipseState,
  type SolarEclipseLike,
} from './celestial/eclipse.ts';
export { formatCelestialDate } from './celestial/formatCelestialDate.ts';
export {
  getCelestialEventsForDay,
  getOrbitalSkyPosition,
} from './celestial/getCelestialEventsForDay.ts';
export { getDaylightCycleState } from './celestial/getDaylightCycleState.ts';
export {
  getMilkyWayBandSamples,
  getMilkyWayBeltState,
} from './celestial/milky-way.ts';
export { MOON_PHASE_NAMES } from './celestial/moon.ts';
export { getOrreryBodies } from './celestial/orrery.ts';
export { getCometOrbitProgress } from './celestial/comet.ts';
export { getPlanetaryOrbitProgress } from './celestial/planet.ts';
export {
  PLANET_SKY_PROFILES,
  getWorldTimeMs,
  type PlanetSkyProfile,
} from './celestial/time.ts';
export {
  alignWorldTimeOffsetToDayProgress,
  advanceWorldTimeOffsetByHours,
  getWorldDaylightCycle,
} from './celestial/daylight.ts';
export { applyCelestialEnvironmentOverrides } from './celestial/applyCelestialEnvironmentOverrides.ts';

const POI_NAME_PREFIX_SET_LABEL = registerHashLabel('name-prefix-set');
const POI_NAME_SUFFIX_SET_LABEL = registerHashLabel('name-suffix-set');
const POI_NAME_PREFIX_LABEL = registerHashLabel('prefix');
const POI_NAME_SUFFIX_LABEL = registerHashLabel('suffix');
const POI_NAME_TAIL_LABEL = registerHashLabel('tail');
const POI_NAME_FORM_LABEL = registerHashLabel('form');
const POI_NAME_NOUN_LABEL = registerHashLabel('noun');
const POI_NAME_TYPE_LABELS = registerHashLabels([
  'town',
  'cave',
  'dungeon',
  'tower',
  'ruins',
  'quarry',
  'lighthouse',
  'ship',
  'observatory',
  'station',
] as const);
const registeredPoiNameTypeLabels = new Map<string, number>(
  Object.entries(POI_NAME_TYPE_LABELS)
);

export { type CelestialEventLike };

export { type AuroraBandLike };

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
      | 'station'
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
  getMap(
    context: CoreWorldContextLike,
    player?: FacingPositionLike
  ): CoreWorldMapLike;
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
export function valueNoise2D(seedHash: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(0, 1, fract(x));
  const ty = smoothstep(0, 1, fract(y));
  const v00 = hash2DWithSeed(seedHash, x0, y0);
  const v10 = hash2DWithSeed(seedHash, x1, y0);
  const v01 = hash2DWithSeed(seedHash, x0, y1);
  const v11 = hash2DWithSeed(seedHash, x1, y1);
  const a = lerp(v00, v10, tx);
  const b = lerp(v01, v11, tx);
  return lerp(a, b, ty);
}

export function octaveNoise2D(
  seedHash: number,
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
    total += valueNoise2D(seedHash, x * frequency, y * frequency) * amplitude;
    normalizer += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / normalizer;
}

export function ridgedNoise2D(
  seedHash: number,
  x: number,
  y: number,
  options: {
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
  } = {}
) {
  return 1 - Math.abs(octaveNoise2D(seedHash, x, y, options) * 2 - 1);
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
  seedHash: number,
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
  const prefixSetSeed = appendHashSeedLabel(
    seedHash,
    POI_NAME_PREFIX_SET_LABEL
  );
  const suffixSetSeed = appendHashSeedLabel(
    seedHash,
    POI_NAME_SUFFIX_SET_LABEL
  );

  return {
    regionX,
    regionY,
    prefixes:
      prefixSets[
        Math.floor(
          hash2DWithSeed(prefixSetSeed, regionX, regionY) * prefixSets.length
        )
      ],
    suffixes:
      suffixSets[
        Math.floor(
          hash2DWithSeed(suffixSetSeed, regionX, regionY) * suffixSets.length
        )
      ],
  };
}

export function generatePoiName(
  seedHash: number,
  type: PoiNameType,
  x: number,
  y: number
) {
  const style = getRegionalPoiNameStyle(seedHash, x, y);
  const typeSeed = appendHashSeedLabel(seedHash, getPoiNameTypeLabel(type));
  const stemSeed = appendHashSeedPart(appendHashSeedPart(typeSeed, x), y);
  const prefixSeed = appendHashSeedLabel(stemSeed, POI_NAME_PREFIX_LABEL);
  const suffixSeed = appendHashSeedLabel(stemSeed, POI_NAME_SUFFIX_LABEL);
  const tailSeed = appendHashSeedLabel(stemSeed, POI_NAME_TAIL_LABEL);
  const formSeed = appendHashSeedLabel(stemSeed, POI_NAME_FORM_LABEL);
  const nounSeed = appendHashSeedLabel(stemSeed, POI_NAME_NOUN_LABEL);
  const prefix = pickFrom(style.prefixes, hash2DWithSeed(prefixSeed, x, y));
  const suffix = pickFrom(style.suffixes, hash2DWithSeed(suffixSeed, y, x));

  if (type === 'town') {
    const forms = [
      `${prefix}${suffix}`,
      `${prefix} ${suffix}`,
      `${prefix}${pickFrom(
        ['haven', 'stead', 'wick', 'port'],
        hash2DWithSeed(tailSeed, x + y, y)
      )}`,
    ];
    return pickFrom(forms, hash2DWithSeed(formSeed, x - y, y - x));
  }

  if (type === 'cave') {
    const nouns = ['Cave', 'Grotto', 'Hollow', 'Mouth', 'Den', 'Sink'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'dungeon') {
    const nouns = ['Barrow', 'Crypt', 'Depths', 'Hall', 'Vault', 'Warren'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'tower') {
    const nouns = ['Tower', 'Watch', 'Spire', 'Keep', 'Lookout', 'Crown'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'ruins') {
    const nouns = ['Ruins', 'Forum', 'Temple', 'Sanctum', 'Court', 'Stones'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'quarry') {
    const nouns = ['Quarry', 'Cut', 'Excavation', 'Pit', 'Works', 'Stone'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'lighthouse') {
    const nouns = ['Beacon', 'Light', 'Watch', 'Lantern', 'Signal', 'Point'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'ship') {
    const nouns = ['Mariner', 'Brig', 'Galleon', 'Hulk', 'Harbor', 'Mast'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'observatory') {
    const nouns = ['Observatory', 'Dome', 'Lens', 'Crown', 'Apex', 'Spire'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'station') {
    const nouns = [
      'Station',
      'Depot',
      'Platform',
      'Junction',
      'Terminal',
      'Rail',
    ];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  return `${prefix}${suffix}`;
}

export function registerPoiNameType(type: string): number {
  const knownTypeLabel = registeredPoiNameTypeLabels.get(type);
  if (knownTypeLabel !== undefined) {
    return knownTypeLabel;
  }

  const typeLabel = registerHashLabel(type);
  registeredPoiNameTypeLabels.set(type, typeLabel);
  return typeLabel;
}

function getPoiNameTypeLabel(type: PoiNameType): number {
  const knownTypeLabel = registeredPoiNameTypeLabels.get(type);
  if (knownTypeLabel !== undefined) {
    return knownTypeLabel;
  }
  throw new Error(
    `Unknown point-of-interest name type "${type}". Register it with registerPoiNameType() during setup.`
  );
}

export const DEFAULT_TILE_DEFINITION: CoreTileDefinitionLike = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};

export function getTileDefinition(
  kind: CoreWorldTileKind
): CoreTileDefinitionLike {
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
    resolveTileDefinition ??
    ((kind: CoreWorldTileKind) => getTileDefinition(kind));
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
    getCurrentTile(
      this: CoreWorldStateLike,
      x = this.player.x,
      y = this.player.y
    ) {
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

      return probes.every(([probeX, probeY]) => {
        if (typeof map.canWalk === 'function') {
          return map.canWalk(probeX, probeY, this);
        }
        return this.getTileDefinition(this.getCurrentTile(probeX, probeY).kind)
          .walkable;
      });
    },
    interact() {
      const map = this.getCurrentMap();
      const interactionX = snapWorldCoordinate(this.player.x);
      const interactionY = snapWorldCoordinate(this.player.y);
      const action = map.getAction?.(interactionX, interactionY, this);
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
