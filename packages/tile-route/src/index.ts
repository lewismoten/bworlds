import {
  createBoundedCache,
  createCoordinateCache,
} from '@bworlds/cache-support';
import { resolveDockBoatRoute } from '@bworlds/dock-route-support';
import {
  appendHashSeedLabel,
  appendHashSeedPart,
  hash2D,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core';
import { findNearestBoatLaunchPoint } from '@bworlds/map-boat';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createTilePlugin,
  markOptionalDecorativeRenderBudgetPart,
} from '@bworlds/plugin-api';
import {
  createHostMaterialResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import {
  createBoundarySurfaceProfile,
  createConnectedRoutePathResolver,
  createRouteTraversalProfile,
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
  createTexturedPlaneMesh,
  getOrCreatePaintedCanvasTexture,
  type PathPointLike,
} from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Kind,
  CreateWorldActionContext,
  Create3DModelContext,
  Create3DModelProgress,
  Paint2DContext,
  SurfaceProfile3D,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeObject3DLike,
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
const FOREST_LOG_BRIDGE_KEY = 'forestLogBridge';
const MAX_RIVER_BRIDGE_SPAN = 4;
const ROUTE_STYLE_CACHE_LIMIT = 192;
const ROUTE_LABEL_CACHE_LIMIT = 256;
const ROAD_TIER_SEED = registerHashLabel('road-tier');
const ROAD_FOOTPATH_SHOULDER_SEED = registerHashLabel('road-footpath-shoulder');
const FOREST_RIVER_LOG_BRIDGE_SEED = registerHashLabel(
  'forest-river-log-bridge'
);
const ROAD_CURVE_JITTER_SEED = registerHashLabel('road-curve-jitter');
const ROAD_BRANCH_BEND_SEED = registerHashLabel('road-branch-bend');
const ROAD_COBBLE_X_SEED = registerHashLabel('road-cobble-x');
const ROAD_COBBLE_Y_SEED = registerHashLabel('road-cobble-y');
const ROAD_COBBLE_W_SEED = registerHashLabel('road-cobble-w');
const ROAD_COBBLE_H_SEED = registerHashLabel('road-cobble-h');
const ROAD_TRACK_X_SEED = registerHashLabel('road-track-x');
const ROAD_TRACK_Y_SEED = registerHashLabel('road-track-y');
const ROAD_SHOULDER_X_SEED = registerHashLabel('road-shoulder-x');
const ROAD_SHOULDER_Y_SEED = registerHashLabel('road-shoulder-y');
const ROAD_SHOULDER_S_SEED = registerHashLabel('road-shoulder-s');
const FOREST_LOG_AXIS_SEED = registerHashLabel('forest-log-axis');
const DOCK_PALETTE_SEED = registerHashLabel('dock-palette');
const DOCK_BOAT_SIDE_SEED = registerHashLabel('dock-boat-side');
const DOCK_BOAT_LENGTH_SEED = registerHashLabel('dock-boat-length');
const DOCK_BOAT_WIDTH_SEED = registerHashLabel('dock-boat-width');
const DOCK_BOAT_SAIL_SEED = registerHashLabel('dock-boat-sail');
const BRIDGE_TYPE_SEED = registerHashLabel('bridge-type');
const BRIDGE_COVERED_SEED = registerHashLabel('bridge-covered');
const BRIDGE_PILLAR_SEED = registerHashLabel('bridge-pillar');
const BRIDGE_WIDTH_SEED = registerHashLabel('bridge-width');
const BRIDGE_COVER_HEIGHT_SEED = registerHashLabel('bridge-cover-height');
const BRIDGE_PILLAR_WIDTH_SEED = registerHashLabel('bridge-pillar-width');
const BRIDGE_RIVET_X_SEED = registerHashLabel('bridge-rivet-x');
const BRIDGE_RIVET_Y_SEED = registerHashLabel('bridge-rivet-y');
const ROAD_RIBBON_SEED = registerHashLabel('road-ribbon');
const ROAD_RIBBON_STUB_SEED = registerHashLabel('stub');
const ROAD_RIBBON_SHOULDER_SEED = registerHashLabel('shoulder');
const ROAD_RIBBON_ROAD_SEED = registerHashLabel('road');
const ROAD_RIBBON_BRANCH_SEED = registerHashLabel('branch');
const ROAD_CONNECTION_DIRECTION_SEEDS: Record<RoadConnection['id'], number> = {
  north: registerHashLabel('north'),
  east: registerHashLabel('east'),
  south: registerHashLabel('south'),
  west: registerHashLabel('west'),
  northeast: registerHashLabel('northeast'),
  southeast: registerHashLabel('southeast'),
  southwest: registerHashLabel('southwest'),
  northwest: registerHashLabel('northwest'),
};
type RoadStyleType = 'footpath' | 'cobble' | 'brick';
type BridgeTextureType =
  'wood' | 'stone' | 'metal' | 'drawbridge' | 'roof' | 'roof-stone';
type BridgeTextureLayer = 'deck' | 'rail' | 'cover' | 'pillar';

const bridgeStyleCache = createBoundedCache<string, BridgeStyleBlueprint>(
  ROUTE_STYLE_CACHE_LIMIT
);
const bridgeAppearanceCache = createBoundedCache<
  string,
  BridgeAppearanceBlueprint
>(ROUTE_STYLE_CACHE_LIMIT);
const bridgeClusterCache = createCoordinateCache<BridgeClusterInfo>();
const dockStyleCache = createBoundedCache<string, DockStyleBlueprint>(
  ROUTE_STYLE_CACHE_LIMIT
);
const dockRouteLabelCache = createBoundedCache<string, ThreeTextureLike>(
  ROUTE_LABEL_CACHE_LIMIT
);
const dockClusterCache = createCoordinateCache<DockClusterInfo>();
const dockClassificationFootprintCache = new WeakMap<
  NonNullable<ClassifyOverworldTileContext['sampleTerrainSignals']>,
  WeakMap<
    NonNullable<ClassifyOverworldTileContext['poiAnchors']>,
    ReturnType<typeof createCoordinateCache<true>>
  >
>();
const connectedRoutePathResolverCache = new WeakMap<
  NonNullable<ClassifyOverworldTileContext['townAnchors']>,
  WeakMap<
    NonNullable<ClassifyOverworldTileContext['bridgeAnchors']>,
    ReturnType<typeof createConnectedRoutePathResolver>
  >
>();
const roadStyleCache = createBoundedCache<string, RoadStyleBlueprint>(
  ROUTE_STYLE_CACHE_LIMIT
);
const forestLogBridgeMaterialCache = new WeakMap<
  object,
  {
    trunkMaterial: ThreeMaterialLike;
    supportMaterial: ThreeMaterialLike;
  }
>();
const ROAD_DIRECTIONS: RoadConnection[] = [
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
        const signalSampler = createCachedTerrainSignalSampler(
          context.sampleTerrainSignals
        );
        if (signalSampler) {
          (
            signalSampler as typeof signalSampler & {
              sourceTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'];
            }
          ).sourceTerrainSignals = context.sampleTerrainSignals;
        }
        const cachedContext = {
          ...context,
          sampleTerrainSignals: signalSampler,
          sourceTerrainSignals: context.sampleTerrainSignals,
        };
        const connectedRoadKind = classifyConnectedRoad(cachedContext);
        if (connectedRoadKind) {
          return {
            ...cachedContext.tile,
            kind: connectedRoadKind,
            note:
              cachedContext.tile.note ??
              (connectedRoadKind === 'bridge'
                ? 'A crossing links the nearby routes.'
                : connectedRoadKind === 'dock'
                  ? 'A dock reaches out from the nearby coast.'
                  : 'A road runs between nearby landmarks.'),
          };
        }

        if (classifyForestRiverLogBridge(cachedContext)) {
          return {
            kind: 'bridge',
            note: 'A fallen tree spans the river between the woods.',
          };
        }

        const noiseRoadKind = classifyNoiseRoad(cachedContext);
        if (!noiseRoadKind) {
          return null;
        }

        return { kind: noiseRoadKind };
      },
      paint2D: createPlainsBackedTilePainter(
        ({ context, x, y, motif, fillRect }) => {
          const roadY = 5 + motif.int(0, 2);
          fillRect(context, x, y + roadY, TILE_PIXEL_SIZE, 4, '#8a5a19');
          fillRect(context, x, y + roadY + 1, TILE_PIXEL_SIZE, 1, '#d7b172');
          return true;
        }
      ),
      create3DModel({
        three,
        state,
        tileX,
        tileY,
        detailLevel,
      }: Create3DModelContext) {
        if (state.getCurrentContext().type !== 'overworld') {
          return null;
        }
        return runRoadModelBuildToCompletion(
          createRoadGroupProgressive({
            three,
            state,
            tileX,
            tileY,
            detailLevel,
          })
        );
      },
      create3DModelProgressive({ three, state, tileX, tileY, detailLevel }) {
        if (state.getCurrentContext().type !== 'overworld') {
          return null;
        }
        return createRoadGroupProgressive({
          three,
          state,
          tileX,
          tileY,
          detailLevel,
        });
      },
      resolveFloorKind3D(context) {
        if (context.state.getCurrentContext().type !== 'overworld') {
          return null;
        }
        return (
          resolveDominantNeighborFloorKind3D(context, {
            isExcludedKind(kind) {
              return kind === 'road' || isWaterOrCrossingKind(kind);
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
      create3DModel(context: Create3DModelContext) {
        return runBridgeModelBuildToCompletion(
          createBridgeGroupProgressive(context)
        );
      },
      create3DModelProgressive(context: Create3DModelContext) {
        return createBridgeGroupProgressive(context);
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
      create3DModel(context: Create3DModelContext) {
        return runDockModelBuildToCompletion(
          createDockGroupProgressive(context)
        );
      },
      create3DModelProgressive(context: Create3DModelContext) {
        return createDockGroupProgressive(context);
      },
      createWorldAction(context: CreateWorldActionContext) {
        if (!context.state) {
          return null;
        }
        const route = resolveDockBoatRoute(context.state, context.x, context.y);
        const destination = route?.stops[1];
        if (route && destination) {
          return {
            type: 'enter',
            context: {
              id: `dock-route-ship:${context.x}:${context.y}`,
              label: route.boatName,
              type: 'ship',
              depth: 1,
              origin: { x: context.x, y: context.y },
              destination: { x: destination.x, y: destination.y },
              routeBoatName: route.boatName,
              routeStops: route.stops,
            },
            spawn: { x: 0, y: 4 },
            facing: 0,
          };
        }
        const launch = findNearestBoatLaunchPoint({
          x: context.x,
          y: context.y,
          sampleTile: (sampleX, sampleY) =>
            context.state!.getCurrentTile(sampleX, sampleY),
          state: context.state,
        });
        if (!launch) {
          return null;
        }
        return {
          type: 'enter',
          context: {
            id: `boat:${context.x}:${context.y}`,
            label: 'Paddle Boat',
            type: 'boat',
            depth: 1,
            origin: { x: context.x, y: context.y },
          },
          spawn: { x: launch.x - context.x, y: launch.y - context.y },
          facing: 0,
        };
      },
    },
  ]);
}

function runDockModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
) {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function runBridgeModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
) {
  while (true) {
    const step = build.next();
    if (step.done) {
      return step.value;
    }
  }
}

function runRoadModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
) {
  while (true) {
    const step = build.next();
    if (step.done) {
      return step.value;
    }
  }
}

function classifyConnectedRoad({
  x,
  y,
  tile,
  townAnchors,
  bridgeAnchors,
  poiAnchors,
  sampleTerrainSignals,
  sourceTerrainSignals,
  signals,
}: ClassifyOverworldTileContext & {
  sourceTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'];
}) {
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
    sourceTerrainSignals,
  });
  if (dockKind) {
    return dockKind;
  }
  const hasRoutePath = resolveConnectedRoutePathPresence({
    x,
    y,
    townAnchors,
    bridgeAnchors,
  });
  if (hasRoutePath) {
    if (isBridgeWaterKind(baseKind)) {
      return canClassifyBridgeWaterTile({
        x,
        y,
        tile,
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
      tile,
      signals,
      sampleTerrainSignals,
    })
      ? 'bridge'
      : null;
  }

  return 'road';
}

