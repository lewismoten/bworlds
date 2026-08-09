import {
  appendHashSeedLabel,
  appendHashSeedPart,
  createHashSeed,
  hash2D,
  hash2DWithSeed,
  octaveNoise2D,
  registerHashLabel,
} from '@bworlds/core';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import {
  createBoundarySurfaceProfile,
  createThresholdTerrainClassifier,
  isWaterOrCrossingKind,
  withTerrainTileClassifier,
} from '@bworlds/tile-support';
import {
  createCubicBezierPoints,
  createRibbonMesh,
  type PathPointLike,
} from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  DecorateOverworldTileContext,
  Kind,
  Paint2DContext,
  Paint2DOverlayContext,
  RuntimePlugin,
  SurfaceProfile3D,
  TileLike,
  ThreeHostLike,
  ThreeMaterialLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const RIVER_SURFACE_HEIGHT = -0.115;
const CONTINENT_NEIGHBOR_SEED = registerHashLabel('continent');
const OCEAN_SHIMMER_SEED = registerHashLabel('ocean-shimmer');
const RIVER_BEND_SEED = registerHashLabel('river-bend');
const RIVER_SWAY_SEED = registerHashLabel('river-sway');
const RIVER_BRANCH_SWAY_SEED = registerHashLabel('river-branch-sway');
const RIVER_RIBBON_SEED = registerHashLabel('river-ribbon');
const RIVER_RIBBON_STUB_SEED = registerHashLabel('stub');
const RIVER_RIBBON_HIGHLIGHT_SEED = registerHashLabel('highlight');
const RIVER_RIBBON_BRANCH_SEED = registerHashLabel('branch');
const RIVER_RIBBON_RIVER_SEED = registerHashLabel('river');
type RiverConnectionDirectionId =
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'northeast'
  | 'southeast'
  | 'southwest'
  | 'northwest'
  | 'stub';
const RIVER_CONNECTION_DIRECTION_SEEDS: Record<RiverConnectionDirectionId, number> = {
  north: registerHashLabel('north'),
  east: registerHashLabel('east'),
  south: registerHashLabel('south'),
  west: registerHashLabel('west'),
  northeast: registerHashLabel('northeast'),
  southeast: registerHashLabel('southeast'),
  southwest: registerHashLabel('southwest'),
  northwest: registerHashLabel('northwest'),
  stub: registerHashLabel('stub'),
};
const RIVER_DIRECTIONS: RiverConnection[] = [
  {
    id: 'north',
    dx: 0,
    dy: -1,
    edgeX: 0,
    edgeZ: -0.5,
    inwardX: 0,
    inwardZ: -0.24,
  },
  {
    id: 'east',
    dx: 1,
    dy: 0,
    edgeX: 0.5,
    edgeZ: 0,
    inwardX: 0.24,
    inwardZ: 0,
  },
  {
    id: 'south',
    dx: 0,
    dy: 1,
    edgeX: 0,
    edgeZ: 0.5,
    inwardX: 0,
    inwardZ: 0.24,
  },
  {
    id: 'west',
    dx: -1,
    dy: 0,
    edgeX: -0.5,
    edgeZ: 0,
    inwardX: -0.24,
    inwardZ: 0,
  },
  {
    id: 'northeast',
    dx: 1,
    dy: -1,
    edgeX: 0.5,
    edgeZ: -0.5,
    inwardX: 0.28,
    inwardZ: -0.28,
  },
  {
    id: 'southeast',
    dx: 1,
    dy: 1,
    edgeX: 0.5,
    edgeZ: 0.5,
    inwardX: 0.28,
    inwardZ: 0.28,
  },
  {
    id: 'southwest',
    dx: -1,
    dy: 1,
    edgeX: -0.5,
    edgeZ: 0.5,
    inwardX: -0.28,
    inwardZ: 0.28,
  },
  {
    id: 'northwest',
    dx: -1,
    dy: -1,
    edgeX: -0.5,
    edgeZ: -0.5,
    inwardX: -0.28,
    inwardZ: -0.28,
  },
];
const classifyOceanTile = createThresholdTerrainClassifier({
  kind: 'ocean',
  threshold: 0.38,
  comparator: 'lt',
  getSignal(context) {
    return context.signals.continent;
  },
});

