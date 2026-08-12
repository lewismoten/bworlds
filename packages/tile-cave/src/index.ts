import {
  createCoordinateCache,
  getOrCreateWeakMapValue,
} from '@bworlds/cache-support';
import { hash2D, registerHashLabel } from '@bworlds/core/hash';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createEnterablePoiTilePlugin,
  findPoiAnchor,
  markPoiLightEmitter,
  pickPreferredLandmarkFacing,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import {
  createBasicMaterial,
  createMountainTerrainMaterials,
} from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  Create3DModelProgress,
  CreateWorldActionContext,
  Paint2DContext,
  PoiAnchorLike,
  RuntimePlugin,
  TileLike,
  TilePlugin,
  ThreeMaterialLike,
  ThreeMatrix4Like,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const CAVE_TUNNEL_LINK_DISTANCE = 10;
const CAVE_PASS_ELEVATION_THRESHOLD = 0.72;
const CAVE_PASS_SAMPLE_COUNT = 5;
const CAVE_WIDTH_SEED = registerHashLabel('cave-width');
const CAVE_DEPTH_SEED = registerHashLabel('cave-depth');
const CAVE_HEIGHT_SEED = registerHashLabel('cave-height');
const CAVE_BOULDER_COUNT_SEED = registerHashLabel('cave-boulders');
const CAVE_BOULDER_SCALE_SEED = registerHashLabel('cave-boulder-scale');
const CAVE_BOULDER_X_SEED = registerHashLabel('cave-boulder-x');
const CAVE_BOULDER_Z_SEED = registerHashLabel('cave-boulder-z');
const CAVE_BOULDER_Y_SEED = registerHashLabel('cave-boulder-y');
const CAVE_CAP_X_SEED = registerHashLabel('cave-cap-x');
const CAVE_CAP_Z_SEED = registerHashLabel('cave-cap-z');
const CAVE_FACING_SEED = registerHashLabel('cave-facing');
const CAVE_MUSHROOM_COUNT_SEED = registerHashLabel('cave-mushroom-count');
const CAVE_MUSHROOM_X_SEED = registerHashLabel('cave-mushroom-x');
const CAVE_MUSHROOM_Z_SEED = registerHashLabel('cave-mushroom-z');
const CAVE_MUSHROOM_HEIGHT_SEED = registerHashLabel('cave-mushroom-h');
const CAVE_DRIPSTONE_COUNT_SEED = registerHashLabel('cave-dripstone-count');
const CAVE_DRIPSTONE_HEIGHT_SEED = registerHashLabel('cave-dripstone-height');
const CAVE_DRIPSTONE_X_SEED = registerHashLabel('cave-dripstone-x');
const CAVE_DRIPSTONE_Z_SEED = registerHashLabel('cave-dripstone-z');
const CAVE_DRIPSTONE_HANG_X_SEED = registerHashLabel('cave-dripstone-hang-x');
const CAVE_DRIPSTONE_HANG_Z_SEED = registerHashLabel('cave-dripstone-hang-z');
const CAVE_OBSTACLE_COUNT_SEED = registerHashLabel('cave-obstacle-count');
const CAVE_OBSTACLE_SCALE_SEED = registerHashLabel('cave-obstacle-scale');
const CAVE_OBSTACLE_X_SEED = registerHashLabel('cave-obstacle-x');
const CAVE_OBSTACLE_Z_SEED = registerHashLabel('cave-obstacle-z');
const caveMaterialCache = new WeakMap<
  object,
  {
    mouthVoidMaterial: ThreeMaterialLike;
    tunnelBackMaterial: ThreeMaterialLike;
    tunnelCeilingMaterial: ThreeMaterialLike;
    tunnelFloorMaterial: ThreeMaterialLike;
    lanternCoreMaterial: ThreeMaterialLike;
    mushroomCapMaterial: ThreeMaterialLike;
    mushroomStemMaterial: ThreeMaterialLike;
  }
>();

