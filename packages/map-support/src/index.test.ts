import { describe, expect, it } from 'vitest';
import type { CreateMapContext } from '@bworlds/plugin-api';
import {
  createChildContext,
  createContextMapPlugin,
  createDeepenMapAction,
  createEnterMapAction,
  createExitMapAction,
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
});
