import { hash2D } from '@bworlds/core';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import {
  createRegionalMaterialResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import {
  createBoundarySurfaceProfile,
  createRouteTraversalProfile,
  hasConnectedRoutePath,
  hasLinearRouteSignal,
  isBridgeWaterKind,
  isRouteTerminalKind,
  isWaterOrCrossingKind,
  resolveDominantNeighborFloorKind3D,
} from '@bworlds/tile-support';
import {
  createPaintedCanvasTexture,
  createQuadraticBezierPoints,
  createRibbonMesh,
  type PathPointLike,
} from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Kind,
  Create3DModelContext,
  Paint2DContext,
  SurfaceProfile3D,
  ThreeHostLike,
  ThreeMaterialLike,
  RuntimePlugin,
  ThreeTextureLike,
  TraversalProfile3DContext,
  TraversalProfile3D,
  WorldStateLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const TILE_SIZE = 1;
const BRIDGE_REGION_SIZE = 22;
const ROAD_REGION_SIZE = 20;
const DOCK_REGION_SIZE = 18;
const BRIDGE_DECK_THICKNESS = 0.08;
const BRIDGE_RAIL_HEIGHT = 0.18;
const ROAD_SURFACE_HEIGHT = 0.012;
const ROAD_CORE_HEIGHT = 0.02;
const COASTAL_LAND_CONTINENT_THRESHOLD = 0.42;
const OCEAN_CONTINENT_THRESHOLD = 0.38;
const MAX_DOCK_LENGTH = 3;
const LONG_DOCK_BOAT_LENGTH = 3;
type RoadStyleType = 'footpath' | 'cobble' | 'brick';
type BridgeTextureType = 'wood' | 'stone' | 'metal' | 'drawbridge' | 'roof' | 'roof-stone';
type BridgeTextureLayer = 'deck' | 'rail' | 'cover' | 'pillar';

const bridgeStyleCache = new Map<string, BridgeStyle>();
const bridgeClusterCache = new Map<string, BridgeClusterInfo>();
const dockStyleCache = new Map<string, DockStyle>();
const dockClusterCache = new Map<string, DockClusterInfo>();
const roadStyleCache = new Map<string, RoadStyleBlueprint>();
const resolveRoadStyle = createRegionalMaterialResolver(
  roadStyleCache,
  ROAD_REGION_SIZE,
  ({ regionX, regionY }) => {
    const tier = Math.floor(hash2D('road-tier', regionX, regionY) * 3);
    const styleType = ['footpath', 'cobble', 'brick'] as const;
    const roadStyleType = styleType[tier] ?? 'brick';
    const palette =
      roadStyleType === 'brick'
        ? { road: '#a14d34', shoulder: '#6b5d48', accent: '#7a2f1d' }
        : roadStyleType === 'cobble'
          ? { road: '#8f8578', shoulder: '#6e7a68', accent: '#5f5b56' }
          : {
              road: '#8d6a42',
              shoulder: pickThresholdColor(
                hash2D('road-footpath-shoulder', regionX, regionY),
                0.5,
                '#5f7a4d',
                '#62724a'
              ),
              accent: '#5a4025',
            };

    return {
      createMaterials(three: ThreeHostLike): RoadStyle {
        const roadTexture = createRoadTexture(
          three,
          palette.road,
          palette.accent,
          roadStyleType,
          regionX,
          regionY
        );
        const shoulderTexture = createRoadShoulderTexture(
          three,
          palette.shoulder,
          palette.road,
          regionX,
          regionY
        );

        return {
          roadWidth: roadStyleType === 'footpath' ? 0.24 : 0.3,
          shoulderWidth: roadStyleType === 'footpath' ? 0.36 : 0.42,
          roadMaterial: new three.MeshStandardMaterial({
            color: '#ffffff',
            map: roadTexture,
            roughness: 0.95,
            metalness: roadStyleType === 'cobble' ? 0.04 : 0.02,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            side: three.DoubleSide,
          }),
          shoulderMaterial: new three.MeshStandardMaterial({
            color: '#ffffff',
            map: shoulderTexture,
            roughness: 0.98,
            metalness: 0.01,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
            side: three.DoubleSide,
          }),
        };
      },
    };
  }
);

export function createRouteTilePlugin(): RuntimePlugin {
  return createTilePlugin('tile-route', [
    {
      kind: 'road',
      definition: {
        name: 'Road',
        color: '#a16207',
        miniColor: '#ca8a04',
        walkable: true,
        wallHeight: 0,
      },
      getTraversalProfile3D(): TraversalProfile3D {
        return createRouteTraversalProfile();
      },
      classifyOverworldTile(context: ClassifyOverworldTileContext) {
        const connectedRoadKind = classifyConnectedRoad(context);
        if (connectedRoadKind) {
          return {
            ...context.tile,
            kind: connectedRoadKind,
            note:
              context.tile.note ??
              (connectedRoadKind === 'bridge'
                ? 'A crossing links the nearby routes.'
                : connectedRoadKind === 'dock'
                  ? 'A dock reaches out from the nearby coast.'
                  : 'A road runs between nearby landmarks.'),
          };
        }

        const noiseRoadKind = classifyNoiseRoad(context);
        if (!noiseRoadKind) {
          return null;
        }

        return { kind: noiseRoadKind };
      },
      paint2D: createPlainsBackedTilePainter(({ context, x, y, motif, fillRect }) => {
        const roadY = 5 + motif.int(0, 2);
        fillRect(context, x, y + roadY, TILE_PIXEL_SIZE, 4, '#8a5a19');
        fillRect(context, x, y + roadY + 1, TILE_PIXEL_SIZE, 1, '#d7b172');
        return true;
      }),
      create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
        if (state.getCurrentContext().type !== 'overworld') {
          return null;
        }
        return createRoadGroup(three, state, tileX, tileY);
      },
      resolveFloorKind3D(context) {
        if (context.state.getCurrentContext().type !== 'overworld') {
          return null;
        }
        return (
          resolveDominantNeighborFloorKind3D(context, {
            isExcludedKind(kind) {
              return (
                kind === 'road' ||
                isWaterOrCrossingKind(kind)
              );
            },
          }) ?? 'plains'
        );
      },
    },
    {
      kind: 'bridge',
      definition: {
        name: 'Bridge',
        color: '#92400e',
        miniColor: '#b45309',
        walkable: true,
        wallHeight: 0.1,
      },
      getTraversalProfile3D({
        state,
        tileX,
        tileY,
      }: TraversalProfile3DContext): TraversalProfile3D {
        return createRouteTraversalProfile({
          slideAxis: getBridgeAxis(state, tileX, tileY),
        });
      },
      getSurfaceProfile3D(): SurfaceProfile3D {
        return createBoundarySurfaceProfile({
          surfaceHeight: -0.12,
          boundaryRole: 'crossing',
          underlayKind: 'river',
          boundaryTransition: {
            maxChamferDrop: 0.08,
            minBankHeight: 0,
            bodyInset: 0.08,
          },
        });
      },
      paint2D({ context, x, y, motif, fillRect }: Paint2DContext) {
        fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#2a78c8');
        const offset = motif.int(0, 1);
        for (let plank = 1 + offset; plank < TILE_PIXEL_SIZE; plank += 3) {
          fillRect(context, x + plank, y + 4, 2, 8, '#a86b2d');
        }
        fillRect(context, x, y + 3, TILE_PIXEL_SIZE, 1, '#6b3f15');
        fillRect(context, x, y + 12, TILE_PIXEL_SIZE, 1, '#6b3f15');
        return true;
      },
      create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
        return createBridgeGroup(three, state, tileX, tileY);
      },
    },
    {
      kind: 'dock',
      definition: {
        name: 'Dock',
        color: '#8b5a2b',
        miniColor: '#b97a3d',
        walkable: true,
        wallHeight: 0.08,
      },
      getTraversalProfile3D(): TraversalProfile3D {
        return createRouteTraversalProfile();
      },
      getSurfaceProfile3D(): SurfaceProfile3D {
        return createBoundarySurfaceProfile({
          surfaceHeight: -0.12,
          boundaryRole: 'crossing',
          underlayKind: 'ocean',
          boundaryTransition: {
            maxChamferDrop: 0.08,
            minBankHeight: 0,
            bodyInset: 0.04,
          },
        });
      },
      paint2D({ context, x, y, motif, fillRect }: Paint2DContext) {
        fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#2a78c8');
        for (let plank = 1; plank < TILE_PIXEL_SIZE; plank += 3) {
          fillRect(context, x + plank, y + 3, 2, 10, '#a86b2d');
        }
        const postOffset = motif.int(0, 1);
        fillRect(context, x + 2 + postOffset, y + 2, 1, 12, '#6b3f15');
        fillRect(context, x + 13 - postOffset, y + 2, 1, 12, '#6b3f15');
        return true;
      },
      create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
        return createDockGroup(three, state, tileX, tileY);
      },
    },
  ]);
}