export function createCaveTilePlugin(): RuntimePlugin {
  const basePlugin = createEnterablePoiTilePlugin({
    pluginName: 'tile-cave',
    kind: 'cave',
    definition: {
      name: 'Cave',
      color: '#52525b',
      miniColor: '#71717a',
      walkable: true,
      wallHeight: 0.55,
    },
    paint2D: createPlainsBackedTilePainter(
      ({ context, x, y, motif, fillRect, speckle }) => {
        speckle(context, x, y, '#9ecf82', 14, 0.22, motif);
        context.fillStyle = '#27272a';
        context.beginPath();
        context.arc(x + 8 + motif.int(-1, 1), y + 8, 5.5, 0, Math.PI * 2);
        context.fill();
        fillRect(context, x + 5, y + 8, 6, 4, '#09090b');
        return true;
      }
    ),
    classifyPoi(context: ClassifyOverworldTileContext): TileLike | null {
      const anchor = findPoiAnchor(context, 'cave', 0.55);
      if (!anchor || !context.nearLand) {
        return null;
      }
      const linkedEntrances = resolveLinkedCaveEntrances(context, anchor);
      const systemId = createCaveSystemId(linkedEntrances);
      return {
        kind: 'cave',
        note: 'A cave mouth opens in the terrain.',
        poi: {
          ...(context.tile.poi ?? {}),
          type: 'cave',
          name: anchor.name ?? context.tile.poi?.name ?? 'Cave',
          systemId,
          entrances: linkedEntrances.map(({ x, y, name }) => ({ x, y, name })),
        },
      };
    },
    createWorldAction(context: CreateWorldActionContext) {
      if (!context.tile.poi) {
        return null;
      }
      const entrances = normalizeCaveEntrances(context.tile.poi.entrances, {
        x: context.x,
        y: context.y,
        name: context.tile.poi.name,
      });
      const systemId =
        typeof context.tile.poi.systemId === 'string'
          ? context.tile.poi.systemId
          : createCaveSystemId(entrances);
      return {
        type: 'enter',
        context: {
          id: systemId,
          label: context.tile.poi.name,
          type: 'cave',
          depth: 1,
          origin: { x: context.x, y: context.y },
          entrances,
          systemId,
        },
        spawn: { x: 0, y: 0 },
        facing: 0,
      };
    },
    create3DModel(context: Create3DModelContext) {
      return runCaveModelBuildToCompletion(createCaveModelProgressive(context));
    },
    create3DModelProgressive(context: Create3DModelContext) {
      return createCaveModelProgressive(context);
    },
    sync3DModel({ model, cycle }) {
      if (model && typeof model === 'object') {
        syncPoiLightEmitters(
          model as Parameters<typeof syncPoiLightEmitters>[0],
          cycle
        );
      }
    },
  });

  return {
    ...basePlugin,
    tiles: [...(basePlugin.tiles ?? []), ...createCaveInteriorTiles()],
  };
}

