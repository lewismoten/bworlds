import { describe, expect, it } from 'vitest';
import { createMapFeaturePointRecord } from './map-features.ts';
import {
  createPmtilesExportPlugin,
  createPmtilesExportRequest,
  createPmtilesTileCoordinate,
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
  });
});