function classifyForestRiverLogBridge({
  x,
  y,
  tile,
  signals,
  sampleTerrainSignals,
}: ClassifyOverworldTileContext) {
  if (!sampleTerrainSignals || tile.kind !== 'river') {
    return false;
  }
  if (signals.roadSignal >= 0.56) {
    return false;
  }

  const north = sampleTerrainSignals(x, y - 1);
  const east = sampleTerrainSignals(x + 1, y);
  const south = sampleTerrainSignals(x, y + 1);
  const west = sampleTerrainSignals(x - 1, y);
  const candidates: Array<'ew' | 'ns'> = [];

  if (
    isForestLikeBankSignal(north) &&
    isForestLikeBankSignal(south) &&
    north.roadSignal < 0.5 &&
    south.roadSignal < 0.5
  ) {
    candidates.push('ns');
  }
  if (
    isForestLikeBankSignal(east) &&
    isForestLikeBankSignal(west) &&
    east.roadSignal < 0.5 &&
    west.roadSignal < 0.5
  ) {
    candidates.push('ew');
  }

  if (candidates.length === 0) {
    return false;
  }

  const threshold = candidates.length > 1 ? 0.92 : 0.88;
  return hash2D(FOREST_RIVER_LOG_BRIDGE_SEED, x, y) >= threshold;
}

function isForestLikeBankSignal(
  signal: ClassifyOverworldTileContext['signals']
) {
  return (
    signal.continent > 0.42 &&
    signal.continent < 0.9 &&
    signal.elevation < 0.74 &&
    signal.riverSignal < 0.86 &&
    signal.moisture >= 0.56
  );
}

function classifyPoiDock({
  x,
  y,
  tile,
  poiAnchors,
  sampleTerrainSignals,
  sourceTerrainSignals,
}: Pick<
  ClassifyOverworldTileContext,
  'x' | 'y' | 'tile' | 'poiAnchors' | 'sampleTerrainSignals'
> & {
  sourceTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'];
}) {
  if (!sampleTerrainSignals) {
    return null;
  }
  if (tile.kind !== 'shore' && tile.kind !== 'ocean') {
    return null;
  }
  const sourceSampler =
    resolveTerrainSignalSamplerSource(sourceTerrainSignals) ??
    resolveTerrainSignalSamplerSource(sampleTerrainSignals);
  const footprintCache = getDockClassificationFootprintCache(
    poiAnchors,
    sampleTerrainSignals,
    sourceSampler
  );

  return footprintCache?.has(x, y) ? 'dock' : null;
}

function canClassifyBridgeWaterTile({
  x,
  y,
  tile,
  signals,
  sampleTerrainSignals,
}: Pick<
  ClassifyOverworldTileContext,
  'x' | 'y' | 'tile' | 'signals' | 'sampleTerrainSignals'
>) {
  if (!sampleTerrainSignals) {
    return false;
  }
  const axis = getBridgeCrossingAxis(x, y, signals, sampleTerrainSignals);
  if (!axis) {
    return false;
  }

  if (tile.kind === 'river') {
    return canClassifyRiverBridgeSpan(x, y, axis, sampleTerrainSignals);
  }

  return !hasParallelLandWithinBridgeSpan(x, y, axis, sampleTerrainSignals);
}

function getBridgeCrossingAxis(
  x: number,
  y: number,
  signals: ClassifyOverworldTileContext['signals'],
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >
): 'ew' | 'ns' | null {
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
    return null;
  }
  return horizontalRidge ? 'ew' : 'ns';
}

function canClassifyRiverBridgeSpan(
  x: number,
  y: number,
  axis: 'ew' | 'ns',
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >
) {
  const alongNegative = axis === 'ew' ? { dx: -1, dy: 0 } : { dx: 0, dy: -1 };
  const alongPositive = axis === 'ew' ? { dx: 1, dy: 0 } : { dx: 0, dy: 1 };
  let negativeSpan = 0;
  let positiveSpan = 0;

  while (
    negativeSpan + positiveSpan + 1 < MAX_RIVER_BRIDGE_SPAN &&
    isBridgeableRiverCrossingSignal(
      sampleTerrainSignals(
        x + alongNegative.dx * (negativeSpan + 1),
        y + alongNegative.dy * (negativeSpan + 1)
      )
    )
  ) {
    negativeSpan += 1;
  }

  while (
    negativeSpan + positiveSpan + 1 < MAX_RIVER_BRIDGE_SPAN &&
    isBridgeableRiverCrossingSignal(
      sampleTerrainSignals(
        x + alongPositive.dx * (positiveSpan + 1),
        y + alongPositive.dy * (positiveSpan + 1)
      )
    )
  ) {
    positiveSpan += 1;
  }

  const negativeBank = sampleTerrainSignals(
    x + alongNegative.dx * (negativeSpan + 1),
    y + alongNegative.dy * (negativeSpan + 1)
  );
  const positiveBank = sampleTerrainSignals(
    x + alongPositive.dx * (positiveSpan + 1),
    y + alongPositive.dy * (positiveSpan + 1)
  );

  return isBridgeBankSignal(negativeBank) && isBridgeBankSignal(positiveBank);
}

function isBridgeableRiverCrossingSignal(
  signal: ClassifyOverworldTileContext['signals']
) {
  return (
    signal.continent > 0.42 &&
    signal.continent < 0.9 &&
    signal.roadSignal > 0.9 &&
    signal.riverSignal >= 0.76
  );
}

function isBridgeBankSignal(signal: ClassifyOverworldTileContext['signals']) {
  return (
    signal.continent > COASTAL_LAND_CONTINENT_THRESHOLD &&
    signal.continent < 0.9 &&
    signal.riverSignal < 0.74
  );
}