function* createCaveModelProgressive({
  three,
  state,
  tileX,
  tileY,
  detailLevel = 'full',
}: Create3DModelContext): Generator<Create3DModelProgress, unknown, void> {
  const { mountainMaterial } = createMountainTerrainMaterials(three);
  const {
    mouthVoidMaterial,
    tunnelBackMaterial,
    tunnelCeilingMaterial,
    tunnelFloorMaterial,
    lanternCoreMaterial,
  } = getCaveSharedMaterials(three);

  const entrance = getCaveEntranceDirection(state, tileX, tileY);
  const width = 0.9 + hash2D(CAVE_WIDTH_SEED, tileX, tileY) * 0.22;
  const depth = 0.92 + hash2D(CAVE_DEPTH_SEED, tileX, tileY) * 0.24;
  const height = 0.96 + hash2D(CAVE_HEIGHT_SEED, tileX, tileY) * 0.26;

  if (detailLevel === 'low') {
    return addLowDetailCaveModel(three, {
      tileX,
      tileY,
      width,
      depth,
      height,
      entrance,
      mountainMaterial,
      mouthVoidMaterial,
      tunnelBackMaterial,
    });
  }

  const totalSteps = 4;
  const boulderCount =
    3 + Math.floor(hash2D(CAVE_BOULDER_COUNT_SEED, tileX, tileY) * 3);
  const boulderInstances = new three.InstancedMesh(
    new three.SphereGeometry(0.36, 8, 7),
    mountainMaterial,
    boulderCount
  );
  boulderInstances.userData = {
    ...boulderInstances.userData,
    caveInstancedPart: 'entrance-boulder',
  };
  const boulderMatrixScratch = new three.Matrix4();

  for (let index = 0; index < boulderInstances.count; index += 1) {
    const radiusScale =
      0.9 +
      hash2D(CAVE_BOULDER_SCALE_SEED, tileX * 13 + index, tileY * 17) * 0.45;
    const xOffset =
      (hash2D(CAVE_BOULDER_X_SEED, tileX * 19 + index, tileY) - 0.5) * 0.34;
    const zOffset =
      (hash2D(CAVE_BOULDER_Z_SEED, tileX, tileY * 23 + index) - 0.5) * 0.32;
    const yOffset =
      0.2 + hash2D(CAVE_BOULDER_Y_SEED, tileX + index, tileY - index) * 0.32;
    boulderInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        boulderMatrixScratch,
        tileX + xOffset,
        yOffset,
        tileY + zOffset,
        width * radiusScale,
        height * (0.72 + radiusScale * 0.12),
        depth * radiusScale
      )
    );
  }
  const caveRoot = boulderInstances;

  const cap = new three.Mesh(
    new three.SphereGeometry(0.3, 7, 6),
    mountainMaterial
  );
  cap.position.set(
    tileX + (hash2D(CAVE_CAP_X_SEED, tileX, tileY) - 0.5) * 0.08,
    height * 0.82,
    tileY + (hash2D(CAVE_CAP_Z_SEED, tileX, tileY) - 0.5) * 0.08
  );
  cap.scale.set(width * 0.88, height * 0.6, depth * 0.82);
  caveRoot.add(cap);
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'entrance-boulders',
  };

  const portalOriginX = tileX + entrance.dx * 0.5;
  const portalOriginY = 0;
  const portalOriginZ = tileY + entrance.dy * 0.5;

  const crown = new three.Mesh(
    new three.SphereGeometry(0.17, 7, 6),
    mountainMaterial
  );
  const crownOffset = rotateCaveLocalOffset(0, 0.08, entrance.rotationY);
  crown.position.set(
    portalOriginX + crownOffset.x,
    portalOriginY + 0.42,
    portalOriginZ + crownOffset.z
  );
  crown.rotation.y = entrance.rotationY;
  crown.scale.set(2.2, 1.5, 1.05);
  caveRoot.add(crown);

  const cheekInstances = new three.InstancedMesh(
    new three.SphereGeometry(0.14, 7, 6),
    mountainMaterial
  );
  cheekInstances.count = 2;
  cheekInstances.userData = {
    ...(cheekInstances.userData ?? {}),
    caveInstancedPart: 'entrance-cheek',
  };
  const cheekMatrixScratch = new three.Matrix4();
  cheekInstances.setMatrixAt(
    0,
    writeRotatedInstancedScalePositionMatrix(
      cheekMatrixScratch,
      portalOriginX + rotateCaveLocalOffset(-0.24, 0.08, entrance.rotationY).x,
      portalOriginY + 0.2,
      portalOriginZ + rotateCaveLocalOffset(-0.24, 0.08, entrance.rotationY).z,
      1.4,
      1.9,
      1.1,
      entrance.rotationY
    )
  );
  cheekInstances.setMatrixAt(
    1,
    writeRotatedInstancedScalePositionMatrix(
      cheekMatrixScratch,
      portalOriginX + rotateCaveLocalOffset(0.24, 0.08, entrance.rotationY).x,
      portalOriginY + 0.2,
      portalOriginZ + rotateCaveLocalOffset(0.24, 0.08, entrance.rotationY).z,
      1.4,
      1.9,
      1.1,
      entrance.rotationY
    )
  );
  caveRoot.add(cheekInstances);

  const mouthVoid = new three.Mesh(
    new three.CircleGeometry(0.18, 20),
    mouthVoidMaterial
  );
  const mouthVoidOffset = rotateCaveLocalOffset(0, 0.22, entrance.rotationY);
  mouthVoid.position.set(
    portalOriginX + mouthVoidOffset.x,
    portalOriginY + 0.2,
    portalOriginZ + mouthVoidOffset.z
  );
  mouthVoid.rotation.y = entrance.rotationY;
  caveRoot.add(mouthVoid);

  const tunnelBack = new three.Mesh(
    new three.CircleGeometry(0.12, 18),
    tunnelBackMaterial
  );
  const tunnelBackOffset = rotateCaveLocalOffset(0, -0.16, entrance.rotationY);
  tunnelBack.position.set(
    portalOriginX + tunnelBackOffset.x,
    portalOriginY + 0.19,
    portalOriginZ + tunnelBackOffset.z
  );
  tunnelBack.rotation.y = entrance.rotationY;
  caveRoot.add(tunnelBack);

  const tunnelCeiling = new three.Mesh(
    new three.PlaneGeometry(0.24, 0.46),
    tunnelCeilingMaterial
  );
  const tunnelCeilingOffset = rotateCaveLocalOffset(
    0,
    0.01,
    entrance.rotationY
  );
  tunnelCeiling.position.set(
    portalOriginX + tunnelCeilingOffset.x,
    portalOriginY + 0.26,
    portalOriginZ + tunnelCeilingOffset.z
  );
  tunnelCeiling.rotation.x = Math.PI * 0.5;
  tunnelCeiling.rotation.y = entrance.rotationY;
  caveRoot.add(tunnelCeiling);

  const tunnelFloor = new three.Mesh(
    new three.PlaneGeometry(0.22, 0.34),
    tunnelFloorMaterial
  );
  const tunnelFloorOffset = rotateCaveLocalOffset(0, 0.02, entrance.rotationY);
  tunnelFloor.position.set(
    portalOriginX + tunnelFloorOffset.x,
    portalOriginY + 0.04,
    portalOriginZ + tunnelFloorOffset.z
  );
  tunnelFloor.rotation.x = -Math.PI * 0.5;
  tunnelFloor.rotation.y = entrance.rotationY;
  caveRoot.add(tunnelFloor);
  yield {
    completedSteps: 2,
    totalSteps,
    label: 'portal-shell',
  };

  const arch = new three.Mesh(
    new three.TorusGeometry(0.24, 0.06, 6, 12, Math.PI),
    mountainMaterial
  );
  const archOffset = rotateCaveLocalOffset(0, 0.22, entrance.rotationY);
  arch.position.set(
    portalOriginX + archOffset.x,
    portalOriginY + 0.31,
    portalOriginZ + archOffset.z
  );
  arch.rotation.y = entrance.rotationY;
  arch.rotation.z = Math.PI;
  caveRoot.add(arch);

  const pillarInstances = new three.InstancedMesh(
    new three.SphereGeometry(0.08, 6, 6),
    mountainMaterial
  );
  pillarInstances.count = 2;
  pillarInstances.userData = {
    ...(pillarInstances.userData ?? {}),
    caveInstancedPart: 'entrance-pillar',
  };
  const pillarMatrixScratch = new three.Matrix4();
  pillarInstances.setMatrixAt(
    0,
    writeRotatedInstancedScalePositionMatrix(
      pillarMatrixScratch,
      portalOriginX + rotateCaveLocalOffset(-0.2, 0.16, entrance.rotationY).x,
      portalOriginY + 0.16,
      portalOriginZ + rotateCaveLocalOffset(-0.2, 0.16, entrance.rotationY).z,
      1,
      1.9,
      1.2,
      entrance.rotationY
    )
  );
  pillarInstances.setMatrixAt(
    1,
    writeRotatedInstancedScalePositionMatrix(
      pillarMatrixScratch,
      portalOriginX + rotateCaveLocalOffset(0.2, 0.16, entrance.rotationY).x,
      portalOriginY + 0.16,
      portalOriginZ + rotateCaveLocalOffset(0.2, 0.16, entrance.rotationY).z,
      1,
      1.9,
      1.2,
      entrance.rotationY
    )
  );
  caveRoot.add(pillarInstances);

  const sill = new three.Mesh(
    new three.SphereGeometry(0.1, 6, 6),
    mountainMaterial
  );
  const sillOffset = rotateCaveLocalOffset(0, 0.22, entrance.rotationY);
  sill.position.set(
    portalOriginX + sillOffset.x,
    portalOriginY + 0.03,
    portalOriginZ + sillOffset.z
  );
  sill.rotation.y = entrance.rotationY;
  sill.scale.set(2.8, 0.55, 1.2);
  caveRoot.add(sill);
  yield {
    completedSteps: 3,
    totalSteps,
    label: 'arch-and-pillars',
  };

  const lanternCore = markPoiLightEmitter(
    new three.Mesh(new three.SphereGeometry(0.035, 6, 6), lanternCoreMaterial),
    {
      kind: 'emissive-mesh',
      dayIntensity: 0.02,
      nightIntensity: 1.35,
    }
  );
  const lanternCoreOffset = rotateCaveLocalOffset(
    0.24,
    0.18,
    entrance.rotationY
  );
  lanternCore.position.set(
    portalOriginX + lanternCoreOffset.x,
    portalOriginY + 0.34,
    portalOriginZ + lanternCoreOffset.z
  );
  caveRoot.add(lanternCore);

  const lanternLight = markPoiLightEmitter(
    new three.PointLight('#f6b85d', 0, 2.9, 1.9),
    {
      kind: 'point-light',
      nightIntensity: 0.82,
      visibleThreshold: 0.04,
    }
  );
  const lanternLightOffset = rotateCaveLocalOffset(
    0.24,
    0.12,
    entrance.rotationY
  );
  lanternLight.position.set(
    portalOriginX + lanternLightOffset.x,
    portalOriginY + 0.34,
    portalOriginZ + lanternLightOffset.z
  );
  lanternLight.visible = false;
  caveRoot.add(lanternLight);
  yield {
    completedSteps: 4,
    totalSteps,
    label: 'lantern',
  };

  return caveRoot;
}

function runCaveModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
): unknown {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function getCaveEntranceDirection(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
): ReturnType<typeof pickPreferredLandmarkFacing> {
  return pickPreferredLandmarkFacing({
    state,
    tileX,
    tileY,
    seedKey: CAVE_FACING_SEED,
    preferLandFacing: true,
  });
}

function resolveLinkedCaveEntrances(
  context: ClassifyOverworldTileContext,
  anchor: PoiAnchorLike
): PoiAnchorLike[] {
  const cachedSampleTerrainSignals = context.sampleTerrainSignals
    ? createCachedTerrainSignalSampler(context.sampleTerrainSignals)
    : context.sampleTerrainSignals;
  const caveAnchors = (context.poiAnchors ?? []).filter(
    (candidate): candidate is PoiAnchorLike => candidate.type === 'cave'
  );
  const queue = [anchor];
  const visited = new Set<string>();
  const linked: PoiAnchorLike[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = `${current.x}:${current.y}`;
    if (visited.has(currentKey)) {
      continue;
    }
    visited.add(currentKey);
    linked.push(current);

    caveAnchors.forEach((candidate) => {
      const candidateKey = `${candidate.x}:${candidate.y}`;
      if (visited.has(candidateKey)) {
        return;
      }
      if (
        Math.hypot(candidate.x - current.x, candidate.y - current.y) >
        CAVE_TUNNEL_LINK_DISTANCE
      ) {
        return;
      }
      if (!sharesMountainPass(current, candidate, cachedSampleTerrainSignals)) {
        return;
      }
      queue.push(candidate);
    });
  }

  return linked.sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y
  );
}

