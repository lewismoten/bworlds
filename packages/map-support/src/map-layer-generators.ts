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
