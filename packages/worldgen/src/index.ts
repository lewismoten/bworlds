import { createBoundedCache } from '@bworlds/cache-support';
import { createPlayer, createWorldState } from '@bworlds/core';
import { registerHashSeed, resolveHashSeedInput } from '@bworlds/core/hash';
import {
  createFrontierContentPackDefinition,
  frontierContentPackManifest,
} from '@bworlds/content-pack-frontier';
import { createRuinsContentPackDefinition } from '@bworlds/content-pack-ruins';
import {
  createDefaultContentPackDefinition,
  createDefaultRuntimePlugins as createDefaultRuntimePluginsFromPack,
  createDefaultTilePlugins as createDefaultTilePluginsFromPack,
} from '@bworlds/content-pack-default';
import {
  createFallbackTileDefinition,
  createPluginPackCatalog,
  PluginRegistry,
  setActivePluginRegistry,
  type PluginPackDefinitionLike,
  type PluginPackManifestLike,
  type RuntimePlayerLike,
  type RuntimePlugin,
  type Seed,
  type TileLike,
  type ViewMode,
  type WorldContextLike,
  type WorldMapLike,
  type WorldStateLike,
} from '@bworlds/plugin-api';
import {
  createOverworldTerrainSignalSampler,
  getOverworldPlacementChance,
  isNearOverworldLand,
} from '@bworlds/overworld-support';
import { resolveOverworldReliefHeight } from '@bworlds/runtime-overworld-relief';
export {
  createWorldTerrainHeightInfluencePlugin,
  sampleWorldTerrainHeightInfluences,
  sortWorldTerrainHeightInfluencePlugins,
  type WorldTerrainHeightInfluenceContribution,
  type WorldTerrainHeightInfluenceContext,
  type WorldTerrainHeightInfluencePlugin,
  type WorldTerrainHeightInfluenceResolution,
  type WorldTerrainHeightInfluenceSample,
  type WorldTerrainHeightInfluenceSamplingDeclaration,
} from './terrain-height-influences.ts';
import {
  createWorldTerrainHeightInfluencePlugin,
  sampleWorldTerrainHeightInfluences,
  sortWorldTerrainHeightInfluencePlugins,
} from './terrain-height-influences.ts';
export {
  getTerrainChunkCellBounds,
  getTerrainChunkHeightSampleCoordinate,
  getTerrainChunkHeightSampleBorder,
  getTerrainChunkCoordinates,
  getTerrainChunkHeightSampleBounds,
  TERRAIN_CHUNK_CELL_SIZE,
  TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE,
  type TerrainChunkBorderEdge,
  type TerrainChunkCellBounds,
  type TerrainChunkCoordinates,
  type TerrainChunkHeightSampleCoordinate,
  type TerrainChunkHeightSampleBorder,
  type TerrainChunkHeightSampleBounds,
  type TerrainChunkId,
} from './terrain-chunks.ts';

export const WORLD_METERS_PER_TILE = 250;
export const WORLD_FEET_PER_METER = 3.28084;
export const WORLD_FEET_PER_TILE = WORLD_METERS_PER_TILE * WORLD_FEET_PER_METER;
export const WORLD_TERRAIN_SEA_LEVEL = 0;
export const WORLD_TERRAIN_FLAT_GRADE_EPSILON = 0.0001;
export const WORLD_TERRAIN_MIN_HEIGHT = -64;
export const WORLD_TERRAIN_MAX_HEIGHT = 64;
export const WORLD_TERRAIN_COARSE_QUERY_STEP = 1;
export const WORLD_TERRAIN_FINE_QUERY_STEP = 0.25;

export type WorldTerrainQueryResolution = 'coarse' | 'fine';

export type WorldTerrainHeightQueryOptions = {
  resolution?: WorldTerrainQueryResolution;
};

export type WorldTerrainDerivativeQueryOptions =
  WorldTerrainHeightQueryOptions & {
    sampleStep?: number;
  };

export type WorldTerrainHeightRangeQueryOptions =
  WorldTerrainDerivativeQueryOptions & {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };

