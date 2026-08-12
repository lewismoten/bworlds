import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import {
  createTerrainHeightField,
  createTerrainSplatHeightGeometryPlan,
  getTerrainHeightFieldSample,
} from './height-field.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
} from './sample-grid.ts';

describe('terrain splat height field', () => {
  it('builds one shared corner-sampled height field and geometry plan for a splat grid', () => {
    const { kindCatalog } = createCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'height-field-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 1 ? 'forest' : y >= 1 ? 'road' : 'plains',
        signals: {
          moisture: 0.58,
          roadSignal: y >= 1 ? 0.8 : 0,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveHeight: ({ x, y }) => x * 0.1 + y * 0.2,
    });

    const geometryPlan = createTerrainSplatHeightGeometryPlan({
      grid,
      heightField,
    });

    expect(heightField.width).toBe(3);
    expect(heightField.height).toBe(3);
    expect(getTerrainHeightFieldSample(heightField, 2, 1)).toBeCloseTo(0.4);
    expect(geometryPlan.vertexCount).toBe(9);
    expect(geometryPlan.triangleCount).toBe(8);
    expect(geometryPlan.lodStepMultiplier).toBe(1);
    expect(geometryPlan.positions).toHaveLength(27);
    expect(geometryPlan.normals).toHaveLength(27);
    expect(geometryPlan.uvs).toHaveLength(18);
    expect(geometryPlan.indices).toHaveLength(24);
    expect(Array.from(geometryPlan.positions.slice(0, 9))).toEqual(
      expect.arrayContaining([0, 0, 0, 1, 0, 2, 0])
    );
    expect(geometryPlan.positions[4]).toBeCloseTo(0.1);
    expect(geometryPlan.positions[7]).toBeCloseTo(0.2);
    expect(geometryPlan.normals[1]).toBeGreaterThan(0.95);
  });

  it('reduces terrain geometry density for distant lods while preserving chunk bounds', () => {
    const { kindCatalog } = createCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'height-field-lod-seed',
      bounds: {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 4,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 2 ? 'forest' : y >= 2 ? 'road' : 'plains',
        signals: {
          moisture: 0.58,
          roadSignal: y >= 2 ? 0.8 : 0,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 4,
      },
      resolveHeight: ({ x, y }) => x * 0.1 + y * 0.2,
    });

    const coarseGeometryPlan = createTerrainSplatHeightGeometryPlan({
      grid,
      heightField,
      lodStepMultiplier: 2,
    });

    expect(coarseGeometryPlan.width).toBe(3);
    expect(coarseGeometryPlan.height).toBe(3);
    expect(coarseGeometryPlan.step).toBe(2);
    expect(coarseGeometryPlan.lodStepMultiplier).toBe(2);
    expect(coarseGeometryPlan.vertexCount).toBe(9);
    expect(coarseGeometryPlan.triangleCount).toBe(8);
    expect(Math.max(...coarseGeometryPlan.indices)).toBeLessThan(
      coarseGeometryPlan.vertexCount
    );
    expect(Array.from(coarseGeometryPlan.positions.slice(0, 9))).toEqual(
      expect.arrayContaining([0, 0, 2, 4])
    );
    expect(coarseGeometryPlan.positions[4]).toBeCloseTo(0.2);
    expect(coarseGeometryPlan.positions[7]).toBeCloseTo(0.4);
    expect(coarseGeometryPlan.positions.at(-9)).toBeCloseTo(0);
    expect(coarseGeometryPlan.positions.at(-8)).toBeCloseTo(0.8);
    expect(coarseGeometryPlan.positions.at(-7)).toBeCloseTo(4);
    expect(coarseGeometryPlan.positions.at(-6)).toBeCloseTo(2);
    expect(coarseGeometryPlan.positions.at(-5)).toBeCloseTo(1);
    expect(coarseGeometryPlan.positions.at(-4)).toBeCloseTo(4);
    expect(coarseGeometryPlan.positions.at(-3)).toBeCloseTo(4);
    expect(coarseGeometryPlan.positions.at(-2)).toBeCloseTo(1.2);
    expect(coarseGeometryPlan.positions.at(-1)).toBeCloseTo(4);
  });

  it('rejects geometry lod multipliers that do not divide the chunk span cleanly', () => {
    const { kindCatalog } = createCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'height-field-lod-invalid',
      bounds: {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 4,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(() => ({
        kind: 'plains',
      })),
      fallbackLayerId: 'grass-a',
    });
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 4,
      },
      resolveHeight: () => 0,
    });

    expect(() =>
      createTerrainSplatHeightGeometryPlan({
        grid,
        heightField,
        lodStepMultiplier: 3,
      })
    ).toThrow(
      'Terrain splat height geometry lodStepMultiplier 3 must divide width span 4.'
    );
  });

  it('keeps neighboring chunk border heights identical when they sample the same world corners', () => {
    const resolveHeight = ({ x, y }: { x: number; y: number }) =>
      x * 0.15 + y * 0.05;
    const left = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveHeight,
    });
    const right = createTerrainHeightField({
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 2,
      },
      resolveHeight,
    });

    expect(getTerrainHeightFieldSample(left, 2, 0)).toBeCloseTo(
      getTerrainHeightFieldSample(right, 0, 0)
    );
    expect(getTerrainHeightFieldSample(left, 2, 1)).toBeCloseTo(
      getTerrainHeightFieldSample(right, 0, 1)
    );
    expect(getTerrainHeightFieldSample(left, 2, 2)).toBeCloseTo(
      getTerrainHeightFieldSample(right, 0, 2)
    );
  });

  it('keeps neighboring chunk border normals identical for planar heights sampled on both sides of a seam', () => {
    const resolveHeight = ({ x, y }: { x: number; y: number }) =>
      x * 0.15 + y * 0.05;
    const leftHeightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveHeight,
    });
    const rightHeightField = createTerrainHeightField({
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 2,
      },
      resolveHeight,
    });
    const { kindCatalog } = createCatalogs();
    const leftGrid = createTerrainSplatSampleGrid({
      seed: 'neighbor-normal-left',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(() => ({
        kind: 'plains',
      })),
      fallbackLayerId: 'grass-a',
    });
    const rightGrid = createTerrainSplatSampleGrid({
      seed: 'neighbor-normal-right',
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(() => ({
        kind: 'plains',
      })),
      fallbackLayerId: 'grass-a',
    });

    const leftGeometryPlan = createTerrainSplatHeightGeometryPlan({
      grid: leftGrid,
      heightField: leftHeightField,
    });
    const rightGeometryPlan = createTerrainSplatHeightGeometryPlan({
      grid: rightGrid,
      heightField: rightHeightField,
    });

    for (let row = 0; row < leftGeometryPlan.height; row += 1) {
      const leftOffset =
        (row * leftGeometryPlan.width + (leftGeometryPlan.width - 1)) * 3;
      const rightOffset = row * rightGeometryPlan.width * 3;
      expect(leftGeometryPlan.normals[leftOffset]).toBeCloseTo(
        rightGeometryPlan.normals[rightOffset],
        6
      );
      expect(leftGeometryPlan.normals[leftOffset + 1]).toBeCloseTo(
        rightGeometryPlan.normals[rightOffset + 1],
        6
      );
      expect(leftGeometryPlan.normals[leftOffset + 2]).toBeCloseTo(
        rightGeometryPlan.normals[rightOffset + 2],
        6
      );
    }
  });

  it('keeps neighboring chunk border normals identical for curved heights when an extra normal sample ring is present', () => {
    const resolveHeight = ({ x, y }: { x: number; y: number }) =>
      x * x * 0.08 + y * 0.11 + Math.sin(y * 0.5) * 0.03;
    const leftHeightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      normalSampleRing: 1,
      resolveHeight,
    });
    const rightHeightField = createTerrainHeightField({
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 2,
      },
      normalSampleRing: 1,
      resolveHeight,
    });
    const { kindCatalog } = createCatalogs();
    const leftGrid = createTerrainSplatSampleGrid({
      seed: 'neighbor-curved-normal-left',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(() => ({
        kind: 'plains',
      })),
      fallbackLayerId: 'grass-a',
    });
    const rightGrid = createTerrainSplatSampleGrid({
      seed: 'neighbor-curved-normal-right',
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(() => ({
        kind: 'plains',
      })),
      fallbackLayerId: 'grass-a',
    });

    const leftGeometryPlan = createTerrainSplatHeightGeometryPlan({
      grid: leftGrid,
      heightField: leftHeightField,
    });
    const rightGeometryPlan = createTerrainSplatHeightGeometryPlan({
      grid: rightGrid,
      heightField: rightHeightField,
    });

    for (let row = 0; row < leftGeometryPlan.height; row += 1) {
      const leftOffset =
        (row * leftGeometryPlan.width + (leftGeometryPlan.width - 1)) * 3;
      const rightOffset = row * rightGeometryPlan.width * 3;
      expect(leftGeometryPlan.normals[leftOffset]).toBeCloseTo(
        rightGeometryPlan.normals[rightOffset],
        6
      );
      expect(leftGeometryPlan.normals[leftOffset + 1]).toBeCloseTo(
        rightGeometryPlan.normals[rightOffset + 1],
        6
      );
      expect(leftGeometryPlan.normals[leftOffset + 2]).toBeCloseTo(
        rightGeometryPlan.normals[rightOffset + 2],
        6
      );
    }
  });

  it('keeps splat weights independent from the selected terrain height field', () => {
    const { kindCatalog } = createCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'height-independence-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => ({
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.66,
          season: 'summer',
          temperature: 0.7,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const sampleSnapshot = JSON.stringify(grid.samples);

    createTerrainSplatHeightGeometryPlan({
      grid,
      heightField: createTerrainHeightField({
        bounds: {
          minX: 0,
          maxX: 2,
          minY: 0,
          maxY: 2,
        },
        resolveHeight: ({ x, y }) => x + y,
      }),
    });
    createTerrainSplatHeightGeometryPlan({
      grid,
      heightField: createTerrainHeightField({
        bounds: {
          minX: 0,
          maxX: 2,
          minY: 0,
          maxY: 2,
        },
        resolveHeight: ({ x, y }) => x * 0.01 - y * 0.02,
      }),
    });

    expect(JSON.stringify(grid.samples)).toBe(sampleSnapshot);
  });
});