export function createWaterTilePlugin(): RuntimePlugin {
  return createTilePlugin(
    'tile-water',
    [
      withTerrainTileClassifier({
        kind: 'ocean',
        definition: {
          name: 'Ocean',
          color: '#2563eb',
          miniColor: '#4ea3ff',
          walkable: false,
          wallHeight: 0.1,
        },
        getSurfaceProfile3D(): SurfaceProfile3D {
          return createBoundarySurfaceProfile({
            surfaceHeight: -0.12,
            boundaryRole: 'sea',
            boundaryTransition: {
              maxChamferDrop: 0.05,
              minBankHeight: 0.05,
              bodyInset: 0,
            },
          });
        },
        paint2D({
          context,
          x,
          y,
          definition,
          motif,
          fillRect,
        }: Paint2DContext) {
          const waveOffset = motif.int(0, 2);
          for (let row = waveOffset; row < TILE_PIXEL_SIZE; row += 3) {
            fillRect(
              context,
              x,
              y + row,
              TILE_PIXEL_SIZE,
              1,
              definition.miniColor
            );
          }
          fillRect(context, x + motif.int(1, 3), y + 3, 4, 1, '#d9f4ff');
          fillRect(context, x + motif.int(8, 10), y + 9, 5, 1, '#d9f4ff');
          return true;
        },
        paint2DOverlay({
          context,
          x,
          y,
          size,
          timeMs,
          worldX,
          worldY,
          variant,
        }: Paint2DOverlayContext) {
          if (typeof timeMs !== 'number') {
            return false;
          }

          const time = timeMs * 0.0012;
          const seed = hash2D(
            appendHashSeedPart(OCEAN_SHIMMER_SEED, variant),
            worldX,
            worldY
          );
          const drift = (seed - 0.5) * 1.8;

          context.save();
          context.beginPath();
          context.rect(x, y, size, size);
          context.clip();

          for (let band = 0; band < 3; band += 1) {
            const phase = time + band * 1.7 + drift;
            const centerX = x + (Math.sin(phase) * 0.5 + 0.5) * size;
            const centerY =
              y +
              size * (0.22 + band * 0.22) +
              Math.cos(phase * 1.3) * size * 0.04;
            const glow = context.createRadialGradient(
              centerX,
              centerY,
              0,
              centerX,
              centerY,
              size * 0.38
            );
            glow.addColorStop(0, 'rgba(255,255,255,0.34)');
            glow.addColorStop(0.35, 'rgba(217,244,255,0.18)');
            glow.addColorStop(1, 'rgba(217,244,255,0)');
            context.fillStyle = glow;
            context.fillRect(x, y, size, size);
          }

          context.strokeStyle = 'rgba(255,255,255,0.16)';
          context.lineWidth = Math.max(1, size * 0.045);
          for (let streak = 0; streak < 2; streak += 1) {
            const phase = time * 1.4 + streak * 2.1 + drift;
            const startX =
              x + (Math.sin(phase) * 0.5 + 0.5) * size * 0.8 + size * 0.1;
            const startY = y + size * (0.28 + streak * 0.26);
            context.beginPath();
            context.moveTo(startX - size * 0.1, startY);
            context.quadraticCurveTo(
              startX + size * 0.06,
              startY - size * 0.05,
              startX + size * 0.18,
              startY
            );
            context.stroke();
          }

          context.restore();
          return true;
        },
      }, classifyOceanTile),
      {
        kind: 'shore',
        definition: {
          name: 'Shore',
          color: '#f4d58d',
          miniColor: '#f8e9b5',
          walkable: true,
          wallHeight: 0,
        },
        getSurfaceProfile3D(): SurfaceProfile3D {
          return {
            surfaceHeight: 0,
            chamferEligible: true,
          };
        },
        paint2D({
          context,
          x,
          y,
          definition,
          motif,
          fillRect,
          speckle,
        }: Paint2DContext) {
          speckle(context, x, y, '#fff1c8', 28, 0.35, motif);
          const tideHeight = 10 + motif.int(0, 2);
          fillRect(
            context,
            x,
            y + tideHeight,
            TILE_PIXEL_SIZE,
            2,
            definition.miniColor
          );
          fillRect(
            context,
            x,
            y + tideHeight + 2,
            TILE_PIXEL_SIZE,
            1,
            '#d9f4ff'
          );
          return true;
        },
      },
      withTerrainTileClassifier({
        kind: 'river',
        definition: {
          name: 'River',
          color: '#38bdf8',
          miniColor: '#7dd3fc',
          walkable: false,
          wallHeight: 0.05,
        },
        getSurfaceProfile3D(): SurfaceProfile3D {
          return createBoundarySurfaceProfile({
            surfaceHeight: -0.12,
            boundaryRole: 'channel',
            boundaryTransition: {
              maxChamferDrop: 0.08,
              minBankHeight: 0,
              bodyInset: 0.08,
            },
          });
        },
        create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
          return createRiverGroup(three, state, tileX, tileY);
        },
        paint2D: createPlainsBackedTilePainter(({
          context,
          x,
          y,
          definition,
          motif,
        }: Paint2DContext) => {
          const startX = 4 + motif.int(-1, 1);
          const endX = 9 + motif.int(-1, 1);
          const controlA = 2 + motif.int(-1, 2);
          const controlB = 13 + motif.int(-2, 1);
          context.fillStyle = definition.color;
          context.beginPath();
          context.moveTo(x + startX, y);
          context.bezierCurveTo(
            x + controlA,
            y + 5,
            x + controlB,
            y + 10,
            x + endX,
            y + TILE_PIXEL_SIZE
          );
          context.lineTo(x + endX - 4, y + TILE_PIXEL_SIZE);
          context.bezierCurveTo(
            x + controlB - 4,
            y + 10,
            x + controlA - 4,
            y + 5,
            x + startX - 4,
            y
          );
          context.closePath();
          context.fill();
          context.strokeStyle = '#d9f4ff';
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(x + startX - 1, y + 1);
          context.bezierCurveTo(
            x + controlA,
            y + 5,
            x + controlB - 1,
            y + 10,
            x + endX - 1,
            y + TILE_PIXEL_SIZE - 1
          );
          context.stroke();
          return true;
        }),
      }, classifyRiverTile),
    ],
    {
      decorateOverworldTile({
        seed,
        x,
        y,
        tile,
      }: DecorateOverworldTileContext) {
        const seedHash =
          typeof seed === 'number' ? createHashSeed(seed) : registerHashLabel(seed);
        const continentSeed = appendHashSeedLabel(seedHash, CONTINENT_NEIGHBOR_SEED);
        const neighboringSeaSignal = Math.min(
          octaveNoise2D(continentSeed, (x + 1) / 160, y / 160, {
            octaves: 5,
            persistence: 0.55,
          }),
          octaveNoise2D(continentSeed, (x - 1) / 160, y / 160, {
            octaves: 5,
            persistence: 0.55,
          }),
          octaveNoise2D(continentSeed, x / 160, (y + 1) / 160, {
            octaves: 5,
            persistence: 0.55,
          }),
          octaveNoise2D(continentSeed, x / 160, (y - 1) / 160, {
            octaves: 5,
            persistence: 0.55,
          })
        );

        if (
          !isWaterOrCrossingKind(tile.kind) &&
          tile.kind !== 'mountain' &&
          neighboringSeaSignal < 0.4
        ) {
          tile.kind = 'shore';
          tile.note = tile.note ?? 'The terrain softens into a coastal edge.';
        }
      },
    }
  );
}

