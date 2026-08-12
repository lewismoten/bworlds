import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import {
  createTerrainSplatLodTransitionPlan,
  resolveTerrainSplatLodCrossfadeWeights,
} from './lod-transition.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
  createTerrainSplatSampleGridLod,
} from './sample-grid.ts';

describe('terrain splat lod transition', () => {
  it('reports stable shared sample identities when low-detail cells preserve the same layers', () => {
    const { kindCatalog } = createCatalogs();
    const highDetailGrid = createTerrainSplatSampleGrid({
      seed: 'lod-stable-seed',
      bounds: {
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(() => ({
        kind: 'plains',
        signals: {
          moisture: 0.72,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const plan = createTerrainSplatLodTransitionPlan({
      highDetailGrid,
      lowDetailGrid: highDetailGrid,
    });

    expect(plan.cellCount).toBe(49);
    expect(plan.changedCellCount).toBe(0);
    expect(plan.requiresCrossfade).toBe(false);
    expect(plan.cells.every((cell) => cell.requiresCrossfade === false)).toBe(
      true
    );
  });

  it('flags coarse cells that change active or dominant layers so renderers can crossfade them', () => {
    const { kindCatalog } = createCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 3 ? 'forest' : y >= 3 ? 'road' : 'plains',
      signals: {
        moisture: x >= 3 ? 0.82 : 0.58,
        roadSignal: y >= 3 ? 0.84 : 0,
        season: 'summer',
        temperature: 0.68,
      },
    }));
    const highDetailGrid = createTerrainSplatSampleGrid({
      seed: 'lod-crossfade-seed',
      bounds: {
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const lowDetailGrid = createTerrainSplatSampleGridLod({
      seed: 'lod-crossfade-seed',
      bounds: {
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      lodStepMultiplier: 2,
    });

    const plan = createTerrainSplatLodTransitionPlan({
      highDetailGrid,
      lowDetailGrid,
    });

    expect(plan.changedCellCount).toBeGreaterThan(0);
    expect(plan.requiresCrossfade).toBe(true);
    expect(
      plan.cells.some(
        (cell) =>
          cell.requiresCrossfade &&
          (cell.dominantLayerChanged || cell.activeLayerSetChanged)
      )
    ).toBe(true);
  });

  it('resolves deterministic crossfade weights across a fade band', () => {
    expect(
      resolveTerrainSplatLodCrossfadeWeights({
        distance: 10,
        fadeStart: 12,
        fadeEnd: 20,
      })
    ).toEqual({
      highDetailWeight: 1,
      lowDetailWeight: 0,
    });
    expect(
      resolveTerrainSplatLodCrossfadeWeights({
        distance: 16,
        fadeStart: 12,
        fadeEnd: 20,
      })
    ).toEqual({
      highDetailWeight: 0.5,
      lowDetailWeight: 0.5,
    });
    expect(
      resolveTerrainSplatLodCrossfadeWeights({
        distance: 24,
        fadeStart: 12,
        fadeEnd: 20,
      })
    ).toEqual({
      highDetailWeight: 0,
      lowDetailWeight: 1,
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
