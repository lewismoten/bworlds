import { describe, expect, it } from 'vitest';
import { createMapFeaturePointRecord } from './map-features.ts';
import {
  createDerivedMapFeatureGeneratorPlugin,
  createMapDerivedDataSourceReference,
  createMapDerivedDataSourceReferences,
} from './map-derived-sources.ts';

describe('map derived sources', () => {
  it('normalizes individual map data source references', () => {
    expect(
      createMapDerivedDataSourceReference({
        kind: ' terrain-sampler ',
        sourceId: ' worldgen:terrain ',
        description: ' shared terrain sampler ',
      })
    ).toEqual({
      kind: 'terrain-sampler',
      sourceId: 'worldgen:terrain',
      description: 'shared terrain sampler',
    });
  });

  it('dedupes map data source references and keeps the first description', () => {
    expect(
      createMapDerivedDataSourceReferences([
        {
          kind: 'terrain-sampler',
          sourceId: 'worldgen:terrain',
          description: 'shared terrain sampler',
        },
        {
          kind: ' terrain-sampler ',
          sourceId: ' worldgen:terrain ',
          description: 'ignored replacement',
        },
        {
          kind: 'overworld-anchor',
          sourceId: 'runtime-overworld-anchors:town',
        },
      ])
    ).toEqual([
      {
        kind: 'terrain-sampler',
        sourceId: 'worldgen:terrain',
        description: 'shared terrain sampler',
      },
      {
        kind: 'overworld-anchor',
        sourceId: 'runtime-overworld-anchors:town',
        description: undefined,
      },
    ]);
  });

  it('rejects empty map data source declarations', () => {
    expect(() => createMapDerivedDataSourceReferences([])).toThrow(
      'Map data sources must include at least one reference.'
    );
    expect(() =>
      createMapDerivedDataSourceReference({
        kind: ' ',
        sourceId: 'worldgen:terrain',
      })
    ).toThrow('Map data source kind must be a non-empty string.');
  });

  it('creates derived map feature generators that declare authoritative data sources', () => {
    const plugin = createDerivedMapFeatureGeneratorPlugin({
      id: 'terrain-view',
      label: 'Terrain View',
      layerId: 'terrain-surface',
      dataSources: [
        {
          kind: 'terrain-sampler',
          sourceId: 'worldgen:terrain',
          description: 'shared terrain sampler',
        },
        {
          kind: 'terrain-sampler',
          sourceId: 'worldgen:terrain',
        },
      ],
      getFeatures(request) {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: `terrain:${request.tile.x}:${request.tile.y}`,
            layerId: 'terrain-surface',
            coordinate: {
              worldX: request.tile.x,
              worldY: request.tile.y,
            },
          }),
        ];
      },
    });

    expect(plugin.id).toBe('terrain-view');
    expect(plugin.layerId).toBe('terrain-surface');
    expect(plugin.dataSources).toEqual([
      {
        kind: 'terrain-sampler',
        sourceId: 'worldgen:terrain',
        description: 'shared terrain sampler',
      },
    ]);
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-map-source-1',
        tile: {
          zoom: 3,
          x: 4,
          y: 5,
        },
      })
    ).toMatchObject([
      {
        kind: 'point',
        layerId: 'terrain-surface',
      },
    ]);
  });
});