function createCachedTerrainSignalSampler(
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >
): NonNullable<ClassifyOverworldTileContext['sampleTerrainSignals']> {
  const cache =
    createCoordinateCache<
      ReturnType<
        NonNullable<ClassifyOverworldTileContext['sampleTerrainSignals']>
      >
    >();
  return (x, y) => cache.getOrCreate(x, y, () => sampleTerrainSignals(x, y));
}

function sharesMountainPass(
  left: Pick<PoiAnchorLike, 'x' | 'y'>,
  right: Pick<PoiAnchorLike, 'x' | 'y'>,
  sampleTerrainSignals: ClassifyOverworldTileContext['sampleTerrainSignals']
): boolean {
  if (!sampleTerrainSignals) {
    return false;
  }
  let supportedSamples = 0;
  for (let index = 0; index < CAVE_PASS_SAMPLE_COUNT; index += 1) {
    const t =
      CAVE_PASS_SAMPLE_COUNT <= 1 ? 0 : index / (CAVE_PASS_SAMPLE_COUNT - 1);
    const sampleX = Math.round(left.x + (right.x - left.x) * t);
    const sampleY = Math.round(left.y + (right.y - left.y) * t);
    if (hasAdjacentMountainPass(sampleX, sampleY, sampleTerrainSignals)) {
      supportedSamples += 1;
    }
  }
  return supportedSamples >= Math.ceil(CAVE_PASS_SAMPLE_COUNT * 0.6);
}

function hasAdjacentMountainPass(
  x: number,
  y: number,
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >
): boolean {
  return [
    sampleTerrainSignals(x + 1, y).elevation,
    sampleTerrainSignals(x - 1, y).elevation,
    sampleTerrainSignals(x, y + 1).elevation,
    sampleTerrainSignals(x, y - 1).elevation,
  ].some((elevation) => elevation >= CAVE_PASS_ELEVATION_THRESHOLD);
}

function createCaveSystemId(
  entrances: Array<Pick<PoiAnchorLike, 'x' | 'y'>>
): string {
  return `cave-system:${entrances.map(({ x, y }) => `${x},${y}`).join('|')}`;
}

function normalizeCaveEntrances(
  value: unknown,
  fallback: { x: number; y: number; name?: unknown }
): Array<{ x: number; y: number; name?: string }> {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        x: fallback.x,
        y: fallback.y,
        ...(typeof fallback.name === 'string' ? { name: fallback.name } : {}),
      },
    ];
  }

  return value
    .filter(
      (entry): entry is { x: number; y: number; name?: string } =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { x?: unknown }).x === 'number' &&
        typeof (entry as { y?: unknown }).y === 'number'
    )
    .map((entry) => ({
      x: entry.x,
      y: entry.y,
      ...(typeof entry.name === 'string' ? { name: entry.name } : {}),
    }));
}

