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

export interface AzimuthalMapProjectionOptions {
  id?: string;
  label?: string;
  centerLongitudeDegrees?: number;
  centerLatitudeDegrees?: number;
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
export const ALBERS_STANDARD_PARALLEL_1 = 29.5;
export const ALBERS_STANDARD_PARALLEL_2 = 45.5;
export const ALBERS_CENTRAL_MERIDIAN = -96;
export const ALBERS_LATITUDE_OF_ORIGIN = 23;
export const ALBERS_MAX_WORLD_LONGITUDE = 90;
export const ALBERS_MAX_WORLD_LATITUDE = 90;
export const AZIMUTHAL_CENTER_LONGITUDE = 0;
export const AZIMUTHAL_CENTER_LATITUDE = 0;
export const AZIMUTHAL_MAX_PROJECTED_RADIUS = 2;
export const AZIMUTHAL_EQUIDISTANT_CENTER_LONGITUDE = 0;
export const AZIMUTHAL_EQUIDISTANT_CENTER_LATITUDE = 0;
export const AZIMUTHAL_EQUIDISTANT_MAX_PROJECTED_RADIUS = Math.PI;
export const STEREOGRAPHIC_CENTER_LONGITUDE = 0;
export const STEREOGRAPHIC_CENTER_LATITUDE = 0;
export const STEREOGRAPHIC_MAX_CENTRAL_ANGLE_DEGREES = 179;
export const STEREOGRAPHIC_MAX_PROJECTED_RADIUS =
  2 *
  Math.tan(
    degreesToRadians(STEREOGRAPHIC_MAX_CENTRAL_ANGLE_DEGREES) / 2
  );
export const ORTHOGRAPHIC_CENTER_LONGITUDE = 0;
export const ORTHOGRAPHIC_CENTER_LATITUDE = 0;
export const ORTHOGRAPHIC_MAX_PROJECTED_RADIUS = 1;
export const SINUSOIDAL_MAX_WORLD_LONGITUDE = 180;
export const SINUSOIDAL_MAX_WORLD_LATITUDE = 90;
export const SINUSOIDAL_MAX_PROJECTED_X = Math.PI;
export const SINUSOIDAL_MAX_PROJECTED_Y = Math.PI / 2;
export const MOLLWEIDE_MAX_WORLD_LONGITUDE = 180;
export const MOLLWEIDE_MAX_WORLD_LATITUDE = 90;
export const MOLLWEIDE_MAX_PROJECTED_X = 2 * Math.SQRT2;
export const MOLLWEIDE_MAX_PROJECTED_Y = Math.SQRT2;
export const MOLLWEIDE_MAX_SOLVER_ITERATIONS = 12;
export const MOLLWEIDE_SOLVER_TOLERANCE = 1e-12;
export const EQUAL_EARTH_MAX_WORLD_LONGITUDE = 180;
export const EQUAL_EARTH_MAX_WORLD_LATITUDE = 90;
export const EQUAL_EARTH_A1 = 1.340264;
export const EQUAL_EARTH_A2 = -0.081106;
export const EQUAL_EARTH_A3 = 0.000893;
export const EQUAL_EARTH_A4 = 0.003796;
export const EQUAL_EARTH_MAX_PROJECTED_X =
  (2 * Math.sqrt(3) * Math.PI) / (3 * EQUAL_EARTH_A1);
export const EQUAL_EARTH_MAX_PROJECTED_Y = evaluateEqualEarthY(Math.PI / 3);
export const EQUAL_EARTH_MAX_SOLVER_ITERATIONS = 12;
export const EQUAL_EARTH_SOLVER_TOLERANCE = 1e-12;
export const GOODE_HOMOLOSINE_MAX_WORLD_LONGITUDE = 180;
export const GOODE_HOMOLOSINE_MAX_WORLD_LATITUDE = 90;
export const GOODE_HOMOLOSINE_TRANSITION_LATITUDE_DEGREES =
  40.733333333333334;
export const GOODE_HOMOLOSINE_TRANSITION_LATITUDE_RADIANS =
  degreesToRadians(GOODE_HOMOLOSINE_TRANSITION_LATITUDE_DEGREES);
export const GOODE_HOMOLOSINE_MOLLWEIDE_Y_OFFSET = 0.0528;
export const GOODE_HOMOLOSINE_MAX_PROJECTED_X = 2 * Math.SQRT2;
export const GOODE_HOMOLOSINE_MAX_PROJECTED_Y =
  Math.SQRT2 - GOODE_HOMOLOSINE_MOLLWEIDE_Y_OFFSET;
export const ROBINSON_MAX_WORLD_LONGITUDE = 180;
export const ROBINSON_MAX_WORLD_LATITUDE = 90;
export const ROBINSON_MAX_PROJECTED_X = 0.8487;
export const ROBINSON_MAX_PROJECTED_Y = 1.3523;
export const ROBINSON_MAX_SOLVER_ITERATIONS = 12;
export const ROBINSON_SOLVER_TOLERANCE = 1e-12;
const ROBINSON_X_TABLE = [
  1,
  0.9986,
  0.9954,
  0.99,
  0.9822,
  0.973,
  0.96,
  0.9427,
  0.9216,
  0.8962,
  0.8679,
  0.835,
  0.7986,
  0.7597,
  0.7186,
  0.6732,
  0.6213,
  0.5722,
  0.5322,
];
const ROBINSON_Y_TABLE = [
  0,
  0.062,
  0.124,
  0.186,
  0.248,
  0.31,
  0.372,
  0.434,
  0.4958,
  0.5571,
  0.6176,
  0.6769,
  0.7346,
  0.7903,
  0.8435,
  0.8936,
  0.9394,
  0.9761,
  1,
];

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

export function createAlbersEqualAreaConicMapProjectionPlugin(
  options: GenericConicMapProjectionOptions = {}
): MapProjectionPlugin {
  const centralMeridianDegrees = normalizeFiniteNumber(
    options.centralMeridianDegrees ?? ALBERS_CENTRAL_MERIDIAN,
    'Albers equal-area centralMeridianDegrees'
  );
  const latitudeOfOriginDegrees = normalizeFiniteNumber(
    options.latitudeOfOriginDegrees ?? ALBERS_LATITUDE_OF_ORIGIN,
    'Albers equal-area latitudeOfOriginDegrees'
  );
  const standardParallel1Degrees = normalizeFiniteNumber(
    options.standardParallel1Degrees ?? ALBERS_STANDARD_PARALLEL_1,
    'Albers equal-area standardParallel1Degrees'
  );
  const standardParallel2Degrees = normalizeFiniteNumber(
    options.standardParallel2Degrees ?? ALBERS_STANDARD_PARALLEL_2,
    'Albers equal-area standardParallel2Degrees'
  );
  const maxWorldLongitude = normalizePositiveFiniteNumber(
    options.maxWorldLongitude ?? ALBERS_MAX_WORLD_LONGITUDE,
    'Albers equal-area maxWorldLongitude'
  );
  const maxWorldLatitude = normalizePositiveFiniteNumber(
    options.maxWorldLatitude ?? ALBERS_MAX_WORLD_LATITUDE,
    'Albers equal-area maxWorldLatitude'
  );

  const centralMeridianRadians = degreesToRadians(centralMeridianDegrees);
  const latitudeOfOriginRadians = degreesToRadians(latitudeOfOriginDegrees);
  const standardParallel1Radians = degreesToRadians(standardParallel1Degrees);
  const standardParallel2Radians = degreesToRadians(standardParallel2Degrees);

  const coneConstant = resolveAlbersConeConstant(
    standardParallel1Radians,
    standardParallel2Radians
  );
  const projectionConstant =
    Math.cos(standardParallel1Radians) ** 2 +
    2 * coneConstant * Math.sin(standardParallel1Radians);
  const originRadius = resolveAlbersRadius(
    projectionConstant,
    coneConstant,
    latitudeOfOriginRadians
  );

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
    const radius = resolveAlbersRadius(
      projectionConstant,
      coneConstant,
      latitudeRadians
    );
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
    id: options.id ?? 'albers-equal-area-conic',
    label: options.label ?? 'Albers Equal-Area Conic',
    distortion: 'equal-area',
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
      const radius =
        Math.sign(coneConstant || 1) *
        Math.hypot(projectedX, originRadius - projectedY);
      const theta = Math.atan2(projectedX, originRadius - projectedY);
      const latitudeTerm =
        (projectionConstant - (radius * coneConstant) ** 2) /
        (2 * coneConstant);
      return {
        worldX:
          radiansToDegrees(theta / coneConstant + centralMeridianRadians),
        worldY: radiansToDegrees(Math.asin(clamp(latitudeTerm, -1, 1))),
      };
    },
  });
}

