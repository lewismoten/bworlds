import { describe, expect, it } from 'vitest';
import {
  createMapFeatureLineRecord,
  createMapFeaturePointRecord,
  createMapFeaturePolygonRecord,
  createStableMapFeatureId,
  DEFAULT_MAP_FEATURE_MIN_ZOOM,
  isMapFeatureVisibleAtZoom,
} from './map-features.ts';

describe('map features', () => {
  it('creates stable feature ids from layer ids and world object ids', () => {
    expect(
      createStableMapFeatureId({
        sourceWorldObjectId: 'river:main-stem',
        layerId: 'hydrology',
      })
    ).toBe('hydrology:river:main-stem');

    expect(
      createStableMapFeatureId({
        sourceWorldObjectId: 'settlement:oak-harbor',
        layerId: 'human',
        featureKey: 'label',
      })
    ).toBe('human:settlement:oak-harbor:label');
  });

  it('creates canonical point records in world space with default zoom visibility', () => {
    expect(
      createMapFeaturePointRecord({
        sourceWorldObjectId: 'poi:observatory',
        layerId: 'physical',
        coordinate: {
          worldX: 12,
          worldY: -4,
        },
      })
    ).toEqual({
      id: 'physical:poi:observatory',
      kind: 'point',
      sourceWorldObjectId: 'poi:observatory',
      layerId: 'physical',
      zoomRange: {
        minZoom: DEFAULT_MAP_FEATURE_MIN_ZOOM,
      },
      coordinate: {
        worldX: 12,
        worldY: -4,
      },
      properties: {},
    });
  });

  it('creates canonical line records with zoom ranges independent from projection math', () => {
    const feature = createMapFeatureLineRecord({
      sourceWorldObjectId: 'road:spine',
      layerId: 'transport',
      zoomRange: {
        minZoom: 4,
        maxZoom: 9,
      },
      coordinates: [
        { worldX: -10, worldY: 2 },
        { worldX: 0, worldY: 3 },
        { worldX: 15, worldY: 8 },
      ],
      properties: {
        classification: 'arterial',
      },
    });

    expect(feature.kind).toBe('line');
    expect(feature.coordinates).toEqual([
      { worldX: -10, worldY: 2 },
      { worldX: 0, worldY: 3 },
      { worldX: 15, worldY: 8 },
    ]);
    expect(isMapFeatureVisibleAtZoom(feature, 3)).toBe(false);
    expect(isMapFeatureVisibleAtZoom(feature, 4)).toBe(true);
    expect(isMapFeatureVisibleAtZoom(feature, 10)).toBe(false);
  });

  it('creates canonical polygon records and closes open rings', () => {
    const feature = createMapFeaturePolygonRecord({
      sourceWorldObjectId: 'region:highlands',
      layerId: 'political',
      rings: [
        [
          { worldX: 0, worldY: 0 },
          { worldX: 4, worldY: 0 },
          { worldX: 4, worldY: 3 },
          { worldX: 0, worldY: 3 },
        ],
      ],
    });

    expect(feature.kind).toBe('polygon');
    expect(feature.rings).toEqual([
      [
        { worldX: 0, worldY: 0 },
        { worldX: 4, worldY: 0 },
        { worldX: 4, worldY: 3 },
        { worldX: 0, worldY: 3 },
        { worldX: 0, worldY: 0 },
      ],
    ]);
  });

  it('rejects invalid canonical feature declarations', () => {
    expect(() =>
      createMapFeatureLineRecord({
        sourceWorldObjectId: 'road:broken',
        layerId: 'transport',
        coordinates: [{ worldX: 0, worldY: 0 }],
      })
    ).toThrow(
      'Map feature line coordinates must include at least two points.'
    );

    expect(() =>
      createMapFeaturePolygonRecord({
        sourceWorldObjectId: 'region:broken',
        layerId: 'political',
        zoomRange: {
          minZoom: 9,
          maxZoom: 4,
        },
        rings: [
          [
            { worldX: 0, worldY: 0 },
            { worldX: 1, worldY: 0 },
            { worldX: 1, worldY: 1 },
            { worldX: 0, worldY: 0 },
          ],
        ],
      })
    ).toThrow('Map feature minZoom must be <= maxZoom.');
  });
});
