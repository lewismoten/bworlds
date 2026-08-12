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
