import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS, normalizeAngle } from '@bworlds/core';
import { findNearestBoatLaunchPoint } from '@bworlds/map-boat';
import { findNearestCanoeLaunchPoint } from '@bworlds/map-canoe';
import { getTrainBoardingSpawn } from '@bworlds/map-train';
import { createOverworldTerrainSignalSampler } from '@bworlds/overworld-support';
import { getActivePluginRegistry } from '@bworlds/plugin-api';
import { buildPlayerPoi } from '@bworlds/runtime-player-poi';
import {
  clampTerrainHeightValue,
  convertFeetToWorldHeightUnits,
  convertWorldHeightUnitsToFeet,
  createBuiltinContentPackCatalog,
  createDefaultPluginRegistry,
  createPluginRegistryFromPack,
  createPluginRegistryFromPacks,
  createWorldRuntime,
  createWorldTerrainHeightInfluencePlugin,
  createWorldGenerator,
  getTerrainChunkCellBounds,
  getTerrainChunkHeightSampleCoordinate,
  getTerrainChunkHeightSampleBorder,
  getTerrainChunkCoordinates,
  getTerrainChunkHeightSampleBounds,
  listContentPacks,
  listBuiltinContentPacks,
  TERRAIN_CHUNK_CELL_SIZE,
  TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE,
  validateTerrainHeightValue,
  WORLD_FEET_PER_TILE,
  WORLD_TERRAIN_COARSE_QUERY_STEP,
  WORLD_TERRAIN_FLAT_GRADE_EPSILON,
  WORLD_TERRAIN_FINE_QUERY_STEP,
  WORLD_TERRAIN_MAX_HEIGHT,
  WORLD_METERS_PER_TILE,
  WORLD_TERRAIN_MIN_HEIGHT,
  WORLD_TERRAIN_SEA_LEVEL,
} from './index.ts';
import type {
  PluginPackDefinitionLike,
  ResolveWorldEnvironmentContext,
  WorldActionLike,
} from '@bworlds/plugin-api';

function createGenerator() {
  const plugins = createDefaultPluginRegistry();
  return createWorldGenerator({ seed: 'spec', plugins });
}

const customPackDefinition: PluginPackDefinitionLike = {
  manifest: {
    id: 'custom-spec-pack',
    name: 'Custom Spec Pack',
    description: 'Adds a deterministic custom tile for bootstrap testing.',
    tags: ['test', 'custom'],
  },
  createPack() {
    return {
      name: 'custom-spec-pack',
      tilePlugins: [
        {
          name: 'tile-custom-spec',
          tiles: [
            {
              kind: 'customSpec',
              definition: {
                name: 'Custom Spec',
                color: '#123456',
                miniColor: '#789abc',
                walkable: true,
                wallHeight: 0,
              },
            },
          ],
        },
      ],
    };
  },
};

