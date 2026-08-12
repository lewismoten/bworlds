export type MapFeatureWorldCoordinate = {
  worldX: number;
  worldY: number;
};

export type MapFeatureZoomRange = {
  minZoom: number;
  maxZoom?: number;
};

export type MapFeaturePropertyValue =
  | string
  | number
  | boolean
  | null
  | readonly MapFeaturePropertyValue[]
  | { readonly [key: string]: MapFeaturePropertyValue };

export type MapFeatureProperties = Readonly<Record<string, MapFeaturePropertyValue>>;

export type MapFeaturePointRecord = {
  id: string;
  kind: 'point';
  sourceWorldObjectId: string;
  layerId: string;
  zoomRange: MapFeatureZoomRange;
  coordinate: MapFeatureWorldCoordinate;
  properties: MapFeatureProperties;
};

export type MapFeatureLineRecord = {
  id: string;
  kind: 'line';
  sourceWorldObjectId: string;
  layerId: string;
  zoomRange: MapFeatureZoomRange;
  coordinates: readonly MapFeatureWorldCoordinate[];
  properties: MapFeatureProperties;
};

export type MapFeaturePolygonRecord = {
  id: string;
  kind: 'polygon';
  sourceWorldObjectId: string;
  layerId: string;
  zoomRange: MapFeatureZoomRange;
  rings: readonly (readonly MapFeatureWorldCoordinate[])[];
  properties: MapFeatureProperties;
};

export type MapFeatureRecord =
  | MapFeaturePointRecord
  | MapFeatureLineRecord
  | MapFeaturePolygonRecord;

export const DEFAULT_MAP_FEATURE_MIN_ZOOM = 0;

export function createStableMapFeatureId(options: {
  sourceWorldObjectId: string;
  layerId: string;
  featureKey?: string;
}): string {
  const sourceWorldObjectId = normalizeNonEmptyString(
    options.sourceWorldObjectId,
    'Map feature sourceWorldObjectId'
  );
  const layerId = normalizeNonEmptyString(options.layerId, 'Map feature layerId');
  const featureKey =
    typeof options.featureKey === 'string' && options.featureKey.trim().length > 0
      ? `:${options.featureKey.trim()}`
      : '';
  return `${layerId}:${sourceWorldObjectId}${featureKey}`;
}

export function createMapFeaturePointRecord(options: {
  id?: string;
  sourceWorldObjectId: string;
  layerId: string;
  zoomRange?: MapFeatureZoomRange;
  coordinate: MapFeatureWorldCoordinate;
  properties?: MapFeatureProperties;
}): MapFeaturePointRecord {
  return {
    id:
      typeof options.id === 'string' && options.id.trim().length > 0
        ? options.id.trim()
        : createStableMapFeatureId(options),
    kind: 'point',
    sourceWorldObjectId: normalizeNonEmptyString(
      options.sourceWorldObjectId,
      'Map feature sourceWorldObjectId'
    ),
    layerId: normalizeNonEmptyString(options.layerId, 'Map feature layerId'),
    zoomRange: normalizeMapFeatureZoomRange(options.zoomRange),
    coordinate: normalizeMapFeatureWorldCoordinate(options.coordinate),
    properties: normalizeMapFeatureProperties(options.properties),
  };
}

export function createMapFeatureLineRecord(options: {
  id?: string;
  sourceWorldObjectId: string;
  layerId: string;
  zoomRange?: MapFeatureZoomRange;
  coordinates: readonly MapFeatureWorldCoordinate[];
  properties?: MapFeatureProperties;
}): MapFeatureLineRecord {
  const coordinates = options.coordinates.map((coordinate) =>
    normalizeMapFeatureWorldCoordinate(coordinate)
  );
  if (coordinates.length < 2) {
    throw new Error('Map feature line coordinates must include at least two points.');
  }
  return {
    id:
      typeof options.id === 'string' && options.id.trim().length > 0
        ? options.id.trim()
        : createStableMapFeatureId(options),
    kind: 'line',
    sourceWorldObjectId: normalizeNonEmptyString(
      options.sourceWorldObjectId,
      'Map feature sourceWorldObjectId'
    ),
    layerId: normalizeNonEmptyString(options.layerId, 'Map feature layerId'),
    zoomRange: normalizeMapFeatureZoomRange(options.zoomRange),
    coordinates,
    properties: normalizeMapFeatureProperties(options.properties),
  };
}

