import { describe, expect, it } from 'vitest';
import {
  createMapFeatureLineRecord,
  createMapFeaturePointRecord,
  createMapFeaturePolygonRecord,
} from './map-features.ts';
import {
  createClimateMapFeatureGeneratorPlugin,
  createElevationMapFeatureGeneratorPlugin,
  createGeologyMapFeatureGeneratorPlugin,
  createHumidityMapFeatureGeneratorPlugin,
  createOceanCurrentMapFeatureGeneratorPlugin,
  createPhysicalMapFeatureGeneratorPlugin,
  createPoliticalMapFeatureGeneratorPlugin,
  createPressureMapFeatureGeneratorPlugin,
  createReliefMapFeatureGeneratorPlugin,
  createRailMapFeatureGeneratorPlugin,
  createRiverFlowMapFeatureGeneratorPlugin,
  createRoadMapFeatureGeneratorPlugin,
  createSlopeMapFeatureGeneratorPlugin,
  createTemperatureZoneMapFeatureGeneratorPlugin,
  createTopographicMapFeatureGeneratorPlugin,
  createWeatherMapFeatureGeneratorPlugin,
  createWindMapFeatureGeneratorPlugin,
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

  it('creates elevation layer generators with conventional elevation layer ids', () => {
    const plugin = createElevationMapFeatureGeneratorPlugin({
      getElevationFeatures(request) {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: `peak:${request.tile.zoom}`,
            layerId: 'elevation',
            coordinate: {
              worldX: request.tile.zoom,
              worldY: request.tile.zoom + 1,
            },
          }),
        ];
      },
    });

    expect(plugin.id).toBe('elevation-map-layer');
    expect(plugin.layerId).toBe('elevation');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-4',
        tile: {
          zoom: 5,
          x: 2,
          y: 3,
        },
      })
    ).toMatchObject([
      {
        kind: 'point',
        layerId: 'elevation',
      },
    ]);
  });

  it('creates slope layer generators with conventional slope layer ids', () => {
    const plugin = createSlopeMapFeatureGeneratorPlugin({
      getSlopeFeatures(request) {
        return [
          createMapFeaturePolygonRecord({
            sourceWorldObjectId: `slope:${request.tile.x}:${request.tile.y}`,
            layerId: 'slope',
            rings: [
              [
                { worldX: 0, worldY: 0 },
                { worldX: 2, worldY: 0 },
                { worldX: 2, worldY: 2 },
                { worldX: 0, worldY: 0 },
              ],
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('slope-map-layer');
    expect(plugin.layerId).toBe('slope');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-5',
        tile: {
          zoom: 6,
          x: 4,
          y: 1,
        },
      })
    ).toMatchObject([
      {
        kind: 'polygon',
        layerId: 'slope',
      },
    ]);
  });

  it('creates geology layer generators with conventional geology layer ids', () => {
    const plugin = createGeologyMapFeatureGeneratorPlugin({
      id: 'world-geology',
      label: 'World Geology',
      getGeologyFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `fault:${request.tile.x}`,
            layerId: 'geology',
            coordinates: [
              { worldX: request.tile.x, worldY: 0 },
              { worldX: request.tile.x + 1, worldY: 3 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('world-geology');
    expect(plugin.label).toBe('World Geology');
    expect(plugin.layerId).toBe('geology');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-6',
        tile: {
          zoom: 3,
          x: 7,
          y: 2,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'geology',
      },
    ]);
  });

  it('creates climate layer generators with conventional climate layer ids', () => {
    const plugin = createClimateMapFeatureGeneratorPlugin({
      getClimateFeatures(request) {
        return [
          createMapFeaturePolygonRecord({
            sourceWorldObjectId: `climate:${request.tile.zoom}`,
            layerId: 'climate',
            rings: [
              [
                { worldX: 0, worldY: 0 },
                { worldX: 3, worldY: 0 },
                { worldX: 3, worldY: 2 },
                { worldX: 0, worldY: 0 },
              ],
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('climate-map-layer');
    expect(plugin.layerId).toBe('climate');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-7',
        tile: {
          zoom: 4,
          x: 5,
          y: 6,
        },
      })
    ).toMatchObject([
      {
        kind: 'polygon',
        layerId: 'climate',
      },
    ]);
  });

  it('creates temperature zone layer generators with conventional temperature zone layer ids', () => {
    const plugin = createTemperatureZoneMapFeatureGeneratorPlugin({
      id: 'temperature-bands',
      label: 'Temperature Bands',
      getTemperatureZoneFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `temperature-band:${request.tile.y}`,
            layerId: 'temperature-zone',
            coordinates: [
              { worldX: 0, worldY: request.tile.y },
              { worldX: 5, worldY: request.tile.y + 1 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('temperature-bands');
    expect(plugin.label).toBe('Temperature Bands');
    expect(plugin.layerId).toBe('temperature-zone');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-8',
        tile: {
          zoom: 4,
          x: 1,
          y: 8,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'temperature-zone',
      },
    ]);
  });

  it('creates humidity layer generators with conventional humidity layer ids', () => {
    const plugin = createHumidityMapFeatureGeneratorPlugin({
      getHumidityFeatures(request) {
        return [
          createMapFeaturePolygonRecord({
            sourceWorldObjectId: `humidity:${request.tile.x}:${request.tile.y}`,
            layerId: 'humidity',
            rings: [
              [
                { worldX: 0, worldY: 0 },
                { worldX: 2, worldY: 0 },
                { worldX: 2, worldY: 2 },
                { worldX: 0, worldY: 0 },
              ],
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('humidity-map-layer');
    expect(plugin.layerId).toBe('humidity');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-9',
        tile: {
          zoom: 4,
          x: 9,
          y: 2,
        },
      })
    ).toMatchObject([
      {
        kind: 'polygon',
        layerId: 'humidity',
      },
    ]);
  });

  it('creates pressure layer generators with conventional pressure layer ids', () => {
    const plugin = createPressureMapFeatureGeneratorPlugin({
      id: 'barometric-pressure',
      label: 'Barometric Pressure',
      getPressureFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `isobar:${request.tile.zoom}`,
            layerId: 'pressure',
            coordinates: [
              { worldX: 0, worldY: request.tile.zoom },
              { worldX: 4, worldY: request.tile.zoom + 1 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('barometric-pressure');
    expect(plugin.label).toBe('Barometric Pressure');
    expect(plugin.layerId).toBe('pressure');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-10',
        tile: {
          zoom: 3,
          x: 2,
          y: 1,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'pressure',
      },
    ]);
  });

  it('creates weather layer generators with conventional weather layer ids', () => {
    const plugin = createWeatherMapFeatureGeneratorPlugin({
      getWeatherFeatures(request) {
        return [
          createMapFeaturePointRecord({
            sourceWorldObjectId: `weather:${request.tile.x}/${request.tile.y}`,
            layerId: 'weather',
            coordinate: {
              worldX: request.tile.x,
              worldY: request.tile.y,
            },
          }),
        ];
      },
    });

    expect(plugin.id).toBe('weather-map-layer');
    expect(plugin.layerId).toBe('weather');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-11',
        tile: {
          zoom: 5,
          x: 10,
          y: 11,
        },
      })
    ).toMatchObject([
      {
        kind: 'point',
        layerId: 'weather',
      },
    ]);
  });

  it('creates wind layer generators with conventional wind layer ids', () => {
    const plugin = createWindMapFeatureGeneratorPlugin({
      getWindFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `wind:${request.tile.x}:${request.tile.y}`,
            layerId: 'wind',
            coordinates: [
              { worldX: request.tile.x, worldY: request.tile.y },
              { worldX: request.tile.x + 3, worldY: request.tile.y + 1 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('wind-map-layer');
    expect(plugin.layerId).toBe('wind');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-12',
        tile: {
          zoom: 4,
          x: 12,
          y: 7,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'wind',
      },
    ]);
  });

  it('creates ocean current layer generators with conventional ocean current layer ids', () => {
    const plugin = createOceanCurrentMapFeatureGeneratorPlugin({
      getOceanCurrentFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `current:${request.tile.x}:${request.tile.y}`,
            layerId: 'ocean-current',
            coordinates: [
              { worldX: request.tile.x, worldY: request.tile.y },
              { worldX: request.tile.x + 4, worldY: request.tile.y + 2 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('ocean-current-map-layer');
    expect(plugin.layerId).toBe('ocean-current');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-13',
        tile: {
          zoom: 4,
          x: 6,
          y: 8,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'ocean-current',
      },
    ]);
  });

  it('creates river flow layer generators with conventional river flow layer ids', () => {
    const plugin = createRiverFlowMapFeatureGeneratorPlugin({
      id: 'watershed-flow',
      label: 'Watershed Flow',
      getRiverFlowFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `river-flow:${request.tile.zoom}`,
            layerId: 'river-flow',
            coordinates: [
              { worldX: 0, worldY: request.tile.zoom },
              { worldX: 3, worldY: request.tile.zoom + 2 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('watershed-flow');
    expect(plugin.label).toBe('Watershed Flow');
    expect(plugin.layerId).toBe('river-flow');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-14',
        tile: {
          zoom: 5,
          x: 7,
          y: 4,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'river-flow',
      },
    ]);
  });

  it('creates political layer generators with conventional political layer ids', () => {
    const plugin = createPoliticalMapFeatureGeneratorPlugin({
      getPoliticalFeatures(request) {
        return [
          createMapFeaturePolygonRecord({
            sourceWorldObjectId: `region:${request.tile.zoom}`,
            layerId: 'political',
            rings: [
              [
                { worldX: 0, worldY: 0 },
                { worldX: 4, worldY: 0 },
                { worldX: 4, worldY: 3 },
                { worldX: 0, worldY: 0 },
              ],
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('political-map-layer');
    expect(plugin.layerId).toBe('political');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-15',
        tile: {
          zoom: 4,
          x: 9,
          y: 6,
        },
      })
    ).toMatchObject([
      {
        kind: 'polygon',
        layerId: 'political',
      },
    ]);
  });

  it('creates road layer generators with conventional road layer ids', () => {
    const plugin = createRoadMapFeatureGeneratorPlugin({
      id: 'surface-roads',
      label: 'Surface Roads',
      getRoadFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `road:${request.tile.x}:${request.tile.y}`,
            layerId: 'road',
            coordinates: [
              { worldX: request.tile.x, worldY: request.tile.y },
              { worldX: request.tile.x + 2, worldY: request.tile.y + 1 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('surface-roads');
    expect(plugin.label).toBe('Surface Roads');
    expect(plugin.layerId).toBe('road');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-16',
        tile: {
          zoom: 5,
          x: 7,
          y: 10,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'road',
      },
    ]);
  });

  it('creates rail layer generators with conventional rail layer ids', () => {
    const plugin = createRailMapFeatureGeneratorPlugin({
      getRailFeatures(request) {
        return [
          createMapFeatureLineRecord({
            sourceWorldObjectId: `rail:${request.tile.zoom}`,
            layerId: 'rail',
            coordinates: [
              { worldX: 0, worldY: request.tile.zoom },
              { worldX: 3, worldY: request.tile.zoom + 1 },
            ],
          }),
        ];
      },
    });

    expect(plugin.id).toBe('rail-map-layer');
    expect(plugin.layerId).toBe('rail');
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-17',
        tile: {
          zoom: 4,
          x: 5,
          y: 11,
        },
      })
    ).toMatchObject([
      {
        kind: 'line',
        layerId: 'rail',
      },
    ]);
  });
});
