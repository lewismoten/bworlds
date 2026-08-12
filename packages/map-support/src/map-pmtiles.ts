import type { MapFeatureRecord } from './map-features.ts';

export type PmtilesTileCoordinate = {
  zoom: number;
  x: number;
  y: number;
};

export type PmtilesExportRequest = {
  worldRevision: string;
  tile: PmtilesTileCoordinate;
  layerIds?: readonly string[];
};

export interface PmtilesExportPlugin {
  id: string;
  label?: string;
  getTileFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}

export function createPmtilesExportPlugin(params: {
  id: string;
  label?: string;
  getTileFeatures(
    request: PmtilesExportRequest
  ): readonly MapFeatureRecord[];
}): PmtilesExportPlugin {
  return {
    id: normalizeNonEmptyString(params.id, 'PMTiles export plugin id'),
    label:
      typeof params.label === 'string' && params.label.trim().length > 0
        ? params.label.trim()
        : undefined,
    getTileFeatures(request) {
      const normalizedRequest = normalizePmtilesExportRequest(request);
      return params.getTileFeatures(normalizedRequest).map((feature) =>
        normalizeMapFeatureRecord(feature)
      );
    },
  };
}

export function createPmtilesTileCoordinate(
  coordinate: PmtilesTileCoordinate
): PmtilesTileCoordinate {
  return normalizePmtilesTileCoordinate(coordinate);
}

export function createPmtilesExportRequest(
  request: PmtilesExportRequest
): PmtilesExportRequest {
  return normalizePmtilesExportRequest(request);
}

function normalizePmtilesExportRequest(
  request: PmtilesExportRequest
): PmtilesExportRequest {
  return {
    worldRevision: normalizeNonEmptyString(
      request.worldRevision,
      'PMTiles export worldRevision'
    ),
    tile: normalizePmtilesTileCoordinate(request.tile),
    ...(request.layerIds == null
      ? {}
      : {
          layerIds: request.layerIds.map((layerId) =>
            normalizeNonEmptyString(layerId, 'PMTiles export layerId')
          ),
        }),
  };
}

function normalizePmtilesTileCoordinate(
  coordinate: PmtilesTileCoordinate
): PmtilesTileCoordinate {
  const zoom = normalizeNonNegativeInteger(
    coordinate.zoom,
    'PMTiles export zoom'
  );
  const maxIndex = 2 ** zoom;
  const x = normalizeNonNegativeInteger(coordinate.x, 'PMTiles export x');
  const y = normalizeNonNegativeInteger(coordinate.y, 'PMTiles export y');
  if (x >= maxIndex) {
    throw new Error('PMTiles export x must be less than 2^zoom.');
  }
  if (y >= maxIndex) {
    throw new Error('PMTiles export y must be less than 2^zoom.');
  }
  return {
    zoom,
    x,
    y,
  };
}

function normalizeMapFeatureRecord(feature: MapFeatureRecord): MapFeatureRecord {
  if (
    typeof feature !== 'object' ||
    feature == null ||
    typeof feature.id !== 'string' ||
    feature.id.trim().length === 0
  ) {
    throw new Error('PMTiles export features must include a non-empty id.');
  }
  switch (feature.kind) {
    case 'point':
    case 'line':
    case 'polygon':
      return feature;
    default:
      throw new Error(
        `PMTiles export feature kind ${JSON.stringify((feature as { kind?: unknown }).kind)} is not supported.`
      );
  }
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value;
}
