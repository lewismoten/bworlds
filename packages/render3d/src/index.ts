import * as THREE from 'three';
import { createCoordinateCache, getOrCreateMapValue } from '@bworlds/cache-support';
import {
  getTileAtlasCanvas,
  getTilePixelSize,
  getTileSpriteRect,
  getTileVariantIndex,
} from '@bworlds/atlas';
import {
  applyCelestialEnvironmentOverrides,
  clamp,
  getDaylightCycleState,
  getMilkyWayBandSamples,
  hash2D,
  lerp,
  registerHashLabel,
  smoothstep,
} from '@bworlds/core';
import { isWaterKind } from '@bworlds/tile-support';
import {
  getActivePluginRegistry,
  getRenderParticleEmitterMetadata,
  getRenderBudgetPartMetadata,
  hasRenderBudgetPartMetadata,
  type Model3DResourceCostEstimate,
  type RenderBudget,
  type RenderBudgetDetailLevel,
  type TileLike,
  type TilePlugin,
  type ViewMode,
  type WorldEnvironmentLike,
  type SurfaceBoundaryRole3D,
  type TileDefinitionLike,
  type WorldStateLike,
} from '@bworlds/plugin-api';
import {
  countGeometriesExceedingBounds,
  countGeometryTriangles,
  countInvalidGeometryIndexTypes,
  countInvalidGeometryCoordinateSets,
  countIndexedVertices,
  countLineSegments,
  countPointVertices,
  countUltraDenseTinyGeometries,
  getGeometryAttributeBudgetStats,
  getGeometryStructureBudgetStats,
  getMaxGeometryTriangleCount,
  getGeometryVertexCount,
} from './tile-model-geometry-validation.ts';
import { pruneTileModelOptionalPartsForBudget } from './tile-model-budget-pruning.ts';
import {
  getTileModelCostEstimateBudgetViolations,
  summarizeTileModelCostEstimateBudgetViolations,
  type TileModelCostEstimateBudgetViolation,
  type TileModelCostEstimateLimits,
} from './tile-model-cost-estimate-validation.ts';
import {
  buildPendingWorldBuildQueue,
  createPendingWorldBuildQueueScratch,
  reconcilePendingWorldBuildQueue,
  reconcilePendingWorldBuildQueueWithScratch,
  type PendingWorldBuildEntry,
} from './pending-world-build-queue.ts';
import { collectMaterialTexturesInto } from './material-texture-collector.ts';
import { collectRecentWindowedEvents } from './recent-windowed-events.ts';
import { getRenderEffectQualityProfile } from './render-effect-quality.ts';
import {
  createVisibleWorldBuildOrderScratch,
  fillVisibleWorldTileBuildOrder,
} from './visible-world-build-order.ts';
import {
  createPendingWorldBuildState,
  createWorldVisibilitySyncState,
  matchesPendingWorldBuildState,
  matchesWorldVisibilitySyncState,
  updatePendingWorldBuildState,
  updateWorldVisibilitySyncState,
} from './world-visibility-sync-state.ts';
import {
  createSkyLightingColorState,
  updateSkyLightingColorState,
} from './sky-lighting-colors.ts';
import {
  collectMapEntriesInto,
  fillWrappedBatchWindow,
  getWrappedBatchWindow,
} from './reusable-batch-window.ts';
import { runTileModelSafetyPrecheck } from './tile-model-safety-precheck.ts';

export {
  collectMapEntriesInto,
  fillWrappedBatchWindow,
  getWrappedBatchWindow,
} from './reusable-batch-window.ts';
export {
  buildPendingWorldBuildQueue,
  createPendingWorldBuildQueueScratch,
  reconcilePendingWorldBuildQueue,
  reconcilePendingWorldBuildQueueWithScratch,
} from './pending-world-build-queue.ts';
export { collectMaterialTexturesInto } from './material-texture-collector.ts';
export { collectRecentWindowedEvents } from './recent-windowed-events.ts';
export {
  createVisibleWorldBuildOrderScratch,
  fillVisibleWorldTileBuildOrder,
} from './visible-world-build-order.ts';
export {
  createPendingWorldBuildState,
  createWorldVisibilitySyncState,
  matchesPendingWorldBuildState,
  matchesWorldVisibilitySyncState,
  updatePendingWorldBuildState,
  updateWorldVisibilitySyncState,
} from './world-visibility-sync-state.ts';

const LAND_MODEL_REVEAL_SEED = registerHashLabel('render3d:land-model-reveal');

type CelestialEnvironmentOverrides = Parameters<
  typeof applyCelestialEnvironmentOverrides
>[1];
type DaylightCycleState = ReturnType<typeof getDaylightCycleState>;
type SkySignatureCycle = Pick<
  DaylightCycleState,
  | 'activeConstellationIndex'
  | 'daylight'
  | 'moonAltitude'
  | 'moonAzimuth'
  | 'moonIllumination'
  | 'night'
  | 'observerLatitudeDegrees'
  | 'solarEclipse'
  | 'yearProgress'
  | 'sunAltitude'
  | 'sunAzimuth'
  | 'starsOpacity'
  | 'twilight'
  | 'visibleEvents'
  | 'milkyWay'
  | 'auroraBands'
>;
type CachedSkyPose = {
  sunOrbitX: number;
  sunOrbitY: number;
  sunOrbitZ: number;
  moonOrbitX: number;
  moonOrbitY: number;
  moonOrbitZ: number;
  skyRotationZ: number;
  sunSpriteX: number;
  sunSpriteY: number;
  sunSpriteZ: number;
  sunSpriteOpacity: number;
  moonSpriteX: number;
  moonSpriteY: number;
  moonSpriteZ: number;
  moonSpriteOpacity: number;
};
type Render3DState = WorldStateLike & {
  viewMode?: ViewMode;
};
const STAR_THETA_SEED = registerHashLabel('star-theta');
const STAR_PHI_SEED = registerHashLabel('star-phi');
const STAR_RADIUS_SEED = registerHashLabel('star-radius');
const STAR_BRIGHTNESS_SEED = registerHashLabel('star-brightness');
const STAR_SCALE_SEED = registerHashLabel('star-scale');
const STAR_DRIFT_SEED = registerHashLabel('star-drift');
type Render3DOptions = {
  jumpHeight?: number;
  timeMs?: number;
  environment?: WorldEnvironmentLike;
  cameraPitch?: number;
  cameraBobOffset?: number;
  visibilityRadius?: number;
  renderBudget?: RenderBudget;
  generationBudgetMs?: number;
  pendingBuildBudgetMs?: number;
  maxPendingBuildTiles?: number;
};
type Render3DController = {
  canOccupy(state: Render3DState, nextX: number, nextY: number): boolean;
  getStats(): {
    drawCalls: number;
    triangles: number;
    points: number;
    lines: number;
    sceneChildCount: number;
    visibleTileCount: number;
    visibleTreeCount: number;
    pendingTileCount: number;
    averagePendingFlushTiles: number;
    maxPendingFlushTiles: number;
    averageTileBuildMs: number;
    maxTileBuildMs: number;
    averageTilePluginBuildMs: number;
    maxTilePluginBuildMs: number;
    slowestTilePluginLabel: string;
    tileModelBudgetViolationsPerSecond: number;
    tileModelBudgetViolationTopPluginLabel: string;
    tileModelBudgetViolationSummary: string;
    recentEvents: Render3DDebugEvent[];
    tileNodeBuildsPerSecond: number;
    tileBuildsPerSecond: number;
    pendingCancelledEntriesPerSecond: number;
    lodChecksPerSecond: number;
    lodReplacementsPerSecond: number;
    object3dCount: number;
    visibleObjectCount: number;
    invisibleObjectCount: number;
    groupCount: number;
    meshCount: number;
    instancedMeshCount: number;
    visibleInstancedMeshCount: number;
    renderedInstanceCount: number;
    visibleMeshCount: number;
    maxHierarchyDepth: number;
    averageHierarchyDepth: number;
    emptyGroupCount: number;
    oneChildGroupCount: number;
    matrixAutoUpdateCount: number;
    staticMatrixAutoUpdateCount: number;
    pointsCount: number;
    lineObjectCount: number;
    cameraCount: number;
    activeParticleSystemCount: number;
    activeParticleCount: number;
    spriteCount: number;
    lightCount: number;
    ambientLightCount: number;
    directionalLightCount: number;
    pointLightCount: number;
    spotLightCount: number;
    hemisphereLightCount: number;
    dynamicLightCount: number;
    shadowLightCount: number;
    vertexCount: number;
    materialRefCount: number;
    geometryRefCount: number;
    materialCount: number;
    sharedMaterialCount: number;
    clonedMaterialCount: number;
    transparentMaterialCount: number;
    alphaTestMaterialCount: number;
    doubleSidedMaterialCount: number;
    fogMaterialCount: number;
    customShaderMaterialCount: number;
    materialTypes: string;
    materialsCreatedDuringSamplingWindow: number;
    materialsDisposedDuringSamplingWindow: number;
    geometryCount: number;
    sharedGeometryCount: number;
    geometryBytes: number;
    vertexBufferBytes: number;
    indexBufferBytes: number;
    averageVerticesPerGeometry: number;
    largestGeometryVertexCount: number;
    largestGeometryBytes: number;
    textureMemoryEstimateBytes: number;
    gpuGeometryCount: number;
    treeObjectCount: number;
    treeMeshCount: number;
    treeMaterialRefCount: number;
    visibleTileKindSummary: string;
    textureCount: number;
    programCount: number;
  };
  render(state: Render3DState, options?: Render3DOptions): void;
  resize(width: number, height: number, pixelRatio?: number): void;
};

export type Render3DDebugEvent = {
  nowMs: number;
  type: 'lod-changed' | 'model-rejected' | 'plugin-exceeded-budget';
  tileKey?: string;
  plugin?: string;
  summary?: string;
  fromDetailLevel?: RenderBudgetDetailLevel;
  toDetailLevel?: RenderBudgetDetailLevel;
};

export function createTilePluginRenderBudget(
  renderBudget: RenderBudget | undefined,
  detailLevel: RenderBudgetDetailLevel,
  remainingGenerationBudgetMs?: number
): RenderBudget | undefined {
  if (!renderBudget) {
    return undefined;
  }

  return {
    ...renderBudget,
    detailLevel,
    frame: {
      ...renderBudget.frame,
      remainingGenerationBudgetMs:
        remainingGenerationBudgetMs ??
        renderBudget.frame.remainingGenerationBudgetMs ??
        renderBudget.frame.generationBudgetMs,
    },
  };
}

const FULL_DETAIL_TILE_MODEL_HARD_LIMITS: TileModelHardLimits = {
  object3dCount: 128,
  groupCount: 64,
  meshCount: 96,
  instancedMeshCount: 16,
  pointsCount: 8,
  particleEmitterCount: 2,
  lineObjectCount: 12,
  spriteCount: 12,
  geometryCount: 96,
  invalidPositionCoordinateCount: 0,
  pointVertexCount: 1_024,
  lineSegmentCount: 1_024,
  oversizedGeometryBoundsCount: 0,
  maxGeometryVertexCount: 25_000,
  indexedVertexCount: 75_000,
  maxGeometryTriangleCount: 25_000,
  triangleCount: 50_000,
  maxGeometryAttributeCount: 10,
  maxCustomGeometryAttributeCount: 4,
  maxGeometryVertexAttributeByteSize: 1_200_000,
  maxGeometryGroupCount: 12,
  maxGeometryDrawRangeCount: 0,
  invalidGeometryIndexTypeCount: 0,
  invalidRenderBudgetPartMetadataCount: 0,
  ultraDenseTinyGeometryCount: 0,
  materialCount: 16,
  textureCount: 16,
  lightCount: 4,
  shadowLightCount: 1,
  vertexCount: 50_000,
};

const LOW_DETAIL_TILE_MODEL_HARD_LIMITS: TileModelHardLimits = {
  object3dCount: 32,
  groupCount: 16,
  meshCount: 16,
  instancedMeshCount: 4,
  pointsCount: 2,
  particleEmitterCount: 1,
  lineObjectCount: 4,
  spriteCount: 2,
  geometryCount: 16,
  invalidPositionCoordinateCount: 0,
  pointVertexCount: 128,
  lineSegmentCount: 128,
  oversizedGeometryBoundsCount: 0,
  maxGeometryVertexCount: 1_500,
  indexedVertexCount: 12_000,
  maxGeometryTriangleCount: 1_000,
  triangleCount: 3_000,
  maxGeometryAttributeCount: 6,
  maxCustomGeometryAttributeCount: 2,
  maxGeometryVertexAttributeByteSize: 192_000,
  maxGeometryGroupCount: 4,
  maxGeometryDrawRangeCount: 0,
  invalidGeometryIndexTypeCount: 0,
  invalidRenderBudgetPartMetadataCount: 0,
  ultraDenseTinyGeometryCount: 0,
  materialCount: 3,
  textureCount: 4,
  lightCount: 1,
  shadowLightCount: 0,
  vertexCount: 8_000,
};

export function getTileModelHardLimits(
  detailLevel: RenderBudgetDetailLevel = 'full'
): TileModelHardLimits {
  return detailLevel === 'low'
    ? LOW_DETAIL_TILE_MODEL_HARD_LIMITS
    : FULL_DETAIL_TILE_MODEL_HARD_LIMITS;
}

export function validateTileModelAgainstRenderBudget(
  root: Pick<THREE.Object3D, 'traverse' | 'children' | 'type'>,
  detailLevel: RenderBudgetDetailLevel = 'full'
): TileModelBudgetValidation {
  const limits = getTileModelHardLimits(detailLevel);
  const safetyPrecheck = runTileModelSafetyPrecheck(root as never, limits);
  if (safetyPrecheck.exceeded) {
    return {
      accepted: false,
      stats: {
        ...createEmptySceneResourceStats(),
        object3dCount: safetyPrecheck.stats.object3dCount,
        groupCount: safetyPrecheck.stats.groupCount,
        meshCount: safetyPrecheck.stats.meshCount,
        instancedMeshCount: safetyPrecheck.stats.instancedMeshCount,
        pointsCount: safetyPrecheck.stats.pointsCount,
        lineObjectCount: safetyPrecheck.stats.lineObjectCount,
        spriteCount: safetyPrecheck.stats.spriteCount,
        geometryCount: safetyPrecheck.stats.geometryCount,
        lightCount: safetyPrecheck.stats.lightCount,
        shadowLightCount: safetyPrecheck.stats.shadowLightCount,
        invalidPositionCoordinateCount: 0,
        pointVertexCount: safetyPrecheck.stats.pointVertexCount,
        particleEmitterCount: safetyPrecheck.stats.particleEmitterCount,
        lineSegmentCount: safetyPrecheck.stats.lineSegmentCount,
        oversizedGeometryBoundsCount: 0,
        maxGeometryVertexCount: safetyPrecheck.stats.maxGeometryVertexCount,
        indexedVertexCount: safetyPrecheck.stats.indexedVertexCount,
        maxGeometryTriangleCount: safetyPrecheck.stats.maxGeometryTriangleCount,
        triangleCount: safetyPrecheck.stats.triangleCount,
        maxGeometryAttributeCount: 0,
        maxCustomGeometryAttributeCount: 0,
        maxGeometryVertexAttributeByteSize: 0,
        maxGeometryGroupCount: 0,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
      },
      limits,
      violations: safetyPrecheck.violations,
    };
  }
  const maximumGeometryAxisSpan =
    detailLevel === 'low'
      ? LOW_DETAIL_MAX_GEOMETRY_AXIS_SPAN
      : FULL_DETAIL_MAX_GEOMETRY_AXIS_SPAN;
  const sceneResourceStats = collectSceneResourceStats(root);
  const geometryAttributeBudgetStats = getGeometryAttributeBudgetStats(root);
  const geometryStructureBudgetStats = getGeometryStructureBudgetStats(root);
  const stats = {
    ...sceneResourceStats,
    invalidPositionCoordinateCount: countInvalidGeometryCoordinateSets(root),
    pointVertexCount: countPointVertices(root),
    particleEmitterCount: countParticleEmitters(root),
    lineSegmentCount: countLineSegments(root),
    oversizedGeometryBoundsCount: countGeometriesExceedingBounds(
      root,
      maximumGeometryAxisSpan
    ),
    maxGeometryVertexCount: sceneResourceStats.largestGeometryVertexCount,
    indexedVertexCount: countIndexedVertices(root),
    maxGeometryTriangleCount: getMaxGeometryTriangleCount(root),
    triangleCount: countGeometryTriangles(root),
    maxGeometryAttributeCount: geometryAttributeBudgetStats.maxAttributeCount,
    maxCustomGeometryAttributeCount:
      geometryAttributeBudgetStats.maxCustomAttributeCount,
    maxGeometryVertexAttributeByteSize:
      geometryAttributeBudgetStats.maxVertexAttributeByteSize,
    maxGeometryGroupCount: geometryStructureBudgetStats.maxGeometryGroupCount,
    maxGeometryDrawRangeCount:
      geometryStructureBudgetStats.maxGeometryDrawRangeCount,
    invalidGeometryIndexTypeCount: countInvalidGeometryIndexTypes(root),
    invalidRenderBudgetPartMetadataCount:
      countInvalidRenderBudgetPartMetadata(root),
    ultraDenseTinyGeometryCount: countUltraDenseTinyGeometries(root, {
      maximumAxisSpan: ULTRA_DENSE_GEOMETRY_MAX_AXIS_SPAN,
      minimumTriangleCount: ULTRA_DENSE_GEOMETRY_MIN_TRIANGLES,
    }),
  };
  const violations: TileModelBudgetViolation[] = [];
  const metrics: Array<keyof TileModelHardLimits> = [
    'object3dCount',
    'groupCount',
    'meshCount',
    'instancedMeshCount',
    'pointsCount',
    'lineObjectCount',
    'spriteCount',
    'geometryCount',
    'invalidPositionCoordinateCount',
    'pointVertexCount',
    'particleEmitterCount',
    'lineSegmentCount',
    'oversizedGeometryBoundsCount',
    'maxGeometryVertexCount',
    'indexedVertexCount',
    'maxGeometryTriangleCount',
    'triangleCount',
    'maxGeometryAttributeCount',
    'maxCustomGeometryAttributeCount',
    'maxGeometryVertexAttributeByteSize',
    'maxGeometryGroupCount',
    'maxGeometryDrawRangeCount',
    'invalidGeometryIndexTypeCount',
    'invalidRenderBudgetPartMetadataCount',
    'ultraDenseTinyGeometryCount',
    'materialCount',
    'textureCount',
    'lightCount',
    'shadowLightCount',
    'vertexCount',
  ];

  for (const metric of metrics) {
    const actual = stats[metric];
    const limit = limits[metric];
    if (actual > limit) {
      violations.push({ metric, actual, limit });
    }
  }

  return {
    accepted: violations.length === 0,
    stats,
    limits,
    violations,
  };
}

export function acceptTilePluginModelForRenderBudget<
  TObject extends Pick<THREE.Object3D, 'traverse' | 'children' | 'type'>
>(
  model: TObject,
  detailLevel: RenderBudgetDetailLevel = 'full'
): TObject | null {
  return acceptTilePluginModelForRenderBudgetWithResult(model, detailLevel).model;
}

export function acceptTilePluginModelForRenderBudgetWithResult<
  TObject extends Pick<THREE.Object3D, 'traverse' | 'children' | 'type'>
>(
  model: TObject,
  detailLevel: RenderBudgetDetailLevel = 'full'
): {
  model: TObject | null;
  removedParts: Array<{ label?: string; priority: number }>;
} {
  const validation = validateTileModelAgainstRenderBudget(model, detailLevel);
  if (validation.accepted) {
    return {
      model,
      removedParts: [],
    };
  }
  const pruned = pruneTileModelOptionalPartsForBudget(
    model as TObject & Pick<THREE.Object3D, 'userData'>,
    (candidate) => validateTileModelAgainstRenderBudget(candidate, detailLevel)
  );
  if (pruned.validation.accepted) {
    return {
      model,
      removedParts: pruned.removedParts.map((part) => ({
        priority: part.priority,
        ...(typeof part.label === 'string' ? { label: part.label } : {}),
      })),
    };
  }
  disposeObject3DResources(model);
  return {
    model: null,
    removedParts: pruned.removedParts.map((part) => ({
      priority: part.priority,
      ...(typeof part.label === 'string' ? { label: part.label } : {}),
    })),
  };
}

