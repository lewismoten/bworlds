import { describe, expect, it } from 'vitest';
import {
  createDepthFlavorRuntimePlugin,
  getDepthFlavorContextSeed,
} from './index.ts';

type DepthTestTile = {
  kind: string;
  note?: string;
};

const plugin = createDepthFlavorRuntimePlugin();
type DecorateDepthPayload = Parameters<
  NonNullable<typeof plugin.decorateDepthTile>
>[0];

function createDepthDecoratePayload(
  tile: DepthTestTile,
  overrides: Partial<DecorateDepthPayload> = {}
): DecorateDepthPayload {
  return {
    context: { id: 'dungeon:test', type: 'dungeon', depth: 3 },
    x: 0,
    y: 0,
    seed: 'spec',
    tile,
    ...overrides,
  };
}

describe('runtime depth flavor', () => {
  it('reuses deterministic cached context seeds', () => {
    expect(getDepthFlavorContextSeed(123, 'dungeon:test')).toBe(
      getDepthFlavorContextSeed(123, 'dungeon:test')
    );
    expect(getDepthFlavorContextSeed(123, 'dungeon:test')).not.toBe(
      getDepthFlavorContextSeed(123, 'depth:crypt')
    );
  });

  it('adds ancient markings to at least one deterministic floor sample', () => {
    let decorated = null as null | DepthTestTile;

    for (let y = -40; y <= 40 && !decorated; y += 1) {
      for (let x = -40; x <= 40; x += 1) {
        const tile: DepthTestTile = { kind: 'floor' };
        plugin.decorateDepthTile?.(createDepthDecoratePayload(tile, { x, y }));
        if (tile.note) {
          decorated = tile;
          break;
        }
      }
    }

    expect(decorated?.note).toMatch(
      /^Depth 3: ancient markings cover the floor\.$/
    );
  });

  it('does not decorate non-floor tiles', () => {
    const tile: DepthTestTile = { kind: 'wall' };

    plugin.decorateDepthTile?.(
      createDepthDecoratePayload(tile, {
        context: { id: 'dungeon:test', type: 'dungeon', depth: 2 },
      })
    );

    expect(tile.note).toBeUndefined();
  });
});
