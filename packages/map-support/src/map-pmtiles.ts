import {
  isMapFeatureVisibleAtZoom,
  type MapFeatureLineRecord,
  type MapFeaturePolygonRecord,
  type MapFeatureRecord,
  type MapFeatureWorldCoordinate,
} from './map-features.ts';

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

export interface MapFeatureGeneratorPlugin {
  id: string;
  label?: string;
  layerId: string;
  getFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}

export const DEFAULT_PMTILES_FULL_DETAIL_ZOOM = 12;
export const DEFAULT_PMTILES_MAX_GEOMETRY_STRIDE = 16;

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

export function createMapFeatureGeneratorPlugin(params: {
  id: string;
  label?: string;
  layerId: string;
  getFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}): MapFeatureGeneratorPlugin {
  const normalizedLayerId = normalizeNonEmptyString(
    params.layerId,
    'Map feature generator layerId'
  );
  return {
    id: normalizeNonEmptyString(params.id, 'Map feature generator id'),
    label:
      typeof params.label === 'string' && params.label.trim().length > 0
        ? params.label.trim()
        : undefined,
    layerId: normalizedLayerId,
    getFeatures(request) {
      const normalizedRequest = normalizePmtilesExportRequest(request);
      return params.getFeatures(normalizedRequest).map((feature) => {
        const normalizedFeature = normalizeMapFeatureRecord(feature);
        if (normalizedFeature.layerId !== normalizedLayerId) {
          throw new Error(
            `Map feature generator layerId ${JSON.stringify(normalizedLayerId)} must match returned feature layerId ${JSON.stringify(normalizedFeature.layerId)}.`
          );
        }
        return normalizedFeature;
      });
    },
  };
}

export function generatePmtilesTileFeatures(options: {
  request: PmtilesExportRequest;
  generators: readonly MapFeatureGeneratorPlugin[];
}): readonly MapFeatureRecord[] {
  const normalizedRequest = normalizePmtilesExportRequest(options.request);
  const requestedLayerIds = new Set(normalizedRequest.layerIds ?? []);
  return options.generators.flatMap((generator) => {
    const normalizedGenerator = createMapFeatureGeneratorPlugin(generator);
    if (
      requestedLayerIds.size > 0 &&
      !requestedLayerIds.has(normalizedGenerator.layerId)
    ) {
      return [];
    }
    return normalizedGenerator.getFeatures(normalizedRequest);
  });
}

export function generatePmtilesTileFeaturesAtZoomDetail(options: {
  request: PmtilesExportRequest;
  generators: readonly MapFeatureGeneratorPlugin[];
  fullDetailZoom?: number;
  maximumGeometryStride?: number;
}): readonly MapFeatureRecord[] {
  const normalizedRequest = normalizePmtilesExportRequest(options.request);
  return selectPmtilesTileFeaturesForZoom(
    generatePmtilesTileFeatures({
      request: normalizedRequest,
      generators: options.generators,
    }),
    {
      zoom: normalizedRequest.tile.zoom,
      fullDetailZoom: options.fullDetailZoom,
      maximumGeometryStride: options.maximumGeometryStride,
    }
  );
}

export function selectPmtilesTileFeaturesForZoom(
  features: readonly MapFeatureRecord[],
  options: {
    zoom: number;
    fullDetailZoom?: number;
    maximumGeometryStride?: number;
  }
): readonly MapFeatureRecord[] {
  const zoom = normalizeNonNegativeInteger(options.zoom, 'PMTiles detail zoom');
  return features
    .filter((feature) => isMapFeatureVisibleAtZoom(feature, zoom))
    .map((feature) =>
      simplifyPmtilesFeatureGeometry(feature, {
        zoom,
        fullDetailZoom: options.fullDetailZoom,
        maximumGeometryStride: options.maximumGeometryStride,
      })
    );
}

export function simplifyPmtilesFeatureGeometry(
  feature: MapFeatureRecord,
  options: {
    zoom: number;
    fullDetailZoom?: number;
    maximumGeometryStride?: number;
  }
): MapFeatureRecord {
  const zoom = normalizeNonNegativeInteger(options.zoom, 'PMTiles detail zoom');
  const fullDetailZoom = normalizeNonNegativeInteger(
    options.fullDetailZoom ?? DEFAULT_PMTILES_FULL_DETAIL_ZOOM,
    'PMTiles detail fullDetailZoom'
  );
  const maximumGeometryStride = normalizeNonNegativeInteger(
    options.maximumGeometryStride ?? DEFAULT_PMTILES_MAX_GEOMETRY_STRIDE,
    'PMTiles detail maximumGeometryStride'
  );
  const stride = resolvePmtilesGeometryStride({
    zoom,
    fullDetailZoom,
    maximumGeometryStride,
  });
  switch (feature.kind) {
    case 'point':
      return feature;
    case 'line':
      return {
        ...feature,
        coordinates: simplifyFeatureCoordinateSequence(
          feature.coordinates,
          stride
        ),
      } satisfies MapFeatureLineRecord;
    case 'polygon':
      return {
        ...feature,
        rings: feature.rings.map((ring) =>
          closeFeatureCoordinateRing(simplifyFeatureCoordinateSequence(ring, stride))
        ),
      } satisfies MapFeaturePolygonRecord;
    default:
      return feature;
  }
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

function resolvePmtilesGeometryStride(options: {
  zoom: number;
  fullDetailZoom: number;
  maximumGeometryStride: number;
}): number {
  const zoomDelta = Math.max(0, options.fullDetailZoom - options.zoom);
  return Math.min(options.maximumGeometryStride, 2 ** zoomDelta);
}

function simplifyFeatureCoordinateSequence(
  coordinates: readonly MapFeatureWorldCoordinate[],
  stride: number
): readonly MapFeatureWorldCoordinate[] {
  if (stride <= 1 || coordinates.length <= 2) {
    return coordinates;
  }
  const simplified = coordinates.filter(
    (_coordinate, index) =>
      index === 0 ||
      index === coordinates.length - 1 ||
      index % stride === 0
  );
  return simplified.length >= 2
    ? simplified
    : [coordinates[0], coordinates.at(-1)].filter(
        (coordinate): coordinate is MapFeatureWorldCoordinate => coordinate != null
      );
}

function closeFeatureCoordinateRing(
  ring: readonly MapFeatureWorldCoordinate[]
): readonly MapFeatureWorldCoordinate[] {
  const firstCoordinate = ring[0];
  const lastCoordinate = ring.at(-1);
  if (!firstCoordinate || !lastCoordinate) {
    return ring;
  }
  if (
    firstCoordinate.worldX === lastCoordinate.worldX &&
    firstCoordinate.worldY === lastCoordinate.worldY
  ) {
    return ring;
  }
  return [...ring, firstCoordinate];
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
