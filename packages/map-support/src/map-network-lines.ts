import {
  createMapFeatureLineRecord,
  type MapFeatureLineRecord,
  type MapFeatureProperties,
  type MapFeatureWorldCoordinate,
  type MapFeatureZoomRange,
} from './map-features.ts';
import {
  createMapFeatureGeneratorPlugin,
  type MapFeatureGeneratorPlugin,
  type PmtilesExportRequest,
} from './map-pmtiles.ts';

export const DEFAULT_MAP_ROAD_NETWORK_LAYER_ID = 'road-network';
export const DEFAULT_MAP_RIVER_NETWORK_LAYER_ID = 'river-network';

export type MapNetworkLineSample = {
  id?: string;
  sourceWorldObjectId: string;
  layerId: string;
  zoomRange?: MapFeatureZoomRange;
  points: readonly MapFeatureWorldCoordinate[];
  properties?: MapFeatureProperties;
};

export function createMapNetworkLineFeatureRecord(
  sample: MapNetworkLineSample
): MapFeatureLineRecord {
  return createMapFeatureLineRecord({
    id: sample.id,
    sourceWorldObjectId: sample.sourceWorldObjectId,
    layerId: sample.layerId,
    zoomRange: sample.zoomRange,
    coordinates: sample.points,
    properties: sample.properties,
  });
}

export function createRoadNetworkMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getRoadNetworkSamples(
    request: PmtilesExportRequest
  ): readonly Omit<MapNetworkLineSample, 'layerId'>[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'road-network-map-layer',
    label: options.label ?? 'Road Network Layer',
    layerId: DEFAULT_MAP_ROAD_NETWORK_LAYER_ID,
    getFeatures(request) {
      return options.getRoadNetworkSamples(request).map((sample) =>
        createMapNetworkLineFeatureRecord({
          ...sample,
          layerId: DEFAULT_MAP_ROAD_NETWORK_LAYER_ID,
        })
      );
    },
  });
}

export function createRiverNetworkMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getRiverNetworkSamples(
    request: PmtilesExportRequest
  ): readonly Omit<MapNetworkLineSample, 'layerId'>[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'river-network-map-layer',
    label: options.label ?? 'River Network Layer',
    layerId: DEFAULT_MAP_RIVER_NETWORK_LAYER_ID,
    getFeatures(request) {
      return options.getRiverNetworkSamples(request).map((sample) =>
        createMapNetworkLineFeatureRecord({
          ...sample,
          layerId: DEFAULT_MAP_RIVER_NETWORK_LAYER_ID,
        })
      );
    },
  });
}