function hasParallelLandWithinBridgeSpan(
  x: number,
  y: number,
  axis: 'ew' | 'ns',
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >
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

function createCachedTerrainSignalSampler(
  sampleTerrainSignals: ClassifyOverworldTileContext['sampleTerrainSignals']
): ClassifyOverworldTileContext['sampleTerrainSignals'] {
  if (!sampleTerrainSignals) {
    return sampleTerrainSignals;
  }
  const cache =
    createCoordinateCache<
      ReturnType<
        NonNullable<ClassifyOverworldTileContext['sampleTerrainSignals']>
      >
    >();
  return (x: number, y: number) =>
    cache.getOrCreate(x, y, () => sampleTerrainSignals(x, y));
}

function resolveConnectedRoutePathPresence({
  x,
  y,
  townAnchors,
  bridgeAnchors,
}: Pick<
  ClassifyOverworldTileContext,
  'x' | 'y' | 'townAnchors' | 'bridgeAnchors'
>) {
  const resolver = getConnectedRoutePathResolver(townAnchors, bridgeAnchors);
  return resolver ? resolver(x, y) : false;
}

function getConnectedRoutePathResolver(
  townAnchors: ClassifyOverworldTileContext['townAnchors'],
  bridgeAnchors: ClassifyOverworldTileContext['bridgeAnchors']
) {
  if (!townAnchors || !bridgeAnchors) {
    return null;
  }
  let bridgeCache = connectedRoutePathResolverCache.get(townAnchors);
  if (!bridgeCache) {
    bridgeCache = new WeakMap();
    connectedRoutePathResolverCache.set(townAnchors, bridgeCache);
  }
  let resolver = bridgeCache.get(bridgeAnchors);
  if (!resolver) {
    resolver = createConnectedRoutePathResolver({
      townAnchors,
      bridgeAnchors,
    });
    bridgeCache.set(bridgeAnchors, resolver);
  }
  return resolver;
}

function resolveTerrainSignalSamplerSource(
  sampleTerrainSignals: ClassifyOverworldTileContext['sampleTerrainSignals']
) {
  if (!sampleTerrainSignals) {
    return null;
  }
  const sourceSampler = (
    sampleTerrainSignals as ClassifyOverworldTileContext['sampleTerrainSignals'] & {
      sourceTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'];
    }
  ).sourceTerrainSignals;
  return sourceSampler ?? sampleTerrainSignals;
}

function getDockClassificationFootprintCache(
  poiAnchors: ClassifyOverworldTileContext['poiAnchors'],
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >,
  sourceTerrainSignals: ClassifyOverworldTileContext['sampleTerrainSignals']
) {
  if (!poiAnchors || poiAnchors.length === 0 || !sourceTerrainSignals) {
    return null;
  }
  let samplerCache = dockClassificationFootprintCache.get(sourceTerrainSignals);
  if (!samplerCache) {
    samplerCache = new WeakMap();
    dockClassificationFootprintCache.set(sourceTerrainSignals, samplerCache);
  }
  let footprintCache = samplerCache.get(poiAnchors);
  if (!footprintCache) {
    footprintCache = buildDockClassificationFootprintCache(
      poiAnchors,
      sampleTerrainSignals
    );
    samplerCache.set(poiAnchors, footprintCache);
  }
  return footprintCache;
}

function buildDockClassificationFootprintCache(
  poiAnchors: NonNullable<ClassifyOverworldTileContext['poiAnchors']>,
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >
) {
  const footprintCache = createCoordinateCache<true>();
  const anchors = poiAnchors.filter(
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

      if (!oceanSeen) {
        continue;
      }
      for (const segment of segments) {
        footprintCache.set(segment.x, segment.y, true);
      }
    }
  }

  return footprintCache;
}

function* createRoadGroupProgressive({
  three,
  state,
  tileX,
  tileY,
  detailLevel,
}: Pick<
  Create3DModelContext,
  'three' | 'state' | 'tileX' | 'tileY' | 'detailLevel'
>): Generator<Create3DModelProgress, unknown, void> {
  const style = getRoadStyle(three, tileX, tileY);
  const connections = getRoadConnections(state, tileX, tileY);
  const tileSeed = createRoadTileSeed(tileX, tileY);
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);
  const lowDetail = detailLevel === 'low';
  const includeShoulders = !lowDetail;
  const includeCenterPatch = !lowDetail || connections.length <= 2;

  if (connections.length === 0) {
    const totalSteps = includeShoulders ? 2 : 1;
    let completedSteps = 0;
    if (includeShoulders) {
      group.add(
        markOptionalDecorativeRenderBudgetPart(
          createRoadRibbonMesh(
            three,
            [
              new three.Vector3(-0.18, ROAD_SURFACE_HEIGHT, 0),
              new three.Vector3(0, ROAD_SURFACE_HEIGHT, 0),
              new three.Vector3(0.18, ROAD_SURFACE_HEIGHT, 0),
            ],
            0.18,
            style.shoulderMaterial,
            appendHashSeedLabel(
              appendHashSeedLabel(tileSeed, ROAD_RIBBON_STUB_SEED),
              ROAD_RIBBON_SHOULDER_SEED
            ),
            0.04
          ),
          {
            label: 'stub-shoulder',
          }
        )
      );
      completedSteps += 1;
      yield {
        completedSteps,
        totalSteps,
        label: 'stub-shoulder',
      };
    }
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
        appendHashSeedLabel(tileSeed, ROAD_RIBBON_STUB_SEED),
        0.028
      )
    );
    completedSteps += 1;
    yield {
      completedSteps,
      totalSteps,
      label: 'stub-road',
    };
    return group;
  }

  const totalSteps =
    connections.length === 2
      ? 1 + (includeShoulders ? 2 : 1)
      : (includeCenterPatch ? 1 : 0) + connections.length;
  let completedSteps = 0;
  if (includeCenterPatch) {
    const centerPatch = new three.Mesh(
      new three.CylinderGeometry(0.12, 0.15, 0.02, 8),
      style.shoulderMaterial
    );
    centerPatch.position.y = ROAD_SURFACE_HEIGHT;
    centerPatch.scale.z = 0.85;
    group.add(centerPatch);
    completedSteps += 1;
    yield {
      completedSteps,
      totalSteps,
      label: 'center-patch',
    };
  }

  if (connections.length === 2) {
    const curve = createRoadCurve(
      three,
      tileX,
      tileY,
      connections[0],
      connections[1]
    );
    if (includeShoulders) {
      group.add(
        markOptionalDecorativeRenderBudgetPart(
          createRoadRibbonMesh(
            three,
            curve,
            style.shoulderWidth,
            style.shoulderMaterial,
            appendHashSeedLabel(tileSeed, ROAD_RIBBON_SHOULDER_SEED),
            0.045
          ),
          {
            label: 'shoulder-ribbon',
          }
        )
      );
      completedSteps += 1;
      yield {
        completedSteps,
        totalSteps,
        label: 'shoulder-ribbon',
      };
    }
    group.add(
      createRoadRibbonMesh(
        three,
        curve,
        style.roadWidth,
        style.roadMaterial,
        appendHashSeedLabel(tileSeed, ROAD_RIBBON_ROAD_SEED),
        0.03
      )
    );
    completedSteps += 1;
    yield {
      completedSteps,
      totalSteps,
      label: 'road-ribbon',
    };
    return group;
  }

  for (let index = 0; index < connections.length; index += 1) {
    const connection = connections[index]!;
    const branch = createRoadBranch(three, tileX, tileY, connection, index);
    const branchSeed = appendHashSeedLabel(
      appendHashSeedLabel(tileSeed, ROAD_RIBBON_BRANCH_SEED),
      ROAD_CONNECTION_DIRECTION_SEEDS[connection.id]
    );
    if (includeShoulders) {
      group.add(
        markOptionalDecorativeRenderBudgetPart(
          createRoadRibbonMesh(
            three,
            branch,
            style.shoulderWidth,
            style.shoulderMaterial,
            appendHashSeedLabel(branchSeed, ROAD_RIBBON_SHOULDER_SEED),
            0.04
          ),
          {
            label: `branch-${index + 1}-shoulder`,
          }
        )
      );
    }
    group.add(
      createRoadRibbonMesh(
        three,
        branch,
        style.roadWidth,
        style.roadMaterial,
        branchSeed,
        0.026
      )
    );
    completedSteps += 1;
    yield {
      completedSteps,
      totalSteps,
      label: `branch-${index + 1}`,
    };
  }

  return group;
}

function getRoadConnections(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  const directions: RoadConnection[] = [];
  for (let index = 0; index < ROAD_DIRECTIONS.length; index += 1) {
    const direction = ROAD_DIRECTIONS[index]!;
    if (
      isRoadNetworkKind(
        state.getCurrentTile(tileX + direction.dx, tileY + direction.dy).kind
      )
    ) {
      directions.push(direction);
    }
  }

  directions.sort(
    (left, right) =>
      Math.atan2(left.edgeZ, left.edgeX) - Math.atan2(right.edgeZ, right.edgeX)
  );
  return directions;
}

