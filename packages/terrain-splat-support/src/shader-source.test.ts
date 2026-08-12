import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from './index.ts';
import { createTerrainSplatMaterialPlan } from './material-plan.ts';
import { createTerrainSplatShaderSourcePlan } from './shader-source.ts';
import { createTerrainTextureBindingRuntimePlan } from './texture-binding-runtime-plan.ts';
import { createTerrainTextureBindingPlanSet } from './texture-array-plan.ts';

describe('terrain splat shader source', () => {
  it('emits one bounded texture-array shader variant for shared core terrain maps', () => {
    const plan = createTerrainSplatShaderSourcePlan({
      materialPlan: createTerrainSplatMaterialPlan(
        createTerrainTextureBindingPlanSet({
          catalog: createCatalog(),
          activeLayerIds: ['grass', 'soil'],
          supportsTextureArrays: true,
          resolveTexture: createTextureResolver(),
        })
      ),
      textureBindingPlan: createTerrainTextureBindingRuntimePlan(
        createTerrainTextureBindingPlanSet({
          catalog: createCatalog(),
          activeLayerIds: ['grass', 'soil'],
          supportsTextureArrays: true,
          resolveTexture: createTextureResolver(),
        })
      ),
    });

    expect(plan.variantKey).toBe('mode:texture-array|features:baseColor,normal,roughness');
    expect(plan.defines).toEqual([
      'TERRAIN_SPLAT_TEXTURE_ARRAYS',
      'TERRAIN_SPLAT_USE_BASE_COLOR',
      'TERRAIN_SPLAT_USE_NORMAL',
      'TERRAIN_SPLAT_USE_ROUGHNESS',
    ]);
    expect(plan.attributeNames).toEqual([
      'terrainSplatLayerIndices',
      'terrainSplatLayerWeights',
    ]);
    expect(plan.fragmentShader).toContain(
      'uniform highp sampler2DArray terrainSplatBaseColorMap;'
    );
    expect(plan.fragmentShader).toContain(
      'for (int i = 0; i < 4; ++i) {'
    );
    expect(plan.fragmentShader).toContain(
      'blendedBaseColor += sampleTerrainSplatBaseColor(layerIndex, vTerrainSplatUv).rgb * weight;'
    );
    expect(plan.fragmentShader).toContain('blendedNormal = normalize(blendedNormal);');
    expect(plan.fragmentShader).toContain('blendedBaseColor *= terrainSplatTint;');
  });

  it('adds optional metalness and ambient-occlusion shader paths only when present', () => {
    const catalog = createTerrainMaterialLayerCatalog([
      {
        id: 'ore',
        baseColorTextureId: 'ore/base',
        normalTextureId: 'ore/normal',
        roughnessTextureId: 'ore/roughness',
        metalnessTextureId: 'ore/metalness',
        ambientOcclusionTextureId: 'ore/ao',
        textureScale: 4,
        defaultTint: '#8f8778',
        defaultRoughness: 0.55,
        defaultMetalness: 0.6,
      },
    ]);
    const bindingPlanSet = createTerrainTextureBindingPlanSet({
      catalog,
      activeLayerIds: ['ore'],
      supportsTextureArrays: true,
      purposes: [
        'baseColor',
        'normal',
        'roughness',
        'metalness',
        'ambientOcclusion',
      ],
      resolveTexture: createTextureResolver({
        'ore/base': createTextureSource('ore/base'),
        'ore/normal': createTextureSource('ore/normal'),
        'ore/roughness': createTextureSource('ore/roughness'),
        'ore/metalness': createTextureSource('ore/metalness'),
        'ore/ao': createTextureSource('ore/ao'),
      }),
    });

    const plan = createTerrainSplatShaderSourcePlan({
      materialPlan: createTerrainSplatMaterialPlan(bindingPlanSet),
      textureBindingPlan: createTerrainTextureBindingRuntimePlan(bindingPlanSet),
    });

    expect(plan.variantKey).toBe(
      'mode:texture-array|features:ambientOcclusion,baseColor,metalness,normal,roughness'
    );
    expect(plan.fragmentShader).toContain(
      'uniform highp sampler2DArray terrainSplatMetalnessMap;'
    );
    expect(plan.fragmentShader).toContain(
      'uniform highp sampler2DArray terrainSplatAmbientOcclusionMap;'
    );
    expect(plan.fragmentShader).toContain(
      'blendedMetalness += sampleTerrainSplatMetalness(layerIndex, vTerrainSplatUv).r * weight;'
    );
    expect(plan.fragmentShader).toContain(
      'blendedAmbientOcclusion += sampleTerrainSplatAmbientOcclusion(layerIndex, vTerrainSplatUv).r * weight;'
    );
  });

  it('uses a bounded per-layer fallback variant when texture arrays are unavailable', () => {
    const bindingPlanSet = createTerrainTextureBindingPlanSet({
      catalog: createCatalog(),
      activeLayerIds: ['grass', 'soil'],
      supportsTextureArrays: false,
      resolveTexture: createTextureResolver(),
    });
    const plan = createTerrainSplatShaderSourcePlan({
      materialPlan: createTerrainSplatMaterialPlan(bindingPlanSet),
      textureBindingPlan: createTerrainTextureBindingRuntimePlan(bindingPlanSet),
    });

    expect(plan.variantKey).toBe('mode:per-layer-textures|features:baseColor,normal,roughness');
    expect(plan.defines).toContain('TERRAIN_SPLAT_PER_LAYER_TEXTURES');
    expect(plan.fragmentShader).toContain(
      'uniform sampler2D terrainSplatBaseColorMap[4];'
    );
    expect(plan.fragmentShader).toContain(
      'return texture(terrainSplatBaseColorMap[clamp(layerIndex, 0, 3)], uv);'
    );
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
  ]);
}

function createTextureResolver(
  overrides: Readonly<Record<string, ReturnType<typeof createTextureSource>>> = {}
) {
  const descriptors = {
    'grass/base': createTextureSource('grass/base'),
    'grass/normal': createTextureSource('grass/normal'),
    'grass/roughness': createTextureSource('grass/roughness'),
    'soil/base': createTextureSource('soil/base'),
    'soil/normal': createTextureSource('soil/normal'),
    'soil/roughness': createTextureSource('soil/roughness'),
    ...overrides,
  } as const;

  return (textureId: string) => descriptors[textureId as keyof typeof descriptors];
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
