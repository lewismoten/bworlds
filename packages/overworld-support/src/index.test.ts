import { describe, expect, it } from 'vitest';
import {
  collectNearbyOverworldPoiAnchors,
  composeOverworldTileFromPlugins,
  createCachedOverworldTileResolver,
  createOverworldAnchorResolver,
  createRiverCurvePoints,
  createRiverControlPoints,
  createRiverForkPath,
  createOverworldTerrainSignalSampler,
  createOverworldGenerationContext,
  createGeneratedNamedOverworldCellAnchorSpec,
  createGeneratedPoiOverworldCellAnchorSpec,
  createOverworldCellAnchorCandidate,
  getOverworldPlacementChance,
  getOverworldPlacementLabelHash,
  getRiverControlPathSignalAtPoint,
  isNearOverworldLand,
  resolveOverworldCellAnchor,
} from './index.ts';
import type { PluginRegistryLike } from '@bworlds/plugin-api';

function normalizeAngleDelta(delta: number): number {
  let normalized = delta;
  while (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  }
  while (normalized < -Math.PI) {
    normalized += Math.PI * 2;
  }
  return normalized;
}

function getDistanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const squaredLength = deltaX * deltaX + deltaY * deltaY;
  if (squaredLength === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        squaredLength
    )
  );
  const closestX = start.x + deltaX * projection;
  const closestY = start.y + deltaY * projection;
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function getAccumulatedTurn(points: { x: number; y: number }[]): number {
  let totalTurn = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const entryAngle = Math.atan2(current.y - previous.y, current.x - previous.x);
    const exitAngle = Math.atan2(next.y - current.y, next.x - current.x);
    totalTurn += Math.abs(normalizeAngleDelta(exitAngle - entryAngle));
  }
  return totalTurn;
}

function getLegacyRiverPathSignalAtPoint(
  points: { x: number; y: number }[],
  x: number,
  y: number
): number {
  let strongestSignal = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segmentDistance = getDistanceToSegment(
      { x, y },
      points[index - 1]!,
      points[index]!
    );
    const segmentSignal = Math.max(0, 1 - segmentDistance / 2.35);
    if (segmentSignal > strongestSignal) {
      strongestSignal = segmentSignal;
    }
  }
  return strongestSignal;
}

type GenerationContextPayload = Parameters<typeof createOverworldGenerationContext>[0];
type ComposeOverworldTilePayload = Parameters<typeof composeOverworldTileFromPlugins>[0];
type ResolveOverworldAnchorsPayload = Parameters<
  ReturnType<typeof createOverworldAnchorResolver>
>[0];

function createTestPluginRegistry(
  overrides: Partial<PluginRegistryLike> = {}
): PluginRegistryLike {
  return {
    getTilePlugin() {
      return null;
    },
    getTileDefinition() {
      return null;
    },
    getDefaultTileKind(fallback = 'plains') {
      return fallback;
    },
    getDefaultTileDefinition(fallback = null) {
      return fallback;
    },
    resolveTileDefinition(_kind, fallback = null) {
      return fallback;
    },
    listTileDefinitions() {
      return [];
    },
    listResolvedTileDefinitions(fallbackEntries = []) {
      return fallbackEntries;
    },
    classifyTerrainTile() {
      return null;
    },
    classifyOverworldTile() {
      return undefined;
    },
    canOccupy3D() {
      return undefined;
    },
    getSurfaceProfile3D() {
      return undefined;
    },
    getTraversalProfile3D() {
      return undefined;
    },
    paint2DOverlay() {
      return undefined;
    },
    resolveFloorKind3D() {
      return undefined;
    },
    resolveWorldEnvironment() {
      return {};
    },
    createWorldAction() {
      return undefined;
    },
    decorateOverworldTile(payload) {
      return payload.tile;
    },
    decorateTownTile(payload) {
      return payload.tile;
    },
    decorateBuildingTile(payload) {
      return payload.tile;
    },
    decorateDepthTile(payload) {
      return payload.tile;
    },
    createMap() {
      return null;
    },
    resolveOverworldTile() {
      return null;
    },
    resolveOverworldAnchors() {
      return {
        townAnchors: [],
        bridgeAnchors: [],
        poiAnchors: [],
      };
    },
    ...overrides,
  };
}