function classifyConnectedRoad({
  x,
  y,
  tile,
  townAnchors,
  bridgeAnchors,
  poiAnchors,
  sampleTerrainSignals,
  signals,
}: ClassifyOverworldTileContext) {
  const baseKind = tile.kind;
  if (baseKind === 'mountain' || isRouteTerminalKind(baseKind)) {
    return null;
  }
  const dockKind = classifyPoiDock({
    x,
    y,
    tile,
    poiAnchors,
    sampleTerrainSignals,
  });
  if (dockKind) {
    return dockKind;
  }
  if (hasConnectedRoutePath({ x, y, townAnchors, bridgeAnchors })) {
    if (isBridgeWaterKind(baseKind)) {
      return canClassifyBridgeWaterTile({
        x,
        y,
        signals,
        sampleTerrainSignals,
      })
        ? 'bridge'
        : null;
    }
    return 'road';
  }

  return null;
}

function classifyNoiseRoad({
  x,
  y,
  tile,
  signals,
  sampleTerrainSignals,
}: ClassifyOverworldTileContext) {
  if (!sampleTerrainSignals) {
    return null;
  }

  const tileKind = tile.kind;
  const roadSignal = signals.roadSignal;

  if (
    tileKind === 'ocean' ||
    tileKind === 'mountain' ||
    isRouteTerminalKind(tileKind)
  ) {
    return null;
  }

  if (roadSignal <= 0.9) {
    return null;
  }

  const hasNoiseRoute = hasLinearRouteSignal(x, y, sampleTerrainSignals);
  if (!hasNoiseRoute) {
    return null;
  }

  if (isBridgeWaterKind(tileKind)) {
    return canClassifyBridgeWaterTile({
      x,
      y,
      signals,
      sampleTerrainSignals,
    })
      ? 'bridge'
      : null;
  }

  return 'road';
}

function classifyPoiDock({
  x,
  y,
  tile,
  poiAnchors,
  sampleTerrainSignals,
}: Pick<
  ClassifyOverworldTileContext,
  'x' | 'y' | 'tile' | 'poiAnchors' | 'sampleTerrainSignals'
>) {
  if (!sampleTerrainSignals) {
    return null;
  }
  if (tile.kind !== 'shore' && tile.kind !== 'ocean') {
    return null;
  }

  const anchors = (poiAnchors ?? []).filter(
    (anchor) =>
      anchor.type === 'lighthouse' ||
      anchor.type === 'town' ||
      anchor.type === 'ship'
  );
  for (const anchor of anchors) {
    for (const direction of [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ]) {
      const landBehind = sampleTerrainSignals(
        anchor.x - direction.dx,
        anchor.y - direction.dy
      ).continent;
      if (landBehind < COASTAL_LAND_CONTINENT_THRESHOLD) {
        continue;
      }

      const segments: Array<{ x: number; y: number }> = [];
      let oceanSeen = false;
      for (let step = 1; step <= MAX_DOCK_LENGTH; step += 1) {
        const segmentX = anchor.x + direction.dx * step;
        const segmentY = anchor.y + direction.dy * step;
        const continent = sampleTerrainSignals(segmentX, segmentY).continent;
        if (continent > 0.46) {
          break;
        }
        if (continent <= OCEAN_CONTINENT_THRESHOLD) {
          oceanSeen = true;
        }
        segments.push({ x: segmentX, y: segmentY });
      }

      if (
        oceanSeen &&
        segments.some((segment) => segment.x === x && segment.y === y)
      ) {
        return 'dock';
      }
    }
  }

  return null;
}

function canClassifyBridgeWaterTile({
  x,
  y,
  signals,
  sampleTerrainSignals,
}: Pick<
  ClassifyOverworldTileContext,
  'x' | 'y' | 'signals' | 'sampleTerrainSignals'
>) {
  if (!sampleTerrainSignals) {
    return false;
  }
  const roadSignal = signals.roadSignal;
  const north = sampleTerrainSignals(x, y - 1).roadSignal;
  const east = sampleTerrainSignals(x + 1, y).roadSignal;
  const south = sampleTerrainSignals(x, y + 1).roadSignal;
  const west = sampleTerrainSignals(x - 1, y).roadSignal;
  const horizontalRidge =
    roadSignal >= north && roadSignal >= south && roadSignal > 0.91;
  const verticalRidge =
    roadSignal >= east && roadSignal >= west && roadSignal > 0.91;
  if (horizontalRidge === verticalRidge) {
    return false;
  }

  const axis: 'ew' | 'ns' = horizontalRidge ? 'ew' : 'ns';
  return !hasParallelLandWithinBridgeSpan(x, y, axis, sampleTerrainSignals);
}

