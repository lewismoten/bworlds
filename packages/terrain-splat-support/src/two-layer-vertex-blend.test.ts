import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
  packTerrainSplatSampleGrid,
} from './sample-grid.ts';
import {
  createTerrainTwoLayerVertexBlendGrid,
  resolveTerrainTwoLayerVertexBlend,
} from './two-layer-vertex-blend.ts';

describe('terrain two-layer vertex blend', () => {
  it('resolves the dominant two-layer blend from one splat sample', () => {
    const blend = resolveTerrainTwoLayerVertexBlend({
      entries: [
        { layerId: 'soil', weight: 0.25 },
        { layerId: 'grass', weight: 0.5 },
        { layerId: 'leaf', weight: 0.25 },
      ],
    });

    expect(blend).toEqual({
      primaryLayerId: 'grass',
      secondaryLayerId: 'leaf',
      primaryWeight: 2 / 3,
      secondaryWeight: 1 / 3,
      blendFactor: 1 / 3,
    });
  });

  it('creates one two-layer blend grid from packed vertex weights', () => {
    const { layerCatalog, kindCatalog } = createCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'two-layer-blend-seed',
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
          moisture: 0.6,
          roadSignal: y >= 1 ? 0.82 : 0,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const blendGrid = createTerrainTwoLayerVertexBlendGrid(
      packTerrainSplatSampleGrid(grid, layerCatalog, {
        fallbackLayerId: 'grass-a',
      }),
      layerCatalog.entries
    );

    expect(blendGrid.width).toBe(3);
    expect(blendGrid.height).toBe(3);
    expect(blendGrid.blends).toHaveLength(9);
    expect(
      blendGrid.blends.some(
        (blend) =>
          blend.primaryLayerId !== null && blend.secondaryLayerId !== null
      )
    ).toBe(true);
    expect(
      blendGrid.blends.every(
        (blend) => blend.primaryWeight + blend.secondaryWeight <= 1.000001
      )
    ).toBe(true);
    expect(
      blendGrid.blends.some(
        (blend) => blend.blendFactor > 0 && blend.blendFactor < 1
      )
    ).toBe(true);
  });

  it('collapses to one primary layer when only one weighted layer is present', () => {
    const blend = resolveTerrainTwoLayerVertexBlend({
      entries: [{ layerId: 'rock', weight: 1 }],
    });

    expect(blend).toEqual({
      primaryLayerId: 'rock',
      secondaryLayerId: null,
      primaryWeight: 1,
      secondaryWeight: 0,
      blendFactor: 0,
    });
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
      defaultTint: '#8a837a',
      defaultRoughness: 0.74,
    },
  ]);
  const layerSet = {
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
  } as const;

  return {
    layerCatalog,
    kindCatalog: createTerrainKindSplatCatalog(
      createOverworldTerrainSplatDefinitions(layerSet),
      layerCatalog
    ),
  };
}