function createGenerationContextPayload(
  overrides: Partial<GenerationContextPayload> = {}
): GenerationContextPayload {
  return {
    seed: 'spec-seed',
    x: 8,
    y: -3,
    tile: { kind: 'plains' },
    sampleTerrainSignals: createOverworldTerrainSignalSampler('spec-seed'),
    plugins: createTestPluginRegistry(),
    ...overrides,
  };
}

function createComposeOverworldTilePayload(
  overrides: Partial<ComposeOverworldTilePayload> = {}
): ComposeOverworldTilePayload {
  return {
    seed: 'spec-seed',
    x: 4,
    y: 7,
    sampleTerrainSignals: createOverworldTerrainSignalSampler('spec-seed'),
    plugins: createTestPluginRegistry(),
    ...overrides,
  };
}

describe('overworld support', () => {
  it('creates deterministic terrain signal samplers from a seed', () => {
    const sampleA = createOverworldTerrainSignalSampler('spec-seed');
    const sampleB = createOverworldTerrainSignalSampler('spec-seed');

    expect(sampleA(12, -9)).toEqual(sampleB(12, -9));
    expect(sampleA(12, -9)).not.toEqual(sampleA(13, -9));
  });

  it('reuses cached terrain signal objects for repeated coordinate samples', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const first = sampleTerrainSignals(12, -9);
    const second = sampleTerrainSignals(12, -9);

    expect(second).toBe(first);
  });

  it('regenerates identical terrain signals after bounded cache eviction churn', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const baseline = sampleTerrainSignals(12, -9);

    for (let index = 0; index < 9000; index += 1) {
      sampleTerrainSignals((index % 180) - 90, Math.floor(index / 180) - 25);
    }

    expect(sampleTerrainSignals(12, -9)).toEqual(baseline);
  });

  it('creates deterministic river control points with 2-10 tile spacing', () => {
    const points = createRiverControlPoints('spec-seed', 1, -2);

    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points.length).toBeLessThanOrEqual(5);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
      expect(distance).toBeGreaterThanOrEqual(2);
      expect(distance).toBeLessThanOrEqual(10);
    }
  });

  it('connects river control points with sampled bezier curves', () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 6, y: 4 },
      { x: 10, y: 4 },
    ];
    const curvePoints = createRiverCurvePoints(controlPoints, 4);
    const middlePoint = curvePoints[2];

    expect(curvePoints.length).toBeGreaterThan(controlPoints.length);
    expect(curvePoints[0]).toEqual(controlPoints[0]);
    expect(curvePoints.at(-1)).toEqual(controlPoints.at(-1));
    expect(middlePoint.x).not.toBe(2);
    expect(middlePoint.y).not.toBe(0);
  });

  it('keeps bezier river sampling deterministic while preallocating the final curve buffer', () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 6, y: 4 },
      { x: 10, y: 4 },
    ];

    expect(createRiverCurvePoints(controlPoints, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 1.1111111111111112, y: -0.14814814814814814 },
      { x: 2.6666666666666665, y: -0.2962962962962963 },
      { x: 4, y: 0 },
      { x: 4.740740740740741, y: 1.1851851851851851 },
      { x: 5.2592592592592595, y: 2.814814814814815 },
      { x: 6, y: 4 },
      { x: 7.333333333333334, y: 4.296296296296297 },
      { x: 8.88888888888889, y: 4.148148148148148 },
      { x: 10, y: 4 },
    ]);
  });

  it('matches river path signals without materializing sampled curve points', () => {
    const controlPoints = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 6, y: 4 },
      { x: 10, y: 4 },
    ];
    const sampledCurvePoints = createRiverCurvePoints(controlPoints, 5);
    const sampleLocations = [
      { x: 1.25, y: -0.2 },
      { x: 4.9, y: 1.8 },
      { x: 8.4, y: 4.2 },
      { x: 12, y: 6 },
    ];

    for (const location of sampleLocations) {
      expect(
        getRiverControlPathSignalAtPoint(controlPoints, location.x, location.y, 5)
      ).toBeCloseTo(
        getLegacyRiverPathSignalAtPoint(sampledCurvePoints, location.x, location.y),
        12
      );
    }
  });

  it('can generate strongly meandering river control paths', () => {
    let foundCurvyPath = false;

    for (let cellY = -8; cellY <= 8 && !foundCurvyPath; cellY += 1) {
      for (let cellX = -8; cellX <= 8; cellX += 1) {
        const controlPoints = createRiverControlPoints('spec-seed', cellX, cellY);
        if (controlPoints.length < 4) {
          continue;
        }
        const curvePoints = createRiverCurvePoints(controlPoints, 6);
        if (getAccumulatedTurn(curvePoints) > Math.PI * 1.2) {
          foundCurvyPath = true;
          break;
        }
      }
    }

    expect(foundCurvyPath).toBe(true);
  });

  it('creates deterministic fork paths that branch away from the main river', () => {
    let forkSeedCell:
      | { seed: string; cellX: number; cellY: number; controlPoints: { x: number; y: number }[] }
      | undefined;

    for (let cellY = -4; cellY <= 4 && !forkSeedCell; cellY += 1) {
      for (let cellX = -4; cellX <= 4; cellX += 1) {
        const controlPoints = createRiverControlPoints('spec-seed', cellX, cellY);
        const fork = createRiverForkPath('spec-seed', cellX, cellY, controlPoints);
        if (fork) {
          forkSeedCell = { seed: 'spec-seed', cellX, cellY, controlPoints };
          break;
        }
      }
    }

    expect(forkSeedCell).toBeDefined();
    const fork = createRiverForkPath(
      forkSeedCell!.seed,
      forkSeedCell!.cellX,
      forkSeedCell!.cellY,
      forkSeedCell!.controlPoints
    );
    const repeatedFork = createRiverForkPath(
      forkSeedCell!.seed,
      forkSeedCell!.cellX,
      forkSeedCell!.cellY,
      forkSeedCell!.controlPoints
    );

    expect(fork).toEqual(repeatedFork);
    expect(fork?.points[0]).toEqual(
      forkSeedCell!.controlPoints[fork!.trunkStartIndex]
    );
    expect(fork?.points.at(-1)).toEqual(
      forkSeedCell!.controlPoints[fork!.trunkEndIndex]
    );
    expect(fork?.points.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(fork?.points[1]).not.toEqual(fork?.points[0]);
    const trunkStart = forkSeedCell!.controlPoints[fork!.trunkStartIndex];
    const trunkEnd = forkSeedCell!.controlPoints[fork!.trunkEndIndex];
    const maxOffset = Math.max(
      ...fork!.points.slice(1, -1).map((point) =>
        getDistanceToSegment(point, trunkStart, trunkEnd)
      ),
      0
    );
    expect(maxOffset).toBeGreaterThan(0.4);
  });

  it('keeps fork join segments within 45 degrees of the trunk heading', () => {
    let forkSeedCell:
      | { seed: string; cellX: number; cellY: number; controlPoints: { x: number; y: number }[] }
      | undefined;

    for (let cellY = -4; cellY <= 4 && !forkSeedCell; cellY += 1) {
      for (let cellX = -4; cellX <= 4; cellX += 1) {
        const controlPoints = createRiverControlPoints('spec-seed', cellX, cellY);
        const fork = createRiverForkPath('spec-seed', cellX, cellY, controlPoints);
        if (fork && fork.points.length >= 2) {
          forkSeedCell = { seed: 'spec-seed', cellX, cellY, controlPoints };
          break;
        }
      }
    }

    expect(forkSeedCell).toBeDefined();
    const fork = createRiverForkPath(
      forkSeedCell!.seed,
      forkSeedCell!.cellX,
      forkSeedCell!.cellY,
      forkSeedCell!.controlPoints
    );

    const joinSegments = [
      [fork!.points[0], fork!.points[1]],
      [fork!.points[fork!.points.length - 2], fork!.points[fork!.points.length - 1]],
    ] as const;

    for (const [start, end] of joinSegments) {
      const segmentAngle = Math.atan2(end.y - start.y, end.x - start.x);
      const delta = Math.abs(
        normalizeAngleDelta(segmentAngle - fork!.trunkAngle)
      );
      expect(delta).toBeLessThanOrEqual(Math.PI * 0.25 + 0.0001);
    }
  });

  it('raises river signals near river control path segments', () => {
    const points = createRiverControlPoints('spec-seed', 0, 0);
    const anchor = points[0]!;
    const nearSignal = getRiverControlPathSignalAtPoint(points, anchor.x, anchor.y);
    const farSignal = getRiverControlPathSignalAtPoint(
      points,
      anchor.x + 12,
      anchor.y + 12
    );

    expect(nearSignal).toBeGreaterThan(farSignal);
    expect(nearSignal - farSignal).toBeGreaterThan(0.08);
  });

  it('creates cached overworld tile resolvers for curated runtime overlays', () => {
    let calls = 0;
    const resolveTile = createCachedOverworldTileResolver(({ seed, x, y }) => {
      calls += 1;
      return {
        kind: 'plains',
        note: `${seed}:${x}:${y}`,
      };
    });

    const first = resolveTile({ seed: 'spec', x: 2, y: 3 });
    const second = resolveTile({ seed: 'spec', x: 2, y: 3 });
    const third = resolveTile({ seed: 'spec', x: 2, y: 4 });

    expect(first).toEqual(second);
    expect(third).toEqual(
      expect.objectContaining({
        note: 'spec:2:4',
      })
    );
    expect(calls).toBe(2);
  });

  it('caches null overworld tile resolver results without recomputing them', () => {
    let calls = 0;
    const resolveTile = createCachedOverworldTileResolver(({ x }) => {
      calls += 1;
      return x === 0 ? null : { kind: 'plains' };
    });

    expect(resolveTile({ seed: 'spec', x: 0, y: 3 })).toBeNull();
    expect(resolveTile({ seed: 'spec', x: 0, y: 3 })).toBeNull();
    expect(calls).toBe(1);
  });

  it('keeps cached overworld tile resolvers deterministic after bounded eviction churn', () => {
    let calls = 0;
    const resolveTile = createCachedOverworldTileResolver(({ seed, x, y }) => {
      calls += 1;
      return {
        kind: x === y ? 'town' : 'forest',
        note: `${seed}:${x}:${y}`,
      };
    });

    const baseline = resolveTile({ seed: 'spec-seed', x: 6, y: -2 });

    for (let index = 0; index < 5000; index += 1) {
      resolveTile({
        seed: 'spec-seed',
        x: (index % 100) - 50,
        y: Math.floor(index / 100) - 25,
      });
    }

    expect(resolveTile({ seed: 'spec-seed', x: 6, y: -2 })).toEqual(baseline);
    expect(calls).toBeGreaterThan(1);
  });

  it('exposes the shared near-land heuristic', () => {
    expect(
      isNearOverworldLand({
        continent: 0.6,
        elevation: 0.3,
        moisture: 0.4,
        riverSignal: 0.2,
        roadSignal: 0.5,
      })
    ).toBe(true);
    expect(
      isNearOverworldLand({
        continent: 0.2,
        elevation: 0.3,
        moisture: 0.4,
        riverSignal: 0.2,
        roadSignal: 0.5,
      })
    ).toBe(false);
  });

  it('builds reusable overworld generation contexts from shared samplers and plugins', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const context = createOverworldGenerationContext(createGenerationContextPayload({
      sampleTerrainSignals,
      plugins: createTestPluginRegistry({
        resolveOverworldAnchors() {
          return {
            townAnchors: [{ x: 10, y: -2, name: 'Spec Town' }],
            bridgeAnchors: [{ x: 6, y: -4 }],
            poiAnchors: [],
          };
        },
      }),
    }));

    expect(context.tile.kind).toBe('plains');
    expect(context.signals).toEqual(sampleTerrainSignals(8, -3));
    expect(context.townAnchors[0]).toEqual(
      expect.objectContaining({ name: 'Spec Town' })
    );
    expect(typeof context.townChance).toBe('number');
    expect(typeof context.signChance).toBe('number');
    expect(context.placementChances?.town).toBe(
      getOverworldPlacementChance('spec-seed', 'town', 8, -3)
    );
    expect(context.getPlacementChance?.('ruins')).toBe(
      getOverworldPlacementChance('spec-seed', 'ruins', 8, -3)
    );
  });

  it('reuses cached generation snapshots while keeping tile payloads isolated', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    let anchorCalls = 0;
    const plugins = createTestPluginRegistry({
      resolveOverworldAnchors() {
        anchorCalls += 1;
        return {
          townAnchors: [{ x: 4, y: 7 }],
          bridgeAnchors: [{ x: 5, y: 7 }],
          poiAnchors: [{ x: 6, y: 7, type: 'town', name: 'Spec Town' }],
        };
      },
    });

    const first = createOverworldGenerationContext(
      createGenerationContextPayload({
        x: 4,
        y: 7,
        tile: { kind: 'plains' },
        sampleTerrainSignals,
        plugins,
      })
    );
    const second = createOverworldGenerationContext(
      createGenerationContextPayload({
        x: 4,
        y: 7,
        tile: { kind: 'forest' },
        sampleTerrainSignals,
        plugins,
      })
    );

    expect(anchorCalls).toBe(1);
    expect(first.tile).toEqual({ kind: 'plains' });
    expect(second.tile).toEqual({ kind: 'forest' });
    expect(first.signals).toBe(second.signals);
    expect(first.townAnchors).toBe(second.townAnchors);
    expect(first.bridgeAnchors).toBe(second.bridgeAnchors);
    expect(first.poiAnchors).toBe(second.poiAnchors);
    expect(first).not.toBe(second);
  });

  it('creates generated named overworld anchor specs with deterministic names', () => {
    const spec = createGeneratedNamedOverworldCellAnchorSpec({
      id: 'town',
      nameType: 'town',
      cellSize: 20,
      chanceKey: 'town-anchor',
      offsetXKey: 'town-anchor-x',
      offsetYKey: 'town-anchor-y',
      threshold: 0.5,
      isSuitableTerrain() {
        return true;
      },
    });

    const anchor = spec.createAnchor({
      seed: 'spec-seed',
      x: 12,
      y: -4,
      chance: 0.9,
      cellX: 0,
      cellY: 0,
    });

    expect(anchor).toEqual(
      expect.objectContaining({
        x: 12,
        y: -4,
        name: expect.any(String),
      })
    );
    expect(spec.chanceKeyHash).toBe(getOverworldPlacementLabelHash('town-anchor'));
    expect(spec.offsetXKeyHash).toBe(getOverworldPlacementLabelHash('town-anchor-x'));
    expect(spec.offsetYKeyHash).toBe(getOverworldPlacementLabelHash('town-anchor-y'));
  });

  it('collects nearby poi anchors from shared grouped specs and caches', () => {
    const sampleTerrainSignals = () => ({
      continent: 0.6,
      elevation: 0.4,
      moisture: 0.4,
      riverSignal: 0.2,
      roadSignal: 0.3,
    });
    const specs = {
      cave: createGeneratedPoiOverworldCellAnchorSpec({
        id: 'cave',
        poiType: 'cave',
        cellSize: 18,
        chanceKey: 'cave-anchor',
        offsetXKey: 'cave-anchor-x',
        offsetYKey: 'cave-anchor-y',
        threshold: 0.1,
        isSuitableTerrain() {
          return true;
        },
      }),
      dungeon: createGeneratedPoiOverworldCellAnchorSpec({
        id: 'dungeon',
        poiType: 'dungeon',
        cellSize: 22,
        chanceKey: 'dungeon-anchor',
        offsetXKey: 'dungeon-anchor-x',
        offsetYKey: 'dungeon-anchor-y',
        threshold: 0.1,
        isSuitableTerrain() {
          return true;
        },
      }),
    } as const;

    const anchors = collectNearbyOverworldPoiAnchors({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      specs,
      caches: {
        cave: new Map(),
        dungeon: new Map(),
      },
      sampleTerrainSignals,
      minSpacing: 0,
      blockingAnchors: [],
      baseAnchors: [],
    });

    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.some((anchor) => anchor.type === 'cave')).toBe(true);
    expect(anchors.some((anchor) => anchor.type === 'dungeon')).toBe(true);
  });

  it('creates reusable grouped overworld anchor resolvers with internal caches', () => {
    const sampleTerrainSignals = () => ({
      continent: 0.6,
      elevation: 0.4,
      moisture: 0.4,
      riverSignal: 0.2,
      roadSignal: 0.3,
    });
    const resolver = createOverworldAnchorResolver({
      town: {
        spec: createGeneratedNamedOverworldCellAnchorSpec({
          id: 'town',
          nameType: 'town',
          cellSize: 20,
          chanceKey: 'town-anchor',
          offsetXKey: 'town-anchor-x',
          offsetYKey: 'town-anchor-y',
          threshold: 0.1,
          isSuitableTerrain() {
            return true;
          },
        }),
      },
      poi: {
        specs: {
          cave: createGeneratedPoiOverworldCellAnchorSpec({
            id: 'cave',
            poiType: 'cave',
            cellSize: 18,
            chanceKey: 'cave-anchor',
            offsetXKey: 'cave-anchor-x',
            offsetYKey: 'cave-anchor-y',
            threshold: 0.1,
            isSuitableTerrain() {
              return true;
            },
          }),
        },
        minSpacing: 0,
        baseAnchors({ townAnchors }) {
          return townAnchors.map((anchor) => ({
            ...anchor,
            type: 'town',
          }));
        },
      },
    });

    const payload: ResolveOverworldAnchorsPayload = {
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals,
    };
    const first = resolver(payload);
    const second = resolver(payload);

    expect(first).toEqual(second);
    expect(second.townAnchors).toBe(first.townAnchors);
    expect(second.poiAnchors).toBe(first.poiAnchors);
    expect(first.townAnchors.length).toBeGreaterThan(0);
    expect(first.poiAnchors.some((anchor) => anchor.type === 'town')).toBe(true);
    expect(first.poiAnchors.some((anchor) => anchor.type === 'cave')).toBe(true);
  });

  it('keeps grouped overworld anchor resolvers deterministic after bounded eviction churn', () => {
    const sampleTerrainSignals = () => ({
      continent: 0.6,
      elevation: 0.4,
      moisture: 0.4,
      riverSignal: 0.2,
      roadSignal: 0.3,
    });
    const resolver = createOverworldAnchorResolver({
      town: {
        spec: createGeneratedNamedOverworldCellAnchorSpec({
          id: 'town',
          nameType: 'town',
          cellSize: 20,
          chanceKey: 'town-anchor',
          offsetXKey: 'town-anchor-x',
          offsetYKey: 'town-anchor-y',
          threshold: 0.1,
          isSuitableTerrain() {
            return true;
          },
        }),
      },
      poi: {
        specs: {
          cave: createGeneratedPoiOverworldCellAnchorSpec({
            id: 'cave',
            poiType: 'cave',
            cellSize: 18,
            chanceKey: 'cave-anchor',
            offsetXKey: 'cave-anchor-x',
            offsetYKey: 'cave-anchor-y',
            threshold: 0.1,
            isSuitableTerrain() {
              return true;
            },
          }),
        },
        minSpacing: 0,
        baseAnchors({ townAnchors }) {
          return townAnchors.map((anchor) => ({
            ...anchor,
            type: 'town',
          }));
        },
      },
    });

    const baseline = resolver({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals,
    });

    for (let index = 0; index < 2200; index += 1) {
      resolver({
        seed: 'spec-seed',
        x: (index % 120) - 60,
        y: Math.floor(index / 120) - 10,
        sampleTerrainSignals,
      });
    }

    expect(
      resolver({
        seed: 'spec-seed',
        x: 0,
        y: 0,
        sampleTerrainSignals,
      })
    ).toEqual(baseline);
  });

  it('reuses candidate terrain evaluation across overlapping anchor conflict checks', () => {
    const sampleCounts = new Map<string, number>();
    const sampleTerrainSignals = (x: number, y: number) => {
      const key = `${x}:${y}`;
      sampleCounts.set(key, (sampleCounts.get(key) ?? 0) + 1);
      return {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.2,
        roadSignal: 0.2,
      };
    };
    const spec = createGeneratedNamedOverworldCellAnchorSpec({
      id: 'town',
      nameType: 'town',
      cellSize: 1,
      chanceKey: 'chance',
      offsetXKey: 'offset-x',
      offsetYKey: 'offset-y',
      offsetScale: 0,
      threshold: -1,
      isSuitableTerrain() {
        return true;
      },
    });

    resolveOverworldCellAnchor({
      seed: 'spec-seed',
      cellX: 0,
      cellY: 0,
      spec,
      sampleTerrainSignals,
      cache: new Map(),
      minSpacing: 1,
      conflictSpecs: [spec],
      evaluationCache: new Map(),
    });

    expect(sampleCounts.size).toBeGreaterThan(1);
    expect(Math.max(...sampleCounts.values())).toBe(1);
  });

  it('reuses cached placement label hashes when building anchor candidates', () => {
    const spec = createGeneratedNamedOverworldCellAnchorSpec({
      id: 'town',
      nameType: 'town',
      cellSize: 20,
      chanceKey: 'town-anchor',
      offsetXKey: 'town-anchor-x',
      offsetYKey: 'town-anchor-y',
      threshold: 0.5,
      isSuitableTerrain() {
        return true;
      },
    });
    const uncachedSpec = {
      ...spec,
      chanceKeyHash: undefined,
      offsetXKeyHash: undefined,
      offsetYKeyHash: undefined,
    };
    const cachedCandidate = createOverworldCellAnchorCandidate(
      'spec-seed',
      2,
      -1,
      spec
    );
    const uncachedCandidate = createOverworldCellAnchorCandidate(
      'spec-seed',
      2,
      -1,
      uncachedSpec
    );

    expect(cachedCandidate.chance).toBe(uncachedCandidate.chance);
    expect(cachedCandidate.x).toBe(uncachedCandidate.x);
    expect(cachedCandidate.y).toBe(uncachedCandidate.y);
    expect(getOverworldPlacementLabelHash('sign')).toBe(
      getOverworldPlacementLabelHash('sign')
    );
  });

  it('composes overworld tiles through the shared plugin pipeline', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const calls: string[] = [];
    const contexts: object[] = [];
    const state = {
      timeMs: 1234,
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return null;
      },
    };
    const tile = composeOverworldTileFromPlugins(createComposeOverworldTilePayload({
      sampleTerrainSignals,
      state,
      plugins: createTestPluginRegistry({
        resolveOverworldTile() {
          calls.push('resolve');
          return null;
        },
        resolveOverworldAnchors() {
          calls.push('anchors');
          return {
            townAnchors: [],
            bridgeAnchors: [],
            poiAnchors: [],
          };
        },
        classifyTerrainTile(context) {
          contexts.push(context);
          calls.push(`terrain:${context.tile.kind}`);
          return { kind: 'river' };
        },
        classifyOverworldTile(context) {
          contexts.push(context);
          calls.push(`overworld:${context.tile.kind}`);
          return { kind: 'bridge' };
        },
        decorateOverworldTile(context) {
          contexts.push(context);
          calls.push(`decorate:${context.tile.kind}`);
          calls.push(`time:${context.state?.timeMs ?? 'none'}`);
          calls.push(
            `sampler:${typeof context.sampleTerrainSignals === 'function' ? 'yes' : 'no'}`
          );
          context.tile.note = 'decorated';
          return context.tile;
        },
      }),
    }));

    expect(tile).toEqual({
      kind: 'bridge',
      note: 'decorated',
    });
    expect(calls).toEqual([
      'resolve',
      'anchors',
      'terrain:plains',
      'overworld:river',
      'decorate:bridge',
      'time:1234',
      'sampler:yes',
    ]);
    expect(contexts[0]).toBe(contexts[1]);
    expect(contexts[1]).toBe(contexts[2]);
  });

  it('reuses cached generation snapshots across repeated composition for the same tile', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    let anchorCalls = 0;
    const plugins = createTestPluginRegistry({
      resolveOverworldTile() {
        return null;
      },
      resolveOverworldAnchors() {
        anchorCalls += 1;
        return {
          townAnchors: [],
          bridgeAnchors: [],
          poiAnchors: [],
        };
      },
      classifyTerrainTile(context) {
        return { kind: context.tile.kind };
      },
      classifyOverworldTile() {
        return null;
      },
      decorateOverworldTile(context) {
        return { ...context.tile };
      },
    });

    const first = composeOverworldTileFromPlugins(
      createComposeOverworldTilePayload({
        x: 2,
        y: -4,
        sampleTerrainSignals,
        plugins,
      })
    );
    const second = composeOverworldTileFromPlugins(
      createComposeOverworldTilePayload({
        x: 2,
        y: -4,
        sampleTerrainSignals,
        plugins,
      })
    );

    expect(anchorCalls).toBe(1);
    expect(second).toEqual(first);
  });

  it('uses the plugin-owned default tile kind as the initial overworld tile', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const tile = composeOverworldTileFromPlugins(createComposeOverworldTilePayload({
      sampleTerrainSignals,
      plugins: createTestPluginRegistry({
        getDefaultTileKind() {
          return 'ashlands';
        },
        resolveOverworldTile() {
          return null;
        },
        resolveOverworldAnchors() {
          return {
            townAnchors: [],
            bridgeAnchors: [],
            poiAnchors: [],
          };
        },
        classifyTerrainTile(context) {
          return { kind: context.tile.kind };
        },
        classifyOverworldTile() {
          return null;
        },
        decorateOverworldTile(context) {
          return context.tile;
        },
      }),
    }));

    expect(tile).toEqual({ kind: 'ashlands' });
  });

  it('short-circuits the plugin pipeline when a curated tile is resolved', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const tile = composeOverworldTileFromPlugins(createComposeOverworldTilePayload({
      x: 0,
      y: 0,
      sampleTerrainSignals,
      plugins: createTestPluginRegistry({
        resolveOverworldTile() {
          return { kind: 'town', note: 'curated' };
        },
        resolveOverworldAnchors() {
          throw new Error('should not resolve anchors');
        },
        classifyTerrainTile() {
          throw new Error('should not classify terrain');
        },
        classifyOverworldTile() {
          throw new Error('should not classify overworld');
        },
        decorateOverworldTile() {
          throw new Error('should not decorate');
        },
      }),
    }));

    expect(tile).toEqual({
      kind: 'town',
      note: 'curated',
    });
  });
});
