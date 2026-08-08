import { hash2D } from '@bworlds/core';
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
  CreateWorldActionContext,
  Paint2DContext,
  PoiAnchorLike,
  RuntimePlugin,
  TileLike,
  TilePlugin,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const CAVE_TUNNEL_LINK_DISTANCE = 10;
const CAVE_PASS_ELEVATION_THRESHOLD = 0.72;
const CAVE_PASS_SAMPLE_COUNT = 5;

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
    paint2D: createPlainsBackedTilePainter(({ context, x, y, motif, fillRect, speckle }) => {
      speckle(context, x, y, '#9ecf82', 14, 0.22, motif);
      context.fillStyle = '#27272a';
      context.beginPath();
      context.arc(x + 8 + motif.int(-1, 1), y + 8, 5.5, 0, Math.PI * 2);
      context.fill();
      fillRect(context, x + 5, y + 8, 6, 4, '#09090b');
      return true;
    }),
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
    create3DModel({
      three,
      state,
      tileX,
      tileY,
    }: Create3DModelContext) {
      const { mountainMaterial } = createMountainTerrainMaterials(three);

      const group = new three.Group();
      const entrance = getCaveEntranceDirection(state, tileX, tileY);
      const width = 0.9 + hash2D('cave-width', tileX, tileY) * 0.22;
      const depth = 0.92 + hash2D('cave-depth', tileX, tileY) * 0.24;
      const height = 0.96 + hash2D('cave-height', tileX, tileY) * 0.26;
      const boulderCount =
        3 + Math.floor(hash2D('cave-boulders', tileX, tileY) * 3);

      for (let index = 0; index < boulderCount; index += 1) {
        const boulder = new three.Mesh(
          new three.SphereGeometry(0.36, 8, 7),
          mountainMaterial
        );
        const radiusScale =
          0.9 +
          hash2D('cave-boulder-scale', tileX * 13 + index, tileY * 17) * 0.45;
        const xOffset =
          (hash2D('cave-boulder-x', tileX * 19 + index, tileY) - 0.5) * 0.34;
        const zOffset =
          (hash2D('cave-boulder-z', tileX, tileY * 23 + index) - 0.5) * 0.32;
        const yOffset =
          0.2 + hash2D('cave-boulder-y', tileX + index, tileY - index) * 0.32;
        boulder.position.set(tileX + xOffset, yOffset, tileY + zOffset);
        boulder.scale.set(
          width * radiusScale,
          height * (0.72 + radiusScale * 0.12),
          depth * radiusScale
        );
        group.add(boulder);
      }

      const cap = new three.Mesh(
        new three.SphereGeometry(0.3, 7, 6),
        mountainMaterial
      );
      cap.position.set(
        tileX + (hash2D('cave-cap-x', tileX, tileY) - 0.5) * 0.08,
        height * 0.82,
        tileY + (hash2D('cave-cap-z', tileX, tileY) - 0.5) * 0.08
      );
      cap.scale.set(width * 0.88, height * 0.6, depth * 0.82);
      group.add(cap);

      const portal = new three.Group();
      portal.position.set(
        tileX + entrance.dx * 0.5,
        0,
        tileY + entrance.dy * 0.5
      );
      portal.rotation.y = entrance.rotationY;

      const crown = new three.Mesh(
        new three.SphereGeometry(0.17, 7, 6),
        mountainMaterial
      );
      crown.position.set(0, 0.42, 0.08);
      crown.scale.set(2.2, 1.5, 1.05);
      portal.add(crown);

      const leftCheek = new three.Mesh(
        new three.SphereGeometry(0.14, 7, 6),
        mountainMaterial
      );
      leftCheek.position.set(-0.24, 0.2, 0.08);
      leftCheek.scale.set(1.4, 1.9, 1.1);
      portal.add(leftCheek);

      const rightCheek = new three.Mesh(
        new three.SphereGeometry(0.14, 7, 6),
        mountainMaterial
      );
      rightCheek.position.set(0.24, 0.2, 0.08);
      rightCheek.scale.set(1.4, 1.9, 1.1);
      portal.add(rightCheek);

      const mouthVoid = new three.Mesh(
        new three.CircleGeometry(0.18, 20),
        createBasicMaterial(three, {
          color: '#010308',
          side: three.DoubleSide,
        })
      );
      mouthVoid.position.set(0, 0.2, 0.22);
      portal.add(mouthVoid);

      const tunnelBack = new three.Mesh(
        new three.CircleGeometry(0.12, 18),
        createBasicMaterial(three, {
          color: '#000000',
          side: three.DoubleSide,
        })
      );
      tunnelBack.position.set(0, 0.19, -0.16);
      portal.add(tunnelBack);

      const tunnelCeiling = new three.Mesh(
        new three.PlaneGeometry(0.24, 0.46),
        createBasicMaterial(three, {
          color: '#03060a',
          side: three.DoubleSide,
        })
      );
      tunnelCeiling.position.set(0, 0.26, 0.01);
      tunnelCeiling.rotation.x = Math.PI * 0.5;
      portal.add(tunnelCeiling);

      const tunnelFloor = new three.Mesh(
        new three.PlaneGeometry(0.22, 0.34),
        createBasicMaterial(three, {
          color: '#080b10',
          side: three.DoubleSide,
        })
      );
      tunnelFloor.position.set(0, 0.04, 0.02);
      tunnelFloor.rotation.x = -Math.PI * 0.5;
      portal.add(tunnelFloor);

      const arch = new three.Mesh(
        new three.TorusGeometry(0.24, 0.06, 6, 12, Math.PI),
        mountainMaterial
      );
      arch.position.set(0, 0.31, 0.22);
      arch.rotation.z = Math.PI;
      portal.add(arch);

      const leftPillar = new three.Mesh(
        new three.SphereGeometry(0.08, 6, 6),
        mountainMaterial
      );
      leftPillar.position.set(-0.2, 0.16, 0.16);
      leftPillar.scale.set(1, 1.9, 1.2);
      portal.add(leftPillar);

      const rightPillar = new three.Mesh(
        new three.SphereGeometry(0.08, 6, 6),
        mountainMaterial
      );
      rightPillar.position.set(0.2, 0.16, 0.16);
      rightPillar.scale.set(1, 1.9, 1.2);
      portal.add(rightPillar);

      const sill = new three.Mesh(
        new three.SphereGeometry(0.1, 6, 6),
        mountainMaterial
      );
      sill.position.set(0, 0.03, 0.22);
      sill.scale.set(2.8, 0.55, 1.2);
      portal.add(sill);

      const lanternCore = markPoiLightEmitter(
        new three.Mesh(
          new three.SphereGeometry(0.035, 6, 6),
          new three.MeshStandardMaterial({
            color: '#f59e0b',
            emissive: '#f59e0b',
            emissiveIntensity: 0.02,
            roughness: 0.28,
            metalness: 0.04,
          })
        ),
        {
          kind: 'emissive-mesh',
          dayIntensity: 0.02,
          nightIntensity: 1.35,
        }
      );
      lanternCore.position.set(0.24, 0.34, 0.18);
      portal.add(lanternCore);

      const lanternLight = markPoiLightEmitter(
        new three.PointLight('#f6b85d', 0, 2.9, 1.9),
        {
          kind: 'point-light',
          nightIntensity: 0.82,
          visibleThreshold: 0.04,
        }
      );
      lanternLight.position.set(0.24, 0.34, 0.12);
      lanternLight.visible = false;
      portal.add(lanternLight);

      group.add(portal);
      return group;
    },
    sync3DModel({ model, cycle }) {
      if (model && typeof model === 'object') {
        syncPoiLightEmitters(model as Parameters<typeof syncPoiLightEmitters>[0], cycle);
      }
    },
  });

  return {
    ...basePlugin,
    tiles: [...(basePlugin.tiles ?? []), ...createCaveInteriorTiles()],
  };
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
    seedKey: 'cave-facing',
    preferLandFacing: true,
  });
}

