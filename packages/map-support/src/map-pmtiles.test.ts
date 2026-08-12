import { describe, expect, it } from 'vitest';
import { createMapFeaturePointRecord } from './map-features.ts';
import {
  createMapFeatureGeneratorPlugin,
  createPmtilesExportPlugin,
  createPmtilesExportRequest,
  createPmtilesTileCoordinate,
  generatePmtilesTileFeatures,
} from './map-pmtiles.ts';

describe('map pmtiles', () => {
  it('creates normalized PMTiles export plugins that generate tile features on demand', () => {
    const plugin = createPmtilesExportPlugin({
      id: ' world-export ',
      label: ' World Export ',
      getTileFeatures(request) {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: `tile:${request.tile.zoom}/${request.tile.x}/${request.tile.y}`,
            layerId: request.layerIds?.[0] ?? 'default',
            coordinate: {
              worldX: request.tile.x,
              worldY: request.tile.y,
            },
          }),
        ];
      },
    });

    expect(plugin.id).toBe('world-export');
    expect(plugin.label).toBe('World Export');
    expect(
      plugin.getTileFeatures({
        worldRevision: 'rev-42',
        tile: {
          zoom: 3,
          x: 5,
          y: 2,
        },
        layerIds: [' transport '],
      })
    ).toEqual([
      {
        id: 'transport:tile:3/5/2',
        kind: 'point',
        sourceWorldObjectId: 'tile:3/5/2',
        layerId: 'transport',
        zoomRange: {
          minZoom: 0,
        },
        coordinate: {
          worldX: 5,
          worldY: 2,
        },
        properties: {},
      },
    ]);
  });

  it('normalizes PMTiles tile coordinates and export requests', () => {
    expect(
      createPmtilesTileCoordinate({
        zoom: 4,
        x: 10,
        y: 6,
      })
    ).toEqual({
      zoom: 4,
      x: 10,
      y: 6,
    });

    expect(
      createPmtilesExportRequest({
        worldRevision: ' revision-7 ',
        tile: {
          zoom: 2,
          x: 1,
          y: 3,
        },
        layerIds: [' physical ', ' transport '],
      })
    ).toEqual({
      worldRevision: 'revision-7',
      tile: {
        zoom: 2,
        x: 1,
        y: 3,
      },
      layerIds: ['physical', 'transport'],
    });
  });

  it('generates vector features from world data on demand through layer-scoped generators', () => {
    const hydrology = createMapFeatureGeneratorPlugin({
      id: 'hydrology-generator',
      layerId: 'hydrology',
      getFeatures(request) {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: `river-node:${request.tile.zoom}/${request.tile.x}/${request.tile.y}`,
            layerId: 'hydrology',
            coordinate: {
              worldX: request.tile.x * 10,
              worldY: request.tile.y * 10,
            },
          }),
        ];
      },
    });
    const transport = createMapFeatureGeneratorPlugin({
      id: 'transport-generator',
      layerId: 'transport',
      getFeatures(request) {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: `road-node:${request.worldRevision}`,
            layerId: 'transport',
            coordinate: {
              worldX: request.tile.zoom,
              worldY: request.tile.x + request.tile.y,
            },
          }),
        ];
      },
    });

    expect(
      generatePmtilesTileFeatures({
        request: {
          worldRevision: 'rev-9',
          tile: {
            zoom: 2,
            x: 1,
            y: 3,
          },
          layerIds: ['hydrology'],
        },
        generators: [hydrology, transport],
      })
    ).toEqual([
      {
        id: 'hydrology:river-node:2/1/3',
        kind: 'point',
        sourceWorldObjectId: 'river-node:2/1/3',
        layerId: 'hydrology',
        zoomRange: {
          minZoom: 0,
        },
        coordinate: {
          worldX: 10,
          worldY: 30,
        },
        properties: {},
      },
    ]);
  });

  it('rejects invalid PMTiles export declarations and tile requests', () => {
    expect(() =>
      createPmtilesExportPlugin({
        id: ' ',
        getTileFeatures() {
          return [];
        },
      })
    ).toThrow('PMTiles export plugin id must be a non-empty string.');

    const plugin = createPmtilesExportPlugin({
      id: 'broken-features',
      getTileFeatures() {
        return [{ id: ' ', kind: 'point' }] as never;
      },
    });

    expect(() =>
      plugin.getTileFeatures({
        worldRevision: 'rev',
        tile: {
          zoom: 1,
          x: 2,
          y: 0,
        },
      })
    ).toThrow('PMTiles export x must be less than 2^zoom.');

    expect(() =>
      createPmtilesExportRequest({
        worldRevision: 'rev',
        tile: {
          zoom: 1,
          x: 1,
          y: 0,
        },
        layerIds: [' '],
      })
    ).toThrow('PMTiles export layerId must be a non-empty string.');

    const generator = createMapFeatureGeneratorPlugin({
      id: 'broken-layer',
      layerId: 'transport',
      getFeatures() {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: 'road:1',
            layerId: 'hydrology',
            coordinate: {
              worldX: 0,
              worldY: 0,
            },
          }),
        ];
      },
    });

    expect(() =>
      generator.getFeatures({
        worldRevision: 'rev',
        tile: {
          zoom: 1,
          x: 1,
          y: 0,
        },
      })
    ).toThrow(
      'Map feature generator layerId "transport" must match returned feature layerId "hydrology".'
    );
  });
});
