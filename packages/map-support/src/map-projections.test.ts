import { describe, expect, it } from 'vitest';
import {
  AZIMUTHAL_CENTER_LATITUDE,
  AZIMUTHAL_CENTER_LONGITUDE,
  AZIMUTHAL_MAX_PROJECTED_RADIUS,
  AZIMUTHAL_EQUIDISTANT_CENTER_LATITUDE,
  AZIMUTHAL_EQUIDISTANT_CENTER_LONGITUDE,
  AZIMUTHAL_EQUIDISTANT_MAX_PROJECTED_RADIUS,
  ALBERS_CENTRAL_MERIDIAN,
  ALBERS_LATITUDE_OF_ORIGIN,
  ALBERS_MAX_WORLD_LATITUDE,
  ALBERS_MAX_WORLD_LONGITUDE,
  ALBERS_STANDARD_PARALLEL_1,
  ALBERS_STANDARD_PARALLEL_2,
  createAzimuthalMapProjectionPlugin,
  createAzimuthalEquidistantMapProjectionPlugin,
  createAlbersEqualAreaConicMapProjectionPlugin,
  createGenericConicMapProjectionPlugin,
  createEqualEarthMapProjectionPlugin,
  createGoodeHomolosineMapProjectionPlugin,
  createMapProjectionPlugin,
  createMercatorMapProjectionPlugin,
  createMillerCylindricalMapProjectionPlugin,
  createMollweideMapProjectionPlugin,
  createOrthographicMapProjectionPlugin,
  createSinusoidalMapProjectionPlugin,
  createStereographicMapProjectionPlugin,
  createTransverseMercatorMapProjectionPlugin,
  GENERIC_CONIC_CENTRAL_MERIDIAN,
  GENERIC_CONIC_LATITUDE_OF_ORIGIN,
  GENERIC_CONIC_MAX_WORLD_LATITUDE,
  GENERIC_CONIC_MAX_WORLD_LONGITUDE,
  GENERIC_CONIC_STANDARD_PARALLEL_1,
  GENERIC_CONIC_STANDARD_PARALLEL_2,
  MILLER_MAX_PROJECTED_Y,
  MILLER_MAX_WORLD_LATITUDE,
  MERCATOR_MAX_WORLD_LATITUDE,
  EQUAL_EARTH_A1,
  EQUAL_EARTH_A2,
  EQUAL_EARTH_A3,
  EQUAL_EARTH_A4,
  EQUAL_EARTH_MAX_PROJECTED_X,
  EQUAL_EARTH_MAX_PROJECTED_Y,
  EQUAL_EARTH_MAX_SOLVER_ITERATIONS,
  EQUAL_EARTH_MAX_WORLD_LATITUDE,
  EQUAL_EARTH_MAX_WORLD_LONGITUDE,
  GOODE_HOMOLOSINE_MAX_PROJECTED_X,
  GOODE_HOMOLOSINE_MAX_PROJECTED_Y,
  GOODE_HOMOLOSINE_MAX_WORLD_LATITUDE,
  GOODE_HOMOLOSINE_MAX_WORLD_LONGITUDE,
  GOODE_HOMOLOSINE_MOLLWEIDE_Y_OFFSET,
  GOODE_HOMOLOSINE_TRANSITION_LATITUDE_DEGREES,
  MOLLWEIDE_MAX_PROJECTED_X,
  MOLLWEIDE_MAX_PROJECTED_Y,
  MOLLWEIDE_MAX_SOLVER_ITERATIONS,
  MOLLWEIDE_MAX_WORLD_LATITUDE,
  MOLLWEIDE_MAX_WORLD_LONGITUDE,
  ORTHOGRAPHIC_CENTER_LATITUDE,
  ORTHOGRAPHIC_CENTER_LONGITUDE,
  ORTHOGRAPHIC_MAX_PROJECTED_RADIUS,
  SINUSOIDAL_MAX_PROJECTED_X,
  SINUSOIDAL_MAX_PROJECTED_Y,
  SINUSOIDAL_MAX_WORLD_LATITUDE,
  SINUSOIDAL_MAX_WORLD_LONGITUDE,
  STEREOGRAPHIC_CENTER_LATITUDE,
  STEREOGRAPHIC_CENTER_LONGITUDE,
  STEREOGRAPHIC_MAX_CENTRAL_ANGLE_DEGREES,
  STEREOGRAPHIC_MAX_PROJECTED_RADIUS,
  TRANSVERSE_MERCATOR_MAX_PROJECTED_X,
  TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE,
  TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE,
} from './map-projections.ts';

