import { describe, expect, it } from 'vitest';
import {
  findNearestWatercraftLandingPoint,
  findNearestWatercraftLaunchPoint,
  hasNearbyKind,
} from './index.ts';
import type { TileLike } from '@bworlds/plugin-api';

describe('watercraft support', () => {
  it('finds the nearest navigable launch point in deterministic ring order', () => {
    const navigable = new Set(['1:0', '0:2']);

    const launch = findNearestWatercraftLaunchPoint({
      x: 0,
      y: 0,
      sampleTile(sampleX: number, sampleY: number): TileLike {
        return {
          kind: navigable.has(`${sampleX}:${sampleY}`) ? 'river' : 'plains',
        };
      },
      canNavigate({ x: sampleX, y: sampleY }) {
        return navigable.has(`${sampleX}:${sampleY}`);
      },
      searchRadius: 3,
    });

    expect(launch).toEqual({ x: 1, y: 0 });
  });

  it('finds the nearest landing tile that can still relaunch nearby', () => {
    const navigable = new Set(['0:0', '1:0', '2:0']);
    const landable = new Set(['1:1', '2:1']);

    const landing = findNearestWatercraftLandingPoint({
      x: 0,
      y: 0,
      sampleTile(sampleX: number, sampleY: number): TileLike {
        if (navigable.has(`${sampleX}:${sampleY}`)) {
          return { kind: 'river' };
        }
        if (landable.has(`${sampleX}:${sampleY}`)) {
          return { kind: 'shore' };
        }
        return { kind: 'forest' };
      },
      isWalkable(kind) {
        return kind !== 'river';
      },
      canNavigate({ x: sampleX, y: sampleY }) {
        return navigable.has(`${sampleX}:${sampleY}`);
      },
      searchRadius: 3,
      canLandTileKind(kind) {
        return kind === 'shore';
      },
    });

    expect(landing).toEqual({ x: 1, y: 1 });
  });

  it('detects matching nearby kinds without considering the center tile', () => {
    const nearbyWater = hasNearbyKind(
      0,
      0,
      (sampleX, sampleY) =>
        ({
          kind: sampleX === 1 && sampleY === 0 ? 'river' : 'plains',
        }) satisfies TileLike,
      (kind) => kind === 'river'
    );
    const centerOnlyWater = hasNearbyKind(
      0,
      0,
      (sampleX, sampleY) =>
        ({
          kind: sampleX === 0 && sampleY === 0 ? 'river' : 'plains',
        }) satisfies TileLike,
      (kind) => kind === 'river'
    );

    expect(nearbyWater).toBe(true);
    expect(centerOnlyWater).toBe(false);
  });
});
