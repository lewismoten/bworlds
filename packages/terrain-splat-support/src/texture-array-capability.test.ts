import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from './index.ts';
import {
  assessTerrainTextureArrayCapabilities,
  createTerrainTextureBindingPlanSetFromCapabilities,
} from './texture-array-capability.ts';
import { createTerrainTextureArrayPlanSet } from './texture-array-plan.ts';

describe('terrain texture array capability', () => {
  it('uses texture arrays when WebGL2 runtime capabilities satisfy the plan', () => {
    const catalog = createCatalog();

    const planSet = createTerrainTextureBindingPlanSetFromCapabilities({
      catalog,
      resolveTexture: createTextureResolver(),
      capabilities: {
        webgl2Supported: true,
        maxTextureSize: 2048,
        maxArrayTextureLayers: 8,
        maxCombinedTextureImageUnits: 8,
      },
    });

    expect(planSet.mode).toBe('texture-array');
    expect(planSet.warnings).toEqual([]);
  });

  it('falls back when WebGL2 is unavailable and reports the reason', () => {
    const catalog = createCatalog();

    const planSet = createTerrainTextureBindingPlanSetFromCapabilities({
      catalog,
      resolveTexture: createTextureResolver(),
      capabilities: {
        webgl2Supported: false,
      },
    });

    expect(planSet.mode).toBe('per-layer-textures');
    expect(planSet.warnings).toContainEqual({
      code: 'texture-array-capability',
      message:
        'Terrain texture arrays are unavailable for this runtime: WebGL2 is not supported.',
    });
    expect(planSet.warnings).toContainEqual({
      code: 'texture-array-fallback',
      message:
        'Terrain texture binding plan is using per-layer texture fallback because texture arrays are unavailable.',
    });
  });

  it('falls back when the planned texture arrays exceed runtime limits', () => {
    const catalog = createCatalog();
    const arrayPlanSet = createTerrainTextureArrayPlanSet({
      catalog,
      resolveTexture: createTextureResolver({
        width: 1024,
        height: 1024,
      }),
    });

    const assessment = assessTerrainTextureArrayCapabilities(
      {
        webgl2Supported: true,
        maxTextureSize: 512,
        maxArrayTextureLayers: 2,
        maxCombinedTextureImageUnits: 2,
      },
      arrayPlanSet
    );

    expect(assessment).toEqual({
      supportsTextureArrays: false,
      reasons: [
        'Texture arrays exceed maxTextureSize 512: baseColor 1024x1024, normal 1024x1024, roughness 1024x1024.',
        'Texture arrays exceed maxArrayTextureLayers 2: baseColor depth 3, normal depth 3, roughness depth 3.',
        'Texture arrays require 3 combined texture image units but runtime only reports 2.',
      ],
    });

    const planSet = createTerrainTextureBindingPlanSetFromCapabilities({
      catalog,
      resolveTexture: createTextureResolver({
        width: 1024,
        height: 1024,
      }),
      capabilities: {
        webgl2Supported: true,
        maxTextureSize: 512,
        maxArrayTextureLayers: 2,
        maxCombinedTextureImageUnits: 2,
      },
    });

    expect(planSet.mode).toBe('per-layer-textures');
    expect(planSet.warnings).toContainEqual({
      code: 'texture-array-capability',
      message:
        'Terrain texture arrays are unavailable for this runtime: Texture arrays exceed maxTextureSize 512: baseColor 1024x1024, normal 1024x1024, roughness 1024x1024. Texture arrays exceed maxArrayTextureLayers 2: baseColor depth 3, normal depth 3, roughness depth 3. Texture arrays require 3 combined texture image units but runtime only reports 2.',
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

function createTextureResolver(
  options: {
    width?: number;
    height?: number;
  } = {}
) {
  const width = options.width ?? 256;
  const height = options.height ?? 256;
  const descriptors = {
    'grass/base': createTextureSource('grass/base', width, height),
    'grass/normal': createTextureSource('grass/normal', width, height),
    'grass/roughness': createTextureSource('grass/roughness', width, height),
    'soil/base': createTextureSource('soil/base', width, height),
    'soil/normal': createTextureSource('soil/normal', width, height),
    'soil/roughness': createTextureSource('soil/roughness', width, height),
    'rock/base': createTextureSource('rock/base', width, height),
    'rock/normal': createTextureSource('rock/normal', width, height),
    'rock/roughness': createTextureSource('rock/roughness', width, height),
  } as const;

  return (textureId: string) =>
    descriptors[textureId as keyof typeof descriptors];
}

function createTextureSource(id: string, width: number, height: number) {
  return {
    id,
    width,
    height,
    format: 'rgba8',
    bytesPerPixel: 4,
  };
}
