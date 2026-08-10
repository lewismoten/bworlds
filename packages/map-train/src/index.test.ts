import { describe, expect, it } from 'vitest';
import {
  createTrainMapPlugin,
  getTrainBoardingSpawn,
  resolveTrainCarTypes,
} from './index.ts';

describe('map train', () => {
  it('builds a deterministic multi-car train that players can walk through', () => {
    const plugin = createTrainMapPlugin();
    const context = {
      id: 'train:12:4:0',
      label: 'Copper Lantern Line Service',
      type: 'train',
      depth: 2,
      origin: { x: 12, y: 4 },
      lineName: 'Copper Lantern Line',
      fromStation: 'Copper Lantern Station',
      toStation: 'Frost Junction',
    } as const;
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context,
    });
    if (!map) {
      throw new Error('Expected train map plugin to create a train map.');
    }

    const cars = resolveTrainCarTypes('spec', context);
    const boardingSpawn = getTrainBoardingSpawn('spec', context);
    expect(cars.length).toBeGreaterThanOrEqual(4);
    expect(map.getTile(0, boardingSpawn.y).kind).toBe('interior');
    expect(map.getTile(0, boardingSpawn.y).note).toContain(
      'brass-railed rear platform'
    );
    expect(map.getTile(0, boardingSpawn.y - 5).note).not.toBe(
      map.getTile(0, boardingSpawn.y).note
    );
    expect(map.getTile(0, boardingSpawn.y - 10).kind).toBe('interior');
    expect(map.getExit?.(0, boardingSpawn.y + 1)).toEqual(
      expect.objectContaining({})
    );
  });
});
