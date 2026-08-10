import { describe, expect, it } from 'vitest';
import {
  buildPlayerPoi,
  canBuildPlayerPoi,
  createPlayerPoiRuntimePlugin,
  parsePlayerPlacedPois,
} from './index.ts';

function createState() {
  return {
    player: { x: 10.2, y: -3.7, facing: 0 },
    stack: [{ id: 'overworld', type: 'overworld', depth: 0 }],
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x = 10, y = -4) {
      if (x === 10 && y === -4) {
        return { kind: 'plains' };
      }
      return { kind: 'forest' };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: kind !== 'ocean' && kind !== 'river',
        wallHeight: 0,
      };
    },
  };
}

describe('runtime player poi', () => {
  it('builds a new player-placed poi onto the current overworld tile', () => {
    const state = createState();

    expect(canBuildPlayerPoi(state as never, 'town')).toBe(true);
    const built = buildPlayerPoi(state as never, 'spec', 'town');

    expect(built).toEqual(
      expect.objectContaining({
        x: 10,
        y: -4,
        kind: 'town',
        poi: expect.objectContaining({
          type: 'town',
          name: expect.any(String),
        }),
      })
    );
    expect(
      (state as { playerPlacedPois?: unknown[] }).playerPlacedPois
    ).toHaveLength(1);
    expect(
      (state as { overworldTileRevision?: number }).overworldTileRevision
    ).toBe(1);
  });

  it('exposes player-placed poi tiles through the runtime plugin overlay', () => {
    const plugin = createPlayerPoiRuntimePlugin();
    const state = createState() as ReturnType<typeof createState> & {
      playerPlacedPois?: unknown[];
    };
    buildPlayerPoi(state as never, 'spec', 'ship');

    const tile = plugin.resolveOverworldTile?.({
      seed: 'spec',
      x: 10,
      y: -4,
      sampleTerrainSignals() {
        return {
          continent: 0.6,
          elevation: 0.2,
          moisture: 0.5,
          riverSignal: 0.1,
          roadSignal: 0.2,
        };
      },
      state: state as never,
    });

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'ship',
        poi: expect.objectContaining({
          type: 'ship',
        }),
      })
    );
  });

  it('parses persisted player-placed poi entries strictly', () => {
    expect(
      parsePlayerPlacedPois([
        {
          x: 1,
          y: 2,
          kind: 'quarry',
          note: 'Fresh-cut stone marks a newly started quarry.',
          poi: { type: 'quarry', name: 'Spec Quarry' },
        },
      ])
    ).toEqual([
      expect.objectContaining({
        kind: 'quarry',
      }),
    ]);
    expect(parsePlayerPlacedPois([{ x: 1 }])).toBeNull();
  });

  it('allows players to build observatories on open overworld tiles', () => {
    const state = createState();

    expect(canBuildPlayerPoi(state as never, 'observatory')).toBe(true);
    const built = buildPlayerPoi(state as never, 'spec', 'observatory');

    expect(built).toEqual(
      expect.objectContaining({
        kind: 'observatory',
        note: 'A newly raised observatory opens its dome to the sky above.',
        poi: expect.objectContaining({
          type: 'observatory',
          name: expect.any(String),
        }),
      })
    );
  });

  it('accepts numeric seeds through the shared hash boundary', () => {
    const state = createState();
    const built = buildPlayerPoi(state as never, 12345, 'town');

    expect(built).toEqual(
      expect.objectContaining({
        poi: expect.objectContaining({
          type: 'town',
          name: expect.any(String),
        }),
      })
    );
  });
});