function resolveLinkedCaveEntrances(
  context: ClassifyOverworldTileContext,
  anchor: PoiAnchorLike
): PoiAnchorLike[] {
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
      if (
        !sharesMountainPass(
          current,
          candidate,
          context.sampleTerrainSignals
        )
      ) {
        return;
      }
      queue.push(candidate);
    });
  }

  return linked.sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y
  );
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
  sampleTerrainSignals: NonNullable<ClassifyOverworldTileContext['sampleTerrainSignals']>
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
    fillRect(context, x + apex - row, y + 10 - row * 2, row * 2 + 1, 2, '#7a7063');
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
  const group = new three.Group();
  const capMaterial = new three.MeshStandardMaterial({
    color: '#8fffd2',
    emissive: '#64f2c3',
    emissiveIntensity: 0.95,
    roughness: 0.42,
    metalness: 0.02,
  });
  const stemMaterial = new three.MeshStandardMaterial({
    color: '#d7d2c8',
    roughness: 0.88,
    metalness: 0.01,
  });
  const count = 3 + Math.floor(hash2D('cave-mushroom-count', tileX, tileY) * 3);

  for (let index = 0; index < count; index += 1) {
    const stem = new three.Mesh(
      new three.CylinderGeometry(0.025, 0.04, 0.12, 6),
      stemMaterial
    );
    const cap = new three.Mesh(
      new three.SphereGeometry(0.075, 8, 6),
      capMaterial
    );
    const offsetX =
      (hash2D('cave-mushroom-x', tileX * 11 + index, tileY) - 0.5) * 0.45;
    const offsetZ =
      (hash2D('cave-mushroom-z', tileX, tileY * 13 + index) - 0.5) * 0.45;
    const height = 0.11 + hash2D('cave-mushroom-h', tileX + index, tileY) * 0.05;
    stem.position.set(tileX + offsetX, height * 0.5, tileY + offsetZ);
    cap.position.set(tileX + offsetX, height, tileY + offsetZ);
    cap.scale.set(1.15, 0.7, 1.15);
    group.add(stem);
    group.add(cap);
  }

  return group;
}

