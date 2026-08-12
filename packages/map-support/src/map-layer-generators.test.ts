import { describe, expect, it } from 'vitest';
import {
  createMapFeatureLineRecord,
  createMapFeaturePointRecord,
  createMapFeaturePolygonRecord,
} from './map-features.ts';
import {
  createPhysicalMapFeatureGeneratorPlugin,
  createReliefMapFeatureGeneratorPlugin,
  createTopographicMapFeatureGeneratorPlugin,
} from './map-layer-generators.ts';

describe('map layer generators', () => {
  it('creates topographic layer generators with conventional topographic layer ids', () => {
    const plugin = createTopographicMapFeatureGeneratorPlugin({
      getContours(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `contour:${request.tile.zoom}`,
            layerId: 'topographic',
            coordinates: [
              { worldX: 0, worldY: 0 },
              { worldX: 2, worldY: 1 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('topographic-map-layer');
    expect(plugin.layerId).toBe('topographic');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-1',
        tile: {
          zoom: 4,
          x: 3,
          y: 2,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'topographic',
      },
    ]);
  });

  it('creates relief layer generators with conventional relief layer ids', () => {
    const plugin = createReliefMapFeatureGeneratorPlugin({
      getReliefFeatures() {
        return [
          createMapFeaturePolygonRecord({
            sourceWorldObjectId: 'relief:cell:1',
            layerId: 'relief',
            rings: [
              [
                { worldX: 0, worldY: 0 },
                { worldX: 1, worldY: 0 },
                { worldX: 1, worldY: 1 },
                { worldX: 0, worldY: 1 },
              ],
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('relief-map-layer');
    expect(plugin.layerId).toBe('relief');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-2',
        tile: {
          zoom: 2,
          x: 1,
          y: 1,
        },
      })
    ).toMatchObject([
      {
        kind: 'polygon',
        layerId: 'relief',
      },
    ]);
  });

  it('creates physical layer generators with conventional physical layer ids', () => {
    const plugin = createPhysicalMapFeatureGeneratorPlugin({
      id: 'physical-world',
      label: 'Physical World',
      getPhysicalFeatures(request) {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: `landmark:${request.tile.x}/${request.tile.y}`,
            layerId: 'physical',
            coordinate: {
              worldX: request.tile.x,
              worldY: request.tile.y,
            },
          }),
        ];
      },
    });

    expect(plugin.id).toBe('physical-world');
    expect(plugin.label).toBe('Physical World');
    expect(plugin.layerId).toBe('physical');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-3',
        tile: {
          zoom: 1,
          x: 0,
          y: 1,
        },
      })
    ).toEqual([
      {
        id: 'physical:landmark:0/1',
        kind: 'point',
        sourceWorldObjectId: 'landmark:0/1',
        layerId: 'physical',
        zoomRange: {
          minZoom: 0,
        },
        coordinate: {
          worldX: 0,
          worldY: 1,
        },
        properties: {},
      },
    ]);
  });
});