function classifyRiverTile(
  context: ClassifyOverworldTileContext
): TileLike | null {
  if (context.tile.kind !== 'plains') {
    return null;
  }

  const { continent, elevation, riverSignal } = context.signals;
  if (continent <= 0.42 || continent >= 0.9 || elevation >= 0.68) {
    return null;
  }

  if (!context.sampleTerrainSignals) {
    return riverSignal > 0.78 ? { kind: 'river' } : null;
  }

  const neighborSignals = [
    context.sampleTerrainSignals(context.x, context.y - 1).riverSignal,
    context.sampleTerrainSignals(context.x + 1, context.y).riverSignal,
    context.sampleTerrainSignals(context.x, context.y + 1).riverSignal,
    context.sampleTerrainSignals(context.x - 1, context.y).riverSignal,
  ];
  const diagonalSignals = [
    context.sampleTerrainSignals(context.x + 1, context.y - 1).riverSignal,
    context.sampleTerrainSignals(context.x + 1, context.y + 1).riverSignal,
    context.sampleTerrainSignals(context.x - 1, context.y + 1).riverSignal,
    context.sampleTerrainSignals(context.x - 1, context.y - 1).riverSignal,
  ];
  const strongCardinalNeighbors = neighborSignals.filter(
    (signal) => signal >= 0.73
  ).length;
  const strongDiagonalNeighbors = diagonalSignals.filter(
    (signal) => signal >= 0.75
  ).length;
  const strongestNeighbor = Math.max(...neighborSignals, ...diagonalSignals);
  const neighborAverage =
    [...neighborSignals, ...diagonalSignals].reduce(
      (total, signal) => total + signal,
      0
    ) /
    (neighborSignals.length + diagonalSignals.length);
  const hasOpposingFlow =
    (neighborSignals[0] >= 0.72 && neighborSignals[2] >= 0.72) ||
    (neighborSignals[1] >= 0.72 && neighborSignals[3] >= 0.72);
  const hasTurningFlow =
    strongCardinalNeighbors >= 2 ||
    (strongCardinalNeighbors >= 1 && strongDiagonalNeighbors >= 1);
  const centerlineCandidate = isSingleTileRiverCandidate({
    riverSignal,
    north: neighborSignals[0],
    east: neighborSignals[1],
    south: neighborSignals[2],
    west: neighborSignals[3],
  });

  if (riverSignal >= 0.82 && strongestNeighbor >= 0.68 && centerlineCandidate) {
    return { kind: 'river' };
  }
  if (
    riverSignal >= 0.77 &&
    (hasOpposingFlow || hasTurningFlow) &&
    centerlineCandidate
  ) {
    return { kind: 'river' };
  }
  if (
    riverSignal >= 0.73 &&
    strongCardinalNeighbors >= 1 &&
    neighborAverage >= 0.67 &&
    centerlineCandidate
  ) {
    return { kind: 'river' };
  }

  return null;
}

