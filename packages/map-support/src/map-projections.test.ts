import { describe, expect, it } from 'vitest';
import {
  createMapProjectionPlugin,
  createMercatorMapProjectionPlugin,
  createMillerCylindricalMapProjectionPlugin,
  createTransverseMercatorMapProjectionPlugin,
  MILLER_MAX_PROJECTED_Y,
  MILLER_MAX_WORLD_LATITUDE,
  MERCATOR_MAX_WORLD_LATITUDE,
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
});