function hasParallelLandWithinBridgeSpan(
  x: number,
  y: number,
  axis: 'ew' | 'ns',
  sampleTerrainSignals: NonNullable<ClassifyOverworldTileContext['sampleTerrainSignals']>
) {
  const along =
    axis === 'ew'
      ? [
          { dx: -2, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 2, dy: 0 },
        ]
      : [
          { dx: 0, dy: -2 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: 2 },
        ];
  const sideOffsets =
    axis === 'ew'
      ? [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -2 },
          { dx: 0, dy: 2 },
        ]
      : [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: -2, dy: 0 },
          { dx: 2, dy: 0 },
        ];

  return sideOffsets.some((side) => {
    let count = 0;
    for (const offset of along) {
      const continent = sampleTerrainSignals(
        x + offset.dx + side.dx,
        y + offset.dy + side.dy
      ).continent;
      if (continent >= COASTAL_LAND_CONTINENT_THRESHOLD) {
        count += 1;
      }
    }
    return count >= 5;
  });
}

function createRoadGroup(
  three: ThreeHostLike,
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const style = getRoadStyle(three, tileX, tileY);
  const connections = getRoadConnections(state, tileX, tileY);
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);

  if (connections.length === 0) {
    group.add(
      createRoadRibbonMesh(
        three,
        [
          new three.Vector3(-0.18, ROAD_SURFACE_HEIGHT, 0),
          new three.Vector3(0, ROAD_SURFACE_HEIGHT, 0),
          new three.Vector3(0.18, ROAD_SURFACE_HEIGHT, 0),
        ],
        0.18,
        style.shoulderMaterial,
        `${tileX}:${tileY}:stub:shoulder`,
        0.04
      )
    );
    group.add(
      createRoadRibbonMesh(
        three,
        [
          new three.Vector3(-0.14, ROAD_CORE_HEIGHT, 0),
          new three.Vector3(0, ROAD_CORE_HEIGHT, 0),
          new three.Vector3(0.14, ROAD_CORE_HEIGHT, 0),
        ],
        0.12,
        style.roadMaterial,
        `${tileX}:${tileY}:stub`,
        0.028
      )
    );
    return group;
  }

  const centerPatch = new three.Mesh(
    new three.CylinderGeometry(0.12, 0.15, 0.02, 8),
    style.shoulderMaterial
  );
  centerPatch.position.y = ROAD_SURFACE_HEIGHT;
  centerPatch.scale.z = 0.85;
  group.add(centerPatch);

  if (connections.length === 2) {
    const curve = createRoadCurve(
      three,
      tileX,
      tileY,
      connections[0],
      connections[1]
    );
    group.add(
      createRoadRibbonMesh(
        three,
        curve,
        style.shoulderWidth,
        style.shoulderMaterial,
        `${tileX}:${tileY}:shoulder`,
        0.045
      )
    );
    group.add(
      createRoadRibbonMesh(
        three,
        curve,
        style.roadWidth,
        style.roadMaterial,
        `${tileX}:${tileY}:road`,
        0.03
      )
    );
    return group;
  }

  connections.forEach((connection: RoadConnection, index: number) => {
    const branch = createRoadBranch(three, tileX, tileY, connection, index);
    group.add(
      createRoadRibbonMesh(
        three,
        branch,
        style.shoulderWidth,
        style.shoulderMaterial,
        `${tileX}:${tileY}:branch:${connection.id}:shoulder`,
        0.04
      )
    );
    group.add(
      createRoadRibbonMesh(
        three,
        branch,
        style.roadWidth,
        style.roadMaterial,
        `${tileX}:${tileY}:branch:${connection.id}`,
        0.026
      )
    );
  });

  return group;
}

function getRoadConnections(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const directions: RoadConnection[] = [
    {
      id: 'north',
      dx: 0,
      dy: -1,
      edgeX: 0,
      edgeZ: -0.5,
      inwardX: 0,
      inwardZ: -0.18,
    },
    {
      id: 'east',
      dx: 1,
      dy: 0,
      edgeX: 0.5,
      edgeZ: 0,
      inwardX: 0.18,
      inwardZ: 0,
    },
    {
      id: 'south',
      dx: 0,
      dy: 1,
      edgeX: 0,
      edgeZ: 0.5,
      inwardX: 0,
      inwardZ: 0.18,
    },
    {
      id: 'west',
      dx: -1,
      dy: 0,
      edgeX: -0.5,
      edgeZ: 0,
      inwardX: -0.18,
      inwardZ: 0,
    },
    {
      id: 'northeast',
      dx: 1,
      dy: -1,
      edgeX: 0.5,
      edgeZ: -0.5,
      inwardX: 0.22,
      inwardZ: -0.22,
    },
    {
      id: 'southeast',
      dx: 1,
      dy: 1,
      edgeX: 0.5,
      edgeZ: 0.5,
      inwardX: 0.22,
      inwardZ: 0.22,
    },
    {
      id: 'southwest',
      dx: -1,
      dy: 1,
      edgeX: -0.5,
      edgeZ: 0.5,
      inwardX: -0.22,
      inwardZ: 0.22,
    },
    {
      id: 'northwest',
      dx: -1,
      dy: -1,
      edgeX: -0.5,
      edgeZ: -0.5,
      inwardX: -0.22,
      inwardZ: -0.22,
    },
  ];

  return directions
    .filter(({ dx, dy }) =>
      isRoadNetworkKind(state.getCurrentTile(tileX + dx, tileY + dy).kind)
    )
    .sort(
      (left, right) =>
        Math.atan2(left.edgeZ, left.edgeX) -
        Math.atan2(right.edgeZ, right.edgeX)
    );
}

function isRoadNetworkKind(kind: Kind): boolean {
  return (
    kind === 'road' ||
    kind === 'bridge' ||
    kind === 'dock' ||
    isRouteTerminalKind(kind)
  );
}

function createRoadCurve(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  start: RoadConnection,
  end: RoadConnection
) {
  const startPoint = new three.Vector3(
    start.edgeX,
    ROAD_CORE_HEIGHT,
    start.edgeZ
  );
  const endPoint = new three.Vector3(end.edgeX, ROAD_CORE_HEIGHT, end.edgeZ);
  const jitter = (hash2D('road-curve-jitter', tileX, tileY) - 0.5) * 0.12;
  const opposite = start.dx === -end.dx && start.dy === -end.dy;
  const control = opposite
    ? new three.Vector3(
        start.dy !== 0 ? jitter : 0,
        ROAD_SURFACE_HEIGHT,
        start.dx !== 0 ? jitter : 0
      )
    : new three.Vector3(
        (start.inwardX + end.inwardX) * 0.55,
        ROAD_SURFACE_HEIGHT,
        (start.inwardZ + end.inwardZ) * 0.55
      );

  return sampleQuadraticCurve(three, startPoint, control, endPoint, 9);
}

function createRoadBranch(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  connection: RoadConnection,
  index: number
) {
  const start = new three.Vector3(0, ROAD_CORE_HEIGHT, 0);
  const end = new three.Vector3(
    connection.edgeX,
    ROAD_CORE_HEIGHT,
    connection.edgeZ
  );
  const bend =
    (hash2D('road-branch-bend', tileX * 11 + index, tileY * 13) - 0.5) * 0.1;
  const control = new three.Vector3(
    connection.inwardX + (connection.dy !== 0 ? bend : 0),
    ROAD_SURFACE_HEIGHT,
    connection.inwardZ + (connection.dx !== 0 ? bend : 0)
  );
  return sampleQuadraticCurve(three, start, control, end, 7);
}