function createCaveDripstoneGroup(
  three: Create3DModelContext['three'],
  tileX: number,
  tileY: number
) {
  const { mountainMaterial } = createMountainTerrainMaterials(three);
  const group = new three.Group();
  const spireCount = 3 + Math.floor(hash2D('cave-dripstone-count', tileX, tileY) * 3);

  for (let index = 0; index < spireCount; index += 1) {
    const height = 0.45 + hash2D('cave-dripstone-height', tileX + index, tileY) * 0.38;
    const spire = new three.Mesh(
      new three.ConeGeometry(0.08, height, 5),
      mountainMaterial
    );
    spire.position.set(
      tileX + (hash2D('cave-dripstone-x', tileX * 17 + index, tileY) - 0.5) * 0.46,
      height * 0.5,
      tileY + (hash2D('cave-dripstone-z', tileX, tileY * 19 + index) - 0.5) * 0.46
    );
    group.add(spire);
  }

  const hanging = new three.Mesh(
    new three.ConeGeometry(0.07, 0.28, 5),
    mountainMaterial
  );
  hanging.position.set(
    tileX + (hash2D('cave-dripstone-hang-x', tileX, tileY) - 0.5) * 0.3,
    0.92,
    tileY + (hash2D('cave-dripstone-hang-z', tileX, tileY) - 0.5) * 0.3
  );
  hanging.rotation.x = Math.PI;
  group.add(hanging);

  return group;
}

function createCaveObstacleGroup(
  three: Create3DModelContext['three'],
  tileX: number,
  tileY: number
) {
  const { mountainMaterial } = createMountainTerrainMaterials(three);
  const group = new three.Group();
  const count = 2 + Math.floor(hash2D('cave-obstacle-count', tileX, tileY) * 3);

  for (let index = 0; index < count; index += 1) {
    const boulder = new three.Mesh(
      new three.SphereGeometry(0.16, 7, 6),
      mountainMaterial
    );
    const scale = 0.75 + hash2D('cave-obstacle-scale', tileX + index, tileY) * 0.5;
    boulder.position.set(
      tileX + (hash2D('cave-obstacle-x', tileX * 23 + index, tileY) - 0.5) * 0.34,
      0.12 + index * 0.04,
      tileY + (hash2D('cave-obstacle-z', tileX, tileY * 29 + index) - 0.5) * 0.3
    );
    boulder.scale.set(scale, 0.7 + scale * 0.35, scale);
    group.add(boulder);
  }

  return group;
}