function isRoadNetworkKind(kind: Kind): boolean {
  return (
    kind === 'road' ||
    kind === 'bridge' ||
    kind === 'dock' ||
    isRouteTerminalKind(kind)
  );
}

function createRoadTileSeed(tileX: number, tileY: number): number {
  return appendHashSeedPart(appendHashSeedPart(ROAD_RIBBON_SEED, tileX), tileY);
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
  const jitter = (hash2D(ROAD_CURVE_JITTER_SEED, tileX, tileY) - 0.5) * 0.12;
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
    (hash2D(ROAD_BRANCH_BEND_SEED, tileX * 11 + index, tileY * 13) - 0.5) * 0.1;
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
  seedHash: number,
  lipDepth: number
) {
  return createRibbonMesh(three, points, width, material, {
    widthNoise(index, total) {
      return 1 + (hash2DWithSeed(seedHash, index, total) - 0.5) * lipDepth;
    },
  });
}

function getRoadStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number
): RoadStyle {
  const regionX = Math.floor(tileX / ROAD_REGION_SIZE);
  const regionY = Math.floor(tileY / ROAD_REGION_SIZE);
  const variant = getRoadStyleVariant(regionX, regionY);

  return roadStyleCache
    .getOrCreate(variant.key, () =>
      createHostMaterialResolver((host: ThreeHostLike): RoadStyle => {
        const roadTexture = createRoadTexture(
          host,
          variant.palette.road,
          variant.palette.accent,
          variant.roadStyleType,
          variant.patternX,
          variant.patternY
        );
        const shoulderTexture = createRoadShoulderTexture(
          host,
          variant.palette.shoulder,
          variant.palette.road,
          variant.patternX,
          variant.patternY
        );

        return {
          roadWidth: variant.roadStyleType === 'footpath' ? 0.24 : 0.3,
          shoulderWidth: variant.roadStyleType === 'footpath' ? 0.36 : 0.42,
          roadMaterial: new host.MeshStandardMaterial({
            color: '#ffffff',
            map: roadTexture,
            roughness: 0.95,
            metalness: variant.roadStyleType === 'cobble' ? 0.04 : 0.02,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            side: host.DoubleSide,
          }),
          shoulderMaterial: new host.MeshStandardMaterial({
            color: '#ffffff',
            map: shoulderTexture,
            roughness: 0.98,
            metalness: 0.01,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
            side: host.DoubleSide,
          }),
        };
      })
    )
    .createMaterials(three);
}

function getRoadStyleVariant(
  regionX: number,
  regionY: number
): {
  key: string;
  roadStyleType: RoadStyleType;
  palette: {
    road: string;
    shoulder: string;
    accent: string;
  };
  patternX: number;
  patternY: number;
} {
  const tier = Math.floor(hash2D(ROAD_TIER_SEED, regionX, regionY) * 3);
  const styleType = ['footpath', 'cobble', 'brick'] as const;
  const roadStyleType = styleType[tier] ?? 'brick';
  const shoulderVariant =
    roadStyleType === 'footpath'
      ? pickThresholdColor(
          hash2D(ROAD_FOOTPATH_SHOULDER_SEED, regionX, regionY),
          0.5,
          '#5f7a4d',
          '#62724a'
        )
      : roadStyleType === 'brick'
        ? '#6b5d48'
        : '#6e7a68';
  const palette =
    roadStyleType === 'brick'
      ? { road: '#a14d34', shoulder: '#6b5d48', accent: '#7a2f1d' }
      : roadStyleType === 'cobble'
        ? { road: '#8f8578', shoulder: '#6e7a68', accent: '#5f5b56' }
        : {
            road: '#8d6a42',
            shoulder: shoulderVariant,
            accent: '#5a4025',
          };
  const patternX =
    roadStyleType === 'brick'
      ? 0
      : roadStyleType === 'cobble'
        ? 1
        : shoulderVariant === '#5f7a4d'
          ? 2
          : 3;
  const patternY =
    roadStyleType === 'brick'
      ? 0
      : roadStyleType === 'cobble'
        ? 1
        : shoulderVariant === '#5f7a4d'
          ? 2
          : 3;

  return {
    key: `${roadStyleType}:${shoulderVariant}`,
    roadStyleType,
    palette,
    patternX,
    patternY,
  };
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
            hash2D(ROAD_COBBLE_X_SEED, regionX * 37 + index, regionY) *
              canvas.width
          );
          const y = Math.floor(
            hash2D(ROAD_COBBLE_Y_SEED, regionY * 41 + index, regionX) *
              canvas.height
          );
          const width =
            5 + Math.floor(hash2D(ROAD_COBBLE_W_SEED, index, regionX) * 4);
          const height =
            3 + Math.floor(hash2D(ROAD_COBBLE_H_SEED, index, regionY) * 3);
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
            hash2D(ROAD_TRACK_X_SEED, regionX, index + regionY) * canvas.width
          );
          const y = Math.floor(
            hash2D(ROAD_TRACK_Y_SEED, regionY, index + regionX) * canvas.height
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
          hash2D(ROAD_SHOULDER_X_SEED, regionX * 31 + index, regionY) *
            canvas.width
        );
        const y = Math.floor(
          hash2D(ROAD_SHOULDER_Y_SEED, regionY * 29 + index, regionX) *
            canvas.height
        );
        const size =
          1 +
          Math.floor(
            hash2D(ROAD_SHOULDER_S_SEED, index, regionX + regionY) * 3
          );
        context.fillStyle =
          index % 3 === 0 ? accentColor : 'rgba(255,255,255,0.12)';
        context.fillRect(x, y, size, size);
      }
    },
  });
}

function* createBridgeGroupProgressive({
  three,
  state,
  tileX,
  tileY,
}: Pick<
  Create3DModelContext,
  'three' | 'state' | 'tileX' | 'tileY'
>): Generator<Create3DModelProgress, unknown, void> {
  const forestLogAxis = getForestLogBridgeAxis(state, tileX, tileY);
  if (forestLogAxis) {
    return yield* createForestLogBridgeGroupProgressive(
      three,
      tileX,
      tileY,
      forestLogAxis
    );
  }

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
  const stepLabels = ['deck', 'railings-or-parapets'];
  if (style.covered) {
    stepLabels.push('cover');
  }
  if (style.drawbridge) {
    stepLabels.push('drawbridge');
  }
  if (info.length > 1 && style.pillarSpacing > 0) {
    stepLabels.push('pillars');
  }
  const totalSteps = stepLabels.length;
  let completedSteps = 0;

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
  completedSteps += 1;
  yield {
    completedSteps,
    totalSteps,
    label: 'deck',
  };

  if (style.type === 'stone') {
    addBridgeParapets(three, group, style, alongX, deckLength, deckWidth);
  } else {
    addBridgeRailings(three, group, style, alongX, deckLength, deckWidth, info);
  }
  completedSteps += 1;
  yield {
    completedSteps,
    totalSteps,
    label: 'railings-or-parapets',
  };

  if (style.covered) {
    addBridgeCover(three, group, style, alongX, deckLength, deckWidth, info);
    completedSteps += 1;
    yield {
      completedSteps,
      totalSteps,
      label: 'cover',
    };
  }

  if (style.drawbridge) {
    addDrawbridgeDetails(three, group, style, alongX, deckWidth);
    completedSteps += 1;
    yield {
      completedSteps,
      totalSteps,
      label: 'drawbridge',
    };
  }

  if (info.length > 1 && style.pillarSpacing > 0) {
    addBridgePillars(three, group, style, alongX, info, deckWidth);
    completedSteps += 1;
    yield {
      completedSteps,
      totalSteps,
      label: 'pillars',
    };
  }

  return group;
}

function* createForestLogBridgeGroupProgressive(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  axis: 'ew' | 'ns'
): Generator<Create3DModelProgress, unknown, void> {
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);
  const { trunkMaterial, supportMaterial } = getForestLogBridgeMaterials(three);
  const totalSteps = 2;

  const trunk = new three.Mesh(
    new three.CylinderGeometry(0.08, 0.1, 1.08, 7),
    trunkMaterial
  );
  trunk.position.y = -0.02;
  trunk.rotation.z = Math.PI * 0.5;
  if (axis === 'ns') {
    trunk.rotation.x = Math.PI * 0.5;
    trunk.rotation.z = 0;
  }
  trunk.userData = {
    ...(trunk.userData ?? {}),
    [FOREST_LOG_BRIDGE_KEY]: axis,
  };
  group.add(trunk);
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'trunk',
  };

  const supportOffsets =
    axis === 'ew'
      ? [-0.42, 0.42].map((x) => ({ x, z: 0 }))
      : [-0.42, 0.42].map((z) => ({ x: 0, z }));
  const supportInstances = new three.InstancedMesh(
    new three.CylinderGeometry(0.04, 0.05, 0.18, 6),
    supportMaterial,
    supportOffsets.length
  );
  supportInstances.userData = {
    ...(supportInstances.userData ?? {}),
    [FOREST_LOG_BRIDGE_KEY]: axis,
    routeInstancedPart: 'forest-log-support',
  };
  const supportMatrixScratch = new three.Matrix4();
  for (let index = 0; index < supportOffsets.length; index += 1) {
    const offset = supportOffsets[index]!;
    supportInstances.setMatrixAt(
      index,
      writeRouteInstancedScalePositionMatrix(
        supportMatrixScratch,
        offset.x,
        -0.12,
        offset.z,
        1,
        1,
        1
      )
    );
  }
  group.add(supportInstances);
  yield {
    completedSteps: 2,
    totalSteps,
    label: 'supports',
  };

  return group;
}

