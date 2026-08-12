import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from './index.ts';
import {
  createTerrainMaterialFamilyCatalog,
  DEFAULT_MAX_TERRAIN_FAMILY_VARIANTS,
  resolveTerrainMaterialFamilyVariant,
  validateTerrainMaterialFamilyDefinition,
} from './variant-pool.ts';

describe('terrain material variant pool', () => {
  it('creates bounded terrain family catalogs from known layer variants', () => {
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
        defaultTint: '#7fa650',
        defaultRoughness: 0.88,
      },
      {
        id: 'grass-c',
        baseColorTextureId: 'grass-c/base',
        normalTextureId: 'grass-c/normal',
        roughnessTextureId: 'grass-c/roughness',
        textureScale: 3,
        defaultTint: '#91af5b',
        defaultRoughness: 0.87,
      },
    ]);

    const familyCatalog = createTerrainMaterialFamilyCatalog(
      [
        {
          id: 'grass',
          layerIds: ['grass-a', 'grass-b', 'grass-c'],
        },
      ],
      layerCatalog
    );

    expect(familyCatalog.entries).toEqual([
      {
        id: 'grass',
        index: 0,
        layerIds: ['grass-a', 'grass-b', 'grass-c'],
      },
    ]);
  });

  it('rejects terrain families with unknown, duplicate, or excessive variants', () => {
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
        defaultTint: '#7fa650',
        defaultRoughness: 0.88,
      },
      {
        id: 'grass-c',
        baseColorTextureId: 'grass-c/base',
        normalTextureId: 'grass-c/normal',
        roughnessTextureId: 'grass-c/roughness',
        textureScale: 3,
        defaultTint: '#91af5b',
        defaultRoughness: 0.87,
      },
      {
        id: 'grass-d',
        baseColorTextureId: 'grass-d/base',
        normalTextureId: 'grass-d/normal',
        roughnessTextureId: 'grass-d/roughness',
        textureScale: 3,
        defaultTint: '#80a24b',
        defaultRoughness: 0.86,
      },
      {
        id: 'grass-e',
        baseColorTextureId: 'grass-e/base',
        normalTextureId: 'grass-e/normal',
        roughnessTextureId: 'grass-e/roughness',
        textureScale: 3,
        defaultTint: '#7aa243',
        defaultRoughness: 0.85,
      },
    ]);

    expect(
      validateTerrainMaterialFamilyDefinition(
        {
          id: 'grass',
          layerIds: ['grass-a', 'grass-a', 'grass-z'],
        },
        layerCatalog
      )
    ).toEqual(
      expect.arrayContaining([
        'Terrain material family "grass" must not repeat layer "grass-a".',
        'Terrain material family "grass" references unknown layer "grass-z".',
      ])
    );

    expect(
      validateTerrainMaterialFamilyDefinition(
        {
          id: 'too-many',
          layerIds: ['grass-a', 'grass-b', 'grass-c', 'grass-d', 'grass-e'],
        },
        layerCatalog
      )
    ).toContain(
      `Terrain material family "too-many" exceeds the variant limit ${DEFAULT_MAX_TERRAIN_FAMILY_VARIANTS}.`
    );
  });

  it('selects terrain family variants deterministically from seed and coordinates', () => {
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
        defaultTint: '#7fa650',
        defaultRoughness: 0.88,
      },
      {
        id: 'grass-c',
        baseColorTextureId: 'grass-c/base',
        normalTextureId: 'grass-c/normal',
        roughnessTextureId: 'grass-c/roughness',
        textureScale: 3,
        defaultTint: '#91af5b',
        defaultRoughness: 0.87,
      },
    ]);
    const familyCatalog = createTerrainMaterialFamilyCatalog(
      [
        {
          id: 'grass',
          layerIds: ['grass-a', 'grass-b', 'grass-c'],
        },
      ],
      layerCatalog
    );
    const family = familyCatalog.byId.get('grass');

    expect(family).toBeDefined();
    expect(
      resolveTerrainMaterialFamilyVariant(family!, {
        seed: 'variant-seed',
        x: 12,
        y: -4,
      })
    ).toBe(
      resolveTerrainMaterialFamilyVariant(family!, {
        seed: 'variant-seed',
        x: 12,
        y: -4,
      })
    );
    expect(
      ['grass-a', 'grass-b', 'grass-c'].includes(
        resolveTerrainMaterialFamilyVariant(family!, {
          seed: 'variant-seed',
          x: 12,
          y: -4,
        }) ?? ''
      )
    ).toBe(true);
  });

  it('supports deterministic salt changes without exceeding the family pool', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
      {
        id: 'soil-a',
        baseColorTextureId: 'soil-a/base',
        normalTextureId: 'soil-a/normal',
        roughnessTextureId: 'soil-a/roughness',
        textureScale: 2,
        defaultTint: '#7b5a3d',
        defaultRoughness: 0.8,
      },
      {
        id: 'soil-b',
        baseColorTextureId: 'soil-b/base',
        normalTextureId: 'soil-b/normal',
        roughnessTextureId: 'soil-b/roughness',
        textureScale: 2,
        defaultTint: '#715339',
        defaultRoughness: 0.79,
      },
    ]);
    const familyCatalog = createTerrainMaterialFamilyCatalog(
      [
        {
          id: 'soil',
          layerIds: ['soil-a', 'soil-b'],
        },
      ],
      layerCatalog
    );
    const family = familyCatalog.byId.get('soil');

    expect(
      resolveTerrainMaterialFamilyVariant(family!, {
        seed: 'variant-seed',
        x: 2,
        y: 5,
        salt: 0,
      })
    ).not.toBeUndefined();
    expect(
      ['soil-a', 'soil-b'].includes(
        resolveTerrainMaterialFamilyVariant(family!, {
          seed: 'variant-seed',
          x: 2,
          y: 5,
          salt: 9,
        }) ?? ''
      )
    ).toBe(true);
  });
});
