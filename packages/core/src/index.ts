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
} from './celestial/time.ts';
export { type CelestialEventLike } from './celestial/getCelestialEventsForDay.ts';
export { type AuroraBandLike } from './celestial/getDaylightCycleState.ts';
import { snapWorldCoordinate, type WorldPositionLike } from './position.ts';

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
export { octaveNoise2D, ridgedNoise2D, valueNoise2D } from './noise.ts';
export {
  cardinalFromAngle,
  snapWorldCoordinate,
  toGps,
  type WorldPositionLike,
  wrapLongitude,
} from './position.ts';
export {
  generatePoiName,
  getRegionalPoiNameStyle,
  registerPoiNameType,
  type PoiNameType,
} from './poi.ts';

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
export { advanceWorldTimeOffsetBySeasons } from './celestial/seasons.ts';
export { applyCelestialEnvironmentOverrides } from './celestial/applyCelestialEnvironmentOverrides.ts';

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
