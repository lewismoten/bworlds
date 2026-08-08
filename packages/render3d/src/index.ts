import * as THREE from 'three';
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
  smoothstep,
} from '@bworlds/core';
import { isWaterKind } from '@bworlds/tile-support';
import {
  getActivePluginRegistry,
  type TileLike,
  type TilePlugin,
  type ViewMode,
  type WorldEnvironmentLike,
  type SurfaceBoundaryRole3D,
  type TileDefinitionLike,
  type WorldStateLike,
} from '@bworlds/plugin-api';

type CelestialEnvironmentOverrides = Parameters<
  typeof applyCelestialEnvironmentOverrides
>[1];
type DaylightCycleState = ReturnType<typeof getDaylightCycleState>;
type SkySignatureCycle = Pick<
  DaylightCycleState,
  | 'activeConstellationIndex'
  | 'yearProgress'
  | 'starsOpacity'
  | 'visibleEvents'
  | 'milkyWay'
  | 'auroraBands'
>;
type Render3DState = WorldStateLike & {
  viewMode?: ViewMode;
};
type Render3DOptions = {
  jumpHeight?: number;
  timeMs?: number;
  environment?: WorldEnvironmentLike;
  cameraPitch?: number;
  cameraBobOffset?: number;
  visibilityRadius?: number;
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
    averageTileBuildMs: number;
    maxTileBuildMs: number;
    tileBuildsPerSecond: number;
    lodReplacementsPerSecond: number;
    object3dCount: number;
    groupCount: number;
    meshCount: number;
    pointsCount: number;
    spriteCount: number;
    lightCount: number;
    materialCount: number;
    geometryCount: number;
    geometryMemoryCount: number;
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
  detailLevel?: 'full' | 'low';
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
  groupCount: number;
  meshCount: number;
  pointsCount: number;
  spriteCount: number;
  lightCount: number;
  materialCount: number;
  geometryCount: number;
  treeCount: number;
  treeObjectCount: number;
  treeMeshCount: number;
  treeMaterialRefCount: number;
};

type RecentDurationSample = {
  nowMs: number;
  durationMs: number;
};

