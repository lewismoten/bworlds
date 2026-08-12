import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainMaterialLayerCatalog,
  createTerrainKindSplatCatalog,
  MAX_TERRAIN_SPLAT_SAMPLE_LAYERS,
  normalizeTerrainSplatSample,
  packTerrainSplatSample,
  PACKED_TERRAIN_SPLAT_WEIGHT_MAX,
  resolveTerrainKindSplatSample,
  unpackTerrainSplatSample,
  validateTerrainKindSplatDefinition,
  validateTerrainMaterialLayerDefinition,
  validatePackedTerrainSplatSample,
  validateTerrainSplatSample,
} from './index.ts';
import { createTerrainMaterialFamilyCatalog } from './variant-pool.ts';

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

  it('builds deterministic overworld terrain splat samples from seed and tile kind', () => {
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

    const first = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 12,
        y: -4,
        kind: 'forest',
        signals: {
          moisture: 0.85,
          elevation: 0.33,
        },
      },
      kindCatalog
    );
    const second = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 12,
        y: -4,
        kind: 'forest',
        signals: {
          moisture: 0.85,
          elevation: 0.33,
        },
      },
      kindCatalog
    );

    expect(first).toEqual(second);
    expect(first.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['soil', 'leaf'])
    );
    expect(
      first.entries.reduce((sum, entry) => sum + entry.weight, 0)
    ).toBeCloseTo(1, 6);
  });

  it('uses overworld signals to shift terrain splat blends', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
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
        grassLayerIds: ['grass'],
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

    const dryForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 0,
        y: 0,
        kind: 'forest',
        signals: {
          moisture: 0.2,
        },
      },
      kindCatalog
    );
    const wetForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 0,
        y: 0,
        kind: 'forest',
        signals: {
          moisture: 0.9,
        },
      },
      kindCatalog
    );
    const road = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 1,
        y: 1,
        kind: 'road',
        signals: {
          roadSignal: 0.7,
        },
      },
      kindCatalog
    );

    expect(findEntryWeight(wetForest, 'leaf')).toBeGreaterThan(
      findEntryWeight(dryForest, 'leaf')
    );
    expect(road.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['dirt-road', 'gravel-road'])
    );

    const snowyLowland = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 2,
        y: 3,
        kind: 'snow',
        signals: {
          moisture: 0.4,
          elevation: 0.35,
        },
      },
      kindCatalog
    );
    const snowyHighland = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 2,
        y: 3,
        kind: 'snow',
        signals: {
          moisture: 0.92,
          elevation: 0.88,
        },
      },
      kindCatalog
    );
    const muddyGround = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 4,
        y: 5,
        kind: 'mud',
        signals: {
          moisture: 0.95,
        },
      },
      kindCatalog
    );
    const rockyGround = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 6,
        y: 7,
        kind: 'rocky',
        signals: {
          moisture: 0.2,
        },
      },
      kindCatalog
    );
    const dirtPath = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 8,
        y: 9,
        kind: 'path',
        signals: {
          moisture: 0.7,
        },
      },
      kindCatalog
    );

    expect(snowyLowland.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['snow', 'soil'])
    );
    expect(snowyHighland.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['snow', 'rock'])
    );
    expect(muddyGround.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['mud', 'soil'])
    );
    expect(rockyGround.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['rock', 'soil', 'gravel'])
    );
    expect(dirtPath.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['dirt', 'gravel', 'soil'])
    );
  });

  it('keeps water and bridge kinds out of normal ground splatting', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
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
        grassLayerIds: ['grass'],
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

    expect(
      resolveTerrainKindSplatSample(
        {
          seed: 'pbr-splat-seed',
          x: 5,
          y: 8,
          kind: 'river',
        },
        kindCatalog
      )
    ).toEqual({ entries: [] });
    expect(
      resolveTerrainKindSplatSample(
        {
          seed: 'pbr-splat-seed',
          x: 5,
          y: 8,
          kind: 'bridge',
        },
        kindCatalog
      )
    ).toEqual({ entries: [] });
  });

  it('rejects terrain kind splat definitions that reference missing layers', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
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
      validateTerrainKindSplatDefinition(
        {
          kind: 'plains',
          baseLayerIds: ['grass', 'soil'],
          blends: [
            {
              layerId: 'leaf',
              weight: 0.2,
            },
          ],
        },
        layerCatalog
      )
    ).toEqual(
      expect.arrayContaining([
        'Terrain splat kind "plains" references unknown base layer "soil".',
        'Terrain splat kind "plains" references unknown blend layer "leaf".',
      ])
    );
  });

  it('rejects terrain kind definitions that mix raw base layers with shared families', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
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
    const familyCatalog = createTerrainMaterialFamilyCatalog(
      [
        {
          id: 'grass-family',
          layerIds: ['grass'],
        },
      ],
      layerCatalog
    );

    expect(
      validateTerrainKindSplatDefinition(
        {
          kind: 'plains',
          baseLayerIds: ['grass'],
          baseFamilyId: 'grass-family',
        },
        layerCatalog,
        {
          familyCatalog,
        }
      )
    ).toContain(
      'Terrain splat kind "plains" must define baseLayerIds or baseFamilyId, not both.'
    );
  });

  it('resolves terrain kind splat samples from shared material families', () => {
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
        id: 'soil',
        baseColorTextureId: 'soil/base',
        normalTextureId: 'soil/normal',
        roughnessTextureId: 'soil/roughness',
        textureScale: 2,
        defaultTint: '#7b5a3d',
        defaultRoughness: 0.8,
      },
    ]);
    const familyCatalog = createTerrainMaterialFamilyCatalog(
      [
        {
          id: 'grass-family',
          layerIds: ['grass-a', 'grass-b'],
        },
      ],
      layerCatalog
    );
    const kindCatalog = createTerrainKindSplatCatalog(
      [
        {
          kind: 'plains',
          baseFamilyId: 'grass-family',
          blends: [
            {
              layerId: 'soil',
              weight: 0.2,
              when: {
                minMoisture: 0.8,
              },
            },
          ],
        },
      ],
      layerCatalog,
      {
        familyCatalog,
      }
    );

    const first = resolveTerrainKindSplatSample(
      {
        seed: 'family-seed',
        x: 4,
        y: 9,
        kind: 'plains',
        signals: {
          moisture: 0.85,
        },
      },
      kindCatalog,
      {
        familyCatalog,
      }
    );
    const second = resolveTerrainKindSplatSample(
      {
        seed: 'family-seed',
        x: 4,
        y: 9,
        kind: 'plains',
        signals: {
          moisture: 0.85,
        },
      },
      kindCatalog,
      {
        familyCatalog,
      }
    );

    expect(first).toEqual(second);
    expect(first.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['soil'])
    );
    expect(['grass-a', 'grass-b']).toContain(first.entries[0]?.layerId);
  });
});

function findEntryWeight(
  sample: { entries: readonly { layerId: string; weight: number }[] },
  layerId: string
): number {
  return sample.entries.find((entry) => entry.layerId === layerId)?.weight ?? 0;
}