function sampleQuadraticCurve(
  three: ThreeHostLike,
  start: RoadVectorLike,
  control: RoadVectorLike,
  end: RoadVectorLike,
  segments: number
) {
  return createQuadraticBezierPoints(three, start, control, end, segments);
}

function createRoadRibbonMesh(
  three: ThreeHostLike,
  points: RoadVectorLike[],
  width: number,
  material: ThreeMaterialLike,
  seedKey: string,
  lipDepth: number
) {
  return createRibbonMesh(three, points, width, material, {
    widthNoise(index, total) {
      return (
        1 + (hash2D(`road-width:${seedKey}`, index, total) - 0.5) * lipDepth
      );
    },
  });
}

function getRoadStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number
): RoadStyle {
  return resolveRoadStyle(three, tileX, tileY);
}

function createRoadTexture(
  three: ThreeHostLike,
  baseColor: string,
  accentColor: string,
  styleType: RoadStyleType,
  regionX: number,
  regionY: number
) {
  return createPaintedCanvasTexture(three, {
    width: 64,
    height: 64,
    repeatX: 1.2,
    repeatY: 1.2,
    paint(context, canvas) {
      context.fillStyle = baseColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (styleType === 'brick') {
        for (let row = 0; row < canvas.height; row += 10) {
          const shift = ((row / 10) % 2) * 8;
          context.fillStyle = accentColor;
          context.fillRect(0, row, canvas.width, 2);
          for (
            let column = -8 + shift;
            column < canvas.width + 8;
            column += 16
          ) {
            context.fillRect(column, row, 2, 10);
          }
        }
      } else if (styleType === 'cobble') {
        for (let index = 0; index < 42; index += 1) {
          const x = Math.floor(
            hash2D('road-cobble-x', regionX * 37 + index, regionY) *
              canvas.width
          );
          const y = Math.floor(
            hash2D('road-cobble-y', regionY * 41 + index, regionX) *
              canvas.height
          );
          const width =
            5 + Math.floor(hash2D('road-cobble-w', index, regionX) * 4);
          const height =
            3 + Math.floor(hash2D('road-cobble-h', index, regionY) * 3);
          context.fillStyle =
            index % 2 === 0 ? accentColor : 'rgba(255,255,255,0.14)';
          context.fillRect(x, y, width, height);
        }
      } else {
        for (let row = 0; row < canvas.height; row += 7) {
          const shade = 80 + ((row * 9 + regionX * 7) % 36);
          context.fillStyle = `rgba(${shade}, ${Math.max(35, shade - 20)}, ${Math.max(20, shade - 34)}, 0.28)`;
          context.fillRect(0, row, canvas.width, 2);
        }
        for (let index = 0; index < 80; index += 1) {
          const x = Math.floor(
            hash2D('road-track-x', regionX, index + regionY) * canvas.width
          );
          const y = Math.floor(
            hash2D('road-track-y', regionY, index + regionX) * canvas.height
          );
          context.fillStyle = 'rgba(50,30,18,0.16)';
          context.fillRect(x, y, 2, 1);
        }
      }
    },
  });
}

function createRoadShoulderTexture(
  three: ThreeHostLike,
  baseColor: string,
  accentColor: string,
  regionX: number,
  regionY: number
) {
  return createPaintedCanvasTexture(three, {
    width: 64,
    height: 64,
    repeatX: 1.2,
    repeatY: 1.2,
    paint(context, canvas) {
      context.fillStyle = baseColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (let index = 0; index < 140; index += 1) {
        const x = Math.floor(
          hash2D('road-shoulder-x', regionX * 31 + index, regionY) *
            canvas.width
        );
        const y = Math.floor(
          hash2D('road-shoulder-y', regionY * 29 + index, regionX) *
            canvas.height
        );
        const size =
          1 +
          Math.floor(hash2D('road-shoulder-s', index, regionX + regionY) * 3);
        context.fillStyle =
          index % 3 === 0 ? accentColor : 'rgba(255,255,255,0.12)';
        context.fillRect(x, y, size, size);
      }
    },
  });
}

function createBridgeGroup(
  three: ThreeHostLike,
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const info = getBridgeClusterInfo(state, tileX, tileY);
  const style = getBridgeStyle(
    three,
    info.clusterKey,
    info.anchorX,
    info.anchorY
  );
  const axis = info.axis;
  const alongX = axis === 'ew';
  const deckLength =
    TILE_SIZE +
    (info.connectNegative ? 0.08 : 0) +
    (info.connectPositive ? 0.08 : 0);
  const deckWidth = 0.72 + style.widthJitter;
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);

  const deck = new three.Mesh(
    new three.BoxGeometry(
      alongX ? deckLength : deckWidth,
      BRIDGE_DECK_THICKNESS,
      alongX ? deckWidth : deckLength
    ),
    style.deckMaterial
  );
  deck.position.y = -BRIDGE_DECK_THICKNESS * 0.5;
  group.add(deck);

  if (style.type === 'stone') {
    addBridgeParapets(three, group, style, alongX, deckLength, deckWidth);
  } else {
    addBridgeRailings(three, group, style, alongX, deckLength, deckWidth, info);
  }

  if (style.covered) {
    addBridgeCover(three, group, style, alongX, deckLength, deckWidth, info);
  }

  if (style.drawbridge) {
    addDrawbridgeDetails(three, group, style, alongX, deckWidth);
  }

  if (info.length > 1 && style.pillarSpacing > 0) {
    addBridgePillars(three, group, style, alongX, info, deckWidth);
  }

  return group;
}

function createDockGroup(
  three: ThreeHostLike,
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const info = getDockClusterInfo(state, tileX, tileY);
  const style = getDockStyle(three, info.clusterKey, info.anchorX, info.anchorY);
  const alongX = info.axis === 'ew';
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);

  const deck = new three.Mesh(
    new three.BoxGeometry(alongX ? 1.02 : 0.64, 0.07, alongX ? 0.64 : 1.02),
    style.deckMaterial
  );
  deck.position.y = -0.035;
  group.add(deck);

  for (const side of [-1, 1]) {
    const rail = new three.Mesh(
      new three.BoxGeometry(alongX ? 1.04 : 0.04, 0.04, alongX ? 0.04 : 1.04),
      style.railMaterial
    );
    if (alongX) {
      rail.position.set(0, 0.08, side * 0.24);
    } else {
      rail.position.set(side * 0.24, 0.08, 0);
    }
    group.add(rail);
  }

  for (const [xOffset, zOffset] of alongX
    ? [
        [-0.36, -0.22],
        [0.36, -0.22],
        [-0.36, 0.22],
        [0.36, 0.22],
      ]
    : [
        [-0.22, -0.36],
        [-0.22, 0.36],
        [0.22, -0.36],
        [0.22, 0.36],
      ]) {
    const pile = new three.Mesh(
      new three.BoxGeometry(0.06, 0.2, 0.06),
      style.pileMaterial
    );
    pile.position.set(xOffset, -0.03, zOffset);
    group.add(pile);
  }

  if (shouldRenderDockBoat(state, tileX, tileY, info)) {
    const boat = createDockBoat(three, state, style, alongX, tileX, tileY, info);
    if (boat) {
      group.add(boat);
    }
  }

  return group;
}

