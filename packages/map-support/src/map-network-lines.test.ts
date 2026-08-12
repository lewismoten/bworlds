import { describe, expect, it } from 'vitest';
import {
  createMapNetworkLineFeatureRecord,
  createRiverNetworkMapFeatureGeneratorPlugin,
  createRoadNetworkMapFeatureGeneratorPlugin,
  DEFAULT_MAP_RIVER_NETWORK_LAYER_ID,
  DEFAULT_MAP_ROAD_NETWORK_LAYER_ID,
} from './map-network-lines.ts';

describe('map network lines', () => {
  it('creates canonical network line features from shared graph points', () => {
    expect(
      createMapNetworkLineFeatureRecord({
        sourceWorldObjectId: 'route:a-b',
        layerId: DEFAULT_MAP_ROAD_NETWORK_LAYER_ID,
        points: [
          { worldX: 1, worldY: 2 },
          { worldX: 3, worldY: 4 },
          { worldX: 6, worldY: 5 },
        ],
        properties: {
          routeKind: 'road',
          sharedGraph: true,
        },
      })
    ).toEqual({
      id: `${DEFAULT_MAP_ROAD_NETWORK_LAYER_ID}:route:a-b`,
      kind: 'line',
      sourceWorldObjectId: 'route:a-b',
      layerId: DEFAULT_MAP_ROAD_NETWORK_LAYER_ID,
      zoomRange: {
        minZoom: 0,
      },
      coordinates: [
        { worldX: 1, worldY: 2 },
        { worldX: 3, worldY: 4 },
        { worldX: 6, worldY: 5 },
      ],
      properties: {
        routeKind: 'road',
        sharedGraph: true,
      },
    });
  });

  it('creates road network generator plugins with conventional road network layer ids', () => {
    const plugin = createRoadNetworkMapFeatureGeneratorPlugin({
      getRoadNetworkSamples(request) {
        return [
          {
            sourceWorldObjectId: `road:${request.tile.x}:${request.tile.y}`,
            points: [
              { worldX: request.tile.x, worldY: request.tile.y },
              { worldX: request.tile.x + 2, worldY: request.tile.y + 1 },
            ],
            properties: {
              sourceGraph: 'shared-route-plan',
            },
          },
        ];
      },
    });

    expect(plugin.id).toBe('road-network-map-layer');
    expect(plugin.layerId).toBe(DEFAULT_MAP_ROAD_NETWORK_LAYER_ID);
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-road-network-1',
        tile: {
          zoom: 4,
          x: 7,
          y: 5,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: DEFAULT_MAP_ROAD_NETWORK_LAYER_ID,
        properties: {
          sourceGraph: 'shared-route-plan',
        },
      },
    ]);
  });

  it('creates river network generator plugins with conventional river network layer ids', () => {
    const plugin = createRiverNetworkMapFeatureGeneratorPlugin({
      id: 'river-curves',
      label: 'River Curves',
      getRiverNetworkSamples(request) {
        return [
          {
            sourceWorldObjectId: `river:${request.tile.zoom}`,
            points: [
              { worldX: 0, worldY: request.tile.zoom },
              { worldX: 2, worldY: request.tile.zoom + 1 },
              { worldX: 4, worldY: request.tile.zoom + 2 },
            ],
            properties: {
              sourceGraph: 'shared-river-control-path',
            },
          },
        ];
      },
    });

    expect(plugin.id).toBe('river-curves');
    expect(plugin.label).toBe('River Curves');
    expect(plugin.layerId).toBe(DEFAULT_MAP_RIVER_NETWORK_LAYER_ID);
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-river-network-1',
        tile: {
          zoom: 3,
          x: 1,
          y: 2,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: DEFAULT_MAP_RIVER_NETWORK_LAYER_ID,
        properties: {
          sourceGraph: 'shared-river-control-path',
        },
      },
    ]);
  });
});
