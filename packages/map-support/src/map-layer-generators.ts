import type {
  MapFeatureLineRecord,
  MapFeaturePolygonRecord,
  MapFeatureRecord,
} from './map-features.ts';
import {
  createMapFeatureGeneratorPlugin,
  type MapFeatureGeneratorPlugin,
  type PmtilesExportRequest,
} from './map-pmtiles.ts';

export function createTopographicMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getContours(request: PmtilesExportRequest): readonly MapFeatureLineRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'topographic-map-layer',
    label: options.label ?? 'Topographic Layer',
    layerId: 'topographic',
    getFeatures(request) {
      return options.getContours(request);
    },
  });
}

export function createReliefMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getReliefFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeaturePolygonRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'relief-map-layer',
    label: options.label ?? 'Relief Layer',
    layerId: 'relief',
    getFeatures(request) {
      return options.getReliefFeatures(request);
    },
  });
}

export function createPhysicalMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getPhysicalFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'physical-map-layer',
    label: options.label ?? 'Physical Layer',
    layerId: 'physical',
    getFeatures(request) {
      return options.getPhysicalFeatures(request);
    },
  });
}

export function createElevationMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getElevationFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'elevation-map-layer',
    label: options.label ?? 'Elevation Layer',
    layerId: 'elevation',
    getFeatures(request) {
      return options.getElevationFeatures(request);
    },
  });
}

export function createSlopeMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getSlopeFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'slope-map-layer',
    label: options.label ?? 'Slope Layer',
    layerId: 'slope',
    getFeatures(request) {
      return options.getSlopeFeatures(request);
    },
  });
}

export function createGeologyMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getGeologyFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'geology-map-layer',
    label: options.label ?? 'Geology Layer',
    layerId: 'geology',
    getFeatures(request) {
      return options.getGeologyFeatures(request);
    },
  });
}

export function createClimateMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getClimateFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'climate-map-layer',
    label: options.label ?? 'Climate Layer',
    layerId: 'climate',
    getFeatures(request) {
      return options.getClimateFeatures(request);
    },
  });
}

export function createTemperatureZoneMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getTemperatureZoneFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'temperature-zone-map-layer',
    label: options.label ?? 'Temperature Zone Layer',
    layerId: 'temperature-zone',
    getFeatures(request) {
      return options.getTemperatureZoneFeatures(request);
    },
  });
}

export function createHumidityMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getHumidityFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'humidity-map-layer',
    label: options.label ?? 'Humidity Layer',
    layerId: 'humidity',
    getFeatures(request) {
      return options.getHumidityFeatures(request);
    },
  });
}

export function createPressureMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getPressureFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'pressure-map-layer',
    label: options.label ?? 'Pressure Layer',
    layerId: 'pressure',
    getFeatures(request) {
      return options.getPressureFeatures(request);
    },
  });
}

export function createWeatherMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getWeatherFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'weather-map-layer',
    label: options.label ?? 'Weather Layer',
    layerId: 'weather',
    getFeatures(request) {
      return options.getWeatherFeatures(request);
    },
  });
}

export function createWindMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getWindFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'wind-map-layer',
    label: options.label ?? 'Wind Layer',
    layerId: 'wind',
    getFeatures(request) {
      return options.getWindFeatures(request);
    },
  });
}

export function createOceanCurrentMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getOceanCurrentFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'ocean-current-map-layer',
    label: options.label ?? 'Ocean Current Layer',
    layerId: 'ocean-current',
    getFeatures(request) {
      return options.getOceanCurrentFeatures(request);
    },
  });
}

export function createRiverFlowMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getRiverFlowFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'river-flow-map-layer',
    label: options.label ?? 'River Flow Layer',
    layerId: 'river-flow',
    getFeatures(request) {
      return options.getRiverFlowFeatures(request);
    },
  });
}

export function createPoliticalMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getPoliticalFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'political-map-layer',
    label: options.label ?? 'Political Layer',
    layerId: 'political',
    getFeatures(request) {
      return options.getPoliticalFeatures(request);
    },
  });
}

export function createRoadMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getRoadFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'road-map-layer',
    label: options.label ?? 'Road Layer',
    layerId: 'road',
    getFeatures(request) {
      return options.getRoadFeatures(request);
    },
  });
}

export function createRailMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getRailFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'rail-map-layer',
    label: options.label ?? 'Rail Layer',
    layerId: 'rail',
    getFeatures(request) {
      return options.getRailFeatures(request);
    },
  });
}

export function createPopulationHeatMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getPopulationHeatMapFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'population-heat-map-layer',
    label: options.label ?? 'Population Heat Map Layer',
    layerId: 'population-heat-map',
    getFeatures(request) {
      return options.getPopulationHeatMapFeatures(request);
    },
  });
}

export function createChoroplethMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getChoroplethFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'choropleth-map-layer',
    label: options.label ?? 'Choropleth Layer',
    layerId: 'choropleth',
    getFeatures(request) {
      return options.getChoroplethFeatures(request);
    },
  });
}
