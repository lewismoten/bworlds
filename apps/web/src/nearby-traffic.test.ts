import { describe, expect, it } from 'vitest';
import { findNearestTrafficProfile } from './nearby-traffic.ts';

describe('nearby traffic', () => {
  it('finds the nearest active train-like traffic tile', () => {
    const profile = findNearestTrafficProfile({
      state: {
        player: { x: 0, y: 0 },
        getCurrentTile(x: number, y: number) {
          if (x === 3 && y === 0) {
            return { train: { x, y, progress: 0.25 } };
          }
          if (x === 1 && y === 1) {
            return { train: { x, y, progress: 0.75 } };
          }
          return { kind: 'plains' };
        },
      },
      centerX: 0,
      centerY: 0,
      searchRadius: 4,
      selectTraffic(tile) {
        return tile.train as
          { x: number; y: number; progress?: number } | undefined;
      },
    });

    expect(profile).toEqual({
      progress: 0.75,
      emitter: { x: 1, y: 1 },
    });
  });

  it('returns null when no matching nearby traffic is active', () => {
    const profile = findNearestTrafficProfile({
      state: {
        player: { x: 0, y: 0 },
        getCurrentTile() {
          return { kind: 'plains' };
        },
      },
      centerX: 0,
      centerY: 0,
      searchRadius: 3,
      selectTraffic(tile) {
        return tile.boat as
          { x: number; y: number; progress?: number } | undefined;
      },
    });

    expect(profile).toBeNull();
  });

  it('can carry extra profile data from the selected traffic source', () => {
    const profile = findNearestTrafficProfile({
      state: {
        player: { x: 0, y: 0 },
        getCurrentTile(x: number, y: number) {
          if (x === 1 && y === 0) {
            return { boat: { x, y, progress: 0.1, whistlePhase: 'departure' } };
          }
          return { kind: 'plains' };
        },
      },
      centerX: 0,
      centerY: 0,
      searchRadius: 2,
      selectTraffic(tile) {
        return tile.boat as
          | {
              x: number;
              y: number;
              progress?: number;
              whistlePhase?: string;
            }
          | undefined;
      },
      mapProfile(traffic) {
        return { whistlePhase: traffic.whistlePhase };
      },
    });

    expect(profile).toEqual({
      progress: 0.1,
      emitter: { x: 1, y: 0 },
      whistlePhase: 'departure',
    });
  });
});
