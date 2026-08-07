import { clamp, hash2D } from '@bworlds/core';
import { paintPlainsBackdrop } from '@bworlds/paint-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import {
  createRegionKey,
  getOrCreateRegionalValue,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import { createRouteTraversalProfile } from '@bworlds/tile-support';
import { createCanvasTexture } from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  Paint2DContext,
  SurfaceProfile3D,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeTextureLike,
  TraversalProfile3DContext,
  TraversalProfile3D,
  WorldStateLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const TILE_SIZE = 1;
const BRIDGE_REGION_SIZE = 22;
const ROAD_REGION_SIZE = 20;
const BRIDGE_DECK_THICKNESS = 0.08;
const BRIDGE_RAIL_HEIGHT = 0.18;
const ROAD_SURFACE_HEIGHT = 0.012;
const ROAD_CORE_HEIGHT = 0.02;

const bridgeStyleCache = new Map<string, BridgeStyle>();
const bridgeClusterCache = new Map<string, BridgeClusterInfo>();
const roadStyleCache = new Map<string, RoadStyle>();

export function createRouteTilePlugin() {
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
                : 'A road runs between nearby landmarks.'),
          };
        }

        const noiseRoadKind = classifyNoiseRoad(context);
        if (!noiseRoadKind) {
          return null;
        }

        return { kind: noiseRoadKind };
      },
      paint2D({ context, x, y, motif, fillRect }: Paint2DContext) {
        paintPlainsBackdrop({ context, x, y, motif, fillRect });
        const roadY = 5 + motif.int(0, 2);
        fillRect(context, x, y + roadY, TILE_PIXEL_SIZE, 4, '#8a5a19');
        fillRect(context, x, y + roadY + 1, TILE_PIXEL_SIZE, 1, '#d7b172');
        return true;
      },
      create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
        if (state.getCurrentContext().type !== 'overworld') {
          return null;
        }
        return createRoadGroup(three, state, tileX, tileY);
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
        return {
          surfaceHeight: -0.12,
          boundaryRole: 'crossing',
          underlayKind: 'river',
          chamferEligible: false,
        };
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
  ]);
}