export function summarizeRemovedTileModelBudgetParts(
  removedParts: Array<{ label?: string; priority: number }>
): string {
  if (removedParts.length === 0) {
    return '';
  }
  return removedParts
    .map((part) =>
      typeof part.label === 'string'
        ? `${part.label}@${part.priority}`
        : `unnamed@${part.priority}`
    )
    .join(', ');
}

export function getTileModelCostEstimateLimits(
  detailLevel: RenderBudgetDetailLevel = 'full'
): TileModelCostEstimateLimits {
  const limits = getTileModelHardLimits(detailLevel);
  return {
    object3dCount: limits.object3dCount,
    groupCount: limits.groupCount,
    meshCount: limits.meshCount,
    instancedMeshCount: limits.instancedMeshCount,
    pointsCount: limits.pointsCount,
    lineObjectCount: limits.lineObjectCount,
    spriteCount: limits.spriteCount,
    geometryCount: limits.geometryCount,
    materialCount: limits.materialCount,
    textureCount: limits.textureCount,
    lightCount: limits.lightCount,
    shadowLightCount: limits.shadowLightCount,
    vertexCount: limits.vertexCount,
    triangleCount: limits.triangleCount,
  };
}

export function validateTileModelCostEstimateAgainstRenderBudget(
  estimate: Model3DResourceCostEstimate,
  detailLevel: RenderBudgetDetailLevel = 'full'
): {
  accepted: boolean;
  estimate: Model3DResourceCostEstimate;
  limits: TileModelCostEstimateLimits;
  violations: TileModelCostEstimateBudgetViolation[];
} {
  const limits = getTileModelCostEstimateLimits(detailLevel);
  const violations = getTileModelCostEstimateBudgetViolations(estimate, limits);
  return {
    accepted: violations.length === 0,
    estimate,
    limits,
    violations,
  };
}

export function summarizeTileModelBudgetViolations(
  violations: TileModelBudgetViolation[]
): string {
  return violations
    .map((violation) => `${violation.metric} ${violation.actual}>${violation.limit}`)
    .join(', ');
}

export function recordRenderDebugEvent(
  events: Render3DDebugEvent[],
  event: Render3DDebugEvent,
  maxEntries = MAX_RENDER_DEBUG_EVENTS
): void {
  events.push(event);
  if (events.length > maxEntries) {
    events.splice(0, events.length - maxEntries);
  }
}

export function getRecentRenderDebugEvents(
  events: Render3DDebugEvent[],
  nowMs: number,
  {
    windowMs = RENDER_DEBUG_EVENT_WINDOW_MS,
    maxEntries = MAX_RENDER_DEBUG_EVENTS,
  }: {
    windowMs?: number;
    maxEntries?: number;
  } = {}
): Render3DDebugEvent[] {
  return collectRecentWindowedEvents(events, nowMs, {
    windowMs,
    maxEntries,
  });
}

type DynamicTileNode = {
  key: string;
  tile: TileLike;
  tileX: number;
  tileY: number;
  node: THREE.Group;
  model: unknown;
  modelRoot?: THREE.Object3D | null;
  modelVisibilityOpacity?: number;
  distanceFadeEligible?: boolean;
  detailLevel?: RenderBudgetDetailLevel;
  sync3DModel?: NonNullable<TilePlugin['sync3DModel']>;
};
type ConstellationStarLike = NonNullable<
  NonNullable<DaylightCycleState['constellations']>[number]
>['stars'][number];
type ShadowSettingsOptions = {
  castShadow: boolean;
  receiveShadow: boolean;
};

type DecoratedSurfaceTile = {
  surfaceHeight?: unknown;
};

type TileSurfaceProfile = {
  surfaceHeight: number;
  boundaryRole: SurfaceBoundaryRole3D | null;
  underlayKind: string | null;
  chamferEligible: boolean;
  boundaryTransition: {
    bodyInset?: number;
    maxChamferDrop?: number;
    minBankHeight?: number;
  } | null;
};

type TileBuildCache = {
  getTile(tileX: number, tileY: number): TileLike;
  getSurfaceProfile(
    tileX: number,
    tileY: number,
    tile?: TileLike
  ): TileSurfaceProfile;
};

type SceneResourceStats = {
  object3dCount: number;
  visibleObjectCount: number;
  invisibleObjectCount: number;
  groupCount: number;
  meshCount: number;
  instancedMeshCount: number;
  visibleInstancedMeshCount: number;
  renderedInstanceCount: number;
  visibleMeshCount: number;
  maxHierarchyDepth: number;
  averageHierarchyDepth: number;
  emptyGroupCount: number;
  oneChildGroupCount: number;
  matrixAutoUpdateCount: number;
  staticMatrixAutoUpdateCount: number;
  pointsCount: number;
  lineObjectCount: number;
  cameraCount: number;
  activeParticleSystemCount: number;
  activeParticleCount: number;
  spriteCount: number;
  lightCount: number;
  ambientLightCount: number;
  directionalLightCount: number;
  pointLightCount: number;
  spotLightCount: number;
  hemisphereLightCount: number;
  dynamicLightCount: number;
  shadowLightCount: number;
  vertexCount: number;
  materialRefCount: number;
  geometryRefCount: number;
  materialCount: number;
  sharedMaterialCount: number;
  clonedMaterialCount: number;
  transparentMaterialCount: number;
  alphaTestMaterialCount: number;
  doubleSidedMaterialCount: number;
  fogMaterialCount: number;
  customShaderMaterialCount: number;
  materialTypes: string;
  materialsCreatedDuringSamplingWindow: number;
  materialsDisposedDuringSamplingWindow: number;
  geometryCount: number;
  sharedGeometryCount: number;
  geometryBytes: number;
  vertexBufferBytes: number;
  indexBufferBytes: number;
  averageVerticesPerGeometry: number;
  largestGeometryVertexCount: number;
  largestGeometryBytes: number;
  textureCount: number;
  textureMemoryEstimateBytes: number;
  treeCount: number;
  treeObjectCount: number;
  treeMeshCount: number;
  treeMaterialRefCount: number;
};

type TileModelHardLimits = {
  object3dCount: number;
  groupCount: number;
  meshCount: number;
  instancedMeshCount: number;
  pointsCount: number;
  particleEmitterCount: number;
  lineObjectCount: number;
  spriteCount: number;
  geometryCount: number;
  invalidPositionCoordinateCount: number;
  pointVertexCount: number;
  lineSegmentCount: number;
  oversizedGeometryBoundsCount: number;
  maxGeometryVertexCount: number;
  indexedVertexCount: number;
  maxGeometryTriangleCount: number;
  triangleCount: number;
  maxGeometryAttributeCount: number;
  maxCustomGeometryAttributeCount: number;
  maxGeometryVertexAttributeByteSize: number;
  maxGeometryGroupCount: number;
  maxGeometryDrawRangeCount: number;
  invalidGeometryIndexTypeCount: number;
  invalidRenderBudgetPartMetadataCount: number;
  ultraDenseTinyGeometryCount: number;
  materialCount: number;
  textureCount: number;
  lightCount: number;
  shadowLightCount: number;
  vertexCount: number;
};

type TileModelBudgetViolation = {
  metric: keyof TileModelHardLimits;
  actual: number;
  limit: number;
};

type TileModelBudgetValidation = {
  accepted: boolean;
  stats: SceneResourceStats & {
    invalidPositionCoordinateCount: number;
    pointVertexCount: number;
    particleEmitterCount: number;
    lineSegmentCount: number;
    oversizedGeometryBoundsCount: number;
    maxGeometryVertexCount: number;
    indexedVertexCount: number;
    maxGeometryTriangleCount: number;
    triangleCount: number;
    maxGeometryAttributeCount: number;
    maxCustomGeometryAttributeCount: number;
    maxGeometryVertexAttributeByteSize: number;
    maxGeometryGroupCount: number;
    maxGeometryDrawRangeCount: number;
    invalidGeometryIndexTypeCount: number;
    invalidRenderBudgetPartMetadataCount: number;
    ultraDenseTinyGeometryCount: number;
  };
  limits: TileModelHardLimits;
  violations: TileModelBudgetViolation[];
};

type RecentDurationSample = {
  nowMs: number;
  durationMs: number;
};

type RecentLabeledDurationSample = RecentDurationSample & {
  label: string;
};

type RecentCountSample = {
  nowMs: number;
  count: number;
};

type RecentLabeledCountSample = RecentCountSample & {
  label: string;
};

const MAX_RENDER_DEBUG_EVENTS = 64;
const RENDER_DEBUG_EVENT_WINDOW_MS = 30_000;
const FULL_DETAIL_MAX_GEOMETRY_AXIS_SPAN = 24;
const LOW_DETAIL_MAX_GEOMETRY_AXIS_SPAN = 16;
const ULTRA_DENSE_GEOMETRY_MAX_AXIS_SPAN = 0.2;
const ULTRA_DENSE_GEOMETRY_MIN_TRIANGLES = 256;

function createEmptySceneResourceStats(): SceneResourceStats {
  return {
    object3dCount: 0,
    visibleObjectCount: 0,
    invisibleObjectCount: 0,
    groupCount: 0,
    meshCount: 0,
    instancedMeshCount: 0,
    visibleInstancedMeshCount: 0,
    renderedInstanceCount: 0,
    visibleMeshCount: 0,
    maxHierarchyDepth: 0,
    averageHierarchyDepth: 0,
    emptyGroupCount: 0,
    oneChildGroupCount: 0,
    matrixAutoUpdateCount: 0,
    staticMatrixAutoUpdateCount: 0,
    pointsCount: 0,
    lineObjectCount: 0,
    cameraCount: 0,
    activeParticleSystemCount: 0,
    activeParticleCount: 0,
    spriteCount: 0,
    lightCount: 0,
    ambientLightCount: 0,
    directionalLightCount: 0,
    pointLightCount: 0,
    spotLightCount: 0,
    hemisphereLightCount: 0,
    dynamicLightCount: 0,
    shadowLightCount: 0,
    vertexCount: 0,
    materialRefCount: 0,
    geometryRefCount: 0,
    materialCount: 0,
    sharedMaterialCount: 0,
    clonedMaterialCount: 0,
    transparentMaterialCount: 0,
    alphaTestMaterialCount: 0,
    doubleSidedMaterialCount: 0,
    fogMaterialCount: 0,
    customShaderMaterialCount: 0,
    materialTypes: '',
    materialsCreatedDuringSamplingWindow: 0,
    materialsDisposedDuringSamplingWindow: 0,
    geometryCount: 0,
    sharedGeometryCount: 0,
    geometryBytes: 0,
    vertexBufferBytes: 0,
    indexBufferBytes: 0,
    averageVerticesPerGeometry: 0,
    largestGeometryVertexCount: 0,
    largestGeometryBytes: 0,
    textureCount: 0,
    textureMemoryEstimateBytes: 0,
    treeCount: 0,
    treeObjectCount: 0,
    treeMeshCount: 0,
    treeMaterialRefCount: 0,
  };
}

function countInvalidRenderBudgetPartMetadata(
  root: Pick<THREE.Object3D, 'traverse'>
): number {
  let invalidCount = 0;

  root.traverse((child) => {
    const object = child as Pick<THREE.Object3D, 'userData'>;
    if (!hasRenderBudgetPartMetadata(object)) {
      return;
    }
    if (getRenderBudgetPartMetadata(object) !== null) {
      return;
    }
    invalidCount += 1;
  });

  return invalidCount;
}

function countParticleEmitters(root: Pick<THREE.Object3D, 'traverse'>): number {
  let emitterCount = 0;

  root.traverse((child) => {
    if (getRenderParticleEmitterMetadata(child as Pick<THREE.Object3D, 'userData'>)) {
      emitterCount += 1;
    }
  });

  return emitterCount;
}

type FrameTimeBudget = {
  budgetMs: number;
  startMs: number;
};

export type LodThresholdSummary = {
  lowDetailDistance: number;
  lowDetailEnterDistance: number;
  lowDetailExitDistance: number;
  hysteresisDistance: number;
  pendingBuildFullDetailDistance: number;
  syncMovementDistance: number;
};

type RenderChurnMetrics = {
  tileNodeBuilds: number[];
  tileBuilds: number[];
  pendingCancelledEntries: number[];
  lodChecks: number[];
  lodReplacements: number[];
  pendingFlushCounts: RecentCountSample[];
  tileBuildDurations: RecentDurationSample[];
  tilePluginBuildDurations: RecentLabeledDurationSample[];
  tileModelBudgetViolations: RecentLabeledCountSample[];
};

const TILE_SIZE = 1;
const CHUNK_RADIUS = 18;
const NEAR_VISIBLE_RADIUS = 6;
const FACING_BUCKETS = 12;
const WORLD_SYNC_BATCH_SIZE = 28;
const LOD_SYNC_BATCH_SIZE = 28;
const DEFAULT_PENDING_WORLD_BUILD_BUDGET_MS = 2.5;
const LOW_DETAIL_MODEL_DISTANCE = 6.5;
const LOW_DETAIL_MODEL_DISTANCE_SQUARED =
  LOW_DETAIL_MODEL_DISTANCE * LOW_DETAIL_MODEL_DISTANCE;
const LANDMARK_LOW_DETAIL_MODEL_DISTANCE = 13.5;
const LOD_DETAIL_HYSTERESIS_DISTANCE = 0.5;
const LOW_DETAIL_ENTER_DISTANCE_SQUARED = LOW_DETAIL_MODEL_DISTANCE_SQUARED;
const LOW_DETAIL_EXIT_DISTANCE =
  LOW_DETAIL_MODEL_DISTANCE - LOD_DETAIL_HYSTERESIS_DISTANCE;
const LOW_DETAIL_EXIT_DISTANCE_SQUARED =
  LOW_DETAIL_EXIT_DISTANCE * LOW_DETAIL_EXIT_DISTANCE;
const PENDING_BUILD_FULL_DETAIL_DISTANCE = 3;
const PENDING_BUILD_FULL_DETAIL_DISTANCE_SQUARED =
  PENDING_BUILD_FULL_DETAIL_DISTANCE * PENDING_BUILD_FULL_DETAIL_DISTANCE;
const PENDING_BUILD_LOW_DETAIL_QUEUE_THRESHOLD = 28;
const LOD_SYNC_MOVEMENT_DISTANCE = 0.18;
const LOD_SYNC_MOVEMENT_DISTANCE_SQUARED =
  LOD_SYNC_MOVEMENT_DISTANCE * LOD_SYNC_MOVEMENT_DISTANCE;
const FAR_MODEL_FULL_VISIBILITY_DISTANCE = 8;
const FAR_MODEL_REVEAL_DISTANCE_VARIANCE = 8;
const FAR_MODEL_FADE_DISTANCE = 1.75;
const MODEL_VISIBILITY_OPACITY_EPSILON = 0.0005;
const MIN_MODEL_VISIBILITY_OPACITY = 0.015;
const HORIZON_CURVATURE_FLAT_DISTANCE = 4;
const HORIZON_CURVATURE_FAR_DISTANCE = CHUNK_RADIUS;
const HORIZON_CURVATURE_MAX_DROP = 1.2;
const FLOOR_THICKNESS = 0.03;
const WATER_FLOOR_THICKNESS = 0.28;
const RIVER_WALL_THICKNESS = 0.05;
const SKY_RADIUS = 58;
const SHADOW_CAMERA_RADIUS = 18;
const SKY_DAY_COLOR = '#9ed8ff';
const SKY_SUNSET_COLOR = '#f08b64';
const SKY_NIGHT_COLOR = '#06111f';
const FOG_DAY_COLOR = '#9ed8ff';
const FOG_NIGHT_COLOR = '#0a1524';
export const DEFAULT_CAMERA_PITCH = -0.08;
export const MIN_CAMERA_PITCH = -1.1;
export const MAX_CAMERA_PITCH = 0.85;
const FALLBACK_TILE_DEFINITION = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};
const LANDMARK_TILE_KINDS = new Set([
  'sign',
  'town',
  'cave',
  'dungeon',
  'tower',
  'quarry',
  'lighthouse',
  'ship',
  'observatory',
  'station',
]);
const distanceFadeTargetCache = new WeakMap<THREE.Object3D, DistanceFadeTargets>();
const ownedDisposableGeometries = new WeakSet<object>();
const ownedDisposableMaterials = new WeakSet<object>();
const ownedMaterialCreationTimestamps: number[] = [];
const ownedMaterialDisposalTimestamps: number[] = [];
const sharedBoxGeometryCache = new Map<string, THREE.BoxGeometry>();
const sharedPlaneGeometryCache = new Map<string, THREE.PlaneGeometry>();

export function getWaterFloorBodyProfile(inset: {
  north: number;
  east: number;
  south: number;
  west: number;
}) {
  const width = Math.max(0.1, TILE_SIZE - inset.west - inset.east);
  const depth = Math.max(0.1, TILE_SIZE - inset.north - inset.south);
  return {
    width,
    depth,
    centerX: (inset.west - inset.east) * 0.5,
    centerZ: (inset.north - inset.south) * 0.5,
    fillsTile:
      inset.north === 0 &&
      inset.east === 0 &&
      inset.south === 0 &&
      inset.west === 0,
  };
}

