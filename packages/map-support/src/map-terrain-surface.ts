import {
  createMapFeaturePolygonRecord,
  type MapFeaturePolygonRecord,
  type MapFeatureProperties,
  type MapFeatureZoomRange,
} from './map-features.ts';
import {
  createMapFeatureGeneratorPlugin,
  type MapFeatureGeneratorPlugin,
  type PmtilesExportRequest,
} from './map-pmtiles.ts';

export const DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID = 'terrain-surface';

export type MapTerrainSurfaceCellBounds = {
  minWorldX: number;
  maxWorldX: number;
  minWorldY: number;
  maxWorldY: number;
};

export type MapTerrainSurfaceSample = {
  id?: string;
  sourceWorldObjectId: string;
  layerId?: string;
  zoomRange?: MapFeatureZoomRange;
  bounds: MapTerrainSurfaceCellBounds;
  surfaceHeight: number;
  seaLevel?: number;
  depthBelowSeaLevel?: number;
  isBelowSeaLevel?: boolean;
  surfaceKind?: string;
  slopeGrade?: number;
  properties?: MapFeatureProperties;
};

export function createMapTerrainSurfaceCellBounds(
  bounds: MapTerrainSurfaceCellBounds
): MapTerrainSurfaceCellBounds {
  const minWorldX = normalizeFiniteNumber(
    bounds.minWorldX,
    'Map terrain surface minWorldX'
  );
  const maxWorldX = normalizeFiniteNumber(
    bounds.maxWorldX,
    'Map terrain surface maxWorldX'
  );
  const minWorldY = normalizeFiniteNumber(
    bounds.minWorldY,
    'Map terrain surface minWorldY'
  );
  const maxWorldY = normalizeFiniteNumber(
    bounds.maxWorldY,
    'Map terrain surface maxWorldY'
  );
  if (minWorldX >= maxWorldX) {
    throw new Error(
      `Map terrain surface minWorldX ${minWorldX} must be < maxWorldX ${maxWorldX}.`
    );
  }
  if (minWorldY >= maxWorldY) {
    throw new Error(
      `Map terrain surface minWorldY ${minWorldY} must be < maxWorldY ${maxWorldY}.`
    );
  }
  return {
    minWorldX,
    maxWorldX,
    minWorldY,
    maxWorldY,
  };
}

export function createMapTerrainSurfaceFeatureRecord(
  sample: MapTerrainSurfaceSample
): MapFeaturePolygonRecord {
  const bounds = createMapTerrainSurfaceCellBounds(sample.bounds);
  const surfaceHeight = normalizeFiniteNumber(
    sample.surfaceHeight,
    'Map terrain surface height'
  );
  const seaLevel = normalizeFiniteNumber(
    sample.seaLevel ?? 0,
    'Map terrain surface seaLevel'
  );
  const depthBelowSeaLevel = normalizeFiniteNumber(
    sample.depthBelowSeaLevel ?? Math.max(0, seaLevel - surfaceHeight),
    'Map terrain surface depthBelowSeaLevel'
  );
  const isBelowSeaLevel =
    typeof sample.isBelowSeaLevel === 'boolean'
      ? sample.isBelowSeaLevel
      : surfaceHeight < seaLevel;
  const slopeGrade =
    sample.slopeGrade == null
      ? undefined
      : normalizeFiniteNumber(sample.slopeGrade, 'Map terrain surface slopeGrade');
  const surfaceKind =
    typeof sample.surfaceKind === 'string' && sample.surfaceKind.trim().length > 0
      ? sample.surfaceKind.trim()
      : undefined;

  return createMapFeaturePolygonRecord({
    id: sample.id,
    sourceWorldObjectId: sample.sourceWorldObjectId,
    layerId: sample.layerId ?? DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID,
    zoomRange: sample.zoomRange,
    rings: [
      [
        { worldX: bounds.minWorldX, worldY: bounds.minWorldY },
        { worldX: bounds.maxWorldX, worldY: bounds.minWorldY },
        { worldX: bounds.maxWorldX, worldY: bounds.maxWorldY },
        { worldX: bounds.minWorldX, worldY: bounds.maxWorldY },
      ],
    ],
    properties: {
      surfaceHeight,
      seaLevel,
      depthBelowSeaLevel,
      isBelowSeaLevel,
      ...(surfaceKind == null ? {} : { surfaceKind }),
      ...(slopeGrade == null ? {} : { slopeGrade }),
      ...(sample.properties ?? {}),
    },
  });
}

export function createTerrainSurfaceMapFeatureGeneratorPlugin(options: {
  id?: string;
  label?: string;
  getTerrainSurfaceSamples(
    request: PmtilesExportRequest
  ): readonly MapTerrainSurfaceSample[];
}): MapFeatureGeneratorPlugin {
  return createMapFeatureGeneratorPlugin({
    id: options.id ?? 'terrain-surface-map-layer',
    label: options.label ?? 'Terrain Surface Layer',
    layerId: DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID,
    getFeatures(request) {
      return options
        .getTerrainSurfaceSamples(request)
        .map((sample) => createMapTerrainSurfaceFeatureRecord(sample));
    },
  });
}

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}