export function isSingleTileRiverCandidate(options: {
  riverSignal: number;
  north: number;
  east: number;
  south: number;
  west: number;
}): boolean {
  const perpendicularMargin = 0.035;
  const horizontalFlow =
    options.east >= 0.72 || options.west >= 0.72;
  const verticalFlow =
    options.north >= 0.72 || options.south >= 0.72;

  if (horizontalFlow && !verticalFlow) {
    return (
      options.riverSignal >= options.north + perpendicularMargin &&
      options.riverSignal >= options.south + perpendicularMargin
    );
  }

  if (verticalFlow && !horizontalFlow) {
    return (
      options.riverSignal >= options.east + perpendicularMargin &&
      options.riverSignal >= options.west + perpendicularMargin
    );
  }

  if (horizontalFlow && verticalFlow) {
    const verticalStrength = Math.max(options.north, options.south);
    const horizontalStrength = Math.max(options.east, options.west);
    if (verticalStrength > horizontalStrength) {
      return (
        options.riverSignal >= options.east + perpendicularMargin &&
        options.riverSignal >= options.west + perpendicularMargin
      );
    }
    return (
      options.riverSignal >= options.north + perpendicularMargin &&
      options.riverSignal >= options.south + perpendicularMargin
    );
  }

  return options.riverSignal >= 0.78;
}