export function create3DRenderer(host: HTMLElement): Render3DController {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.tabIndex = -1;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_DAY_COLOR);
  scene.fog = new THREE.Fog(FOG_DAY_COLOR, 12, 34);

  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 120);
  camera.rotation.order = 'YXZ';

  const ambientLight = new THREE.HemisphereLight('#eaf6ff', '#28442f', 1.35);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight('#fff3cf', 1.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.bias = -0.00018;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -SHADOW_CAMERA_RADIUS;
  sunLight.shadow.camera.right = SHADOW_CAMERA_RADIUS;
  sunLight.shadow.camera.top = SHADOW_CAMERA_RADIUS;
  sunLight.shadow.camera.bottom = -SHADOW_CAMERA_RADIUS;
  scene.add(sunLight);
  const sunTarget = new THREE.Object3D();
  scene.add(sunTarget);
  sunLight.target = sunTarget;

  const moonLight = new THREE.DirectionalLight('#9ec5ff', 0.16);
  scene.add(moonLight);
  const moonTarget = new THREE.Object3D();
  scene.add(moonTarget);
  moonLight.target = moonTarget;

  const skyRoot = new THREE.Group();
  scene.add(skyRoot);

  const stars = createStarField();
  skyRoot.add(stars);

  const constellationRoot = new THREE.Group();
  skyRoot.add(constellationRoot);

  const eventRoot = new THREE.Group();
  skyRoot.add(eventRoot);

  const milkyWayRoot = new THREE.Group();
  skyRoot.add(milkyWayRoot);

  const auroraRoot = new THREE.Group();
  skyRoot.add(auroraRoot);

  const sunSprite = createSunSprite();
  skyRoot.add(sunSprite);

  const moonSprite = createMoonSprite();
  skyRoot.add(moonSprite);

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);

  const atlasTexture = new THREE.CanvasTexture(getTileAtlasCanvas());
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.magFilter = THREE.NearestFilter;
  atlasTexture.minFilter = THREE.NearestFilter;
  atlasTexture.generateMipmaps = false;

  const materialCache = new Map();
  const tilePluginOwnerCache = new Map<string, string>();
  const visibleTileNodes = new Map<string, DynamicTileNode>();
  const lodSyncVisibleEntriesBuffer: Array<[string, DynamicTileNode]> = [];
  const lodSyncBatchBuffer: Array<[string, DynamicTileNode]> = [];
  const visibleWorldNextVisibleKeysBuffer = new Set<string>();
  const visibleWorldVisibleTileKeysBuffer = new Set<string>();
  const pendingWorldBuildQueueScratch = createPendingWorldBuildQueueScratch();
  const visibleWorldBuildOrderScratch = createVisibleWorldBuildOrderScratch();
  const backgroundColor = new THREE.Color(SKY_DAY_COLOR);
  const twilightColor = new THREE.Color(SKY_SUNSET_COLOR);
  const nightColor = new THREE.Color(SKY_NIGHT_COLOR);
  const fogDayColor = new THREE.Color(FOG_DAY_COLOR);
  const fogNightColor = new THREE.Color(FOG_NIGHT_COLOR);
  const skyLightingColorState = createSkyLightingColorState();
  let lastMoonPhaseIndex = -1;
  const lastVisibleWorldSyncState = createWorldVisibilitySyncState();
  let lastLodSyncPlayerPosition: { x: number; y: number } | null = null;
  let lastWorldCurvaturePlayerPosition: { x: number; y: number } | null = null;
  let visibleWorldMutationVersion = 0;
  let lastWorldCurvatureMutationVersion = -1;
  let pendingLodSyncChecks = 0;
  let lodSyncEntryOffset = 0;
  let lastSkyConstellationSignature = '';
  let lastSkyEventSignature = '';
  let lastSkyMilkyWaySignature = '';
  let lastSkyAuroraSignature = '';
  let lastSkyPositionSignature = '';
  let cachedSkyPose: CachedSkyPose | null = null;
  const pendingWorldBuild = createPendingWorldBuildState();
  const renderChurnMetrics = {
    tileNodeBuilds: [] as number[],
    tileBuilds: [] as number[],
    pendingCancelledEntries: [] as number[],
    lodChecks: [] as number[],
    lodReplacements: [] as number[],
    pendingFlushCounts: [] as RecentCountSample[],
    tileBuildDurations: [] as RecentDurationSample[],
    tilePluginBuildDurations: [] as RecentLabeledDurationSample[],
    tileModelBudgetViolations: [] as RecentLabeledCountSample[],
  } satisfies RenderChurnMetrics;
  const recentDebugEvents: Render3DDebugEvent[] = [];

  function resize(width, height, pixelRatio = window.devicePixelRatio || 1) {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    renderer.setPixelRatio(Math.min(pixelRatio, 2));
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
  }

  function clearWorld() {
    worldRoot.clear();
    visibleTileNodes.clear();
    lastLodSyncPlayerPosition = null;
    lastWorldCurvaturePlayerPosition = null;
    visibleWorldMutationVersion += 1;
    lastWorldCurvatureMutationVersion = -1;
    lastSkyPositionSignature = '';
    cachedSkyPose = null;
    pendingLodSyncChecks = 0;
    lodSyncEntryOffset = 0;
    pendingWorldBuild.contextId = '';
    pendingWorldBuild.centerX = Number.NaN;
    pendingWorldBuild.centerY = Number.NaN;
    pendingWorldBuild.facingBucket = -1;
    pendingWorldBuild.queue = [];
    lastVisibleWorldSyncState.contextId = '';
    lastVisibleWorldSyncState.centerX = Number.NaN;
    lastVisibleWorldSyncState.centerY = Number.NaN;
    lastVisibleWorldSyncState.facingBucket = -1;
    lastVisibleWorldSyncState.chunkRadius = -1;
  }

  function buildTileNode(
    state,
    registry,
    x,
    y,
    detailLevel: RenderBudgetDetailLevel = 'full',
    renderBudget?: RenderBudget
  ): DynamicTileNode {
    recordRecentMetric(renderChurnMetrics.tileNodeBuilds, performance.now());
    const tileNode = new THREE.Group();
    const buildCache = createTileBuildCache(state);
    const tile = buildCache.getTile(x, y);
    const definition = getTileDefinitionFromRegistry(tile.kind);
    const variant = getTileVariantIndex(tile.kind, x, y);
    const surfaceHeight = buildCache.getSurfaceProfile(x, y, tile).surfaceHeight;

    const floorMesh = createFloorMesh(state, tile, x, y, variant, buildCache);
    freezeStaticObjectTransforms(floorMesh);
    tileNode.add(floorMesh);

    const tilePlugin = registry.getTilePlugin(tile.kind);
    const tilePluginOwnerLabel = getTilePluginOwnerLabel(registry, tile.kind);
    const tilePluginRenderContext = {
      three: THREE,
      state,
      tile,
      tileX: x,
      tileY: y,
      detailLevel,
      renderBudget: createTilePluginRenderBudget(renderBudget, detailLevel),
    } as const;
    const estimatedCost = tilePlugin?.estimate3DModelCost?.(tilePluginRenderContext);
    const estimateValidation = estimatedCost
      ? validateTileModelCostEstimateAgainstRenderBudget(estimatedCost, detailLevel)
      : null;
    const pluginBuildStartMs = performance.now();
    let pluginModel =
      estimateValidation && !estimateValidation.accepted
        ? null
        : tilePlugin?.create3DModel?.(tilePluginRenderContext);
    const pluginBuildDurationMs = performance.now() - pluginBuildStartMs;
    if (tilePlugin?.create3DModel) {
      recordRecentLabeledDurationMetric(renderChurnMetrics.tilePluginBuildDurations, {
        nowMs: pluginBuildStartMs,
        durationMs: pluginBuildDurationMs,
        label: tilePluginOwnerLabel,
      });
    }

    if (estimateValidation && !estimateValidation.accepted) {
      const violationSummary = summarizeTileModelCostEstimateBudgetViolations(
        estimateValidation.violations
      );
      recordRecentLabeledCountMetric(renderChurnMetrics.tileModelBudgetViolations, {
        nowMs: pluginBuildStartMs,
        count: 1,
        label: tilePluginOwnerLabel,
      });
      recordRenderDebugEvent(recentDebugEvents, {
        nowMs: pluginBuildStartMs,
        type: 'plugin-exceeded-budget',
        tileKey: `${x}:${y}`,
        plugin: tilePluginOwnerLabel,
        summary: violationSummary,
      });
      recordRenderDebugEvent(recentDebugEvents, {
        nowMs: pluginBuildStartMs,
        type: 'model-rejected',
        tileKey: `${x}:${y}`,
        plugin: tilePluginOwnerLabel,
        summary: violationSummary,
      });
    }

    if (pluginModel) {
      const reportedActualCost = tilePlugin?.report3DModelCost?.({
        ...tilePluginRenderContext,
        model: pluginModel,
      });
      const reportedActualCostValidation = reportedActualCost
        ? validateTileModelCostEstimateAgainstRenderBudget(
            reportedActualCost,
            detailLevel
          )
        : null;
      if (reportedActualCostValidation && !reportedActualCostValidation.accepted) {
        const violationSummary = summarizeTileModelCostEstimateBudgetViolations(
          reportedActualCostValidation.violations
        );
        recordRecentLabeledCountMetric(renderChurnMetrics.tileModelBudgetViolations, {
          nowMs: pluginBuildStartMs,
          count: 1,
          label: tilePluginOwnerLabel,
        });
        recordRenderDebugEvent(recentDebugEvents, {
          nowMs: pluginBuildStartMs,
          type: 'plugin-exceeded-budget',
          tileKey: `${x}:${y}`,
          plugin: tilePluginOwnerLabel,
          summary: violationSummary,
        });
        recordRenderDebugEvent(recentDebugEvents, {
          nowMs: pluginBuildStartMs,
          type: 'model-rejected',
          tileKey: `${x}:${y}`,
          plugin: tilePluginOwnerLabel,
          summary: violationSummary,
        });
        disposeObject3DResources(pluginModel);
        pluginModel = null;
      }
    }

    if (pluginModel) {
      const modelBudgetValidation = validateTileModelAgainstRenderBudget(
        pluginModel,
        detailLevel
      );
      if (!modelBudgetValidation.accepted) {
        const violationSummary = summarizeTileModelBudgetViolations(
          modelBudgetValidation.violations
        );
        recordRecentLabeledCountMetric(renderChurnMetrics.tileModelBudgetViolations, {
          nowMs: pluginBuildStartMs,
          count: 1,
          label: tilePluginOwnerLabel,
        });
        recordRenderDebugEvent(recentDebugEvents, {
          nowMs: pluginBuildStartMs,
          type: 'plugin-exceeded-budget',
          tileKey: `${x}:${y}`,
          plugin: tilePluginOwnerLabel,
          summary: violationSummary,
        });
        recordRenderDebugEvent(recentDebugEvents, {
          nowMs: pluginBuildStartMs,
          type: 'model-rejected',
          tileKey: `${x}:${y}`,
          plugin: tilePluginOwnerLabel,
          summary: violationSummary,
        });
        const acceptedWithBudgetResult = acceptTilePluginModelForRenderBudgetWithResult(
          pluginModel,
          detailLevel
        );
        if (acceptedWithBudgetResult.model && acceptedWithBudgetResult.removedParts.length > 0) {
          const removedSummary = summarizeRemovedTileModelBudgetParts(
            acceptedWithBudgetResult.removedParts
          );
          recordRenderDebugEvent(recentDebugEvents, {
            nowMs: pluginBuildStartMs,
            type: 'model-rejected',
            tileKey: `${x}:${y}`,
            plugin: tilePluginOwnerLabel,
            summary: `removed optional parts ${removedSummary}`,
          });
        }
        pluginModel = acceptedWithBudgetResult.model;
      }
    }

    if (pluginModel) {
      pluginModel.position.y += surfaceHeight;
      applyShadowSettings(pluginModel, {
        castShadow: true,
        receiveShadow: true,
      });
      if (definition.walkable && !isWaterKind(tile.kind)) {
        prepareObjectForDistanceFade(pluginModel);
      }
      freezeStaticObjectTransforms(pluginModel);
      tileNode.add(pluginModel);
    } else if (!isWaterKind(tile.kind) && definition.wallHeight > 0.08) {
      const wallHeight = Math.max(definition.wallHeight * 1.9, 0.18);
      const wallMesh = new THREE.Mesh(
        getSharedBoxGeometry(TILE_SIZE, wallHeight, TILE_SIZE),
        getTileMaterial(tile.kind, variant)
      );
      wallMesh.position.set(
        x * TILE_SIZE,
        surfaceHeight + wallHeight * 0.5,
        y * TILE_SIZE
      );
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      freezeStaticObjectTransforms(wallMesh);
      tileNode.add(wallMesh);
    }

    return {
      key: `${x}:${y}`,
      tile,
      tileX: x,
      tileY: y,
      node: tileNode,
      model: pluginModel ?? tileNode,
      modelRoot: pluginModel ?? null,
      modelVisibilityOpacity: 1,
      distanceFadeEligible:
        Boolean(pluginModel) && definition.walkable && !isWaterKind(tile.kind),
      detailLevel,
      sync3DModel: tilePlugin?.sync3DModel,
    };
  }

  function getTilePluginOwnerLabel(
    registry: ReturnType<typeof getActivePluginRegistry>,
    kind: string
  ): string {
    const cached = tilePluginOwnerCache.get(kind);
    if (cached) {
      return cached;
    }

    for (const plugin of registry.plugins) {
      if (plugin.tiles?.some((tile) => tile.kind === kind)) {
        tilePluginOwnerCache.set(kind, plugin.name);
        return plugin.name;
      }
    }

    tilePluginOwnerCache.set(kind, kind);
    return kind;
  }

  function syncVisibleWorld(
    state,
    chunkRadius = CHUNK_RADIUS,
    renderBudget?: RenderBudget
  ) {
    const context = state.getCurrentContext();
    const centerX = Math.round(state.player.x);
    const centerY = Math.round(state.player.y);
    const facingBucket = getFacingVisibilityBucket(state.player.facing);
    const nextVisibleWorldSyncState = {
      contextId: context.id,
      centerX,
      centerY,
      facingBucket,
      chunkRadius,
    };
    visibleWorldNextVisibleKeysBuffer.clear();
    const nextQueue = fillVisibleWorldTileBuildOrder(visibleWorldBuildOrderScratch, {
      playerTileX: centerX,
      playerTileY: centerY,
      facingAngle: state.player.facing,
      chunkRadius,
      shouldRenderWorldTile: (tileX, tileY) =>
        shouldRenderWorldTile({
          playerTileX: centerX,
          playerTileY: centerY,
          tileX,
          tileY,
          facingAngle: state.player.facing,
          chunkRadius,
        }),
    });

    for (const entry of nextQueue) {
      visibleWorldNextVisibleKeysBuffer.add(entry.key);
    }

    for (const [key, tileNode] of visibleTileNodes.entries()) {
      if (visibleWorldNextVisibleKeysBuffer.has(key)) {
        continue;
      }
      worldRoot.remove(tileNode.node);
      disposeObject3DResources(tileNode.node);
      visibleTileNodes.delete(key);
      visibleWorldMutationVersion += 1;
    }

    visibleWorldVisibleTileKeysBuffer.clear();
    for (const key of visibleTileNodes.keys()) {
      visibleWorldVisibleTileKeysBuffer.add(key);
    }

    const nextPendingWorldBuild = reconcilePendingWorldBuildQueueWithScratch(
      nextQueue,
      visibleWorldVisibleTileKeysBuffer,
      pendingWorldBuild.queue,
      pendingWorldBuildQueueScratch
    );
    updatePendingWorldBuildState(pendingWorldBuild, {
      contextId: context.id,
      centerX,
      centerY,
      facingBucket,
      queue: nextPendingWorldBuild.queue,
    });
    for (let index = 0; index < nextPendingWorldBuild.cancelledEntryCount; index += 1) {
      recordRecentMetric(renderChurnMetrics.pendingCancelledEntries, performance.now());
    }

    updateWorldVisibilitySyncState(
      lastVisibleWorldSyncState,
      nextVisibleWorldSyncState
    );
  }

  function flushPendingWorldBuild(
    state,
    nowMs: number,
    options: Pick<
      Render3DOptions,
      'pendingBuildBudgetMs' | 'maxPendingBuildTiles' | 'renderBudget'
    > = {},
    frameBudget?: FrameTimeBudget
  ) {
    if (pendingWorldBuild.queue.length === 0) {
      return;
    }
    const context = state.getCurrentContext();
    if (
      !matchesPendingWorldBuildState(pendingWorldBuild, {
        contextId: context.id,
        centerX: Math.round(state.player.x),
        centerY: Math.round(state.player.y),
        facingBucket: getFacingVisibilityBucket(state.player.facing),
      })
    ) {
      return;
    }
    const registry = getActivePluginRegistry();
    const flushStartMs = performance.now();
    const remainingFrameBudgetMs = frameBudget
      ? getRemainingFrameTimeBudgetMs(frameBudget, flushStartMs)
      : Number.POSITIVE_INFINITY;
    if (remainingFrameBudgetMs <= 0) {
      return;
    }
    const recentTileBuildStats = getRecentDurationStats(
      renderChurnMetrics.tileBuildDurations,
      nowMs
    );
    const effectivePendingWorldBuildBudget = getEffectivePendingWorldBuildBudget({
      pendingBuildBudgetMs: Math.max(
        0.25,
        Math.min(
          options.pendingBuildBudgetMs ?? DEFAULT_PENDING_WORLD_BUILD_BUDGET_MS,
          remainingFrameBudgetMs
        )
      ),
      maxPendingBuildTiles: Math.max(
        1,
        Math.min(
          WORLD_SYNC_BATCH_SIZE,
          Math.floor(options.maxPendingBuildTiles ?? WORLD_SYNC_BATCH_SIZE)
        )
      ),
      pendingQueueLength: pendingWorldBuild.queue.length,
      visibleTileCount: visibleTileNodes.size,
      recentTileBuildAverageMs: recentTileBuildStats.averageMs,
      recentTileBuildMaxMs: recentTileBuildStats.maxMs,
    });
    let processedEntryCount = 0;

    while (
      processedEntryCount < pendingWorldBuild.queue.length &&
      shouldProcessPendingWorldBuildEntry(
        flushStartMs,
        performance.now(),
        processedEntryCount,
        {
          ...effectivePendingWorldBuildBudget,
          minimumEntriesPerFlush: 0,
        }
      )
    ) {
      const entry = pendingWorldBuild.queue[processedEntryCount];
      processedEntryCount += 1;
      if (!entry) {
        continue;
      }
      if (visibleTileNodes.has(entry.key)) {
        continue;
      }
      const buildStartMs = performance.now();
      const dx = entry.x - state.player.x;
      const dy = entry.y - state.player.y;
      const tile = state.getCurrentTile(entry.x, entry.y);
      const desiredDetailLevel = getTileModelDetailLevelFromSquaredDistance(
        dx * dx + dy * dy,
        tile
      );
      const detailLevel = getPendingWorldBuildDetailLevel(
        desiredDetailLevel,
        dx * dx + dy * dy,
        pendingWorldBuild.queue.length - processedEntryCount,
        tile
      );
      const tileNode = buildTileNode(
        state,
        registry,
        entry.x,
        entry.y,
        detailLevel,
        createTilePluginRenderBudget(
          options.renderBudget,
          detailLevel,
          frameBudget
            ? getRemainingFrameTimeBudgetMs(frameBudget, buildStartMs)
            : undefined
        )
      );
      const buildDurationMs = performance.now() - buildStartMs;
      visibleTileNodes.set(entry.key, tileNode);
      worldRoot.add(tileNode.node);
      visibleWorldMutationVersion += 1;
      recordRecentMetric(renderChurnMetrics.tileBuilds, nowMs);
      recordRecentDurationMetric(renderChurnMetrics.tileBuildDurations, {
        nowMs,
        durationMs: buildDurationMs,
      });
    }

    if (processedEntryCount > 0) {
      recordRecentCountMetric(renderChurnMetrics.pendingFlushCounts, {
        nowMs,
        count: processedEntryCount,
      });
      pendingWorldBuild.queue.splice(0, processedEntryCount);
      if (pendingWorldBuild.queue.length === 0) {
        lastLodSyncPlayerPosition = null;
      }
    }
  }

  function render(state: Render3DState, options: Render3DOptions = {}): void {
    const contextKey = state.getCurrentContext().id;
    const chunkRadius = Math.max(8, Math.floor(options.visibilityRadius ?? CHUNK_RADIUS));
    const nextVisibleWorldSyncState = {
      contextId: contextKey,
      centerX: Math.round(state.player.x),
      centerY: Math.round(state.player.y),
      facingBucket: getFacingVisibilityBucket(state.player.facing),
      chunkRadius,
    };
    if (contextKey !== lastVisibleWorldSyncState.contextId) {
      clearWorld();
    }
    if (
      !matchesWorldVisibilitySyncState(
        lastVisibleWorldSyncState,
        nextVisibleWorldSyncState
      )
    ) {
      syncVisibleWorld(state, chunkRadius, options.renderBudget);
    }
    const frameNowMs = options.timeMs ?? performance.now();
    const generationFrameBudget = createFrameTimeBudget(
      options.generationBudgetMs ?? options.pendingBuildBudgetMs ?? DEFAULT_PENDING_WORLD_BUILD_BUDGET_MS,
      performance.now()
    );
    flushPendingWorldBuild(state, frameNowMs, options, generationFrameBudget);
    if (
      shouldSyncWorldCurvature(
        lastWorldCurvaturePlayerPosition,
        state.player.x,
        state.player.y,
        lastWorldCurvatureMutationVersion,
        visibleWorldMutationVersion
      )
    ) {
      syncWorldCurvature(visibleTileNodes.values(), state);
      lastWorldCurvaturePlayerPosition = {
        x: state.player.x,
        y: state.player.y,
      };
      lastWorldCurvatureMutationVersion = visibleWorldMutationVersion;
    }

    camera.position.set(
      state.player.x * TILE_SIZE,
      0.82 + (options.jumpHeight ?? 0) * 2.2 + (options.cameraBobOffset ?? 0),
      state.player.y * TILE_SIZE
    );
    camera.rotation.y = -state.player.facing - Math.PI / 2;
    camera.rotation.x = clampCameraPitch(
      options.cameraPitch ?? DEFAULT_CAMERA_PITCH
    );

    const environment = options.environment ?? {};
    const cycle = updateSkyAndLights(
      state.player.x * TILE_SIZE,
      state.player.y * TILE_SIZE,
      frameNowMs,
      environment,
      options.renderBudget
    );
    if (
      shouldSyncTileModelDetailLevels(
        lastLodSyncPlayerPosition,
        state.player.x,
        state.player.y
      )
    ) {
      pendingLodSyncChecks = visibleTileNodes.size;
      lodSyncEntryOffset = 0;
      lastLodSyncPlayerPosition = { x: state.player.x, y: state.player.y };
    }
    if (pendingLodSyncChecks > 0) {
      if (!isFrameTimeBudgetExhausted(generationFrameBudget)) {
        const visibleEntries = collectMapEntriesInto(
          visibleTileNodes.entries(),
          lodSyncVisibleEntriesBuffer
        );
        const lodBatch = fillWrappedBatchWindow(
          visibleEntries,
          lodSyncEntryOffset,
          LOD_SYNC_BATCH_SIZE,
          lodSyncBatchBuffer
        );
        if (lodBatch.items.length > 0) {
          const processedEntryCount = syncTileModelDetailLevels(
            state,
            getActivePluginRegistry(),
            frameNowMs,
            lodBatch.items,
            generationFrameBudget,
            options.renderBudget
          );
          if (visibleEntries.length > 0 && processedEntryCount > 0) {
            lodSyncEntryOffset =
              (lodSyncEntryOffset + processedEntryCount) % visibleEntries.length;
            pendingLodSyncChecks = Math.max(
              0,
              pendingLodSyncChecks - processedEntryCount
            );
          }
        } else {
          pendingLodSyncChecks = 0;
          lodSyncEntryOffset = 0;
        }
      }
    }
    updateFarLandModelVisibility(visibleTileNodes.values(), state);
    syncDynamicTileNodes(visibleTileNodes.values(), {
      three: THREE,
      state,
      timeMs: options.timeMs,
      cycle,
      environment,
    });
    renderer.render(scene, camera);
  }

  function canOccupy(state: Render3DState, nextX: number, nextY: number): boolean {
    const tileX = Math.round(nextX);
    const tileY = Math.round(nextY);
    for (let y = tileY - 1; y <= tileY + 1; y += 1) {
      for (let x = tileX - 1; x <= tileX + 1; x += 1) {
        const tile = state.getCurrentTile(x, y);
        const canOccupyTile = getActivePluginRegistry().canOccupy3D({
          state,
          tile,
          tileX: x,
          tileY: y,
          nextX,
          nextY,
          playerRadius: 0.12,
        });
        if (canOccupyTile === false) {
          return false;
        }
      }
    }
    return true;
  }

  function getStats() {
    const sceneResourceStats = collectSceneResourceStats(scene);
    const rendererInfo = renderer.info as THREE.WebGLInfo & {
      programs?: ArrayLike<unknown>;
    };
    const nowMs = performance.now();
    const recentTileBuildStats = getRecentDurationStats(
      renderChurnMetrics.tileBuildDurations,
      nowMs
    );
    const recentPendingFlushStats = getRecentCountStats(
      renderChurnMetrics.pendingFlushCounts,
      nowMs
    );
    const recentTilePluginBuildStats = getRecentLabeledDurationStats(
      renderChurnMetrics.tilePluginBuildDurations,
      nowMs
    );
    const recentTileModelBudgetViolationStats = getRecentLabeledCountStats(
      renderChurnMetrics.tileModelBudgetViolations,
      nowMs
    );
    const recentEvents = getRecentRenderDebugEvents(recentDebugEvents, nowMs);
    const renderChurnStats = getRenderChurnStats(renderChurnMetrics, nowMs);
    return {
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      points: renderer.info.render.points,
      lines: renderer.info.render.lines,
      sceneChildCount: scene.children.length,
      visibleTileCount: visibleTileNodes.size,
      visibleTreeCount: sceneResourceStats.treeCount,
      pendingTileCount: pendingWorldBuild.queue.length,
      averagePendingFlushTiles: recentPendingFlushStats.averageCount,
      maxPendingFlushTiles: recentPendingFlushStats.maxCount,
      averageTileBuildMs: recentTileBuildStats.averageMs,
      maxTileBuildMs: recentTileBuildStats.maxMs,
      averageTilePluginBuildMs: recentTilePluginBuildStats.averageMs,
      maxTilePluginBuildMs: recentTilePluginBuildStats.maxMs,
      slowestTilePluginLabel: recentTilePluginBuildStats.maxLabel,
      tileModelBudgetViolationsPerSecond:
        recentTileModelBudgetViolationStats.totalCount,
      tileModelBudgetViolationTopPluginLabel:
        recentTileModelBudgetViolationStats.topLabel,
      tileModelBudgetViolationSummary:
        recentTileModelBudgetViolationStats.summary,
      recentEvents,
      tileNodeBuildsPerSecond: renderChurnStats.tileNodeBuildsPerSecond,
      tileBuildsPerSecond: renderChurnStats.tileBuildsPerSecond,
      pendingCancelledEntriesPerSecond:
        renderChurnStats.pendingCancelledEntriesPerSecond,
      lodChecksPerSecond: renderChurnStats.lodChecksPerSecond,
      lodReplacementsPerSecond: renderChurnStats.lodReplacementsPerSecond,
      object3dCount: sceneResourceStats.object3dCount,
      visibleObjectCount: sceneResourceStats.visibleObjectCount,
      invisibleObjectCount: sceneResourceStats.invisibleObjectCount,
      groupCount: sceneResourceStats.groupCount,
      meshCount: sceneResourceStats.meshCount,
      instancedMeshCount: sceneResourceStats.instancedMeshCount,
      visibleInstancedMeshCount: sceneResourceStats.visibleInstancedMeshCount,
      renderedInstanceCount: sceneResourceStats.renderedInstanceCount,
      visibleMeshCount: sceneResourceStats.visibleMeshCount,
      maxHierarchyDepth: sceneResourceStats.maxHierarchyDepth,
      averageHierarchyDepth: sceneResourceStats.averageHierarchyDepth,
      emptyGroupCount: sceneResourceStats.emptyGroupCount,
      oneChildGroupCount: sceneResourceStats.oneChildGroupCount,
      matrixAutoUpdateCount: sceneResourceStats.matrixAutoUpdateCount,
      staticMatrixAutoUpdateCount: sceneResourceStats.staticMatrixAutoUpdateCount,
      pointsCount: sceneResourceStats.pointsCount,
      lineObjectCount: sceneResourceStats.lineObjectCount,
      cameraCount: sceneResourceStats.cameraCount,
      activeParticleSystemCount: sceneResourceStats.activeParticleSystemCount,
      activeParticleCount: sceneResourceStats.activeParticleCount,
      spriteCount: sceneResourceStats.spriteCount,
      lightCount: sceneResourceStats.lightCount,
      ambientLightCount: sceneResourceStats.ambientLightCount,
      directionalLightCount: sceneResourceStats.directionalLightCount,
      pointLightCount: sceneResourceStats.pointLightCount,
      spotLightCount: sceneResourceStats.spotLightCount,
      hemisphereLightCount: sceneResourceStats.hemisphereLightCount,
      dynamicLightCount: sceneResourceStats.dynamicLightCount,
      shadowLightCount: sceneResourceStats.shadowLightCount,
      vertexCount: sceneResourceStats.vertexCount,
      materialRefCount: sceneResourceStats.materialRefCount,
      geometryRefCount: sceneResourceStats.geometryRefCount,
      materialCount: sceneResourceStats.materialCount,
      sharedMaterialCount: sceneResourceStats.sharedMaterialCount,
      clonedMaterialCount: sceneResourceStats.clonedMaterialCount,
      transparentMaterialCount: sceneResourceStats.transparentMaterialCount,
      alphaTestMaterialCount: sceneResourceStats.alphaTestMaterialCount,
      doubleSidedMaterialCount: sceneResourceStats.doubleSidedMaterialCount,
      fogMaterialCount: sceneResourceStats.fogMaterialCount,
      customShaderMaterialCount: sceneResourceStats.customShaderMaterialCount,
      materialTypes: sceneResourceStats.materialTypes,
      materialsCreatedDuringSamplingWindow: countRecentMetricEvents(
        ownedMaterialCreationTimestamps,
        nowMs
      ),
      materialsDisposedDuringSamplingWindow: countRecentMetricEvents(
        ownedMaterialDisposalTimestamps,
        nowMs
      ),
      geometryCount: sceneResourceStats.geometryCount,
      sharedGeometryCount: sceneResourceStats.sharedGeometryCount,
      geometryBytes: sceneResourceStats.geometryBytes,
      vertexBufferBytes: sceneResourceStats.vertexBufferBytes,
      indexBufferBytes: sceneResourceStats.indexBufferBytes,
      averageVerticesPerGeometry: sceneResourceStats.averageVerticesPerGeometry,
      largestGeometryVertexCount: sceneResourceStats.largestGeometryVertexCount,
      largestGeometryBytes: sceneResourceStats.largestGeometryBytes,
      textureMemoryEstimateBytes: sceneResourceStats.textureMemoryEstimateBytes,
      gpuGeometryCount: renderer.info.memory.geometries,
      treeObjectCount: sceneResourceStats.treeObjectCount,
      treeMeshCount: sceneResourceStats.treeMeshCount,
      treeMaterialRefCount: sceneResourceStats.treeMaterialRefCount,
      visibleTileKindSummary: summarizeVisibleTileKinds(visibleTileNodes.values()),
      textureCount: renderer.info.memory.textures,
      programCount: rendererInfo.programs?.length ?? 0,
    };
  }

  function syncTileModelDetailLevels(
    state: Render3DState,
    registry: ReturnType<typeof getActivePluginRegistry>,
    nowMs: number,
    entries: Array<[string, DynamicTileNode]>,
    frameBudget?: FrameTimeBudget,
    renderBudget?: RenderBudget
  ): number {
    let processedEntryCount = 0;
    for (const [key, entry] of entries) {
      if (frameBudget && isFrameTimeBudgetExhausted(frameBudget)) {
        break;
      }
      processedEntryCount += 1;
      if (!entry.modelRoot) {
        continue;
      }
      const dx = entry.tileX - state.player.x;
      const dy = entry.tileY - state.player.y;
      const distanceSquared = dx * dx + dy * dy;
      if (
        !shouldEvaluateTileModelDetailLevel(
          entry.detailLevel,
          distanceSquared,
          entry.tile
        )
      ) {
        continue;
      }
      recordRecentMetric(renderChurnMetrics.lodChecks, nowMs);
      const desiredDetailLevel = getTileModelDetailLevelWithHysteresis(
        entry.detailLevel,
        distanceSquared,
        entry.tile
      );
      if ((entry.detailLevel ?? 'full') === desiredDetailLevel) {
        continue;
      }

      const nextEntry = buildTileNode(
        state,
        registry,
        entry.tileX,
        entry.tileY,
        desiredDetailLevel,
        createTilePluginRenderBudget(
          renderBudget,
          desiredDetailLevel,
          frameBudget ? getRemainingFrameTimeBudgetMs(frameBudget) : undefined
        )
      );
      visibleTileNodes.set(key, nextEntry);
      worldRoot.remove(entry.node);
      disposeObject3DResources(entry.node);
      worldRoot.add(nextEntry.node);
      visibleWorldMutationVersion += 1;
      recordRenderDebugEvent(recentDebugEvents, {
        nowMs,
        type: 'lod-changed',
        tileKey: key,
        fromDetailLevel: entry.detailLevel ?? 'full',
        toDetailLevel: desiredDetailLevel,
      });
      recordRecentMetric(renderChurnMetrics.lodReplacements, nowMs);
    }
    return processedEntryCount;
  }

  function createTileBuildCache(state): TileBuildCache {
    const tileCache = createCoordinateCache<TileLike>();
    const surfaceProfileCache = createCoordinateCache<TileSurfaceProfile>();

    function getTile(tileX: number, tileY: number): TileLike {
      const cached = tileCache.get(tileX, tileY);
      if (cached !== undefined) {
        return cached;
      }
      const tile = state.getCurrentTile(tileX, tileY);
      tileCache.set(tileX, tileY, tile);
      return tile;
    }

    function getSurfaceProfile(
      tileX: number,
      tileY: number,
      tile = getTile(tileX, tileY)
    ): TileSurfaceProfile {
      const cached = surfaceProfileCache.get(tileX, tileY);
      if (cached !== undefined) {
        return cached;
      }
      const surfaceProfile = getTileSurfaceProfile(state, tile, tileX, tileY);
      surfaceProfileCache.set(tileX, tileY, surfaceProfile);
      return surfaceProfile;
    }

    return {
      getTile,
      getSurfaceProfile,
    };
  }

  function getTileSurfaceProfile(state, tile, tileX, tileY): TileSurfaceProfile {
    const pluginProfile =
      (getActivePluginRegistry().getSurfaceProfile3D({
        state,
        tile,
        tileX,
        tileY,
      }) || null) ?? {};
    const surfaceHeight =
      typeof pluginProfile.surfaceHeight === 'number'
        ? pluginProfile.surfaceHeight
        : getDecoratedTileSurfaceHeight(tile);
    const boundaryRole = pluginProfile.boundaryRole ?? null;
    const chamferEligible =
      pluginProfile.chamferEligible ??
      (boundaryRole == null && surfaceHeight >= 0);
    return {
      surfaceHeight,
      boundaryRole,
      underlayKind: pluginProfile.underlayKind ?? null,
      chamferEligible,
      boundaryTransition: pluginProfile.boundaryTransition ?? null,
    };
  }

  function getTileMaterial(kind, variant) {
    const key = `${kind}:${variant}`;
    return getOrCreateMapValue(materialCache, key, () => {
      const rect = getTileSpriteRect(kind, variant);
      const pixelSize = getTilePixelSize();
      const texture = atlasTexture.clone();
      texture.needsUpdate = true;
      texture.repeat.set(
        (1 / atlasTexture.image.width) * pixelSize,
        (1 / atlasTexture.image.height) * pixelSize
      );
      texture.offset.set(
        rect.x / atlasTexture.image.width,
        1 - (rect.y + pixelSize) / atlasTexture.image.height
      );
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;

      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.92,
        metalness: 0.04,
      });
    });
  }

  function createFloorMesh(
    state,
    tile,
    tileX,
    tileY,
    variant,
    buildCache: TileBuildCache
  ) {
    const surfaceProfile = buildCache.getSurfaceProfile(tileX, tileY, tile);
    if (surfaceProfile.underlayKind) {
      return createUnderlayFloor(
        tileX,
        tileY,
        surfaceProfile.underlayKind,
        surfaceProfile.surfaceHeight
      );
    }

    const floorKind =
      getActivePluginRegistry().resolveFloorKind3D({
        state,
        tile,
        tileX,
        tileY,
      }) ?? tile.kind;
    const material = getTileMaterial(
      floorKind,
      getTileVariantIndex(floorKind, tileX, tileY)
    );
    const surfaceHeight = surfaceProfile.surfaceHeight;
    const riverNeighbors = getAdjacentBoundaryNeighbors(state, tileX, tileY, {
      ...surfaceProfile,
      kind: floorKind,
    }, buildCache);

    if (!riverNeighbors || riverNeighbors.count === 0) {
      if (isWaterKind(floorKind)) {
        return createWaterFloorMesh(
          tileX,
          tileY,
          floorKind,
          surfaceHeight,
          buildCache
        );
      }
      const floorThickness =
        isWaterKind(floorKind)
          ? WATER_FLOOR_THICKNESS
          : FLOOR_THICKNESS;
      const floorMesh = new THREE.Mesh(
        getSharedBoxGeometry(TILE_SIZE, floorThickness, TILE_SIZE),
        material
      );
      floorMesh.position.set(
        tileX * TILE_SIZE,
        surfaceHeight - floorThickness * 0.5,
        tileY * TILE_SIZE
      );
      floorMesh.receiveShadow = true;
      return floorMesh;
    }

    const cornerHeights = {
      nw: surfaceHeight,
      ne: surfaceHeight,
      se: surfaceHeight,
      sw: surfaceHeight,
    };

    cornerHeights.nw = getCornerSurfaceHeight(
      surfaceHeight,
      [riverNeighbors.north, riverNeighbors.west, riverNeighbors.northwest]
    );
    cornerHeights.ne = getCornerSurfaceHeight(
      surfaceHeight,
      [riverNeighbors.north, riverNeighbors.east, riverNeighbors.northeast]
    );
    cornerHeights.se = getCornerSurfaceHeight(
      surfaceHeight,
      [riverNeighbors.south, riverNeighbors.east, riverNeighbors.southeast]
    );
    cornerHeights.sw = getCornerSurfaceHeight(
      surfaceHeight,
      [riverNeighbors.south, riverNeighbors.west, riverNeighbors.southwest]
    );

    const group = new THREE.Group();
    group.position.set(tileX * TILE_SIZE, 0, tileY * TILE_SIZE);

    const topGeometry = markOwnedGeometry(new THREE.BufferGeometry());
    const positions = new Float32Array([
      -0.5,
      cornerHeights.nw,
      -0.5,
      0.5,
      cornerHeights.ne,
      -0.5,
      -0.5,
      cornerHeights.sw,
      0.5,
      0.5,
      cornerHeights.se,
      0.5,
    ]);
    const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    topGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    topGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    topGeometry.setIndex([0, 2, 1, 2, 3, 1]);
    topGeometry.computeVertexNormals();
    const topMesh = new THREE.Mesh(topGeometry, material);
    topMesh.receiveShadow = true;
    group.add(topMesh);

    const northWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.north
    );
    const eastWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.east
    );
    const southWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.south
    );
    const westWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.west
    );

    if (northWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'north',
        northWallHeight,
        riverNeighbors.north.surfaceHeight
      );
    }
    if (eastWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'east',
        eastWallHeight,
        riverNeighbors.east.surfaceHeight
      );
    }
    if (southWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'south',
        southWallHeight,
        riverNeighbors.south.surfaceHeight
      );
    }
    if (westWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'west',
        westWallHeight,
        riverNeighbors.west.surfaceHeight
      );
    }

    return group;
  }

  function createUnderlayFloor(tileX, tileY, kind, surfaceHeight) {
    if (isWaterKind(kind)) {
      return createWaterFloorMesh(
        tileX,
        tileY,
        kind,
        surfaceHeight,
        null
      );
    }
    const floorThickness =
      isWaterKind(kind)
        ? WATER_FLOOR_THICKNESS
        : FLOOR_THICKNESS;
    const floorMesh = new THREE.Mesh(
      getSharedBoxGeometry(TILE_SIZE, floorThickness, TILE_SIZE),
      getTileMaterial(kind, getTileVariantIndex(kind, tileX, tileY))
    );
    floorMesh.position.set(
      tileX * TILE_SIZE,
      surfaceHeight - floorThickness * 0.5,
      tileY * TILE_SIZE
    );
    floorMesh.receiveShadow = true;
    return floorMesh;
  }

  function createWaterFloorMesh(
    tileX,
    tileY,
    kind,
    surfaceHeight,
    buildCache: TileBuildCache | null
  ) {
    const material = getTileMaterial(kind, getTileVariantIndex(kind, tileX, tileY));
    const body = getWaterFloorBodyProfile(
      getWaterBodyInset(tileX, tileY, kind, buildCache)
    );

    if (body.fillsTile) {
      const floorMesh = new THREE.Mesh(
        getSharedBoxGeometry(TILE_SIZE, WATER_FLOOR_THICKNESS, TILE_SIZE),
        material
      );
      floorMesh.position.set(
        tileX * TILE_SIZE,
        surfaceHeight - WATER_FLOOR_THICKNESS * 0.5,
        tileY * TILE_SIZE
      );
      floorMesh.receiveShadow = true;
      return floorMesh;
    }

    const group = new THREE.Group();
    group.position.set(tileX * TILE_SIZE, 0, tileY * TILE_SIZE);

    const surfaceMesh = new THREE.Mesh(
      getSharedPlaneGeometry(TILE_SIZE, TILE_SIZE),
      material
    );
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.y = surfaceHeight;
    surfaceMesh.receiveShadow = true;
    group.add(surfaceMesh);

    const bodyMesh = new THREE.Mesh(
      getSharedBoxGeometry(body.width, WATER_FLOOR_THICKNESS, body.depth),
      material
    );
    bodyMesh.position.set(
      body.centerX,
      surfaceHeight - WATER_FLOOR_THICKNESS * 0.5,
      body.centerZ
    );
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    return group;
  }

  function addRiverEdgeWall(group, material, edge, wallHeight, baseHeight) {
    const mesh =
      edge === 'north' || edge === 'south'
        ? new THREE.Mesh(
            getSharedBoxGeometry(TILE_SIZE, wallHeight, RIVER_WALL_THICKNESS),
            material
          )
        : new THREE.Mesh(
            getSharedBoxGeometry(RIVER_WALL_THICKNESS, wallHeight, TILE_SIZE),
            material
          );

    if (edge === 'north') {
      mesh.position.set(0, baseHeight + wallHeight * 0.5, -0.5);
    } else if (edge === 'east') {
      mesh.position.set(0.5, baseHeight + wallHeight * 0.5, 0);
    } else if (edge === 'south') {
      mesh.position.set(0, baseHeight + wallHeight * 0.5, 0.5);
    } else {
      mesh.position.set(-0.5, baseHeight + wallHeight * 0.5, 0);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  function getWaterBodyInset(tileX, tileY, kind, buildCache: TileBuildCache | null) {
    if (!buildCache) {
      return { north: 0, east: 0, south: 0, west: 0 };
    }

    if (kind === 'ocean') {
      return { north: 0, east: 0, south: 0, west: 0 };
    }

    const tile = buildCache.getTile(tileX, tileY);
    const profile = buildCache.getSurfaceProfile(tileX, tileY, tile);
    const insetAmount = profile.boundaryTransition?.bodyInset ?? 0;

    return {
      north: shouldInsetWaterEdge(tileX, tileY - 1, kind, buildCache)
        ? insetAmount
        : 0,
      east: shouldInsetWaterEdge(tileX + 1, tileY, kind, buildCache)
        ? insetAmount
        : 0,
      south: shouldInsetWaterEdge(tileX, tileY + 1, kind, buildCache)
        ? insetAmount
        : 0,
      west: shouldInsetWaterEdge(tileX - 1, tileY, kind, buildCache)
        ? insetAmount
        : 0,
    };
  }

  function shouldInsetWaterEdge(tileX, tileY, kind, buildCache: TileBuildCache) {
    const neighborTile = buildCache.getTile(tileX, tileY);
    const profile = buildCache.getSurfaceProfile(tileX, tileY, neighborTile);
    if (profile.underlayKind && isWaterKind(profile.underlayKind)) {
      return false;
    }
    if (neighborTile.kind === 'bridge' || neighborTile.kind === 'dock') {
      return false;
    }
    if (kind === 'ocean') {
      return !isWaterKind(neighborTile.kind);
    }
    return !isWaterKind(neighborTile.kind);
  }

  function getAdjacentBoundaryNeighbors(
    state,
    tileX,
    tileY,
    surfaceProfile,
    buildCache: TileBuildCache
  ) {
    if (!surfaceProfile.chamferEligible) {
      return null;
    }

    const neighbors = {
      north: getBoundaryProfile(
        tileX,
        tileY - 1,
        buildCache
      ),
      northeast: getBoundaryProfile(
        tileX + 1,
        tileY - 1,
        buildCache
      ),
      east: getBoundaryProfile(
        tileX + 1,
        tileY,
        buildCache
      ),
      southeast: getBoundaryProfile(
        tileX + 1,
        tileY + 1,
        buildCache
      ),
      south: getBoundaryProfile(
        tileX,
        tileY + 1,
        buildCache
      ),
      southwest: getBoundaryProfile(
        tileX - 1,
        tileY + 1,
        buildCache
      ),
      west: getBoundaryProfile(
        tileX - 1,
        tileY,
        buildCache
      ),
      northwest: getBoundaryProfile(
        tileX - 1,
        tileY - 1,
        buildCache
      ),
      count: 0,
    };
    neighbors.count =
      Number(neighbors.north) +
      Number(neighbors.northeast) +
      Number(neighbors.east) +
      Number(neighbors.southeast) +
      Number(neighbors.south) +
      Number(neighbors.southwest) +
      Number(neighbors.west) +
      Number(neighbors.northwest);
    return neighbors;
  }

  function getBoundaryProfile(tileX, tileY, buildCache: TileBuildCache) {
    const tile = buildCache.getTile(tileX, tileY);
    const profile = buildCache.getSurfaceProfile(tileX, tileY, tile);
    return profile.boundaryRole ? profile : null;
  }

  function getCornerSurfaceHeight(surfaceHeight, boundaries) {
    const boundary = pickCornerBoundaryProfile(boundaries);
    if (boundary) {
      return getBoundaryEdgeHeight(surfaceHeight, boundary);
    }
    return surfaceHeight;
  }

  function getBoundaryWallHeight(surfaceHeight, boundaryProfile) {
    if (!boundaryProfile) {
      return 0;
    }
    return getBoundaryEdgeHeight(surfaceHeight, boundaryProfile) - boundaryProfile.surfaceHeight;
  }

  function getBoundaryEdgeHeight(surfaceHeight, boundaryProfile) {
    const transition = boundaryProfile.boundaryTransition ?? {};
    const maxChamferDrop = transition.maxChamferDrop ?? 0;
    const minBankHeight = transition.minBankHeight ?? 0;
    return Math.max(
      surfaceHeight - maxChamferDrop,
      boundaryProfile.surfaceHeight + minBankHeight
    );
  }

  function updateSkyAndLights(
    worldX,
    worldY,
    timeMs,
    environment,
    renderBudget?: RenderBudget
  ): DaylightCycleState {
    const cycle = applyCelestialEnvironmentOverrides(
      getDaylightCycleState(timeMs, environment.cycle ?? {}),
      (environment.celestial ?? {}) as CelestialEnvironmentOverrides
    );
    const dayBlend = cycle.daylight;
    const twilightBlend = Math.max(0, 1 - Math.abs(cycle.daylight - 0.5) * 2);
    const sky = environment.sky ?? {};
    const lighting = environment.lighting ?? {};
    const weather = environment.weather?.current;
    const weatherVisibility = weather?.visibility ?? 0.88;
    const weatherCloudCover = weather?.cloudCover ?? 0;
    const renderEffectQuality = getRenderEffectQualityProfile(
      renderBudget?.quality
    );
    renderer.shadowMap.enabled = renderEffectQuality.shadowMapEnabled;
    const starDensity =
      (environment.stars?.density ?? 1) *
      clamp(1 - weatherCloudCover * 0.42 - (1 - weatherVisibility) * 0.58, 0.08, 1) *
      renderEffectQuality.starDensityMultiplier;
    const skyPositionSignature = getSkyPositionSignature(cycle, starDensity);
    const twilightPalette = getTwilightSkyPalette(sky, cycle);
    updateSkyLightingColorState(skyLightingColorState, {
      sky,
      twilightPalette,
      lighting,
      defaults: {
        daySkyColor: SKY_DAY_COLOR,
        nightSkyColor: SKY_NIGHT_COLOR,
        fogNightColor: FOG_NIGHT_COLOR,
        ambientDayColor: '#eaf6ff',
        groundDayColor: '#28442f',
        sunColor: '#fff3cf',
      },
    });
    const fogRange = getWeatherFogRange(weatherVisibility);

    scene.background
      .copy(skyLightingColorState.nightSkyColor)
      .lerp(skyLightingColorState.sunsetSkyColor, cycle.twilight)
      .lerp(skyLightingColorState.daySkyColor, dayBlend);
    scene.fog.color
      .copy(skyLightingColorState.nightFogColor)
      .lerp(skyLightingColorState.twilightFogColor, cycle.twilight);
    scene.fog.near = fogRange.near;
    scene.fog.far = fogRange.far;

    ambientLight.intensity = 0.2 + cycle.twilight * 0.75 + dayBlend * 0.45;
    ambientLight.color
      .set(lighting.ambientNightColor ?? '#9fc4ff')
      .lerp(skyLightingColorState.ambientDayColor, dayBlend);
    ambientLight.groundColor
      .set(lighting.groundNightColor ?? '#101826')
      .lerp(skyLightingColorState.groundDayColor, 0.35 + dayBlend * 0.65);

    if (skyPositionSignature !== lastSkyPositionSignature || !cachedSkyPose) {
      cachedSkyPose = createCachedSkyPose(cycle);
      lastSkyPositionSignature = skyPositionSignature;
      skyRoot.rotation.z = cachedSkyPose.skyRotationZ;
      syncStarField(stars, cycle, starDensity);
      sunSprite.position.set(
        cachedSkyPose.sunSpriteX,
        cachedSkyPose.sunSpriteY,
        cachedSkyPose.sunSpriteZ
      );
      sunSprite.material.opacity = cachedSkyPose.sunSpriteOpacity;
      sunSprite.visible = cachedSkyPose.sunSpriteOpacity > 0.03;
      moonSprite.position.set(
        cachedSkyPose.moonSpriteX,
        cachedSkyPose.moonSpriteY,
        cachedSkyPose.moonSpriteZ
      );
      moonSprite.material.opacity = cachedSkyPose.moonSpriteOpacity;
      moonSprite.visible = cachedSkyPose.moonSpriteOpacity > 0.03;
    }
    const skyPose = cachedSkyPose;
    sunLight.position.set(
      worldX - skyPose.sunOrbitX,
      skyPose.sunOrbitY,
      worldY - skyPose.sunOrbitZ
    );
    sunTarget.position.set(worldX, 0, worldY);
    sunLight.intensity =
      (dayBlend * 1.75 + twilightBlend * 0.25) *
      (1 - (cycle.solarEclipse?.daylightReduction ?? 0) * 0.6);
    sunLight.color
      .set('#ffb06e')
      .lerp(skyLightingColorState.sunDayColor, Math.min(1, dayBlend + 0.2));

    const shadowStrength = Math.max(0, cycle.daylight - 0.12);
    sunLight.castShadow =
      renderEffectQuality.allowShadowCasting &&
      shadowStrength * (lighting.shadowStrength ?? 1) > 0.08;

    moonLight.position.set(
      worldX - skyPose.moonOrbitX,
      skyPose.moonOrbitY,
      worldY - skyPose.moonOrbitZ
    );
    moonTarget.position.set(worldX, 0, worldY);
    moonLight.color.set(lighting.moonColor ?? '#9ec5ff');
    moonLight.intensity =
      cycle.night * (0.1 + cycle.moonIllumination * 0.24) +
      (cycle.solarEclipse?.coverage ?? 0) * 0.04;

    skyRoot.position.set(worldX, 0, worldY);
    const constellationSignature = getSkyConstellationSignature(cycle);
    const eventSignature = getSkyEventSignature(cycle);
    const milkyWaySignature = getSkyMilkyWaySignature(cycle);
    const auroraSignature = getSkyAuroraSignature(cycle);
    if (constellationSignature !== lastSkyConstellationSignature) {
      syncConstellationSky(constellationRoot, cycle);
      lastSkyConstellationSignature = constellationSignature;
    }
    if (eventSignature !== lastSkyEventSignature) {
      syncCelestialEvents(eventRoot, cycle);
      lastSkyEventSignature = eventSignature;
    }
    if (milkyWaySignature !== lastSkyMilkyWaySignature) {
      syncMilkyWayBelt(milkyWayRoot, cycle);
      lastSkyMilkyWaySignature = milkyWaySignature;
    }
    if (auroraSignature !== lastSkyAuroraSignature) {
      syncAuroraBands(auroraRoot, cycle);
      lastSkyAuroraSignature = auroraSignature;
    }
    constellationRoot.visible =
      renderEffectQuality.showConstellations && cycle.starsOpacity > 0.02;
    eventRoot.visible = (cycle.visibleEvents ?? []).some(
      (event) => event.visibility > 0.02
    );
    milkyWayRoot.visible =
      renderEffectQuality.showMilkyWay && cycle.starsOpacity > 0.02;
    auroraRoot.visible =
      renderEffectQuality.showAurora &&
      (cycle.auroraBands ?? []).some((band) => band.intensity > 0.03);

    if (lastMoonPhaseIndex !== cycle.moonPhaseIndex) {
      updateMoonPhaseTexture(
        moonSprite.material.map,
        cycle.moonPhaseIndex,
        cycle.moonIllumination
      );
      moonSprite.material.map.needsUpdate = true;
      lastMoonPhaseIndex = cycle.moonPhaseIndex;
    }

    return cycle;
  }

  return {
    canOccupy,
    getStats,
    render,
    resize,
  };
}

export function getDecoratedTileSurfaceHeight(tile: DecoratedSurfaceTile): number {
  return typeof tile.surfaceHeight === 'number' ? tile.surfaceHeight : 0;
}

export function getFacingVisibilityBucket(
  facingAngle: number,
  bucketCount = FACING_BUCKETS
): number {
  const normalized =
    ((facingAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor((normalized / (Math.PI * 2)) * bucketCount);
}

export function clampCameraPitch(pitch: number): number {
  return Math.min(MAX_CAMERA_PITCH, Math.max(MIN_CAMERA_PITCH, pitch));
}

export function syncDynamicTileNodes(
  entries: Iterable<DynamicTileNode>,
  {
    three,
    state,
    timeMs,
    cycle,
    environment,
  }: {
    three: Render3DState extends { viewMode?: infer _ } ? Parameters<
      NonNullable<TilePlugin['sync3DModel']>
    >[0]['three'] : never;
    state: Render3DState;
    timeMs?: number;
    cycle: Parameters<NonNullable<TilePlugin['sync3DModel']>>[0]['cycle'];
    environment: WorldEnvironmentLike;
  }
): void {
  for (const entry of entries) {
    if ((entry.modelVisibilityOpacity ?? 1) <= MIN_MODEL_VISIBILITY_OPACITY) {
      continue;
    }
    entry.sync3DModel?.({
      three,
      state,
      tile: entry.tile,
      tileX: entry.tileX,
      tileY: entry.tileY,
      model: entry.model,
      timeMs,
      cycle,
      environment,
    });
  }
}

export function getFarLandModelOpacity(
  distance: number,
  tileX: number,
  tileY: number,
  {
    fullVisibilityDistance = FAR_MODEL_FULL_VISIBILITY_DISTANCE,
    revealDistanceVariance = FAR_MODEL_REVEAL_DISTANCE_VARIANCE,
    fadeDistance = FAR_MODEL_FADE_DISTANCE,
    sample = hash2D,
  }: {
    fullVisibilityDistance?: number;
    revealDistanceVariance?: number;
    fadeDistance?: number;
    sample?: typeof hash2D;
  } = {}
): number {
  if (distance <= fullVisibilityDistance) {
    return 1;
  }

  const revealDistance =
    fullVisibilityDistance +
    sample(LAND_MODEL_REVEAL_SEED, tileX, tileY) *
      revealDistanceVariance;
  if (distance <= revealDistance) {
    return 1;
  }

  const fadeProgress = (distance - revealDistance) / Math.max(0.001, fadeDistance);
  return clamp01(1 - fadeProgress);
}

export function shouldKeepTileModelFullDetailLonger(
  tile?: Pick<TileLike, 'kind'>
): boolean {
  return tile ? LANDMARK_TILE_KINDS.has(tile.kind) : false;
}

export function getTileModelLowDetailDistance(
  tile?: Pick<TileLike, 'kind'>
): number {
  return shouldKeepTileModelFullDetailLonger(tile)
    ? LANDMARK_LOW_DETAIL_MODEL_DISTANCE
    : LOW_DETAIL_MODEL_DISTANCE;
}

export function getTileModelLowDetailDistanceSquared(
  tile?: Pick<TileLike, 'kind'>
): number {
  const distance = getTileModelLowDetailDistance(tile);
  return distance * distance;
}

export function getTileModelLowDetailExitDistanceSquared(
  tile?: Pick<TileLike, 'kind'>
): number {
  const exitDistance =
    getTileModelLowDetailDistance(tile) - LOD_DETAIL_HYSTERESIS_DISTANCE;
  return exitDistance * exitDistance;
}

export function getTileModelDetailLevel(
  distance: number,
  tile?: Pick<TileLike, 'kind'>,
  lowDetailDistance = getTileModelLowDetailDistance(tile)
): 'full' | 'low' {
  return distance >= lowDetailDistance ? 'low' : 'full';
}

export function getLodThresholdSummary(): LodThresholdSummary {
  return {
    lowDetailDistance: LOW_DETAIL_MODEL_DISTANCE,
    lowDetailEnterDistance: LOW_DETAIL_MODEL_DISTANCE,
    lowDetailExitDistance: LOW_DETAIL_EXIT_DISTANCE,
    hysteresisDistance: LOD_DETAIL_HYSTERESIS_DISTANCE,
    pendingBuildFullDetailDistance: PENDING_BUILD_FULL_DETAIL_DISTANCE,
    syncMovementDistance: LOD_SYNC_MOVEMENT_DISTANCE,
  };
}

export function getTileModelDetailLevelFromSquaredDistance(
  distanceSquared: number,
  tile?: Pick<TileLike, 'kind'>,
  lowDetailDistanceSquared = getTileModelLowDetailDistanceSquared(tile)
): 'full' | 'low' {
  return distanceSquared >= lowDetailDistanceSquared ? 'low' : 'full';
}

export function getTileModelDetailLevelWithHysteresis(
  currentDetailLevel: 'full' | 'low' | undefined,
  distanceSquared: number,
  tile?: Pick<TileLike, 'kind'>,
  {
    lowDetailEnterDistanceSquared = getTileModelLowDetailDistanceSquared(tile),
    lowDetailExitDistanceSquared = getTileModelLowDetailExitDistanceSquared(tile),
  }: {
    lowDetailEnterDistanceSquared?: number;
    lowDetailExitDistanceSquared?: number;
  } = {}
): 'full' | 'low' {
  if (currentDetailLevel === 'low') {
    return distanceSquared <= lowDetailExitDistanceSquared ? 'full' : 'low';
  }

  return distanceSquared >= lowDetailEnterDistanceSquared ? 'low' : 'full';
}

export function shouldEvaluateTileModelDetailLevel(
  currentDetailLevel: 'full' | 'low' | undefined,
  distanceSquared: number,
  tile?: Pick<TileLike, 'kind'>,
  lowDetailExitDistanceSquared = getTileModelLowDetailExitDistanceSquared(tile)
): boolean {
  if (currentDetailLevel !== 'low') {
    return true;
  }

  return distanceSquared <= lowDetailExitDistanceSquared;
}

export function getPendingWorldBuildDetailLevel(
  desiredDetailLevel: 'full' | 'low',
  distanceSquared: number,
  remainingQueueLength: number,
  tile?: Pick<TileLike, 'kind'>,
  fullDetailDistanceSquared = PENDING_BUILD_FULL_DETAIL_DISTANCE_SQUARED,
  lowDetailQueueThreshold = PENDING_BUILD_LOW_DETAIL_QUEUE_THRESHOLD
): 'full' | 'low' {
  if (desiredDetailLevel === 'low') {
    return 'low';
  }
  if (shouldKeepTileModelFullDetailLonger(tile)) {
    return 'full';
  }
  if (remainingQueueLength <= lowDetailQueueThreshold) {
    return 'full';
  }
  return distanceSquared <= fullDetailDistanceSquared ? 'full' : 'low';
}

export function shouldSyncTileModelDetailLevels(
  previousPosition: { x: number; y: number } | null,
  nextX: number,
  nextY: number,
  minimumMovementSquared = LOD_SYNC_MOVEMENT_DISTANCE_SQUARED
): boolean {
  if (!previousPosition) {
    return true;
  }

  const dx = nextX - previousPosition.x;
  const dy = nextY - previousPosition.y;
  return dx * dx + dy * dy >= minimumMovementSquared;
}

export function shouldSyncWorldCurvature(
  previousPosition: { x: number; y: number } | null,
  nextX: number,
  nextY: number,
  previousMutationVersion: number,
  nextMutationVersion: number
): boolean {
  if (previousMutationVersion !== nextMutationVersion) {
    return true;
  }
  if (!previousPosition) {
    return true;
  }

  return previousPosition.x !== nextX || previousPosition.y !== nextY;
}

export function getWorldCurvatureOffset(
  distance: number,
  {
    flatDistance = HORIZON_CURVATURE_FLAT_DISTANCE,
    farDistance = HORIZON_CURVATURE_FAR_DISTANCE,
    maxDrop = HORIZON_CURVATURE_MAX_DROP,
  }: {
    flatDistance?: number;
    farDistance?: number;
    maxDrop?: number;
  } = {}
): number {
  if (distance <= flatDistance || maxDrop <= 0) {
    return 0;
  }
  const usableDistance = Math.max(flatDistance + 0.001, farDistance);
  const progress = clamp01((distance - flatDistance) / (usableDistance - flatDistance));
  return -maxDrop * progress * progress;
}

function syncWorldCurvature(
  entries: Iterable<DynamicTileNode>,
  state: Render3DState
): void {
  for (const entry of entries) {
    const distance = Math.hypot(
      entry.tileX - state.player.x,
      entry.tileY - state.player.y
    );
    entry.node.position.y = getWorldCurvatureOffset(distance);
  }
}

export function updateFarLandModelVisibility(
  entries: Iterable<DynamicTileNode>,
  state: Render3DState
): void {
  for (const entry of entries) {
    if (!entry.distanceFadeEligible || !entry.modelRoot) {
      entry.modelVisibilityOpacity = 1;
      continue;
    }

    const distance = Math.hypot(
      entry.tileX - state.player.x,
      entry.tileY - state.player.y
    );
    const opacity = getFarLandModelOpacity(distance, entry.tileX, entry.tileY);
    if (
      Math.abs((entry.modelVisibilityOpacity ?? Number.NaN) - opacity) <=
      MODEL_VISIBILITY_OPACITY_EPSILON
    ) {
      continue;
    }
    entry.modelVisibilityOpacity = opacity;
    applyObjectDistanceFade(entry.modelRoot, opacity);
  }
}

export function getBoundaryPriority(
  boundaryRole: SurfaceBoundaryRole3D | null
): number {
  if (boundaryRole === 'sea') {
    return 0;
  }
  if (boundaryRole === 'channel' || boundaryRole === 'crossing') {
    return 1;
  }
  return 2;
}

export function pickCornerBoundaryProfile<
  TBoundary extends { boundaryRole: SurfaceBoundaryRole3D | null },
>(boundaries: Array<TBoundary | null>): TBoundary | null {
  let bestBoundary: TBoundary | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;

  for (const boundary of boundaries) {
    if (!boundary) {
      continue;
    }
    const priority = getBoundaryPriority(boundary.boundaryRole);
    if (priority < bestPriority) {
      bestBoundary = boundary;
      bestPriority = priority;
    }
  }

  return bestBoundary;
}

export function freezeStaticObjectTransforms(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!isLikelyStaticTransformObject(node)) {
      return;
    }
    if (node.matrixAutoUpdate === false) {
      return;
    }
    node.matrixAutoUpdate = false;
    node.updateMatrix?.();
  });
}

