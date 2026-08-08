import { describe, expect, it, vi } from 'vitest';
import {
  collectSceneResourceStats,
  countRecentMetricEvents,
  disposeObject3DResources,
  applyObjectDistanceFade,
  clampCameraPitch,
  DEFAULT_CAMERA_PITCH,
  getRecentCountStats,
  getRecentDurationStats,
  getRenderChurnStats,
  buildPendingWorldBuildQueue,
  getDecoratedTileSurfaceHeight,
  getBoundaryPriority,
  getFarLandModelOpacity,
  getFacingVisibilityBucket,
  getWorldCurvatureOffset,
  getWeatherFogRange,
  getSkyAuroraSignature,
  getSkyConstellationSignature,
  getSkyEventSignature,
  getSkyMilkyWaySignature,
  getWrappedBatchWindow,
  getTwilightSkyPalette,
  getTileModelDetailLevel,
  getTileModelDetailLevelFromSquaredDistance,
  getTileModelDetailLevelWithHysteresis,
  getPendingWorldBuildDetailLevel,
  getVisibleWorldTileBuildOrder,
  pickCornerBoundaryProfile,
  prepareObjectForDistanceFade,
  recordRecentCountMetric,
  recordRecentMetric,
  recordRecentDurationMetric,
  shouldProcessPendingWorldBuildEntry,
  shouldEvaluateTileModelDetailLevel,
  shouldSyncTileModelDetailLevels,
  summarizeVisibleTileKinds,
  syncDynamicTileNodes,
  updateFarLandModelVisibility,
  shouldRenderWorldTile,
} from './index.ts';

type SkySignatureCycle = Parameters<typeof getSkyConstellationSignature>[0];