describe('map projections', () => {
  it('creates normalized map projection plugins from canonical world coordinates', () => {
    const projection = createMapProjectionPlugin({
      id: ' identity ',
      label: ' Identity ',
      distortion: 'custom',
      wrapping: {
        wrapsWorldX: true,
      },
      bounds: {
        minWorldX: -180,
        maxWorldX: 180,
        minWorldY: -90,
        maxWorldY: 90,
        minMapX: -1,
        maxMapX: 1,
        minMapY: -0.5,
        maxMapY: 0.5,
      },
      project({ worldX, worldY }) {
        return {
          mapX: worldX / 180,
          mapY: worldY / 180,
        };
      },
      invert({ mapX, mapY }) {
        return {
          worldX: mapX * 180,
          worldY: mapY * 180,
        };
      },
    });

    expect(projection.id).toBe('identity');
    expect(projection.label).toBe('Identity');
    expect(projection.distortion).toBe('custom');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: true,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 90, worldY: 45 })).toEqual({
      mapX: 0.5,
      mapY: 0.25,
    });
    expect(projection.invert?.({ mapX: 0.5, mapY: 0.25 })).toEqual({
      worldX: 90,
      worldY: 45,
    });
  });

  it('supports forward-only map projection plugins when inverse projection is unavailable', () => {
    const projection = createMapProjectionPlugin({
      id: 'perspective-globe',
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
      project({ worldX, worldY }) {
        return {
          mapX: worldX / 180,
          mapY: worldY / 90,
        };
      },
    });

    expect(projection.invert).toBeUndefined();
    expect(projection.project({ worldX: -45, worldY: 30 })).toEqual({
      mapX: -0.25,
      mapY: 1 / 3,
    });
  });

  it('rejects invalid map projection declarations and non-finite coordinates', () => {
    expect(() =>
      createMapProjectionPlugin({
        id: ' ',
        distortion: 'custom',
        bounds: {
          minWorldX: -1,
          maxWorldX: 1,
          minWorldY: -1,
          maxWorldY: 1,
          minMapX: -1,
          maxMapX: 1,
          minMapY: -1,
          maxMapY: 1,
        },
        project() {
          return {
            mapX: 0,
            mapY: 0,
          };
        },
      })
    ).toThrow('Map projection plugin id must be a non-empty string.');

    expect(() =>
      createMapProjectionPlugin({
        id: 'broken-bounds',
        distortion: 'custom',
        bounds: {
          minWorldX: 1,
          maxWorldX: -1,
          minWorldY: -1,
          maxWorldY: 1,
          minMapX: -1,
          maxMapX: 1,
          minMapY: -1,
          maxMapY: 1,
        },
        project() {
          return {
            mapX: 0,
            mapY: 0,
          };
        },
      })
    ).toThrow('Map projection bounds minWorldX must be <= maxWorldX.');

    const projection = createMapProjectionPlugin({
      id: 'finite-only',
      distortion: 'custom',
      bounds: {
        minWorldX: -1,
        maxWorldX: 1,
        minWorldY: -1,
        maxWorldY: 1,
        minMapX: -1,
        maxMapX: 1,
        minMapY: -1,
        maxMapY: 1,
      },
      project() {
        return {
          mapX: Number.NaN,
          mapY: 0,
        };
      },
    });

    expect(() =>
      projection.project({ worldX: Number.POSITIVE_INFINITY, worldY: 0 })
    ).toThrow('Map projection worldX must be a finite number.');
    expect(() => projection.project({ worldX: 0, worldY: 0 })).toThrow(
      'Map projection project result mapX must be a finite number.'
    );
  });

  it('projects and inverts Mercator coordinates with latitude clamping', () => {
    const projection = createMercatorMapProjectionPlugin();

    expect(projection.id).toBe('mercator');
    expect(projection.distortion).toBe('conformal');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: true,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const clampedNorth = projection.project({
      worldX: 180,
      worldY: 90,
    });
    expect(clampedNorth.mapX).toBe(1);
    expect(clampedNorth.mapY).toBeCloseTo(1, 10);

    const inverted = projection.invert?.({
      mapX: 0.5,
      mapY: 0.28054992616959007,
    });
    expect(inverted?.worldX).toBeCloseTo(90, 10);
    expect(inverted?.worldY).toBeCloseTo(45, 10);
    expect(MERCATOR_MAX_WORLD_LATITUDE).toBeCloseTo(85.0511287798066, 10);
  });

  it('projects and inverts Miller cylindrical coordinates across the full latitude range', () => {
    const projection = createMillerCylindricalMapProjectionPlugin();

    expect(projection.id).toBe('miller-cylindrical');
    expect(projection.label).toBe('Miller Cylindrical');
    expect(projection.distortion).toBe('compromise');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: true,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const northPole = projection.project({
      worldX: 180,
      worldY: 90,
    });
    expect(northPole.mapX).toBe(1);
    expect(northPole.mapY).toBeCloseTo(1, 10);

    const forward = projection.project({
      worldX: -45,
      worldY: 45,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(-45, 10);
    expect(inverted?.worldY).toBeCloseTo(45, 10);
    expect(MILLER_MAX_WORLD_LATITUDE).toBe(90);
    expect(MILLER_MAX_PROJECTED_Y).toBeGreaterThan(0);
  });

  it('projects and inverts Transverse Mercator coordinates inside its supported longitude window', () => {
    const projection = createTransverseMercatorMapProjectionPlugin();

    expect(projection.id).toBe('transverse-mercator');
    expect(projection.label).toBe('Transverse Mercator');
    expect(projection.distortion).toBe('conformal');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const eastEdge = projection.project({
      worldX: 80,
      worldY: 0,
    });
    expect(eastEdge.mapX).toBeCloseTo(1, 10);

    const forward = projection.project({
      worldX: 30,
      worldY: 45,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(30, 10);
    expect(inverted?.worldY).toBeCloseTo(45, 10);
    expect(TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE).toBe(80);
    expect(TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE).toBe(90);
    expect(TRANSVERSE_MERCATOR_MAX_PROJECTED_X).toBeGreaterThan(0);
  });

  it('projects and inverts generic conic coordinates with the default configuration', () => {
    const projection = createGenericConicMapProjectionPlugin();

    expect(projection.id).toBe('generic-conic');
    expect(projection.label).toBe('Generic Conic');
    expect(projection.distortion).toBe('equidistant');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });

    const forward = projection.project({
      worldX: 20,
      worldY: 35,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(20, 10);
    expect(inverted?.worldY).toBeCloseTo(35, 10);
    expect(GENERIC_CONIC_STANDARD_PARALLEL_1).toBe(20);
    expect(GENERIC_CONIC_STANDARD_PARALLEL_2).toBe(60);
    expect(GENERIC_CONIC_CENTRAL_MERIDIAN).toBe(0);
    expect(GENERIC_CONIC_LATITUDE_OF_ORIGIN).toBe(0);
    expect(GENERIC_CONIC_MAX_WORLD_LONGITUDE).toBe(180);
    expect(GENERIC_CONIC_MAX_WORLD_LATITUDE).toBe(90);
  });

  it('supports custom generic conic configurations with matching inverse projection', () => {
    const projection = createGenericConicMapProjectionPlugin({
      id: 'regional-conic',
      label: 'Regional Conic',
      centralMeridianDegrees: -96,
      latitudeOfOriginDegrees: 23,
      standardParallel1Degrees: 29.5,
      standardParallel2Degrees: 45.5,
      maxWorldLongitude: 60,
      maxWorldLatitude: 75,
    });

    expect(projection.id).toBe('regional-conic');
    expect(projection.label).toBe('Regional Conic');

    const forward = projection.project({
      worldX: -90,
      worldY: 40,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(-90, 10);
    expect(inverted?.worldY).toBeCloseTo(40, 10);
  });

  it('projects and inverts Albers equal-area coordinates with the default configuration', () => {
    const projection = createAlbersEqualAreaConicMapProjectionPlugin();

    expect(projection.id).toBe('albers-equal-area-conic');
    expect(projection.label).toBe('Albers Equal-Area Conic');
    expect(projection.distortion).toBe('equal-area');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });

    const forward = projection.project({
      worldX: -90,
      worldY: 40,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(-90, 10);
    expect(inverted?.worldY).toBeCloseTo(40, 10);
    expect(ALBERS_STANDARD_PARALLEL_1).toBe(29.5);
    expect(ALBERS_STANDARD_PARALLEL_2).toBe(45.5);
    expect(ALBERS_CENTRAL_MERIDIAN).toBe(-96);
    expect(ALBERS_LATITUDE_OF_ORIGIN).toBe(23);
    expect(ALBERS_MAX_WORLD_LONGITUDE).toBe(90);
    expect(ALBERS_MAX_WORLD_LATITUDE).toBe(90);
  });

  it('supports custom Albers equal-area configurations with matching inverse projection', () => {
    const projection = createAlbersEqualAreaConicMapProjectionPlugin({
      id: 'regional-albers',
      label: 'Regional Albers',
      centralMeridianDegrees: 10,
      latitudeOfOriginDegrees: 30,
      standardParallel1Degrees: 20,
      standardParallel2Degrees: 50,
      maxWorldLongitude: 70,
      maxWorldLatitude: 80,
    });

    expect(projection.id).toBe('regional-albers');
    expect(projection.label).toBe('Regional Albers');

    const forward = projection.project({
      worldX: 25,
      worldY: 42,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(25, 10);
    expect(inverted?.worldY).toBeCloseTo(42, 10);
  });

  it('projects and inverts azimuthal coordinates with the default center', () => {
    const projection = createAzimuthalMapProjectionPlugin();

    expect(projection.id).toBe('azimuthal');
    expect(projection.label).toBe('Azimuthal');
    expect(projection.distortion).toBe('equal-area');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const forward = projection.project({
      worldX: 30,
      worldY: 20,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(30, 10);
    expect(inverted?.worldY).toBeCloseTo(20, 10);
    expect(AZIMUTHAL_CENTER_LONGITUDE).toBe(0);
    expect(AZIMUTHAL_CENTER_LATITUDE).toBe(0);
    expect(AZIMUTHAL_MAX_PROJECTED_RADIUS).toBe(2);
  });

  it('supports custom azimuthal centers with matching inverse projection', () => {
    const projection = createAzimuthalMapProjectionPlugin({
      id: 'regional-azimuthal',
      label: 'Regional Azimuthal',
      centerLongitudeDegrees: -100,
      centerLatitudeDegrees: 40,
    });

    expect(projection.id).toBe('regional-azimuthal');
    expect(projection.label).toBe('Regional Azimuthal');

    const forward = projection.project({
      worldX: -80,
      worldY: 30,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(-80, 10);
    expect(inverted?.worldY).toBeCloseTo(30, 10);
  });

  it('projects and inverts azimuthal equidistant coordinates with the default center', () => {
    const projection = createAzimuthalEquidistantMapProjectionPlugin();

    expect(projection.id).toBe('azimuthal-equidistant');
    expect(projection.label).toBe('Azimuthal Equidistant');
    expect(projection.distortion).toBe('equidistant');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const forward = projection.project({
      worldX: 25,
      worldY: 15,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(25, 10);
    expect(inverted?.worldY).toBeCloseTo(15, 10);
    expect(AZIMUTHAL_EQUIDISTANT_CENTER_LONGITUDE).toBe(0);
    expect(AZIMUTHAL_EQUIDISTANT_CENTER_LATITUDE).toBe(0);
    expect(AZIMUTHAL_EQUIDISTANT_MAX_PROJECTED_RADIUS).toBeCloseTo(Math.PI, 10);
  });

  it('supports custom azimuthal equidistant centers with matching inverse projection', () => {
    const projection = createAzimuthalEquidistantMapProjectionPlugin({
      id: 'regional-azimuthal-equidistant',
      label: 'Regional Azimuthal Equidistant',
      centerLongitudeDegrees: 15,
      centerLatitudeDegrees: 35,
    });

    expect(projection.id).toBe('regional-azimuthal-equidistant');
    expect(projection.label).toBe('Regional Azimuthal Equidistant');

    const forward = projection.project({
      worldX: 40,
      worldY: 25,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(40, 10);
    expect(inverted?.worldY).toBeCloseTo(25, 10);
  });

  it('projects and inverts stereographic coordinates with the default center', () => {
    const projection = createStereographicMapProjectionPlugin();

    expect(projection.id).toBe('stereographic');
    expect(projection.label).toBe('Stereographic');
    expect(projection.distortion).toBe('conformal');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const forward = projection.project({
      worldX: 20,
      worldY: 30,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(20, 10);
    expect(inverted?.worldY).toBeCloseTo(30, 10);
    expect(STEREOGRAPHIC_CENTER_LONGITUDE).toBe(0);
    expect(STEREOGRAPHIC_CENTER_LATITUDE).toBe(0);
    expect(STEREOGRAPHIC_MAX_CENTRAL_ANGLE_DEGREES).toBe(179);
    expect(STEREOGRAPHIC_MAX_PROJECTED_RADIUS).toBeGreaterThan(100);
  });

  it('supports custom stereographic centers with matching inverse projection', () => {
    const projection = createStereographicMapProjectionPlugin({
      id: 'regional-stereographic',
      label: 'Regional Stereographic',
      centerLongitudeDegrees: -75,
      centerLatitudeDegrees: 35,
    });

    expect(projection.id).toBe('regional-stereographic');
    expect(projection.label).toBe('Regional Stereographic');

    const forward = projection.project({
      worldX: -60,
      worldY: 40,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(-60, 10);
    expect(inverted?.worldY).toBeCloseTo(40, 10);
  });

  it('projects and inverts orthographic coordinates with the default center', () => {
    const projection = createOrthographicMapProjectionPlugin();

    expect(projection.id).toBe('orthographic');
    expect(projection.label).toBe('Orthographic');
    expect(projection.distortion).toBe('perspective');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const forward = projection.project({
      worldX: 20,
      worldY: 30,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(20, 10);
    expect(inverted?.worldY).toBeCloseTo(30, 10);
    expect(ORTHOGRAPHIC_CENTER_LONGITUDE).toBe(0);
    expect(ORTHOGRAPHIC_CENTER_LATITUDE).toBe(0);
    expect(ORTHOGRAPHIC_MAX_PROJECTED_RADIUS).toBe(1);
  });

  it('clips the hidden orthographic hemisphere to the horizon and rejects inverse points outside the disk', () => {
    const projection = createOrthographicMapProjectionPlugin();

    const hiddenPoint = projection.project({
      worldX: 170,
      worldY: 0,
    });

    expect(Math.hypot(hiddenPoint.mapX, hiddenPoint.mapY)).toBeCloseTo(1, 10);
    expect(projection.invert?.({ mapX: 1.1, mapY: 0 })).toBeNull();
  });

  it('supports custom orthographic centers with matching inverse projection', () => {
    const projection = createOrthographicMapProjectionPlugin({
      id: 'regional-orthographic',
      label: 'Regional Orthographic',
      centerLongitudeDegrees: 15,
      centerLatitudeDegrees: 50,
    });

    expect(projection.id).toBe('regional-orthographic');
    expect(projection.label).toBe('Regional Orthographic');

    const forward = projection.project({
      worldX: 25,
      worldY: 40,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(25, 10);
    expect(inverted?.worldY).toBeCloseTo(40, 10);
  });

  it('projects and inverts sinusoidal coordinates across the full latitude range', () => {
    const projection = createSinusoidalMapProjectionPlugin();

    expect(projection.id).toBe('sinusoidal');
    expect(projection.label).toBe('Sinusoidal');
    expect(projection.distortion).toBe('equal-area');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const forward = projection.project({
      worldX: 45,
      worldY: 30,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(45, 10);
    expect(inverted?.worldY).toBeCloseTo(30, 10);
    expect(SINUSOIDAL_MAX_WORLD_LONGITUDE).toBe(180);
    expect(SINUSOIDAL_MAX_WORLD_LATITUDE).toBe(90);
    expect(SINUSOIDAL_MAX_PROJECTED_X).toBeCloseTo(Math.PI, 10);
    expect(SINUSOIDAL_MAX_PROJECTED_Y).toBeCloseTo(Math.PI / 2, 10);
  });

  it('projects and inverts Mollweide coordinates across the full latitude range', () => {
    const projection = createMollweideMapProjectionPlugin();

    expect(projection.id).toBe('mollweide');
    expect(projection.label).toBe('Mollweide');
    expect(projection.distortion).toBe('equal-area');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const forward = projection.project({
      worldX: 60,
      worldY: 35,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(60, 10);
    expect(inverted?.worldY).toBeCloseTo(35, 10);
    expect(MOLLWEIDE_MAX_WORLD_LONGITUDE).toBe(180);
    expect(MOLLWEIDE_MAX_WORLD_LATITUDE).toBe(90);
    expect(MOLLWEIDE_MAX_PROJECTED_X).toBeCloseTo(2 * Math.SQRT2, 10);
    expect(MOLLWEIDE_MAX_PROJECTED_Y).toBeCloseTo(Math.SQRT2, 10);
    expect(MOLLWEIDE_MAX_SOLVER_ITERATIONS).toBe(12);
  });

  it('projects and inverts Equal Earth coordinates across the full latitude range', () => {
    const projection = createEqualEarthMapProjectionPlugin();

    expect(projection.id).toBe('equal-earth');
    expect(projection.label).toBe('Equal Earth');
    expect(projection.distortion).toBe('equal-area');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const forward = projection.project({
      worldX: 80,
      worldY: 25,
    });
    const inverted = projection.invert?.(forward);
    expect(inverted?.worldX).toBeCloseTo(80, 10);
    expect(inverted?.worldY).toBeCloseTo(25, 10);
    expect(EQUAL_EARTH_MAX_WORLD_LONGITUDE).toBe(180);
    expect(EQUAL_EARTH_MAX_WORLD_LATITUDE).toBe(90);
    expect(EQUAL_EARTH_A1).toBeCloseTo(1.340264, 10);
    expect(EQUAL_EARTH_A2).toBeCloseTo(-0.081106, 10);
    expect(EQUAL_EARTH_A3).toBeCloseTo(0.000893, 10);
    expect(EQUAL_EARTH_A4).toBeCloseTo(0.003796, 10);
    expect(EQUAL_EARTH_MAX_PROJECTED_X).toBeGreaterThan(2.5);
    expect(EQUAL_EARTH_MAX_PROJECTED_Y).toBeGreaterThan(1.2);
    expect(EQUAL_EARTH_MAX_SOLVER_ITERATIONS).toBe(12);
  });

  it('projects and inverts Goode homolosine coordinates across both branch regions', () => {
    const projection = createGoodeHomolosineMapProjectionPlugin();

    expect(projection.id).toBe('goode-homolosine');
    expect(projection.label).toBe('Goode Homolosine');
    expect(projection.distortion).toBe('equal-area');
    expect(projection.wrapping).toEqual({
      wrapsWorldX: false,
      wrapsWorldY: false,
    });
    expect(projection.project({ worldX: 0, worldY: 0 })).toEqual({
      mapX: 0,
      mapY: 0,
    });

    const sinusoidalBranch = projection.project({
      worldX: 30,
      worldY: 20,
    });
    const sinusoidalInverted = projection.invert?.(sinusoidalBranch);
    expect(sinusoidalInverted?.worldX).toBeCloseTo(30, 10);
    expect(sinusoidalInverted?.worldY).toBeCloseTo(20, 10);

    const mollweideBranch = projection.project({
      worldX: 60,
      worldY: 55,
    });
    const mollweideInverted = projection.invert?.(mollweideBranch);
    expect(mollweideInverted?.worldX).toBeCloseTo(60, 10);
    expect(mollweideInverted?.worldY).toBeCloseTo(55, 10);

    expect(GOODE_HOMOLOSINE_MAX_WORLD_LONGITUDE).toBe(180);
    expect(GOODE_HOMOLOSINE_MAX_WORLD_LATITUDE).toBe(90);
    expect(GOODE_HOMOLOSINE_TRANSITION_LATITUDE_DEGREES).toBeCloseTo(
      40.733333333333334,
      10
    );
    expect(GOODE_HOMOLOSINE_MOLLWEIDE_Y_OFFSET).toBeCloseTo(0.0528, 10);
    expect(GOODE_HOMOLOSINE_MAX_PROJECTED_X).toBeCloseTo(2 * Math.SQRT2, 10);
    expect(GOODE_HOMOLOSINE_MAX_PROJECTED_Y).toBeGreaterThan(1.3);
  });
});
