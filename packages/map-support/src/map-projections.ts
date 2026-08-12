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

export interface GenericConicMapProjectionOptions {
  id?: string;
  label?: string;
  centralMeridianDegrees?: number;
  latitudeOfOriginDegrees?: number;
  standardParallel1Degrees?: number;
  standardParallel2Degrees?: number;
  maxWorldLongitude?: number;
  maxWorldLatitude?: number;
}

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
  project(coordinate: MapProjectionWorldCoordinate): MapProjectionMapCoordinate;
  invert?(
    coordinate: MapProjectionMapCoordinate
  ): MapProjectionWorldCoordinate | null;
}

export const MERCATOR_MAX_WORLD_LATITUDE = 85.0511287798066;
export const MILLER_MAX_WORLD_LATITUDE = 90;
export const MILLER_MAX_PROJECTED_Y =
  1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * degreesToRadians(90)));
export const TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE = 80;
export const TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE = 90;
export const TRANSVERSE_MERCATOR_MAX_PROJECTED_X = atanh(
  Math.sin(degreesToRadians(TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE))
);
export const GENERIC_CONIC_STANDARD_PARALLEL_1 = 20;
export const GENERIC_CONIC_STANDARD_PARALLEL_2 = 60;
export const GENERIC_CONIC_CENTRAL_MERIDIAN = 0;
export const GENERIC_CONIC_LATITUDE_OF_ORIGIN = 0;
export const GENERIC_CONIC_MAX_WORLD_LONGITUDE = 180;
export const GENERIC_CONIC_MAX_WORLD_LATITUDE = 90;

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

export function createMillerCylindricalMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'miller-cylindrical',
    label: 'Miller Cylindrical',
    distortion: 'compromise',
    bounds: {
      minWorldX: -180,
      maxWorldX: 180,
      minWorldY: -MILLER_MAX_WORLD_LATITUDE,
      maxWorldY: MILLER_MAX_WORLD_LATITUDE,
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
        -MILLER_MAX_WORLD_LATITUDE,
        MILLER_MAX_WORLD_LATITUDE
      );
      const latitudeRadians = degreesToRadians(clampedLatitude);
      return {
        mapX: worldX / 180,
        mapY: snapNearZero(
          (1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * latitudeRadians))) /
            MILLER_MAX_PROJECTED_Y
        ),
      };
    },
    invert({ mapX, mapY }) {
      const projectedY = mapY * MILLER_MAX_PROJECTED_Y;
      return {
        worldX: mapX * 180,
        worldY: radiansToDegrees(
          (Math.atan(Math.exp(projectedY / 1.25)) - Math.PI / 4) / 0.4
        ),
      };
    },
  });
}

export function createTransverseMercatorMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'transverse-mercator',
    label: 'Transverse Mercator',
    distortion: 'conformal',
    bounds: {
      minWorldX: -TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE,
      maxWorldX: TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE,
      minWorldY: -TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE,
      maxWorldY: TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE,
      minMapX: -1,
      maxMapX: 1,
      minMapY: -1,
      maxMapY: 1,
    },
    wrapping: {
      wrapsWorldX: false,
      wrapsWorldY: false,
    },
    project({ worldX, worldY }) {
      const clampedLongitude = clamp(
        worldX,
        -TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE,
        TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE
      );
      const clampedLatitude = clamp(
        worldY,
        -TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE,
        TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE
      );
      const longitudeRadians = degreesToRadians(clampedLongitude);
      const latitudeRadians = degreesToRadians(clampedLatitude);
      const projectedX = atanh(
        clamp(
          Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
          -1 + 1e-12,
          1 - 1e-12
        )
      );
      const projectedY = Math.atan2(
        Math.tan(latitudeRadians),
        Math.cos(longitudeRadians)
      );
      return {
        mapX: snapNearZero(projectedX / TRANSVERSE_MERCATOR_MAX_PROJECTED_X),
        mapY: snapNearZero(projectedY / (Math.PI / 2)),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * TRANSVERSE_MERCATOR_MAX_PROJECTED_X;
      const projectedY = mapY * (Math.PI / 2);
      return {
        worldX: radiansToDegrees(
          Math.atan2(Math.sinh(projectedX), Math.cos(projectedY))
        ),
        worldY: radiansToDegrees(
          Math.asin(clamp(Math.sin(projectedY) / Math.cosh(projectedX), -1, 1))
        ),
      };
    },
  });
}

