import { describe, expect, it } from 'vitest';

import {
  collectMapEntriesInto,
  fillWrappedBatchWindow,
  getWrappedBatchWindow,
} from './reusable-batch-window.ts';

describe('reusable batch window helpers', () => {
  it('collects map entries into a reusable target array', () => {
    const target: Array<[string, number]> = [['stale', -1]];
    const firstMap = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    const secondMap = new Map<string, number>([['c', 3]]);

    expect(collectMapEntriesInto(firstMap.entries(), target)).toBe(target);
    expect(target).toEqual([
      ['a', 1],
      ['b', 2],
    ]);

    expect(collectMapEntriesInto(secondMap.entries(), target)).toBe(target);
    expect(target).toEqual([['c', 3]]);
  });

  it('fills wrapped batch windows without replacing the target array', () => {
    const target = ['stale'];

    const firstBatch = fillWrappedBatchWindow(
      ['a', 'b', 'c', 'd'],
      3,
      3,
      target
    );
    expect(firstBatch.items).toBe(target);
    expect(firstBatch).toEqual({
      items: ['d', 'a', 'b'],
      nextIndex: 2,
    });

    const secondBatch = fillWrappedBatchWindow(['a', 'b'], 0, 0, target);
    expect(secondBatch.items).toBe(target);
    expect(secondBatch).toEqual({
      items: [],
      nextIndex: 0,
    });
  });

  it('still supports one-shot wrapped batches when reuse is not needed', () => {
    expect(getWrappedBatchWindow(['a', 'b', 'c', 'd'], 0, 2)).toEqual({
      items: ['a', 'b'],
      nextIndex: 2,
    });
  });
});