function getForestLogBridgeMaterials(three: ThreeHostLike) {
  let cached = forestLogBridgeMaterialCache.get(three as object);
  if (!cached) {
    cached = {
      trunkMaterial: new three.MeshStandardMaterial({
        color: '#5b3a22',
        roughness: 0.94,
        metalness: 0.02,
      }),
      supportMaterial: new three.MeshStandardMaterial({
        color: '#3f2a18',
        roughness: 0.96,
        metalness: 0.02,
      }),
    };
    forestLogBridgeMaterialCache.set(three as object, cached);
  }
  return cached;
}

function* createDockGroupProgressive({
  three,
  state,
  tileX,
  tileY,
}: Pick<
  Create3DModelContext,
  'three' | 'state' | 'tileX' | 'tileY'
>): Generator<Create3DModelProgress, unknown, void> {
  const info = getDockClusterInfo(state, tileX, tileY);
  const style = getDockStyle(
    three,
    info.clusterKey,
    info.anchorX,
    info.anchorY
  );
  const alongX = info.axis === 'ew';
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);
  const totalSteps = 3;

  const deck = new three.Mesh(
    new three.BoxGeometry(alongX ? 1.02 : 0.64, 0.07, alongX ? 0.64 : 1.02),
    style.deckMaterial
  );
  deck.position.y = -0.035;
  group.add(deck);

  const railInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.railMaterial,
    2
  );
  railInstances.userData = {
    ...(railInstances.userData ?? {}),
    dockInstancedPart: 'rail',
  };
  const railMatrixScratch = new three.Matrix4();
  for (const [index, side] of [-1, 1].entries()) {
    railInstances.setMatrixAt(
      index,
      writeRouteInstancedScalePositionMatrix(
        railMatrixScratch,
        alongX ? 0 : side * 0.24,
        0.08,
        alongX ? side * 0.24 : 0,
        alongX ? 1.04 : 0.04,
        0.04,
        alongX ? 0.04 : 1.04
      )
    );
  }
  group.add(railInstances);

  const pileOffsets = alongX
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
      ];
  const pileInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.pileMaterial,
    pileOffsets.length
  );
  pileInstances.userData = {
    ...(pileInstances.userData ?? {}),
    dockInstancedPart: 'pile',
  };
  const pileMatrixScratch = new three.Matrix4();
  for (let index = 0; index < pileOffsets.length; index += 1) {
    const [xOffset, zOffset] = pileOffsets[index]!;
    pileInstances.setMatrixAt(
      index,
      writeRouteInstancedScalePositionMatrix(
        pileMatrixScratch,
        xOffset,
        -0.03,
        zOffset,
        0.06,
        0.2,
        0.06
      )
    );
  }
  group.add(pileInstances);

  yield {
    completedSteps: 1,
    totalSteps,
    label: 'deck-and-piles',
  };

  if (shouldRenderDockBoat(state, tileX, tileY, info)) {
    addDockBoat(group, three, state, style, alongX, tileX, tileY, info);
  }

  yield {
    completedSteps: 2,
    totalSteps,
    label: 'boat',
  };

  const route = resolveDockBoatRoute(state, tileX, tileY);
  if (route && info.segmentIndex === 0) {
    addDockRouteSign(group, three, state, style, alongX, tileX, tileY, route);
  }

  yield {
    completedSteps: 3,
    totalSteps,
    label: 'route-sign',
  };

  return group;
}

function addDockRouteSign(
  group: ThreeObject3DLike,
  three: ThreeHostLike,
  state: WorldStateLike,
  style: DockStyle,
  alongX: boolean,
  tileX: number,
  tileY: number,
  route: NonNullable<ReturnType<typeof resolveDockBoatRoute>>
) {
  const destinations = route.stops.filter(
    (_stop, index) => index !== route.currentStopIndex
  );
  if (destinations.length === 0) {
    return;
  }

  const side = getDockLandwardSide(state, tileX, tileY, alongX);
  const signOriginX = alongX ? 0 : side * -0.28;
  const signOriginZ = alongX ? side * -0.28 : 0;
  const signRotationY = alongX ? 0 : Math.PI * 0.5;
  const signMetadata = {
    dockRouteSign: true,
    dockRouteBoatName: route.boatName,
    dockRouteStops: destinations.map((destination) => destination.name),
  };
  const post = new three.Mesh(
    new three.BoxGeometry(0.05, 0.52, 0.05),
    style.pileMaterial
  );
  post.position.set(signOriginX, 0.22, signOriginZ);
  post.rotation.y = signRotationY;
  post.userData = {
    ...(post.userData ?? {}),
    ...signMetadata,
    dockRouteSignPart: 'post',
  };
  group.add(post);

  const mainBoard = new three.Mesh(
    new three.BoxGeometry(0.46, 0.12, 0.04),
    style.trimMaterial
  );
  mainBoard.position.set(signOriginX, 0.46, signOriginZ);
  mainBoard.rotation.y = signRotationY;
  mainBoard.userData = {
    ...(mainBoard.userData ?? {}),
    ...signMetadata,
    dockRouteSignPart: 'main-board',
  };
  group.add(mainBoard);

  const mainLabel = createDockRouteLabelPlane(three, {
    boatName: route.boatName,
    stopName: '',
    width: 0.42,
    height: 0.09,
    key: `boat:${route.boatName}`,
  });
  const mainLabelOffset = rotateRouteLocalOffset(0, 0.03, signRotationY);
  mainLabel.position.set(
    signOriginX + mainLabelOffset.x,
    0.46,
    signOriginZ + mainLabelOffset.z
  );
  mainLabel.rotation.y = signRotationY;
  mainLabel.userData = {
    ...(mainLabel.userData ?? {}),
    ...signMetadata,
    dockRouteSignPart: 'main-label',
  };
  group.add(mainLabel);

  const visibleDestinations = destinations.slice(0, 3);
  if (visibleDestinations.length > 0) {
    const placardInstances = new three.InstancedMesh(
      new three.BoxGeometry(0.38, 0.1, 0.035),
      style.deckMaterial,
      visibleDestinations.length
    );
    placardInstances.userData = {
      ...(placardInstances.userData ?? {}),
      ...signMetadata,
      dockRouteSignPart: 'stop-placard',
    };
    const placardMatrixScratch = new three.Matrix4();

    visibleDestinations.forEach((destination, index) => {
      placardInstances.setMatrixAt(
        index,
        writeRouteInstancedScalePositionMatrix(
          placardMatrixScratch,
          signOriginX,
          0.32 - index * 0.12,
          signOriginZ,
          1,
          1,
          1
        )
      );

      const label = createDockRouteLabelPlane(three, {
        boatName: route.boatName,
        stopName: destination.name,
        width: 0.34,
        height: 0.075,
        key: `stop:${route.boatName}:${destination.name}`,
      });
      const labelOffset = rotateRouteLocalOffset(0, 0.025, signRotationY);
      label.position.set(
        signOriginX + labelOffset.x,
        0.32 - index * 0.12,
        signOriginZ + labelOffset.z
      );
      label.rotation.y = signRotationY;
      label.userData = {
        ...(label.userData ?? {}),
        ...signMetadata,
        dockRouteSignPart: 'stop-label',
      };
      group.add(label);
    });
    group.add(placardInstances);
  }
}

function createDockRouteLabelPlane(
  three: ThreeHostLike,
  options: {
    boatName: string;
    stopName: string;
    width: number;
    height: number;
    key: string;
  }
) {
  const texture = getOrCreatePaintedCanvasTexture(
    dockRouteLabelCache,
    options.key,
    three,
    {
      width: 256,
      height: 80,
      wrap: false,
      paint(context, canvas) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#f5deb3';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#5a3418';
        context.lineWidth = 6;
        context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        context.fillStyle = '#2b1a0f';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        if (options.stopName.length === 0) {
          context.font = 'bold 26px sans-serif';
          context.fillText(
            options.boatName,
            canvas.width * 0.5,
            canvas.height * 0.5
          );
          return;
        }
        context.font = 'bold 24px sans-serif';
        context.fillText(
          options.stopName,
          canvas.width * 0.5,
          canvas.height * 0.5
        );
      },
    }
  );
  return createTexturedPlaneMesh(three, {
    width: options.width,
    height: options.height,
    texture,
  });
}

