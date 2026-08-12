import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from './index.ts';
import {
  createTerrainTextureBindingRuntimePlan,
  summarizeTerrainTextureBindingReuse,
} from './texture-binding-runtime-plan.ts';
import { createTerrainTextureBindingPlanSet } from './texture-array-plan.ts';

describe('terrain texture binding runtime plan', () => {
  it('creates one shared runtime binding plan for compatible texture-array chunks', () => {
    const catalog = createCatalog();
    const first = createTerrainTextureBindingRuntimePlan(
      createTerrainTextureBindingPlanSet({
        catalog,
        activeLayerIds: ['grass', 'soil'],
        supportsTextureArrays: true,
        resolveTexture: createTextureResolver(),
      })
    );
    const second = createTerrainTextureBindingRuntimePlan(
      createTerrainTextureBindingPlanSet({
        catalog,
        activeLayerIds: ['grass', 'soil'],
        supportsTextureArrays: true,
        resolveTexture: createTextureResolver(),
      })
    );

    const summary = summarizeTerrainTextureBindingReuse([
      {
        chunkId: '0:0',
        plan: first,
      },
      {
        chunkId: '1:0',
        plan: second,
      },
    ]);

    expect(first.mode).toBe('texture-array');
    expect(first.sharedBindingKey).toBe(second.sharedBindingKey);
    expect(first.bindings).toEqual([
      expect.objectContaining({
        purpose: 'baseColor',
        mode: 'texture-array',
        width: 256,
        height: 256,
        depth: 2,
        format: 'rgba8',
        bytesPerPixel: 4,
        textureIds: ['grass/base', 'soil/base'],
      }),
      expect.objectContaining({
        purpose: 'normal',
      }),
      expect.objectContaining({
        purpose: 'roughness',
      }),
    ]);
    expect(summary.uniqueBindingCount).toBe(1);
    expect(summary.bindingReuseCount).toBe(1);
  });

  it('creates distinct shared binding keys when active layer texture sets differ', () => {
    const catalog = createCatalog();
    const first = createTerrainTextureBindingRuntimePlan(
      createTerrainTextureBindingPlanSet({
        catalog,
        activeLayerIds: ['grass', 'soil'],
        supportsTextureArrays: true,
        resolveTexture: createTextureResolver(),
      })
    );
    const second = createTerrainTextureBindingRuntimePlan(
      createTerrainTextureBindingPlanSet({
        catalog,
        activeLayerIds: ['grass', 'rock'],
        supportsTextureArrays: true,
        resolveTexture: createTextureResolver(),
      })
    );

    expect(first.sharedBindingKey).not.toBe(second.sharedBindingKey);
  });

  it('preserves fallback warnings when arrays are unavailable', () => {
    const plan = createTerrainTextureBindingRuntimePlan(
      createTerrainTextureBindingPlanSet({
        catalog: createCatalog(),
        activeLayerIds: ['grass', 'soil'],
        supportsTextureArrays: false,
        resolveTexture: createTextureResolver(),
      })
    );

    expect(plan.mode).toBe('per-layer-textures');
    expect(plan.bindings[0]).toMatchObject({
      purpose: 'baseColor',
      mode: 'per-layer-textures',
      depth: 2,
      textureIds: ['grass/base', 'soil/base'],
    });
    expect(plan.warnings).toContainEqual({
      code: 'texture-array-fallback',
      message:
        'Terrain texture binding plan is using per-layer texture fallback because texture arrays are unavailable.',
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
