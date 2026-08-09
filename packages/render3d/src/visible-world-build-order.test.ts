import { describe, expect, it } from 'vitest';

import {
  createVisibleWorldBuildOrderScratch,
  fillVisibleWorldTileBuildOrder,
} from './visible-world-build-order.ts';

describe('visible world build order helpers', () => {
  it('reuses the same queue buffer across fills while preserving sorted entries', () => {
    const scratch = createVisibleWorldBuildOrderScratch();

    const first = fillVisibleWorldTileBuildOrder(scratch, {
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 4,
      shouldRenderWorldTile: (tileX, tileY) =>
        !(tileX === -4 && tileY === 0) &&
        Math.hypot(tileX, tileY) <= 4,
    });
    const second = fillVisibleWorldTileBuildOrder(scratch, {
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 2,
      shouldRenderWorldTile: (tileX, tileY) =>
        !(tileX === -2 && tileY === 0) &&
        Math.hypot(tileX, tileY) <= 2,
    });

    expect(second).toBe(first);
    expect(second[0]).toEqual({ key: '0:0', x: 0, y: 0 });
    expect(second.some((entry) => entry.key === '2:0')).toBe(true);
    expect(second.some((entry) => entry.key === '-2:0')).toBe(false);
  });
});