export function prepareObjectForDistanceFade(root: THREE.Object3D): void {
  const targets = getDistanceFadeTargets(root);
  targets.allNodes.forEach((child) => {
    child.userData.distanceFadeBaseVisible ??= child.visible;
  });
  targets.renderableNodes.forEach((renderable) => {
    if (renderable.userData.distanceFadePrepared) {
      return;
    }

    renderable.userData.distanceFadePrepared = true;
    renderable.userData.distanceFadeOpacity ??= 1;

    for (const material of getObjectMaterials(renderable)) {
      material.userData.distanceFadeBaseOpacity ??= material.opacity;
      material.userData.distanceFadeBaseTransparent ??= material.transparent;
      material.userData.distanceFadeBaseDepthWrite ??= material.depthWrite;
    }

    const renderableWithHooks = renderable as THREE.Object3D & {
      onBeforeRender?: (...args: unknown[]) => void;
      onAfterRender?: (...args: unknown[]) => void;
    };
    const originalBeforeRender = renderableWithHooks.onBeforeRender;
    const originalAfterRender = renderableWithHooks.onAfterRender;
    renderableWithHooks.onBeforeRender = (...args: unknown[]) => {
      applyRenderableDistanceFadeMaterials(renderable);
      originalBeforeRender?.(...args);
    };
    renderableWithHooks.onAfterRender = (...args: unknown[]) => {
      restoreRenderableDistanceFadeMaterials(renderable);
      originalAfterRender?.(...args);
    };
  });
}

