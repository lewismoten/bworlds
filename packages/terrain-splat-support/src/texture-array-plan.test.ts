import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from './index.ts';
import {
  createTerrainTextureArrayPlan,
  createTerrainTextureArrayPlanSet,
} from './texture-array-plan.ts';

describe('terrain texture array plan', () => {
  it('creates aligned base color, normal, and roughness array plans from the shared layer catalog', () => {
    const catalog = createTerrainMaterialLayerCatalog([
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
        id: 'soil',
        baseColorTextureId: 'soil/base',
        normalTextureId: 'soil/normal',
        roughnessTextureId: 'soil/roughness',
        textureScale: 2,
        defaultTint: '#7b5a3d',
        defaultRoughness: 0.8,
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
    ]);

    const planSet = createTerrainTextureArrayPlanSet({
      catalog,
      resolveTexture: createTextureResolver({
        'grass-a/base': createTextureSource('grass-a/base'),
        'soil/base': createTextureSource('soil/base'),
        'rock/base': createTextureSource('rock/base'),
        'grass-a/normal': createTextureSource('grass-a/normal'),
        'soil/normal': createTextureSource('soil/normal'),
        'rock/normal': createTextureSource('rock/normal'),
        'grass-a/roughness': createTextureSource('grass-a/roughness'),
        'soil/roughness': createTextureSource('soil/roughness'),
        'rock/roughness': createTextureSource('rock/roughness'),
      }),
    });

    expect(planSet.layerSlots).toEqual([
      { layerId: 'grass-a', layerIndex: 0 },
      { layerId: 'soil', layerIndex: 1 },
      { layerId: 'rock', layerIndex: 2 },
    ]);
    expect(planSet.plans.map((plan) => plan.purpose)).toEqual([
      'baseColor',
      'normal',
      'roughness',
    ]);
    expect(planSet.plans.every((plan) => plan.depth === 3)).toBe(true);
    expect(planSet.plans.every((plan) => plan.width === 256)).toBe(true);
    expect(planSet.plans.every((plan) => plan.height === 256)).toBe(true);
    expect(planSet.plans.every((plan) => plan.format === 'rgba8')).toBe(true);
    expect(planSet.plans.every((plan) => plan.bytesPerPixel === 4)).toBe(true);
    expect(planSet.plans[0]?.layerSlots).toEqual([
      { layerId: 'grass-a', layerIndex: 0, textureId: 'grass-a/base' },
      { layerId: 'soil', layerIndex: 1, textureId: 'soil/base' },
      { layerId: 'rock', layerIndex: 2, textureId: 'rock/base' },
    ]);
    expect(planSet.plans[1]?.layerSlots).toEqual([
      { layerId: 'grass-a', layerIndex: 0, textureId: 'grass-a/normal' },
      { layerId: 'soil', layerIndex: 1, textureId: 'soil/normal' },
      { layerId: 'rock', layerIndex: 2, textureId: 'rock/normal' },
    ]);
    expect(planSet.plans[2]?.layerSlots).toEqual([
      {
        layerId: 'grass-a',
        layerIndex: 0,
        textureId: 'grass-a/roughness',
      },
      { layerId: 'soil', layerIndex: 1, textureId: 'soil/roughness' },
      { layerId: 'rock', layerIndex: 2, textureId: 'rock/roughness' },
    ]);
    expect(planSet.plans[0]?.estimatedBytes).toBe(256 * 256 * 3 * 4);
    expect(planSet.estimatedBytes).toBe(256 * 256 * 3 * 4 * 3);
  });

  it('supports optional metalness arrays only when every participating layer provides a matching texture', () => {
    const catalog = createTerrainMaterialLayerCatalog([
      {
        id: 'ore',
        baseColorTextureId: 'ore/base',
        normalTextureId: 'ore/normal',
        roughnessTextureId: 'ore/roughness',
        metalnessTextureId: 'ore/metalness',
        textureScale: 4,
        defaultTint: '#8f8778',
        defaultRoughness: 0.55,
        defaultMetalness: 0.6,
      },
      {
        id: 'steel-path',
        baseColorTextureId: 'steel-path/base',
        normalTextureId: 'steel-path/normal',
        roughnessTextureId: 'steel-path/roughness',
        metalnessTextureId: 'steel-path/metalness',
        textureScale: 4,
        defaultTint: '#9aa3ab',
        defaultRoughness: 0.42,
        defaultMetalness: 0.8,
      },
    ]);

    const plan = createTerrainTextureArrayPlan({
      purpose: 'metalness',
      catalog,
      resolveTexture: createTextureResolver({
        'ore/metalness': createTextureSource('ore/metalness', {
          width: 128,
          height: 128,
          format: 'r8',
          bytesPerPixel: 1,
        }),
        'steel-path/metalness': createTextureSource('steel-path/metalness', {
          width: 128,
          height: 128,
          format: 'r8',
          bytesPerPixel: 1,
        }),
      }),
    });

    expect(plan.purpose).toBe('metalness');
    expect(plan.format).toBe('r8');
    expect(plan.bytesPerPixel).toBe(1);
    expect(plan.depth).toBe(2);
    expect(plan.estimatedBytes).toBe(128 * 128 * 2);
  });

  it('supports optional ambient occlusion arrays for an active layer subset and warns about skipped layers', () => {
    const catalog = createTerrainMaterialLayerCatalog([
      {
        id: 'ore',
        baseColorTextureId: 'ore/base',
        normalTextureId: 'ore/normal',
        roughnessTextureId: 'ore/roughness',
        ambientOcclusionTextureId: 'ore/ao',
        textureScale: 4,
        defaultTint: '#8f8778',
        defaultRoughness: 0.55,
      },
      {
        id: 'grass',
        baseColorTextureId: 'grass/base',
        normalTextureId: 'grass/normal',
        roughnessTextureId: 'grass/roughness',
        textureScale: 3,
        defaultTint: '#88aa55',
        defaultRoughness: 0.9,
      },
    ]);

    const planSet = createTerrainTextureArrayPlanSet({
      catalog,
      activeLayerIds: ['ore'],
      purposes: ['ambientOcclusion'],
      resolveTexture: createTextureResolver({
        'ore/ao': createTextureSource('ore/ao', {
          width: 128,
          height: 128,
          format: 'r8',
          bytesPerPixel: 1,
        }),
      }),
    });

    expect(planSet.activeLayerIds).toEqual(['ore']);
    expect(planSet.unusedLayerIds).toEqual(['grass']);
    expect(planSet.layerSlots).toEqual([{ layerId: 'ore', layerIndex: 0 }]);
    expect(planSet.plans[0]).toMatchObject({
      purpose: 'ambientOcclusion',
      depth: 1,
      format: 'r8',
      bytesPerPixel: 1,
      estimatedBytes: 128 * 128,
    });
    expect(planSet.warnings).toEqual([
      {
        code: 'unused-layer',
        message: 'Terrain texture array plan skipped 1 unused layer(s): grass.',
      },
    ]);
  });

  it('warns when requested active layers are missing from the shared catalog', () => {
    const catalog = createTerrainMaterialLayerCatalog([
      {
        id: 'grass',
        baseColorTextureId: 'grass/base',
        normalTextureId: 'grass/normal',
        roughnessTextureId: 'grass/roughness',
        textureScale: 3,
        defaultTint: '#88aa55',
        defaultRoughness: 0.9,
      },
    ]);

    const planSet = createTerrainTextureArrayPlanSet({
      catalog,
      activeLayerIds: ['grass', 'missing'],
      resolveTexture: createTextureResolver({
        'grass/base': createTextureSource('grass/base'),
        'grass/normal': createTextureSource('grass/normal'),
        'grass/roughness': createTextureSource('grass/roughness'),
      }),
    });

    expect(planSet.activeLayerIds).toEqual(['grass']);
    expect(planSet.unusedLayerIds).toEqual([]);
    expect(planSet.warnings).toEqual([
      {
        code: 'unknown-active-layer',
        message:
          'Terrain texture array plan requested 1 unknown active layer(s): missing.',
      },
    ]);
  });

  it('rejects mismatched texture dimensions inside one array purpose', () => {
    const catalog = createTerrainMaterialLayerCatalog([
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
        id: 'soil',
        baseColorTextureId: 'soil/base',
        normalTextureId: 'soil/normal',
        roughnessTextureId: 'soil/roughness',
        textureScale: 2,
        defaultTint: '#7b5a3d',
        defaultRoughness: 0.8,
      },
    ]);

    expect(() =>
      createTerrainTextureArrayPlan({
        purpose: 'baseColor',
        catalog,
        resolveTexture: createTextureResolver({
          'grass-a/base': createTextureSource('grass-a/base', {
            width: 256,
            height: 256,
          }),
          'soil/base': createTextureSource('soil/base', {
            width: 512,
            height: 256,
          }),
        }),
      })
    ).toThrowError(
      'Terrain base color texture array plan requires consistent dimensions; layer "soil" texture "soil/base" uses 512x256 instead of 256x256.'
    );
  });

  it('rejects mismatched formats inside one array purpose', () => {
    const catalog = createTerrainMaterialLayerCatalog([
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
        id: 'soil',
        baseColorTextureId: 'soil/base',
        normalTextureId: 'soil/normal',
        roughnessTextureId: 'soil/roughness',
        textureScale: 2,
        defaultTint: '#7b5a3d',
        defaultRoughness: 0.8,
      },
    ]);

    expect(() =>
      createTerrainTextureArrayPlan({
        purpose: 'normal',
        catalog,
        resolveTexture: createTextureResolver({
          'grass-a/normal': createTextureSource('grass-a/normal', {
            format: 'rgba8',
          }),
          'soil/normal': createTextureSource('soil/normal', {
            format: 'rgb8',
          }),
        }),
      })
    ).toThrowError(
      'Terrain normal texture array plan requires one shared format; layer "soil" texture "soil/normal" uses "rgb8" instead of "rgba8".'
    );
  });

  it('rejects optional array purposes when one layer omits the required texture id', () => {
    const catalog = createTerrainMaterialLayerCatalog([
      {
        id: 'ore',
        baseColorTextureId: 'ore/base',
        normalTextureId: 'ore/normal',
        roughnessTextureId: 'ore/roughness',
        metalnessTextureId: 'ore/metalness',
        textureScale: 4,
        defaultTint: '#8f8778',
        defaultRoughness: 0.55,
        defaultMetalness: 0.6,
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
    ]);

    expect(() =>
      createTerrainTextureArrayPlan({
        purpose: 'metalness',
        catalog,
        resolveTexture: createTextureResolver({
          'ore/metalness': createTextureSource('ore/metalness'),
        }),
      })
    ).toThrowError(
      'Terrain layer "rock" must define metalnessTextureId before building the metalness texture array plan.'
    );
  });
});

function createTextureResolver(
  textures: Readonly<Record<string, ReturnType<typeof createTextureSource>>>
) {
  return (textureId: string) => textures[textureId];
}

function createTextureSource(
  id: string,
  options: {
    width?: number;
    height?: number;
    format?: string;
    bytesPerPixel?: number;
  } = {}
) {
  return {
    id,
    width: options.width ?? 256,
    height: options.height ?? 256,
    format: options.format ?? 'rgba8',
    bytesPerPixel: options.bytesPerPixel ?? 4,
  };
}