function getDockLandwardSide(
  state: WorldStateLike,
  tileX: number,
  tileY: number,
  alongX: boolean
) {
  const candidates = alongX
    ? [
        { offset: -1, kind: state.getCurrentTile(tileX, tileY - 1).kind },
        { offset: 1, kind: state.getCurrentTile(tileX, tileY + 1).kind },
      ]
    : [
        { offset: -1, kind: state.getCurrentTile(tileX - 1, tileY).kind },
        { offset: 1, kind: state.getCurrentTile(tileX + 1, tileY).kind },
      ];
  const landward = candidates.find(({ kind }) => !isWaterOrCrossingKind(kind));
  return landward?.offset ?? -1;
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
  return getForestLogBridgeAxis(state, tileX, tileY);
}

function isBridgeTravelKind(kind: Kind): boolean {
  return (
    kind === 'bridge' ||
    kind === 'dock' ||
    kind === 'road' ||
    isRouteTerminalKind(kind)
  );
}

function getForestLogBridgeAxis(
  state: WorldStateLike,
  tileX: number,
  tileY: number
): 'ew' | 'ns' | null {
  if (state.getCurrentTile(tileX, tileY).kind !== 'bridge') {
    return null;
  }
  const hasTravelNeighbors =
    isBridgeTravelKind(state.getCurrentTile(tileX - 1, tileY).kind) ||
    isBridgeTravelKind(state.getCurrentTile(tileX + 1, tileY).kind) ||
    isBridgeTravelKind(state.getCurrentTile(tileX, tileY - 1).kind) ||
    isBridgeTravelKind(state.getCurrentTile(tileX, tileY + 1).kind);
  if (hasTravelNeighbors) {
    return null;
  }

  const northForest = state.getCurrentTile(tileX, tileY - 1).kind === 'forest';
  const eastForest = state.getCurrentTile(tileX + 1, tileY).kind === 'forest';
  const southForest = state.getCurrentTile(tileX, tileY + 1).kind === 'forest';
  const westForest = state.getCurrentTile(tileX - 1, tileY).kind === 'forest';

  if (northForest && southForest && !(eastForest && westForest)) {
    return 'ns';
  }
  if (eastForest && westForest && !(northForest && southForest)) {
    return 'ew';
  }
  if (northForest && southForest) {
    return hash2D(FOREST_LOG_AXIS_SEED, tileX, tileY) > 0.5 ? 'ns' : 'ew';
  }
  if (eastForest && westForest) {
    return hash2D(FOREST_LOG_AXIS_SEED, tileX, tileY) > 0.5 ? 'ew' : 'ns';
  }
  return null;
}

function getDockClusterInfo(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  return dockClusterCache.getOrCreate(tileX, tileY, () => {
    const queue = [[tileX, tileY]];
    const visited = createCoordinateCache<true>();
    visited.set(tileX, tileY, true);
    const tiles: Array<{ x: number; y: number }> = [];
    let queueIndex = 0;

    while (queueIndex < queue.length) {
      const [currentX, currentY] = queue[queueIndex]!;
      queueIndex += 1;
      tiles.push({ x: currentX, y: currentY });
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]) {
        const nextX = currentX + dx;
        const nextY = currentY + dy;
        if (visited.has(nextX, nextY)) continue;
        if (state.getCurrentTile(nextX, nextY).kind !== 'dock') continue;
        visited.set(nextX, nextY, true);
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
    tiles.sort((left, right) =>
      axis === 'ew'
        ? left.x - right.x || left.y - right.y
        : left.y - right.y || left.x - right.x
    );
    const anchor = tiles[0]!;
    const clusterKey = `dock:${axis}:${anchor.x}:${anchor.y}`;

    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index]!;
      const negativeConnected =
        axis === 'ew'
          ? visited.has(tile.x - 1, tile.y)
          : visited.has(tile.x, tile.y - 1);
      const positiveConnected =
        axis === 'ew'
          ? visited.has(tile.x + 1, tile.y)
          : visited.has(tile.x, tile.y + 1);
      dockClusterCache.set(tile.x, tile.y, {
        axis,
        clusterKey,
        anchorX: anchor.x,
        anchorY: anchor.y,
        length: tiles.length,
        segmentIndex: index,
        connectNegative: negativeConnected,
        connectPositive: positiveConnected,
      });
    }

    return dockClusterCache.get(tileX, tileY)!;
  });
}

function getDockStyle(
  three: ThreeHostLike,
  clusterKey: string,
  tileX: number,
  tileY: number
) {
  return dockStyleCache
    .getOrCreate(clusterKey, () => {
      const regionX = Math.floor(tileX / DOCK_REGION_SIZE);
      const regionY = Math.floor(tileY / DOCK_REGION_SIZE);
      const palette =
        hash2D(DOCK_PALETTE_SEED, regionX, regionY) > 0.55
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
      return createHostMaterialResolver((host: ThreeHostLike): DockStyle => {
        const style = {
          deckMaterial: new host.MeshStandardMaterial({
            color: palette.deck,
            roughness: 0.92,
            metalness: 0.02,
          }),
          railMaterial: new host.MeshStandardMaterial({
            color: palette.rail,
            roughness: 0.88,
            metalness: 0.02,
          }),
          pileMaterial: new host.MeshStandardMaterial({
            color: palette.pile,
            roughness: 0.94,
            metalness: 0.02,
          }),
          boatMaterial: new host.MeshStandardMaterial({
            color: palette.boat,
            roughness: 0.84,
            metalness: 0.03,
          }),
          sailMaterial: new host.MeshStandardMaterial({
            color: palette.sail,
            roughness: 0.96,
            metalness: 0.01,
          }),
          trimMaterial: new host.MeshStandardMaterial({
            color: palette.trim,
            roughness: 0.85,
            metalness: 0.02,
          }),
        };
        return style;
      });
    })
    .createMaterials(three);
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
        Math.max(
          1,
          Math.round((remainingSegments * index) / targetSegmentCount)
        )
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

  return hash2D(DOCK_BOAT_SIDE_SEED, tileX, tileY) > 0.5
    ? waterSides[0]!.side
    : waterSides[1]!.side;
}

function addDockBoat(
  group: ThreeObject3DLike,
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
    return;
  }
  const route = resolveDockBoatRoute(state, tileX, tileY);
  const paddleBoat = !route;
  const boatOriginX = alongX ? 0 : side * 0.47;
  const boatOriginZ = alongX ? side * 0.47 : 0;
  const boatRotationY = (alongX ? Math.PI * 0.5 : 0) + (side < 0 ? Math.PI : 0);
  const boatMetadata = {
    dockBoat: true,
    dockBoatClusterLength: info.length,
    dockPaddleBoat: paddleBoat,
  };
  const hullLength = 0.42 + hash2D(DOCK_BOAT_LENGTH_SEED, tileX, tileY) * 0.12;
  const hullWidth = 0.18 + hash2D(DOCK_BOAT_WIDTH_SEED, tileX, tileY) * 0.04;
  const hull = new three.Mesh(
    new three.BoxGeometry(
      alongX ? hullLength : hullWidth,
      0.09,
      alongX ? hullWidth : hullLength
    ),
    style.boatMaterial
  );
  hull.position.set(boatOriginX, -0.07, boatOriginZ);
  hull.rotation.y = boatRotationY;
  hull.userData = {
    ...(hull.userData ?? {}),
    ...boatMetadata,
  };
  group.add(hull);

  const prow = new three.Mesh(
    new three.BoxGeometry(
      alongX ? 0.08 : hullWidth * 0.72,
      0.1,
      alongX ? hullWidth * 0.72 : 0.08
    ),
    style.trimMaterial
  );
  const prowLocalOffset = alongX
    ? { x: side > 0 ? 0.16 : -0.16, z: 0 }
    : { x: 0, z: side > 0 ? 0.16 : -0.16 };
  const prowOffset = rotateRouteLocalOffset(
    prowLocalOffset.x,
    prowLocalOffset.z,
    boatRotationY
  );
  prow.position.set(
    boatOriginX + prowOffset.x,
    -0.045,
    boatOriginZ + prowOffset.z
  );
  prow.rotation.y = boatRotationY;
  group.add(prow);

  if (paddleBoat) {
    addDockPaddleBoatDetails(
      three,
      group,
      style,
      alongX,
      side,
      boatOriginX,
      boatOriginZ,
      boatRotationY,
      hullLength,
      hullWidth
    );
  } else if (hash2D(DOCK_BOAT_SAIL_SEED, tileX, tileY) > 0.48) {
    const mast = new three.Mesh(
      new three.BoxGeometry(0.03, 0.34, 0.03),
      style.trimMaterial
    );
    mast.position.set(boatOriginX, 0.12, boatOriginZ);
    mast.rotation.y = boatRotationY;
    group.add(mast);

    const sail = new three.Mesh(
      new three.BoxGeometry(alongX ? 0.02 : 0.16, 0.18, alongX ? 0.16 : 0.02),
      style.sailMaterial
    );
    const sailLocalOffset = alongX
      ? { x: 0.03 * side, z: 0 }
      : { x: 0, z: 0.03 * side };
    const sailOffset = rotateRouteLocalOffset(
      sailLocalOffset.x,
      sailLocalOffset.z,
      boatRotationY
    );
    sail.position.set(
      boatOriginX + sailOffset.x,
      0.14,
      boatOriginZ + sailOffset.z
    );
    sail.rotation.y = boatRotationY;
    group.add(sail);
  }
}

