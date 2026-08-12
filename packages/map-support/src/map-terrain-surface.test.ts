import { describe, expect, it } from 'vitest';
import {
  createMapTerrainSurfaceCellBounds,
  createMapTerrainSurfaceFeatureRecord,
  createTerrainSurfaceMapFeatureGeneratorPlugin,
  DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID,
} from './map-terrain-surface.ts';

describe('map terrain surface', () => {
  it('normalizes terrain surface cell bounds', () => {
    expect(
      createMapTerrainSurfaceCellBounds({
        minWorldX: 2,
        maxWorldX: 3,
        minWorldY: 4,
        maxWorldY: 5,
      })
    ).toEqual({
      minWorldX: 2,
      maxWorldX: 3,
      minWorldY: 4,
      maxWorldY: 5,
    });
  });

  it('rejects invalid terrain surface cell bounds', () => {
    expect(() =>
      createMapTerrainSurfaceCellBounds({
        minWorldX: 3,
        maxWorldX: 3,
        minWorldY: 4,
        maxWorldY: 5,
      })
    ).toThrow('Map terrain surface minWorldX 3 must be < maxWorldX 3.');

    expect(() =>
      createMapTerrainSurfaceFeatureRecord({
        sourceWorldObjectId: 'terrain:bad',
        bounds: {
          minWorldX: 0,
          maxWorldX: 1,
          minWorldY: 2,
          maxWorldY: 2,
        },
        surfaceHeight: 0.2,
      })
    ).toThrow('Map terrain surface minWorldY 2 must be < maxWorldY 2.');
  });

  it('creates canonical terrain surface polygon features from shared terrain samples', () => {
    expect(
      createMapTerrainSurfaceFeatureRecord({
        sourceWorldObjectId: 'terrain:1:2',
        bounds: {
          minWorldX: 1,
          maxWorldX: 2,
          minWorldY: 2,
          maxWorldY: 3,
        },
        surfaceHeight: 0.18,
        seaLevel: 0.1,
        surfaceKind: 'plains',
        slopeGrade: 0.04,
        properties: {
          biome: 'grassland',
        },
      })
    ).toEqual({
      id: `${DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID}:terrain:1:2`,
      kind: 'polygon',
      sourceWorldObjectId: 'terrain:1:2',
      layerId: DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID,
      zoomRange: {
        minZoom: 0,
      },
      rings: [
        [
          { worldX: 1, worldY: 2 },
          { worldX: 2, worldY: 2 },
          { worldX: 2, worldY: 3 },
          { worldX: 1, worldY: 3 },
          { worldX: 1, worldY: 2 },
        ],
      ],
      properties: {
        surfaceHeight: 0.18,
        seaLevel: 0.1,
        depthBelowSeaLevel: 0,
        isBelowSeaLevel: false,
        surfaceKind: 'plains',
        slopeGrade: 0.04,
        biome: 'grassland',
      },
    });
  });

  it('creates terrain surface generator plugins with conventional terrain surface layer ids', () => {
    const plugin = createTerrainSurfaceMapFeatureGeneratorPlugin({
      getTerrainSurfaceSamples(request) {
        return [
          {
            sourceWorldObjectId: `terrain:${request.tile.x}:${request.tile.y}`,
            bounds: {
              minWorldX: request.tile.x,
              maxWorldX: request.tile.x + 1,
              minWorldY: request.tile.y,
              maxWorldY: request.tile.y + 1,
            },
            surfaceHeight: 0.12,
            surfaceKind: 'forest',
          },
        ];
      },
    });

    expect(plugin.id).toBe('terrain-surface-map-layer');
    expect(plugin.layerId).toBe(DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID);
    expect(
      plugin.getFeatures({
        worldRevision: 'rev-terrain-1',
        tile: {
          zoom: 4,
          x: 6,
          y: 7,
        },
      })
    ).toMatchObject([
      {
        kind: 'polygon',
        layerId: DEFAULT_MAP_TERRAIN_SURFACE_LAYER_ID,
        properties: {
          surfaceHeight: 0.12,
          surfaceKind: 'forest',
        },
      },
    ]);
  });
});