export function applyObjectDistanceFade(
  root: THREE.Object3D,
  opacity: number
): void {
  const targets = getDistanceFadeTargets(root);
  targets.allNodes.forEach((child) => {
    const baseVisible = child.userData.distanceFadeBaseVisible ?? true;
    child.visible = baseVisible && opacity > MIN_MODEL_VISIBILITY_OPACITY;
  });
  targets.renderableNodes.forEach((renderable) => {
    renderable.userData.distanceFadeOpacity = opacity;
    applyRenderableDistanceFadeMaterials(renderable);
  });
}

function applyRenderableDistanceFadeMaterials(
  renderable: THREE.Object3D & { material: THREE.Material | THREE.Material[] }
): void {
  const opacity = renderable.userData.distanceFadeOpacity ?? 1;
  for (const material of getObjectMaterials(renderable)) {
    const baseOpacity = material.userData.distanceFadeBaseOpacity ?? material.opacity;
    const baseTransparent =
      material.userData.distanceFadeBaseTransparent ?? material.transparent;
    const baseDepthWrite =
      material.userData.distanceFadeBaseDepthWrite ?? material.depthWrite;
    material.opacity = baseOpacity * opacity;
    material.transparent = baseTransparent || opacity < 0.999;
    material.depthWrite = baseDepthWrite && opacity >= 0.999;
  }
}

