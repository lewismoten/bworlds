import { describe, expect, it } from 'vitest';

import {
  createSortedCountSummaryScratch,
  summarizeSortedCountMap,
  summarizeSortedCountMapWithTopLabel,
} from './sorted-count-summary.ts';

describe('sorted count summary', () => {
  it('summarizes count maps in label order with reusable scratch entries', () => {
    const scratch = createSortedCountSummaryScratch();
    const counts = new Map<string, number>([
      ['ShaderMaterial', 2],
      ['BasicMaterial', 1],
    ]);

    expect(summarizeSortedCountMap(counts, scratch)).toBe(
      'BasicMaterial:1, ShaderMaterial:2'
    );
    expect(scratch.entries).toHaveLength(2);
    expect(summarizeSortedCountMap(new Map([['Lambert', 3]]), scratch)).toBe(
      'Lambert:3'
    );
    expect(scratch.entries).toHaveLength(1);
  });

  it('summarizes descending counts and reports the top label', () => {
    const scratch = createSortedCountSummaryScratch();
    const counts = new Map<string, number>([
      ['forest', 3],
      ['town', 5],
      ['cave', 5],
    ]);

    expect(summarizeSortedCountMapWithTopLabel(counts, scratch)).toEqual({
      topCount: 5,
      topLabel: 'cave',
      summary: 'cave:5, town:5, forest:3',
    });
  });
});