export function createMapFeaturePolygonRecord(options: {
  id?: string;
  sourceWorldObjectId: string;
  layerId: string;
  zoomRange?: MapFeatureZoomRange;
  rings: readonly (readonly MapFeatureWorldCoordinate[])[];
  properties?: MapFeatureProperties;
}): MapFeaturePolygonRecord {
  const rings = options.rings.map((ring) => normalizeMapFeaturePolygonRing(ring));
  if (rings.length === 0) {
    throw new Error('Map feature polygon rings must include at least one ring.');
  }
  return {
    id:
      typeof options.id === 'string' && options.id.trim().length > 0
        ? options.id.trim()
        : createStableMapFeatureId(options),
    kind: 'polygon',
    sourceWorldObjectId: normalizeNonEmptyString(
      options.sourceWorldObjectId,
      'Map feature sourceWorldObjectId'
    ),
    layerId: normalizeNonEmptyString(options.layerId, 'Map feature layerId'),
    zoomRange: normalizeMapFeatureZoomRange(options.zoomRange),
    rings,
    properties: normalizeMapFeatureProperties(options.properties),
  };
}

export function isMapFeatureVisibleAtZoom(
  feature: MapFeatureRecord,
  zoom: number
): boolean {
  const normalizedZoom = normalizeFiniteNumber(zoom, 'Map feature zoom');
  return (
    normalizedZoom >= feature.zoomRange.minZoom &&
    (feature.zoomRange.maxZoom == null ||
      normalizedZoom <= feature.zoomRange.maxZoom)
  );
}

function normalizeMapFeatureZoomRange(
  zoomRange: MapFeatureZoomRange | undefined
): MapFeatureZoomRange {
  const minZoom = normalizeFiniteNumber(
    zoomRange?.minZoom ?? DEFAULT_MAP_FEATURE_MIN_ZOOM,
    'Map feature minZoom'
  );
  const maxZoom =
    zoomRange?.maxZoom == null
      ? undefined
      : normalizeFiniteNumber(zoomRange.maxZoom, 'Map feature maxZoom');
  if (maxZoom != null && minZoom > maxZoom) {
    throw new Error('Map feature minZoom must be <= maxZoom.');
  }
  return {
    minZoom,
    ...(maxZoom == null ? {} : { maxZoom }),
  };
}

function normalizeMapFeatureWorldCoordinate(
  coordinate: MapFeatureWorldCoordinate
): MapFeatureWorldCoordinate {
  return {
    worldX: normalizeFiniteNumber(coordinate.worldX, 'Map feature worldX'),
    worldY: normalizeFiniteNumber(coordinate.worldY, 'Map feature worldY'),
  };
}

function normalizeMapFeaturePolygonRing(
  ring: readonly MapFeatureWorldCoordinate[]
): readonly MapFeatureWorldCoordinate[] {
  const normalizedRing = ring.map((coordinate) =>
    normalizeMapFeatureWorldCoordinate(coordinate)
  );
  if (normalizedRing.length < 4) {
    throw new Error('Map feature polygon rings must include at least four points.');
  }
  const firstCoordinate = normalizedRing[0];
  const lastCoordinate = normalizedRing.at(-1);
  if (!firstCoordinate || !lastCoordinate) {
    throw new Error('Map feature polygon rings must not be empty.');
  }
  if (
    firstCoordinate.worldX !== lastCoordinate.worldX ||
    firstCoordinate.worldY !== lastCoordinate.worldY
  ) {
    return [...normalizedRing, firstCoordinate];
  }
  return normalizedRing;
}

function normalizeMapFeatureProperties(
  properties: MapFeatureProperties | undefined
): MapFeatureProperties {
  return properties ?? {};
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}