function createCaveInteriorTiles(): TilePlugin[] {
  return [
    {
      kind: 'cave-floor',
      definition: {
        name: 'Cave Floor',
        color: '#3a332d',
        miniColor: '#5a5148',
        walkable: true,
        wallHeight: 0,
      },
      paint2D: paintCaveFloorTile,
    },
    {
      kind: 'cave-wall',
      definition: {
        name: 'Cave Wall',
        color: '#272320',
        miniColor: '#3a332d',
        walkable: false,
        wallHeight: 1.05,
      },
      paint2D: paintCaveWallTile,
    },
    {
      kind: 'cave-mushrooms',
      definition: {
        name: 'Glow Mushrooms',
        color: '#2f3a30',
        miniColor: '#58cfa0',
        walkable: true,
        wallHeight: 0,
      },
      paint2D: paintCaveMushroomTile,
      create3DModel({ three, tileX, tileY }: Create3DModelContext) {
        return createCaveMushroomGroup(three, tileX, tileY);
      },
    },
    {
      kind: 'cave-dripstone',
      definition: {
        name: 'Dripstone',
        color: '#4a433c',
        miniColor: '#6b6259',
        walkable: false,
        wallHeight: 0.78,
      },
      paint2D: paintCaveDripstoneTile,
      create3DModel({ three, tileX, tileY }: Create3DModelContext) {
        return createCaveDripstoneGroup(three, tileX, tileY);
      },
    },
    {
      kind: 'cave-obstacle',
      definition: {
        name: 'Fallen Rock',
        color: '#4b4239',
        miniColor: '#75685b',
        walkable: false,
        wallHeight: 0.58,
      },
      paint2D: paintCaveObstacleTile,
      create3DModel({ three, tileX, tileY }: Create3DModelContext) {
        return createCaveObstacleGroup(three, tileX, tileY);
      },
    },
  ];
}

function paintCaveFloorTile({
  context,
  x,
  y,
  fillRect,
  speckle,
  motif,
}: Paint2DContext) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#453c35');
  speckle(context, x, y, '#5d5247', 18, 0.22, motif);
  fillRect(context, x, y + 12, TILE_PIXEL_SIZE, 2, '#332d28');
  return true;
}

function paintCaveWallTile({
  context,
  x,
  y,
  fillRect,
  speckle,
  motif,
}: Paint2DContext) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#26211e');
  for (let row = 1; row < TILE_PIXEL_SIZE; row += 4) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, '#342d28');
  }
  speckle(context, x, y, '#4b423b', 16, 0.16, motif);
  return true;
}

function paintCaveMushroomTile(paint: Paint2DContext) {
  paintCaveFloorTile(paint);
  const { context, x, y, fillRect, motif } = paint;
  const capX = 4 + motif.int(0, 2);
  const capY = 7 + motif.int(-1, 1);
  fillRect(context, x + capX, y + capY, 3, 2, '#7ef7c0');
  fillRect(context, x + capX + 5, y + capY - 2, 3, 2, '#a7fff0');
  fillRect(context, x + capX + 1, y + capY + 2, 1, 2, '#d8fff6');
  fillRect(context, x + capX + 6, y + capY, 1, 2, '#d8fff6');
  return true;
}

function paintCaveDripstoneTile(paint: Paint2DContext) {
  paintCaveFloorTile(paint);
  const { context, x, y, fillRect, motif } = paint;
  const apex = 7 + motif.int(-1, 1);
  for (let row = 0; row < 5; row += 1) {
    fillRect(
      context,
      x + apex - row,
      y + 10 - row * 2,
      row * 2 + 1,
      2,
      '#7a7063'
    );
  }
  return true;
}

function paintCaveObstacleTile(paint: Paint2DContext) {
  paintCaveFloorTile(paint);
  const { context, x, y, fillRect, motif } = paint;
  fillRect(context, x + 4, y + 6, 8, 5, '#6c6157');
  fillRect(context, x + 5 + motif.int(-1, 1), y + 4, 5, 3, '#8a7d70');
  fillRect(context, x + 3, y + 10, 10, 2, '#564d46');
  return true;
}

