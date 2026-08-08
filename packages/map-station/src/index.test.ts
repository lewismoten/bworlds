import { describe, expect, it } from 'vitest';
import {
  createStationMapPlugin,
  findBoardableTrainService,
} from './index.ts';

describe('map station', () => {
  it('creates a station interior with a central hall and exit back outside', () => {
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

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'station',
        note: expect.stringContaining('station hall'),
      })
    );
    expect(map.getTile(0, 4)).toEqual(
      expect.objectContaining({
        kind: 'door',
      })
    );
    expect(map.getExit?.(0, 4)).toEqual(
      expect.objectContaining({
        spawn: { x: 4, y: 9 },
      })
    );
  });

  it('finds only trains that are actually approaching the current station platform', () => {
    expect(
      findBoardableTrainService(
        [
          {
            x: 0,
            y: 0,
            progress: 0.12,
            direction: 'forward',
            lineName: 'Copper Lantern Line',
            from: 'Copper Lantern Station',
            to: 'Frost Junction',
          },
          {
            x: 3,
            y: 2,
            progress: 0.41,
            direction: 'forward',
            lineName: 'Far Line',
            from: 'Elsewhere Depot',
            to: 'Another Terminal',
          },
        ],
        'Copper Lantern Station'
      )
    ).toEqual(
      expect.objectContaining({
        lineName: 'Copper Lantern Line',
      })
    );

    expect(
      findBoardableTrainService(
        [
          {
            x: 0,
            y: 0,
            progress: 0.42,
            direction: 'forward',
            lineName: 'Copper Lantern Line',
            from: 'Copper Lantern Station',
            to: 'Frost Junction',
          },
        ],
        'Copper Lantern Station'
      )
    ).toBeNull();
  });

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