function restoreRenderableDistanceFadeMaterials(
  renderable: THREE.Object3D & { material: THREE.Material | THREE.Material[] }
): void {
  for (const material of getObjectMaterials(renderable)) {
    material.opacity = material.userData.distanceFadeBaseOpacity ?? material.opacity;
    material.transparent =
      material.userData.distanceFadeBaseTransparent ?? material.transparent;
    material.depthWrite =
      material.userData.distanceFadeBaseDepthWrite ?? material.depthWrite;
  }
}

function markOwnedGeometry<T extends object>(geometry: T): T {
  ownedDisposableGeometries.add(geometry);
  return geometry;
}

export function getSharedBoxGeometry(
  width: number,
  height: number,
  depth: number
): THREE.BoxGeometry {
  const key = `${width}:${height}:${depth}`;
  return getOrCreateMapValue(
    sharedBoxGeometryCache,
    key,
    () => new THREE.BoxGeometry(width, height, depth)
  );
}

export function getSharedPlaneGeometry(
  width: number,
  height: number
): THREE.PlaneGeometry {
  const key = `${width}:${height}`;
  return getOrCreateMapValue(
    sharedPlaneGeometryCache,
    key,
    () => new THREE.PlaneGeometry(width, height)
  );
}

function getDistanceFadeTargets(root: THREE.Object3D): DistanceFadeTargets {
  const cached = distanceFadeTargetCache.get(root);
  if (cached) {
    return cached;
  }

  const allNodes: THREE.Object3D[] = [];
  const renderableNodes: Array<
    THREE.Object3D & { material: THREE.Material | THREE.Material[] }
  > = [];

  root.traverse((child) => {
    allNodes.push(child);
    const renderable = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
    };
    if (renderable.material) {
      renderableNodes.push(
        renderable as THREE.Object3D & {
          material: THREE.Material | THREE.Material[];
        }
      );
    }
  });

  const targets = { allNodes, renderableNodes };
  distanceFadeTargetCache.set(root, targets);
  return targets;
}

function getObjectMaterials(
  node: THREE.Object3D & {
    material?: THREE.Material | THREE.Material[];
  }
): THREE.Material[] {
  if (!node.material) {
    return [];
  }
  return Array.isArray(node.material) ? node.material : [node.material];
}

export function disposeObject3DResources(
  root: Pick<THREE.Object3D, 'traverse'>
): void {
  const disposedMaterials = new Set<unknown>();
  const disposedGeometries = new Set<unknown>();

  root.traverse((child) => {
    const renderable = child as THREE.Object3D & {
      geometry?: { dispose?: () => void };
      material?: THREE.Material | THREE.Material[];
    };

    if (
      renderable.geometry &&
      ownedDisposableGeometries.has(renderable.geometry) &&
      !disposedGeometries.has(renderable.geometry)
    ) {
      disposedGeometries.add(renderable.geometry);
      renderable.geometry.dispose?.();
    }

    for (const material of getObjectMaterials(renderable)) {
      if (
        disposedMaterials.has(material) ||
        !ownedDisposableMaterials.has(material)
      ) {
        continue;
      }
      disposedMaterials.add(material);
      recordRecentMetric(ownedMaterialDisposalTimestamps, performance.now());
      (material as THREE.Material & { dispose?: () => void }).dispose?.();
    }
  });
}

export function collectSceneResourceStats(
  root: Pick<THREE.Object3D, 'traverse' | 'children' | 'type'>
): SceneResourceStats {
  let object3dCount = 0;
  let visibleObjectCount = 0;
  let invisibleObjectCount = 0;
  let groupCount = 0;
  let meshCount = 0;
  let instancedMeshCount = 0;
  let visibleInstancedMeshCount = 0;
  let renderedInstanceCount = 0;
  let visibleMeshCount = 0;
  let totalHierarchyDepth = 0;
  let maxHierarchyDepth = 0;
  let emptyGroupCount = 0;
  let oneChildGroupCount = 0;
  let matrixAutoUpdateCount = 0;
  let staticMatrixAutoUpdateCount = 0;
  let pointsCount = 0;
  let lineObjectCount = 0;
  let cameraCount = 0;
  let activeParticleSystemCount = 0;
  let activeParticleCount = 0;
  let spriteCount = 0;
  let lightCount = 0;
  let ambientLightCount = 0;
  let directionalLightCount = 0;
  let pointLightCount = 0;
  let spotLightCount = 0;
  let hemisphereLightCount = 0;
  let dynamicLightCount = 0;
  let shadowLightCount = 0;
  let vertexCount = 0;
  let materialRefCount = 0;
  let geometryRefCount = 0;
  let geometryBytes = 0;
  let vertexBufferBytes = 0;
  let indexBufferBytes = 0;
  let largestGeometryVertexCount = 0;
  let largestGeometryBytes = 0;
  let textureMemoryEstimateBytes = 0;
  let treeCount = 0;
  let treeObjectCount = 0;
  let treeMeshCount = 0;
  let treeMaterialRefCount = 0;
  const materials = new Set<THREE.Material>();
  const geometries = new Set<unknown>();
  const textures = new Set<unknown>();
  const materialTexturesBuffer: unknown[] = [];

  traverseSceneGraphWithDepth(root, (child, depth) => {
    object3dCount += 1;
    totalHierarchyDepth += depth;
    maxHierarchyDepth = Math.max(maxHierarchyDepth, depth);
    if ((child as THREE.Object3D).visible !== false) {
      visibleObjectCount += 1;
    } else {
      invisibleObjectCount += 1;
    }
    if ((child as THREE.Object3D & { matrixAutoUpdate?: boolean }).matrixAutoUpdate) {
      matrixAutoUpdateCount += 1;
      if (isLikelyStaticTransformObject(child as THREE.Object3D)) {
        staticMatrixAutoUpdateCount += 1;
      }
    }
    if ((child as THREE.Object3D).type === 'Group') {
      groupCount += 1;
      const childCount = getObjectChildCount(child);
      if (childCount === 0) {
        emptyGroupCount += 1;
      } else if (childCount === 1) {
        oneChildGroupCount += 1;
      }
    }
    if ((child as THREE.Object3D).type === 'InstancedMesh') {
      instancedMeshCount += 1;
      if ((child as THREE.Object3D).visible !== false) {
        visibleInstancedMeshCount += 1;
        renderedInstanceCount += getInstancedMeshCount(child);
      }
    }
    if ((child as THREE.Object3D).type === 'Points') {
      pointsCount += 1;
      if ((child as THREE.Object3D).visible !== false) {
        activeParticleSystemCount += 1;
        activeParticleCount += getGeometryVertexCount(
          (child as THREE.Object3D & { geometry?: unknown }).geometry
        );
      }
    }
    if (isLineObjectType((child as THREE.Object3D).type)) {
      lineObjectCount += 1;
    }
    if (isCameraObjectType(child as THREE.Object3D)) {
      cameraCount += 1;
    }
    if ((child as THREE.Object3D).type === 'Sprite') {
      spriteCount += 1;
    }
    if ((child as THREE.Object3D).isLight) {
      lightCount += 1;
      if (isAmbientLightType((child as THREE.Object3D).type)) {
        ambientLightCount += 1;
      }
      if ((child as THREE.Object3D).type === 'DirectionalLight') {
        directionalLightCount += 1;
      }
      if ((child as THREE.Object3D).type === 'PointLight') {
        pointLightCount += 1;
      }
      if ((child as THREE.Object3D).type === 'SpotLight') {
        spotLightCount += 1;
      }
      if ((child as THREE.Object3D).type === 'HemisphereLight') {
        hemisphereLightCount += 1;
      }
      if (isDynamicLightType((child as THREE.Object3D).type)) {
        dynamicLightCount += 1;
      }
      if ((child as THREE.Object3D & { castShadow?: boolean }).castShadow) {
        shadowLightCount += 1;
      }
    }
    if ((child as THREE.Object3D).userData?.renderStatKind === 'tree') {
      treeCount += 1;
      const treeStats = collectTaggedTreeStats(child as Pick<THREE.Object3D, 'traverse'>);
      treeObjectCount += treeStats.objectCount;
      treeMeshCount += treeStats.meshCount;
      treeMaterialRefCount += treeStats.materialRefCount;
    }

    const renderable = child as THREE.Object3D & {
      geometry?: unknown;
      material?: THREE.Material | THREE.Material[];
    };
    if (renderable.geometry) {
      geometryRefCount += 1;
      if (!geometries.has(renderable.geometry)) {
        geometries.add(renderable.geometry);
        const geometryVertexCount = getGeometryVertexCount(renderable.geometry);
        vertexCount += geometryVertexCount;
        const geometryMemory = getGeometryMemoryEstimate(renderable.geometry);
        geometryBytes += geometryMemory.totalBytes;
        vertexBufferBytes += geometryMemory.vertexBufferBytes;
        indexBufferBytes += geometryMemory.indexBufferBytes;
        largestGeometryVertexCount = Math.max(
          largestGeometryVertexCount,
          geometryVertexCount
        );
        largestGeometryBytes = Math.max(
          largestGeometryBytes,
          geometryMemory.totalBytes
        );
      }
    }

    const childMaterials = getObjectMaterials(renderable);
    materialRefCount += childMaterials.length;
    if (childMaterials.length > 0 && renderable.geometry) {
      meshCount += 1;
      if (renderable.visible !== false) {
        visibleMeshCount += 1;
      }
    }
    for (const material of childMaterials) {
      materials.add(material);
      const materialTextures = collectMaterialTexturesInto(
        material,
        materialTexturesBuffer
      );
      for (let index = 0; index < materialTextures.length; index += 1) {
        const texture = materialTextures[index];
        if (textures.has(texture)) {
          continue;
        }
        textures.add(texture);
        textureMemoryEstimateBytes += getTextureMemoryEstimateBytes(texture);
      }
    }
  });

  return {
    object3dCount,
    visibleObjectCount,
    invisibleObjectCount,
    groupCount,
    meshCount,
    instancedMeshCount,
    visibleInstancedMeshCount,
    renderedInstanceCount,
    visibleMeshCount,
    maxHierarchyDepth,
    averageHierarchyDepth:
      object3dCount > 0 ? totalHierarchyDepth / object3dCount : 0,
    emptyGroupCount,
    oneChildGroupCount,
    matrixAutoUpdateCount,
    staticMatrixAutoUpdateCount,
    pointsCount,
    lineObjectCount,
    cameraCount,
    activeParticleSystemCount,
    activeParticleCount,
    spriteCount,
    lightCount,
    ambientLightCount,
    directionalLightCount,
    pointLightCount,
    spotLightCount,
    hemisphereLightCount,
    dynamicLightCount,
    shadowLightCount,
    vertexCount,
    materialRefCount,
    geometryRefCount,
    materialCount: materials.size,
    sharedMaterialCount: Math.max(0, materialRefCount - materials.size),
    clonedMaterialCount: 0,
    transparentMaterialCount: countMaterialsMatching(materials, isTransparentMaterial),
    alphaTestMaterialCount: countMaterialsMatching(materials, usesAlphaTest),
    doubleSidedMaterialCount: countMaterialsMatching(materials, isDoubleSidedMaterial),
    fogMaterialCount: countMaterialsMatching(materials, receivesFog),
    customShaderMaterialCount: countMaterialsMatching(materials, usesCustomShaders),
    materialTypes: summarizeMaterialTypes(materials),
    materialsCreatedDuringSamplingWindow: 0,
    materialsDisposedDuringSamplingWindow: 0,
    geometryCount: geometries.size,
    sharedGeometryCount: Math.max(0, geometryRefCount - geometries.size),
    geometryBytes,
    vertexBufferBytes,
    indexBufferBytes,
    averageVerticesPerGeometry:
      geometries.size > 0 ? vertexCount / geometries.size : 0,
    largestGeometryVertexCount,
    largestGeometryBytes,
    textureCount: textures.size,
    textureMemoryEstimateBytes,
    treeCount,
    treeObjectCount,
    treeMeshCount,
    treeMaterialRefCount,
  };
}

function isDynamicLightType(type: string): boolean {
  return (
    type === 'PointLight' ||
    type === 'SpotLight' ||
    type === 'RectAreaLight'
  );
}

function isAmbientLightType(type: string): boolean {
  return type === 'AmbientLight';
}

function isLineObjectType(type: string): boolean {
  return type === 'Line' || type === 'LineLoop' || type === 'LineSegments';
}

function isCameraObjectType(object: Pick<THREE.Object3D, 'type'> & { isCamera?: boolean }): boolean {
  return object.isCamera === true || object.type.endsWith('Camera');
}

const DYNAMIC_TRANSFORM_USER_DATA_KEYS = new Set([
  'poiWindResponder',
  'lighthouseBeamPivot',
  'observatoryDome',
  'observatoryTelescope',
  'forestFirefly',
]);
function isLikelyStaticTransformObject(
  object: THREE.Object3D & { userData?: Record<string, unknown> }
): boolean {
  if (object.isLight || isCameraObjectType(object)) {
    return false;
  }
  return !hasDynamicTransformUserData(object.userData);
}

function hasDynamicTransformUserData(
  userData: Record<string, unknown> | undefined
): boolean {
  if (!userData) {
    return false;
  }
  for (const key of DYNAMIC_TRANSFORM_USER_DATA_KEYS) {
    if (key in userData) {
      return true;
    }
  }
  return false;
}

