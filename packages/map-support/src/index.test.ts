import { describe, expect, it } from 'vitest';
import type { CreateMapContext } from '@bworlds/plugin-api';
import {
  createChildContext,
  createContextMapPlugin,
  createDecoratedMapTileGetter,
  createDeepenMapAction,
  createEnterMapAction,
  createExitMapAction,
  createMapProjectionPlugin,
  createReturnMapAction,
} from './index.ts';

describe('map support', () => {
  it('creates child contexts relative to a parent context', () => {
    expect(
      createChildContext(
        {
          id: 'town:1:2:0',
          label: 'Town',
          type: 'town',
          depth: 1,
          origin: { x: 1, y: 2 },
        },
        {
          id: 'town:1:2:0:building',
          label: 'Building Interior',
          type: 'building',
        }
      )
    ).toMatchObject({
      type: 'building',
      depth: 2,
      origin: { x: 1, y: 2 },
    });
  });

  it('creates enter actions for child maps', () => {
    expect(
      createEnterMapAction({
        context: {
          id: 'building:test',
          label: 'Building Interior',
          type: 'building',
          depth: 2,
          origin: { x: 5, y: 4 },
        },
        spawn: { x: 0, y: 3 },
      })
    ).toMatchObject({
      type: 'enter',
      context: {
        type: 'building',
      },
      spawn: { x: 0, y: 3 },
    });
  });

  it('creates deepen actions for descending maps', () => {
    expect(
      createDeepenMapAction({
        context: {
          id: 'dungeon:1:2:2',
          label: 'Dungeon B2',
          type: 'dungeon',
          depth: 2,
          origin: { x: 1, y: 2 },
        },
        spawn: { x: 0, y: 5 },
      })
    ).toMatchObject({
      type: 'deepen',
      context: {
        depth: 2,
      },
      spawn: { x: 0, y: 5 },
    });
  });

  it('creates explicit exit actions with spawn coordinates', () => {
    expect(createExitMapAction({ x: 3, y: 9 })).toEqual({
      spawn: { x: 3, y: 9 },
    });
  });

  it('creates implicit return-to-parent exit actions', () => {
    expect(createReturnMapAction()).toEqual({});
  });

  it('creates context-typed map plugins with shared wrapper logic', () => {
    const plugin = createContextMapPlugin({
      name: 'map-town',
      contextType: ['town', 'village'],
      createMap(context, seed) {
        return {
          getTile() {
            return {
              kind: 'town',
              note: `${context.type}:${seed}`,
            };
          },
        };
      },
    });

    const townMap = plugin.createMap?.({
      context: {
        id: 'town:test',
        label: 'Town',
        type: 'town',
        depth: 1,
        origin: { x: 1, y: 2 },
      },
      seed: 'spec',
      plugins: {} as CreateMapContext['plugins'],
    });

    if (!townMap) {
      throw new Error('Expected town map plugin to handle town contexts.');
    }

    expect(townMap.getTile(0, 0)).toEqual({
      kind: 'town',
      note: 'town:spec',
    });

    expect(
      plugin.createMap?.({
        context: {
          id: 'cave:test',
          label: 'Cave',
          type: 'cave',
          depth: 1,
          origin: { x: 1, y: 2 },
        },
        seed: 'spec',
        plugins: {} as CreateMapContext['plugins'],
      })
    ).toBeNull();
  });

  it('creates decorated map tile getters with shared context and seed plumbing', () => {
    const getTile = createDecoratedMapTileGetter({
      context: {
        id: 'town:test',
        label: 'Town',
        type: 'town',
        depth: 1,
        origin: { x: 1, y: 2 },
      },
      seed: 'spec',
      resolveTile(x, y) {
        return {
          kind: x === 0 && y === 0 ? 'road' : 'plains',
        };
      },
      decorateTile({ context, seed, x, y, tile }) {
        return {
          ...tile,
          note: `${context.type}:${seed}:${x}:${y}`,
        };
      },
    });

    expect(getTile(0, 0)).toEqual({
      kind: 'road',
      note: 'town:spec:0:0',
    });
    expect(getTile(1, 2)).toEqual({
      kind: 'plains',
      note: 'town:spec:1:2',
    });
  });

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
});