function addDockPaddleBoatDetails(
  three: ThreeHostLike,
  group: BridgeGroupLike,
  style: DockStyle,
  alongX: boolean,
  side: -1 | 1,
  boatOriginX: number,
  boatOriginZ: number,
  boatRotationY: number,
  hullLength: number,
  hullWidth: number
) {
  const wheelInstances = new three.InstancedMesh(
    new three.CylinderGeometry(0.09, 0.09, 0.04, 10),
    style.trimMaterial,
    2
  );
  wheelInstances.userData = {
    ...(wheelInstances.userData ?? {}),
    dockInstancedPart: 'paddle-wheel',
  };
  wheelInstances.rotation.x = Math.PI * 0.5;
  if (!alongX) {
    wheelInstances.rotation.z = Math.PI * 0.5;
  }
  wheelInstances.rotation.y = boatRotationY;
  wheelInstances.position.set(boatOriginX, 0, boatOriginZ);
  const wheelMatrixScratch = new three.Matrix4();
  for (const [index, lateral] of [-1, 1].entries()) {
    wheelInstances.setMatrixAt(
      index,
      writeRouteInstancedScalePositionMatrix(
        wheelMatrixScratch,
        alongX ? 0 : lateral * (hullWidth * 0.65),
        -0.03,
        alongX ? lateral * (hullWidth * 0.65) : 0,
        1,
        1,
        1
      )
    );
  }
  group.add(wheelInstances);

  const cabin = new three.Mesh(
    new three.BoxGeometry(
      alongX ? hullLength * 0.48 : hullWidth * 0.72,
      0.14,
      alongX ? hullWidth * 0.72 : hullLength * 0.48
    ),
    style.deckMaterial
  );
  cabin.position.set(boatOriginX, 0.05, boatOriginZ);
  cabin.rotation.y = boatRotationY;
  group.add(cabin);

  const ramp = new three.Mesh(
    new three.BoxGeometry(
      alongX ? 0.18 : hullWidth * 0.66,
      0.03,
      alongX ? hullWidth * 0.66 : 0.18
    ),
    style.deckMaterial
  );
  ramp.userData = {
    ...(ramp.userData ?? {}),
    dockPaddleBoatRampLowered: true,
  };
  const rampLocalOffset = alongX
    ? { x: side > 0 ? hullLength * 0.38 : -hullLength * 0.38, z: 0 }
    : { x: 0, z: side > 0 ? hullLength * 0.38 : -hullLength * 0.38 };
  const rampOffset = rotateRouteLocalOffset(
    rampLocalOffset.x,
    rampLocalOffset.z,
    boatRotationY
  );
  if (alongX) {
    ramp.position.set(
      boatOriginX + rampOffset.x,
      -0.09,
      boatOriginZ + rampOffset.z
    );
    ramp.rotation.z = side > 0 ? -0.42 : 0.42;
  } else {
    ramp.position.set(
      boatOriginX + rampOffset.x,
      -0.09,
      boatOriginZ + rampOffset.z
    );
    ramp.rotation.x = side > 0 ? 0.42 : -0.42;
  }
  ramp.rotation.y = boatRotationY;
  group.add(ramp);
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
  const parapetInstances = new three.InstancedMesh(
    new three.BoxGeometry(
      alongX ? length : railThickness,
      BRIDGE_RAIL_HEIGHT,
      alongX ? railThickness : length
    ),
    style.railMaterial,
    2
  );
  parapetInstances.userData = {
    ...(parapetInstances.userData ?? {}),
    routeInstancedPart: 'bridge-parapet',
  };
  const parapetMatrixScratch = new three.Matrix4();
  if (alongX) {
    parapetInstances.setMatrixAt(
      0,
      writeRouteInstancedScalePositionMatrix(
        parapetMatrixScratch,
        0,
        BRIDGE_RAIL_HEIGHT * 0.5,
        -sideOffset,
        1,
        1,
        1
      )
    );
    parapetInstances.setMatrixAt(
      1,
      writeRouteInstancedScalePositionMatrix(
        parapetMatrixScratch,
        0,
        BRIDGE_RAIL_HEIGHT * 0.5,
        sideOffset,
        1,
        1,
        1
      )
    );
  } else {
    parapetInstances.setMatrixAt(
      0,
      writeRouteInstancedScalePositionMatrix(
        parapetMatrixScratch,
        -sideOffset,
        BRIDGE_RAIL_HEIGHT * 0.5,
        0,
        1,
        1,
        1
      )
    );
    parapetInstances.setMatrixAt(
      1,
      writeRouteInstancedScalePositionMatrix(
        parapetMatrixScratch,
        sideOffset,
        BRIDGE_RAIL_HEIGHT * 0.5,
        0,
        1,
        1,
        1
      )
    );
  }
  group.add(parapetInstances);
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
  const railInstances = new three.InstancedMesh(
    new three.BoxGeometry(
      alongX ? deckLength + 0.02 : 0.05,
      0.05,
      alongX ? 0.05 : deckLength + 0.02
    ),
    style.railMaterial,
    2
  );
  railInstances.userData = {
    ...(railInstances.userData ?? {}),
    routeInstancedPart: 'bridge-railing-rail',
  };
  const railMatrixScratch = new three.Matrix4();
  const railPostInstances = new three.InstancedMesh(
    new three.BoxGeometry(0.05, BRIDGE_RAIL_HEIGHT, 0.05),
    style.postMaterial,
    postCount * 2
  );
  railPostInstances.userData = {
    ...(railPostInstances.userData ?? {}),
    routeInstancedPart: 'bridge-railing-post',
  };
  const railPostMatrixScratch = new three.Matrix4();
  let nextRailPostIndex = 0;
  let nextRailIndex = 0;
  for (let side = -1; side <= 1; side += 2) {
    if (alongX) {
      railInstances.setMatrixAt(
        nextRailIndex,
        writeRouteInstancedScalePositionMatrix(
          railMatrixScratch,
          0,
          BRIDGE_RAIL_HEIGHT,
          side * sideOffset,
          1,
          1,
          1
        )
      );
    } else {
      railInstances.setMatrixAt(
        nextRailIndex,
        writeRouteInstancedScalePositionMatrix(
          railMatrixScratch,
          side * sideOffset,
          BRIDGE_RAIL_HEIGHT,
          0,
          1,
          1,
          1
        )
      );
    }
    nextRailIndex += 1;

    for (let index = 0; index < postCount; index += 1) {
      const t = postCount === 1 ? 0.5 : index / (postCount - 1);
      const local = -deckLength * 0.5 + t * deckLength;
      if (alongX) {
        railPostInstances.setMatrixAt(
          nextRailPostIndex,
          writeRouteInstancedScalePositionMatrix(
            railPostMatrixScratch,
            local,
            BRIDGE_RAIL_HEIGHT * 0.5,
            side * sideOffset,
            1,
            1,
            1
          )
        );
      } else {
        railPostInstances.setMatrixAt(
          nextRailPostIndex,
          writeRouteInstancedScalePositionMatrix(
            railPostMatrixScratch,
            side * sideOffset,
            BRIDGE_RAIL_HEIGHT * 0.5,
            local,
            1,
            1,
            1
          )
        );
      }
      nextRailPostIndex += 1;
    }
  }
  group.add(railInstances);
  group.add(railPostInstances);

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
  const coverPostInstances = new three.InstancedMesh(
    new three.BoxGeometry(0.05, postHeight, 0.05),
    style.postMaterial,
    spanCount * 2
  );
  coverPostInstances.userData = {
    ...(coverPostInstances.userData ?? {}),
    routeInstancedPart: 'bridge-cover-post',
  };
  const coverPostMatrixScratch = new three.Matrix4();
  let nextCoverPostIndex = 0;
  for (let index = 0; index < spanCount; index += 1) {
    const t = spanCount === 1 ? 0.5 : index / (spanCount - 1);
    const local = -deckLength * 0.5 + t * deckLength;
    for (let side = -1; side <= 1; side += 2) {
      if (alongX) {
        coverPostInstances.setMatrixAt(
          nextCoverPostIndex,
          writeRouteInstancedScalePositionMatrix(
            coverPostMatrixScratch,
            local,
            postHeight * 0.5,
            side * postOffset,
            1,
            1,
            1
          )
        );
      } else {
        coverPostInstances.setMatrixAt(
          nextCoverPostIndex,
          writeRouteInstancedScalePositionMatrix(
            coverPostMatrixScratch,
            side * postOffset,
            postHeight * 0.5,
            local,
            1,
            1,
            1
          )
        );
      }
      nextCoverPostIndex += 1;
    }
  }
  group.add(coverPostInstances);

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
  const frameInstances = new three.InstancedMesh(
    new three.BoxGeometry(0.09, 0.42, 0.09),
    style.postMaterial,
    2
  );
  frameInstances.userData = {
    ...(frameInstances.userData ?? {}),
    routeInstancedPart: 'drawbridge-frame',
  };
  const frameMatrixScratch = new three.Matrix4();
  let nextFrameIndex = 0;
  for (let side = -1; side <= 1; side += 2) {
    if (alongX) {
      frameInstances.setMatrixAt(
        nextFrameIndex,
        writeRouteInstancedScalePositionMatrix(
          frameMatrixScratch,
          side * towerOffset,
          0.21,
          0,
          1,
          1,
          1
        )
      );
    } else {
      frameInstances.setMatrixAt(
        nextFrameIndex,
        writeRouteInstancedScalePositionMatrix(
          frameMatrixScratch,
          0,
          0.21,
          side * towerOffset,
          1,
          1,
          1
        )
      );
    }
    nextFrameIndex += 1;
  }
  group.add(frameInstances);

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

function writeRouteInstancedScalePositionMatrix(
  target: InstanceType<ThreeHostLike['Matrix4']>,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
) {
  return target.set(
    scaleX,
    0,
    0,
    x,
    0,
    scaleY,
    0,
    y,
    0,
    0,
    scaleZ,
    z,
    0,
    0,
    0,
    1
  );
}

function rotateRouteLocalOffset(
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

function getBridgeClusterInfo(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  return bridgeClusterCache.getOrCreate(tileX, tileY, () => {
    const queue = [[tileX, tileY]];
    const visited = createCoordinateCache<true>();
    visited.set(tileX, tileY, true);
    const tiles: { x: number; y: number }[] = [];
    let queueIndex = 0;

    while (queueIndex < queue.length) {
      const [currentX, currentY] = queue[queueIndex]!;
      queueIndex += 1;
      tiles.push({ x: currentX, y: currentY });
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]) {
        const nextX = currentX + dx;
        const nextY = currentY + dy;
        if (visited.has(nextX, nextY)) continue;
        if (state.getCurrentTile(nextX, nextY).kind !== 'bridge') continue;
        visited.set(nextX, nextY, true);
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
    tiles.sort((left, right) =>
      axis === 'ew'
        ? left.x - right.x || left.y - right.y
        : left.y - right.y || left.x - right.x
    );
    const anchor = tiles[0]!;
    const clusterKey = `${axis}:${anchor.x}:${anchor.y}`;

    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index]!;
      const negativeConnected =
        axis === 'ew'
          ? visited.has(tile.x - 1, tile.y)
          : visited.has(tile.x, tile.y - 1);
      const positiveConnected =
        axis === 'ew'
          ? visited.has(tile.x + 1, tile.y)
          : visited.has(tile.x, tile.y + 1);
      bridgeClusterCache.set(tile.x, tile.y, {
        axis,
        clusterKey,
        anchorX: anchor.x,
        anchorY: anchor.y,
        length: tiles.length,
        segmentIndex: index,
        connectNegative: negativeConnected,
        connectPositive: positiveConnected,
      });
    }

    return bridgeClusterCache.get(tileX, tileY)!;
  });
}

