import { describe, expect, it } from 'vitest';
import {
  createBorderMapFeatureRecord,
  createBorderRecordMapFeatureGeneratorPlugin,
  createSettlementAnchorMapFeatureGeneratorPlugin,
  createSettlementMapFeatureRecord,
  createSettlementRecordSampleFromAnchor,
  DEFAULT_MAP_BORDER_LAYER_ID,
  DEFAULT_MAP_SETTLEMENT_LAYER_ID,
} from './map-regional-records.ts';

describe('map regional records', () => {
  it('creates settlement map features from shared settlement-like records', () => {
    expect(
      createSettlementMapFeatureRecord({
        sourceWorldObjectId: 'town:harbor-view',
        x: 12,
        y: 9,
        name: 'Harbor View',
        settlementType: 'town',
        properties: {
          populationClass: 'market',
        },
      })
    ).toEqual({
      id: `${DEFAULT_MAP_SETTLEMENT_LAYER_ID}:town:harbor-view`,
      kind: 'point',
      sourceWorldObjectId: 'town:harbor-view',
      layerId: DEFAULT_MAP_SETTLEMENT_LAYER_ID,
      zoomRange: {
        minZoom: 0,
      },
      coordinate: {
        worldX: 12,
        worldY: 9,
      },
      properties: {
        name: 'Harbor View',
        settlementType: 'town',
        populationClass: 'market',
      },
    });
  });

  it('creates settlement samples from shared anchors', () => {
    expect(
      createSettlementRecordSampleFromAnchor({
        x: 4,
        y: 7,
        name: 'Stoneford',
        type: 'town',
      })
    ).toEqual({
      sourceWorldObjectId: 'anchor:Stoneford',
      x: 4,
      y: 7,
      name: 'Stoneford',
      settlementType: 'town',
      properties: undefined,
      zoomRange: undefined,
    });
  });

  it('creates border map features from shared border records', () => {
    expect(
      createBorderMapFeatureRecord({
        sourceWorldObjectId: 'region:border:1',
        points: [
          { worldX: 0, worldY: 0 },
          { worldX: 2, worldY: 1 },
          { worldX: 4, worldY: 1 },
        ],
        borderType: 'region',
        parentRegionId: 'region:1',
      })
    ).toEqual({
      id: `${DEFAULT_MAP_BORDER_LAYER_ID}:region:border:1`,
      kind: 'line',
      sourceWorldObjectId: 'region:border:1',
      layerId: DEFAULT_MAP_BORDER_LAYER_ID,
      zoomRange: {
        minZoom: 0,
      },
      coordinates: [
        { worldX: 0, worldY: 0 },
        { worldX: 2, worldY: 1 },
        { worldX: 4, worldY: 1 },
      ],
      properties: {
        borderType: 'region',
        parentRegionId: 'region:1',
      },
    });
  });

  it('creates settlement generator plugins with conventional settlement layer ids', () => {
    const plugin = createSettlementAnchorMapFeatureGeneratorPlugin({
      getSettlementRecords(request) {
        return [
          {
            sourceWorldObjectId: `town:${request.tile.x}:${request.tile.y}`,
            x: request.tile.x,
            y: request.tile.y,
            name: 'Waypoint',
            settlementType: 'town',
          },
        ];
      },
    });

    expect(plugin.id).toBe('settlement-record-map-layer');
    expect(plugin.layerId).toBe(DEFAULT_MAP_SETTLEMENT_LAYER_ID);
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-settlement-1',
        tile: {
          zoom: 4,
          x: 8,
          y: 6,
        },
      })
    ).toMatchObject([
      {
        kind: 'point',
        layerId: DEFAULT_MAP_SETTLEMENT_LAYER_ID,
        properties: {
          name: 'Waypoint',
          settlementType: 'town',
        },
      },
    ]);
  });

  it('creates border generator plugins with conventional border layer ids', () => {
    const plugin = createBorderRecordMapFeatureGeneratorPlugin({
      id: 'county-borders',
      label: 'County Borders',
      getBorderRecords(request) {
        return [
          {
            sourceWorldObjectId: `border:${request.tile.zoom}`,
            points: [
              { worldX: 0, worldY: request.tile.zoom },
              { worldX: 3, worldY: request.tile.zoom + 1 },
            ],
            borderType: 'county',
          },
        ];
      },
    });

    expect(plugin.id).toBe('county-borders');
    expect(plugin.label).toBe('County Borders');
    expect(plugin.layerId).toBe(DEFAULT_MAP_BORDER_LAYER_ID);
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-border-1',
        tile: {
          zoom: 5,
          x: 3,
          y: 9,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: DEFAULT_MAP_BORDER_LAYER_ID,
        properties: {
          borderType: 'county',
        },
      },
    ]);
  });
});