describe('render3d visibility helpers', () => {
  it('collects unique scene material and geometry counts for debug diagnostics', () => {
    const sharedMaterial = createMockMaterial();
    const otherMaterial = createMockMaterial();
    const sharedGeometry = { id: 'shared-geometry' };
    const otherGeometry = { id: 'other-geometry' };
    const root = createMockObject3D(undefined, [
      createMockObject3D(sharedMaterial, [], sharedGeometry, {
        renderStatKind: 'tree',
      }),
      createMockObject3D([sharedMaterial, otherMaterial], [], sharedGeometry),
      createMockObject3D(otherMaterial, [], otherGeometry),
    ]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 4,
      groupCount: 1,
      meshCount: 3,
      pointsCount: 0,
      spriteCount: 0,
      lightCount: 0,
      materialCount: 2,
      geometryCount: 2,
      treeCount: 1,
      treeObjectCount: 1,
      treeMeshCount: 1,
      treeMaterialRefCount: 1,
    });
  });

  it('disposes only tile-owned materials and geometries when removing a tile node', () => {
    const sharedMaterial = createMockMaterial();
    const otherMaterial = createMockMaterial();
    const sharedGeometry = createMockGeometry();
    const otherGeometry = createMockGeometry();
    const root = createMockObject3D(undefined, [
      createMockObject3D(sharedMaterial, [], sharedGeometry),
      createMockObject3D([sharedMaterial, otherMaterial], [], otherGeometry),
    ]);

    disposeObject3DResources(root as never);

    expect(sharedMaterial.dispose).toHaveBeenCalledTimes(0);
    expect(otherMaterial.dispose).toHaveBeenCalledTimes(0);
    expect(sharedGeometry.dispose).toHaveBeenCalledTimes(0);
    expect(otherGeometry.dispose).toHaveBeenCalledTimes(0);
  });

  it('disposes fade-owned material clones without touching shared source materials', () => {
    const sourceMaterial = createMockMaterial();
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);

    prepareObjectForDistanceFade(root as never);
    disposeObject3DResources(root as never);

    expect(sourceMaterial.dispose).toHaveBeenCalledTimes(0);
    expect(child.material.dispose).toHaveBeenCalledTimes(1);
  });

  it('records additional object-type counts for points, sprites, and lights', () => {
    const root = createMockObject3D(undefined, [
      createMockObject3D(undefined, [], undefined, {}, 'Points'),
      createMockObject3D(undefined, [], undefined, {}, 'Sprite'),
      createMockObject3D(undefined, [], undefined, {}, 'PointLight', true),
    ]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 4,
      groupCount: 1,
      meshCount: 0,
      pointsCount: 1,
      spriteCount: 1,
      lightCount: 1,
      materialCount: 0,
      geometryCount: 0,
      treeCount: 0,
      treeObjectCount: 0,
      treeMeshCount: 0,
      treeMaterialRefCount: 0,
    });
  });

  it('counts descendant objects inside tagged tree roots for per-tree budget diagnostics', () => {
    const branch = createMockObject3D({}, [], { id: 'branch-geometry' });
    const canopy = createMockObject3D({}, [], { id: 'canopy-geometry' });
    const treeRoot = createMockObject3D(undefined, [branch, canopy], undefined, {
      renderStatKind: 'tree',
    });
    const root = createMockObject3D(undefined, [treeRoot]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 4,
      groupCount: 2,
      meshCount: 2,
      pointsCount: 0,
      spriteCount: 0,
      lightCount: 0,
      materialCount: 2,
      geometryCount: 2,
      treeCount: 1,
      treeObjectCount: 3,
      treeMeshCount: 2,
      treeMaterialRefCount: 2,
    });
  });

  it('tracks recent tile-build and lod churn with a rolling one-second window', () => {
    const timestamps = [100, 450];

    recordRecentMetric(timestamps, 900);
    expect(timestamps).toEqual([100, 450, 900]);
    expect(countRecentMetricEvents(timestamps, 950)).toBe(3);
    expect(countRecentMetricEvents(timestamps, 1405)).toBe(2);

    recordRecentMetric(timestamps, 2405);
    expect(timestamps).toEqual([2405]);
    expect(countRecentMetricEvents(timestamps, 2600)).toBe(1);
  });

  it('summarizes recent render churn counters for debug stats', () => {
    expect(
      getRenderChurnStats(
        {
          tileNodeBuilds: [100, 450, 900],
          tileBuilds: [450, 900],
          lodChecks: [900],
          lodReplacements: [100, 450],
          pendingFlushCounts: [],
          tileBuildDurations: [],
        },
        950
      )
    ).toEqual({
      tileNodeBuildsPerSecond: 3,
      tileBuildsPerSecond: 2,
      lodChecksPerSecond: 1,
      lodReplacementsPerSecond: 2,
    });

    expect(
      getRenderChurnStats(
        {
          tileNodeBuilds: [100, 450, 900],
          tileBuilds: [450, 900],
          lodChecks: [900],
          lodReplacements: [100, 450],
          pendingFlushCounts: [],
          tileBuildDurations: [],
        },
        1505
      )
    ).toEqual({
      tileNodeBuildsPerSecond: 1,
      tileBuildsPerSecond: 1,
      lodChecksPerSecond: 1,
      lodReplacementsPerSecond: 0,
    });
  });

  it('always allows one pending world build entry but stops once the budget or entry cap is exhausted', () => {
    expect(
      shouldProcessPendingWorldBuildEntry(100, 105, 0, {
        pendingBuildBudgetMs: 1,
        maxPendingBuildTiles: 4,
      })
    ).toBe(true);

    expect(
      shouldProcessPendingWorldBuildEntry(100, 100.5, 1, {
        pendingBuildBudgetMs: 1,
        maxPendingBuildTiles: 4,
      })
    ).toBe(true);

    expect(
      shouldProcessPendingWorldBuildEntry(100, 101.5, 1, {
        pendingBuildBudgetMs: 1,
        maxPendingBuildTiles: 4,
      })
    ).toBe(false);

    expect(
      shouldProcessPendingWorldBuildEntry(100, 100.2, 4, {
        pendingBuildBudgetMs: 10,
        maxPendingBuildTiles: 4,
      })
    ).toBe(false);
  });

  it('tracks recent pending flush sizes with rolling average and max stats', () => {
    const samples = [
      { nowMs: 100, count: 2 },
      { nowMs: 450, count: 4 },
    ];

    recordRecentCountMetric(samples, { nowMs: 900, count: 6 });
    expect(getRecentCountStats(samples, 950)).toEqual({
      averageCount: 4,
      maxCount: 6,
    });

    expect(getRecentCountStats(samples, 1405)).toEqual({
      averageCount: 5,
      maxCount: 6,
    });

    recordRecentCountMetric(samples, { nowMs: 2405, count: 3 });
    expect(samples).toEqual([{ nowMs: 2405, count: 3 }]);
    expect(getRecentCountStats(samples, 2600)).toEqual({
      averageCount: 3,
      maxCount: 3,
    });
  });

  it('rebuilds the pending world-build queue without visible or duplicate tile requests', () => {
    expect(
      buildPendingWorldBuildQueue(
        [
          { key: '0:0', x: 0, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '2:0', x: 2, y: 0 },
          { key: '0:0', x: 0, y: 0 },
        ],
        new Set(['0:0'])
      )
    ).toEqual([
      { key: '1:0', x: 1, y: 0 },
      { key: '2:0', x: 2, y: 0 },
    ]);
  });

  it('tracks recent tile build durations with rolling average and max stats', () => {
    const samples = [
      { nowMs: 100, durationMs: 2 },
      { nowMs: 450, durationMs: 4 },
    ];

    recordRecentDurationMetric(samples, { nowMs: 900, durationMs: 6 });
    expect(getRecentDurationStats(samples, 950)).toEqual({
      averageMs: 4,
      maxMs: 6,
    });

    expect(getRecentDurationStats(samples, 1405)).toEqual({
      averageMs: 5,
      maxMs: 6,
    });

    recordRecentDurationMetric(samples, { nowMs: 2405, durationMs: 3 });
    expect(samples).toEqual([{ nowMs: 2405, durationMs: 3 }]);
    expect(getRecentDurationStats(samples, 2600)).toEqual({
      averageMs: 3,
      maxMs: 3,
    });
  });

  it('summarizes the most common visible tile kinds for the debug overlay', () => {
    expect(
      summarizeVisibleTileKinds([
        { tile: { kind: 'forest' } },
        { tile: { kind: 'plains' } },
        { tile: { kind: 'forest' } },
        { tile: { kind: 'river' } },
        { tile: { kind: 'plains' } },
        { tile: { kind: 'forest' } },
      ])
    ).toBe('forest:3, plains:2, river:1');

    expect(summarizeVisibleTileKinds([], 4)).toBe('');
  });

  it('reuses one faded material clone per source material within a model root', () => {
    const sourceMaterial = createMockMaterial();
    const childA = createMockObject3D(sourceMaterial);
    const childB = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [childA, childB]);

    prepareObjectForDistanceFade(root as never);

    expect(sourceMaterial.clone).toHaveBeenCalledTimes(1);
    expect(childA.material).toBe(childB.material);
    expect(childA.material).not.toBe(sourceMaterial);
  });

  it('applies distance fade opacity to prepared materials without dropping baseline flags', () => {
    const sourceMaterial = createMockMaterial({
      opacity: 0.6,
      transparent: false,
      depthWrite: true,
    });
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);

    prepareObjectForDistanceFade(root as never);
    applyObjectDistanceFade(root as never, 0.5);

    expect(child.visible).toBe(true);
    expect(child.material.opacity).toBeCloseTo(0.3, 6);
    expect(child.material.transparent).toBe(true);
    expect(child.material.depthWrite).toBe(false);
  });

  it('reuses cached fade target traversal when applying opacity updates', () => {
    const sourceMaterial = createMockMaterial();
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);
    const originalTraverse = root.traverse;
    root.traverse = vi.fn((callback) => originalTraverse(callback));

    prepareObjectForDistanceFade(root as never);
    applyObjectDistanceFade(root as never, 0.5);
    applyObjectDistanceFade(root as never, 0.25);

    expect(root.traverse).toHaveBeenCalledTimes(1);
  });

  it('skips far-land fade traversal when a tile opacity is unchanged', () => {
    const sourceMaterial = createMockMaterial();
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);
    const originalTraverse = root.traverse;
    root.traverse = vi.fn((callback) => originalTraverse(callback));

    prepareObjectForDistanceFade(root as never);
    root.traverse.mockClear();

    updateFarLandModelVisibility(
      [
        {
          key: '0:0',
          tile: { kind: 'plains' },
          tileX: 0,
          tileY: 0,
          node: {} as never,
          model: root as never,
          modelRoot: root as never,
          modelVisibilityOpacity: 1,
          distanceFadeEligible: true,
        },
      ],
      {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile() {
          return { kind: 'plains' };
        },
        getTileDefinition() {
          return {
            name: 'Plains',
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      } as never
    );

    expect(root.traverse).not.toHaveBeenCalled();
  });

  it('clamps camera pitch to a playable range', () => {
    expect(clampCameraPitch(DEFAULT_CAMERA_PITCH)).toBe(DEFAULT_CAMERA_PITCH);
    expect(clampCameraPitch(-5)).toBe(-1.1);
    expect(clampCameraPitch(5)).toBe(0.85);
  });

  it('keeps nearby tiles visible regardless of facing', () => {
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: -3,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(true);
  });

  it('culls far tiles that are strongly behind the player', () => {
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: -12,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(false);
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: 12,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(true);
  });

  it('uses facing buckets so tiny turns do not thrash world sync', () => {
    expect(getFacingVisibilityBucket(0)).toBe(getFacingVisibilityBucket(0.1));
    expect(getFacingVisibilityBucket(0)).not.toBe(
      getFacingVisibilityBucket(Math.PI / 2)
    );
  });

  it('prioritizes nearby and forward-facing tiles in the incremental build order', () => {
    const buildOrder = getVisibleWorldTileBuildOrder({
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 4,
    });
    const firstKeys = buildOrder.slice(0, 6).map((entry) => entry.key);
    const frontIndex = buildOrder.findIndex((entry) => entry.key === '4:0');
    const rearIndex = buildOrder.findIndex((entry) => entry.key === '-4:0');

    expect(firstKeys).toContain('0:0');
    expect(firstKeys).toContain('1:0');
    expect(frontIndex).toBeGreaterThanOrEqual(0);
    expect(rearIndex).toBeGreaterThan(frontIndex);
  });

  it('builds visible near tiles before farther ones and prefers forward tiles over side tiles at equal distance', () => {
    const buildOrder = getVisibleWorldTileBuildOrder({
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 8,
    });

    const nearFrontIndex = buildOrder.findIndex((entry) => entry.key === '2:0');
    const farFrontIndex = buildOrder.findIndex((entry) => entry.key === '6:0');
    const sideIndex = buildOrder.findIndex((entry) => entry.key === '0:2');

    expect(nearFrontIndex).toBeGreaterThanOrEqual(0);
    expect(farFrontIndex).toBeGreaterThan(nearFrontIndex);
    expect(sideIndex).toBeGreaterThan(nearFrontIndex);
  });

  it('omits far rear tiles from the build order when they fall outside the forward visibility cone', () => {
    const buildOrder = getVisibleWorldTileBuildOrder({
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 12,
    });

    expect(buildOrder.some((entry) => entry.key === '-12:0')).toBe(false);
    expect(buildOrder.some((entry) => entry.key === '12:0')).toBe(true);
  });

  it('keeps nearby land models fully visible and thins far ones deterministically', () => {
    expect(getFarLandModelOpacity(6, 12, 4)).toBe(1);
    expect(
      getFarLandModelOpacity(12.5, 12, 4, {
        fullVisibilityDistance: 8,
        revealDistanceVariance: 8,
        fadeDistance: 2,
        sample: () => 0,
      })
    ).toBe(0);
    expect(
      getFarLandModelOpacity(9, 12, 4, {
        fullVisibilityDistance: 8,
        revealDistanceVariance: 8,
        fadeDistance: 2,
        sample: () => 0,
      })
    ).toBe(0.5);
  });

  it('switches to low-detail models beyond the lod distance', () => {
    expect(getTileModelDetailLevel(3)).toBe('full');
    expect(getTileModelDetailLevel(6.49)).toBe('full');
    expect(getTileModelDetailLevel(6.5)).toBe('low');
    expect(getTileModelDetailLevel(10)).toBe('low');
  });

  it('switches to low-detail models beyond the lod distance using squared distance thresholds', () => {
    expect(getTileModelDetailLevelFromSquaredDistance(9)).toBe('full');
    expect(getTileModelDetailLevelFromSquaredDistance(42.24)).toBe('full');
    expect(getTileModelDetailLevelFromSquaredDistance(42.25)).toBe('low');
    expect(getTileModelDetailLevelFromSquaredDistance(100)).toBe('low');
  });

  it('uses hysteresis to avoid lod thrash near the boundary', () => {
    expect(getTileModelDetailLevelWithHysteresis('full', 42.25)).toBe('low');
    expect(getTileModelDetailLevelWithHysteresis('full', 40)).toBe('full');
    expect(getTileModelDetailLevelWithHysteresis('low', 40)).toBe('low');
    expect(getTileModelDetailLevelWithHysteresis('low', 35.99)).toBe('full');
    expect(getTileModelDetailLevelWithHysteresis(undefined, 42.25)).toBe('low');
  });

  it('skips obviously distant low-detail chunks during lod reevaluation', () => {
    expect(shouldEvaluateTileModelDetailLevel('full', 100)).toBe(true);
    expect(shouldEvaluateTileModelDetailLevel(undefined, 100)).toBe(true);
    expect(shouldEvaluateTileModelDetailLevel('low', 100)).toBe(false);
    expect(shouldEvaluateTileModelDetailLevel('low', 36)).toBe(true);
  });

  it('uses low detail for non-near pending builds while the queue is still draining', () => {
    expect(getPendingWorldBuildDetailLevel('low', 4, 10)).toBe('low');
    expect(getPendingWorldBuildDetailLevel('full', 4, 10)).toBe('full');
    expect(getPendingWorldBuildDetailLevel('full', 16, 10)).toBe('low');
    expect(getPendingWorldBuildDetailLevel('full', 16, 0)).toBe('full');
  });

  it('only rechecks tile lod after meaningful movement', () => {
    expect(shouldSyncTileModelDetailLevels(null, 0, 0)).toBe(true);
    expect(shouldSyncTileModelDetailLevels({ x: 0, y: 0 }, 0.05, 0.05)).toBe(false);
    expect(shouldSyncTileModelDetailLevels({ x: 0, y: 0 }, 0.18, 0)).toBe(true);
  });

  it('buckets wrapped LOD batches across frames without starving later entries', () => {
    expect(getWrappedBatchWindow(['a', 'b', 'c', 'd'], 0, 2)).toEqual({
      items: ['a', 'b'],
      nextIndex: 2,
    });
    expect(getWrappedBatchWindow(['a', 'b', 'c', 'd'], 3, 3)).toEqual({
      items: ['d', 'a', 'b'],
      nextIndex: 2,
    });
    expect(getWrappedBatchWindow(['a', 'b'], 0, 0)).toEqual({
      items: [],
      nextIndex: 0,
    });
  });

  it('keeps nearby terrain flat while bending the far horizon downward', () => {
    expect(getWorldCurvatureOffset(0)).toBe(0);
    expect(getWorldCurvatureOffset(4)).toBe(0);
    expect(getWorldCurvatureOffset(11)).toBeLessThan(0);
    expect(getWorldCurvatureOffset(18)).toBeCloseTo(-1.2, 6);
    expect(getWorldCurvatureOffset(24)).toBeCloseTo(-1.2, 6);
  });

  it('uses coarse sky signatures so tiny celestial drift does not rebuild sky layers', () => {
    const baseCycle: SkySignatureCycle = {
      activeConstellationIndex: 1,
      yearProgress: 0.25,
      starsOpacity: 0.5,
      milkyWay: {
        azimuthOffset: 0.8,
        inclination: 1.1,
        width: 0.25,
        opacity: 0.12,
      },
      auroraBands: [
        {
          id: 'aurora-a',
          azimuthCenter: -1.2,
          altitude: 0.3,
          height: 0.4,
          intensity: 0.7,
          wavePhase: 0.2,
          span: 0.6,
          colorA: '#9df2ff',
          colorB: '#7cf7c5',
        },
      ],
      visibleEvents: [
        {
          type: 'meteor-shower',
          name: 'Burst',
          progress: 0.4,
          azimuth: 0.4,
          altitude: 0.5,
          visibility: 0.9,
          intensity: 0.8,
          trailLength: 3.6,
          color: '#ffffff',
          size: 0.2,
        },
      ],
    };
    const nearCycle: SkySignatureCycle = {
      ...baseCycle,
      yearProgress: 0.2501,
      milkyWay: {
        ...baseCycle.milkyWay,
        azimuthOffset: 0.801,
      },
      auroraBands: [
        {
          ...baseCycle.auroraBands[0],
          wavePhase: 0.21,
        },
      ],
      visibleEvents: [
        {
          ...baseCycle.visibleEvents[0],
          azimuth: 0.401,
        },
      ],
    };
    const farCycle: SkySignatureCycle = {
      ...baseCycle,
      yearProgress: 0.31,
      visibleEvents: [
        {
          ...baseCycle.visibleEvents[0],
          azimuth: 0.7,
        },
      ],
    };

    expect(getSkyConstellationSignature(nearCycle)).toBe(
      getSkyConstellationSignature(baseCycle)
    );
    expect(getSkyEventSignature(nearCycle)).toBe(getSkyEventSignature(baseCycle));
    expect(getSkyMilkyWaySignature(nearCycle)).toBe(
      getSkyMilkyWaySignature(baseCycle)
    );
    expect(getSkyAuroraSignature(nearCycle)).toBe(
      getSkyAuroraSignature(baseCycle)
    );
    expect(getSkyConstellationSignature(farCycle)).not.toBe(
      getSkyConstellationSignature(baseCycle)
    );
    expect(getSkyEventSignature(farCycle)).not.toBe(getSkyEventSignature(baseCycle));
  });

  it('selects distinct dawn and dusk twilight palettes by time of day', () => {
    expect(
      getTwilightSkyPalette(
        {
          dawnColor: '#dawn',
          duskColor: '#dusk',
          sunsetColor: '#fallback',
          fogDawnColor: '#fog-dawn',
          fogDuskColor: '#fog-dusk',
          fogDayColor: '#fog-day',
        },
        { dayProgress: 0.2 }
      )
    ).toEqual({
      skyColor: '#dawn',
      fogColor: '#fog-dawn',
    });

    expect(
      getTwilightSkyPalette(
        {
          dawnColor: '#dawn',
          duskColor: '#dusk',
          sunsetColor: '#fallback',
          fogDawnColor: '#fog-dawn',
          fogDuskColor: '#fog-dusk',
          fogDayColor: '#fog-day',
        },
        { dayProgress: 0.8 }
      )
    ).toEqual({
      skyColor: '#dusk',
      fogColor: '#fog-dusk',
    });
  });

  it('tightens fog range when weather visibility drops', () => {
    expect(getWeatherFogRange(0.9).far).toBeGreaterThan(getWeatherFogRange(0.3).far);
    expect(getWeatherFogRange(0.9).near).toBeGreaterThan(getWeatherFogRange(0.3).near);
  });

  it('falls back to decorated tile surface height when no explicit profile is provided', () => {
    expect(getDecoratedTileSurfaceHeight({ surfaceHeight: 0.24 })).toBeCloseTo(0.24, 6);
    expect(getDecoratedTileSurfaceHeight({})).toBe(0);
  });

  it('prefers sea and channel boundaries without sorting transient arrays', () => {
    const bank = { boundaryRole: null, surfaceHeight: 0.2 };
    const sea = { boundaryRole: 'sea' as const, surfaceHeight: 0 };
    const crossing = { boundaryRole: 'crossing' as const, surfaceHeight: 0.1 };

    expect(getBoundaryPriority(sea.boundaryRole)).toBeLessThan(
      getBoundaryPriority(crossing.boundaryRole)
    );
    expect(getBoundaryPriority(crossing.boundaryRole)).toBeLessThan(
      getBoundaryPriority(bank.boundaryRole)
    );
    expect(
      pickCornerBoundaryProfile([bank, null, crossing, sea])
    ).toEqual(sea);
  });

  it('syncs dynamic visible tile nodes through tile plugin hooks from any iterable', () => {
    const calls: Array<{
      tileX: number;
      tileY: number;
      night: number;
      environmentId: string | undefined;
    }> = [];
    const entries = new Map([
      [
        '4:5',
        {
          key: '4:5',
          tile: { kind: 'town' },
          tileX: 4,
          tileY: 5,
          node: {} as never,
          model: { id: 'model-town' },
          sync3DModel({ tileX, tileY, cycle, environment }) {
            calls.push({
              tileX,
              tileY,
              night: cycle.night,
              environmentId: environment.sky?.nightColor,
            });
          },
        },
      ],
    ]).values();
    syncDynamicTileNodes(
      entries,
      {
        three: {} as never,
        state: {
          player: { x: 0, y: 0, facing: 0 },
          getCurrentContext() {
            return { id: 'overworld', type: 'overworld', depth: 0 };
          },
          getCurrentTile() {
            return { kind: 'plains' };
          },
          getTileDefinition() {
            return {
              name: 'Plains',
              color: '#000000',
              miniColor: '#111111',
              walkable: true,
              wallHeight: 0,
            };
          },
        },
        cycle: {
          daylight: 0,
          twilight: 0.2,
          night: 0.8,
        },
        environment: {
          sky: {
            nightColor: '#06111f',
          },
        },
      }
    );

    expect(calls).toEqual([
      {
        tileX: 4,
        tileY: 5,
        night: 0.8,
        environmentId: '#06111f',
      },
    ]);
  });

  it('skips dynamic sync work for land models that are fully hidden by distance thinning', () => {
    let calls = 0;
    syncDynamicTileNodes(
      [
        {
          key: '20:2',
          tile: { kind: 'forest' },
          tileX: 20,
          tileY: 2,
          node: {} as never,
          model: { id: 'model-forest' },
          modelRoot: null,
          modelVisibilityOpacity: 0,
          distanceFadeEligible: true,
          sync3DModel() {
            calls += 1;
          },
        },
      ],
      {
        three: {} as never,
        state: {
          player: { x: 0, y: 0, facing: 0 },
          getCurrentContext() {
            return { id: 'overworld', type: 'overworld', depth: 0 };
          },
          getCurrentTile() {
            return { kind: 'plains' };
          },
          getTileDefinition() {
            return {
              name: 'Plains',
              color: '#000000',
              miniColor: '#111111',
              walkable: true,
              wallHeight: 0,
            };
          },
        },
        cycle: {
          daylight: 0,
          twilight: 0.2,
          night: 0.8,
        },
        environment: {},
      }
    );

    expect(calls).toBe(0);
  });
});

function createMockMaterial(
  overrides: Partial<{
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
  }> = {}
) {
  const clone = {
    opacity: overrides.opacity ?? 1,
    transparent: overrides.transparent ?? false,
    depthWrite: overrides.depthWrite ?? true,
    userData: {},
    dispose: vi.fn(),
  };
  return {
    opacity: overrides.opacity ?? 1,
    transparent: overrides.transparent ?? false,
    depthWrite: overrides.depthWrite ?? true,
    userData: {},
    clone: vi.fn(() => ({ ...clone, userData: {} })),
    dispose: vi.fn(),
  };
}

function createMockGeometry() {
  return {
    userData: {},
    dispose: vi.fn(),
  };
}

function createMockObject3D(
  material?: unknown,
  children: Array<{
    traverse: (callback: (child: unknown) => void) => void;
  }> = [],
  geometry?: unknown,
  userData: Record<string, unknown> = {},
  type = geometry ? 'Mesh' : 'Group',
  isLight = false
) {
  const node = {
    visible: true,
    type,
    isLight,
    userData,
    material,
    geometry,
    children,
    traverse(callback: (child: typeof node) => void) {
      callback(node);
      for (const child of children) {
        child.traverse(callback as never);
      }
    },
  };
  return node;
}