function createCaveMushroomGroup(
  three: Create3DModelContext['three'],
  tileX: number,
  tileY: number
) {
  const { mushroomCapMaterial, mushroomStemMaterial } =
    getCaveSharedMaterials(three);
  const count =
    3 + Math.floor(hash2D(CAVE_MUSHROOM_COUNT_SEED, tileX, tileY) * 3);
  const stemInstances = new three.InstancedMesh(
    new three.CylinderGeometry(0.025, 0.04, 0.12, 6),
    mushroomStemMaterial,
    count
  );
  stemInstances.userData = {
    ...(stemInstances.userData ?? {}),
    caveInstancedPart: 'mushroom-stem',
  };
  const capInstances = new three.InstancedMesh(
    new three.SphereGeometry(0.075, 8, 6),
    mushroomCapMaterial,
    count
  );
  capInstances.userData = {
    ...(capInstances.userData ?? {}),
    caveInstancedPart: 'mushroom-cap',
  };
  const stemMatrixScratch = new three.Matrix4();
  const capMatrixScratch = new three.Matrix4();

  for (let index = 0; index < count; index += 1) {
    const offsetX =
      (hash2D(CAVE_MUSHROOM_X_SEED, tileX * 11 + index, tileY) - 0.5) * 0.45;
    const offsetZ =
      (hash2D(CAVE_MUSHROOM_Z_SEED, tileX, tileY * 13 + index) - 0.5) * 0.45;
    const height =
      0.11 + hash2D(CAVE_MUSHROOM_HEIGHT_SEED, tileX + index, tileY) * 0.05;
    stemInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        stemMatrixScratch,
        tileX + offsetX,
        height * 0.5,
        tileY + offsetZ,
        1,
        height / 0.12,
        1
      )
    );
    capInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        capMatrixScratch,
        tileX + offsetX,
        height,
        tileY + offsetZ,
        1.15,
        0.7,
        1.15
      )
    );
  }

  stemInstances.add(capInstances);
  return stemInstances;
}

function getCaveSharedMaterials(three: Create3DModelContext['three']) {
  return getOrCreateWeakMapValue(caveMaterialCache, three as object, () => ({
    mouthVoidMaterial: createBasicMaterial(three, {
      color: '#010308',
      side: three.DoubleSide,
    }),
    tunnelBackMaterial: createBasicMaterial(three, {
      color: '#000000',
      side: three.DoubleSide,
    }),
    tunnelCeilingMaterial: createBasicMaterial(three, {
      color: '#03060a',
      side: three.DoubleSide,
    }),
    tunnelFloorMaterial: createBasicMaterial(three, {
      color: '#080b10',
      side: three.DoubleSide,
    }),
    lanternCoreMaterial: new three.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#f59e0b',
      emissiveIntensity: 0.02,
      roughness: 0.28,
      metalness: 0.04,
    }),
    mushroomCapMaterial: new three.MeshStandardMaterial({
      color: '#8fffd2',
      emissive: '#64f2c3',
      emissiveIntensity: 0.95,
      roughness: 0.42,
      metalness: 0.02,
    }),
    mushroomStemMaterial: new three.MeshStandardMaterial({
      color: '#d7d2c8',
      roughness: 0.88,
      metalness: 0.01,
    }),
  }));
}

function addLowDetailCaveModel(
  three: Create3DModelContext['three'],
  {
    tileX,
    tileY,
    width,
    depth,
    height,
    entrance,
    mountainMaterial,
    mouthVoidMaterial,
    tunnelBackMaterial,
  }: {
    tileX: number;
    tileY: number;
    width: number;
    depth: number;
    height: number;
    entrance: ReturnType<typeof getCaveEntranceDirection>;
    mountainMaterial: ThreeMaterialLike;
    mouthVoidMaterial: ThreeMaterialLike;
    tunnelBackMaterial: ThreeMaterialLike;
  }
) {
  const mound = new three.Mesh(
    new three.SphereGeometry(0.32, 7, 6),
    mountainMaterial
  );
  mound.position.set(tileX, height * 0.46, tileY);
  mound.scale.set(width * 1.9, height * 1.22, depth * 1.55);
  mound.userData = {
    ...(mound.userData ?? {}),
    caveLowDetailPart: 'mound',
  };

  const portalOriginX = tileX + entrance.dx * 0.46;
  const portalOriginZ = tileY + entrance.dy * 0.46;

  const mouthVoid = new three.Mesh(
    new three.CircleGeometry(0.19, 16),
    mouthVoidMaterial
  );
  const mouthVoidOffset = rotateCaveLocalOffset(0, 0.2, entrance.rotationY);
  mouthVoid.position.set(
    portalOriginX + mouthVoidOffset.x - tileX,
    0.22 - height * 0.46,
    portalOriginZ + mouthVoidOffset.z - tileY
  );
  mouthVoid.rotation.y = entrance.rotationY;
  mouthVoid.userData = {
    ...(mouthVoid.userData ?? {}),
    caveLowDetailPart: 'mouth-void',
  };
  mound.add(mouthVoid);

  const tunnelBack = new three.Mesh(
    new three.CircleGeometry(0.13, 14),
    tunnelBackMaterial
  );
  const tunnelBackOffset = rotateCaveLocalOffset(0, -0.12, entrance.rotationY);
  tunnelBack.position.set(
    portalOriginX + tunnelBackOffset.x - tileX,
    0.2 - height * 0.46,
    portalOriginZ + tunnelBackOffset.z - tileY
  );
  tunnelBack.rotation.y = entrance.rotationY;
  tunnelBack.userData = {
    ...(tunnelBack.userData ?? {}),
    caveLowDetailPart: 'tunnel-back',
  };
  mound.add(tunnelBack);

  return mound;
}