function getBridgeAxis(
  state: WorldStateLike,
  tileX: number,
  tileY: number
): BridgeClusterInfo['axis'] | null {
  const west = isBridgeTravelKind(state.getCurrentTile(tileX - 1, tileY).kind);
  const east = isBridgeTravelKind(state.getCurrentTile(tileX + 1, tileY).kind);
  const north = isBridgeTravelKind(state.getCurrentTile(tileX, tileY - 1).kind);
  const south = isBridgeTravelKind(state.getCurrentTile(tileX, tileY + 1).kind);

  if ((west || east) && !(north || south)) {
    return 'ew';
  }
  if ((north || south) && !(west || east)) {
    return 'ns';
  }
  return null;
}

function isBridgeTravelKind(kind: Kind): boolean {
  return (
    kind === 'bridge' ||
    kind === 'dock' ||
    kind === 'road' ||
    isRouteTerminalKind(kind)
  );
}

function getDockAxis(
  state: WorldStateLike,
  tileX: number,
  tileY: number
): 'ew' | 'ns' | null {
  const west = isDockTravelKind(state.getCurrentTile(tileX - 1, tileY).kind);
  const east = isDockTravelKind(state.getCurrentTile(tileX + 1, tileY).kind);
  const north = isDockTravelKind(state.getCurrentTile(tileX, tileY - 1).kind);
  const south = isDockTravelKind(state.getCurrentTile(tileX, tileY + 1).kind);

  if ((west || east) && !(north || south)) {
    return 'ew';
  }
  if ((north || south) && !(west || east)) {
    return 'ns';
  }
  return null;
}

function isDockTravelKind(kind: Kind): boolean {
  return kind === 'dock' || kind === 'road' || isRouteTerminalKind(kind);
}

