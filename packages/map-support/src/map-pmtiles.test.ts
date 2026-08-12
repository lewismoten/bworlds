import { describe, expect, it } from 'vitest';
import { createMapFeaturePointRecord } from './map-features.ts';
import {
  createMapFeatureGeneratorPlugin,
  createPmtilesExportPlugin,
  createPmtilesExportRequest,
  createPmtilesTileCoordinate,
  DEFAULT_PMTILES_FULL_DETAIL_ZOOM,
  DEFAULT_PMTILES_MAX_GEOMETRY_STRIDE,
  generatePmtilesTileFeatures,
  generatePmtilesTileFeaturesAtZoomDetail,
  selectPmtilesTileFeaturesForZoom,
  simplifyPmtilesFeatureGeometry,
} from './map-pmtiles.ts';
import {
  createMapFeatureLineRecord,
  createMapFeaturePolygonRecord,
} from './map-features.ts';

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

  it('uses coarse geometry at low zoom and reveals finer geometry as zoom increases', () => {
    const detailedLine = createMapFeatureLineRecord({
      sourceWorldObjectId: 'river:main',
      layerId: 'hydrology',
      coordinates: [
        { worldX: 0, worldY: 0 },
        { worldX: 1, worldY: 1 },
        { worldX: 2, worldY: 0 },
        { worldX: 3, worldY: 1 },
        { worldX: 4, worldY: 0 },
      ],
    });

    const lowZoom = simplifyPmtilesFeatureGeometry(detailedLine, {
      zoom: 2,
      fullDetailZoom: 4,
      maximumGeometryStride: 4,
    });
    const highZoom = simplifyPmtilesFeatureGeometry(detailedLine, {
      zoom: 4,
      fullDetailZoom: 4,
      maximumGeometryStride: 4,
    });

    expect(lowZoom.kind).toBe('line');
    expect(lowZoom.kind === 'line' ? lowZoom.coordinates : []).toEqual([
      { worldX: 0, worldY: 0 },
      { worldX: 4, worldY: 0 },
    ]);
    expect(highZoom.kind === 'line' ? highZoom.coordinates : []).toEqual(
      detailedLine.coordinates
    );
    expect(DEFAULT_PMTILES_FULL_DETAIL_ZOOM).toBe(12);
    expect(DEFAULT_PMTILES_MAX_GEOMETRY_STRIDE).toBe(16);
  });

  it('simplifies polygon rings by zoom while keeping them closed', () => {
    const polygon = createMapFeaturePolygonRecord({
      sourceWorldObjectId: 'region:delta',
      layerId: 'political',
      rings: [
        [
          { worldX: 0, worldY: 0 },
          { worldX: 1, worldY: 0 },
          { worldX: 2, worldY: 0 },
          { worldX: 2, worldY: 2 },
          { worldX: 1, worldY: 2 },
          { worldX: 0, worldY: 2 },
          { worldX: 0, worldY: 0 },
        ],
      ],
    });

    const simplified = simplifyPmtilesFeatureGeometry(polygon, {
      zoom: 1,
      fullDetailZoom: 3,
      maximumGeometryStride: 4,
    });

    expect(simplified.kind).toBe('polygon');
    expect(simplified.kind === 'polygon' ? simplified.rings[0] : []).toEqual([
      { worldX: 0, worldY: 0 },
      { worldX: 1, worldY: 2 },
      { worldX: 0, worldY: 0 },
    ]);
  });

  it('filters PMTiles features by zoom visibility before simplifying geometry', () => {
    const visible = createMapFeaturePointRecord({
      sourceWorldObjectId: 'settlement:capital',
      layerId: 'human',
      zoomRange: {
        minZoom: 0,
        maxZoom: 4,
      },
      coordinate: {
        worldX: 3,
        worldY: 4,
      },
    });
    const hidden = createMapFeaturePointRecord({
      sourceWorldObjectId: 'road:lane',
      layerId: 'transport',
      zoomRange: {
        minZoom: 5,
      },
      coordinate: {
        worldX: 8,
        worldY: 9,
      },
    });

    expect(
      selectPmtilesTileFeaturesForZoom([visible, hidden], {
        zoom: 4,
      })
    ).toEqual([visible]);
  });

  it('applies on-demand zoom detail selection after generator fan-out', () => {
    const generator = createMapFeatureGeneratorPlugin({
      id: 'roads',
      layerId: 'transport',
      getFeatures() {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: 'road:spine',
            layerId: 'transport',
            zoomRange: {
              minZoom: 0,
            },
            coordinates: [
              { worldX: 0, worldY: 0 },
              { worldX: 1, worldY: 1 },
              { worldX: 2, worldY: 0 },
              { worldX: 3, worldY: 1 },
              { worldX: 4, worldY: 0 },
            ],
          }),
        ];
      },
    });

    const features = generatePmtilesTileFeaturesAtZoomDetail({
      request: {
        worldRevision: 'rev-2',
        tile: {
          zoom: 2,
          x: 0,
          y: 0,
        },
      },
      generators: [generator],
      fullDetailZoom: 4,
      maximumGeometryStride: 4,
    });

    expect(features[0]).toMatchObject({
      kind: 'line',
      layerId: 'transport',
    });
    expect(features[0]?.kind === 'line' ? features[0].coordinates : []).toEqual([
      { worldX: 0, worldY: 0 },
      { worldX: 4, worldY: 0 },
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