function createCaveDripstoneGroup(
  three: Create3DModelContext['three'],
  tileX: number,
  tileY: number
) {
  const { mountainMaterial } = createMountainTerrainMaterials(three);
  const spireCount =
    3 + Math.floor(hash2D(CAVE_DRIPSTONE_COUNT_SEED, tileX, tileY) * 3);
  const spireGeometry = new three.ConeGeometry(0.08, 1, 5);
  const spireInstances = new three.InstancedMesh(
    spireGeometry,
    mountainMaterial,
    spireCount
  );
  const spireMatrix = new three.Matrix4();
  spireInstances.userData = {
    caveInstancedPart: 'dripstone-spire',
  };

  for (let index = 0; index < spireCount; index += 1) {
    const height =
      0.45 + hash2D(CAVE_DRIPSTONE_HEIGHT_SEED, tileX + index, tileY) * 0.38;
    spireInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        spireMatrix,
        tileX +
          (hash2D(CAVE_DRIPSTONE_X_SEED, tileX * 17 + index, tileY) - 0.5) *
            0.46,
        height * 0.5,
        tileY +
          (hash2D(CAVE_DRIPSTONE_Z_SEED, tileX, tileY * 19 + index) - 0.5) *
            0.46,
        1,
        height,
        1
      )
    );
  }

  const hanging = new three.Mesh(
    new three.ConeGeometry(0.07, 0.28, 5),
    mountainMaterial
  );
  hanging.position.set(
    tileX + (hash2D(CAVE_DRIPSTONE_HANG_X_SEED, tileX, tileY) - 0.5) * 0.3,
    0.92,
    tileY + (hash2D(CAVE_DRIPSTONE_HANG_Z_SEED, tileX, tileY) - 0.5) * 0.3
  );
  hanging.rotation.x = Math.PI;
  spireInstances.add(hanging);

  return spireInstances;
}

function createCaveObstacleGroup(
  three: Create3DModelContext['three'],
  tileX: number,
  tileY: number
) {
  const { mountainMaterial } = createMountainTerrainMaterials(three);
  const count =
    2 + Math.floor(hash2D(CAVE_OBSTACLE_COUNT_SEED, tileX, tileY) * 3);
  const boulderInstances = new three.InstancedMesh(
    new three.SphereGeometry(0.16, 7, 6),
    mountainMaterial,
    count
  );
  const boulderMatrix = new three.Matrix4();
  boulderInstances.userData = {
    caveInstancedPart: 'obstacle-boulder',
  };

  for (let index = 0; index < count; index += 1) {
    const scale =
      0.75 + hash2D(CAVE_OBSTACLE_SCALE_SEED, tileX + index, tileY) * 0.5;
    boulderInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        boulderMatrix,
        tileX +
          (hash2D(CAVE_OBSTACLE_X_SEED, tileX * 23 + index, tileY) - 0.5) *
            0.34,
        0.12 + index * 0.04,
        tileY +
          (hash2D(CAVE_OBSTACLE_Z_SEED, tileX, tileY * 29 + index) - 0.5) * 0.3,
        scale,
        0.7 + scale * 0.35,
        scale
      )
    );
  }

  return boulderInstances;
}

function writeInstancedScalePositionMatrix(
  target: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): ThreeMatrix4Like {
  return target.makeScale(scaleX, scaleY, scaleZ).setPosition(x, y, z);
}

function writeRotatedInstancedScalePositionMatrix(
  target: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationY: number
): ThreeMatrix4Like {
  const cosRotation = Math.cos(rotationY);
  const sinRotation = Math.sin(rotationY);
  return target.set(
    cosRotation * scaleX,
    0,
    sinRotation * scaleZ,
    x,
    0,
    scaleY,
    0,
    y,
    -sinRotation * scaleX,
    0,
    cosRotation * scaleZ,
    z,
    0,
    0,
    0,
    1
  );
}

function rotateCaveLocalOffset(
  localX: number,
  localZ: number,
  rotationY: number
) {
  const cosRotation = Math.cos(rotationY);
  const sinRotation = Math.sin(rotationY);
  return {
    x: localX * cosRotation + localZ * sinRotation,
    z: -localX * sinRotation + localZ * cosRotation,
  };
}