export type WorldTerrainHeightSample = {
  worldX: number;
  worldY: number;
  height: number;
  seaLevel: number;
  depthBelowSeaLevel: number;
};

export type WorldTerrainSlopeSample = {
  worldX: number;
  worldY: number;
  sampleStep: number;
  height: number;
  slopeX: number;
  slopeY: number;
  grade: number;
};

export type WorldTerrainAspectSample = {
  worldX: number;
  worldY: number;
  sampleStep: number;
  slopeX: number;
  slopeY: number;
  grade: number;
  aspectRadians: number | null;
};

export type WorldTerrainCurvatureSample = {
  worldX: number;
  worldY: number;
  sampleStep: number;
  height: number;
  curvatureX: number;
  curvatureY: number;
  curvatureMagnitude: number;
};

export type WorldTerrainDrainageGradientSample = {
  worldX: number;
  worldY: number;
  sampleStep: number;
  height: number;
  downhillX: number;
  downhillY: number;
  downhillGrade: number;
  aspectRadians: number | null;
  lowerNeighborCount: number;
  higherNeighborCount: number;
  convergence: number;
};

export type WorldTerrainHeightRangeSample = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  resolution: WorldTerrainQueryResolution;
  sampleStep: number;
  sampleCount: number;
  minHeight: number;
  maxHeight: number;
  heightRange: number;
};

export type WorldTerrainSeaDepthSample = {
  worldX: number;
  worldY: number;
  height: number;
  seaLevel: number;
  depthBelowSeaLevel: number;
  isBelowSeaLevel: boolean;
};

export function validateTerrainHeightValue(
  height: number,
  label = 'Terrain height'
): number {
  if (!Number.isFinite(height)) {
    throw new Error(`${label} must be a finite number, received ${height}.`);
  }
  return height;
}

export function clampTerrainHeightValue(
  height: number,
  bounds: {
    min?: number;
    max?: number;
  } = {}
): number {
  const min = bounds.min ?? WORLD_TERRAIN_MIN_HEIGHT;
  const max = bounds.max ?? WORLD_TERRAIN_MAX_HEIGHT;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Terrain height clamp bounds must be finite numbers.');
  }
  if (min > max) {
    throw new Error(`Terrain height clamp min ${min} must be <= max ${max}.`);
  }
  return Math.min(max, Math.max(min, height));
}

