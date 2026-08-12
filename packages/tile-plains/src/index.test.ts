import { describe, expect, it } from 'vitest';

import { createPlainsTilePlugin } from './index.ts';

function getPlainsTile() {
  const tile = createPlainsTilePlugin().tiles?.find(
    (entry) => entry.kind === 'plains'
  );
  expect(tile).toBeDefined();
  return tile!;
}

function createState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile() {
      return { kind: 'plains' };
    },
    getTileDefinition() {
      return {
        name: 'Plains',
        color: '#7fb069',
        miniColor: '#95c779',
        walkable: true,
        wallHeight: 0,
      };
    },
  };
}

describe('tile plains', () => {
  it('uses the shared renderer floor instead of emitting a duplicate plugin mesh', () => {
    const tile = getPlainsTile();
    const state = createState();

    const fullModel = tile.create3DModel?.({
      three: {} as never,
      state,
      tile: { kind: 'plains' },
      tileX: 4,
      tileY: -3,
      detailLevel: 'full',
    });
    const lowModel = tile.create3DModel?.({
      three: {} as never,
      state,
      tile: { kind: 'plains' },
      tileX: 4,
      tileY: -3,
      detailLevel: 'low',
    });

    expect(fullModel).toBeNull();
    expect(lowModel).toBeNull();
  });
});