const TILE_SIZE = 1;
const CHUNK_RADIUS = 18;
const NEAR_VISIBLE_RADIUS = 6;
const FACING_BUCKETS = 12;
const WORLD_SYNC_BATCH_SIZE = 28;
const LOW_DETAIL_MODEL_DISTANCE = 6.5;
const FAR_MODEL_FULL_VISIBILITY_DISTANCE = 8;
const FAR_MODEL_REVEAL_DISTANCE_VARIANCE = 8;
const FAR_MODEL_FADE_DISTANCE = 1.75;
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
  const visibleTileNodes = new Map<string, DynamicTileNode>();
  const backgroundColor = new THREE.Color(SKY_DAY_COLOR);
  const twilightColor = new THREE.Color(SKY_SUNSET_COLOR);
  const nightColor = new THREE.Color(SKY_NIGHT_COLOR);
  const fogDayColor = new THREE.Color(FOG_DAY_COLOR);
  const fogNightColor = new THREE.Color(FOG_NIGHT_COLOR);
  let lastMoonPhaseIndex = -1;
  let lastCenterKey = '';
  let lastContextKey = '';
  let lastFacingBucket = '';
  let lastChunkRadius = CHUNK_RADIUS;
  let lastSkyConstellationSignature = '';
  let lastSkyEventSignature = '';
  let lastSkyMilkyWaySignature = '';
  let lastSkyAuroraSignature = '';
  let pendingWorldBuild = {
    contextId: '',
    centerKey: '',
    facingBucket: '',
    queue: [] as Array<{ key: string; x: number; y: number }>,
  };
  const renderChurnMetrics = {
    tileBuilds: [] as number[],
    lodReplacements: [] as number[],
    tileBuildDurations: [] as RecentDurationSample[],
  };

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
    pendingWorldBuild = {
      contextId: '',
      centerKey: '',
      facingBucket: '',
      queue: [],
    };
  }

  function buildTileNode(
    state,
    registry,
    x,
    y,
    detailLevel: 'full' | 'low' = 'full'
  ): DynamicTileNode {
    const tileNode = new THREE.Group();
    const buildCache = createTileBuildCache(state);
    const tile = buildCache.getTile(x, y);
    const definition = getTileDefinitionFromRegistry(tile.kind);
    const variant = getTileVariantIndex(tile.kind, x, y);
    const surfaceHeight = buildCache.getSurfaceProfile(x, y, tile).surfaceHeight;

    tileNode.add(createFloorMesh(state, tile, x, y, variant, buildCache));

    const tilePlugin = registry.getTilePlugin(tile.kind);
    const pluginModel = tilePlugin?.create3DModel?.({
      three: THREE,
      state,
      tile,
      tileX: x,
      tileY: y,
      detailLevel,
    });

    if (pluginModel) {
      pluginModel.position.y += surfaceHeight;
      applyShadowSettings(pluginModel, {
        castShadow: true,
        receiveShadow: true,
      });
      if (definition.walkable && !isWaterKind(tile.kind)) {
        prepareObjectForDistanceFade(pluginModel);
      }
      tileNode.add(pluginModel);
    } else if (!isWaterKind(tile.kind) && definition.wallHeight > 0.08) {
      const wallHeight = Math.max(definition.wallHeight * 1.9, 0.18);
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(TILE_SIZE, wallHeight, TILE_SIZE),
        getTileMaterial(tile.kind, variant)
      );
      wallMesh.position.set(
        x * TILE_SIZE,
        surfaceHeight + wallHeight * 0.5,
        y * TILE_SIZE
      );
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
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

  function syncVisibleWorld(
    state,
    chunkRadius = CHUNK_RADIUS
  ) {
    const context = state.getCurrentContext();
    const centerX = Math.round(state.player.x);
    const centerY = Math.round(state.player.y);
    const facingBucket = getFacingVisibilityBucket(state.player.facing);
    const nextVisibleKeys = new Set();
    const nextQueue = getVisibleWorldTileBuildOrder({
      playerTileX: centerX,
      playerTileY: centerY,
      facingAngle: state.player.facing,
      chunkRadius,
    });

    for (const entry of nextQueue) {
      nextVisibleKeys.add(entry.key);
    }

    for (const [key, tileNode] of visibleTileNodes.entries()) {
      if (nextVisibleKeys.has(key)) {
        continue;
      }
      worldRoot.remove(tileNode.node);
      visibleTileNodes.delete(key);
    }

    pendingWorldBuild = {
      contextId: context.id,
      centerKey: `${centerX}:${centerY}`,
      facingBucket: String(facingBucket),
      queue: nextQueue.filter((entry) => !visibleTileNodes.has(entry.key)),
    };

    lastCenterKey = `${centerX}:${centerY}`;
    lastContextKey = context.id;
    lastFacingBucket = String(facingBucket);
    lastChunkRadius = chunkRadius;
  }

  function flushPendingWorldBuild(state, nowMs: number) {
    if (pendingWorldBuild.queue.length === 0) {
      return;
    }
    const context = state.getCurrentContext();
    const centerKey = `${Math.round(state.player.x)}:${Math.round(state.player.y)}`;
    const facingBucket = String(getFacingVisibilityBucket(state.player.facing));
    if (
      pendingWorldBuild.contextId !== context.id ||
      pendingWorldBuild.centerKey !== centerKey ||
      pendingWorldBuild.facingBucket !== facingBucket
    ) {
      return;
    }
    const registry = getActivePluginRegistry();
    const batch = pendingWorldBuild.queue.splice(0, WORLD_SYNC_BATCH_SIZE);
    for (const entry of batch) {
      if (visibleTileNodes.has(entry.key)) {
        continue;
      }
      const buildStartMs = performance.now();
      const tileNode = buildTileNode(
        state,
        registry,
        entry.x,
        entry.y,
        getTileModelDetailLevel(
          Math.hypot(entry.x - state.player.x, entry.y - state.player.y)
        )
      );
      const buildDurationMs = performance.now() - buildStartMs;
      visibleTileNodes.set(entry.key, tileNode);
      worldRoot.add(tileNode.node);
      recordRecentMetric(renderChurnMetrics.tileBuilds, nowMs);
      recordRecentDurationMetric(renderChurnMetrics.tileBuildDurations, {
        nowMs,
        durationMs: buildDurationMs,
      });
    }
  }

  function render(state: Render3DState, options: Render3DOptions = {}): void {
    const centerKey = `${Math.round(state.player.x)}:${Math.round(state.player.y)}`;
    const contextKey = state.getCurrentContext().id;
    const facingBucket = String(getFacingVisibilityBucket(state.player.facing));
    const chunkRadius = Math.max(8, Math.floor(options.visibilityRadius ?? CHUNK_RADIUS));
    if (contextKey !== lastContextKey) {
      clearWorld();
    }
    if (
      centerKey !== lastCenterKey ||
      contextKey !== lastContextKey ||
      facingBucket !== lastFacingBucket ||
      chunkRadius !== lastChunkRadius
    ) {
      syncVisibleWorld(state, chunkRadius);
    }
    const frameNowMs = options.timeMs ?? performance.now();
    flushPendingWorldBuild(state, frameNowMs);
    syncWorldCurvature(visibleTileNodes.values(), state);

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
      environment
    );
    syncTileModelDetailLevels(state, getActivePluginRegistry(), frameNowMs);
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
    return {
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      points: renderer.info.render.points,
      lines: renderer.info.render.lines,
      sceneChildCount: scene.children.length,
      visibleTileCount: visibleTileNodes.size,
      visibleTreeCount: sceneResourceStats.treeCount,
      pendingTileCount: pendingWorldBuild.queue.length,
      averageTileBuildMs: recentTileBuildStats.averageMs,
      maxTileBuildMs: recentTileBuildStats.maxMs,
      tileBuildsPerSecond: countRecentMetricEvents(renderChurnMetrics.tileBuilds, nowMs),
      lodReplacementsPerSecond: countRecentMetricEvents(
        renderChurnMetrics.lodReplacements,
        nowMs
      ),
      object3dCount: sceneResourceStats.object3dCount,
      groupCount: sceneResourceStats.groupCount,
      meshCount: sceneResourceStats.meshCount,
      pointsCount: sceneResourceStats.pointsCount,
      spriteCount: sceneResourceStats.spriteCount,
      lightCount: sceneResourceStats.lightCount,
      materialCount: sceneResourceStats.materialCount,
      geometryCount: sceneResourceStats.geometryCount,
      geometryMemoryCount: renderer.info.memory.geometries,
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
    nowMs: number
  ): void {
    for (const [key, entry] of visibleTileNodes.entries()) {
      if (!entry.modelRoot) {
        continue;
      }
      const distance = Math.hypot(
        entry.tileX - state.player.x,
        entry.tileY - state.player.y
      );
      const desiredDetailLevel = getTileModelDetailLevel(distance);
      if ((entry.detailLevel ?? 'full') === desiredDetailLevel) {
        continue;
      }

      const nextEntry = buildTileNode(
        state,
        registry,
        entry.tileX,
        entry.tileY,
        desiredDetailLevel
      );
      visibleTileNodes.set(key, nextEntry);
      worldRoot.remove(entry.node);
      worldRoot.add(nextEntry.node);
      recordRecentMetric(renderChurnMetrics.lodReplacements, nowMs);
    }
  }

  function createTileBuildCache(state): TileBuildCache {
    const tileCache = new Map<string, TileLike>();
    const surfaceProfileCache = new Map<string, TileSurfaceProfile>();

    function makeKey(tileX: number, tileY: number) {
      return `${tileX}:${tileY}`;
    }

    function getTile(tileX: number, tileY: number): TileLike {
      const key = makeKey(tileX, tileY);
      if (!tileCache.has(key)) {
        tileCache.set(key, state.getCurrentTile(tileX, tileY));
      }
      return tileCache.get(key) as TileLike;
    }

    function getSurfaceProfile(
      tileX: number,
      tileY: number,
      tile = getTile(tileX, tileY)
    ): TileSurfaceProfile {
      const key = makeKey(tileX, tileY);
      if (!surfaceProfileCache.has(key)) {
        surfaceProfileCache.set(
          key,
          getTileSurfaceProfile(state, tile, tileX, tileY)
        );
      }
      return surfaceProfileCache.get(key) as TileSurfaceProfile;
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
    if (!materialCache.has(key)) {
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

      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.92,
          metalness: 0.04,
        })
      );
    }
    return materialCache.get(key);
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
        new THREE.BoxGeometry(TILE_SIZE, floorThickness, TILE_SIZE),
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

    const topGeometry = new THREE.BufferGeometry();
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
      new THREE.BoxGeometry(TILE_SIZE, floorThickness, TILE_SIZE),
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
    const inset = getWaterBodyInset(tileX, tileY, kind, buildCache);
    const width = Math.max(0.1, TILE_SIZE - inset.west - inset.east);
    const depth = Math.max(0.1, TILE_SIZE - inset.north - inset.south);
    const centerX = (inset.west - inset.east) * 0.5;
    const centerZ = (inset.north - inset.south) * 0.5;

    const group = new THREE.Group();
    group.position.set(tileX * TILE_SIZE, 0, tileY * TILE_SIZE);

    const surfaceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE),
      material
    );
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.y = surfaceHeight;
    surfaceMesh.receiveShadow = true;
    group.add(surfaceMesh);

    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, WATER_FLOOR_THICKNESS, depth),
      material
    );
    bodyMesh.position.set(
      centerX,
      surfaceHeight - WATER_FLOOR_THICKNESS * 0.5,
      centerZ
    );
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    return group;
  }

  function addRiverEdgeWall(group, material, edge, wallHeight, baseHeight) {
    const mesh =
      edge === 'north' || edge === 'south'
        ? new THREE.Mesh(
            new THREE.BoxGeometry(TILE_SIZE, wallHeight, RIVER_WALL_THICKNESS),
            material
          )
        : new THREE.Mesh(
            new THREE.BoxGeometry(RIVER_WALL_THICKNESS, wallHeight, TILE_SIZE),
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
    environment
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
    const starDensity =
      (environment.stars?.density ?? 1) *
      clamp(1 - weatherCloudCover * 0.42 - (1 - weatherVisibility) * 0.58, 0.08, 1);
    const daySkyColor = new THREE.Color(sky.dayColor ?? SKY_DAY_COLOR);
    const twilightPalette = getTwilightSkyPalette(sky, cycle);
    const sunsetSkyColor = new THREE.Color(twilightPalette.skyColor);
    const nightSkyColor = new THREE.Color(sky.nightColor ?? SKY_NIGHT_COLOR);
    const twilightFogColor = new THREE.Color(twilightPalette.fogColor);
    const nightFogColor = new THREE.Color(sky.fogNightColor ?? FOG_NIGHT_COLOR);
    const fogRange = getWeatherFogRange(weatherVisibility);

    scene.background
      .copy(nightSkyColor)
      .lerp(sunsetSkyColor, cycle.twilight)
      .lerp(daySkyColor, dayBlend);
    scene.fog.color.copy(nightFogColor).lerp(twilightFogColor, cycle.twilight);
    scene.fog.near = fogRange.near;
    scene.fog.far = fogRange.far;

    ambientLight.intensity = 0.2 + cycle.twilight * 0.75 + dayBlend * 0.45;
    ambientLight.color
      .set(lighting.ambientNightColor ?? '#9fc4ff')
      .lerp(new THREE.Color(lighting.ambientDayColor ?? '#eaf6ff'), dayBlend);
    ambientLight.groundColor
      .set(lighting.groundNightColor ?? '#101826')
      .lerp(
        new THREE.Color(lighting.groundDayColor ?? '#28442f'),
        0.35 + dayBlend * 0.65
      );

    const sunHeight = Math.max(-0.2, cycle.sunAltitude);
    const sunDistance = 18;
    const sunOrbitX = Math.cos(cycle.sunAzimuth) * sunDistance;
    const sunOrbitY = 5 + Math.max(0, sunHeight) * 18;
    const sunOrbitZ = Math.sin(cycle.sunAzimuth) * sunDistance * 0.65;
    sunLight.position.set(worldX - sunOrbitX, sunOrbitY, worldY - sunOrbitZ);
    sunTarget.position.set(worldX, 0, worldY);
    sunLight.intensity =
      (dayBlend * 1.75 + twilightBlend * 0.25) *
      (1 - (cycle.solarEclipse?.daylightReduction ?? 0) * 0.6);
    sunLight.color
      .set('#ffb06e')
      .lerp(
        new THREE.Color(lighting.sunColor ?? '#fff3cf'),
        Math.min(1, dayBlend + 0.2)
      );

    const shadowStrength = Math.max(0, cycle.daylight - 0.12);
    sunLight.castShadow =
      shadowStrength * (lighting.shadowStrength ?? 1) > 0.08;

    const displayedMoonAzimuth =
      cycle.solarEclipse?.active ? cycle.solarEclipse.moonAzimuth : cycle.moonAzimuth;
    const displayedMoonAltitude =
      cycle.solarEclipse?.active ? cycle.solarEclipse.moonAltitude : cycle.moonAltitude;
    const moonDistance = 22;
    const moonOrbitX = Math.cos(displayedMoonAzimuth) * moonDistance;
    const moonOrbitY = 6 + Math.max(0, displayedMoonAltitude) * 12;
    const moonOrbitZ = Math.sin(displayedMoonAzimuth) * moonDistance * 0.7;
    moonLight.position.set(worldX - moonOrbitX, moonOrbitY, worldY - moonOrbitZ);
    moonTarget.position.set(worldX, 0, worldY);
    moonLight.color.set(lighting.moonColor ?? '#9ec5ff');
    moonLight.intensity =
      cycle.night * (0.1 + cycle.moonIllumination * 0.24) +
      (cycle.solarEclipse?.coverage ?? 0) * 0.04;

    skyRoot.position.set(worldX, 0, worldY);
    skyRoot.rotation.z = (-cycle.observerLatitudeDegrees / 180) * Math.PI * 0.5;
    syncStarField(stars, cycle, starDensity);
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
    constellationRoot.visible = cycle.starsOpacity > 0.02;
    eventRoot.visible = (cycle.visibleEvents ?? []).some(
      (event) => event.visibility > 0.02
    );
    milkyWayRoot.visible = cycle.starsOpacity > 0.02;
    auroraRoot.visible = (cycle.auroraBands ?? []).some(
      (band) => band.intensity > 0.03
    );

    sunSprite.position.set(
      sunOrbitX * 1.45,
      14 + Math.max(-0.12, cycle.sunAltitude) * 15,
      sunOrbitZ * 1.45
    );
    sunSprite.material.opacity = Math.max(
      0,
      Math.min(
        0.92,
        (cycle.twilight * 0.72 + dayBlend * 0.32) *
          (1 - (cycle.solarEclipse?.totality ?? 0) * 0.28)
      )
    );
    sunSprite.visible = sunSprite.material.opacity > 0.03;

    moonSprite.position.set(
      moonOrbitX * 1.7,
      16 + Math.max(0, displayedMoonAltitude) * 14,
      moonOrbitZ * 1.7
    );
    moonSprite.material.opacity =
      Math.max(
        0,
        (cycle.night * 0.82 + (displayedMoonAltitude > -0.08 ? 0.16 : 0)) *
          (0.22 + cycle.moonIllumination * 0.78)
      ) + (cycle.solarEclipse?.coverage ?? 0) * 0.46;
    moonSprite.visible = moonSprite.material.opacity > 0.03;

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
    sample('render3d:land-model-reveal', tileX, tileY) *
      revealDistanceVariance;
  if (distance <= revealDistance) {
    return 1;
  }

  const fadeProgress = (distance - revealDistance) / Math.max(0.001, fadeDistance);
  return clamp01(1 - fadeProgress);
}

export function getTileModelDetailLevel(
  distance: number,
  lowDetailDistance = LOW_DETAIL_MODEL_DISTANCE
): 'full' | 'low' {
  return distance >= lowDetailDistance ? 'low' : 'full';
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

function updateFarLandModelVisibility(
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

export function prepareObjectForDistanceFade(root: THREE.Object3D): void {
  const fadeMaterialCache = new WeakMap<THREE.Material, THREE.Material>();
  root.traverse((child) => {
    child.userData.distanceFadeBaseVisible ??= child.visible;
    const renderable = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
    };
    if (!renderable.material || child.userData.distanceFadePrepared) {
      return;
    }

    renderable.material = Array.isArray(renderable.material)
      ? renderable.material.map((material) =>
          getDistanceFadeMaterialVariant(material, fadeMaterialCache)
        )
      : getDistanceFadeMaterialVariant(renderable.material, fadeMaterialCache);
    child.userData.distanceFadePrepared = true;

    for (const material of getObjectMaterials(renderable)) {
      material.userData.distanceFadeBaseOpacity ??= material.opacity;
      material.userData.distanceFadeBaseTransparent ??= material.transparent;
      material.userData.distanceFadeBaseDepthWrite ??= material.depthWrite;
    }
  });
}

export function applyObjectDistanceFade(
  root: THREE.Object3D,
  opacity: number
): void {
  root.traverse((child) => {
    const baseVisible = child.userData.distanceFadeBaseVisible ?? true;
    child.visible = baseVisible && opacity > MIN_MODEL_VISIBILITY_OPACITY;
    const renderable = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
    };
    if (!renderable.material) {
      return;
    }

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
  });
}

function getDistanceFadeMaterialVariant(
  material: THREE.Material,
  cache: WeakMap<THREE.Material, THREE.Material>
): THREE.Material {
  const cached = cache.get(material);
  if (cached) {
    return cached;
  }

  const clone = material.clone();
  cache.set(material, clone);
  return clone;
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

export function collectSceneResourceStats(
  root: Pick<THREE.Object3D, 'traverse'>
): SceneResourceStats {
  let object3dCount = 0;
  let groupCount = 0;
  let meshCount = 0;
  let pointsCount = 0;
  let spriteCount = 0;
  let lightCount = 0;
  let treeCount = 0;
  let treeObjectCount = 0;
  let treeMeshCount = 0;
  let treeMaterialRefCount = 0;
  const materials = new Set<THREE.Material>();
  const geometries = new Set<unknown>();

  root.traverse((child) => {
    object3dCount += 1;
    if ((child as THREE.Object3D).type === 'Group') {
      groupCount += 1;
    }
    if ((child as THREE.Object3D).type === 'Points') {
      pointsCount += 1;
    }
    if ((child as THREE.Object3D).type === 'Sprite') {
      spriteCount += 1;
    }
    if ((child as THREE.Object3D).isLight) {
      lightCount += 1;
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
      geometries.add(renderable.geometry);
    }

    const childMaterials = getObjectMaterials(renderable);
    if (childMaterials.length > 0 && renderable.geometry) {
      meshCount += 1;
    }
    for (const material of childMaterials) {
      materials.add(material);
    }
  });

  return {
    object3dCount,
    groupCount,
    meshCount,
    pointsCount,
    spriteCount,
    lightCount,
    materialCount: materials.size,
    geometryCount: geometries.size,
    treeCount,
    treeObjectCount,
    treeMeshCount,
    treeMaterialRefCount,
  };
}

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
  const entries: Array<{
    key: string;
    x: number;
    y: number;
    distance: number;
    facingDot: number;
  }> = [];
  for (let y = playerTileY - chunkRadius; y <= playerTileY + chunkRadius; y += 1) {
    for (let x = playerTileX - chunkRadius; x <= playerTileX + chunkRadius; x += 1) {
      if (
        !shouldRenderWorldTile({
          playerTileX,
          playerTileY,
          tileX: x,
          tileY: y,
          facingAngle,
          chunkRadius,
        })
      ) {
        continue;
      }
      const deltaX = x - playerTileX;
      const deltaY = y - playerTileY;
      const distance = Math.hypot(deltaX, deltaY);
      const facingDot =
        distance === 0
          ? 1
          : Math.cos(facingAngle) * (deltaX / distance) +
            Math.sin(facingAngle) * (deltaY / distance);
      entries.push({
        key: `${x}:${y}`,
        x,
        y,
        distance,
        facingDot,
      });
    }
  }
  entries.sort((left, right) => {
    if (Math.abs(left.distance - right.distance) > 0.001) {
      return left.distance - right.distance;
    }
    if (Math.abs(left.facingDot - right.facingDot) > 0.0001) {
      return right.facingDot - left.facingDot;
    }
    if (left.y !== right.y) {
      return left.y - right.y;
    }
    return left.x - right.x;
  });
  return entries.map(({ key, x, y }) => ({ key, x, y }));
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
      theta: hash2D('star-theta', index, 0) * Math.PI * 2,
      phi: hash2D('star-phi', 0, index) * Math.PI * 0.88 + 0.16,
      radius: SKY_RADIUS + hash2D('star-radius', index, index) * 4,
      brightness: 0.25 + hash2D('star-brightness', index, 3) * 0.75,
      scale: 0.14 + hash2D('star-scale', 7, index) * 0.46,
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
      hash2D('star-drift', index, cycle.activeConstellationIndex ?? 0) * 0.08;
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
