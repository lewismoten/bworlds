import { describe, expect, it } from 'vitest';
import { createDepthFlavorRuntimePlugin } from './index.ts';

type DepthTestTile = {
  kind: string;
  note?: string;
};

describe('runtime depth flavor', () => {
  it('adds ancient markings to at least one deterministic floor sample', () => {
    const plugin = createDepthFlavorRuntimePlugin();
    let decorated = null as null | DepthTestTile;

    for (let y = -40; y <= 40 && !decorated; y += 1) {
      for (let x = -40; x <= 40; x += 1) {
        const tile: DepthTestTile = { kind: 'floor' };
        plugin.decorateDepthTile?.({
          context: { id: 'dungeon:test', type: 'dungeon', depth: 3 },
          x,
          y,
          seed: 'spec',
          tile,
        } as any);
        if (tile.note) {
          decorated = tile;
          break;
        }
      }
    }

    expect(decorated?.note).toMatch(/^Depth 3: ancient markings cover the floor\.$/);
  });

  it('does not decorate non-floor tiles', () => {
    const plugin = createDepthFlavorRuntimePlugin();
    const tile: DepthTestTile = { kind: 'wall' };

    plugin.decorateDepthTile?.({
      context: { id: 'dungeon:test', type: 'dungeon', depth: 2 },
      x: 0,
      y: 0,
      seed: 'spec',
      tile,
    } as any);

    expect(tile.note).toBeUndefined();
  });
});
