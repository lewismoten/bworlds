import { describe, expect, it } from 'vitest';

import { resolveAmbientNearbyTerrainInfluence } from './ambient-terrain-influence.ts';

describe('ambient terrain influence', () => {
  it('boosts wet forest ambience when water is nearby', () => {
    const isolated = resolveAmbientNearbyTerrainInfluence({
      kind: 'forest',
      nearbyKinds: [],
    });
    const riverEdge = resolveAmbientNearbyTerrainInfluence({
      kind: 'forest',
      nearbyKinds: ['river'],
    });

    expect(isolated.cadenceMultiplier).toBe(1);
    expect(isolated.volumeMultiplier).toBe(1);
    expect(riverEdge.cadenceMultiplier).toBeLessThan(1);
    expect(riverEdge.volumeMultiplier).toBeGreaterThan(1);
    expect(riverEdge.signatureSuffix).toBe('terrain:river');
  });

  it('stacks distinct neighboring terrain influences deterministically', () => {
    const influenced = resolveAmbientNearbyTerrainInfluence({
      kind: 'swamp',
      nearbyKinds: ['forest', 'river', 'forest'],
    });

    expect(influenced.cadenceMultiplier).toBeCloseTo(0.9016, 4);
    expect(influenced.volumeMultiplier).toBeCloseTo(1.1024, 4);
    expect(influenced.signatureSuffix).toBe('terrain:forest+river');
  });
});
