import { describe, expect, it } from 'vitest';
import { createStationMapPlugin } from './index.ts';

describe('map station long suite', () => {
  it('keeps station boarding tiles deterministic after bounded service-cache eviction churn', () => {
    const plugin = createStationMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'station:4:9:0',
        label: 'Copper Lantern Station',
        type: 'station',
        depth: 1,
        origin: { x: 4, y: 9 },
      },
    });

    if (!map) {
      throw new Error('Expected station map plugin to create a station map.');
    }

    const baseline = map.getTile(0, -4, { timeMs: 0 } as never);

    for (let index = 0; index < 320; index += 1) {
      map.getTile(0, -4, { timeMs: index * 30_000 } as never);
    }

    expect(map.getTile(0, -4, { timeMs: 0 } as never)).toEqual(baseline);
  });
});
