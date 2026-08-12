import { describe, expect, it } from 'vitest';
import {
  createTerrainMaterialLayerCatalog,
  MAX_TERRAIN_SPLAT_SAMPLE_LAYERS,
  normalizeTerrainSplatSample,
  packTerrainSplatSample,
  PACKED_TERRAIN_SPLAT_WEIGHT_MAX,
  unpackTerrainSplatSample,
  validateTerrainMaterialLayerDefinition,
  validatePackedTerrainSplatSample,
  validateTerrainSplatSample,
} from './index.ts';

describe('terrain splat support', () => {
  it('accepts valid terrain material layer definitions and keeps stable indices', () => {
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
      {
        id: 'soil',
        baseColorTextureId: 'soil/base',
        normalTextureId: 'soil/normal',
        roughnessTextureId: 'soil/roughness',
        metalnessTextureId: 'soil/metalness',
        ambientOcclusionTextureId: 'soil/ao',
        textureScale: 2,
        defaultTint: '#7b5a3d',
        defaultRoughness: 0.8,
        defaultMetalness: 0.1,
      },
    ]);

    expect(catalog.entries.map((entry) => [entry.id, entry.index])).toEqual([
      ['grass', 0],
      ['soil', 1],
    ]);
  });

  it('rejects invalid terrain material layer definitions', () => {
    expect(
      validateTerrainMaterialLayerDefinition({
        id: '',
        baseColorTextureId: '',
        normalTextureId: '',
        roughnessTextureId: '',
        textureScale: 0,
        defaultTint: 'green',
        defaultRoughness: 1.4,
        defaultMetalness: -0.1,
      })
    ).toEqual(
      expect.arrayContaining([
        'Terrain material layer id must be a non-empty string.',
        'Terrain material layer "" must define a non-empty baseColorTextureId.',
        'Terrain material layer "" must define a non-empty normalTextureId.',
        'Terrain material layer "" must define a non-empty roughnessTextureId.',
        'Terrain material layer "" must define a positive finite textureScale.',
        'Terrain material layer "" must define a #RRGGBB defaultTint.',
        'Terrain material layer "" must define defaultRoughness within 0..1.',
        'Terrain material layer "" must omit defaultMetalness or define it within 0..1.',
      ])
    );
  });

  it('normalizes, clamps, trims, and stabilizes terrain splat weights', () => {
    const normalized = normalizeTerrainSplatSample(
      {
        entries: [
          { layerId: 'soil', weight: 0.2 },
          { layerId: 'grass', weight: 0.5 },
          { layerId: 'rock', weight: 0.005 },
          { layerId: 'snow', weight: 2 },
          { layerId: 'mud', weight: -0.4 },
          { layerId: 'grass', weight: 0.4 },
        ],
      },
      {
        fallbackLayerId: 'grass',
      }
    );

    expect(normalized.entries).toHaveLength(3);
    expect(normalized.entries.map((entry) => entry.layerId)).toEqual([
      'snow',
      'grass',
      'soil',
    ]);
    expect(
      normalized.entries.reduce((sum, entry) => sum + entry.weight, 0)
    ).toBeCloseTo(1, 6);
    expect(normalized.entries.every((entry) => entry.weight > 0)).toBe(true);
  });

  it('falls back to one deterministic layer when every weight collapses away', () => {
    expect(
      normalizeTerrainSplatSample(
        {
          entries: [
            { layerId: 'grass', weight: Number.NaN },
            { layerId: 'soil', weight: -1 },
          ],
        },
        {
          fallbackLayerId: 'grass',
        }
      )
    ).toEqual({
      entries: [{ layerId: 'grass', weight: 1 }],
    });
  });

  it('rejects invalid terrain splat samples', () => {
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

    expect(
      validateTerrainSplatSample(
        {
          entries: [
            { layerId: 'grass', weight: 0.5 },
            { layerId: 'soil', weight: 0.4 },
            { layerId: 'mud', weight: 0.2 },
            { layerId: 'sand', weight: 0.1 },
            { layerId: 'snow', weight: 0.1 },
          ],
        },
        catalog
      )
    ).toEqual(
      expect.arrayContaining([
        `Terrain splat sample must not exceed ${MAX_TERRAIN_SPLAT_SAMPLE_LAYERS} active layers.`,
        'Terrain splat sample references unknown layer "soil".',
        'Terrain splat sample references unknown layer "mud".',
        'Terrain splat sample references unknown layer "sand".',
        'Terrain splat sample references unknown layer "snow".',
        'Terrain splat sample weights must sum near 1.0, received 1.300.',
      ])
    );
  });

  it('rejects NaN and out-of-range weights', () => {
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

    expect(
      validateTerrainSplatSample(
        {
          entries: [
            { layerId: 'grass', weight: Number.NaN },
            { layerId: 'grass', weight: 1.2 },
          ],
        },
        catalog
      )
    ).toEqual(
      expect.arrayContaining([
        'Terrain splat sample weight for "grass" must not be NaN.',
        'Terrain splat sample weight for "grass" must stay within 0..1.',
      ])
    );
  });

  it('packs terrain splat samples into compact layer indices and weights', () => {
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
      {
        id: 'snow',
        baseColorTextureId: 'snow/base',
        normalTextureId: 'snow/normal',
        roughnessTextureId: 'snow/roughness',
        textureScale: 5,
        defaultTint: '#f7f7f7',
        defaultRoughness: 0.6,
      },
    ]);

    const packed = packTerrainSplatSample(
      {
        entries: [
          { layerId: 'grass', weight: 0.5 },
          { layerId: 'soil', weight: 0.3 },
          { layerId: 'rock', weight: 0.2 },
        ],
      },
      catalog
    );

    expect(packed.layerIndices).toEqual(new Uint8Array([0, 1, 2, 0]));
    expect([...packed.weights]).toHaveLength(MAX_TERRAIN_SPLAT_SAMPLE_LAYERS);
    expect(packed.weights.reduce((sum, weight) => sum + weight, 0)).toBe(
      PACKED_TERRAIN_SPLAT_WEIGHT_MAX
    );
  });

  it('unpacks compact terrain splat samples back into normalized weights', () => {
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

    const unpacked = unpackTerrainSplatSample(
      {
        layerIndices: new Uint8Array([0, 1, 2, 0]),
        weights: new Uint8Array([128, 76, 51, 0]),
      },
      catalog.entries
    );

    expect(unpacked.entries.map((entry) => entry.layerId)).toEqual([
      'grass',
      'soil',
      'rock',
    ]);
    expect(
      unpacked.entries.reduce((sum, entry) => sum + entry.weight, 0)
    ).toBeCloseTo(1, 6);
  });

  it('validates packed terrain splat samples and rejects unknown indices', () => {
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

    expect(
      validatePackedTerrainSplatSample(
        {
          layerIndices: new Uint8Array([0, 9]),
          weights: new Uint8Array([255, 0, 0, 0]),
        },
        catalog.entries
      )
    ).toEqual(['Packed terrain splat sample layerIndices must have length 4.']);

    expect(
      validatePackedTerrainSplatSample(
        {
          layerIndices: new Uint8Array([9, 0, 0, 0]),
          weights: new Uint8Array([255, 0, 0, 0]),
        },
        catalog.entries
      )
    ).toEqual([
      'Packed terrain splat sample references unknown layer index 9.',
    ]);
  });

  it('packs an empty sample into one fallback layer', () => {
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

    const packed = packTerrainSplatSample(
      {
        entries: [],
      },
      catalog,
      {
        fallbackLayerId: 'grass',
      }
    );

    expect(packed.layerIndices).toEqual(new Uint8Array([0, 0, 0, 0]));
    expect(packed.weights).toEqual(new Uint8Array([255, 0, 0, 0]));
  });
});