function createCatalogs() {
  const layerCatalog = createTerrainMaterialLayerCatalog([
    {
      id: 'grass-a',
      baseColorTextureId: 'grass-a/base',
      normalTextureId: 'grass-a/normal',
      roughnessTextureId: 'grass-a/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
    },
    {
      id: 'grass-b',
      baseColorTextureId: 'grass-b/base',
      normalTextureId: 'grass-b/normal',
      roughnessTextureId: 'grass-b/roughness',
      textureScale: 3,
      defaultTint: '#7ea24a',
      defaultRoughness: 0.88,
    },
    {
      id: 'soil',
      baseColorTextureId: 'soil/base',
      normalTextureId: 'soil/normal',
      roughnessTextureId: 'soil/roughness',
      textureScale: 2,
      defaultTint: '#7b5a3d',
      defaultRoughness: 0.8,
    },
    {
      id: 'leaf',
      baseColorTextureId: 'leaf/base',
      normalTextureId: 'leaf/normal',
      roughnessTextureId: 'leaf/roughness',
      textureScale: 2,
      defaultTint: '#5f6f31',
      defaultRoughness: 0.92,
    },
    {
      id: 'rock',
      baseColorTextureId: 'rock/base',
      normalTextureId: 'rock/normal',
      roughnessTextureId: 'rock/roughness',
      textureScale: 4,
      defaultTint: '#7f7f7f',
      defaultRoughness: 0.7,
    },
    {
      id: 'sand',
      baseColorTextureId: 'sand/base',
      normalTextureId: 'sand/normal',
      roughnessTextureId: 'sand/roughness',
      textureScale: 4,
      defaultTint: '#c9bb82',
      defaultRoughness: 0.65,
    },
    {
      id: 'dirt',
      baseColorTextureId: 'dirt/base',
      normalTextureId: 'dirt/normal',
      roughnessTextureId: 'dirt/roughness',
      textureScale: 3,
      defaultTint: '#876748',
      defaultRoughness: 0.82,
    },
    {
      id: 'gravel',
      baseColorTextureId: 'gravel/base',
      normalTextureId: 'gravel/normal',
      roughnessTextureId: 'gravel/roughness',
      textureScale: 3,
      defaultTint: '#8f8a80',
      defaultRoughness: 0.76,
    },
    {
      id: 'mud',
      baseColorTextureId: 'mud/base',
      normalTextureId: 'mud/normal',
      roughnessTextureId: 'mud/roughness',
      textureScale: 3,
      defaultTint: '#6c533f',
      defaultRoughness: 0.58,
    },
    {
      id: 'snow',
      baseColorTextureId: 'snow/base',
      normalTextureId: 'snow/normal',
      roughnessTextureId: 'snow/roughness',
      textureScale: 4,
      defaultTint: '#eef2f6',
      defaultRoughness: 0.42,
    },
    {
      id: 'dirt-road',
      baseColorTextureId: 'dirt-road/base',
      normalTextureId: 'dirt-road/normal',
      roughnessTextureId: 'dirt-road/roughness',
      textureScale: 3,
      defaultTint: '#7a6245',
      defaultRoughness: 0.78,
    },
    {
      id: 'gravel-road',
      baseColorTextureId: 'gravel-road/base',
      normalTextureId: 'gravel-road/normal',
      roughnessTextureId: 'gravel-road/roughness',
      textureScale: 3,
      defaultTint: '#8d897f',
      defaultRoughness: 0.72,
    },
  ]);
  const kindCatalog = createTerrainKindSplatCatalog(
    createOverworldTerrainSplatDefinitions({
      grassLayerIds: ['grass-a', 'grass-b'],
      soilLayerId: 'soil',
      leafLayerId: 'leaf',
      rockLayerId: 'rock',
      sandLayerId: 'sand',
      dirtLayerId: 'dirt',
      gravelLayerId: 'gravel',
      mudLayerId: 'mud',
      snowLayerId: 'snow',
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    }),
    layerCatalog
  );

  return {
    kindCatalog,
  };
}