function getDockClusterInfo(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const key = `${tileX}:${tileY}`;
  if (dockClusterCache.has(key)) {
    return dockClusterCache.get(key)!;
  }

  const queue = [[tileX, tileY]];
  const visited = new Set([key]);
  const tiles: Array<{ x: number; y: number }> = [];

  while (queue.length > 0) {
    const [currentX, currentY] = queue.shift()!;
    tiles.push({ x: currentX, y: currentY });
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nextX = currentX + dx;
      const nextY = currentY + dy;
      const nextKey = `${nextX}:${nextY}`;
      if (visited.has(nextKey)) continue;
      if (state.getCurrentTile(nextX, nextY).kind !== 'dock') continue;
      visited.add(nextKey);
      queue.push([nextX, nextY]);
    }
  }

  tiles.sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y
  );
  const bounds = tiles.reduce(
    (acc, tile) => ({
      minX: Math.min(acc.minX, tile.x),
      maxX: Math.max(acc.maxX, tile.x),
      minY: Math.min(acc.minY, tile.y),
      maxY: Math.max(acc.maxY, tile.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );
  const spanX = bounds.maxX - bounds.minX + 1;
  const spanY = bounds.maxY - bounds.minY + 1;
  const axis = spanX >= spanY ? 'ew' : 'ns';
  const orderedTiles = [...tiles].sort((left, right) =>
    axis === 'ew'
      ? left.x - right.x || left.y - right.y
      : left.y - right.y || left.x - right.x
  );
  const anchor = orderedTiles[0];
  const clusterKey = `dock:${axis}:${anchor.x}:${anchor.y}`;

  for (let index = 0; index < orderedTiles.length; index += 1) {
    const tile = orderedTiles[index];
    const negativeKey =
      axis === 'ew' ? `${tile.x - 1}:${tile.y}` : `${tile.x}:${tile.y - 1}`;
    const positiveKey =
      axis === 'ew' ? `${tile.x + 1}:${tile.y}` : `${tile.x}:${tile.y + 1}`;
    dockClusterCache.set(`${tile.x}:${tile.y}`, {
      axis,
      clusterKey,
      anchorX: anchor.x,
      anchorY: anchor.y,
      length: orderedTiles.length,
      segmentIndex: index,
      connectNegative: visited.has(negativeKey),
      connectPositive: visited.has(positiveKey),
    });
  }

  return dockClusterCache.get(key)!;
}

function getDockStyle(
  three: ThreeHostLike,
  clusterKey: string,
  tileX: number,
  tileY: number
) {
  if (!dockStyleCache.has(clusterKey)) {
    const regionX = Math.floor(tileX / DOCK_REGION_SIZE);
    const regionY = Math.floor(tileY / DOCK_REGION_SIZE);
    const palette =
      hash2D('dock-palette', regionX, regionY) > 0.55
        ? {
            deck: '#8f6033',
            rail: '#6e4522',
            pile: '#543114',
            boat: '#6f4431',
            sail: '#d9ccb1',
            trim: '#d6b27e',
          }
        : {
            deck: '#7f5330',
            rail: '#603a1d',
            pile: '#492a13',
            boat: '#7c4e2e',
            sail: '#cbb89d',
            trim: '#d4a86f',
          };
    dockStyleCache.set(clusterKey, {
      deckMaterial: new three.MeshStandardMaterial({
        color: palette.deck,
        roughness: 0.92,
        metalness: 0.02,
      }),
      railMaterial: new three.MeshStandardMaterial({
        color: palette.rail,
        roughness: 0.88,
        metalness: 0.02,
      }),
      pileMaterial: new three.MeshStandardMaterial({
        color: palette.pile,
        roughness: 0.94,
        metalness: 0.02,
      }),
      boatMaterial: new three.MeshStandardMaterial({
        color: palette.boat,
        roughness: 0.84,
        metalness: 0.03,
      }),
      sailMaterial: new three.MeshStandardMaterial({
        color: palette.sail,
        roughness: 0.96,
        metalness: 0.01,
      }),
      trimMaterial: new three.MeshStandardMaterial({
        color: palette.trim,
        roughness: 0.85,
        metalness: 0.02,
      }),
    });
  }

  return dockStyleCache.get(clusterKey)!;
}

function shouldRenderDockBoat(
  state: WorldStateLike,
  tileX: number,
  tileY: number,
  info: DockClusterInfo
) {
  if (info.length < 2) {
    return false;
  }
  if (info.length < LONG_DOCK_BOAT_LENGTH) {
    return info.segmentIndex === info.length - 1;
  }
  if (info.segmentIndex === 0) {
    return false;
  }

  const targetSegmentCount = Math.min(2, info.length - 1);
  const remainingSegments = info.length - 1;
  const eligibleSegments = new Set<number>();
  for (let index = 1; index <= targetSegmentCount; index += 1) {
    eligibleSegments.add(
      Math.min(
        info.length - 1,
        Math.max(1, Math.round((remainingSegments * index) / targetSegmentCount))
      )
    );
  }

  if (!eligibleSegments.has(info.segmentIndex)) {
    return false;
  }

  return getDockBoatSide(state, tileX, tileY, info.axis) !== null;
}

function getDockBoatSide(
  state: WorldStateLike,
  tileX: number,
  tileY: number,
  axis: DockClusterInfo['axis']
) {
  const sideOffsets =
    axis === 'ew'
      ? [
          { dx: 0, dy: -1, side: -1 as const },
          { dx: 0, dy: 1, side: 1 as const },
        ]
      : [
          { dx: -1, dy: 0, side: -1 as const },
          { dx: 1, dy: 0, side: 1 as const },
        ];
  const waterSides = sideOffsets.filter(({ dx, dy }) =>
    isWaterOrCrossingKind(state.getCurrentTile(tileX + dx, tileY + dy).kind)
  );

  if (waterSides.length === 0) {
    return null;
  }
  if (waterSides.length === 1) {
    return waterSides[0]!.side;
  }

  return hash2D('dock-boat-side', tileX, tileY) > 0.5
    ? waterSides[0]!.side
    : waterSides[1]!.side;
}

function createDockBoat(
  three: ThreeHostLike,
  state: WorldStateLike,
  style: DockStyle,
  alongX: boolean,
  tileX: number,
  tileY: number,
  info: DockClusterInfo
) {
  const side = getDockBoatSide(state, tileX, tileY, info.axis);
  if (side === null) {
    return null;
  }

  const group = new three.Group();
  group.userData = {
    dockBoat: true,
    dockBoatClusterLength: info.length,
  };
  const hullLength = 0.42 + hash2D('dock-boat-length', tileX, tileY) * 0.12;
  const hullWidth = 0.18 + hash2D('dock-boat-width', tileX, tileY) * 0.04;
  const hull = new three.Mesh(
    new three.BoxGeometry(alongX ? hullLength : hullWidth, 0.09, alongX ? hullWidth : hullLength),
    style.boatMaterial
  );
  hull.position.y = -0.07;
  group.add(hull);

  const prow = new three.Mesh(
    new three.BoxGeometry(alongX ? 0.08 : hullWidth * 0.72, 0.1, alongX ? hullWidth * 0.72 : 0.08),
    style.trimMaterial
  );
  if (alongX) {
    prow.position.set(side > 0 ? 0.16 : -0.16, -0.045, 0);
  } else {
    prow.position.set(0, -0.045, side > 0 ? 0.16 : -0.16);
  }
  group.add(prow);

  if (hash2D('dock-boat-sail', tileX, tileY) > 0.48) {
    const mast = new three.Mesh(
      new three.BoxGeometry(0.03, 0.34, 0.03),
      style.trimMaterial
    );
    mast.position.y = 0.12;
    group.add(mast);

    const sail = new three.Mesh(
      new three.BoxGeometry(alongX ? 0.02 : 0.16, 0.18, alongX ? 0.16 : 0.02),
      style.sailMaterial
    );
    if (alongX) {
      sail.position.set(0.03 * side, 0.14, 0);
    } else {
      sail.position.set(0, 0.14, 0.03 * side);
    }
    group.add(sail);
  }

  if (alongX) {
    group.position.set(0, 0, side * 0.47);
    group.rotation.y = Math.PI * 0.5;
  } else {
    group.position.set(side * 0.47, 0, 0);
  }
  if (side < 0) {
    group.rotation.y += Math.PI;
  }
  return group;
}

function addBridgeParapets(
  three: ThreeHostLike,
  group: BridgeGroupLike,
  style: BridgeStyle,
  alongX: boolean,
  deckLength: number,
  deckWidth: number
) {
  const railThickness = 0.08;
  const sideOffset = deckWidth * 0.5 - railThickness * 0.35;
  const length = deckLength + 0.02;
  const createWall = () =>
    new three.Mesh(
      new three.BoxGeometry(
        alongX ? length : railThickness,
        BRIDGE_RAIL_HEIGHT,
        alongX ? railThickness : length
      ),
      style.railMaterial
    );

  const first = createWall();
  const second = createWall();
  if (alongX) {
    first.position.set(0, BRIDGE_RAIL_HEIGHT * 0.5, -sideOffset);
    second.position.set(0, BRIDGE_RAIL_HEIGHT * 0.5, sideOffset);
  } else {
    first.position.set(-sideOffset, BRIDGE_RAIL_HEIGHT * 0.5, 0);
    second.position.set(sideOffset, BRIDGE_RAIL_HEIGHT * 0.5, 0);
  }
  group.add(first);
  group.add(second);
}

function addBridgeRailings(
  three: ThreeHostLike,
  group: BridgeGroupLike,
  style: BridgeStyle,
  alongX: boolean,
  deckLength: number,
  deckWidth: number,
  info: BridgeClusterInfo
) {
  const sideOffset = deckWidth * 0.5 - 0.05;
  const postCount = Math.max(2, Math.round(deckLength / 0.32));
  for (let side = -1; side <= 1; side += 2) {
    const rail = new three.Mesh(
      new three.BoxGeometry(
        alongX ? deckLength + 0.02 : 0.05,
        0.05,
        alongX ? 0.05 : deckLength + 0.02
      ),
      style.railMaterial
    );
    if (alongX) {
      rail.position.set(0, BRIDGE_RAIL_HEIGHT, side * sideOffset);
    } else {
      rail.position.set(side * sideOffset, BRIDGE_RAIL_HEIGHT, 0);
    }
    group.add(rail);

    for (let index = 0; index < postCount; index += 1) {
      const t = postCount === 1 ? 0.5 : index / (postCount - 1);
      const local = -deckLength * 0.5 + t * deckLength;
      const post = new three.Mesh(
        new three.BoxGeometry(0.05, BRIDGE_RAIL_HEIGHT, 0.05),
        style.postMaterial
      );
      if (alongX) {
        post.position.set(local, BRIDGE_RAIL_HEIGHT * 0.5, side * sideOffset);
      } else {
        post.position.set(side * sideOffset, BRIDGE_RAIL_HEIGHT * 0.5, local);
      }
      group.add(post);
    }
  }

  if (style.type === 'metal' && info.length > 1) {
    const truss = new three.Mesh(
      new three.BoxGeometry(
        alongX ? deckLength * 0.86 : 0.04,
        0.04,
        alongX ? 0.04 : deckLength * 0.86
      ),
      style.trimMaterial
    );
    if (alongX) {
      truss.position.set(0, BRIDGE_RAIL_HEIGHT * 0.64, 0);
      truss.rotation.z = 0.16;
    } else {
      truss.position.set(0, BRIDGE_RAIL_HEIGHT * 0.64, 0);
      truss.rotation.x = -0.16;
    }
    group.add(truss);
  }
}

function addBridgeCover(
  three: ThreeHostLike,
  group: BridgeGroupLike,
  style: BridgeStyle,
  alongX: boolean,
  deckLength: number,
  deckWidth: number,
  info: BridgeClusterInfo
) {
  const postHeight = 0.38 + style.coverHeight;
  const coverY = postHeight + 0.08;
  const postOffset = deckWidth * 0.5 - 0.08;
  const spanCount = Math.max(2, Math.round(deckLength / 0.5));
  for (let index = 0; index < spanCount; index += 1) {
    const t = spanCount === 1 ? 0.5 : index / (spanCount - 1);
    const local = -deckLength * 0.5 + t * deckLength;
    for (let side = -1; side <= 1; side += 2) {
      const post = new three.Mesh(
        new three.BoxGeometry(0.05, postHeight, 0.05),
        style.postMaterial
      );
      if (alongX) {
        post.position.set(local, postHeight * 0.5, side * postOffset);
      } else {
        post.position.set(side * postOffset, postHeight * 0.5, local);
      }
      group.add(post);
    }
  }

  const roof = new three.Mesh(
    new three.BoxGeometry(
      alongX ? deckLength + 0.12 : deckWidth + 0.22,
      0.1,
      alongX ? deckWidth + 0.22 : deckLength + 0.12
    ),
    style.coverMaterial
  );
  roof.position.y = coverY;
  roof.rotation.y = alongX ? 0 : Math.PI * 0.5;
  group.add(roof);

  if (style.type !== 'stone' && info.length > 1) {
    const ridge = new three.Mesh(
      new three.BoxGeometry(
        alongX ? deckLength + 0.08 : 0.06,
        0.08,
        alongX ? 0.06 : deckLength + 0.08
      ),
      style.trimMaterial
    );
    ridge.position.y = coverY + 0.08;
    group.add(ridge);
  }
}

function addDrawbridgeDetails(
  three: ThreeHostLike,
  group: BridgeGroupLike,
  style: BridgeStyle,
  alongX: boolean,
  deckWidth: number
) {
  const towerOffset = 0.24;
  for (let side = -1; side <= 1; side += 2) {
    const frame = new three.Mesh(
      new three.BoxGeometry(0.09, 0.42, 0.09),
      style.postMaterial
    );
    if (alongX) {
      frame.position.set(side * towerOffset, 0.21, 0);
    } else {
      frame.position.set(0, 0.21, side * towerOffset);
    }
    group.add(frame);
  }

  const spindle = new three.Mesh(
    new three.CylinderGeometry(0.025, 0.025, deckWidth * 0.72, 6),
    style.trimMaterial
  );
  spindle.rotation.z = Math.PI * 0.5;
  spindle.position.y = 0.4;
  if (!alongX) {
    spindle.rotation.x = Math.PI * 0.5;
    spindle.rotation.z = 0;
  }
  group.add(spindle);
}

function addBridgePillars(
  three: ThreeHostLike,
  group: BridgeGroupLike,
  style: BridgeStyle,
  alongX: boolean,
  info: BridgeClusterInfo,
  deckWidth: number
) {
  const shouldPlace =
    info.segmentIndex > 0 &&
    info.segmentIndex < info.length - 1 &&
    info.segmentIndex % style.pillarSpacing === 0;
  if (!shouldPlace) {
    return;
  }

  const pillarHeight = BRIDGE_DECK_THICKNESS + 0.12;
  const pillar = new three.Mesh(
    new three.BoxGeometry(
      style.pillarWidth,
      pillarHeight,
      Math.max(0.14, deckWidth * 0.3)
    ),
    style.pillarMaterial
  );
  pillar.position.y = -0.12 + pillarHeight * 0.5;
  pillar.rotation.y = alongX ? 0 : Math.PI * 0.5;
  group.add(pillar);
}

function getBridgeClusterInfo(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const key = `${tileX}:${tileY}`;
  if (bridgeClusterCache.has(key)) {
    return bridgeClusterCache.get(key);
  }

  const queue = [[tileX, tileY]];
  const visited = new Set([key]);
  const tiles: { x: number; y: number }[] = [];

  while (queue.length > 0) {
    const [currentX, currentY] = queue.shift()!;
    tiles.push({ x: currentX, y: currentY });
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nextX = currentX + dx;
      const nextY = currentY + dy;
      const nextKey = `${nextX}:${nextY}`;
      if (visited.has(nextKey)) continue;
      if (state.getCurrentTile(nextX, nextY).kind !== 'bridge') continue;
      visited.add(nextKey);
      queue.push([nextX, nextY]);
    }
  }

  tiles.sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y
  );
  const bounds = tiles.reduce(
    (acc, tile) => ({
      minX: Math.min(acc.minX, tile.x),
      maxX: Math.max(acc.maxX, tile.x),
      minY: Math.min(acc.minY, tile.y),
      maxY: Math.max(acc.maxY, tile.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );
  const spanX = bounds.maxX - bounds.minX + 1;
  const spanY = bounds.maxY - bounds.minY + 1;
  const axis = spanX >= spanY ? 'ew' : 'ns';
  const orderedTiles = [...tiles].sort((left, right) =>
    axis === 'ew'
      ? left.x - right.x || left.y - right.y
      : left.y - right.y || left.x - right.x
  );
  const anchor = orderedTiles[0];
  const clusterKey = `${axis}:${anchor.x}:${anchor.y}`;

  for (let index = 0; index < orderedTiles.length; index += 1) {
    const tile = orderedTiles[index];
    const negativeKey =
      axis === 'ew' ? `${tile.x - 1}:${tile.y}` : `${tile.x}:${tile.y - 1}`;
    const positiveKey =
      axis === 'ew' ? `${tile.x + 1}:${tile.y}` : `${tile.x}:${tile.y + 1}`;
    bridgeClusterCache.set(`${tile.x}:${tile.y}`, {
      axis,
      clusterKey,
      anchorX: anchor.x,
      anchorY: anchor.y,
      length: orderedTiles.length,
      segmentIndex: index,
      connectNegative: visited.has(negativeKey),
      connectPositive: visited.has(positiveKey),
    });
  }

  return bridgeClusterCache.get(key);
}

function getBridgeStyle(
  three: ThreeHostLike,
  clusterKey: string,
  tileX: number,
  tileY: number
) {
  if (!bridgeStyleCache.has(clusterKey)) {
    const regionX = Math.floor(tileX / BRIDGE_REGION_SIZE);
    const regionY = Math.floor(tileY / BRIDGE_REGION_SIZE);
    const typeIndex = Math.floor(hash2D('bridge-type', tileX, tileY) * 4);
    const type = ['wood', 'stone', 'metal', 'drawbridge'][typeIndex] as
      'wood' | 'stone' | 'metal' | 'drawbridge';
    const covered = hash2D('bridge-covered', regionX, regionY) > 0.72;
    const drawbridge = type === 'drawbridge';
    const pillarSpacing =
      2 + Math.floor(hash2D('bridge-pillar', tileX, tileY) * 3);
    const palette =
      type === 'stone'
        ? { deck: '#c9c2b8', rail: '#8b857d', trim: '#6d655d' }
        : type === 'metal'
          ? { deck: '#9b6b3d', rail: '#8e9aa7', trim: '#4b5563' }
          : { deck: '#8b5a2b', rail: '#6f4a28', trim: '#4a2f1b' };
    const deckTexture = createBridgeTexture(
      three,
      palette.deck,
      palette.trim,
      type,
      'deck',
      tileX,
      tileY
    );
    const railTexture = createBridgeTexture(
      three,
      palette.rail,
      palette.trim,
      type,
      'rail',
      tileX,
      tileY
    );
    const coverTexture = createBridgeTexture(
      three,
      palette.deck,
      palette.trim,
      type === 'stone' ? 'roof-stone' : 'roof',
      'cover',
      tileX,
      tileY
    );
    bridgeStyleCache.set(clusterKey, {
      type,
      covered: covered && !drawbridge,
      drawbridge,
      widthJitter: hash2D('bridge-width', tileX, tileY) * 0.12,
      coverHeight: hash2D('bridge-cover-height', tileX, tileY) * 0.16,
      pillarSpacing,
      pillarWidth: 0.14 + hash2D('bridge-pillar-width', tileX, tileY) * 0.09,
      deckMaterial: new three.MeshStandardMaterial({
        color: '#ffffff',
        map: deckTexture,
        roughness: 0.9,
        metalness: type === 'metal' ? 0.28 : 0.04,
      }),
      railMaterial: new three.MeshStandardMaterial({
        color: '#ffffff',
        map: railTexture,
        roughness: 0.86,
        metalness: type === 'metal' ? 0.36 : 0.05,
      }),
      postMaterial: new three.MeshStandardMaterial({
        color: palette.trim,
        roughness: 0.88,
        metalness: type === 'metal' ? 0.22 : 0.03,
      }),
      trimMaterial: new three.MeshStandardMaterial({
        color: palette.trim,
        roughness: 0.82,
        metalness: type === 'metal' ? 0.34 : 0.04,
      }),
      coverMaterial: new three.MeshStandardMaterial({
        color: '#ffffff',
        map: coverTexture,
        roughness: 0.9,
        metalness: 0.03,
      }),
      pillarMaterial: new three.MeshStandardMaterial({
        color: '#ffffff',
        map: railTexture,
        roughness: 0.92,
        metalness: type === 'metal' ? 0.18 : 0.02,
      }),
    });
  }

  return bridgeStyleCache.get(clusterKey);
}

function createBridgeTexture(
  three: ThreeHostLike,
  baseColor: string,
  accentColor: string,
  type: BridgeTextureType,
  layer: BridgeTextureLayer,
  tileX: number,
  tileY: number
) {
  return createPaintedCanvasTexture(three, {
    width: 64,
    height: 64,
    repeatX: 1,
    repeatY: 1,
    paint(context, canvas) {
      context.fillStyle = baseColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (type === 'stone' || type === 'roof-stone') {
        for (let row = 0; row < canvas.height; row += 12) {
          context.fillStyle = accentColor;
          context.fillRect(0, row, canvas.width, 2);
        }
        for (let column = 0; column < canvas.width; column += 16) {
          for (let row = 0; row < canvas.height; row += 12) {
            const offset =
              ((row / 12 + column / 16) % 2) * 8 + (layer === 'cover' ? 2 : 0);
            context.fillRect(column + offset, row, 2, 12);
          }
        }
      } else if (type === 'metal') {
        for (let row = 0; row < canvas.height; row += 8) {
          context.fillStyle =
            row % 16 === 0 ? accentColor : 'rgba(255,255,255,0.16)';
          context.fillRect(0, row, canvas.width, 2);
        }
        for (let index = 0; index < 24; index += 1) {
          const x = Math.floor(
            hash2D('bridge-rivet-x', tileX, index + tileY) * canvas.width
          );
          const y = Math.floor(
            hash2D('bridge-rivet-y', tileY, index + tileX) * canvas.height
          );
          context.fillStyle = 'rgba(255,255,255,0.34)';
          context.fillRect(x, y, 2, 2);
        }
      } else {
        for (let column = 0; column < canvas.width; column += 7) {
          const shade = 70 + ((column * 5 + tileX * 3) % 36);
          context.fillStyle = `rgba(${shade}, ${Math.max(30, shade - 16)}, ${Math.max(18, shade - 28)}, 0.32)`;
          context.fillRect(column, 0, 3, canvas.height);
        }
        for (let row = 0; row < canvas.height; row += 10) {
          context.fillStyle = 'rgba(255,255,255,0.08)';
          context.fillRect(0, row, canvas.width, 1);
        }
      }
    },
  });
}

type RoadVectorLike = PathPointLike;

type BridgeGroupLike = {
  add(child: unknown): void;
};

interface RoadConnection {
  id:
    | 'north'
    | 'east'
    | 'south'
    | 'west'
    | 'northeast'
    | 'southeast'
    | 'southwest'
    | 'northwest';
  dx: number;
  dy: number;
  edgeX: number;
  edgeZ: number;
  inwardX: number;
  inwardZ: number;
}

interface RoadStyle {
  roadWidth: number;
  shoulderWidth: number;
  roadMaterial: ThreeMaterialLike;
  shoulderMaterial: ThreeMaterialLike;
}

interface RoadStyleBlueprint {
  createMaterials(three: ThreeHostLike): RoadStyle;
}

interface BridgeClusterInfo {
  axis: 'ew' | 'ns';
  clusterKey: string;
  anchorX: number;
  anchorY: number;
  length: number;
  segmentIndex: number;
  connectNegative: boolean;
  connectPositive: boolean;
}

interface BridgeStyle {
  type: 'wood' | 'stone' | 'metal' | 'drawbridge';
  covered: boolean;
  drawbridge: boolean;
  widthJitter: number;
  coverHeight: number;
  pillarSpacing: number;
  pillarWidth: number;
  deckMaterial: ThreeMaterialLike;
  railMaterial: ThreeMaterialLike;
  postMaterial: ThreeMaterialLike;
  trimMaterial: ThreeMaterialLike;
  coverMaterial: ThreeMaterialLike;
  pillarMaterial: ThreeMaterialLike;
}

interface DockClusterInfo {
  axis: 'ew' | 'ns';
  clusterKey: string;
  anchorX: number;
  anchorY: number;
  length: number;
  segmentIndex: number;
  connectNegative: boolean;
  connectPositive: boolean;
}

interface DockStyle {
  deckMaterial: ThreeMaterialLike;
  railMaterial: ThreeMaterialLike;
  pileMaterial: ThreeMaterialLike;
  boatMaterial: ThreeMaterialLike;
  sailMaterial: ThreeMaterialLike;
  trimMaterial: ThreeMaterialLike;
}
