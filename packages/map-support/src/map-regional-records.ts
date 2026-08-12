import type { OverworldAnchorLike, PoiAnchorLike } from '@bworlds/plugin-api';
import {
  createMapFeatureLineRecord,
  createMapFeaturePointRecord,
  type MapFeatureLineRecord,
  type MapFeaturePointRecord,
  type MapFeatureProperties,
  type MapFeatureWorldCoordinate,
  type MapFeatureZoomRange,
} from './map-features.ts';
import {
  createMapFeatureGeneratorPlugin,
  type MapFeatureGeneratorPlugin,
  type PmtilesExportRequest,
} from './map-pmtiles.ts';

export const DEFAULT_MAP_SETTLEMENT_LAYER_ID = 'settlement-record';
export const DEFAULT_MAP_BORDER_LAYER_ID = 'border-record';

export type MapSettlementRecordSample = {
  id?: string;
  sourceWorldObjectId: string;
  layerId?: string;
  zoomRange?: MapFeatureZoomRange;
  x: number;
  y: number;
  name?: string;
  settlementType?: string;
  properties?: MapFeatureProperties;
};

export type MapBorderRecordSample = {
  id?: string;
  sourceWorldObjectId: string;
  layerId?: string;
  zoomRange?: MapFeatureZoomRange;
  points: readonly MapFeatureWorldCoordinate[];
  borderType?: string;
  parentRegionId?: string;
  properties?: MapFeatureProperties;
};

export function createSettlementMapFeatureRecord(
  sample: MapSettlementRecordSample
): MapFeaturePointRecord {
  return createMapFeaturePointRecord({
    id: sample.id,
    sourceWorldObjectId: sample.sourceWorldObjectId,
    layerId: sample.layerId ?? DEFAULT_MAP_SETTLEMENT_LAYER_ID,
    zoomRange: sample.zoomRange,
    coordinate: {
      worldX: sample.x,
      worldY: sample.y,
    },
    properties: {
      ...(typeof sample.name === 'string' && sample.name.trim().length > 0
        ? { name: sample.name.trim() }
        : {}),
      ...(typeof sample.settlementType === 'string' &&
      sample.settlementType.trim().length > 0
        ? { settlementType: sample.settlementType.trim() }
        : {}),
      ...(sample.properties ?? {}),
    },
  });
}

export function createBorderMapFeatureRecord(
  sample: MapBorderRecordSample
): MapFeatureLineRecord {
  return createMapFeatureLineRecord({
    id: sample.id,
    sourceWorldObjectId: sample.sourceWorldObjectId,
    layerId: sample.layerId ?? DEFAULT_MAP_BORDER_LAYER_ID,
    zoomRange: sample.zoomRange,
    coordinates: sample.points,
    properties: {
      ...(typeof sample.borderType === 'string' && sample.borderType.trim().length > 0
        ? { borderType: sample.borderType.trim() }
        : {}),
      ...(typeof sample.parentRegionId === 'string' &&
      sample.parentRegionId.trim().length > 0
        ? { parentRegionId: sample.parentRegionId.trim() }
        : {}),
      ...(sample.properties ?? {}),
    },
  });
}

export function createSettlementAnchorMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getSettlementRecords(
    request: PmtilesExportRequest
  ): readonly MapSettlementRecordSample[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'settlement-record-map-layer',
    label: options.label ?? 'Settlement Record Layer',
    layerId: DEFAULT_MAP_SETTLEMENT_LAYER_ID,
    getFeatures(request) {
      return options
        .getSettlementRecords(request)
        .map((sample) =>
          createSettlementMapFeatureRecord({
            ...sample,
            layerId: DEFAULT_MAP_SETTLEMENT_LAYER_ID,
          })
        );
    },
  });
}

export function createBorderRecordMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getBorderRecords(
    request: PmtilesExportRequest
  ): readonly MapBorderRecordSample[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'border-record-map-layer',
    label: options.label ?? 'Border Record Layer',
    layerId: DEFAULT_MAP_BORDER_LAYER_ID,
    getFeatures(request) {
      return options
        .getBorderRecords(request)
        .map((sample) =>
          createBorderMapFeatureRecord({
            ...sample,
            layerId: DEFAULT_MAP_BORDER_LAYER_ID,
          })
        );
    },
  });
}

export function createSettlementRecordSampleFromAnchor(
  anchor: OverworldAnchorLike | PoiAnchorLike,
  options: {
    sourceWorldObjectId?: string;
    settlementType?: string;
    properties?: MapFeatureProperties;
    zoomRange?: MapFeatureZoomRange;
  } = {}
): MapSettlementRecordSample {
  return {
    sourceWorldObjectId:
      options.sourceWorldObjectId ??
      (typeof anchor.name === 'string' && anchor.name.trim().length > 0
        ? `anchor:${anchor.name.trim()}`
        : `anchor:${anchor.x}:${anchor.y}`),
    x: anchor.x,
    y: anchor.y,
    name: anchor.name,
    settlementType:
      options.settlementType ??
      ('type' in anchor && typeof anchor.type === 'string' ? anchor.type : 'settlement'),
    properties: options.properties,
    zoomRange: options.zoomRange,
  };
}