export function createAzimuthalMapProjectionPlugin(
  options: AzimuthalMapProjectionOptions = {}
): MapProjectionPlugin {
  const centerLongitudeDegrees = normalizeFiniteNumber(
    options.centerLongitudeDegrees ?? AZIMUTHAL_CENTER_LONGITUDE,
    'Azimuthal centerLongitudeDegrees'
  );
  const centerLatitudeDegrees = normalizeFiniteNumber(
    options.centerLatitudeDegrees ?? AZIMUTHAL_CENTER_LATITUDE,
    'Azimuthal centerLatitudeDegrees'
  );
  const centerLongitudeRadians = degreesToRadians(centerLongitudeDegrees);
  const centerLatitudeRadians = degreesToRadians(centerLatitudeDegrees);
  const sinCenterLatitude = Math.sin(centerLatitudeRadians);
  const cosCenterLatitude = Math.cos(centerLatitudeRadians);

  return createMapProjectionPlugin({
    id: options.id ?? 'azimuthal',
    label: options.label ?? 'Azimuthal',
    distortion: 'equal-area',
    bounds: {
      minWorldX: -180,
      maxWorldX: 180,
      minWorldY: -90,
      maxWorldY: 90,
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
      const longitudeRadians =
        degreesToRadians(normalizeLongitudeDegrees(worldX)) -
        centerLongitudeRadians;
      const latitudeRadians = degreesToRadians(clamp(worldY, -90, 90));
      const sinLatitude = Math.sin(latitudeRadians);
      const cosLatitude = Math.cos(latitudeRadians);
      const cosineCentralAngle =
        sinCenterLatitude * sinLatitude +
        cosCenterLatitude * cosLatitude * Math.cos(longitudeRadians);
      const clampedCosineCentralAngle = clamp(cosineCentralAngle, -1, 1);
      const scale = Math.sqrt(2 / (1 + clampedCosineCentralAngle));
      const projectedX =
        scale * cosLatitude * Math.sin(longitudeRadians);
      const projectedY =
        scale *
        (cosCenterLatitude * sinLatitude -
          sinCenterLatitude * cosLatitude * Math.cos(longitudeRadians));
      return {
        mapX: snapNearZero(projectedX / AZIMUTHAL_MAX_PROJECTED_RADIUS),
        mapY: snapNearZero(projectedY / AZIMUTHAL_MAX_PROJECTED_RADIUS),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * AZIMUTHAL_MAX_PROJECTED_RADIUS;
      const projectedY = mapY * AZIMUTHAL_MAX_PROJECTED_RADIUS;
      const radius = Math.hypot(projectedX, projectedY);
      if (radius <= 1e-12) {
        return {
          worldX: centerLongitudeDegrees,
          worldY: centerLatitudeDegrees,
        };
      }
      const centralAngle = 2 * Math.asin(clamp(radius / 2, -1, 1));
      const sinCentralAngle = Math.sin(centralAngle);
      const cosCentralAngle = Math.cos(centralAngle);
      const latitudeRadians = Math.asin(
        clamp(
          cosCentralAngle * sinCenterLatitude +
            (projectedY * sinCentralAngle * cosCenterLatitude) / radius,
          -1,
          1
        )
      );
      const longitudeRadians =
        centerLongitudeRadians +
        Math.atan2(
          projectedX * sinCentralAngle,
          radius * cosCenterLatitude * cosCentralAngle -
            projectedY * sinCenterLatitude * sinCentralAngle
        );
      return {
        worldX: normalizeLongitudeDegrees(radiansToDegrees(longitudeRadians)),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createAzimuthalEquidistantMapProjectionPlugin(
  options: AzimuthalMapProjectionOptions = {}
): MapProjectionPlugin {
  const centerLongitudeDegrees = normalizeFiniteNumber(
    options.centerLongitudeDegrees ?? AZIMUTHAL_EQUIDISTANT_CENTER_LONGITUDE,
    'Azimuthal equidistant centerLongitudeDegrees'
  );
  const centerLatitudeDegrees = normalizeFiniteNumber(
    options.centerLatitudeDegrees ?? AZIMUTHAL_EQUIDISTANT_CENTER_LATITUDE,
    'Azimuthal equidistant centerLatitudeDegrees'
  );
  const centerLongitudeRadians = degreesToRadians(centerLongitudeDegrees);
  const centerLatitudeRadians = degreesToRadians(centerLatitudeDegrees);
  const sinCenterLatitude = Math.sin(centerLatitudeRadians);
  const cosCenterLatitude = Math.cos(centerLatitudeRadians);

  return createMapProjectionPlugin({
    id: options.id ?? 'azimuthal-equidistant',
    label: options.label ?? 'Azimuthal Equidistant',
    distortion: 'equidistant',
    bounds: {
      minWorldX: -180,
      maxWorldX: 180,
      minWorldY: -90,
      maxWorldY: 90,
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
      const longitudeRadians =
        degreesToRadians(normalizeLongitudeDegrees(worldX)) -
        centerLongitudeRadians;
      const latitudeRadians = degreesToRadians(clamp(worldY, -90, 90));
      const sinLatitude = Math.sin(latitudeRadians);
      const cosLatitude = Math.cos(latitudeRadians);
      const cosineCentralAngle =
        sinCenterLatitude * sinLatitude +
        cosCenterLatitude * cosLatitude * Math.cos(longitudeRadians);
      const centralAngle = Math.acos(clamp(cosineCentralAngle, -1, 1));
      const scale =
        Math.abs(centralAngle) <= 1e-12
          ? 1
          : centralAngle / Math.sin(centralAngle);
      const projectedX =
        scale * cosLatitude * Math.sin(longitudeRadians);
      const projectedY =
        scale *
        (cosCenterLatitude * sinLatitude -
          sinCenterLatitude * cosLatitude * Math.cos(longitudeRadians));
      return {
        mapX: snapNearZero(
          projectedX / AZIMUTHAL_EQUIDISTANT_MAX_PROJECTED_RADIUS
        ),
        mapY: snapNearZero(
          projectedY / AZIMUTHAL_EQUIDISTANT_MAX_PROJECTED_RADIUS
        ),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * AZIMUTHAL_EQUIDISTANT_MAX_PROJECTED_RADIUS;
      const projectedY = mapY * AZIMUTHAL_EQUIDISTANT_MAX_PROJECTED_RADIUS;
      const radius = Math.hypot(projectedX, projectedY);
      if (radius <= 1e-12) {
        return {
          worldX: centerLongitudeDegrees,
          worldY: centerLatitudeDegrees,
        };
      }
      const centralAngle = clamp(radius, 0, Math.PI);
      const sinCentralAngle = Math.sin(centralAngle);
      const cosCentralAngle = Math.cos(centralAngle);
      const latitudeRadians = Math.asin(
        clamp(
          cosCentralAngle * sinCenterLatitude +
            (projectedY * sinCentralAngle * cosCenterLatitude) / radius,
          -1,
          1
        )
      );
      const longitudeRadians =
        centerLongitudeRadians +
        Math.atan2(
          projectedX * sinCentralAngle,
          radius * cosCenterLatitude * cosCentralAngle -
            projectedY * sinCenterLatitude * sinCentralAngle
        );
      return {
        worldX: normalizeLongitudeDegrees(radiansToDegrees(longitudeRadians)),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createStereographicMapProjectionPlugin(
  options: AzimuthalMapProjectionOptions = {}
): MapProjectionPlugin {
  const centerLongitudeDegrees = normalizeFiniteNumber(
    options.centerLongitudeDegrees ?? STEREOGRAPHIC_CENTER_LONGITUDE,
    'Stereographic centerLongitudeDegrees'
  );
  const centerLatitudeDegrees = normalizeFiniteNumber(
    options.centerLatitudeDegrees ?? STEREOGRAPHIC_CENTER_LATITUDE,
    'Stereographic centerLatitudeDegrees'
  );
  const centerLongitudeRadians = degreesToRadians(centerLongitudeDegrees);
  const centerLatitudeRadians = degreesToRadians(centerLatitudeDegrees);
  const sinCenterLatitude = Math.sin(centerLatitudeRadians);
  const cosCenterLatitude = Math.cos(centerLatitudeRadians);
  const maxCentralAngleRadians = degreesToRadians(
    STEREOGRAPHIC_MAX_CENTRAL_ANGLE_DEGREES
  );

  return createMapProjectionPlugin({
    id: options.id ?? 'stereographic',
    label: options.label ?? 'Stereographic',
    distortion: 'conformal',
    bounds: {
      minWorldX: -180,
      maxWorldX: 180,
      minWorldY: -90,
      maxWorldY: 90,
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
      const longitudeRadians =
        degreesToRadians(normalizeLongitudeDegrees(worldX)) -
        centerLongitudeRadians;
      const latitudeRadians = degreesToRadians(clamp(worldY, -90, 90));
      const sinLatitude = Math.sin(latitudeRadians);
      const cosLatitude = Math.cos(latitudeRadians);
      const cosineCentralAngle = clamp(
        sinCenterLatitude * sinLatitude +
          cosCenterLatitude * cosLatitude * Math.cos(longitudeRadians),
        -1,
        1
      );
      const centralAngle = Math.min(
        Math.acos(cosineCentralAngle),
        maxCentralAngleRadians
      );
      const scale = 2 * Math.tan(centralAngle / 2);
      const directionScale =
        Math.abs(1 - cosineCentralAngle) <= 1e-12
          ? 1
          : scale / Math.sqrt(Math.max(1e-12, 1 - cosineCentralAngle ** 2));
      const projectedX =
        directionScale * cosLatitude * Math.sin(longitudeRadians);
      const projectedY =
        directionScale *
        (cosCenterLatitude * sinLatitude -
          sinCenterLatitude * cosLatitude * Math.cos(longitudeRadians));
      return {
        mapX: snapNearZero(projectedX / STEREOGRAPHIC_MAX_PROJECTED_RADIUS),
        mapY: snapNearZero(projectedY / STEREOGRAPHIC_MAX_PROJECTED_RADIUS),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * STEREOGRAPHIC_MAX_PROJECTED_RADIUS;
      const projectedY = mapY * STEREOGRAPHIC_MAX_PROJECTED_RADIUS;
      const radius = Math.hypot(projectedX, projectedY);
      if (radius <= 1e-12) {
        return {
          worldX: centerLongitudeDegrees,
          worldY: centerLatitudeDegrees,
        };
      }
      const centralAngle = 2 * Math.atan(radius / 2);
      const sinCentralAngle = Math.sin(centralAngle);
      const cosCentralAngle = Math.cos(centralAngle);
      const latitudeRadians = Math.asin(
        clamp(
          cosCentralAngle * sinCenterLatitude +
            (projectedY * sinCentralAngle * cosCenterLatitude) / radius,
          -1,
          1
        )
      );
      const longitudeRadians =
        centerLongitudeRadians +
        Math.atan2(
          projectedX * sinCentralAngle,
          radius * cosCenterLatitude * cosCentralAngle -
            projectedY * sinCenterLatitude * sinCentralAngle
        );
      return {
        worldX: normalizeLongitudeDegrees(radiansToDegrees(longitudeRadians)),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createOrthographicMapProjectionPlugin(
  options: AzimuthalMapProjectionOptions = {}
): MapProjectionPlugin {
  const centerLongitudeDegrees = normalizeFiniteNumber(
    options.centerLongitudeDegrees ?? ORTHOGRAPHIC_CENTER_LONGITUDE,
    'Orthographic centerLongitudeDegrees'
  );
  const centerLatitudeDegrees = normalizeFiniteNumber(
    options.centerLatitudeDegrees ?? ORTHOGRAPHIC_CENTER_LATITUDE,
    'Orthographic centerLatitudeDegrees'
  );
  const centerLongitudeRadians = degreesToRadians(centerLongitudeDegrees);
  const centerLatitudeRadians = degreesToRadians(centerLatitudeDegrees);
  const sinCenterLatitude = Math.sin(centerLatitudeRadians);
  const cosCenterLatitude = Math.cos(centerLatitudeRadians);

  return createMapProjectionPlugin({
    id: options.id ?? 'orthographic',
    label: options.label ?? 'Orthographic',
    distortion: 'perspective',
    bounds: {
      minWorldX: -180,
      maxWorldX: 180,
      minWorldY: -90,
      maxWorldY: 90,
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
      const longitudeRadians =
        degreesToRadians(normalizeLongitudeDegrees(worldX)) -
        centerLongitudeRadians;
      const latitudeRadians = degreesToRadians(clamp(worldY, -90, 90));
      const sinLatitude = Math.sin(latitudeRadians);
      const cosLatitude = Math.cos(latitudeRadians);
      const cosineCentralAngle =
        sinCenterLatitude * sinLatitude +
        cosCenterLatitude * cosLatitude * Math.cos(longitudeRadians);
      const projectedX = cosLatitude * Math.sin(longitudeRadians);
      const projectedY =
        cosCenterLatitude * sinLatitude -
        sinCenterLatitude * cosLatitude * Math.cos(longitudeRadians);
      if (cosineCentralAngle >= 0) {
        return {
          mapX: snapNearZero(projectedX / ORTHOGRAPHIC_MAX_PROJECTED_RADIUS),
          mapY: snapNearZero(projectedY / ORTHOGRAPHIC_MAX_PROJECTED_RADIUS),
        };
      }
      const radius = Math.hypot(projectedX, projectedY);
      const horizonScale = radius <= 1e-12 ? 0 : 1 / radius;
      return {
        mapX: snapNearZero(
          (projectedX * horizonScale) / ORTHOGRAPHIC_MAX_PROJECTED_RADIUS
        ),
        mapY: snapNearZero(
          (projectedY * horizonScale) / ORTHOGRAPHIC_MAX_PROJECTED_RADIUS
        ),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * ORTHOGRAPHIC_MAX_PROJECTED_RADIUS;
      const projectedY = mapY * ORTHOGRAPHIC_MAX_PROJECTED_RADIUS;
      const radius = Math.hypot(projectedX, projectedY);
      if (radius > ORTHOGRAPHIC_MAX_PROJECTED_RADIUS + 1e-12) {
        return null;
      }
      const centralAngle = Math.asin(clamp(radius, -1, 1));
      const sinCentralAngle = Math.sin(centralAngle);
      const cosCentralAngle = Math.cos(centralAngle);
      if (radius <= 1e-12) {
        return {
          worldX: centerLongitudeDegrees,
          worldY: centerLatitudeDegrees,
        };
      }
      const latitudeRadians = Math.asin(
        clamp(
          cosCentralAngle * sinCenterLatitude +
            (projectedY * sinCentralAngle * cosCenterLatitude) / radius,
          -1,
          1
        )
      );
      const longitudeRadians =
        centerLongitudeRadians +
        Math.atan2(
          projectedX * sinCentralAngle,
          radius * cosCenterLatitude * cosCentralAngle -
            projectedY * sinCenterLatitude * sinCentralAngle
        );
      return {
        worldX: normalizeLongitudeDegrees(radiansToDegrees(longitudeRadians)),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createSinusoidalMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'sinusoidal',
    label: 'Sinusoidal',
    distortion: 'equal-area',
    bounds: {
      minWorldX: -SINUSOIDAL_MAX_WORLD_LONGITUDE,
      maxWorldX: SINUSOIDAL_MAX_WORLD_LONGITUDE,
      minWorldY: -SINUSOIDAL_MAX_WORLD_LATITUDE,
      maxWorldY: SINUSOIDAL_MAX_WORLD_LATITUDE,
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
        -SINUSOIDAL_MAX_WORLD_LONGITUDE,
        SINUSOIDAL_MAX_WORLD_LONGITUDE
      );
      const clampedLatitude = clamp(
        worldY,
        -SINUSOIDAL_MAX_WORLD_LATITUDE,
        SINUSOIDAL_MAX_WORLD_LATITUDE
      );
      const longitudeRadians = degreesToRadians(clampedLongitude);
      const latitudeRadians = degreesToRadians(clampedLatitude);
      return {
        mapX: snapNearZero(
          (longitudeRadians * Math.cos(latitudeRadians)) /
            SINUSOIDAL_MAX_PROJECTED_X
        ),
        mapY: snapNearZero(latitudeRadians / SINUSOIDAL_MAX_PROJECTED_Y),
      };
    },
    invert({ mapX, mapY }) {
      const latitudeRadians = mapY * SINUSOIDAL_MAX_PROJECTED_Y;
      const cosineLatitude = Math.cos(latitudeRadians);
      const longitudeRadians =
        Math.abs(cosineLatitude) <= 1e-12
          ? 0
          : (mapX * SINUSOIDAL_MAX_PROJECTED_X) / cosineLatitude;
      return {
        worldX: radiansToDegrees(longitudeRadians),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createMollweideMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'mollweide',
    label: 'Mollweide',
    distortion: 'equal-area',
    bounds: {
      minWorldX: -MOLLWEIDE_MAX_WORLD_LONGITUDE,
      maxWorldX: MOLLWEIDE_MAX_WORLD_LONGITUDE,
      minWorldY: -MOLLWEIDE_MAX_WORLD_LATITUDE,
      maxWorldY: MOLLWEIDE_MAX_WORLD_LATITUDE,
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
        -MOLLWEIDE_MAX_WORLD_LONGITUDE,
        MOLLWEIDE_MAX_WORLD_LONGITUDE
      );
      const clampedLatitude = clamp(
        worldY,
        -MOLLWEIDE_MAX_WORLD_LATITUDE,
        MOLLWEIDE_MAX_WORLD_LATITUDE
      );
      const longitudeRadians = degreesToRadians(clampedLongitude);
      const latitudeRadians = degreesToRadians(clampedLatitude);
      const theta = solveMollweideTheta(latitudeRadians);
      return {
        mapX: snapNearZero(
          ((2 * Math.SQRT2) / Math.PI) *
            longitudeRadians *
            Math.cos(theta) /
            MOLLWEIDE_MAX_PROJECTED_X
        ),
        mapY: snapNearZero(
          (Math.SQRT2 * Math.sin(theta)) / MOLLWEIDE_MAX_PROJECTED_Y
        ),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * MOLLWEIDE_MAX_PROJECTED_X;
      const projectedY = mapY * MOLLWEIDE_MAX_PROJECTED_Y;
      const theta = Math.asin(clamp(projectedY / Math.SQRT2, -1, 1));
      const cosineTheta = Math.cos(theta);
      const longitudeRadians =
        Math.abs(cosineTheta) <= 1e-12
          ? 0
          : (Math.PI * projectedX) / (2 * Math.SQRT2 * cosineTheta);
      const latitudeRadians = Math.asin(
        clamp((2 * theta + Math.sin(2 * theta)) / Math.PI, -1, 1)
      );
      return {
        worldX: radiansToDegrees(longitudeRadians),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createEqualEarthMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'equal-earth',
    label: 'Equal Earth',
    distortion: 'equal-area',
    bounds: {
      minWorldX: -EQUAL_EARTH_MAX_WORLD_LONGITUDE,
      maxWorldX: EQUAL_EARTH_MAX_WORLD_LONGITUDE,
      minWorldY: -EQUAL_EARTH_MAX_WORLD_LATITUDE,
      maxWorldY: EQUAL_EARTH_MAX_WORLD_LATITUDE,
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
        -EQUAL_EARTH_MAX_WORLD_LONGITUDE,
        EQUAL_EARTH_MAX_WORLD_LONGITUDE
      );
      const clampedLatitude = clamp(
        worldY,
        -EQUAL_EARTH_MAX_WORLD_LATITUDE,
        EQUAL_EARTH_MAX_WORLD_LATITUDE
      );
      const longitudeRadians = degreesToRadians(clampedLongitude);
      const latitudeRadians = degreesToRadians(clampedLatitude);
      const theta = Math.asin((Math.sqrt(3) / 2) * Math.sin(latitudeRadians));
      const theta2 = theta ** 2;
      const theta6 = theta2 ** 3;
      const denominator =
        3 *
        (EQUAL_EARTH_A1 +
          3 * EQUAL_EARTH_A2 * theta2 +
          theta6 * (7 * EQUAL_EARTH_A3 + 9 * EQUAL_EARTH_A4 * theta2));
      return {
        mapX: snapNearZero(
          ((2 * Math.sqrt(3) * longitudeRadians * Math.cos(theta)) /
            denominator) /
            EQUAL_EARTH_MAX_PROJECTED_X
        ),
        mapY: snapNearZero(
          evaluateEqualEarthY(theta) / EQUAL_EARTH_MAX_PROJECTED_Y
        ),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * EQUAL_EARTH_MAX_PROJECTED_X;
      const projectedY = mapY * EQUAL_EARTH_MAX_PROJECTED_Y;
      const theta = solveEqualEarthTheta(projectedY);
      const theta2 = theta ** 2;
      const theta6 = theta2 ** 3;
      const denominator =
        2 * Math.sqrt(3) * Math.cos(theta);
      const longitudeRadians =
        Math.abs(denominator) <= 1e-12
          ? 0
          : (projectedX *
              3 *
              (EQUAL_EARTH_A1 +
                3 * EQUAL_EARTH_A2 * theta2 +
                theta6 * (7 * EQUAL_EARTH_A3 + 9 * EQUAL_EARTH_A4 * theta2))) /
            denominator;
      const latitudeRadians = Math.asin(
        clamp((2 * Math.sin(theta)) / Math.sqrt(3), -1, 1)
      );
      return {
        worldX: radiansToDegrees(longitudeRadians),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createGoodeHomolosineMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'goode-homolosine',
    label: 'Goode Homolosine',
    distortion: 'equal-area',
    bounds: {
      minWorldX: -GOODE_HOMOLOSINE_MAX_WORLD_LONGITUDE,
      maxWorldX: GOODE_HOMOLOSINE_MAX_WORLD_LONGITUDE,
      minWorldY: -GOODE_HOMOLOSINE_MAX_WORLD_LATITUDE,
      maxWorldY: GOODE_HOMOLOSINE_MAX_WORLD_LATITUDE,
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
        -GOODE_HOMOLOSINE_MAX_WORLD_LONGITUDE,
        GOODE_HOMOLOSINE_MAX_WORLD_LONGITUDE
      );
      const clampedLatitude = clamp(
        worldY,
        -GOODE_HOMOLOSINE_MAX_WORLD_LATITUDE,
        GOODE_HOMOLOSINE_MAX_WORLD_LATITUDE
      );
      const longitudeRadians = degreesToRadians(clampedLongitude);
      const latitudeRadians = degreesToRadians(clampedLatitude);
      if (
        Math.abs(latitudeRadians) <=
        GOODE_HOMOLOSINE_TRANSITION_LATITUDE_RADIANS
      ) {
        return {
          mapX: snapNearZero(
            (longitudeRadians * Math.cos(latitudeRadians)) /
              GOODE_HOMOLOSINE_MAX_PROJECTED_X
          ),
          mapY: snapNearZero(
            latitudeRadians / GOODE_HOMOLOSINE_MAX_PROJECTED_Y
          ),
        };
      }

      const theta = solveMollweideTheta(latitudeRadians);
      const projectedY =
        Math.SQRT2 * Math.sin(theta) -
        Math.sign(latitudeRadians) * GOODE_HOMOLOSINE_MOLLWEIDE_Y_OFFSET;
      return {
        mapX: snapNearZero(
          ((2 * Math.SQRT2) / Math.PI) *
            longitudeRadians *
            Math.cos(theta) /
            GOODE_HOMOLOSINE_MAX_PROJECTED_X
        ),
        mapY: snapNearZero(projectedY / GOODE_HOMOLOSINE_MAX_PROJECTED_Y),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * GOODE_HOMOLOSINE_MAX_PROJECTED_X;
      const projectedY = mapY * GOODE_HOMOLOSINE_MAX_PROJECTED_Y;
      if (
        Math.abs(projectedY) <=
        GOODE_HOMOLOSINE_TRANSITION_LATITUDE_RADIANS
      ) {
        const latitudeRadians = projectedY;
        const cosineLatitude = Math.cos(latitudeRadians);
        const longitudeRadians =
          Math.abs(cosineLatitude) <= 1e-12
            ? 0
            : projectedX / cosineLatitude;
        return {
          worldX: radiansToDegrees(longitudeRadians),
          worldY: radiansToDegrees(latitudeRadians),
        };
      }

      const adjustedProjectedY =
        projectedY +
        Math.sign(projectedY) * GOODE_HOMOLOSINE_MOLLWEIDE_Y_OFFSET;
      const theta = Math.asin(clamp(adjustedProjectedY / Math.SQRT2, -1, 1));
      const cosineTheta = Math.cos(theta);
      const longitudeRadians =
        Math.abs(cosineTheta) <= 1e-12
          ? 0
          : (Math.PI * projectedX) / (2 * Math.SQRT2 * cosineTheta);
      const latitudeRadians = Math.asin(
        clamp((2 * theta + Math.sin(2 * theta)) / Math.PI, -1, 1)
      );
      return {
        worldX: radiansToDegrees(longitudeRadians),
        worldY: radiansToDegrees(latitudeRadians),
      };
    },
  });
}

export function createRobinsonMapProjectionPlugin(): MapProjectionPlugin {
  return createMapProjectionPlugin({
    id: 'robinson',
    label: 'Robinson',
    distortion: 'compromise',
    bounds: {
      minWorldX: -ROBINSON_MAX_WORLD_LONGITUDE,
      maxWorldX: ROBINSON_MAX_WORLD_LONGITUDE,
      minWorldY: -ROBINSON_MAX_WORLD_LATITUDE,
      maxWorldY: ROBINSON_MAX_WORLD_LATITUDE,
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
        -ROBINSON_MAX_WORLD_LONGITUDE,
        ROBINSON_MAX_WORLD_LONGITUDE
      );
      const clampedLatitude = clamp(
        worldY,
        -ROBINSON_MAX_WORLD_LATITUDE,
        ROBINSON_MAX_WORLD_LATITUDE
      );
      const longitudeRadians = degreesToRadians(clampedLongitude);
      const latitudeSign = Math.sign(clampedLatitude) || 1;
      const { x, y } = sampleRobinson(Math.abs(clampedLatitude));
      return {
        mapX: snapNearZero(
          ((0.8487 * x * longitudeRadians) / Math.PI) /
            ROBINSON_MAX_PROJECTED_X
        ),
        mapY: snapNearZero((latitudeSign * 1.3523 * y) / ROBINSON_MAX_PROJECTED_Y),
      };
    },
    invert({ mapX, mapY }) {
      const projectedX = mapX * ROBINSON_MAX_PROJECTED_X;
      const projectedY = mapY * ROBINSON_MAX_PROJECTED_Y;
      const latitudeSign = Math.sign(projectedY) || 1;
      const yNormalized = Math.abs(projectedY) / 1.3523;
      const absoluteLatitude = invertRobinsonLatitude(yNormalized);
      const { x } = sampleRobinson(absoluteLatitude);
      const longitudeRadians =
        Math.abs(x) <= 1e-12 ? 0 : (projectedX * Math.PI) / (0.8487 * x);
      return {
        worldX: radiansToDegrees(longitudeRadians),
        worldY: latitudeSign * absoluteLatitude,
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

function solveMollweideTheta(latitudeRadians: number): number {
  const clampedLatitude = clamp(latitudeRadians, -Math.PI / 2, Math.PI / 2);
  if (Math.abs(Math.abs(clampedLatitude) - Math.PI / 2) <= 1e-12) {
    return Math.sign(clampedLatitude) * (Math.PI / 2);
  }
  let theta = clampedLatitude;
  const target = Math.PI * Math.sin(clampedLatitude);
  for (
    let iteration = 0;
    iteration < MOLLWEIDE_MAX_SOLVER_ITERATIONS;
    iteration += 1
  ) {
    const delta =
      (2 * theta + Math.sin(2 * theta) - target) /
      (2 + 2 * Math.cos(2 * theta));
    theta -= delta;
    if (Math.abs(delta) <= MOLLWEIDE_SOLVER_TOLERANCE) {
      break;
    }
  }
  return clamp(theta, -Math.PI / 2, Math.PI / 2);
}

function evaluateEqualEarthY(theta: number): number {
  const theta2 = theta ** 2;
  return theta * (
    EQUAL_EARTH_A1 +
    theta2 *
      (EQUAL_EARTH_A2 + theta2 ** 2 * (EQUAL_EARTH_A3 + EQUAL_EARTH_A4 * theta2))
  );
}

function solveEqualEarthTheta(projectedY: number): number {
  const maxTheta = Math.PI / 3;
  const clampedProjectedY = clamp(
    projectedY,
    -EQUAL_EARTH_MAX_PROJECTED_Y,
    EQUAL_EARTH_MAX_PROJECTED_Y
  );
  let theta = clampedProjectedY / EQUAL_EARTH_A1;
  for (
    let iteration = 0;
    iteration < EQUAL_EARTH_MAX_SOLVER_ITERATIONS;
    iteration += 1
  ) {
    const theta2 = theta ** 2;
    const theta4 = theta2 ** 2;
    const delta =
      (evaluateEqualEarthY(theta) - clampedProjectedY) /
      (EQUAL_EARTH_A1 +
        3 * EQUAL_EARTH_A2 * theta2 +
        7 * EQUAL_EARTH_A3 * theta4 * theta2 +
        9 * EQUAL_EARTH_A4 * theta4 * theta4);
    theta -= delta;
    if (Math.abs(delta) <= EQUAL_EARTH_SOLVER_TOLERANCE) {
      break;
    }
  }
  return clamp(theta, -maxTheta, maxTheta);
}

function sampleRobinson(absoluteLatitudeDegrees: number): {
  x: number;
  y: number;
} {
  const clampedLatitude = clamp(absoluteLatitudeDegrees, 0, 90);
  const scaledLatitude = clampedLatitude / 5;
  const lowerIndex = Math.floor(scaledLatitude);
  const upperIndex = Math.min(lowerIndex + 1, ROBINSON_X_TABLE.length - 1);
  const fraction = scaledLatitude - lowerIndex;
  return {
    x: interpolate(
      ROBINSON_X_TABLE[lowerIndex] ?? ROBINSON_X_TABLE.at(-1) ?? 1,
      ROBINSON_X_TABLE[upperIndex] ?? ROBINSON_X_TABLE.at(-1) ?? 1,
      fraction
    ),
    y: interpolate(
      ROBINSON_Y_TABLE[lowerIndex] ?? ROBINSON_Y_TABLE.at(-1) ?? 1,
      ROBINSON_Y_TABLE[upperIndex] ?? ROBINSON_Y_TABLE.at(-1) ?? 1,
      fraction
    ),
  };
}

function invertRobinsonLatitude(yNormalized: number): number {
  const clampedY = clamp(yNormalized, 0, 1);
  let lower = 0;
  let upper = 90;
  for (
    let iteration = 0;
    iteration < ROBINSON_MAX_SOLVER_ITERATIONS;
    iteration += 1
  ) {
    const midpoint = (lower + upper) / 2;
    const sampled = sampleRobinson(midpoint).y;
    if (Math.abs(sampled - clampedY) <= ROBINSON_SOLVER_TOLERANCE) {
      return midpoint;
    }
    if (sampled < clampedY) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }
  }
  return (lower + upper) / 2;
}

function interpolate(start: number, end: number, fraction: number): number {
  return start + (end - start) * fraction;
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

function resolveAlbersConeConstant(
  standardParallel1Radians: number,
  standardParallel2Radians: number
): number {
  const difference = Math.abs(
    standardParallel1Radians - standardParallel2Radians
  );
  const coneConstant =
    difference <= 1e-12
      ? Math.sin(standardParallel1Radians)
      : (Math.sin(standardParallel1Radians) +
          Math.sin(standardParallel2Radians)) /
        2;
  if (Math.abs(coneConstant) <= 1e-12) {
    throw new Error(
      'Albers equal-area standard parallels must not cancel the cone constant to zero.'
    );
  }
  return coneConstant;
}

function resolveAlbersRadius(
  projectionConstant: number,
  coneConstant: number,
  latitudeRadians: number
): number {
  return (
    Math.sqrt(
      Math.max(0, projectionConstant - 2 * coneConstant * Math.sin(latitudeRadians))
    ) / coneConstant
  );
}

function normalizeLongitudeDegrees(value: number): number {
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
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
