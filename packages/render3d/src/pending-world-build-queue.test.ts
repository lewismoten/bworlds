import { describe, expect, it } from 'vitest';

import {
  buildPendingWorldBuildQueue,
  createPendingWorldBuildQueueScratch,
  fillPendingWorldBuildQueue,
  reconcilePendingWorldBuildQueue,
  reconcilePendingWorldBuildQueueWithScratch,
} from './pending-world-build-queue.ts';

describe('pending world build queue helpers', () => {
  it('rebuilds the pending world-build queue without visible or duplicate tile requests', () => {
    expect(
      buildPendingWorldBuildQueue(
        [
          { key: '0:0', x: 0, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '2:0', x: 2, y: 0 },
          { key: '0:0', x: 0, y: 0 },
        ],
        new Set(['0:0'])
      )
    ).toEqual([
      { key: '1:0', x: 1, y: 0 },
      { key: '2:0', x: 2, y: 0 },
    ]);
  });

  it('cancels stale pending world-build entries when visibility priorities change', () => {
    expect(
      reconcilePendingWorldBuildQueue(
        [
          { key: '0:0', x: 0, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '2:0', x: 2, y: 0 },
        ],
        new Set(['0:0']),
        [
          { key: '0:0', x: 0, y: 0 },
          { key: '-4:0', x: -4, y: 0 },
          { key: '-3:1', x: -3, y: 1 },
          { key: '2:0', x: 2, y: 0 },
        ]
      )
    ).toEqual({
      queue: [
        { key: '1:0', x: 1, y: 0 },
        { key: '2:0', x: 2, y: 0 },
      ],
      cancelledEntryCount: 2,
    });
  });

  it('reuses scratch sets and queue arrays across reconciliations', () => {
    const scratch = createPendingWorldBuildQueueScratch();
    const visibleTileKeys = new Set(['0:0']);

    const firstQueue = fillPendingWorldBuildQueue(
      [
        { key: '0:0', x: 0, y: 0 },
        { key: '1:0', x: 1, y: 0 },
        { key: '2:0', x: 2, y: 0 },
      ],
      visibleTileKeys,
      scratch
    );
    const firstResult = reconcilePendingWorldBuildQueueWithScratch(
      [
        { key: '0:0', x: 0, y: 0 },
        { key: '1:0', x: 1, y: 0 },
        { key: '3:0', x: 3, y: 0 },
      ],
      visibleTileKeys,
      [{ key: '2:0', x: 2, y: 0 }],
      scratch
    );

    expect(firstResult.queue).toBe(firstQueue);
    expect(firstResult.queue).toEqual([
      { key: '1:0', x: 1, y: 0 },
      { key: '3:0', x: 3, y: 0 },
    ]);
    expect(firstResult.cancelledEntryCount).toBe(1);
    expect(scratch.queuedKeys.size).toBe(2);
    expect(scratch.survivingKeys.size).toBe(2);
    expect(scratch.countedCancelledKeys.size).toBe(1);
  });
});