function getBridgeStyle(
  three: ThreeHostLike,
  clusterKey: string,
  tileX: number,
  tileY: number
) {
  return bridgeStyleCache
    .getOrCreate(clusterKey, () => {
      const regionX = Math.floor(tileX / BRIDGE_REGION_SIZE);
      const regionY = Math.floor(tileY / BRIDGE_REGION_SIZE);
      const typeIndex = Math.floor(hash2D(BRIDGE_TYPE_SEED, tileX, tileY) * 4);
      const type = ['wood', 'stone', 'metal', 'drawbridge'][typeIndex] as
        'wood' | 'stone' | 'metal' | 'drawbridge';
      const covered = hash2D(BRIDGE_COVERED_SEED, regionX, regionY) > 0.72;
      const drawbridge = type === 'drawbridge';
      const pillarSpacing =
        2 + Math.floor(hash2D(BRIDGE_PILLAR_SEED, tileX, tileY) * 3);
      const palette =
        type === 'stone'
          ? { deck: '#c9c2b8', rail: '#8b857d', trim: '#6d655d' }
          : type === 'metal'
            ? { deck: '#9b6b3d', rail: '#8e9aa7', trim: '#4b5563' }
            : { deck: '#8b5a2b', rail: '#6f4a28', trim: '#4a2f1b' };
      const sharedStyle = {
        type,
        covered: covered && !drawbridge,
        drawbridge,
        widthJitter: hash2D(BRIDGE_WIDTH_SEED, tileX, tileY) * 0.12,
        coverHeight: hash2D(BRIDGE_COVER_HEIGHT_SEED, tileX, tileY) * 0.16,
        pillarSpacing,
        pillarWidth:
          0.14 + hash2D(BRIDGE_PILLAR_WIDTH_SEED, tileX, tileY) * 0.09,
      };
      return {
        ...sharedStyle,
        createMaterials(host: ThreeHostLike): BridgeStyle {
          return {
            ...sharedStyle,
            ...getBridgeAppearance(host, regionX, regionY, type, palette),
          };
        },
      };
    })
    .createMaterials(three);
}

function getBridgeAppearance(
  three: ThreeHostLike,
  regionX: number,
  regionY: number,
  type: BridgeStyle['type'],
  palette: {
    deck: string;
    rail: string;
    trim: string;
  }
): BridgeAppearance {
  const appearanceKey = `${regionX}:${regionY}:${type}`;

  return bridgeAppearanceCache
    .getOrCreate(appearanceKey, () =>
      createHostMaterialResolver((host: ThreeHostLike): BridgeAppearance => {
        const deckTexture = createBridgeTexture(
          host,
          palette.deck,
          palette.trim,
          type,
          'deck',
          regionX,
          regionY
        );
        const railTexture = createBridgeTexture(
          host,
          palette.rail,
          palette.trim,
          type,
          'rail',
          regionX,
          regionY
        );
        const coverTexture = createBridgeTexture(
          host,
          palette.deck,
          palette.trim,
          type === 'stone' ? 'roof-stone' : 'roof',
          'cover',
          regionX,
          regionY
        );

        return {
          deckMaterial: new host.MeshStandardMaterial({
            color: '#ffffff',
            map: deckTexture,
            roughness: 0.9,
            metalness: type === 'metal' ? 0.28 : 0.04,
          }),
          railMaterial: new host.MeshStandardMaterial({
            color: '#ffffff',
            map: railTexture,
            roughness: 0.86,
            metalness: type === 'metal' ? 0.36 : 0.05,
          }),
          postMaterial: new host.MeshStandardMaterial({
            color: palette.trim,
            roughness: 0.88,
            metalness: type === 'metal' ? 0.22 : 0.03,
          }),
          trimMaterial: new host.MeshStandardMaterial({
            color: palette.trim,
            roughness: 0.82,
            metalness: type === 'metal' ? 0.34 : 0.04,
          }),
          coverMaterial: new host.MeshStandardMaterial({
            color: '#ffffff',
            map: coverTexture,
            roughness: 0.9,
            metalness: 0.03,
          }),
          pillarMaterial: new host.MeshStandardMaterial({
            color: '#ffffff',
            map: railTexture,
            roughness: 0.92,
            metalness: type === 'metal' ? 0.18 : 0.02,
          }),
        };
      })
    )
    .createMaterials(three);
}

function createBridgeTexture(
  three: ThreeHostLike,
  baseColor: string,
  accentColor: string,
  type: BridgeTextureType,
  layer: BridgeTextureLayer,
  patternX: number,
  patternY: number
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
            hash2D(BRIDGE_RIVET_X_SEED, patternX, index + patternY) *
              canvas.width
          );
          const y = Math.floor(
            hash2D(BRIDGE_RIVET_Y_SEED, patternY, index + patternX) *
              canvas.height
          );
          context.fillStyle = 'rgba(255,255,255,0.34)';
          context.fillRect(x, y, 2, 2);
        }
      } else {
        for (let column = 0; column < canvas.width; column += 7) {
          const shade = 70 + ((column * 5 + patternX * 3) % 36);
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

interface BridgeStyleBlueprint extends Omit<
  BridgeStyle,
  | 'deckMaterial'
  | 'railMaterial'
  | 'postMaterial'
  | 'trimMaterial'
  | 'coverMaterial'
  | 'pillarMaterial'
> {
  createMaterials(three: ThreeHostLike): BridgeStyle;
}

type BridgeAppearance = Pick<
  BridgeStyle,
  | 'deckMaterial'
  | 'railMaterial'
  | 'postMaterial'
  | 'trimMaterial'
  | 'coverMaterial'
  | 'pillarMaterial'
>;

interface BridgeAppearanceBlueprint {
  createMaterials(three: ThreeHostLike): BridgeAppearance;
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

interface DockStyleBlueprint {
  createMaterials(three: ThreeHostLike): DockStyle;
}
