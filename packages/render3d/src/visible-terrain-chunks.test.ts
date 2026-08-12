import { describe, expect, it } from 'vitest';

import { collectVisibleTerrainChunks } from './visible-terrain-chunks.ts';

describe('visible terrain chunks', () => {
  it('groups visible shared-floor cells into stable terrain chunks', () => {
    expect(
      collectVisibleTerrainChunks([
        {
          tile: { kind: 'forest' },
          tileX: 3,
          tileY: 5,
          tilePluginOwnerLabel: 'tile-forest',
          terrainSurfaceMode: 'legacy-mesh',
          sharedFloorInstance: {
            kind: 'forest',
            variant: 0,
            tileX: 3,
            tileY: 5,
            surfaceHeight: 0.3,
            thickness: 0.03,
            surfaceBlendSignature: 'forest:forest:forest:plains:plains',
          },
        },
        {
          tile: { kind: 'road' },
          tileX: 15,
          tileY: 15,
          tilePluginOwnerLabel: 'tile-route',
          terrainSurfaceMode: 'shared-splat',
          sharedFloorInstance: {
            kind: 'road',
            variant: 0,
            tileX: 15,
            tileY: 15,
            surfaceHeight: 0.25,
            thickness: 0.03,
            surfaceBlendSignature: 'road:plains:plains:plains:plains',
          },
        },
        {
          tile: { kind: 'shore' },
          tileX: 16,
          tileY: 15,
          tilePluginOwnerLabel: 'tile-water',
          terrainSurfaceMode: 'legacy-mesh',
          sharedFloorInstance: {
            kind: 'shore',
            variant: 1,
            tileX: 16,
            tileY: 15,
            surfaceHeight: 0.15,
            thickness: 0.03,
            surfaceBlendSignature: 'shore:ocean:shore:shore:plains',
          },
        },
        {
          tile: { kind: 'river' },
          tileX: 16,
          tileY: 16,
          tilePluginOwnerLabel: 'tile-water',
          terrainSurfaceMode: 'legacy-mesh',
          sharedFloorInstance: null,
        },
      ])
    ).toEqual([
      {
        key: '0:0',
        chunkX: 0,
        chunkY: 0,
        bounds: {
          minX: 0,
          minY: 0,
          maxX: 15,
          maxY: 15,
        },
        cells: [
          {
            tileX: 3,
            tileY: 5,
            tileKind: 'forest',
            floorKind: 'forest',
            tilePluginOwnerLabel: 'tile-forest',
            terrainSurfaceMode: 'legacy-mesh',
            variant: 0,
            surfaceHeight: 0.3,
            thickness: 0.03,
            surfaceBlendSignature: 'forest:forest:forest:plains:plains',
          },
          {
            tileX: 15,
            tileY: 15,
            tileKind: 'road',
            floorKind: 'road',
            tilePluginOwnerLabel: 'tile-route',
            terrainSurfaceMode: 'shared-splat',
            variant: 0,
            surfaceHeight: 0.25,
            thickness: 0.03,
            surfaceBlendSignature: 'road:plains:plains:plains:plains',
          },
        ],
        floorKinds: ['forest', 'road'],
        tilePluginOwnerLabels: ['tile-forest', 'tile-route'],
      },
      {
        key: '1:0',
        chunkX: 1,
        chunkY: 0,
        bounds: {
          minX: 16,
          minY: 0,
          maxX: 31,
          maxY: 15,
        },
        cells: [
          {
            tileX: 16,
            tileY: 15,
            tileKind: 'shore',
            floorKind: 'shore',
            tilePluginOwnerLabel: 'tile-water',
            terrainSurfaceMode: 'legacy-mesh',
            variant: 1,
            surfaceHeight: 0.15,
            thickness: 0.03,
            surfaceBlendSignature: 'shore:ocean:shore:shore:plains',
          },
        ],
        floorKinds: ['shore'],
        tilePluginOwnerLabels: ['tile-water'],
      },
    ]);
  });

  it('keeps negative world cells aligned to the same terrain chunk contract', () => {
    expect(
      collectVisibleTerrainChunks([
        {
          tile: { kind: 'plains' },
          tileX: -1,
          tileY: -1,
          tilePluginOwnerLabel: 'tile-plains',
          terrainSurfaceMode: 'legacy-mesh',
          sharedFloorInstance: {
            kind: 'plains',
            variant: 0,
            tileX: -1,
            tileY: -1,
            surfaceHeight: 0.2,
            thickness: 0.03,
            surfaceBlendSignature: 'plains:plains:plains:plains:plains',
          },
        },
        {
          tile: { kind: 'forest' },
          tileX: -16,
          tileY: -8,
          tilePluginOwnerLabel: 'tile-forest',
          terrainSurfaceMode: 'legacy-mesh',
          sharedFloorInstance: {
            kind: 'forest',
            variant: 0,
            tileX: -16,
            tileY: -8,
            surfaceHeight: 0.28,
            thickness: 0.03,
            surfaceBlendSignature: 'forest:forest:forest:forest:plains',
          },
        },
        {
          tile: { kind: 'shore' },
          tileX: -17,
          tileY: -8,
          tilePluginOwnerLabel: 'tile-water',
          terrainSurfaceMode: 'legacy-mesh',
          sharedFloorInstance: {
            kind: 'shore',
            variant: 0,
            tileX: -17,
            tileY: -8,
            surfaceHeight: 0.12,
            thickness: 0.03,
            surfaceBlendSignature: 'shore:ocean:shore:shore:plains',
          },
        },
      ])
    ).toEqual([
      {
        key: '-2:-1',
        chunkX: -2,
        chunkY: -1,
        bounds: {
          minX: -32,
          minY: -16,
          maxX: -17,
          maxY: -1,
        },
        cells: [
          {
            tileX: -17,
            tileY: -8,
            tileKind: 'shore',
            floorKind: 'shore',
            tilePluginOwnerLabel: 'tile-water',
            terrainSurfaceMode: 'legacy-mesh',
            variant: 0,
            surfaceHeight: 0.12,
            thickness: 0.03,
            surfaceBlendSignature: 'shore:ocean:shore:shore:plains',
          },
        ],
        floorKinds: ['shore'],
        tilePluginOwnerLabels: ['tile-water'],
      },
      {
        key: '-1:-1',
        chunkX: -1,
        chunkY: -1,
        bounds: {
          minX: -16,
          minY: -16,
          maxX: -1,
          maxY: -1,
        },
        cells: [
          {
            tileX: -16,
            tileY: -8,
            tileKind: 'forest',
            floorKind: 'forest',
            tilePluginOwnerLabel: 'tile-forest',
            terrainSurfaceMode: 'legacy-mesh',
            variant: 0,
            surfaceHeight: 0.28,
            thickness: 0.03,
            surfaceBlendSignature: 'forest:forest:forest:forest:plains',
          },
          {
            tileX: -1,
            tileY: -1,
            tileKind: 'plains',
            floorKind: 'plains',
            tilePluginOwnerLabel: 'tile-plains',
            terrainSurfaceMode: 'legacy-mesh',
            variant: 0,
            surfaceHeight: 0.2,
            thickness: 0.03,
            surfaceBlendSignature: 'plains:plains:plains:plains:plains',
          },
        ],
        floorKinds: ['forest', 'plains'],
        tilePluginOwnerLabels: ['tile-forest', 'tile-plains'],
      },
    ]);
  });
});