function classifyConnectedRoad({
  x,
  y,
  tile,
  townAnchors,
  bridgeAnchors,
}: ClassifyOverworldTileContext) {
  const baseKind = tile.kind;
  if (baseKind === 'mountain' || isRoadTerminalPoiKind(baseKind)) {
    return null;
  }

  const nearestTown = townAnchors
    .map((anchor) => ({
      anchor,
      distance: Math.hypot(x - anchor.x, y - anchor.y),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (
    nearestTown &&
    nearestTown.distance < 1.1 &&
    (Math.abs(x - nearestTown.anchor.x) < 0.35 ||
      Math.abs(y - nearestTown.anchor.y) < 0.35) &&
    baseKind !== 'river' &&
    baseKind !== 'bridge'
  ) {
    return 'road';
  }

  const pairs: [(typeof townAnchors)[number], (typeof townAnchors)[number]][] =
    [];
  for (let index = 0; index < townAnchors.length; index += 1) {
    for (let next = index + 1; next < townAnchors.length; next += 1) {
      const a = townAnchors[index];
      const b = townAnchors[next];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance <= 28) {
        pairs.push([a, b]);
      }
    }
  }

  for (const [a, b] of pairs) {
    if (distanceToLineSegment(x, y, a.x, a.y, b.x, b.y) < 0.42) {
      return isBridgeWaterKind(baseKind) ? 'bridge' : 'road';
    }
  }

  if (nearestTown) {
    const nearestBridge = bridgeAnchors
      .map((anchor) => ({
        anchor,
        distance: Math.hypot(
          nearestTown.anchor.x - anchor.x,
          nearestTown.anchor.y - anchor.y
        ),
      }))
      .sort((left, right) => left.distance - right.distance)[0];

    if (
      nearestBridge &&
      nearestBridge.distance <= 16 &&
      distanceToLineSegment(
        x,
        y,
        nearestTown.anchor.x,
        nearestTown.anchor.y,
        nearestBridge.anchor.x,
        nearestBridge.anchor.y
      ) < 0.38
    ) {
      return isBridgeWaterKind(baseKind) ? 'bridge' : 'road';
    }
  }

  for (const bridge of bridgeAnchors) {
    const distance = Math.hypot(x - bridge.x, y - bridge.y);
    if (distance < 0.8) {
      return isBridgeWaterKind(baseKind) ? 'bridge' : 'road';
    }
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
    isRoadTerminalPoiKind(tileKind)
  ) {
    return null;
  }

  if (roadSignal <= 0.9) {
    return null;
  }

  const north = sampleTerrainSignals(x, y - 1).roadSignal;
  const east = sampleTerrainSignals(x + 1, y).roadSignal;
  const south = sampleTerrainSignals(x, y + 1).roadSignal;
  const west = sampleTerrainSignals(x - 1, y).roadSignal;
  const horizontalRidge =
    roadSignal >= north && roadSignal >= south && roadSignal > 0.91;
  const verticalRidge =
    roadSignal >= east && roadSignal >= west && roadSignal > 0.91;

  if (!horizontalRidge && !verticalRidge) {
    return null;
  }

  if (isBridgeWaterKind(tileKind)) {
    if (horizontalRidge && verticalRidge) {
      return null;
    }
    return 'bridge';
  }

  return 'road';
}

function isBridgeWaterKind(kind: string) {
  return kind === 'river' || kind === 'ocean';
}

function isRoadTerminalPoiKind(kind: string) {
  return (
    kind === 'sign' || kind === 'town' || kind === 'cave' || kind === 'dungeon'
  );
}

function distanceToLineSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSquared = abx * abx + aby * aby;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = clamp((apx * abx + apy * aby) / lengthSquared, 0, 1);
  const nearestX = ax + abx * t;
  const nearestY = ay + aby * t;
  return Math.hypot(px - nearestX, py - nearestY);
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
  const directions = [
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

function isRoadNetworkKind(kind: string) {
  return (
    kind === 'road' ||
    kind === 'bridge' ||
    kind === 'town' ||
    kind === 'cave' ||
    kind === 'dungeon'
  );
}

function createRoadCurve(
  three: any,
  tileX: number,
  tileY: number,
  start: any,
  end: any
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
  const curve = new three.QuadraticBezierCurve3(start, control, end);
  return curve.getPoints(segments);
}

function createRoadRibbonMesh(
  three: ThreeHostLike,
  points: RoadVectorLike[],
  width: number,
  material: ThreeMaterialLike,
  seedKey: string,
  lipDepth: number
) {
  const geometry = new three.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let distance = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = new three.Vector3()
      .subVectors(next, previous)
      .setY(0)
      .normalize();
    const normal = new three.Vector3(-tangent.z, 0, tangent.x).normalize();
    const widthNoise =
      1 +
      (hash2D(`road-width:${seedKey}`, index, points.length) - 0.5) * lipDepth;
    const halfWidth = width * widthNoise * 0.5;
    const left = point.clone().addScaledVector(normal, halfWidth);
    const right = point.clone().addScaledVector(normal, -halfWidth);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (index > 0) {
      distance += point.distanceTo(previous);
    }
    uvs.push(0, distance, 1, distance);
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const base = index * 2;
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  geometry.setAttribute(
    'position',
    new three.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('uv', new three.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new three.Mesh(geometry, material);
}

function getRoadStyle(three: ThreeHostLike, tileX: number, tileY: number) {
  return getOrCreateRegionalValue(
    roadStyleCache,
    tileX,
    tileY,
    ROAD_REGION_SIZE,
    ({ regionX, regionY }) => {
      const tier = Math.floor(hash2D('road-tier', regionX, regionY) * 3);
      const styleType = ['footpath', 'cobble', 'brick'][tier];
      const palette =
        styleType === 'brick'
          ? { road: '#a14d34', shoulder: '#6b5d48', accent: '#7a2f1d' }
          : styleType === 'cobble'
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
      const roadTexture = createRoadTexture(
        three,
        palette.road,
        palette.accent,
        styleType,
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
        roadWidth: styleType === 'footpath' ? 0.24 : 0.3,
        shoulderWidth: styleType === 'footpath' ? 0.36 : 0.42,
        roadMaterial: new three.MeshStandardMaterial({
          color: '#ffffff',
          map: roadTexture,
          roughness: 0.95,
          metalness: styleType === 'cobble' ? 0.04 : 0.02,
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
    }
  );
}

function createRoadTexture(
  three: ThreeHostLike,
  baseColor: string,
  accentColor: string,
  styleType: string,
  regionX: number,
  regionY: number
) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;

  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (styleType === 'brick') {
    for (let row = 0; row < canvas.height; row += 10) {
      const shift = ((row / 10) % 2) * 8;
      context.fillStyle = accentColor;
      context.fillRect(0, row, canvas.width, 2);
      for (let column = -8 + shift; column < canvas.width + 8; column += 16) {
        context.fillRect(column, row, 2, 10);
      }
    }
  } else if (styleType === 'cobble') {
    for (let index = 0; index < 42; index += 1) {
      const x = Math.floor(
        hash2D('road-cobble-x', regionX * 37 + index, regionY) * canvas.width
      );
      const y = Math.floor(
        hash2D('road-cobble-y', regionY * 41 + index, regionX) * canvas.height
      );
      const width = 5 + Math.floor(hash2D('road-cobble-w', index, regionX) * 4);
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

  return finalizeTexture(three, canvas, 1.2, 1.2);
}

function createRoadShoulderTexture(
  three: ThreeHostLike,
  baseColor: string,
  accentColor: string,
  regionX: number,
  regionY: number
) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;

  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 140; index += 1) {
    const x = Math.floor(
      hash2D('road-shoulder-x', regionX * 31 + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D('road-shoulder-y', regionY * 29 + index, regionX) * canvas.height
    );
    const size =
      1 + Math.floor(hash2D('road-shoulder-s', index, regionX + regionY) * 3);
    context.fillStyle =
      index % 3 === 0 ? accentColor : 'rgba(255,255,255,0.12)';
    context.fillRect(x, y, size, size);
  }

  return finalizeTexture(three, canvas, 1.2, 1.2);
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

function getBridgeAxis(state: WorldStateLike, tileX: number, tileY: number) {
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

function isBridgeTravelKind(kind: string) {
  return (
    kind === 'bridge' ||
    kind === 'road' ||
    kind === 'town' ||
    kind === 'cave' ||
    kind === 'dungeon'
  );
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
  type: string,
  layer: string,
  tileX: number,
  tileY: number
) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;

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

  return finalizeTexture(three, canvas, 1, 1);
}

function finalizeTexture(
  three: ThreeHostLike,
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number
) {
  return createCanvasTexture(three, canvas, { repeatX, repeatY });
}

type RoadVectorLike = {
  x: number;
  y: number;
  z: number;
  clone(): RoadVectorLike;
  addScaledVector(vector: RoadVectorLike, scalar: number): RoadVectorLike;
  distanceTo(vector: RoadVectorLike): number;
};

type BridgeGroupLike = {
  add(child: unknown): void;
};

interface RoadConnection {
  id: 'north' | 'east' | 'south' | 'west';
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