function traverseSceneGraphWithDepth(
  root: Pick<THREE.Object3D, 'children' | 'type'>,
  callback: (child: THREE.Object3D, depth: number) => void
): void {
  const visit = (node: THREE.Object3D, depth: number) => {
    callback(node, depth);
    const children = ((node as unknown as { children?: unknown }).children ?? []) as unknown[];
    for (const child of children) {
      visit(child as THREE.Object3D, depth + 1);
    }
  };
  visit(root as THREE.Object3D, 0);
}

function getObjectChildCount(object: unknown): number {
  const children = (object as { children?: unknown })?.children;
  return Array.isArray(children) ? children.length : 0;
}

function countMaterialsMatching(
  materials: ReadonlySet<THREE.Material>,
  predicate: (material: THREE.Material) => boolean
): number {
  let count = 0;
  for (const material of materials) {
    if (predicate(material)) {
      count += 1;
    }
  }
  return count;
}

function isTransparentMaterial(material: THREE.Material): boolean {
  return (material as THREE.Material & { transparent?: boolean }).transparent === true;
}

function usesAlphaTest(material: THREE.Material): boolean {
  const alphaTest = (material as THREE.Material & { alphaTest?: number }).alphaTest;
  return typeof alphaTest === 'number' && alphaTest > 0;
}

function isDoubleSidedMaterial(material: THREE.Material): boolean {
  const side = (material as THREE.Material & { side?: number }).side;
  return typeof side === 'number' && side === THREE.DoubleSide;
}

function receivesFog(material: THREE.Material): boolean {
  return (material as THREE.Material & { fog?: boolean }).fog !== false;
}

function usesCustomShaders(material: THREE.Material): boolean {
  const typedMaterial = material as THREE.Material & {
    vertexShader?: unknown;
    fragmentShader?: unknown;
    type?: unknown;
  };
  return (
    typedMaterial.type === 'ShaderMaterial' ||
    typedMaterial.type === 'RawShaderMaterial' ||
    typeof typedMaterial.vertexShader === 'string' ||
    typeof typedMaterial.fragmentShader === 'string'
  );
}

function summarizeMaterialTypes(materials: ReadonlySet<THREE.Material>): string {
  const counts = new Map<string, number>();
  for (const material of materials) {
    const type = getMaterialTypeName(material);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([type, count]) => `${type}:${count}`)
    .join(', ');
}

function getMaterialTypeName(material: THREE.Material): string {
  const type = (material as THREE.Material & { type?: unknown }).type;
  return typeof type === 'string' && type.length > 0 ? type : 'Material';
}

function getInstancedMeshCount(object: unknown): number {
  const count = (object as { count?: unknown })?.count;
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

function getTextureMemoryEstimateBytes(texture: unknown): number {
  const image = (texture as {
    image?: {
      width?: number;
      height?: number;
      videoWidth?: number;
      videoHeight?: number;
    };
    generateMipmaps?: boolean;
  }).image;
  const width = image?.width ?? image?.videoWidth ?? 0;
  const height = image?.height ?? image?.videoHeight ?? 0;
  if (width <= 0 || height <= 0) {
    return 0;
  }

  const baseBytes = width * height * 4;
  const usesMipmaps = (texture as { generateMipmaps?: boolean }).generateMipmaps !== false;
  return usesMipmaps ? Math.round((baseBytes * 4) / 3) : baseBytes;
}

function getGeometryMemoryEstimate(geometry: unknown): {
  totalBytes: number;
  vertexBufferBytes: number;
  indexBufferBytes: number;
} {
  const attributes = (
    geometry as {
      attributes?: Record<string, { array?: ArrayLike<unknown> & { byteLength?: number } }>;
    }
  )?.attributes;
  let vertexBufferBytes = 0;

  for (const attribute of Object.values(attributes ?? {})) {
    vertexBufferBytes += getArrayLikeByteLength(attribute?.array);
  }

  const indexArray = (
    geometry as {
      index?: {
        array?: ArrayLike<unknown> & { byteLength?: number };
      };
    }
  )?.index?.array;
  const indexBufferBytes = getArrayLikeByteLength(indexArray);

  return {
    totalBytes: vertexBufferBytes + indexBufferBytes,
    vertexBufferBytes,
    indexBufferBytes,
  };
}

function getArrayLikeByteLength(
  arrayLike: (ArrayLike<unknown> & { byteLength?: number }) | undefined
): number {
  if (!arrayLike) {
    return 0;
  }
  if (typeof arrayLike.byteLength === 'number') {
    return arrayLike.byteLength;
  }
  if (typeof arrayLike.length !== 'number') {
    return 0;
  }
  return arrayLike.length * 4;
}

type DistanceFadeTargets = {
  allNodes: THREE.Object3D[];
  renderableNodes: Array<
    THREE.Object3D & { material: THREE.Material | THREE.Material[] }
  >;
};

function collectTaggedTreeStats(
  root: Pick<THREE.Object3D, 'traverse'>
): {
  objectCount: number;
  meshCount: number;
  materialRefCount: number;
} {
  let objectCount = 0;
  let meshCount = 0;
  let materialRefCount = 0;

  root.traverse((child) => {
    objectCount += 1;
    const renderable = child as THREE.Object3D & {
      geometry?: unknown;
      material?: THREE.Material | THREE.Material[];
    };
    const childMaterials = getObjectMaterials(renderable);
    if (childMaterials.length > 0 && renderable.geometry) {
      meshCount += 1;
      materialRefCount += childMaterials.length;
    }
  });

  return {
    objectCount,
    meshCount,
    materialRefCount,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function recordRecentMetric(
  timestamps: number[],
  nowMs: number,
  windowMs = 1000
): void {
  timestamps.push(nowMs);
  pruneRecentMetricTimestamps(timestamps, nowMs, windowMs);
}

export function countRecentMetricEvents(
  timestamps: number[],
  nowMs: number,
  windowMs = 1000
): number {
  pruneRecentMetricTimestamps(timestamps, nowMs, windowMs);
  return timestamps.length;
}

export function getRecentOwnedMaterialLifecycleCounts(
  nowMs: number,
  windowMs = 1000
): {
  createdCount: number;
  disposedCount: number;
} {
  return {
    createdCount: countRecentMetricEvents(
      ownedMaterialCreationTimestamps,
      nowMs,
      windowMs
    ),
    disposedCount: countRecentMetricEvents(
      ownedMaterialDisposalTimestamps,
      nowMs,
      windowMs
    ),
  };
}

export function resetOwnedMaterialLifecycleMetrics(): void {
  ownedMaterialCreationTimestamps.length = 0;
  ownedMaterialDisposalTimestamps.length = 0;
}

export function recordRecentDurationMetric(
  samples: RecentDurationSample[],
  sample: RecentDurationSample,
  windowMs = 1000
): void {
  samples.push(sample);
  pruneRecentDurationSamples(samples, sample.nowMs, windowMs);
}

export function getRecentDurationStats(
  samples: RecentDurationSample[],
  nowMs: number,
  windowMs = 1000
): {
  averageMs: number;
  maxMs: number;
} {
  pruneRecentDurationSamples(samples, nowMs, windowMs);
  if (samples.length === 0) {
    return {
      averageMs: 0,
      maxMs: 0,
    };
  }

  let totalMs = 0;
  let maxMs = 0;
  for (const sample of samples) {
    totalMs += sample.durationMs;
    maxMs = Math.max(maxMs, sample.durationMs);
  }

  return {
    averageMs: totalMs / samples.length,
    maxMs,
  };
}

export function recordRecentLabeledDurationMetric(
  samples: RecentLabeledDurationSample[],
  sample: RecentLabeledDurationSample,
  windowMs = 1000
): void {
  samples.push(sample);
  pruneRecentDurationSamples(samples, sample.nowMs, windowMs);
}

export function getRecentLabeledDurationStats(
  samples: RecentLabeledDurationSample[],
  nowMs: number,
  windowMs = 1000
): {
  averageMs: number;
  maxMs: number;
  maxLabel: string;
} {
  pruneRecentDurationSamples(samples, nowMs, windowMs);
  if (samples.length === 0) {
    return {
      averageMs: 0,
      maxMs: 0,
      maxLabel: '',
    };
  }

  let totalMs = 0;
  let maxMs = 0;
  let maxLabel = '';
  for (const sample of samples) {
    totalMs += sample.durationMs;
    if (sample.durationMs >= maxMs) {
      maxMs = sample.durationMs;
      maxLabel = sample.label;
    }
  }

  return {
    averageMs: totalMs / samples.length,
    maxMs,
    maxLabel,
  };
}

export function recordRecentCountMetric(
  samples: RecentCountSample[],
  sample: RecentCountSample,
  windowMs = 1000
): void {
  samples.push(sample);
  pruneRecentCountSamples(samples, sample.nowMs, windowMs);
}

export function getRecentCountStats(
  samples: RecentCountSample[],
  nowMs: number,
  windowMs = 1000
): {
  averageCount: number;
  maxCount: number;
} {
  pruneRecentCountSamples(samples, nowMs, windowMs);
  if (samples.length === 0) {
    return {
      averageCount: 0,
      maxCount: 0,
    };
  }

  let totalCount = 0;
  let maxCount = 0;
  for (const sample of samples) {
    totalCount += sample.count;
    maxCount = Math.max(maxCount, sample.count);
  }

  return {
    averageCount: totalCount / samples.length,
    maxCount,
  };
}

export function recordRecentLabeledCountMetric(
  samples: RecentLabeledCountSample[],
  sample: RecentLabeledCountSample,
  windowMs = 1000
): void {
  samples.push(sample);
  pruneRecentCountSamples(samples, sample.nowMs, windowMs);
}

export function getRecentLabeledCountStats(
  samples: RecentLabeledCountSample[],
  nowMs: number,
  windowMs = 1000
): {
  totalCount: number;
  topCount: number;
  topLabel: string;
  summary: string;
} {
  pruneRecentCountSamples(samples, nowMs, windowMs);
  if (samples.length === 0) {
    return {
      totalCount: 0,
      topCount: 0,
      topLabel: '',
      summary: '',
    };
  }

  let totalCount = 0;
  const counts = new Map<string, number>();
  for (const sample of samples) {
    totalCount += sample.count;
    counts.set(sample.label, (counts.get(sample.label) ?? 0) + sample.count);
  }

  let topCount = 0;
  let topLabel = '';
  const summary = [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .map(([label, count]) => {
      if (count > topCount) {
        topCount = count;
        topLabel = label;
      }
      return `${label}:${count}`;
    })
    .join(', ');

  return {
    totalCount,
    topCount,
    topLabel,
    summary,
  };
}

export function getRenderChurnStats(
  metrics: RenderChurnMetrics,
  nowMs: number,
  windowMs = 1000
): {
  tileNodeBuildsPerSecond: number;
  tileBuildsPerSecond: number;
  pendingCancelledEntriesPerSecond: number;
  lodChecksPerSecond: number;
  lodReplacementsPerSecond: number;
} {
  return {
    tileNodeBuildsPerSecond: countRecentMetricEvents(
      metrics.tileNodeBuilds,
      nowMs,
      windowMs
    ),
    tileBuildsPerSecond: countRecentMetricEvents(
      metrics.tileBuilds,
      nowMs,
      windowMs
    ),
    pendingCancelledEntriesPerSecond: countRecentMetricEvents(
      metrics.pendingCancelledEntries,
      nowMs,
      windowMs
    ),
    lodChecksPerSecond: countRecentMetricEvents(metrics.lodChecks, nowMs, windowMs),
    lodReplacementsPerSecond: countRecentMetricEvents(
      metrics.lodReplacements,
      nowMs,
      windowMs
    ),
  };
}

export function shouldProcessPendingWorldBuildEntry(
  flushStartMs: number,
  currentMs: number,
  processedEntryCount: number,
  {
    pendingBuildBudgetMs = DEFAULT_PENDING_WORLD_BUILD_BUDGET_MS,
    maxPendingBuildTiles = WORLD_SYNC_BATCH_SIZE,
    minimumEntriesPerFlush = 1,
  }: {
    pendingBuildBudgetMs?: number;
    maxPendingBuildTiles?: number;
    minimumEntriesPerFlush?: number;
  } = {}
): boolean {
  if (processedEntryCount >= maxPendingBuildTiles) {
    return false;
  }
  if (processedEntryCount < minimumEntriesPerFlush) {
    return true;
  }
  return currentMs - flushStartMs < pendingBuildBudgetMs;
}

export function createFrameTimeBudget(
  budgetMs: number,
  startMs = performance.now()
): FrameTimeBudget {
  return {
    budgetMs: Math.max(0, budgetMs),
    startMs,
  };
}

export function getRemainingFrameTimeBudgetMs(
  budget: FrameTimeBudget,
  currentMs = performance.now()
): number {
  return Math.max(0, budget.budgetMs - Math.max(0, currentMs - budget.startMs));
}

export function isFrameTimeBudgetExhausted(
  budget: FrameTimeBudget,
  currentMs = performance.now()
): boolean {
  return getRemainingFrameTimeBudgetMs(budget, currentMs) <= 0;
}

export function getEffectivePendingWorldBuildBudget({
  pendingBuildBudgetMs,
  maxPendingBuildTiles,
  pendingQueueLength,
  visibleTileCount,
  recentTileBuildAverageMs = 0,
  recentTileBuildMaxMs = 0,
}: {
  pendingBuildBudgetMs: number;
  maxPendingBuildTiles: number;
  pendingQueueLength: number;
  visibleTileCount: number;
  recentTileBuildAverageMs?: number;
  recentTileBuildMaxMs?: number;
}): {
  pendingBuildBudgetMs: number;
  maxPendingBuildTiles: number;
} {
  let nextBudgetMs = Math.max(0.25, pendingBuildBudgetMs);
  let nextMaxPendingBuildTiles = Math.max(1, Math.floor(maxPendingBuildTiles));

  if (visibleTileCount === 0 && pendingQueueLength > 1) {
    nextBudgetMs = Math.min(nextBudgetMs, 0.75);
    nextMaxPendingBuildTiles = 1;
  }

  if (
    recentTileBuildAverageMs >= nextBudgetMs * 0.5 ||
    recentTileBuildMaxMs >= nextBudgetMs
  ) {
    nextBudgetMs = Math.min(
      nextBudgetMs,
      Math.max(0.25, recentTileBuildAverageMs || recentTileBuildMaxMs || nextBudgetMs)
    );
    nextMaxPendingBuildTiles = 1;
  }

  return {
    pendingBuildBudgetMs: nextBudgetMs,
    maxPendingBuildTiles: nextMaxPendingBuildTiles,
  };
}

function pruneRecentMetricTimestamps(
  timestamps: number[],
  nowMs: number,
  windowMs: number
): void {
  const minimumTime = nowMs - windowMs;
  let removeCount = 0;
  while (removeCount < timestamps.length && timestamps[removeCount] < minimumTime) {
    removeCount += 1;
  }
  if (removeCount > 0) {
    timestamps.splice(0, removeCount);
  }
}

function pruneRecentDurationSamples(
  samples: RecentDurationSample[],
  nowMs: number,
  windowMs: number
): void {
  const minimumTime = nowMs - windowMs;
  let removeCount = 0;
  while (removeCount < samples.length && samples[removeCount]!.nowMs < minimumTime) {
    removeCount += 1;
  }
  if (removeCount > 0) {
    samples.splice(0, removeCount);
  }
}

function pruneRecentCountSamples(
  samples: RecentCountSample[],
  nowMs: number,
  windowMs: number
): void {
  const minimumTime = nowMs - windowMs;
  let removeCount = 0;
  while (removeCount < samples.length && samples[removeCount]!.nowMs < minimumTime) {
    removeCount += 1;
  }
  if (removeCount > 0) {
    samples.splice(0, removeCount);
  }
}

export function summarizeVisibleTileKinds(
  entries: Iterable<{
    tile: {
      kind: string;
    };
  }>,
  limit = 4
): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.tile.kind, (counts.get(entry.tile.kind) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([kind, count]) => `${kind}:${count}`)
    .join(', ');
}

export function getSkyConstellationSignature(cycle: SkySignatureCycle): string {
  return [
    cycle.activeConstellationIndex ?? 0,
    Math.round((cycle.yearProgress ?? 0) * 48),
    Math.round((cycle.starsOpacity ?? 0) * 10),
  ].join('|');
}

export function getSkyEventSignature(cycle: SkySignatureCycle): string {
  return (cycle.visibleEvents ?? [])
    .map((event) =>
      [
        event.type,
        event.name,
        Math.round((event.azimuth ?? 0) * 10),
        Math.round((event.altitude ?? 0) * 10),
        Math.round((event.visibility ?? 0) * 10),
        Math.round((event.intensity ?? 0) * 10),
        Math.round((event.trailLength ?? 0) * 10),
      ].join(':')
    )
    .join('|');
}

export function getSkyMilkyWaySignature(cycle: SkySignatureCycle): string {
  return cycle.milkyWay
    ? [
        Math.round((cycle.yearProgress ?? 0) * 48),
        Math.round((cycle.milkyWay.azimuthOffset ?? 0) * 20),
        Math.round((cycle.milkyWay.inclination ?? 0) * 20),
        Math.round((cycle.milkyWay.width ?? 0) * 100),
        Math.round((cycle.milkyWay.opacity ?? 0) * 20),
      ].join('|')
    : 'none';
}

export function getSkyAuroraSignature(cycle: SkySignatureCycle): string {
  return (cycle.auroraBands ?? [])
    .map((band) =>
      [
        band.id,
        Math.round((band.azimuthCenter ?? 0) * 10),
        Math.round((band.altitude ?? 0) * 10),
        Math.round((band.height ?? 0) * 20),
        Math.round((band.intensity ?? 0) * 10),
        Math.round((band.wavePhase ?? 0) * 20),
      ].join(':')
    )
    .join('|');
}

export function getSkyPositionSignature(
  cycle: Pick<
    SkySignatureCycle,
    | 'activeConstellationIndex'
    | 'daylight'
    | 'moonAltitude'
    | 'moonAzimuth'
    | 'moonIllumination'
    | 'night'
    | 'observerLatitudeDegrees'
    | 'solarEclipse'
    | 'sunAltitude'
    | 'sunAzimuth'
    | 'starsOpacity'
    | 'twilight'
    | 'yearProgress'
  >,
  starDensity: number
): string {
  return [
    Math.round((cycle.sunAzimuth ?? 0) * 24),
    Math.round((cycle.sunAltitude ?? 0) * 24),
    Math.round((cycle.moonAzimuth ?? 0) * 24),
    Math.round((cycle.moonAltitude ?? 0) * 24),
    Math.round((cycle.observerLatitudeDegrees ?? 0) * 2),
    Math.round((cycle.yearProgress ?? 0) * 96),
    Math.round((cycle.starsOpacity ?? 0) * 20),
    Math.round((cycle.twilight ?? 0) * 20),
    Math.round((cycle.daylight ?? 0) * 20),
    Math.round((cycle.night ?? 0) * 20),
    Math.round((cycle.moonIllumination ?? 0) * 20),
    cycle.activeConstellationIndex ?? 0,
    Math.round(starDensity * 20),
    cycle.solarEclipse?.active ? 1 : 0,
    Math.round((cycle.solarEclipse?.moonAzimuth ?? 0) * 24),
    Math.round((cycle.solarEclipse?.moonAltitude ?? 0) * 24),
    Math.round((cycle.solarEclipse?.coverage ?? 0) * 20),
    Math.round((cycle.solarEclipse?.totality ?? 0) * 20),
  ].join('|');
}

export function getTwilightSkyPalette(
  sky: {
    dawnColor?: string;
    duskColor?: string;
    sunsetColor?: string;
    fogDawnColor?: string;
    fogDuskColor?: string;
    fogDayColor?: string;
  },
  cycle: { dayProgress: number }
) {
  const dawnSide = cycle.dayProgress < 0.5;
  return {
    skyColor: dawnSide
      ? sky.dawnColor ?? sky.sunsetColor ?? SKY_SUNSET_COLOR
      : sky.duskColor ?? sky.sunsetColor ?? SKY_SUNSET_COLOR,
    fogColor: dawnSide
      ? sky.fogDawnColor ?? sky.fogDayColor ?? FOG_DAY_COLOR
      : sky.fogDuskColor ?? sky.fogDayColor ?? FOG_DAY_COLOR,
  };
}

export function getWeatherFogRange(visibility = 0.88) {
  const clampedVisibility = clamp(visibility, 0.12, 1);
  return {
    near: lerp(4.5, 12, clampedVisibility),
    far: lerp(12, 34, clampedVisibility),
  };
}

export function getVisibleWorldTileBuildOrder({
  playerTileX,
  playerTileY,
  facingAngle,
  chunkRadius = CHUNK_RADIUS,
}) {
  return fillVisibleWorldTileBuildOrder(createVisibleWorldBuildOrderScratch(), {
    playerTileX,
    playerTileY,
    facingAngle,
    chunkRadius,
    shouldRenderWorldTile: (tileX, tileY) =>
      shouldRenderWorldTile({
        playerTileX,
        playerTileY,
        tileX,
        tileY,
        facingAngle,
        chunkRadius,
      }),
  });
}

export function shouldRenderWorldTile({
  playerTileX,
  playerTileY,
  tileX,
  tileY,
  facingAngle,
  chunkRadius = CHUNK_RADIUS,
  nearVisibleRadius = NEAR_VISIBLE_RADIUS,
  rearCullDot = -0.2,
}) {
  const deltaX = tileX - playerTileX;
  const deltaY = tileY - playerTileY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance > chunkRadius) {
    return false;
  }
  if (distance <= nearVisibleRadius || distance === 0) {
    return true;
  }

  const forwardX = Math.cos(facingAngle);
  const forwardY = Math.sin(facingAngle);
  const directionX = deltaX / distance;
  const directionY = deltaY / distance;
  const facingDot = forwardX * directionX + forwardY * directionY;
  return facingDot >= rearCullDot;
}

function applyShadowSettings(
  node: THREE.Object3D,
  options: ShadowSettingsOptions
): void {
  node.traverse?.((child) => {
    if (child && child.isMesh) {
      child.castShadow = options.castShadow;
      child.receiveShadow = options.receiveShadow;
    }
  });
}

function createStarField(): THREE.Group {
  const root = new THREE.Group();

  for (let index = 0; index < 360; index += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: '#eef6ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        fog: false,
      })
    );
    sprite.userData = {
      theta: hash2D(STAR_THETA_SEED, index, 0) * Math.PI * 2,
      phi: hash2D(STAR_PHI_SEED, 0, index) * Math.PI * 0.88 + 0.16,
      radius: SKY_RADIUS + hash2D(STAR_RADIUS_SEED, index, index) * 4,
      brightness: 0.25 + hash2D(STAR_BRIGHTNESS_SEED, index, 3) * 0.75,
      scale: 0.14 + hash2D(STAR_SCALE_SEED, 7, index) * 0.46,
    };
    root.add(sprite);
  }

  return root;
}