export function createGenericConicMapProjectionPlugin(
  options: GenericConicMapProjectionOptions = {}
): MapProjectionPlugin {
  const centralMeridianDegrees = normalizeFiniteNumber(
    options.centralMeridianDegrees ?? GENERIC_CONIC_CENTRAL_MERIDIAN,
    'Generic conic centralMeridianDegrees'
  );
  const latitudeOfOriginDegrees = normalizeFiniteNumber(
    options.latitudeOfOriginDegrees ?? GENERIC_CONIC_LATITUDE_OF_ORIGIN,
    'Generic conic latitudeOfOriginDegrees'
  );
  const standardParallel1Degrees = normalizeFiniteNumber(
    options.standardParallel1Degrees ?? GENERIC_CONIC_STANDARD_PARALLEL_1,
    'Generic conic standardParallel1Degrees'
  );
  const standardParallel2Degrees = normalizeFiniteNumber(
    options.standardParallel2Degrees ?? GENERIC_CONIC_STANDARD_PARALLEL_2,
    'Generic conic standardParallel2Degrees'
  );
  const maxWorldLongitude = normalizePositiveFiniteNumber(
    options.maxWorldLongitude ?? GENERIC_CONIC_MAX_WORLD_LONGITUDE,
    'Generic conic maxWorldLongitude'
  );
  const maxWorldLatitude = normalizePositiveFiniteNumber(
    options.maxWorldLatitude ?? GENERIC_CONIC_MAX_WORLD_LATITUDE,
    'Generic conic maxWorldLatitude'
  );

  const centralMeridianRadians = degreesToRadians(centralMeridianDegrees);
  const latitudeOfOriginRadians = degreesToRadians(latitudeOfOriginDegrees);
  const standardParallel1Radians = degreesToRadians(standardParallel1Degrees);
  const standardParallel2Radians = degreesToRadians(standardParallel2Degrees);

  const coneConstant = resolveGenericConicConeConstant(
    standardParallel1Radians,
    standardParallel2Radians
  );
  const coneBase =
    Math.cos(standardParallel1Radians) / coneConstant +
    standardParallel1Radians;
  const originRadius = coneBase - latitudeOfOriginRadians;

  const rawProject = ({
    worldX,
    worldY,
  }: MapProjectionWorldCoordinate): MapProjectionMapCoordinate => {
    const clampedLongitude = clamp(
      worldX,
      centralMeridianDegrees - maxWorldLongitude,
      centralMeridianDegrees + maxWorldLongitude
    );
    const clampedLatitude = clamp(
      worldY,
      -maxWorldLatitude,
      maxWorldLatitude
    );
    const longitudeRadians =
      degreesToRadians(clampedLongitude) - centralMeridianRadians;
    const latitudeRadians = degreesToRadians(clampedLatitude);
    const theta = coneConstant * longitudeRadians;
    const radius = coneBase - latitudeRadians;
    return {
      mapX: radius * Math.sin(theta),
      mapY: originRadius - radius * Math.cos(theta),
    };
  };

  const extent = sampleProjectionExtent({
    maxWorldLongitude,
    maxWorldLatitude,
    rawProject,
  });

  return createMapProjectionPlugin({
    id: options.id ?? 'generic-conic',
    label: options.label ?? 'Generic Conic',
    distortion: 'equidistant',
    bounds: {
      minWorldX: centralMeridianDegrees - maxWorldLongitude,
      maxWorldX: centralMeridianDegrees + maxWorldLongitude,
      minWorldY: -maxWorldLatitude,
      maxWorldY: maxWorldLatitude,
      minMapX: -1,
      maxMapX: 1,
      minMapY: -1,
      maxMapY: 1,
    },
    wrapping: {
      wrapsWorldX: false,
      wrapsWorldY: false,
    },
    project(coordinate) {
      const projected = rawProject(coordinate);
      return {
        mapX: snapNearZero(projected.mapX / extent.maxAbsX),
        mapY: snapNearZero(projected.mapY / extent.maxAbsY),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * extent.maxAbsX;
      const projectedY = mapY * extent.maxAbsY;
      const radius = Math.sign(coneConstant || 1) *
        Math.hypot(projectedX, originRadius - projectedY);
      const theta = Math.atan2(projectedX, originRadius - projectedY);
      return {
        worldX:
          radiansToDegrees(theta / coneConstant + centralMeridianRadians),
        worldY: radiansToDegrees(coneBase - radius),
      };
    },
  });
}

function normalizeMapProjectionWorldCoordinate(
  coordinate: MapProjectionWorldCoordinate
): MapProjectionWorldCoordinate {
  return {
    worldX: normalizeFiniteNumber(coordinate.worldX, 'Map projection worldX'),
    worldY: normalizeFiniteNumber(coordinate.worldY, 'Map projection worldY'),
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
    throw new Error('Map projection bounds minWorldX must be <= maxWorldX.');
  }
  if (normalized.minWorldY > normalized.maxWorldY) {
    throw new Error('Map projection bounds minWorldY must be <= maxWorldY.');
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

function normalizePositiveFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
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

function atanh(value: number): number {
  return 0.5 * Math.log((1 + value) / (1 - value));
}

function resolveGenericConicConeConstant(
  standardParallel1Radians: number,
  standardParallel2Radians: number
): number {
  const difference = Math.abs(
    standardParallel1Radians - standardParallel2Radians
  );
  const coneConstant =
    difference <= 1e-12
      ? Math.sin(standardParallel1Radians)
      : (Math.cos(standardParallel1Radians) -
          Math.cos(standardParallel2Radians)) /
        (standardParallel2Radians - standardParallel1Radians);
  if (Math.abs(coneConstant) <= 1e-12) {
    throw new Error(
      'Generic conic standard parallels must not cancel the cone constant to zero.'
    );
  }
  return coneConstant;
}

function sampleProjectionExtent(params: {
  maxWorldLongitude: number;
  maxWorldLatitude: number;
  rawProject(coordinate: MapProjectionWorldCoordinate): MapProjectionMapCoordinate;
}): { maxAbsX: number; maxAbsY: number } {
  let maxAbsX = 0;
  let maxAbsY = 0;
  for (let latitudeIndex = 0; latitudeIndex <= 180; latitudeIndex += 1) {
    const worldY =
      -params.maxWorldLatitude +
      (latitudeIndex / 180) * (params.maxWorldLatitude * 2);
    for (let longitudeIndex = 0; longitudeIndex <= 360; longitudeIndex += 1) {
      const worldX =
        -params.maxWorldLongitude +
        (longitudeIndex / 360) * (params.maxWorldLongitude * 2);
      const projected = params.rawProject({ worldX, worldY });
      maxAbsX = Math.max(maxAbsX, Math.abs(projected.mapX));
      maxAbsY = Math.max(maxAbsY, Math.abs(projected.mapY));
    }
  }
  return {
    maxAbsX: Math.max(maxAbsX, 1),
    maxAbsY: Math.max(maxAbsY, 1),
  };
}
