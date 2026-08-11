import { describe, expect, it } from 'vitest';

import { collectNearbyStationAnchors } from './index.ts';

describe('rail support long-running checks', () => {
  it('deduplicates nearby station anchors that resolve to the same coordinates', () => {
    const anchors = collectNearbyStationAnchors('spec-seed', 0, 0, () => ({
      continent: 0.62,
      elevation: 0.28,
      moisture: 0.44,
      riverSignal: 0.16,
      roadSignal: 0.58,
    }));

    const coordinateKeys = new Set(
      anchors.map((anchor) => `${anchor.x},${anchor.y}`)
    );

    expect(coordinateKeys.size).toBe(anchors.length);
  });
});
