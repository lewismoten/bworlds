import { describe, expect, it } from 'vitest';
import { resolveTerrainKindSplatSample } from './index.ts';
import { createTerrainSplatPluginCatalog } from './plugin-catalog.ts';

describe('terrain splat plugin catalog', () => {
  it('merges layer, family, and kind contributions from multiple plugins into one shared catalog', () => {
    const catalog = createTerrainSplatPluginCatalog([
      {
        pluginId: 'terrain-core',
        layers: [
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
        ],
        families: [
          {
            id: 'grass-family',
            layerIds: ['grass-a', 'grass-b'],
          },
        ],
        kinds: [
          {
            kind: 'plains',
            baseFamilyId: 'grass-family',
          },
        ],
      },
      {
        pluginId: 'terrain-forest',
        layers: [
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
            id: 'soil',
            baseColorTextureId: 'soil/base',
            normalTextureId: 'soil/normal',
            roughnessTextureId: 'soil/roughness',
            textureScale: 2,
            defaultTint: '#7b5a3d',
            defaultRoughness: 0.8,
          },
        ],
        kinds: [
          {
            kind: 'forest',
            baseFamilyId: 'grass-family',
            blends: [
              {
                layerId: 'leaf',
                weight: 0.18,
              },
              {
                layerId: 'soil',
                weight: 0.22,
              },
            ],
          },
        ],
      },
    ]);

    expect(catalog.pluginIds).toEqual(['terrain-core', 'terrain-forest']);
    expect(catalog.layerOwners.get('grass-a')).toBe('terrain-core');
    expect(catalog.kindOwners.get('forest')).toBe('terrain-forest');
    expect(catalog.familyOwners.get('grass-family')).toBe('terrain-core');

    const sample = resolveTerrainKindSplatSample(
      {
        seed: 'plugin-catalog-seed',
        x: 4,
        y: 9,
        kind: 'forest',
      },
      catalog.kindCatalog,
      {
        familyCatalog: catalog.familyCatalog,
      }
    );

    expect(sample.entries.map((entry) => entry.layerId)).toEqual(
      expect.arrayContaining(['leaf', 'soil'])
    );
    expect(sample.entries[0]?.layerId).toMatch(/^grass-/);
  });

  it('rejects duplicate layer ids across plugins before creating a shared catalog', () => {
    expect(() =>
      createTerrainSplatPluginCatalog([
        {
          pluginId: 'terrain-a',
          layers: [
            {
              id: 'grass-a',
              baseColorTextureId: 'grass-a/base',
              normalTextureId: 'grass-a/normal',
              roughnessTextureId: 'grass-a/roughness',
              textureScale: 3,
              defaultTint: '#88aa55',
              defaultRoughness: 0.9,
            },
          ],
        },
        {
          pluginId: 'terrain-b',
          layers: [
            {
              id: 'grass-a',
              baseColorTextureId: 'grass-a/base',
              normalTextureId: 'grass-a/normal',
              roughnessTextureId: 'grass-a/roughness',
              textureScale: 3,
              defaultTint: '#88aa55',
              defaultRoughness: 0.9,
            },
          ],
        },
      ])
    ).toThrow(
      'Terrain layer "grass-a" is contributed by both "terrain-a" and "terrain-b".'
    );
  });

  it('rejects duplicate terrain kinds across plugins before creating a shared catalog', () => {
    expect(() =>
      createTerrainSplatPluginCatalog([
        {
          pluginId: 'terrain-a',
          layers: [
            {
              id: 'grass-a',
              baseColorTextureId: 'grass-a/base',
              normalTextureId: 'grass-a/normal',
              roughnessTextureId: 'grass-a/roughness',
              textureScale: 3,
              defaultTint: '#88aa55',
              defaultRoughness: 0.9,
            },
          ],
          kinds: [
            {
              kind: 'plains',
              baseLayerIds: ['grass-a'],
            },
          ],
        },
        {
          pluginId: 'terrain-b',
          layers: [
            {
              id: 'grass-b',
              baseColorTextureId: 'grass-b/base',
              normalTextureId: 'grass-b/normal',
              roughnessTextureId: 'grass-b/roughness',
              textureScale: 3,
              defaultTint: '#7ea24a',
              defaultRoughness: 0.88,
            },
          ],
          kinds: [
            {
              kind: 'plains',
              baseLayerIds: ['grass-b'],
            },
          ],
        },
      ])
    ).toThrow(
      'Terrain kind "plains" is contributed by both "terrain-a" and "terrain-b".'
    );
  });
});