function createRiverGroup(
  three: ThreeHostLike,
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const connections = getRiverConnections(state, tileX, tileY);
  const tileSeed = createRiverTileSeed(tileX, tileY);
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);

  const riverMaterial = new three.MeshStandardMaterial({
    color: '#3bb8f5',
    roughness: 0.24,
    metalness: 0.02,
    transparent: true,
    opacity: 0.94,
    side: three.DoubleSide,
  });
  const highlightMaterial = new three.MeshStandardMaterial({
    color: '#d7f5ff',
    roughness: 0.14,
    metalness: 0.03,
    transparent: true,
    opacity: 0.68,
    side: three.DoubleSide,
  });

  if (connections.length === 0) {
    const stub = createRiverBranch(three, tileX, tileY, {
      id: 'stub',
      dx: 0,
      dy: 1,
      edgeX: 0,
      edgeZ: 0.5,
      inwardX: 0.08,
      inwardZ: 0.18,
    });
    group.add(
      createRiverRibbonMesh(
        three,
        stub,
        0.34,
        riverMaterial,
        appendHashSeedLabel(tileSeed, RIVER_RIBBON_STUB_SEED),
        0.12
      )
    );
    group.add(
      createRiverRibbonMesh(
        three,
        stub,
        0.12,
        highlightMaterial,
        appendHashSeedLabel(
          appendHashSeedLabel(tileSeed, RIVER_RIBBON_STUB_SEED),
          RIVER_RIBBON_HIGHLIGHT_SEED
        ),
        0.06,
        0.008
      )
    );
    return group;
  }

  const centerPool = new three.Mesh(
    new three.CircleGeometry(0.14, 18),
    riverMaterial
  );
  centerPool.rotation.x = -Math.PI * 0.5;
  centerPool.position.y = RIVER_SURFACE_HEIGHT;
  group.add(centerPool);

  if (connections.length === 2) {
    const curve = createRiverCurve(
      three,
      tileX,
      tileY,
      connections[0],
      connections[1]
    );
    group.add(
      createRiverRibbonMesh(
        three,
        curve,
        0.36,
        riverMaterial,
        appendHashSeedLabel(tileSeed, RIVER_RIBBON_RIVER_SEED),
        0.12
      )
    );
    group.add(
      createRiverRibbonMesh(
        three,
        curve,
        0.12,
        highlightMaterial,
        appendHashSeedLabel(
          appendHashSeedLabel(tileSeed, RIVER_RIBBON_RIVER_SEED),
          RIVER_RIBBON_HIGHLIGHT_SEED
        ),
        0.04,
        0.008
      )
    );
    return group;
  }

  connections.forEach((connection, index) => {
    const branch = createRiverBranch(three, tileX, tileY, connection, index);
    const branchSeed = appendHashSeedLabel(
      appendHashSeedLabel(tileSeed, RIVER_RIBBON_BRANCH_SEED),
      RIVER_CONNECTION_DIRECTION_SEEDS[connection.id]
    );
    group.add(
      createRiverRibbonMesh(
        three,
        branch,
        0.32,
        riverMaterial,
        branchSeed,
        0.12
      )
    );
    group.add(
      createRiverRibbonMesh(
        three,
        branch,
        0.11,
        highlightMaterial,
        appendHashSeedLabel(branchSeed, RIVER_RIBBON_HIGHLIGHT_SEED),
        0.04,
        0.008
      )
    );
  });

  return group;
}

function getRiverConnections(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const directions: RiverConnection[] = [];
  for (let index = 0; index < RIVER_DIRECTIONS.length; index += 1) {
    const direction = RIVER_DIRECTIONS[index]!;
    if (isRiverNetworkKind(state.getCurrentTile(tileX + direction.dx, tileY + direction.dy).kind)) {
      directions.push(direction);
    }
  }

  directions.sort(
    (left, right) =>
      Math.atan2(left.edgeZ, left.edgeX) -
      Math.atan2(right.edgeZ, right.edgeX)
  );
  return directions;
}

