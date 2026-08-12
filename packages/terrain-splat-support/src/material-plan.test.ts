import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from './index.ts';
import {
  createTerrainSplatMaterialPlan,
  summarizeTerrainSplatMaterialReuse,
} from './material-plan.ts';
import { createTerrainTextureBindingPlanSet } from './texture-array-plan.ts';

describe('terrain splat material plan', () => {
  it('creates one shared material plan from texture-array bindings', () => {
    const bindingPlanSet = createTerrainTextureBindingPlanSet({
      catalog: createCatalog(),
      supportsTextureArrays: true,
      resolveTexture: createTextureResolver(),
    });

    const plan = createTerrainSplatMaterialPlan(bindingPlanSet);

    expect(plan.bindingMode).toBe('texture-array');
    expect(plan.materialKey).toContain('mode:texture-array');
    expect(plan.mapPurposes).toEqual(['baseColor', 'normal', 'roughness']);
    expect(plan.requiredAttributes).toEqual([
      {
        name: 'terrainSplatLayerIndices',
        itemSize: 4,
        format: 'uint8',
        normalized: false,
      },
      {
        name: 'terrainSplatLayerWeights',
        itemSize: 4,
        format: 'uint8',
        normalized: true,
      },
    ]);
    expect(plan.globalUniforms).toEqual([
      'terrainSplatBaseColorMap',
      'terrainSplatNormalMap',
      'terrainSplatRoughnessMap',
      'terrainSplatBlendEnabled',
      'terrainSplatWetness',
      'terrainSplatSnow',
    ]);
    expect(plan.shaderDefines).toEqual([
      'TERRAIN_SPLAT_TEXTURE_ARRAYS',
      'TERRAIN_SPLAT_BASE_COLOR_MAP',
      'TERRAIN_SPLAT_NORMAL_MAP',
      'TERRAIN_SPLAT_ROUGHNESS_MAP',
    ]);
    expect(plan.warnings).toEqual([]);
  });

  it('reuses the same material key for compatible chunks', () => {
    const first = createTerrainSplatMaterialPlan(
      createTerrainTextureBindingPlanSet({
        catalog: createCatalog(),
        supportsTextureArrays: true,
        activeLayerIds: ['grass', 'soil'],
        resolveTexture: createTextureResolver(),
      })
    );
    const second = createTerrainSplatMaterialPlan(
      createTerrainTextureBindingPlanSet({
        catalog: createCatalog(),
        supportsTextureArrays: true,
        activeLayerIds: ['grass', 'soil'],
        resolveTexture: createTextureResolver(),
      })
    );

    const summary = summarizeTerrainSplatMaterialReuse([
      {
        chunkId: '0:0',
        plan: first,
      },
      {
        chunkId: '1:0',
        plan: second,
      },
    ]);

    expect(first.materialKey).toBe(second.materialKey);
    expect(summary.uniqueMaterialCount).toBe(1);
    expect(summary.reusedChunkCount).toBe(1);
    expect(summary.warnings).toEqual([
      {
        code: 'unused-layer',
        message: 'Terrain texture array plan skipped 1 unused layer(s): rock.',
      },
    ]);
  });

  it('warns when one chunk requires a unique material plan', () => {
    const shared = createTerrainSplatMaterialPlan(
      createTerrainTextureBindingPlanSet({
        catalog: createCatalog(),
        supportsTextureArrays: true,
        activeLayerIds: ['grass', 'soil'],
        resolveTexture: createTextureResolver(),
      })
    );
    const unique = createTerrainSplatMaterialPlan(
      createTerrainTextureBindingPlanSet({
        catalog: createCatalog(),
        supportsTextureArrays: false,
        activeLayerIds: ['rock'],
        resolveTexture: createTextureResolver(),
      })
    );

    const summary = summarizeTerrainSplatMaterialReuse([
      {
        chunkId: '0:0',
        plan: shared,
      },
      {
        chunkId: '1:0',
        plan: shared,
      },
      {
        chunkId: '9:9',
        plan: unique,
      },
    ]);

    expect(summary.uniqueMaterialCount).toBe(2);
    expect(summary.reusedChunkCount).toBe(1);
    expect(summary.warnings).toContainEqual({
      code: 'texture-array-fallback',
      message:
        'Terrain texture binding plan is using per-layer texture fallback because texture arrays are unavailable.',
    });
    expect(summary.warnings).toContainEqual({
      code: 'unique-splat-material',
      message: `Terrain chunk ${JSON.stringify('9:9')} created one unique splat material "${unique.materialKey}".`,
    });
  });
});

function createCatalog() {
  return createTerrainMaterialLayerCatalog([
    {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
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
}

function createTextureResolver() {
  const descriptors = {
    'grass/base': createTextureSource('grass/base'),
    'grass/normal': createTextureSource('grass/normal'),
    'grass/roughness': createTextureSource('grass/roughness'),
    'soil/base': createTextureSource('soil/base'),
    'soil/normal': createTextureSource('soil/normal'),
    'soil/roughness': createTextureSource('soil/roughness'),
    'rock/base': createTextureSource('rock/base'),
    'rock/normal': createTextureSource('rock/normal'),
    'rock/roughness': createTextureSource('rock/roughness'),
  } as const;

  return (textureId: string) =>
    descriptors[textureId as keyof typeof descriptors];
}

function createTextureSource(id: string) {
  return {
    id,
    width: 256,
    height: 256,
    format: 'rgba8',
    bytesPerPixel: 4,
  };
}
