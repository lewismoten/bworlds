import { describe, expect, it } from 'vitest';
import { createLogicalTileRenderState } from './logical-tile-state.ts';

describe('logical tile state', () => {
  it('creates a logical tile snapshot independent from later floor-content choices', () => {
    const logical = createLogicalTileRenderState({
      tileX: 4,
      tileY: 7,
      tile: {
        kind: 'road',
        surfaceHeight: 0.2,
      },
      definition: {
        name: 'Road',
        color: '#7c5a3a',
        miniColor: '#9a7b54',
        walkable: true,
        wallHeight: 0,
      },
      variant: 2,
      tilePluginOwnerLabel: 'tile-road',
      terrainSurfaceSelection: {
        activeMode: 'shared-splat',
        sharedSplatEligible: true,
        reason: 'shared terrain route surface',
      },
    });

    expect(logical).toEqual({
      tileX: 4,
      tileY: 7,
      tile: {
        kind: 'road',
        surfaceHeight: 0.2,
      },
      kind: 'road',
      definition: {
        name: 'Road',
        color: '#7c5a3a',
        miniColor: '#9a7b54',
        walkable: true,
        wallHeight: 0,
      },
      variant: 2,
      tilePluginOwnerLabel: 'tile-road',
      terrainSurfaceSelection: {
        activeMode: 'shared-splat',
        sharedSplatEligible: true,
        reason: 'shared terrain route surface',
      },
      terrainSurfaceMode: 'shared-splat',
    });
  });

  it('rejects malformed logical tile declarations', () => {
    expect(() =>
      createLogicalTileRenderState({
        tileX: Number.NaN,
        tileY: 0,
        tile: {
          kind: 'plains',
        },
        definition: {
          name: 'Plains',
          color: '#84cc16',
          miniColor: '#84cc16',
          walkable: true,
          wallHeight: 0,
        },
        variant: 0,
        tilePluginOwnerLabel: 'tile-plains',
        terrainSurfaceSelection: {
          activeMode: 'legacy-mesh',
          sharedSplatEligible: false,
          reason: 'legacy floor path',
        },
      })
    ).toThrow('Logical tile tileX must be a finite number.');
  });
});