function syncStarField(
  root: THREE.Group,
  cycle: DaylightCycleState,
  starDensity: number
): void {
  const seasonalRotation = cycle.yearProgress * Math.PI * 2;
  root.children.forEach((child, index) => {
    if (!(child instanceof THREE.Sprite)) {
      return;
    }
    const theta =
      child.userData.theta +
      seasonalRotation +
      hash2D(STAR_DRIFT_SEED, index, cycle.activeConstellationIndex ?? 0) * 0.08;
    const position = createSkyPosition(theta, child.userData.phi, child.userData.radius);
    child.position.copy(position);

    const horizonFade = smoothstep(-1.8, 5.4, position.y);
    const opacity =
      cycle.starsOpacity *
      child.userData.brightness *
      horizonFade *
      Math.max(0.72, Math.min(1.6, starDensity));
    child.material.opacity = opacity;
    child.visible = opacity > 0.015;
    const scale = child.userData.scale * Math.max(0.75, Math.min(1.8, starDensity));
    child.scale.set(scale, scale, 1);
  });
}

function syncConstellationSky(
  root: THREE.Group,
  cycle: DaylightCycleState
): void {
  root.clear();
  const constellations = cycle.constellations ?? [];
  if (constellations.length === 0) {
    return;
  }

  const activeIndex = cycle.activeConstellationIndex ?? 0;
  const focusIndices = [
    (activeIndex + constellations.length - 1) % constellations.length,
    activeIndex,
    (activeIndex + 1) % constellations.length,
  ];

  focusIndices.forEach((constellationIndex, slotIndex) => {
    const constellation = constellations[constellationIndex];
    const slotTheta =
      cycle.sunriseAzimuth +
      (slotIndex - 1) * 0.82 +
      (cycle.dayProgress - cycle.sunriseProgress) * 0.16;
    const slotPhi = 1.18 + (slotIndex - 1) * 0.08;
    const anchor = createSkyPosition(slotTheta, slotPhi, SKY_RADIUS - 4);

    constellation.connections.forEach(([startIndex, endIndex]) => {
      const start = constellation.stars[startIndex];
      const end = constellation.stars[endIndex];
      if (!start || !end) {
        return;
      }
      const geometry = new THREE.BufferGeometry().setFromPoints([
        createConstellationPoint(anchor, start),
        createConstellationPoint(anchor, end),
      ]);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: '#b9d4ff',
          transparent: true,
          opacity: 0.18 + cycle.starsOpacity * 0.34,
          depthTest: true,
        })
      );
      const horizonFade = smoothstep(
        -1.6,
        5.8,
        Math.min(
          createConstellationPoint(anchor, start).y,
          createConstellationPoint(anchor, end).y
        )
      );
      line.material.opacity *= horizonFade;
      line.visible = line.material.opacity > 0.015;
      root.add(line);
    });

    constellation.stars.forEach((star) => {
      const point = createConstellationPoint(anchor, star);
      const horizonFade = smoothstep(-1.6, 5.8, point.y);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          color: '#f5fbff',
          transparent: true,
          opacity:
            (0.28 + star.brightness * cycle.starsOpacity * 0.56) * horizonFade,
          depthWrite: false,
          depthTest: true,
        })
      );
      sprite.position.copy(point);
      const scale = 0.34 + star.brightness * 0.34;
      sprite.scale.set(scale, scale, 1);
      sprite.visible = sprite.material.opacity > 0.015;
      root.add(sprite);
    });
  });
}

function createConstellationPoint(
  anchor: THREE.Vector3,
  star: ConstellationStarLike
): THREE.Vector3 {
  return new THREE.Vector3(
    anchor.x + (star.x - 0.5) * 10,
    anchor.y + (0.5 - star.y) * 6,
    anchor.z
  );
}

function createSkyPosition(
  theta: number,
  phi: number,
  radius: number
): THREE.Vector3 {
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    Math.cos(theta) * sinPhi * radius,
    Math.cos(phi) * radius,
    Math.sin(theta) * sinPhi * radius
  );
}

function createCachedSkyPose(cycle: DaylightCycleState): CachedSkyPose {
  const sunHeight = Math.max(-0.2, cycle.sunAltitude);
  const sunDistance = 18;
  const sunOrbitX = Math.cos(cycle.sunAzimuth) * sunDistance;
  const sunOrbitY = 5 + Math.max(0, sunHeight) * 18;
  const sunOrbitZ = Math.sin(cycle.sunAzimuth) * sunDistance * 0.65;
  const displayedMoonAzimuth =
    cycle.solarEclipse?.active ? cycle.solarEclipse.moonAzimuth : cycle.moonAzimuth;
  const displayedMoonAltitude =
    cycle.solarEclipse?.active ? cycle.solarEclipse.moonAltitude : cycle.moonAltitude;
  const moonDistance = 22;
  const moonOrbitX = Math.cos(displayedMoonAzimuth) * moonDistance;
  const moonOrbitY = 6 + Math.max(0, displayedMoonAltitude) * 12;
  const moonOrbitZ = Math.sin(displayedMoonAzimuth) * moonDistance * 0.7;

  return {
    sunOrbitX,
    sunOrbitY,
    sunOrbitZ,
    moonOrbitX,
    moonOrbitY,
    moonOrbitZ,
    skyRotationZ: (-cycle.observerLatitudeDegrees / 180) * Math.PI * 0.5,
    sunSpriteX: sunOrbitX * 1.45,
    sunSpriteY: 14 + Math.max(-0.12, cycle.sunAltitude) * 15,
    sunSpriteZ: sunOrbitZ * 1.45,
    sunSpriteOpacity: Math.max(
      0,
      Math.min(
        0.92,
        (cycle.twilight * 0.72 + cycle.daylight * 0.32) *
          (1 - (cycle.solarEclipse?.totality ?? 0) * 0.28)
      )
    ),
    moonSpriteX: moonOrbitX * 1.7,
    moonSpriteY: 16 + Math.max(0, displayedMoonAltitude) * 14,
    moonSpriteZ: moonOrbitZ * 1.7,
    moonSpriteOpacity:
      Math.max(
        0,
        (cycle.night * 0.82 + (displayedMoonAltitude > -0.08 ? 0.16 : 0)) *
          (0.22 + cycle.moonIllumination * 0.78)
      ) + (cycle.solarEclipse?.coverage ?? 0) * 0.46,
  };
}

function syncCelestialEvents(
  root: THREE.Group,
  cycle: DaylightCycleState
): void {
  root.clear();
  const events = cycle.visibleEvents ?? [];
  events.forEach((event, index) => {
    const position = createSkyAltitudePosition(
      event.azimuth,
      event.altitude,
      SKY_RADIUS - 6 - Math.min(1.2, index * 0.08)
    );
    const horizonFade = smoothstep(-1.4, 6, position.y);

    if (event.type === 'meteor-shower') {
      const streakCount = Math.max(4, Math.round(4 + event.intensity * 6));
      for (let streak = 0; streak < streakCount; streak += 1) {
        const lateralDrift = ((streak % 5) - 2) * 0.18;
        const verticalDrift = (streak % 3) * 0.08;
        const offset = new THREE.Vector3(
          lateralDrift,
          verticalDrift,
          -streak * 0.06
        );
        const geometry = new THREE.BufferGeometry().setFromPoints([
          position.clone().add(offset),
          position.clone().add(
            new THREE.Vector3(
              event.trailLength + streak * 0.22,
              -0.42 - streak * 0.1,
              0.16 * (streak - streakCount * 0.5)
            )
          ),
        ]);
        const line = new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: event.color,
            transparent: true,
            opacity:
              (0.24 + event.intensity * 0.4) * event.visibility * horizonFade,
            depthTest: true,
          })
        );
        line.visible = line.material.opacity > 0.015;
        root.add(line);
      }
      return;
    }

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: event.color,
        transparent: true,
        opacity:
          (0.26 + event.intensity * 0.42) * event.visibility * horizonFade,
        depthWrite: false,
        depthTest: true,
      })
    );
    sprite.position.copy(position);
    const scale = event.size * (event.type === 'planet' ? 1 : 0.92);
    sprite.scale.set(scale, scale, 1);
    sprite.visible = sprite.material.opacity > 0.015;
    root.add(sprite);

    if (event.type === 'comet') {
      const tail = new THREE.BufferGeometry().setFromPoints([
        position.clone().add(
          new THREE.Vector3(-event.trailLength, -event.trailLength * 0.16, 0)
        ),
        position.clone(),
      ]);
      const line = new THREE.Line(
        tail,
        new THREE.LineBasicMaterial({
          color: event.color,
          transparent: true,
          opacity:
            (0.16 + event.intensity * 0.28) * event.visibility * horizonFade,
          depthTest: true,
        })
      );
      line.visible = line.material.opacity > 0.015;
      root.add(line);
    }
  });
}

function syncMilkyWayBelt(
  root: THREE.Group,
  cycle: DaylightCycleState
): void {
  root.clear();
  const belt = cycle.milkyWay;
  if (!belt) {
    return;
  }
  const samples = getMilkyWayBandSamples(belt, cycle.yearProgress, 72);
  const innerPoints = samples.map((sample) =>
    createSkyPosition(sample.azimuth, sample.innerPhi, SKY_RADIUS - 5.7)
  );
  const outerPoints = samples.map((sample) =>
    createSkyPosition(sample.azimuth, sample.outerPhi, SKY_RADIUS - 5.4)
  );
  const positions: number[] = [];
  const indices: number[] = [];

  samples.forEach((sample, index) => {
    const inner = innerPoints[index];
    const outer = outerPoints[index];
    positions.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
  });

  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = index * 2;
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  root.add(
    new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: '#7f9fca',
        transparent: true,
        opacity: belt.opacity * 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      })
    )
  );
  root.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        samples.map((sample) =>
          createSkyPosition(sample.azimuth, sample.centerPhi, SKY_RADIUS - 5.5)
        )
      ),
      new THREE.LineBasicMaterial({
        color: '#9fbce0',
        transparent: true,
        opacity: belt.opacity * 0.4,
        depthTest: false,
      })
    )
  );
}

function syncAuroraBands(
  root: THREE.Group,
  cycle: DaylightCycleState
): void {
  root.clear();
  const bands = cycle.auroraBands ?? [];
  bands.forEach((band) => {
    const samples = 30;
    const start = band.azimuthCenter - band.span * 0.5;
    const end = band.azimuthCenter + band.span * 0.5;
    const positions: number[] = [];
    const indices: number[] = [];
    const crestPoints: THREE.Vector3[] = [];

    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples;
      const azimuth = start + (end - start) * progress;
      const wave =
        Math.sin(progress * Math.PI * 3 + band.wavePhase * Math.PI * 2) *
        band.height *
        0.22;
      const lower = createSkyAltitudePosition(
        azimuth,
        band.altitude + wave,
        SKY_RADIUS - 6.2
      );
      const upper = createSkyAltitudePosition(
        azimuth,
        band.altitude + band.height + wave,
        SKY_RADIUS - 5.6
      );
      crestPoints.push(
        createSkyAltitudePosition(
          azimuth,
          band.altitude + band.height * 0.58 + wave,
          SKY_RADIUS - 5.45
        )
      );
      positions.push(lower.x, lower.y, lower.z, upper.x, upper.y, upper.z);
    }

    for (let index = 0; index < samples; index += 1) {
      const startIndex = index * 2;
      indices.push(
        startIndex,
        startIndex + 1,
        startIndex + 2,
        startIndex + 1,
        startIndex + 3,
        startIndex + 2
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setIndex(indices);
    root.add(
      new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: band.colorA,
          transparent: true,
          opacity: band.intensity * 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    const innerRibbonPositions: number[] = [];
    const innerRibbonIndices: number[] = [];
    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples;
      const azimuth = start + (end - start) * progress;
      const wave =
        Math.sin(progress * Math.PI * 5 + band.wavePhase * Math.PI * 2) *
        band.height *
        0.12;
      const midLower = createSkyAltitudePosition(
        azimuth,
        band.altitude + band.height * 0.2 + wave,
        SKY_RADIUS - 5.9
      );
      const midUpper = createSkyAltitudePosition(
        azimuth,
        band.altitude + band.height * 0.78 + wave,
        SKY_RADIUS - 5.5
      );
      innerRibbonPositions.push(
        midLower.x,
        midLower.y,
        midLower.z,
        midUpper.x,
        midUpper.y,
        midUpper.z
      );
    }
    for (let index = 0; index < samples; index += 1) {
      const startIndex = index * 2;
      innerRibbonIndices.push(
        startIndex,
        startIndex + 1,
        startIndex + 2,
        startIndex + 1,
        startIndex + 3,
        startIndex + 2
      );
    }
    const innerRibbonGeometry = new THREE.BufferGeometry();
    innerRibbonGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(innerRibbonPositions, 3)
    );
    innerRibbonGeometry.setIndex(innerRibbonIndices);
    root.add(
      new THREE.Mesh(
        innerRibbonGeometry,
        new THREE.MeshBasicMaterial({
          color: band.colorB,
          transparent: true,
          opacity: band.intensity * 0.18,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    const crest = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(crestPoints),
      new THREE.LineBasicMaterial({
        color: band.colorB,
        transparent: true,
        opacity: band.intensity * 0.4,
        depthTest: true,
      })
    );
    crest.visible = crest.material.opacity > 0.015;
    root.add(crest);

    const curtainRibs = 6;
    for (let ribIndex = 0; ribIndex < curtainRibs; ribIndex += 1) {
      const progress = ribIndex / (curtainRibs - 1);
      const azimuth = start + (end - start) * progress;
      const sway =
        Math.sin(progress * Math.PI * 4 + band.wavePhase * Math.PI * 2) *
        band.height *
        0.1;
      const lower = createSkyAltitudePosition(
        azimuth,
        band.altitude + sway,
        SKY_RADIUS - 6
      );
      const upper = createSkyAltitudePosition(
        azimuth,
        band.altitude + band.height + sway,
        SKY_RADIUS - 5.45
      );
      const rib = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([lower, upper]),
        new THREE.LineBasicMaterial({
          color: ribIndex % 2 === 0 ? band.colorA : band.colorB,
          transparent: true,
          opacity: band.intensity * 0.14,
          depthTest: true,
        })
      );
      rib.visible = rib.material.opacity > 0.015;
      root.add(rib);
    }
  });
}

function createSkyAltitudePosition(
  azimuth: number,
  altitude: number,
  radius: number
): THREE.Vector3 {
  const phi = ((1 - altitude) * Math.PI) / 2;
  return createSkyPosition(azimuth, phi, radius);
}

function createMoonSprite(): THREE.Sprite {
  const texture = new THREE.CanvasTexture(buildMoonPhaseCanvas(4, 1));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0,
    color: '#ffffff',
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.2, 3.2, 1);
  return sprite;
}

function createSunSprite(): THREE.Sprite {
  const texture = new THREE.CanvasTexture(buildSunCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0,
    color: '#ffffff',
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.4, 4.4, 1);
  return sprite;
}

function buildSunCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create sun canvas.');
  }
  const center = canvas.width / 2;
  const glow = context.createRadialGradient(center, center, 4, center, center, 54);
  glow.addColorStop(0, 'rgba(255, 247, 200, 1)');
  glow.addColorStop(0.25, 'rgba(255, 217, 125, 0.96)');
  glow.addColorStop(0.55, 'rgba(255, 176, 88, 0.45)');
  glow.addColorStop(1, 'rgba(255, 176, 88, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(center, center, 54, 0, Math.PI * 2);
  context.fill();
  return canvas;
}

function updateMoonPhaseTexture(
  texture: THREE.Texture & { image: HTMLCanvasElement },
  phaseIndex: number,
  illumination: number
): void {
  const canvas = texture.image;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const phaseDirection = phaseIndex < 4 ? 1 : -1;
  paintMoonPhaseCanvas(context, canvas, illumination, phaseDirection);
}

function buildMoonPhaseCanvas(
  phaseIndex: number,
  illumination: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create moon phase canvas.');
  }
  const phaseDirection = phaseIndex < 4 ? 1 : -1;
  paintMoonPhaseCanvas(context, canvas, illumination, phaseDirection);
  return canvas;
}

function paintMoonPhaseCanvas(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  illumination: number,
  phaseDirection: number
): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  const center = canvas.width / 2;
  const radius = canvas.width * 0.34;

  context.fillStyle = 'rgba(170, 196, 255, 0.18)';
  context.beginPath();
  context.arc(center, center, radius * 1.18, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#f6f6fb';
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fill();

  const shadowWidth = radius * 2 * (1 - illumination);
  if (shadowWidth > 0.001) {
    context.save();
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = '#1a2230';
    context.beginPath();
    context.ellipse(
      center + phaseDirection * shadowWidth * 0.5,
      center,
      radius * (1 - illumination * 0.65),
      radius,
      0,
      0,
      Math.PI * 2
    );
    context.fill();
    context.restore();
  }
}

function getTileDefinitionFromRegistry(kind: string): TileDefinitionLike {
  return getActivePluginRegistry().resolveTileDefinition(
    kind,
    FALLBACK_TILE_DEFINITION
  );
}