function isRiverNetworkKind(kind: Kind): boolean {
  return isWaterOrCrossingKind(kind);
}

function createRiverTileSeed(tileX: number, tileY: number): number {
  return appendHashSeedPart(appendHashSeedPart(RIVER_RIBBON_SEED, tileX), tileY);
}

function createRiverCurve(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  start: RiverConnection,
  end: RiverConnection
) {
  const startPoint = new three.Vector3(
    start.edgeX,
    RIVER_SURFACE_HEIGHT,
    start.edgeZ
  );
  const endPoint = new three.Vector3(
    end.edgeX,
    RIVER_SURFACE_HEIGHT,
    end.edgeZ
  );
  const bend = (hash2D(RIVER_BEND_SEED, tileX, tileY) - 0.5) * 0.34;
  const sway = (hash2D(RIVER_SWAY_SEED, tileX, tileY) - 0.5) * 0.22;
  const opposite = start.dx === -end.dx && start.dy === -end.dy;
  const controlA = opposite
    ? new three.Vector3(
        start.dy !== 0 ? bend : sway,
        RIVER_SURFACE_HEIGHT,
        start.dx !== 0 ? bend : sway
      )
    : new three.Vector3(
        start.inwardX * 1.1 + sway,
        RIVER_SURFACE_HEIGHT,
        start.inwardZ * 1.1 + bend
      );
  const controlB = opposite
    ? new three.Vector3(
        end.dy !== 0 ? -bend : -sway,
        RIVER_SURFACE_HEIGHT,
        end.dx !== 0 ? -bend : -sway
      )
    : new three.Vector3(
        end.inwardX * 1.1 - sway,
        RIVER_SURFACE_HEIGHT,
        end.inwardZ * 1.1 - bend
      );

  return sampleCubicCurve(three, startPoint, controlA, controlB, endPoint, 11);
}

function createRiverBranch(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  connection: RiverConnection,
  index = 0
) {
  const start = new three.Vector3(0, RIVER_SURFACE_HEIGHT, 0);
  const end = new three.Vector3(
    connection.edgeX,
    RIVER_SURFACE_HEIGHT,
    connection.edgeZ
  );
  const sway =
    (hash2D(RIVER_BRANCH_SWAY_SEED, tileX * 7 + index, tileY * 11) - 0.5) * 0.24;
  const controlA = new three.Vector3(
    connection.inwardX * 0.42,
    RIVER_SURFACE_HEIGHT,
    connection.inwardZ * 0.42
  );
  const controlB = new three.Vector3(
    connection.inwardX + (connection.dy !== 0 ? sway : 0),
    RIVER_SURFACE_HEIGHT,
    connection.inwardZ + (connection.dx !== 0 ? sway : 0)
  );
  return sampleCubicCurve(three, start, controlA, controlB, end, 9);
}

function sampleCubicCurve(
  three: ThreeHostLike,
  start: RiverVectorLike,
  controlA: RiverVectorLike,
  controlB: RiverVectorLike,
  end: RiverVectorLike,
  segments: number
) {
  return createCubicBezierPoints(
    three,
    start,
    controlA,
    controlB,
    end,
    segments
  );
}

function createRiverRibbonMesh(
  three: ThreeHostLike,
  points: RiverVectorLike[],
  width: number,
  material: ThreeMaterialLike,
  seedHash: number,
  rippleStrength: number,
  yOffset = 0
) {
  return createRibbonMesh(three, points, width, material, {
    widthNoise(index, total) {
      return 1 + (hash2DWithSeed(seedHash, index, total) - 0.5) * rippleStrength;
    },
    yOffset,
  });
}

interface RiverConnection {
  id: RiverConnectionDirectionId;
  dx: number;
  dy: number;
  edgeX: number;
  edgeZ: number;
  inwardX: number;
  inwardZ: number;
}

type RiverVectorLike = PathPointLike;