export type WorldTerrainHeightSampler = {
  sampleHeight(
    worldX: number,
    worldY: number,
    options?: WorldTerrainHeightQueryOptions
  ): number;
  sampleSurface(
    worldX: number,
    worldY: number,
    options?: WorldTerrainHeightQueryOptions
  ): WorldTerrainHeightSample;
  sampleSlope(
    worldX: number,
    worldY: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainSlopeSample;
  sampleAspect(
    worldX: number,
    worldY: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainAspectSample;
  sampleCurvature(
    worldX: number,
    worldY: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainCurvatureSample;
  sampleDrainageGradient(
    worldX: number,
    worldY: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainDrainageGradientSample;
  sampleHeightRange(
    bounds: WorldTerrainHeightRangeQueryOptions
  ): WorldTerrainHeightRangeSample;
  sampleSeaDepth(
    worldX: number,
    worldY: number,
    options?: WorldTerrainHeightQueryOptions
  ): WorldTerrainSeaDepthSample;
};

export function convertFeetToWorldHeightUnits(feet: number): number {
  return feet / WORLD_FEET_PER_TILE;
}

export function convertWorldHeightUnitsToFeet(height: number): number {
  return height * WORLD_FEET_PER_TILE;
}

type Point = { x: number; y: number };
type SpawnTile = TileLike & {
  building?: { id: string };
};
type Context = WorldContextLike & {
  origin: Point;
};

const OVERWORLD_CONTEXT: Context = {
  id: 'overworld',
  label: 'Overworld',
  type: 'overworld',
  depth: 0,
  origin: { x: 0, y: 0 },
};
const MAP_CACHE_LIMIT = 256;
const PREVIEW_TILE_CACHE_LIMIT = 8192;
const TERRAIN_HEIGHT_RANGE_CACHE_LIMIT = 2048;
const EMPTY_PREVIEW_ANCHORS: Array<never> = [];

function makeKey(...parts: Array<string | number>): string {
  return parts.join(':');
}

export function createWorldGenerator({
  seed,
  plugins,
}: {
  seed: Seed;
  plugins: PluginRegistry;
}): {
  getMap(context: Context): WorldMapLike;
  sampleOverworld(x: number, y: number): SpawnTile;
  terrainHeightSampler: WorldTerrainHeightSampler;
  sampleTerrainHeight(
    x: number,
    y: number,
    options?: WorldTerrainHeightQueryOptions
  ): number;
  sampleTerrainSurface(
    x: number,
    y: number,
    options?: WorldTerrainHeightQueryOptions
  ): WorldTerrainHeightSample;
  sampleTerrainSlope(
    x: number,
    y: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainSlopeSample;
  sampleTerrainAspect(
    x: number,
    y: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainAspectSample;
  sampleTerrainCurvature(
    x: number,
    y: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainCurvatureSample;
  sampleTerrainDrainageGradient(
    x: number,
    y: number,
    options?: number | WorldTerrainDerivativeQueryOptions
  ): WorldTerrainDrainageGradientSample;
  sampleTerrainHeightRange(
    bounds: WorldTerrainHeightRangeQueryOptions
  ): WorldTerrainHeightRangeSample;
  sampleTerrainSeaDepth(
    x: number,
    y: number,
    options?: WorldTerrainHeightQueryOptions
  ): WorldTerrainSeaDepthSample;
  samplePreviewSurfaceKind(x: number, y: number): SpawnTile['kind'];
  samplePreviewSurfaceHeight(x: number, y: number): number;
  samplePreviewOverworld(x: number, y: number): SpawnTile;
} {
  const seedHash = resolveHashSeedInput(seed);
  const mapCache = createBoundedCache<string, WorldMapLike>(MAP_CACHE_LIMIT);
  const terrainSignals = createOverworldTerrainSignalSampler(seedHash);
  const previewTileCache = createBoundedCache<string, SpawnTile>(
    PREVIEW_TILE_CACHE_LIMIT
  );
  const previewKindCache = createBoundedCache<string, SpawnTile['kind']>(
    PREVIEW_TILE_CACHE_LIMIT
  );
  const previewSurfaceHeightCache = createBoundedCache<string, number>(
    PREVIEW_TILE_CACHE_LIMIT
  );
  const terrainHeightRangeCache = createBoundedCache<
    string,
    WorldTerrainHeightRangeSample
  >(TERRAIN_HEIGHT_RANGE_CACHE_LIMIT);
  const getPreviewKey = (x: number, y: number) => makeKey('preview', x, y);
  const defaultPreviewTileKind =
    plugins.getDefaultTileKind?.('plains') ?? 'plains';
  const resolvePreviewPlacementChance = (
    chanceKey: string,
    x: number,
    y: number
  ) => getOverworldPlacementChance(seedHash, chanceKey, x, y);
  const samplePreviewSurfaceKind = (
    x: number,
    y: number
  ): SpawnTile['kind'] => {
    const key = getPreviewKey(x, y);
    return previewKindCache.getOrCreate(key, () => {
      const signals = terrainSignals(x, y);
      const townChance = resolvePreviewPlacementChance('town', x, y);
      const caveChance = resolvePreviewPlacementChance('cave', x, y);
      const dungeonChance = resolvePreviewPlacementChance('dungeon', x, y);
      const signChance = resolvePreviewPlacementChance('sign', x, y);
      const previewTile = plugins.classifyTerrainTile({
        seed: seedHash,
        x,
        y,
        tile: { kind: defaultPreviewTileKind },
        nearLand: isNearOverworldLand(signals),
        townChance,
        caveChance,
        dungeonChance,
        signChance,
        getPlacementChance(chanceKey: string) {
          switch (chanceKey) {
            case 'town':
              return townChance;
            case 'cave':
              return caveChance;
            case 'dungeon':
              return dungeonChance;
            case 'sign':
              return signChance;
            default:
              return resolvePreviewPlacementChance(chanceKey, x, y);
          }
        },
        signals,
        sampleTerrainSignals: terrainSignals,
        townAnchors: EMPTY_PREVIEW_ANCHORS,
        bridgeAnchors: EMPTY_PREVIEW_ANCHORS,
        poiAnchors: EMPTY_PREVIEW_ANCHORS,
      }) ?? { kind: defaultPreviewTileKind };

      return previewTile.kind;
    });
  };
  const previewTerrainHeightInfluencePlugins =
    sortWorldTerrainHeightInfluencePlugins([
      createWorldTerrainHeightInfluencePlugin({
        id: 'overworld-relief',
        sampling: {
          resolutions: ['coarse', 'fine'],
        },
        sample({ worldX, worldY }) {
          const kind = samplePreviewSurfaceKind(worldX, worldY);
          return resolveOverworldReliefHeight(
            terrainSignals(worldX, worldY).elevation,
            {
              kind,
            }
          );
        },
      }),
    ]);
  const getMap = (context: Context) => {
    const key = makeKey(context.id, context.depth);
    return mapCache.getOrCreate(key, () => {
      const map = plugins.createMap({
        context,
        seed: seedHash,
        plugins,
      });
      if (!map) {
        throw new Error(
          `No map plugin registered for context type "${context.type}"`
        );
      }
      return map;
    });
  };
  const sampleTerrainHeight = (
    x: number,
    y: number,
    options: WorldTerrainHeightQueryOptions = {}
  ) => {
    const normalizedQuery = resolveTerrainQueryCoordinates(x, y, options);
    const key = makeKey(
      'preview',
      normalizedQuery.resolution,
      normalizedQuery.worldX,
      normalizedQuery.worldY
    );
    return previewSurfaceHeightCache.getOrCreate(key, () => {
      const sampled = sampleWorldTerrainHeightInfluences({
        plugins: previewTerrainHeightInfluencePlugins,
        seed: seedHash,
        worldX: normalizedQuery.worldX,
        worldY: normalizedQuery.worldY,
        resolution: normalizedQuery.resolution,
      });
      return validateTerrainHeightValue(
        clampTerrainHeightValue(sampled.height),
        `Terrain height at ${normalizedQuery.worldX}:${normalizedQuery.worldY}`
      );
    });
  };
  const sampleTerrainSurface = (
    x: number,
    y: number,
    options: WorldTerrainHeightQueryOptions = {}
  ): WorldTerrainHeightSample => {
    const height = sampleTerrainHeight(x, y, options);
    return {
      worldX: x,
      worldY: y,
      height,
      seaLevel: WORLD_TERRAIN_SEA_LEVEL,
      depthBelowSeaLevel: Math.max(0, WORLD_TERRAIN_SEA_LEVEL - height),
    };
  };
  const sampleTerrainSlope = (
    x: number,
    y: number,
    options: number | WorldTerrainDerivativeQueryOptions = 1
  ): WorldTerrainSlopeSample => {
    const normalizedOptions = normalizeTerrainDerivativeQueryOptions(options);
    const leftHeight = sampleTerrainHeight(
      x - normalizedOptions.sampleStep,
      y,
      normalizedOptions
    );
    const rightHeight = sampleTerrainHeight(
      x + normalizedOptions.sampleStep,
      y,
      normalizedOptions
    );
    const downHeight = sampleTerrainHeight(
      x,
      y - normalizedOptions.sampleStep,
      normalizedOptions
    );
    const upHeight = sampleTerrainHeight(
      x,
      y + normalizedOptions.sampleStep,
      normalizedOptions
    );
    const slopeX =
      (rightHeight - leftHeight) / (normalizedOptions.sampleStep * 2);
    const slopeY = (upHeight - downHeight) / (normalizedOptions.sampleStep * 2);
    return {
      worldX: x,
      worldY: y,
      sampleStep: normalizedOptions.sampleStep,
      height: sampleTerrainHeight(x, y, normalizedOptions),
      slopeX,
      slopeY,
      grade: Math.hypot(slopeX, slopeY),
    };
  };
  const sampleTerrainAspect = (
    x: number,
    y: number,
    options: number | WorldTerrainDerivativeQueryOptions = 1
  ): WorldTerrainAspectSample => {
    const slope = sampleTerrainSlope(x, y, options);
    const aspectRadians =
      slope.grade <= WORLD_TERRAIN_FLAT_GRADE_EPSILON
        ? null
        : Math.atan2(slope.slopeY, slope.slopeX);
    return {
      worldX: x,
      worldY: y,
      sampleStep: slope.sampleStep,
      slopeX: slope.slopeX,
      slopeY: slope.slopeY,
      grade: slope.grade,
      aspectRadians,
    };
  };
  const sampleTerrainCurvature = (
    x: number,
    y: number,
    options: number | WorldTerrainDerivativeQueryOptions = 1
  ): WorldTerrainCurvatureSample => {
    const normalizedOptions = normalizeTerrainDerivativeQueryOptions(options);
    const centerHeight = sampleTerrainHeight(x, y, normalizedOptions);
    const leftHeight = sampleTerrainHeight(
      x - normalizedOptions.sampleStep,
      y,
      normalizedOptions
    );
    const rightHeight = sampleTerrainHeight(
      x + normalizedOptions.sampleStep,
      y,
      normalizedOptions
    );
    const downHeight = sampleTerrainHeight(
      x,
      y - normalizedOptions.sampleStep,
      normalizedOptions
    );
    const upHeight = sampleTerrainHeight(
      x,
      y + normalizedOptions.sampleStep,
      normalizedOptions
    );
    const denominator =
      normalizedOptions.sampleStep * normalizedOptions.sampleStep;
    const curvatureX =
      (leftHeight - 2 * centerHeight + rightHeight) / denominator;
    const curvatureY = (downHeight - 2 * centerHeight + upHeight) / denominator;
    return {
      worldX: x,
      worldY: y,
      sampleStep: normalizedOptions.sampleStep,
      height: centerHeight,
      curvatureX,
      curvatureY,
      curvatureMagnitude: Math.hypot(curvatureX, curvatureY),
    };
  };
  const sampleTerrainDrainageGradient = (
    x: number,
    y: number,
    options: number | WorldTerrainDerivativeQueryOptions = 1
  ): WorldTerrainDrainageGradientSample => {
    const normalizedOptions = normalizeTerrainDerivativeQueryOptions(options);
    const centerHeight = sampleTerrainHeight(x, y, normalizedOptions);
    const leftHeight = sampleTerrainHeight(
      x - normalizedOptions.sampleStep,
      y,
      normalizedOptions
    );
    const rightHeight = sampleTerrainHeight(
      x + normalizedOptions.sampleStep,
      y,
      normalizedOptions
    );
    const downHeight = sampleTerrainHeight(
      x,
      y - normalizedOptions.sampleStep,
      normalizedOptions
    );
    const upHeight = sampleTerrainHeight(
      x,
      y + normalizedOptions.sampleStep,
      normalizedOptions
    );
    const diagonalHeights = [
      sampleTerrainHeight(
        x - normalizedOptions.sampleStep,
        y - normalizedOptions.sampleStep,
        normalizedOptions
      ),
      sampleTerrainHeight(
        x + normalizedOptions.sampleStep,
        y - normalizedOptions.sampleStep,
        normalizedOptions
      ),
      sampleTerrainHeight(
        x - normalizedOptions.sampleStep,
        y + normalizedOptions.sampleStep,
        normalizedOptions
      ),
      sampleTerrainHeight(
        x + normalizedOptions.sampleStep,
        y + normalizedOptions.sampleStep,
        normalizedOptions
      ),
    ];
    const orthogonalHeights = [leftHeight, rightHeight, downHeight, upHeight];
    const allNeighborHeights = orthogonalHeights.concat(diagonalHeights);
    const downhillX =
      (leftHeight - rightHeight) / (normalizedOptions.sampleStep * 2);
    const downhillY =
      (downHeight - upHeight) / (normalizedOptions.sampleStep * 2);
    const downhillGrade = Math.hypot(downhillX, downhillY);
    const lowerNeighborCount = allNeighborHeights.filter(
      (height) => height < centerHeight
    ).length;
    const higherNeighborCount = allNeighborHeights.filter(
      (height) => height > centerHeight
    ).length;
    const convergence =
      (higherNeighborCount - lowerNeighborCount) / allNeighborHeights.length;
    return {
      worldX: x,
      worldY: y,
      sampleStep: normalizedOptions.sampleStep,
      height: centerHeight,
      downhillX,
      downhillY,
      downhillGrade,
      aspectRadians:
        downhillGrade <= WORLD_TERRAIN_FLAT_GRADE_EPSILON
          ? null
          : Math.atan2(downhillY, downhillX),
      lowerNeighborCount,
      higherNeighborCount,
      convergence,
    };
  };
  const sampleTerrainHeightRange = (
    bounds: WorldTerrainHeightRangeQueryOptions
  ): WorldTerrainHeightRangeSample => {
    const normalizedBounds = normalizeTerrainHeightRangeBounds(bounds);
    const key = makeKey(
      'terrain-height-range',
      normalizedBounds.minX,
      normalizedBounds.maxX,
      normalizedBounds.minY,
      normalizedBounds.maxY,
      normalizedBounds.sampleStep,
      normalizedBounds.resolution
    );
    return terrainHeightRangeCache.getOrCreate(key, () => {
      let minHeight = Number.POSITIVE_INFINITY;
      let maxHeight = Number.NEGATIVE_INFINITY;
      let sampleCount = 0;

      for (
        let sampleY = normalizedBounds.minY;
        sampleY <= normalizedBounds.maxY;
        sampleY += normalizedBounds.sampleStep
      ) {
        for (
          let sampleX = normalizedBounds.minX;
          sampleX <= normalizedBounds.maxX;
          sampleX += normalizedBounds.sampleStep
        ) {
          const height = sampleTerrainHeight(
            sampleX,
            sampleY,
            normalizedBounds
          );
          minHeight = Math.min(minHeight, height);
          maxHeight = Math.max(maxHeight, height);
          sampleCount += 1;
        }
      }

      return {
        ...normalizedBounds,
        sampleCount,
        minHeight: validateTerrainHeightValue(
          minHeight,
          'Terrain height range minimum'
        ),
        maxHeight: validateTerrainHeightValue(
          maxHeight,
          'Terrain height range maximum'
        ),
        heightRange: validateTerrainHeightValue(
          maxHeight - minHeight,
          'Terrain height range span'
        ),
      };
    });
  };
  const sampleTerrainSeaDepth = (
    x: number,
    y: number,
    options: WorldTerrainHeightQueryOptions = {}
  ): WorldTerrainSeaDepthSample => {
    const surface = sampleTerrainSurface(x, y, options);
    return {
      worldX: x,
      worldY: y,
      height: surface.height,
      seaLevel: surface.seaLevel,
      depthBelowSeaLevel: surface.depthBelowSeaLevel,
      isBelowSeaLevel: surface.depthBelowSeaLevel > 0,
    };
  };
  const terrainHeightSampler: WorldTerrainHeightSampler = {
    sampleHeight: sampleTerrainHeight,
    sampleSurface: sampleTerrainSurface,
    sampleSlope: sampleTerrainSlope,
    sampleAspect: sampleTerrainAspect,
    sampleCurvature: sampleTerrainCurvature,
    sampleDrainageGradient: sampleTerrainDrainageGradient,
    sampleHeightRange: sampleTerrainHeightRange,
    sampleSeaDepth: sampleTerrainSeaDepth,
  };

  return {
    getMap,
    sampleOverworld(x: number, y: number) {
      return getMap(OVERWORLD_CONTEXT).getTile(x, y) as SpawnTile;
    },
    samplePreviewSurfaceKind,
    terrainHeightSampler,
    sampleTerrainHeight,
    sampleTerrainSurface,
    sampleTerrainSlope,
    sampleTerrainAspect,
    sampleTerrainCurvature,
    sampleTerrainDrainageGradient,
    sampleTerrainHeightRange,
    sampleTerrainSeaDepth,
    samplePreviewSurfaceHeight: sampleTerrainHeight,
    samplePreviewOverworld(x: number, y: number) {
      const key = getPreviewKey(x, y);
      return previewTileCache.getOrCreate(key, () => {
        const kind = samplePreviewSurfaceKind(x, y);
        return {
          kind,
          surfaceHeight: sampleTerrainHeight(x, y),
        } as SpawnTile;
      });
    },
  };
}

function normalizeTerrainSampleStep(sampleStep: number): number {
  if (!(sampleStep > 0) || !Number.isFinite(sampleStep)) {
    throw new Error(
      'Terrain slope sampleStep must be a finite positive number.'
    );
  }
  return sampleStep;
}

function normalizeTerrainQueryResolution(
  options: WorldTerrainHeightQueryOptions = {}
): {
  resolution: WorldTerrainQueryResolution;
} {
  const resolution = options.resolution ?? 'coarse';
  if (resolution !== 'coarse' && resolution !== 'fine') {
    throw new Error(
      `Terrain query resolution "${String(resolution)}" must be "coarse" or "fine".`
    );
  }
  return { resolution };
}

function resolveTerrainQueryCoordinates(
  worldX: number,
  worldY: number,
  options: WorldTerrainHeightQueryOptions = {}
): {
  resolution: WorldTerrainQueryResolution;
  worldX: number;
  worldY: number;
} {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
    throw new Error('Terrain query coordinates must be finite numbers.');
  }
  const normalizedResolution = normalizeTerrainQueryResolution(options);
  const queryStep =
    normalizedResolution.resolution === 'fine'
      ? WORLD_TERRAIN_FINE_QUERY_STEP
      : WORLD_TERRAIN_COARSE_QUERY_STEP;
  return {
    resolution: normalizedResolution.resolution,
    worldX: Math.round(worldX / queryStep) * queryStep,
    worldY: Math.round(worldY / queryStep) * queryStep,
  };
}

function normalizeTerrainDerivativeQueryOptions(
  options: number | WorldTerrainDerivativeQueryOptions = 1
): Required<WorldTerrainDerivativeQueryOptions> {
  if (typeof options === 'number') {
    return {
      resolution: 'coarse',
      sampleStep: normalizeTerrainSampleStep(options),
    };
  }
  const resolution = normalizeTerrainQueryResolution(options).resolution;
  return {
    resolution,
    sampleStep: normalizeTerrainSampleStep(options.sampleStep ?? 1),
  };
}

function normalizeTerrainHeightRangeBounds(
  bounds: WorldTerrainHeightRangeQueryOptions
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  sampleStep: number;
  resolution: WorldTerrainQueryResolution;
} {
  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) {
    throw new Error(
      'Terrain height range bounds minX/maxX must be finite numbers.'
    );
  }
  if (!Number.isFinite(bounds.minY) || !Number.isFinite(bounds.maxY)) {
    throw new Error(
      'Terrain height range bounds minY/maxY must be finite numbers.'
    );
  }
  if (bounds.minX > bounds.maxX) {
    throw new Error(
      `Terrain height range bounds minX ${bounds.minX} must be <= maxX ${bounds.maxX}.`
    );
  }
  if (bounds.minY > bounds.maxY) {
    throw new Error(
      `Terrain height range bounds minY ${bounds.minY} must be <= maxY ${bounds.maxY}.`
    );
  }
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
    sampleStep: normalizeTerrainSampleStep(bounds.sampleStep ?? 1),
    resolution: normalizeTerrainQueryResolution(bounds).resolution,
  };
}

export function createDefaultRuntimePlugins(): RuntimePlugin[] {
  return createDefaultRuntimePluginsFromPack();
}

export function createDefaultTilePlugins(): RuntimePlugin[] {
  return createDefaultTilePluginsFromPack();
}

export function createDefaultPluginRegistry(): PluginRegistry {
  return createBuiltinContentPackCatalog().createRegistry([
    'default-content-pack',
  ]);
}

export function createBuiltinContentPackDefinitions(): PluginPackDefinitionLike[] {
  return [
    createDefaultContentPackDefinition(),
    createFrontierContentPackDefinition(),
    createRuinsContentPackDefinition(),
  ];
}

export function createBuiltinContentPackCatalog(): ReturnType<
  typeof createPluginPackCatalog
> {
  return createPluginPackCatalog(createBuiltinContentPackDefinitions(), [
    'default-content-pack',
    frontierContentPackManifest.id,
  ]);
}

export function listContentPacks(
  packDefinitions: PluginPackDefinitionLike[] = createBuiltinContentPackDefinitions()
): PluginPackManifestLike[] {
  return createPluginPackCatalog(packDefinitions).list();
}

export function listBuiltinContentPacks(): PluginPackManifestLike[] {
  return createBuiltinContentPackCatalog().list();
}

export function createPluginRegistryFromPacks(
  packIds: string[] = createBuiltinContentPackCatalog().defaultPackIds,
  packDefinitions: PluginPackDefinitionLike[] = createBuiltinContentPackDefinitions()
): PluginRegistry {
  return createPluginPackCatalog(packDefinitions, packIds).createRegistry();
}

export function createPluginRegistryFromPack(
  packId = 'default-content-pack',
  packDefinitions: PluginPackDefinitionLike[] = createBuiltinContentPackDefinitions()
): PluginRegistry {
  return createPluginRegistryFromPacks([packId], packDefinitions);
}

export function createWorldRuntime({
  seed = registerHashSeed('bworlds-alpha'),
  packIds = createBuiltinContentPackCatalog().defaultPackIds,
  packDefinitions = createBuiltinContentPackDefinitions(),
  player,
  stack,
  viewMode,
  activateRegistry = true,
}: {
  seed?: Seed;
  packIds?: string[];
  packDefinitions?: PluginPackDefinitionLike[];
  player?: Partial<RuntimePlayerLike>;
  stack?: WorldContextLike[];
  viewMode?: ViewMode;
  activateRegistry?: boolean;
} = {}): {
  contentPacks: PluginPackManifestLike[];
  generator: ReturnType<typeof createWorldGenerator>;
  registry: PluginRegistry;
  state: WorldStateLike & {
    stack: WorldContextLike[];
    viewMode: ViewMode;
  };
} {
  const packCatalog = createPluginPackCatalog(packDefinitions, packIds);
  const registry = packCatalog.createRegistry();
  if (activateRegistry) {
    setActivePluginRegistry(registry);
  }

  const generator = createWorldGenerator({
    seed,
    plugins: registry,
  });
  const state = createWorldState({
    generator,
    player: createPlayer(player),
    resolveTileDefinition(kind) {
      const fallback =
        registry.getDefaultTileDefinition(createFallbackTileDefinition(kind)) ??
        createFallbackTileDefinition(kind);
      return registry.resolveTileDefinition(kind, fallback);
    },
  }) as WorldStateLike & {
    stack: WorldContextLike[];
    viewMode: ViewMode;
  };

  if (viewMode === '2d' || viewMode === '3d' || viewMode === 'text') {
    state.viewMode = viewMode;
  }
  if (Array.isArray(stack) && stack.length > 0) {
    state.stack = stack;
  }

  return {
    contentPacks: packCatalog.listSelected(),
    generator,
    registry,
    state,
  };
}