describe('world generator', () => {
  it('uses sixteen logical cells and seventeen height samples per terrain chunk', () => {
    expect(TERRAIN_CHUNK_CELL_SIZE).toBe(16);
    expect(TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE).toBe(17);
  });

  it('exposes stable terrain height unit helpers from the documented tile scale', () => {
    expect(WORLD_METERS_PER_TILE).toBe(250);
    expect(WORLD_FEET_PER_TILE).toBeCloseTo(820.21, 2);
    expect(WORLD_TERRAIN_SEA_LEVEL).toBe(0);
    expect(WORLD_TERRAIN_COARSE_QUERY_STEP).toBe(1);
    expect(WORLD_TERRAIN_FINE_QUERY_STEP).toBe(0.25);
    expect(convertFeetToWorldHeightUnits(WORLD_FEET_PER_TILE)).toBeCloseTo(
      1,
      6
    );
    expect(convertWorldHeightUnitsToFeet(0.5)).toBeCloseTo(
      WORLD_FEET_PER_TILE * 0.5,
      6
    );
  });

  it('rejects non-finite terrain height values', () => {
    expect(validateTerrainHeightValue(0.25, 'Test height')).toBe(0.25);
    expect(() => validateTerrainHeightValue(Number.NaN)).toThrow(
      'Terrain height must be a finite number, received NaN.'
    );
    expect(() => validateTerrainHeightValue(Number.POSITIVE_INFINITY)).toThrow(
      'Terrain height must be a finite number, received Infinity.'
    );
    expect(() => validateTerrainHeightValue(Number.NEGATIVE_INFINITY)).toThrow(
      'Terrain height must be a finite number, received -Infinity.'
    );
  });

  it('clamps terrain heights to one shared world range', () => {
    expect(clampTerrainHeightValue(0.25)).toBe(0.25);
    expect(clampTerrainHeightValue(WORLD_TERRAIN_MIN_HEIGHT - 1)).toBe(
      WORLD_TERRAIN_MIN_HEIGHT
    );
    expect(clampTerrainHeightValue(WORLD_TERRAIN_MAX_HEIGHT + 1)).toBe(
      WORLD_TERRAIN_MAX_HEIGHT
    );
    expect(() =>
      clampTerrainHeightValue(0, {
        min: Number.NaN,
      })
    ).toThrow('Terrain height clamp bounds must be finite numbers.');
    expect(() =>
      clampTerrainHeightValue(0, {
        min: 2,
        max: 1,
      })
    ).toThrow('Terrain height clamp min 2 must be <= max 1.');
  });

  it('converts world cells to terrain chunk coordinates across zero and negative boundaries', () => {
    expect(getTerrainChunkCoordinates(0, 0)).toEqual({
      chunkX: 0,
      chunkY: 0,
      localX: 0,
      localY: 0,
    });
    expect(getTerrainChunkCoordinates(15, 15)).toEqual({
      chunkX: 0,
      chunkY: 0,
      localX: 15,
      localY: 15,
    });
    expect(getTerrainChunkCoordinates(16, 16)).toEqual({
      chunkX: 1,
      chunkY: 1,
      localX: 0,
      localY: 0,
    });
    expect(getTerrainChunkCoordinates(-1, -1)).toEqual({
      chunkX: -1,
      chunkY: -1,
      localX: 15,
      localY: 15,
    });
    expect(getTerrainChunkCoordinates(-16, -16)).toEqual({
      chunkX: -1,
      chunkY: -1,
      localX: 0,
      localY: 0,
    });
    expect(getTerrainChunkCoordinates(-17, -17)).toEqual({
      chunkX: -2,
      chunkY: -2,
      localX: 15,
      localY: 15,
    });
    expect(getTerrainChunkCoordinates(31, -17)).toEqual({
      chunkX: 1,
      chunkY: -2,
      localX: 15,
      localY: 15,
    });
  });

  it('derives world-space cell bounds for terrain chunks', () => {
    expect(getTerrainChunkCellBounds(0, 0)).toEqual({
      minX: 0,
      maxX: 15,
      minY: 0,
      maxY: 15,
    });
    expect(getTerrainChunkCellBounds(1, -2)).toEqual({
      minX: 16,
      maxX: 31,
      minY: -32,
      maxY: -17,
    });
  });

  it('derives seam-safe height sample bounds for neighboring terrain chunks', () => {
    expect(getTerrainChunkHeightSampleBounds(0, 0)).toEqual({
      minX: 0,
      maxX: 16,
      minY: 0,
      maxY: 16,
    });
    expect(getTerrainChunkHeightSampleBounds(-1, -1)).toEqual({
      minX: -16,
      maxX: 0,
      minY: -16,
      maxY: 0,
    });

    const center = getTerrainChunkHeightSampleBounds(0, 0);
    const east = getTerrainChunkHeightSampleBounds(1, 0);
    const south = getTerrainChunkHeightSampleBounds(0, 1);

    expect(center.maxX).toBe(east.minX);
    expect(center.maxY).toBe(south.minY);
  });

  it('maps chunk height sample indices onto world-space coordinates', () => {
    expect(getTerrainChunkHeightSampleCoordinate(0, 0, 0, 0)).toEqual({
      x: 0,
      y: 0,
    });
    expect(getTerrainChunkHeightSampleCoordinate(0, 0, 16, 16)).toEqual({
      x: 16,
      y: 16,
    });
    expect(getTerrainChunkHeightSampleCoordinate(-2, 3, 4, 7)).toEqual({
      x: -28,
      y: 55,
    });
  });

  it('derives identical shared border sample lines for adjacent chunks', () => {
    expect(getTerrainChunkHeightSampleBorder(0, 0, 'east')).toEqual(
      getTerrainChunkHeightSampleBorder(1, 0, 'west')
    );
    expect(getTerrainChunkHeightSampleBorder(0, 0, 'south')).toEqual(
      getTerrainChunkHeightSampleBorder(0, 1, 'north')
    );
    expect(getTerrainChunkHeightSampleBorder(-2, -3, 'east')).toEqual({
      minX: -16,
      maxX: -16,
      minY: -48,
      maxY: -32,
    });
    expect(getTerrainChunkHeightSampleBorder(-2, -3, 'south')).toEqual({
      minX: -32,
      maxX: -16,
      minY: -32,
      maxY: -32,
    });
    expect(getTerrainChunkHeightSampleCoordinate(0, 0, 16, 5)).toEqual(
      getTerrainChunkHeightSampleCoordinate(1, 0, 0, 5)
    );
    expect(getTerrainChunkHeightSampleCoordinate(0, 0, 9, 16)).toEqual(
      getTerrainChunkHeightSampleCoordinate(0, 1, 9, 0)
    );
  });

  it('rejects terrain height sample indices outside the seam-safe 17x17 grid', () => {
    expect(() => getTerrainChunkHeightSampleCoordinate(0, 0, -1, 0)).toThrow(
      'Terrain chunk height sample x-index -1 must stay within 0..16.'
    );
    expect(() => getTerrainChunkHeightSampleCoordinate(0, 0, 0, 17)).toThrow(
      'Terrain chunk height sample y-index 17 must stay within 0..16.'
    );
  });

  it('lists built-in content packs with manifest metadata', () => {
    expect(listBuiltinContentPacks()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'default-content-pack',
          name: 'Default Content Pack',
        }),
        expect.objectContaining({
          id: 'frontier-content-pack',
          name: 'Frontier Flavor Pack',
        }),
        expect.objectContaining({
          id: 'ruins-content-pack',
          name: 'Ruins Landmark Pack',
        }),
      ])
    );
  });

  it('creates a reusable built-in content pack catalog with default selections', () => {
    const catalog = createBuiltinContentPackCatalog();

    expect(catalog.defaultPackIds).toEqual([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    expect(catalog.listSelected()).toEqual([
      expect.objectContaining({ id: 'default-content-pack' }),
      expect.objectContaining({ id: 'frontier-content-pack' }),
    ]);

    const registry = catalog.createRegistry();
    expect(registry.getTilePlugin('plains')?.kind).toBe('plains');
    expect(registry.plugins.map((plugin) => plugin.name)).toContain(
      'runtime-frontier-flavor'
    );
  });

  it('creates plugin registries from selected built-in pack ids', () => {
    const registry = createPluginRegistryFromPack('default-content-pack');
    expect(registry.plugins.length).toBeGreaterThan(0);
    expect(registry.getTilePlugin('town')?.kind).toBe('town');
    expect(registry.getTilePlugin('floor')?.kind).toBe('floor');
    expect(registry.getTileDefinition('floor')?.name).toBe('Floor');
    expect(registry.getTilePlugin('plains')?.kind).toBe('plains');
    expect(registry.getTileDefinition('plains')?.name).toBe('Plains');
    expect(registry.getTileDefinition('ocean')?.name).toBe('Ocean');
    expect(registry.getTileDefinition('forest')?.name).toBe('Forest');
    expect(registry.getTileDefinition('road')?.name).toBe('Road');
  });

  it('creates plugin registries from optional overlay tile packs', () => {
    const registry = createPluginRegistryFromPacks([
      'default-content-pack',
      'ruins-content-pack',
    ]);

    expect(registry.getTilePlugin('ruins')?.kind).toBe('ruins');
    expect(registry.getTileDefinition('ruins')).toEqual(
      expect.objectContaining({
        name: 'Ruins',
        walkable: true,
      })
    );
  });

  it('restores the text view mode when requested by the runtime bootstrap', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      viewMode: 'text',
      activateRegistry: false,
    });

    expect(runtime.state.viewMode).toBe('text');
  });

  it('lists caller-supplied content pack manifests', () => {
    expect(listContentPacks([customPackDefinition])).toEqual([
      customPackDefinition.manifest,
    ]);
  });

  it('creates composed plugin registries from multiple built-in packs', () => {
    const registry = createPluginRegistryFromPacks([
      'default-content-pack',
      'frontier-content-pack',
      'ruins-content-pack',
    ]);

    expect(registry.plugins.map((plugin) => plugin.name)).toContain(
      'runtime-frontier-flavor'
    );
    expect(registry.plugins.map((plugin) => plugin.name)).toContain(
      'tile-ruins'
    );
    expect(registry.getTilePlugin('town')?.kind).toBe('town');
    expect(registry.getTilePlugin('quarry')?.kind).toBe('quarry');
    expect(registry.getTilePlugin('lighthouse')?.kind).toBe('lighthouse');
    expect(registry.getTilePlugin('tower')?.kind).toBe('tower');
  });

  it('keeps the default celestial day length when the frontier overlay is enabled', () => {
    const registry = createPluginRegistryFromPacks([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    const payload: ResolveWorldEnvironmentContext = {
      timeMs: 0,
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
    };

    const environment = registry.resolveWorldEnvironment(payload);

    expect(environment.cycle?.dayLengthMs).toBe(DEFAULT_DAY_LENGTH_MS);
  });

  it('creates registries from caller-supplied content pack definitions', () => {
    const registry = createPluginRegistryFromPack('custom-spec-pack', [
      customPackDefinition,
    ]);

    expect(registry.getTilePlugin('customSpec')?.kind).toBe('customSpec');
    expect(registry.getTileDefinition('customSpec')).toEqual(
      expect.objectContaining({
        name: 'Custom Spec',
        walkable: true,
      })
    );
  });

  it('creates a reusable world runtime bootstrap with saved state support', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      packIds: ['default-content-pack', 'frontier-content-pack'],
      player: { x: 12.5, y: -4.25, facing: Math.PI / 2 },
      viewMode: '3d',
      stack: [
        {
          id: 'overworld',
          label: 'Overworld',
          type: 'overworld',
          depth: 0,
          origin: { x: 0, y: 0 },
        },
      ],
    });

    expect(runtime.contentPacks.map((pack) => pack.id)).toEqual([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    expect(runtime.state.viewMode).toBe('3d');
    expect(runtime.state.player).toMatchObject({
      x: 12.5,
      y: -4.25,
    });
    expect(runtime.state.getTileDefinition('plains')).toEqual(
      expect.objectContaining({
        name: 'Plains',
        walkable: true,
      })
    );
    expect(getActivePluginRegistry()).toBe(runtime.registry);
  });

  it('bootstraps runtime state from caller-supplied pack definitions', () => {
    const runtime = createWorldRuntime({
      packIds: ['custom-spec-pack'],
      packDefinitions: [customPackDefinition],
      activateRegistry: false,
    });

    expect(runtime.contentPacks).toEqual([customPackDefinition.manifest]);
    expect(runtime.registry.getTileDefinition('customSpec')).toEqual(
      expect.objectContaining({
        name: 'Custom Spec',
      })
    );
  });

  it('is deterministic for overworld tiles', () => {
    const generator = createGenerator();
    expect(generator.sampleOverworld(10, 20)).toEqual(
      generator.sampleOverworld(10, 20)
    );
  });

  it('keeps sampleOverworld callable even when the method is detached', () => {
    const generator = createGenerator();
    const { sampleOverworld } = generator;

    expect(sampleOverworld(10, 20)).toEqual(generator.sampleOverworld(10, 20));
  });

  it('provides a lightweight preview sampler that is stable and omits route decoration', () => {
    const generator = createGenerator();

    expect(generator.sampleTerrainHeight(10, 20)).toBe(
      generator.samplePreviewSurfaceHeight(10, 20)
    );
    expect(generator.samplePreviewSurfaceKind(10, 20)).toBe(
      generator.samplePreviewOverworld(10, 20).kind
    );
    expect(generator.samplePreviewSurfaceHeight(10, 20)).toBe(
      generator.samplePreviewOverworld(10, 20).surfaceHeight
    );
    expect(generator.samplePreviewOverworld(10, 20)).toEqual(
      generator.samplePreviewOverworld(10, 20)
    );
    expect(generator.samplePreviewSurfaceKind(3, 2)).not.toBe('bridge');
    expect(generator.samplePreviewOverworld(3, 2).kind).not.toBe('bridge');
    expect(generator.sampleOverworld(3, 2).kind).toBe('bridge');
  });

  it('samples deterministic terrain slope from the shared height API', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainSlope(10, 20);
    const expectedSlopeX =
      (generator.sampleTerrainHeight(11, 20) -
        generator.sampleTerrainHeight(9, 20)) /
      2;
    const expectedSlopeY =
      (generator.sampleTerrainHeight(10, 21) -
        generator.sampleTerrainHeight(10, 19)) /
      2;

    expect(sample).toEqual({
      worldX: 10,
      worldY: 20,
      sampleStep: 1,
      height: generator.sampleTerrainHeight(10, 20),
      slopeX: expectedSlopeX,
      slopeY: expectedSlopeY,
      grade: Math.hypot(expectedSlopeX, expectedSlopeY),
    });
    expect(generator.terrainHeightSampler.sampleSlope(10, 20)).toEqual(sample);
    expect(generator.sampleTerrainSlope(10, 20)).toEqual(sample);
  });

  it('supports wider terrain slope sampling steps and rejects invalid step sizes', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainSlope(10, 20, 2);
    const expectedSlopeX =
      (generator.sampleTerrainHeight(12, 20) -
        generator.sampleTerrainHeight(8, 20)) /
      4;
    const expectedSlopeY =
      (generator.sampleTerrainHeight(10, 22) -
        generator.sampleTerrainHeight(10, 18)) /
      4;

    expect(sample.sampleStep).toBe(2);
    expect(sample.slopeX).toBe(expectedSlopeX);
    expect(sample.slopeY).toBe(expectedSlopeY);
    expect(sample.grade).toBe(Math.hypot(expectedSlopeX, expectedSlopeY));
    expect(() => generator.sampleTerrainSlope(10, 20, 0)).toThrow(
      'Terrain slope sampleStep must be a finite positive number.'
    );
  });

  it('samples deterministic terrain aspect from the shared slope API', () => {
    const generator = createGenerator();
    const slope = generator.sampleTerrainSlope(10, 20);
    const aspect = generator.sampleTerrainAspect(10, 20);

    expect(aspect).toEqual({
      worldX: 10,
      worldY: 20,
      sampleStep: slope.sampleStep,
      slopeX: slope.slopeX,
      slopeY: slope.slopeY,
      grade: slope.grade,
      aspectRadians:
        slope.grade <= 0 ? null : Math.atan2(slope.slopeY, slope.slopeX),
    });
    expect(generator.terrainHeightSampler.sampleAspect(10, 20)).toEqual(aspect);
  });

  it('returns null aspect for flat terrain samples', () => {
    const generator = createGenerator();
    const aspect = generator.sampleTerrainAspect(0, 0, 10_000);

    expect(aspect.grade).toBeLessThanOrEqual(WORLD_TERRAIN_FLAT_GRADE_EPSILON);
    expect(aspect.aspectRadians).toBeNull();
  });

  it('samples deterministic terrain curvature from the shared height API', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainCurvature(10, 20);
    const centerHeight = generator.sampleTerrainHeight(10, 20);
    const curvatureX =
      generator.sampleTerrainHeight(9, 20) -
      2 * centerHeight +
      generator.sampleTerrainHeight(11, 20);
    const curvatureY =
      generator.sampleTerrainHeight(10, 19) -
      2 * centerHeight +
      generator.sampleTerrainHeight(10, 21);

    expect(sample).toEqual({
      worldX: 10,
      worldY: 20,
      sampleStep: 1,
      height: centerHeight,
      curvatureX,
      curvatureY,
      curvatureMagnitude: Math.hypot(curvatureX, curvatureY),
    });
    expect(generator.terrainHeightSampler.sampleCurvature(10, 20)).toEqual(
      sample
    );
  });

  it('supports wider terrain curvature sampling steps', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainCurvature(10, 20, 2);
    const centerHeight = generator.sampleTerrainHeight(10, 20);
    const curvatureX =
      (generator.sampleTerrainHeight(8, 20) -
        2 * centerHeight +
        generator.sampleTerrainHeight(12, 20)) /
      4;
    const curvatureY =
      (generator.sampleTerrainHeight(10, 18) -
        2 * centerHeight +
        generator.sampleTerrainHeight(10, 22)) /
      4;

    expect(sample.sampleStep).toBe(2);
    expect(sample.curvatureX).toBe(curvatureX);
    expect(sample.curvatureY).toBe(curvatureY);
    expect(sample.curvatureMagnitude).toBe(Math.hypot(curvatureX, curvatureY));
  });

  it('samples deterministic terrain drainage gradients from the shared height API', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainDrainageGradient(10, 20);
    const centerHeight = generator.sampleTerrainHeight(10, 20);
    const leftHeight = generator.sampleTerrainHeight(9, 20);
    const rightHeight = generator.sampleTerrainHeight(11, 20);
    const downHeight = generator.sampleTerrainHeight(10, 19);
    const upHeight = generator.sampleTerrainHeight(10, 21);
    const diagonalHeights = [
      generator.sampleTerrainHeight(9, 19),
      generator.sampleTerrainHeight(11, 19),
      generator.sampleTerrainHeight(9, 21),
      generator.sampleTerrainHeight(11, 21),
    ];
    const allNeighborHeights = [
      leftHeight,
      rightHeight,
      downHeight,
      upHeight,
      ...diagonalHeights,
    ];
    const downhillX = (leftHeight - rightHeight) / 2;
    const downhillY = (downHeight - upHeight) / 2;
    const downhillGrade = Math.hypot(downhillX, downhillY);
    const lowerNeighborCount = allNeighborHeights.filter(
      (height) => height < centerHeight
    ).length;
    const higherNeighborCount = allNeighborHeights.filter(
      (height) => height > centerHeight
    ).length;

    expect(sample).toEqual({
      worldX: 10,
      worldY: 20,
      sampleStep: 1,
      height: centerHeight,
      downhillX,
      downhillY,
      downhillGrade,
      aspectRadians:
        downhillGrade <= WORLD_TERRAIN_FLAT_GRADE_EPSILON
          ? null
          : Math.atan2(downhillY, downhillX),
      lowerNeighborCount,
      higherNeighborCount,
      convergence:
        (higherNeighborCount - lowerNeighborCount) / allNeighborHeights.length,
    });
    expect(
      generator.terrainHeightSampler.sampleDrainageGradient(10, 20)
    ).toEqual(sample);
  });

  it('supports wider terrain drainage-gradient steps', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainDrainageGradient(10, 20, 2);

    expect(sample.sampleStep).toBe(2);
    expect(sample.downhillGrade).toBe(
      Math.hypot(sample.downhillX, sample.downhillY)
    );
    expect(
      sample.lowerNeighborCount + sample.higherNeighborCount
    ).toBeLessThanOrEqual(8);
  });

  it('samples deterministic terrain height ranges from explicit world bounds', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainHeightRange({
      minX: 10,
      maxX: 12,
      minY: 20,
      maxY: 21,
    });
    const heights = [
      generator.sampleTerrainHeight(10, 20),
      generator.sampleTerrainHeight(11, 20),
      generator.sampleTerrainHeight(12, 20),
      generator.sampleTerrainHeight(10, 21),
      generator.sampleTerrainHeight(11, 21),
      generator.sampleTerrainHeight(12, 21),
    ];

    expect(sample).toEqual({
      minX: 10,
      maxX: 12,
      minY: 20,
      maxY: 21,
      resolution: 'coarse',
      sampleStep: 1,
      sampleCount: 6,
      minHeight: Math.min(...heights),
      maxHeight: Math.max(...heights),
      heightRange: Math.max(...heights) - Math.min(...heights),
    });
    expect(
      generator.terrainHeightSampler.sampleHeightRange({
        minX: 10,
        maxX: 12,
        minY: 20,
        maxY: 21,
      })
    ).toEqual(sample);
  });

  it('supports wider terrain height-range steps and rejects invalid bounds', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainHeightRange({
      minX: 10,
      maxX: 14,
      minY: 20,
      maxY: 24,
      sampleStep: 2,
    });
    const heights = [
      generator.sampleTerrainHeight(10, 20),
      generator.sampleTerrainHeight(12, 20),
      generator.sampleTerrainHeight(14, 20),
      generator.sampleTerrainHeight(10, 22),
      generator.sampleTerrainHeight(12, 22),
      generator.sampleTerrainHeight(14, 22),
      generator.sampleTerrainHeight(10, 24),
      generator.sampleTerrainHeight(12, 24),
      generator.sampleTerrainHeight(14, 24),
    ];

    expect(sample.sampleStep).toBe(2);
    expect(sample.resolution).toBe('coarse');
    expect(sample.sampleCount).toBe(9);
    expect(sample.minHeight).toBe(Math.min(...heights));
    expect(sample.maxHeight).toBe(Math.max(...heights));
    expect(() =>
      generator.sampleTerrainHeightRange({
        minX: 2,
        maxX: 1,
        minY: 0,
        maxY: 1,
      })
    ).toThrow('Terrain height range bounds minX 2 must be <= maxX 1.');
  });

  it('supports fine-resolution terrain height-range queries', () => {
    const generator = createGenerator();
    const sample = generator.sampleTerrainHeightRange({
      minX: 10.25,
      maxX: 10.75,
      minY: 20.25,
      maxY: 20.75,
      sampleStep: 0.25,
      resolution: 'fine',
    });

    expect(sample.resolution).toBe('fine');
    expect(sample.sampleStep).toBe(0.25);
    expect(sample.sampleCount).toBe(9);
  });

  it('reuses cached terrain height-range summaries for identical regional queries', () => {
    const generator = createGenerator();
    const bounds = {
      minX: 10,
      maxX: 14,
      minY: 20,
      maxY: 24,
      sampleStep: 2,
      resolution: 'coarse' as const,
    };
    const first = generator.sampleTerrainHeightRange(bounds);
    const second = generator.sampleTerrainHeightRange(bounds);

    expect(second).toBe(first);
    expect(generator.terrainHeightSampler.sampleHeightRange(bounds)).toBe(
      first
    );
  });

  it('samples terrain sea depth explicitly from the shared surface metadata', () => {
    const generator = createGenerator();
    const surface = generator.sampleTerrainSurface(10, 20);
    const seaDepth = generator.sampleTerrainSeaDepth(10, 20);

    expect(seaDepth).toEqual({
      worldX: 10,
      worldY: 20,
      height: surface.height,
      seaLevel: surface.seaLevel,
      depthBelowSeaLevel: surface.depthBelowSeaLevel,
      isBelowSeaLevel: surface.depthBelowSeaLevel > 0,
    });
    expect(generator.terrainHeightSampler.sampleSeaDepth(10, 20)).toEqual(
      seaDepth
    );
  });

  it('keeps terrain height sampling deterministic across repeated and detached calls', () => {
    const generator = createGenerator();
    const { sampleTerrainHeight } = generator;
    const first = generator.sampleTerrainHeight(10, 20);
    const second = generator.sampleTerrainHeight(10, 20);

    expect(first).toBe(second);
    expect(sampleTerrainHeight(10, 20)).toBe(first);
    expect(generator.sampleTerrainHeight(-48, 73)).toBe(
      generator.sampleTerrainHeight(-48, 73)
    );
  });

  it('supports coarse and fine terrain height queries from the same sampler', () => {
    const generator = createGenerator();
    const queryX = 10.25;
    const queryY = 20.5;
    const coarseHeight = generator.sampleTerrainHeight(queryX, queryY);
    const explicitCoarseHeight = generator.sampleTerrainHeight(queryX, queryY, {
      resolution: 'coarse',
    });
    const fineHeight = generator.sampleTerrainHeight(queryX, queryY, {
      resolution: 'fine',
    });

    expect(coarseHeight).toBe(
      generator.sampleTerrainHeight(10, 21, {
        resolution: 'coarse',
      })
    );
    expect(explicitCoarseHeight).toBe(coarseHeight);
    expect(fineHeight).toBe(
      generator.sampleTerrainHeight(10.25, 20.5, {
        resolution: 'fine',
      })
    );
    expect(generator.terrainHeightSampler.sampleHeight(queryX, queryY)).toBe(
      coarseHeight
    );
    expect(
      generator.terrainHeightSampler.sampleHeight(queryX, queryY, {
        resolution: 'fine',
      })
    ).toBe(fineHeight);
  });

  it('uses fine-resolution sub-cell sampling for terrain derivatives when requested', () => {
    const generator = createGenerator();
    const coarseSlope = generator.sampleTerrainSlope(10.25, 20.5);
    const fineSlope = generator.sampleTerrainSlope(10.25, 20.5, {
      resolution: 'fine',
      sampleStep: 0.5,
    });
    const expectedFineSlopeX =
      (generator.sampleTerrainHeight(10.75, 20.5, {
        resolution: 'fine',
      }) -
        generator.sampleTerrainHeight(9.75, 20.5, {
          resolution: 'fine',
        })) /
      1;
    const expectedFineSlopeY =
      (generator.sampleTerrainHeight(10.25, 21, {
        resolution: 'fine',
      }) -
        generator.sampleTerrainHeight(10.25, 20, {
          resolution: 'fine',
        })) /
      1;

    expect(fineSlope.sampleStep).toBe(0.5);
    expect(fineSlope.slopeX).toBe(expectedFineSlopeX);
    expect(fineSlope.slopeY).toBe(expectedFineSlopeY);
    expect(fineSlope.grade).toBe(
      Math.hypot(expectedFineSlopeX, expectedFineSlopeY)
    );
    expect(
      generator.terrainHeightSampler.sampleSlope(10.25, 20.5, 0.5)
    ).toEqual(generator.sampleTerrainSlope(10.25, 20.5, 0.5));
    expect(coarseSlope).not.toEqual(fineSlope);
  });

  it('rejects invalid terrain query coordinates and resolutions', () => {
    const generator = createGenerator();

    expect(() =>
      generator.sampleTerrainHeight(Number.NaN, 0, {
        resolution: 'coarse',
      })
    ).toThrow('Terrain query coordinates must be finite numbers.');
    expect(() =>
      generator.sampleTerrainHeight(0, 0, {
        resolution: 'detail' as 'coarse',
      })
    ).toThrow('Terrain query resolution "detail" must be "coarse" or "fine".');
  });

  it('keeps adjacent chunk border terrain heights exactly equal on shared sample coordinates', () => {
    const generator = createGenerator();

    for (let row = 0; row < TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE; row += 1) {
      const eastWestLeft = getTerrainChunkHeightSampleCoordinate(0, 0, 16, row);
      const eastWestRight = getTerrainChunkHeightSampleCoordinate(1, 0, 0, row);
      expect(
        generator.sampleTerrainHeight(eastWestLeft.x, eastWestLeft.y)
      ).toBe(generator.sampleTerrainHeight(eastWestRight.x, eastWestRight.y));

      const southNorthTop = getTerrainChunkHeightSampleCoordinate(
        0,
        0,
        row,
        16
      );
      const southNorthBottom = getTerrainChunkHeightSampleCoordinate(
        0,
        1,
        row,
        0
      );
      expect(
        generator.sampleTerrainHeight(southNorthTop.x, southNorthTop.y)
      ).toBe(
        generator.sampleTerrainHeight(southNorthBottom.x, southNorthBottom.y)
      );
    }
  });

  it('exposes one reusable world-space terrain height sampler contract', () => {
    const generator = createGenerator();
    const surface = generator.sampleTerrainSurface(10, 20);

    expect(generator.terrainHeightSampler.sampleHeight(10, 20)).toBe(
      generator.sampleTerrainHeight(10, 20)
    );
    expect(generator.terrainHeightSampler.sampleSurface(10, 20)).toEqual(
      surface
    );
    expect(surface).toEqual({
      worldX: 10,
      worldY: 20,
      height: generator.sampleTerrainHeight(10, 20),
      seaLevel: WORLD_TERRAIN_SEA_LEVEL,
      depthBelowSeaLevel: 0,
    });
  });

  it('lets callers extend the shared terrain height path with ordered influence plugins', () => {
    const plugins = createDefaultPluginRegistry();
    const baselineGenerator = createWorldGenerator({
      seed: 'spec',
      plugins,
    });
    const layeredGenerator = createWorldGenerator({
      seed: 'spec',
      plugins,
      heightInfluencePlugins: [
        createWorldTerrainHeightInfluencePlugin({
          id: 'continent-uplift',
          order: {
            priority: 20,
            after: ['overworld-relief'],
          },
          sample() {
            return {
              amount: 0.4,
              reason: 'broad uplift boost',
            };
          },
        }),
        createWorldTerrainHeightInfluencePlugin({
          id: 'river-carving',
          order: {
            priority: 30,
            after: ['continent-uplift'],
          },
          sampling: {
            resolutions: ['fine'],
          },
          sample() {
            return -0.1;
          },
        }),
      ],
    });

    const baselineCoarse = baselineGenerator.sampleTerrainHeight(10, 20);
    const baselineFine = baselineGenerator.sampleTerrainHeight(10.25, 20.5, {
      resolution: 'fine',
    });

    expect(layeredGenerator.sampleTerrainHeight(10, 20)).toBeCloseTo(
      baselineCoarse + 0.4
    );
    expect(
      layeredGenerator.sampleTerrainHeight(10.25, 20.5, {
        resolution: 'fine',
      })
    ).toBeCloseTo(baselineFine + 0.3);
  });

  it('attributes invalid terrain heights to the height influence plugin that produced them', () => {
    const plugins = createDefaultPluginRegistry();
    const generator = createWorldGenerator({
      seed: 'spec',
      plugins,
      heightInfluencePlugins: [
        createWorldTerrainHeightInfluencePlugin({
          id: 'broken-river-carving',
          order: {
            after: ['overworld-relief'],
          },
          sample() {
            return Number.NaN;
          },
        }),
      ],
    });

    expect(() => generator.sampleTerrainHeight(10, 20)).toThrow(
      'Terrain height influence broken-river-carving amount must be a finite number.'
    );
  });

  it('keeps player-facing runtime tile heights aligned with the shared terrain sampler', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const { generator, state } = runtime;
    const samples = [
      { x: 10, y: 20 },
      { x: -3, y: -3 },
      { x: 0, y: 0 },
    ];

    for (const sample of samples) {
      state.player.x = sample.x;
      state.player.y = sample.y;
      expect(state.getCurrentTile().surfaceHeight).toBe(
        generator.sampleTerrainHeight(sample.x, sample.y)
      );
    }
  });

  it('keeps preview sampling deterministic after bounded cache eviction churn', () => {
    const generator = createGenerator();
    const baselinePreviewKind = generator.samplePreviewSurfaceKind(10, 20);
    const baselinePreviewHeight = generator.samplePreviewSurfaceHeight(10, 20);
    const baselineTerrainSurface = generator.sampleTerrainSurface(10, 20);
    const baselineTerrainSlope = generator.sampleTerrainSlope(10, 20);
    const baselineTerrainAspect = generator.sampleTerrainAspect(10, 20);
    const baselineTerrainCurvature = generator.sampleTerrainCurvature(10, 20);
    const baselineTerrainDrainage = generator.sampleTerrainDrainageGradient(
      10,
      20
    );
    const baselineTerrainRange = generator.sampleTerrainHeightRange({
      minX: 10,
      maxX: 12,
      minY: 20,
      maxY: 21,
    });
    const baselineTerrainSeaDepth = generator.sampleTerrainSeaDepth(10, 20);
    const baselinePreview = generator.samplePreviewOverworld(10, 20);
    const baselineOverworld = generator.sampleOverworld(3, 2);

    for (let index = 0; index < 9000; index += 1) {
      const x = (index % 150) - 75;
      const y = Math.floor(index / 150) - 30;
      generator.samplePreviewSurfaceKind(x, y);
      generator.samplePreviewSurfaceHeight(x, y);
      generator.sampleTerrainSurface(x, y);
      generator.sampleTerrainSlope(x, y);
      generator.sampleTerrainAspect(x, y);
      generator.sampleTerrainCurvature(x, y);
      generator.sampleTerrainHeightRange({
        minX: x,
        maxX: x + 2,
        minY: y,
        maxY: y + 1,
      });
      generator.sampleTerrainSeaDepth(x, y);
      generator.samplePreviewOverworld(x, y);
    }

    expect(generator.samplePreviewSurfaceKind(10, 20)).toBe(
      baselinePreviewKind
    );
    expect(generator.samplePreviewSurfaceHeight(10, 20)).toBe(
      baselinePreviewHeight
    );
    expect(generator.sampleTerrainSurface(10, 20)).toEqual(
      baselineTerrainSurface
    );
    expect(generator.sampleTerrainSlope(10, 20)).toEqual(baselineTerrainSlope);
    expect(generator.sampleTerrainAspect(10, 20)).toEqual(
      baselineTerrainAspect
    );
    expect(generator.sampleTerrainCurvature(10, 20)).toEqual(
      baselineTerrainCurvature
    );
    expect(generator.sampleTerrainDrainageGradient(10, 20)).toEqual(
      baselineTerrainDrainage
    );
    expect(
      generator.sampleTerrainHeightRange({
        minX: 10,
        maxX: 12,
        minY: 20,
        maxY: 21,
      })
    ).toEqual(baselineTerrainRange);
    expect(
      generator.sampleTerrainHeightRange({
        minX: 10,
        maxX: 12,
        minY: 20,
        maxY: 21,
      })
    ).toEqual(baselineTerrainRange);
    expect(generator.sampleTerrainSeaDepth(10, 20)).toEqual(
      baselineTerrainSeaDepth
    );
    expect(generator.samplePreviewOverworld(10, 20)).toEqual(baselinePreview);
    expect(generator.sampleOverworld(3, 2)).toEqual(baselineOverworld);
    expect(generator.samplePreviewOverworld(3, 2).kind).not.toBe('bridge');
  });

  it('creates the overworld through the registered map plugin path', () => {
    const generator = createGenerator();
    const overworld = generator.getMap({
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
      origin: { x: 0, y: 0 },
    });

    expect(overworld.getTile(0, 0)).toEqual(generator.sampleOverworld(0, 0));
    expect(overworld.getAction(5, 4)).toMatchObject({
      type: 'enter',
      context: {
        type: 'town',
      },
    });
  });

  it('creates enterable points of interest somewhere near the origin', () => {
    const generator = createGenerator();
    const found = generator.sampleOverworld(5, 4);

    expect(found.poi?.type).toMatch(
      /town|dungeon|cave|quarry|ship|observatory/
    );
  });

  it('enters poi instances and exits back to the overworld facing away from the entrance', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;
    const poiLocation = { x: 5, y: 4 };
    const action = state
      .getCurrentMap()
      .getAction?.(poiLocation.x, poiLocation.y, state) as
      WorldActionLike | null | undefined;

    if (action?.type !== 'enter' || action.context?.type !== 'town') {
      throw new Error(
        'Expected a deterministic town entry near the overworld origin.'
      );
    }

    state.player.x = poiLocation.x;
    state.player.y = poiLocation.y;
    state.player.facing = 0.35;

    expect(state.interact()).toBe(true);
    expect(state.stack).toHaveLength(2);
    expect(state.getCurrentContext()).toEqual(
      expect.objectContaining({
        id: action.context.id,
        type: action.context.type,
      })
    );

    state.player.x = 0;
    state.player.y = 11;

    expect(state.tryExit()).toBe(true);
    expect(state.stack).toHaveLength(1);
    expect(state.getCurrentContext().type).toBe('overworld');
    expect(state.player.x).toBe(poiLocation.x);
    expect(state.player.y).toBe(poiLocation.y);
    expect(state.player.facing).toBeCloseTo(normalizeAngle(0.35 + Math.PI), 6);
  });

  it('keeps forests, rivers, and bridges present near the overworld origin band', () => {
    const generator = createGenerator();
    expect(generator.sampleOverworld(-3, -3).kind).toBe('forest');
    expect(generator.sampleOverworld(3, -1).kind).toBe('river');
    expect(generator.sampleOverworld(3, 2).kind).toBe('bridge');
  });

  it('produces connected river runs outside the curated start region', () => {
    const generator = createGenerator();
    let foundRiverRun = false;

    for (let y = -140; y <= 140 && !foundRiverRun; y += 1) {
      for (let x = -140; x <= 140; x += 1) {
        if (Math.abs(x) <= 12 && Math.abs(y) <= 12) {
          continue;
        }
        if (generator.sampleOverworld(x, y).kind !== 'river') {
          continue;
        }

        const riverNeighbors = [
          generator.sampleOverworld(x, y - 1).kind,
          generator.sampleOverworld(x + 1, y).kind,
          generator.sampleOverworld(x, y + 1).kind,
          generator.sampleOverworld(x - 1, y).kind,
          generator.sampleOverworld(x + 1, y - 1).kind,
          generator.sampleOverworld(x + 1, y + 1).kind,
          generator.sampleOverworld(x - 1, y + 1).kind,
          generator.sampleOverworld(x - 1, y - 1).kind,
        ].filter((kind) => kind === 'river').length;

        if (riverNeighbors >= 2) {
          foundRiverRun = true;
          break;
        }
      }
    }

    expect(foundRiverRun).toBe(true);
  });

  it('produces forked river junctions outside the curated start region', () => {
    const generator = createGenerator();
    let foundRiverFork = false;

    for (let y = -180; y <= 180 && !foundRiverFork; y += 1) {
      for (let x = -180; x <= 180; x += 1) {
        if (Math.abs(x) <= 12 && Math.abs(y) <= 12) {
          continue;
        }
        if (generator.sampleOverworld(x, y).kind !== 'river') {
          continue;
        }

        const riverNeighbors = [
          generator.sampleOverworld(x, y - 1).kind,
          generator.sampleOverworld(x + 1, y).kind,
          generator.sampleOverworld(x, y + 1).kind,
          generator.sampleOverworld(x - 1, y).kind,
          generator.sampleOverworld(x + 1, y - 1).kind,
          generator.sampleOverworld(x + 1, y + 1).kind,
          generator.sampleOverworld(x - 1, y + 1).kind,
          generator.sampleOverworld(x - 1, y - 1).kind,
        ].filter((kind) => kind === 'river').length;

        if (riverNeighbors >= 3) {
          foundRiverFork = true;
          break;
        }
      }
    }

    expect(foundRiverFork).toBe(true);
  });

  it('creates town maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const townMap = generator.getMap({
      id: 'town:test:0',
      label: 'Test Town',
      type: 'town',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(townMap.getTile(0, 0).kind).toBe('town');
    expect(townMap.getTile(0, 11).kind).toBe('door');
    expect(townMap.getTile(4, 0).note).toBe('The market is busy today.');
  });

  it('creates building maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const buildingMap = generator.getMap({
      id: 'building:test:0',
      label: 'Test Building',
      type: 'building',
      depth: 2,
      origin: { x: 5, y: 4 },
    });

    expect(buildingMap.getTile(0, 0).kind).toBe('floor');
    expect(buildingMap.getTile(0, 3).kind).toBe('door');
  });

  it('creates depth maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const depthMap = generator.getMap({
      id: 'dungeon:5:4:1',
      label: 'Test Dungeon',
      type: 'dungeon',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(depthMap.getTile(0, 0).kind).toBe('dungeon');
    expect(depthMap.getTile(0, -6).kind).toBe('stairsDown');
    expect(depthMap.getAction(0, -6)).toMatchObject({
      type: 'deepen',
      context: {
        type: 'dungeon',
        depth: 2,
      },
    });
  });

  it('recreates deterministic maps after bounded map-cache eviction churn', () => {
    const generator = createGenerator();
    const baselineTownMap = generator.getMap({
      id: 'town:test:0',
      label: 'Test Town',
      type: 'town',
      depth: 1,
      origin: { x: 5, y: 4 },
    });
    const baselineTiles = [
      baselineTownMap.getTile(0, 0),
      baselineTownMap.getTile(0, 11),
      baselineTownMap.getTile(4, 0),
    ];

    for (let index = 0; index < 320; index += 1) {
      const map = generator.getMap({
        id: `town:evict:${index}`,
        label: `Town ${index}`,
        type: 'town',
        depth: 1,
        origin: { x: index + 20, y: index + 30 },
      });
      map.getTile(0, 0);
    }

    const regeneratedTownMap = generator.getMap({
      id: 'town:test:0',
      label: 'Test Town',
      type: 'town',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect([
      regeneratedTownMap.getTile(0, 0),
      regeneratedTownMap.getTile(0, 11),
      regeneratedTownMap.getTile(4, 0),
    ]).toEqual(baselineTiles);
  });

  it('creates quarry maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const quarryMap = generator.getMap({
      id: 'quarry:5:4:1',
      label: 'Test Quarry',
      type: 'quarry',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(quarryMap.getTile(0, 0).kind).toBe('quarry');
    expect(quarryMap.getTile(0, 8).kind).toBe('door');
    expect(quarryMap.getTile(0, 4).kind).toBe('road');
  });

  it('creates tower maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const towerMap = generator.getMap({
      id: 'tower:5:4:1',
      label: 'Test Tower',
      type: 'tower',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(towerMap.getTile(0, 0).kind).toBe('tower');
    expect(towerMap.getTile(0, 1).note).toContain('shoved');
    expect(towerMap.getAction(0, -5)).toMatchObject({
      type: 'deepen',
      context: {
        type: 'tower',
        depth: 2,
      },
    });
  });

  it('creates lighthouse maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const lighthouseMap = generator.getMap({
      id: 'lighthouse:5:4:1',
      label: 'Test Lighthouse',
      type: 'lighthouse',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(lighthouseMap.getTile(0, 0).kind).toBe('lighthouse');
    expect(lighthouseMap.getTile(0, 4).kind).toBe('door');
    expect(lighthouseMap.getTile(3, 0).kind).toBe('floor');
  });

  it('creates ship maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const shipMap = generator.getMap({
      id: 'ship:5:4:1',
      label: 'Test Ship',
      type: 'ship',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(shipMap.getTile(0, 0).kind).toBe('ship');
    expect(shipMap.getTile(0, 5).kind).toBe('door');
    expect(shipMap.getTile(0, -3).kind).toBe('interior');
  });

  it('creates train maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const trainContext = {
      id: 'train:5:4:1',
      label: 'Test Train',
      type: 'train',
      depth: 2,
      origin: { x: 5, y: 4 },
      lineName: 'Copper Lantern Line',
      fromStation: 'Copper Lantern Station',
      toStation: 'Frost Junction',
    } as const;
    const trainMap = generator.getMap(trainContext);
    const boardingSpawn = getTrainBoardingSpawn('spec', trainContext);

    expect(trainMap.getTile(0, boardingSpawn.y).kind).toBe('interior');
    expect(trainMap.getTile(0, boardingSpawn.y).note).toContain(
      trainContext.toStation
    );
    expect(trainMap.getTile(0, boardingSpawn.y - 5).note).not.toBe(
      trainMap.getTile(0, boardingSpawn.y).note
    );
    expect(trainMap.getTile(0, boardingSpawn.y - 10).kind).toBe('interior');
    expect(trainMap.getExit?.(0, boardingSpawn.y + 2)).toEqual(
      expect.objectContaining({})
    );
  });

  it('lets the player launch a canoe on rivers and disembark back onto land', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;
    let launchSite: { x: number; y: number } | null = null;

    for (let y = -80; y <= 80 && !launchSite; y += 1) {
      for (let x = -80; x <= 80; x += 1) {
        const launch = findNearestCanoeLaunchPoint({
          x,
          y,
          sampleTile: (sampleX, sampleY) =>
            state.getCurrentMap().getTile(sampleX, sampleY, state),
          state,
        });
        const action = state.getCurrentMap().getAction?.(x, y, state) as
          WorldActionLike | null | undefined;
        if (launch && action?.context?.type === 'canoe') {
          launchSite = { x, y };
          break;
        }
      }
    }

    if (!launchSite) {
      throw new Error(
        'Expected to find a canoe launch site near the origin band.'
      );
    }

    state.player.x = launchSite.x;
    state.player.y = launchSite.y;
    state.player.facing = 0.2;

    expect(state.interact()).toBe(true);
    expect(state.getCurrentContext().type).toBe('canoe');
    expect(['river', 'dock', 'shore', 'ocean']).toContain(
      state.getCurrentTile().kind
    );
    expect(state.canWalk(state.player.x, state.player.y)).toBe(true);

    expect(state.tryExit()).toBe(true);
    expect(state.getCurrentContext().type).toBe('overworld');
    expect(state.getTileDefinition(state.getCurrentTile().kind).walkable).toBe(
      true
    );
  });

  it('lets the player launch a boat from the coast and travel the open ocean', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;
    let launchSite: { x: number; y: number } | null = null;

    for (let y = -4; y <= 4 && !launchSite; y += 1) {
      for (let x = 4; x <= 12; x += 1) {
        const launch = findNearestBoatLaunchPoint({
          x,
          y,
          sampleTile: (sampleX, sampleY) =>
            state.getCurrentMap().getTile(sampleX, sampleY, state),
          state,
        });
        const action = state.getCurrentMap().getAction?.(x, y, state) as
          WorldActionLike | null | undefined;
        if (launch && action?.context?.type === 'boat') {
          launchSite = { x, y };
          break;
        }
      }
    }

    if (!launchSite) {
      throw new Error(
        'Expected to find a boat launch site near the starter docks.'
      );
    }

    state.player.x = launchSite.x;
    state.player.y = launchSite.y;
    state.player.facing = 0.2;

    expect(state.interact()).toBe(true);
    expect(state.getCurrentContext().type).toBe('boat');
    expect(['shore', 'dock', 'ocean']).toContain(state.getCurrentTile().kind);

    let deepOceanPoint: { x: number; y: number } | null = null;
    for (let y = -20; y <= 20 && !deepOceanPoint; y += 1) {
      for (let x = -20; x <= 20; x += 1) {
        if (state.getCurrentTile(x, y).kind === 'ocean') {
          deepOceanPoint = { x, y };
          break;
        }
      }
    }

    expect(deepOceanPoint).not.toBeNull();
    expect(state.canWalk(deepOceanPoint!.x, deepOceanPoint!.y)).toBe(true);
  }, 4_000);

  it('creates quarry points of interest somewhere near the origin', () => {
    const registry = createDefaultPluginRegistry();
    let quarryAnchor: { x: number; y: number } | null = null;
    let quarrySeed = '';

    for (let seedIndex = 0; seedIndex < 12 && !quarryAnchor; seedIndex += 1) {
      quarrySeed = `quarry-worldgen-spec:${seedIndex}`;
      const sampleTerrainSignals =
        createOverworldTerrainSignalSampler(quarrySeed);
      for (let y = -320; y <= 320 && !quarryAnchor; y += 32) {
        for (let x = -320; x <= 320; x += 32) {
          const anchors = registry.resolveOverworldAnchors({
            seed: quarrySeed,
            x,
            y,
            sampleTerrainSignals,
          });
          const found = anchors.poiAnchors.find(
            (anchor) => anchor.type === 'quarry'
          );
          if (found) {
            quarryAnchor = { x: found.x, y: found.y };
            break;
          }
        }
      }
    }

    expect(quarryAnchor).not.toBeNull();
    const generator = createWorldGenerator({
      seed: quarrySeed,
      plugins: registry,
    });

    const quarryTile = generator.sampleOverworld(
      quarryAnchor!.x,
      quarryAnchor!.y
    );

    expect(quarryTile.poi?.type).toBe('quarry');
    expect(quarryTile.poi?.name).toMatch(
      /\b(Quarry|Cut|Excavation|Pit|Works|Stone)\b/
    );
  }, 5_000);

  it('creates lighthouse points of interest somewhere near the origin', () => {
    const generator = createGenerator();
    const lighthouseTile = generator.sampleOverworld(6, 0);

    expect(lighthouseTile.poi?.type).toBe('lighthouse');
    expect(lighthouseTile.poi?.name).toMatch(
      /\b(Beacon|Light|Watch|Lantern|Signal|Point)\b/
    );
  });

  it('creates tower points of interest somewhere near the origin', () => {
    const registry = createDefaultPluginRegistry();
    let towerAnchor: { x: number; y: number } | null = null;
    let towerSeed = '';

    for (let seedIndex = 0; seedIndex < 24 && !towerAnchor; seedIndex += 1) {
      towerSeed = `tower-worldgen-spec:${seedIndex}`;
      const sampleTerrainSignals =
        createOverworldTerrainSignalSampler(towerSeed);
      for (let y = -320; y <= 320 && !towerAnchor; y += 32) {
        for (let x = -320; x <= 320; x += 32) {
          const anchors = registry.resolveOverworldAnchors({
            seed: towerSeed,
            x,
            y,
            sampleTerrainSignals,
          });
          const found = anchors.poiAnchors.find(
            (anchor) => anchor.type === 'tower'
          );
          if (found) {
            towerAnchor = { x: found.x, y: found.y };
            break;
          }
        }
      }
    }

    expect(towerAnchor).not.toBeNull();
    const generator = createWorldGenerator({
      seed: towerSeed,
      plugins: registry,
    });

    let towerTile = generator.sampleOverworld(towerAnchor!.x, towerAnchor!.y);
    if (towerTile.poi?.type !== 'tower') {
      for (
        let offsetY = -2;
        offsetY <= 2 && towerTile.poi?.type !== 'tower';
        offsetY += 1
      ) {
        for (
          let offsetX = -2;
          offsetX <= 2 && towerTile.poi?.type !== 'tower';
          offsetX += 1
        ) {
          towerTile = generator.sampleOverworld(
            towerAnchor!.x + offsetX,
            towerAnchor!.y + offsetY
          );
        }
      }
    }

    expect(towerTile.poi?.type).toBe('tower');
    expect(towerTile.poi?.name).toEqual(expect.any(String));
    expect((towerTile.poi?.name ?? '').length).toBeGreaterThan(0);
  });

  it('creates a starter ship point of interest at the lighthouse dock', () => {
    const generator = createGenerator();
    const shipTile = generator.sampleOverworld(9, 0);

    expect(shipTile.poi?.type).toBe('ship');
    expect(shipTile.poi?.name).toMatch(
      /\b(Mariner|Brig|Galleon|Hulk|Harbor|Mast)\b/
    );
  });

  it('creates station points of interest somewhere near the origin', () => {
    const registry = createDefaultPluginRegistry();
    let stationAnchor: { x: number; y: number } | null = null;
    let stationSeed = '';

    for (let seedIndex = 0; seedIndex < 24 && !stationAnchor; seedIndex += 1) {
      stationSeed = `station-worldgen-spec:${seedIndex}`;
      const sampleTerrainSignals =
        createOverworldTerrainSignalSampler(stationSeed);
      for (let y = -320; y <= 320 && !stationAnchor; y += 32) {
        for (let x = -320; x <= 320; x += 32) {
          const anchors = registry.resolveOverworldAnchors({
            seed: stationSeed,
            x,
            y,
            sampleTerrainSignals,
          });
          const found = anchors.poiAnchors.find(
            (anchor) => anchor.type === 'station'
          );
          if (found) {
            stationAnchor = { x: found.x, y: found.y };
            break;
          }
        }
      }
    }

    expect(stationAnchor).not.toBeNull();
    const generator = createWorldGenerator({
      seed: stationSeed,
      plugins: registry,
    });

    const stationTile = generator.sampleOverworld(
      stationAnchor!.x,
      stationAnchor!.y
    );

    expect(stationTile.poi?.type).toBe('station');
    expect(stationTile.poi?.name).toMatch(
      /\b(Station|Depot|Platform|Junction|Terminal|Rail)\b/
    );
  });

  it('lets the player build and enter a new poi anywhere on an open overworld tile', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;

    state.player.x = 0;
    state.player.y = 0;
    state.player.facing = 0;

    const built = buildPlayerPoi(state, 'spec', 'town');

    expect(built).toEqual(
      expect.objectContaining({
        kind: 'town',
        poi: expect.objectContaining({
          type: 'town',
        }),
      })
    );
    expect(state.getCurrentTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'town',
        poi: expect.objectContaining({
          type: 'town',
        }),
      })
    );
    expect(state.interact()).toBe(true);
    expect(state.getCurrentContext().type).toBe('town');
  });

  it('lets the player build and enter a new observatory on an open overworld tile', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;

    state.player.x = 0;
    state.player.y = 0;
    state.player.facing = 0;

    const built = buildPlayerPoi(state, 'spec', 'observatory');

    expect(built).toEqual(
      expect.objectContaining({
        kind: 'observatory',
        poi: expect.objectContaining({
          type: 'observatory',
        }),
      })
    );
    expect(state.getCurrentTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'observatory',
        poi: expect.objectContaining({
          type: 'observatory',
        }),
      })
    );
    expect(state.interact()).toBe(true);
    expect(state.getCurrentContext().type).toBe('observatory');

    state.player.x = 0;
    state.player.y = 5;
    state.player.facing = 0;
    expect(state.tryExit()).toBe(true);
    expect(state.getCurrentContext().type).toBe('overworld');
  });

  it('creates a starter observatory on a nearby summit', () => {
    const generator = createGenerator();
    const observatoryTile = generator.sampleOverworld(-6, -2);

    expect(observatoryTile.poi?.type).toBe('observatory');
    expect(observatoryTile.poi?.name).toMatch(
      /\b(Observatory|Dome|Lens|Crown|Apex|Spire)\b/
    );
  });

  it('creates starter docks beside the lighthouse instead of bridge-like coastal crossings', () => {
    const generator = createGenerator();

    expect(generator.sampleOverworld(7, 0).kind).toBe('dock');
    expect(generator.sampleOverworld(8, 0).kind).toBe('dock');
    expect(generator.sampleOverworld(3, 2).kind).toBe('bridge');
  });

  it('applies depth flavor through the registered runtime plugin path', () => {
    const generator = createGenerator();
    const depthMap = generator.getMap({
      id: 'dungeon:test:0',
      label: 'Test Dungeon',
      type: 'dungeon',
      depth: 1,
      origin: { x: 5, y: 4 },
    });
    let decoratedNote: string | undefined;
    for (let y = -10; y <= 10 && !decoratedNote; y += 1) {
      for (let x = -10; x <= 10 && !decoratedNote; x += 1) {
        const tile = depthMap.getTile(x, y);
        if (tile.note === 'Depth 1: ancient markings cover the floor.') {
          decoratedNote = tile.note;
        }
      }
    }
    expect(decoratedNote).toBe('Depth 1: ancient markings cover the floor.');
  });

  it('applies frontier overlay flavor through a composed pack registry', () => {
    const plugins = createPluginRegistryFromPacks([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    const generator = createWorldGenerator({ seed: 'spec', plugins });

    let flavoredTile = null;
    for (let y = -300; y <= 300 && !flavoredTile; y += 1) {
      for (let x = -300; x <= 300; x += 1) {
        const tile = generator.sampleOverworld(x, y);
        if (tile.kind === 'plains' && typeof tile.regionFlavor === 'string') {
          flavoredTile = tile;
          break;
        }
      }
    }

    expect(flavoredTile).toMatchObject({
      kind: 'plains',
      regionFlavor: expect.stringMatching(/-/),
      note: expect.stringContaining('stretch'),
    });
  });
});
