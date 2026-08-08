import { describe, expect, it, vi } from 'vitest';
import {
  findRandomTileDestination,
  listTileTeleportOptions,
} from './debug-teleport.ts';

describe('debug teleport', () => {
  it('lists selectable tile kinds with readable labels', () => {
    expect(
      listTileTeleportOptions([
        ['river', { name: 'River' }],
        ['plains', { name: 'Plains' }],
        ['unknown', { name: 'Unknown' }],
      ])
    ).toEqual([
      { kind: 'plains', label: 'Plains (plains)' },
      { kind: 'river', label: 'River (river)' },
    ]);
  });

  it('lands directly on a matching walkable tile when possible', () => {
    const random = vi
      .fn<() => number>()
      .mockReturnValueOnce(0.5001)
      .mockReturnValueOnce(0.5001);

    const destination = findRandomTileDestination('forest', {
      sampleOverworld(x, y) {
        return { kind: x === 1 && y === 0 ? 'forest' : 'plains' };
      },
      canLandAt(x, y) {
        return x === 1 && y === 0;
      },
      random,
      maxAttempts: 1,
    });

    expect(destination).toEqual({ x: 1, y: 0 });
  });

  it('finds a nearby landing spot for non-walkable target tiles', () => {
    const random = vi
      .fn<() => number>()
      .mockReturnValueOnce(0.5001)
      .mockReturnValueOnce(0.5001);

    const destination = findRandomTileDestination('ocean', {
      sampleOverworld(x, y) {
        return { kind: x === 1 && y === 0 ? 'ocean' : 'plains' };
      },
      canLandAt(x, y) {
        return x === 2 && y === 0;
      },
      random,
      maxAttempts: 1,
      nearbySearchRadius: 3,
    });

    expect(destination).toEqual({ x: 2, y: 0 });
  });
});
