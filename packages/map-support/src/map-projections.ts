export type MapProjectionWorldCoordinate = {
  worldX: number;
  worldY: number;
};

export type MapProjectionMapCoordinate = {
  mapX: number;
  mapY: number;
};

export type MapProjectionBounds = {
  minWorldX: number;
  maxWorldX: number;
  minWorldY: number;
  maxWorldY: number;
  minMapX: number;
  maxMapX: number;
  minMapY: number;
  maxMapY: number;
};

export type MapProjectionWrapping = {
  wrapsWorldX?: boolean;
  wrapsWorldY?: boolean;
};

export type MapProjectionDistortion =
  | 'conformal'
  | 'equal-area'
  | 'equidistant'
  | 'compromise'
  | 'perspective'
  | 'custom';

export interface MapProjectionPlugin {
  id: string;
  label?: string;
  bounds: MapProjectionBounds;
  wrapping: MapProjectionWrapping;
  distortion: MapProjectionDistortion;
  project(
    coordinate: MapProjectionWorldCoordinate
  ): MapProjectionMapCoordinate;
  invert?(
    coordinate: MapProjectionMapCoordinate
  ): MapProjectionWorldCoordinate | null;
}

export const MERCATOR_MAX_WORLD_LATITUDE = 85.0511287798066;

export function createMapProjectionPlugin(params: {
  id: string;
  label?: string;
  bounds: MapProjectionBounds;
  wrapping?: MapProjectionWrapping;
  distortion: MapProjectionDistortion;
  project: MapProjectionPlugin['project'];
  invert?: MapProjectionPlugin['invert'];
}): MapProjectionPlugin {
  return {
    id: normalizeNonEmptyString(params.id, 'Map projection plugin id'),
    label:
      typeof params.label === 'string' && params.label.trim().length > 0
        ? params.label.trim()
        : undefined,
    bounds: normalizeMapProjectionBounds(params.bounds),
    wrapping: normalizeMapProjectionWrapping(params.wrapping),
    distortion: normalizeMapProjectionDistortion(params.distortion),
    project(coordinate) {
      return normalizeMapProjectionMapCoordinate(
        params.project(normalizeMapProjectionWorldCoordinate(coordinate)),
        'Map projection project result'
      );
    },
    ...(params.invert
      ? {
          invert(coordinate: MapProjectionMapCoordinate) {
            const inverted = params.invert?.(
              normalizeMapProjectionMapCoordinate(
                coordinate,
                'Map projection invert coordinate'
              )
            );
            if (inverted == null) {
              return null;
            }
            return normalizeMapProjectionWorldCoordinate(inverted);
          },
        }
      : {}),
  };
}

export function createMercatorMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'mercator',
    label: 'Mercator',
    distortion: 'conformal',
    bounds: {
      minWorldX: -180,
      maxWorldX: 180,
      minWorldY: -MERCATOR_MAX_WORLD_LATITUDE,
      maxWorldY: MERCATOR_MAX_WORLD_LATITUDE,
      minMapX: -1,
      maxMapX: 1,
      minMapY: -1,
      maxMapY: 1,
    },
    wrapping: {
      wrapsWorldX: true,
      wrapsWorldY: false,
    },
    project({ worldX, worldY }) {
      const clampedLatitude = clamp(
        worldY,
        -MERCATOR_MAX_WORLD_LATITUDE,
        MERCATOR_MAX_WORLD_LATITUDE
      );
      const latitudeRadians = degreesToRadians(clampedLatitude);
      return {
        mapX: worldX / 180,
        mapY: snapNearZero(
          Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)) / Math.PI
        ),
      };
    },
    invert({ mapX, mapY }) {
      return {
        worldX: mapX * 180,
        worldY: radiansToDegrees(Math.atan(Math.sinh(Math.PI * mapY))),
      };
    },
  });
}

function normalizeMapProjectionWorldCoordinate(
  coordinate: MapProjectionWorldCoordinate
): MapProjectionWorldCoordinate {
  return {
    worldX: normalizeFiniteNumber(
      coordinate.worldX,
      'Map projection worldX'
    ),
    worldY: normalizeFiniteNumber(
      coordinate.worldY,
      'Map projection worldY'
    ),
  };
}

function normalizeMapProjectionMapCoordinate(
  coordinate: MapProjectionMapCoordinate,
  label: string
): MapProjectionMapCoordinate {
  return {
    mapX: normalizeFiniteNumber(coordinate.mapX, `${label} mapX`),
    mapY: normalizeFiniteNumber(coordinate.mapY, `${label} mapY`),
  };
}

function normalizeMapProjectionBounds(
  bounds: MapProjectionBounds
): MapProjectionBounds {
  const normalized = {
    minWorldX: normalizeFiniteNumber(
      bounds.minWorldX,
      'Map projection bounds minWorldX'
    ),
    maxWorldX: normalizeFiniteNumber(
      bounds.maxWorldX,
      'Map projection bounds maxWorldX'
    ),
    minWorldY: normalizeFiniteNumber(
      bounds.minWorldY,
      'Map projection bounds minWorldY'
    ),
    maxWorldY: normalizeFiniteNumber(
      bounds.maxWorldY,
      'Map projection bounds maxWorldY'
    ),
    minMapX: normalizeFiniteNumber(
      bounds.minMapX,
      'Map projection bounds minMapX'
    ),
    maxMapX: normalizeFiniteNumber(
      bounds.maxMapX,
      'Map projection bounds maxMapX'
    ),
    minMapY: normalizeFiniteNumber(
      bounds.minMapY,
      'Map projection bounds minMapY'
    ),
    maxMapY: normalizeFiniteNumber(
      bounds.maxMapY,
      'Map projection bounds maxMapY'
    ),
  };

  if (normalized.minWorldX > normalized.maxWorldX) {
    throw new Error(
      'Map projection bounds minWorldX must be <= maxWorldX.'
    );
  }
  if (normalized.minWorldY > normalized.maxWorldY) {
    throw new Error(
      'Map projection bounds minWorldY must be <= maxWorldY.'
    );
  }
  if (normalized.minMapX > normalized.maxMapX) {
    throw new Error('Map projection bounds minMapX must be <= maxMapX.');
  }
  if (normalized.minMapY > normalized.maxMapY) {
    throw new Error('Map projection bounds minMapY must be <= maxMapY.');
  }

  return normalized;
}

function normalizeMapProjectionWrapping(
  wrapping: MapProjectionWrapping | undefined
): MapProjectionWrapping {
  return {
    wrapsWorldX: wrapping?.wrapsWorldX === true,
    wrapsWorldY: wrapping?.wrapsWorldY === true,
  };
}

function normalizeMapProjectionDistortion(
  distortion: MapProjectionDistortion
): MapProjectionDistortion {
  switch (distortion) {
    case 'conformal':
    case 'equal-area':
    case 'equidistant':
    case 'compromise':
    case 'perspective':
    case 'custom':
      return distortion;
    default:
      throw new Error(
        `Map projection distortion ${JSON.stringify(distortion)} is not supported.`
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

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapNearZero(value: number, tolerance = 1e-12): number {
  return Math.abs(value) <= tolerance ? 0 : value;
}
