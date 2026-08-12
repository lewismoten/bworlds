import { describe, expect, it } from 'vitest';
import {
  applyTerrainSplatWeatherEffects,
  createOverworldTerrainSplatDefinitions,
  createTerrainMaterialLayerCatalog,
  createTerrainKindSplatCatalog,
  MAX_TERRAIN_SPLAT_SAMPLE_LAYERS,
  normalizeTerrainSplatSample,
  packTerrainSplatSample,
  PACKED_TERRAIN_SPLAT_WEIGHT_MAX,
  resolveTerrainMaterialLayerSeasonalTintTransform,
  resolveTerrainMaterialLayerTintTransform,
  resolveTerrainMaterialLayerWorldUvSample,
  resolveTerrainMaterialLayerUvTransform,
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
        uvRotationQuarterTurns: [0, 1, 2, 3],
        allowMirrorU: true,
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
        tintVariation: 1.5,
        tintVariationCellSize: 0,
        uvRotationQuarterTurns: [0, 0.5 as 0 | 1 | 2 | 3, 0],
        allowMirrorU: 'yes' as unknown as boolean,
        allowMirrorV: 'no' as unknown as boolean,
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
        'Terrain material layer "" must omit tintVariation or define it within 0..1.',
        'Terrain material layer "" must omit tintVariationCellSize or define a positive finite value.',
        'Terrain material layer "" uvRotationQuarterTurns entries must stay within 0..3.',
        'Terrain material layer "" must not repeat uvRotationQuarterTurns entries.',
        'Terrain material layer "" must omit allowMirrorU or define a boolean.',
        'Terrain material layer "" must omit allowMirrorV or define a boolean.',
      ])
    );
  });

  it('resolves deterministic tint variation from layer configuration without changing layer identity', () => {
    const layer = {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
      tintVariation: 0.12,
    };

    const first = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 18,
      y: 27,
      kind: 'plains',
    });
    const second = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 18,
      y: 27,
      kind: 'plains',
    });
    const shifted = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 19,
      y: 27,
      kind: 'plains',
    });

    expect(second).toEqual(first);
    expect(first.defaultTint).toBe('#88aa55');
    expect(first.variationStrength).toBeCloseTo(0.12, 6);
    expect(first.resolvedTint).toMatch(/^#[0-9a-f]{6}$/);
    expect(shifted.defaultTint).toBe('#88aa55');
    expect(shifted.variationStrength).toBeCloseTo(0.12, 6);
    expect(shifted.resolvedTint).not.toBe(first.defaultTint);
  });

  it('keeps tint resolution at the default color when tint variation is omitted', () => {
    expect(
      resolveTerrainMaterialLayerTintTransform(
        {
          id: 'soil',
          baseColorTextureId: 'soil/base',
          normalTextureId: 'soil/normal',
          roughnessTextureId: 'soil/roughness',
          textureScale: 2,
          defaultTint: '#7B5A3D',
          defaultRoughness: 0.8,
        },
        {
          seed: 'pbr-splat-seed',
          x: 2,
          y: 4,
          kind: 'dirt',
        }
      )
    ).toEqual({
      defaultTint: '#7b5a3d',
      resolvedTint: '#7b5a3d',
      variationStrength: 0,
    });
  });

  it('supports large-scale tint variation fields across nearby terrain positions', () => {
    const layer = {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
      tintVariation: 0.12,
      tintVariationCellSize: 8,
    };

    const first = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 10,
      y: 20,
      kind: 'plains',
    });
    const second = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 15,
      y: 23,
      kind: 'plains',
    });
    const shifted = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 18,
      y: 29,
      kind: 'plains',
    });

    expect(first.resolvedTint).toBe(second.resolvedTint);
    expect(shifted.resolvedTint).not.toBe(first.resolvedTint);
    expect(first.variationStrength).toBeCloseTo(0.12, 6);
    expect(shifted.variationStrength).toBeCloseTo(0.12, 6);
  });

  it('keeps tint variation in metadata so one layer can still use one shared material identity', () => {
    const layer = {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
      tintVariation: 0.12,
      tintVariationCellSize: 8,
    };
    const catalog = createTerrainMaterialLayerCatalog([layer]);
    const first = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 10,
      y: 20,
      kind: 'plains',
    });
    const shifted = resolveTerrainMaterialLayerTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 18,
      y: 29,
      kind: 'plains',
    });

    expect(first.resolvedTint).not.toBe(shifted.resolvedTint);
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0]).toMatchObject({
      id: 'grass',
      index: 0,
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
    });
  });

  it('applies deterministic seasonal tint transforms on top of base tint variation', () => {
    const layer = {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
      tintVariation: 0.12,
      tintVariationCellSize: 8,
    };

    const autumn = resolveTerrainMaterialLayerSeasonalTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 10,
      y: 20,
      kind: 'plains',
      season: 'autumn',
    });
    const repeatedAutumn = resolveTerrainMaterialLayerSeasonalTintTransform(
      layer,
      {
        seed: 'pbr-splat-seed',
        x: 10,
        y: 20,
        kind: 'plains',
        season: 'autumn',
      }
    );
    const winter = resolveTerrainMaterialLayerSeasonalTintTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 10,
      y: 20,
      kind: 'plains',
      season: 'winter',
    });

    expect(repeatedAutumn).toEqual(autumn);
    expect(autumn.baseResolvedTint).toBe(
      resolveTerrainMaterialLayerTintTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 10,
        y: 20,
        kind: 'plains',
      }).resolvedTint
    );
    expect(autumn.resolvedTint).not.toBe(autumn.baseResolvedTint);
    expect(winter.resolvedTint).not.toBe(autumn.resolvedTint);
    expect(autumn.season).toBe('autumn');
    expect(autumn.seasonalStrength).toBeGreaterThan(0);
  });

  it('defaults seasonal tint resolution to summer when no season is provided', () => {
    const layer = {
      id: 'soil',
      baseColorTextureId: 'soil/base',
      normalTextureId: 'soil/normal',
      roughnessTextureId: 'soil/roughness',
      textureScale: 2,
      defaultTint: '#7b5a3d',
      defaultRoughness: 0.8,
    };

    expect(
      resolveTerrainMaterialLayerSeasonalTintTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 2,
        y: 4,
        kind: 'dirt',
      })
    ).toMatchObject({
      defaultTint: '#7b5a3d',
      baseResolvedTint: '#7b5a3d',
      season: 'summer',
      seasonalStrength: 0.04,
    });
  });

  it('resolves deterministic terrain UV transforms from layer configuration', () => {
    const layer = {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
      uvRotationQuarterTurns: [0, 1, 2, 3] as const,
      allowMirrorU: true,
      allowMirrorV: true,
    };

    const first = resolveTerrainMaterialLayerUvTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 18,
      y: 27,
      kind: 'plains',
    });
    const second = resolveTerrainMaterialLayerUvTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 18,
      y: 27,
      kind: 'plains',
    });
    const shifted = resolveTerrainMaterialLayerUvTransform(layer, {
      seed: 'pbr-splat-seed',
      x: 19,
      y: 27,
      kind: 'plains',
    });
    const sampledTransforms = [
      first,
      shifted,
      resolveTerrainMaterialLayerUvTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 20,
        y: 27,
        kind: 'plains',
      }),
      resolveTerrainMaterialLayerUvTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 21,
        y: 27,
        kind: 'plains',
      }),
    ];
    const uniqueTransforms = new Set(
      sampledTransforms.map((transform) => JSON.stringify(transform))
    );

    expect(second).toEqual(first);
    expect(first.textureScale).toBe(3);
    expect([0, 1, 2, 3]).toContain(first.rotationQuarterTurns);
    expect(typeof first.mirrorU).toBe('boolean');
    expect(typeof first.mirrorV).toBe('boolean');
    expect(uniqueTransforms.size).toBeGreaterThan(1);
  });

  it('keeps UV rotation and mirroring in metadata so one layer can still use one shared material identity', () => {
    const layer = {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
      uvRotationQuarterTurns: [0, 1, 2, 3] as const,
      allowMirrorU: true,
      allowMirrorV: true,
    };
    const catalog = createTerrainMaterialLayerCatalog([layer]);
    const sampledTransforms = [
      resolveTerrainMaterialLayerUvTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 18,
        y: 27,
        kind: 'plains',
      }),
      resolveTerrainMaterialLayerUvTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 19,
        y: 27,
        kind: 'plains',
      }),
      resolveTerrainMaterialLayerUvTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 20,
        y: 27,
        kind: 'plains',
      }),
      resolveTerrainMaterialLayerUvTransform(layer, {
        seed: 'pbr-splat-seed',
        x: 21,
        y: 27,
        kind: 'plains',
      }),
    ];

    expect(
      new Set(sampledTransforms.map((transform) => JSON.stringify(transform)))
        .size
    ).toBeGreaterThan(1);
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0]).toMatchObject({
      id: 'grass',
      index: 0,
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
    });
  });

  it('defaults terrain UV transforms when no extra options are configured', () => {
    expect(
      resolveTerrainMaterialLayerUvTransform(
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
          seed: 'pbr-splat-seed',
          x: 2,
          y: 4,
          kind: 'dirt',
        }
      )
    ).toEqual({
      textureScale: 2,
      rotationQuarterTurns: 0,
      mirrorU: false,
      mirrorV: false,
    });
  });

  it('projects deterministic world-space UV samples using per-layer texture scale', () => {
    const sample = resolveTerrainMaterialLayerWorldUvSample(
      {
        id: 'grass',
        baseColorTextureId: 'grass/base',
        normalTextureId: 'grass/normal',
        roughnessTextureId: 'grass/roughness',
        textureScale: 4,
        defaultTint: '#88aa55',
        defaultRoughness: 0.9,
      },
      {
        seed: 'pbr-splat-seed',
        x: 10,
        y: 6,
        kind: 'plains',
      }
    );

    expect(sample.textureScale).toBe(4);
    expect(sample.u).toBeCloseTo(0.5, 6);
    expect(sample.v).toBeCloseTo(0.5, 6);
  });

  it('keeps world-space UV sampling continuous across repeated terrain boundaries', () => {
    const layer = {
      id: 'soil',
      baseColorTextureId: 'soil/base',
      normalTextureId: 'soil/normal',
      roughnessTextureId: 'soil/roughness',
      textureScale: 8,
      defaultTint: '#7b5a3d',
      defaultRoughness: 0.8,
    };

    const first = resolveTerrainMaterialLayerWorldUvSample(layer, {
      seed: 'pbr-splat-seed',
      x: 2,
      y: 14,
      kind: 'dirt',
    });
    const repeated = resolveTerrainMaterialLayerWorldUvSample(layer, {
      seed: 'pbr-splat-seed',
      x: 10,
      y: 22,
      kind: 'dirt',
    });
    const negative = resolveTerrainMaterialLayerWorldUvSample(layer, {
      seed: 'pbr-splat-seed',
      x: -6,
      y: 6,
      kind: 'dirt',
    });

    expect(repeated.u).toBeCloseTo(first.u, 6);
    expect(repeated.v).toBeCloseTo(first.v, 6);
    expect(negative.u).toBeCloseTo(first.u, 6);
    expect(negative.v).toBeCloseTo(first.v, 6);
  });

  it('applies deterministic rotation and mirroring to world-space UV samples', () => {
    const layer = {
      id: 'rock',
      baseColorTextureId: 'rock/base',
      normalTextureId: 'rock/normal',
      roughnessTextureId: 'rock/roughness',
      textureScale: 4,
      defaultTint: '#7f7f7f',
      defaultRoughness: 0.7,
      uvRotationQuarterTurns: [1] as const,
      allowMirrorU: true,
      allowMirrorV: true,
    };
    const input = {
      seed: 'pbr-splat-seed',
      x: 5,
      y: 10,
      kind: 'rocky' as const,
    };

    const transform = resolveTerrainMaterialLayerUvTransform(layer, input);
    const sample = resolveTerrainMaterialLayerWorldUvSample(layer, input);

    expect(sample.rotationQuarterTurns).toBe(1);
    expect(sample.mirrorU).toBe(transform.mirrorU);
    expect(sample.mirrorV).toBe(transform.mirrorV);
    expect(sample.u).toBeGreaterThanOrEqual(0);
    expect(sample.u).toBeLessThan(1);
    expect(sample.v).toBeGreaterThanOrEqual(0);
    expect(sample.v).toBeLessThan(1);
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
          biome: 'wetland',
          moisture: 0.85,
          elevation: 0.33,
          poiSignal: 0.18,
          settlementSignal: 0.12,
          slope: 0.22,
          temperature: 0.22,
          season: 'winter',
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
          biome: 'wetland',
          moisture: 0.85,
          elevation: 0.33,
          poiSignal: 0.18,
          settlementSignal: 0.12,
          slope: 0.22,
          temperature: 0.22,
          season: 'winter',
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
          slope: 0.34,
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
    const winterForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 10,
        y: 11,
        kind: 'forest',
        signals: {
          moisture: 0.8,
          temperature: 0.18,
          season: 'winter',
        },
      },
      kindCatalog
    );
    const summerForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 10,
        y: 11,
        kind: 'forest',
        signals: {
          moisture: 0.8,
          temperature: 0.18,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const warmWinterPlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 12,
        y: 13,
        kind: 'plains',
        signals: {
          moisture: 0.76,
          temperature: 0.6,
          season: 'winter',
        },
      },
      kindCatalog
    );
    const coldWinterPlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 12,
        y: 13,
        kind: 'plains',
        signals: {
          moisture: 0.76,
          temperature: 0.2,
          season: 'winter',
        },
      },
      kindCatalog
    );
    const gentlePlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 18,
        y: 19,
        kind: 'plains',
        signals: {
          biome: 'plains',
          slope: 0.12,
          moisture: 0.8,
          temperature: 0.55,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const steepPlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 18,
        y: 19,
        kind: 'plains',
        signals: {
          biome: 'plains',
          slope: 0.74,
          moisture: 0.8,
          temperature: 0.55,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const poiPlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 22,
        y: 23,
        kind: 'plains',
        signals: {
          biome: 'plains',
          poiSignal: 0.7,
          poiType: 'tower',
          settlementSignal: 0.1,
          slope: 0.2,
          moisture: 0.5,
          temperature: 0.64,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const settlementPlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 24,
        y: 25,
        kind: 'plains',
        signals: {
          biome: 'plains',
          poiSignal: 0.1,
          settlementSignal: 0.74,
          slope: 0.18,
          moisture: 0.48,
          temperature: 0.64,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const coastalPlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 14,
        y: 15,
        kind: 'plains',
        signals: {
          biome: 'shore',
          moisture: 0.45,
          temperature: 0.68,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const poiForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 26,
        y: 27,
        kind: 'forest',
        signals: {
          biome: 'forest',
          poiSignal: 0.66,
          poiType: 'observatory',
          settlementSignal: 0.12,
          slope: 0.26,
          moisture: 0.66,
          temperature: 0.62,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const nonPoiForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 26,
        y: 27,
        kind: 'forest',
        signals: {
          biome: 'forest',
          poiSignal: 0.66,
          poiType: 'town',
          settlementSignal: 0.12,
          slope: 0.26,
          moisture: 0.66,
          temperature: 0.62,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const settlementForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 28,
        y: 29,
        kind: 'forest',
        signals: {
          biome: 'forest',
          poiSignal: 0.1,
          settlementSignal: 0.68,
          slope: 0.24,
          moisture: 0.66,
          temperature: 0.62,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const gentleMountain = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 20,
        y: 21,
        kind: 'mountain',
        signals: {
          slope: 0.24,
          elevation: 0.7,
          moisture: 0.35,
          temperature: 0.42,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const steepMountain = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 20,
        y: 21,
        kind: 'mountain',
        signals: {
          slope: 0.84,
          elevation: 0.7,
          moisture: 0.35,
          temperature: 0.42,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const inlandPlains = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 14,
        y: 15,
        kind: 'plains',
        signals: {
          biome: 'plains',
          moisture: 0.45,
          temperature: 0.68,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const swampForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 16,
        y: 17,
        kind: 'forest',
        signals: {
          biome: 'wetland',
          moisture: 0.6,
          temperature: 0.7,
          season: 'summer',
        },
      },
      kindCatalog
    );
    const uplandForest = resolveTerrainKindSplatSample(
      {
        seed: 'pbr-splat-seed',
        x: 16,
        y: 17,
        kind: 'forest',
        signals: {
          biome: 'forest',
          moisture: 0.6,
          temperature: 0.7,
          season: 'summer',
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
    expect(winterForest.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['snow'])
    );
    expect(summerForest.entries.map((entry) => entry.layerId)).not.toEqual(
      expect.arrayContaining(['snow'])
    );
    expect(coldWinterPlains.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['snow'])
    );
    expect(warmWinterPlains.entries.map((entry) => entry.layerId)).not.toEqual(
      expect.arrayContaining(['snow'])
    );
    expect(findEntryWeight(gentlePlains, 'soil')).toBeGreaterThan(
      findEntryWeight(steepPlains, 'soil')
    );
    expect(poiPlains.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['dirt'])
    );
    expect(settlementPlains.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['gravel'])
    );
    expect(coastalPlains.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['sand'])
    );
    expect(inlandPlains.entries.map((entry) => entry.layerId)).not.toEqual(
      expect.arrayContaining(['sand'])
    );
    expect(findEntryWeight(swampForest, 'soil')).toBeGreaterThan(
      findEntryWeight(uplandForest, 'soil')
    );
    expect(poiForest.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['dirt'])
    );
    expect(nonPoiForest.entries.map((entry) => entry.layerId)).not.toEqual(
      expect.arrayContaining(['dirt'])
    );
    expect(findEntryWeight(settlementForest, 'soil')).toBeGreaterThan(
      findEntryWeight(nonPoiForest, 'soil')
    );
    expect(findEntryWeight(steepMountain, 'rock')).toBeGreaterThan(
      findEntryWeight(gentleMountain, 'rock')
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

  it('applies rainy wetness modifiers without mutating the base splat sample', () => {
    const baseSample = normalizeTerrainSplatSample({
      entries: [
        { layerId: 'grass', weight: 0.84 },
        { layerId: 'soil', weight: 0.16 },
      ],
    });

    const dry = applyTerrainSplatWeatherEffects({
      sample: baseSample,
      weather: {
        kind: 'clear',
        intensity: 0.05,
        precipitation: 0,
        temperature: 67,
      },
      sustainedWetness: 0.08,
      mudLayerId: 'mud',
      snowLayerId: 'snow',
      fallbackLayerId: 'grass',
    });
    const rainy = applyTerrainSplatWeatherEffects({
      sample: baseSample,
      weather: {
        kind: 'heavy-rain',
        intensity: 0.92,
        precipitation: 0.88,
        temperature: 61,
      },
      sustainedWetness: 0.74,
      mudLayerId: 'mud',
      snowLayerId: 'snow',
      fallbackLayerId: 'grass',
    });

    expect(rainy.baseSample).toEqual(baseSample);
    expect(dry.baseSample).toEqual(baseSample);
    expect(rainy.sample.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['grass', 'soil', 'mud'])
    );
    expect(rainy.sample.entries.map((entry) => entry.layerId)).not.toEqual(
      expect.arrayContaining(['snow'])
    );
    expect(rainy.wetness).toBeGreaterThan(dry.wetness);
    expect(rainy.roughnessMultiplier).toBeLessThan(dry.roughnessMultiplier);
    expect(rainy.tintDarkening).toBeGreaterThan(dry.tintDarkening);
    expect(rainy.mudWeight).toBeGreaterThan(0);
  });

  it('adds snow cover from cold snowfall and reduces it during melting', () => {
    const baseSample = normalizeTerrainSplatSample({
      entries: [
        { layerId: 'grass', weight: 0.78 },
        { layerId: 'soil', weight: 0.22 },
      ],
    });

    const snowfall = applyTerrainSplatWeatherEffects({
      sample: baseSample,
      weather: {
        kind: 'snow',
        intensity: 0.86,
        precipitation: 0.82,
        temperature: 24,
      },
      snowAccumulation: 0.34,
      mudLayerId: 'mud',
      snowLayerId: 'snow',
      fallbackLayerId: 'grass',
    });
    const melting = applyTerrainSplatWeatherEffects({
      sample: baseSample,
      weather: {
        kind: 'light-rain',
        intensity: 0.42,
        precipitation: 0.38,
        temperature: 43,
      },
      snowAccumulation: 0.34,
      snowMelt: 0.75,
      sustainedWetness: 0.3,
      mudLayerId: 'mud',
      snowLayerId: 'snow',
      fallbackLayerId: 'grass',
    });

    expect(snowfall.sample.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['snow'])
    );
    expect(snowfall.snowWeight).toBeGreaterThan(0);
    expect(melting.snowWeight).toBeLessThan(snowfall.snowWeight);
    expect(melting.mudWeight).toBeGreaterThan(0);
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

  it('rejects invalid temperature and season conditions on terrain kinds', () => {
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
          baseLayerIds: ['grass'],
          blends: [
            {
              layerId: 'grass',
              weight: 0.2,
              when: {
                minTemperature: 1.2,
                seasons: ['monsoon' as 'winter'],
              },
            },
          ],
        },
        layerCatalog
      )
    ).toEqual(
      expect.arrayContaining([
        'Terrain splat kind "plains" must keep minTemperature within 0..1.',
        'Terrain splat kind "plains" seasons must only contain spring, summer, autumn, or winter.',
      ])
    );
  });

  it('rejects invalid biome conditions on terrain kinds', () => {
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
          baseLayerIds: ['grass'],
          blends: [
            {
              layerId: 'grass',
              weight: 0.2,
              when: {
                biomes: ['shore', ''],
              },
            },
          ],
        },
        layerCatalog
      )
    ).toEqual(
      expect.arrayContaining([
        'Terrain splat kind "plains" biomes must only contain non-empty biome labels.',
      ])
    );
  });

  it('rejects invalid slope conditions on terrain kinds', () => {
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
          baseLayerIds: ['grass'],
          blends: [
            {
              layerId: 'grass',
              weight: 0.2,
              when: {
                minSlope: -0.1,
                maxSlope: 1.3,
              },
            },
          ],
        },
        layerCatalog
      )
    ).toEqual(
      expect.arrayContaining([
        'Terrain splat kind "plains" must keep minSlope within 0..1.',
        'Terrain splat kind "plains" must keep maxSlope within 0..1.',
      ])
    );
  });

  it('rejects invalid poi and settlement conditions on terrain kinds', () => {
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
          baseLayerIds: ['grass'],
          blends: [
            {
              layerId: 'grass',
              weight: 0.2,
              when: {
                minPoiSignal: 1.1,
                maxSettlementSignal: -0.1,
                poiTypes: ['tower', ''],
              },
            },
          ],
        },
        layerCatalog
      )
    ).toEqual(
      expect.arrayContaining([
        'Terrain splat kind "plains" must keep minPoiSignal within 0..1.',
        'Terrain splat kind "plains" must keep maxSettlementSignal within 0..1.',
        'Terrain splat kind "plains" poiTypes must only contain non-empty poi labels.',
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
