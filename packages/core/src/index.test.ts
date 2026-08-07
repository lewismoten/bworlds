import { describe, expect, it } from 'vitest';
import {
  cardinalFromAngle,
  createPlayer,
  createWorldState,
  hash2D,
  toGps,
  WORLD_TILES_WIDE,
} from './index.ts';

describe('core utilities', () => {
  it('returns deterministic hashes', () => {
    expect(hash2D('seed', 4, 9)).toBe(hash2D('seed', 4, 9));
    expect(hash2D('seed', 4, 9)).not.toBe(hash2D('seed', 4, 10));
  });

  it('maps world coordinates to GPS coordinates', () => {
    expect(toGps(0, 0)).toEqual({ latitude: 0, longitude: 0 });
    expect(toGps(WORLD_TILES_WIDE / 4, 0).longitude).toBeCloseTo(90);
  });

  it('maps angles to cardinals', () => {
    expect(cardinalFromAngle(0)).toBe('E');
    expect(cardinalFromAngle(Math.PI / 2)).toBe('S');
    expect(cardinalFromAngle(Math.PI)).toBe('W');
  });

  it('exposes tile-definition lookup through world state', () => {
    const state = createWorldState({
      generator: {
        getMap() {
          return {
            getTile() {
              return { kind: 'plains' };
            },
            getAction() {
              return null;
            },
            getExit() {
              return null;
            },
          };
        },
      },
      player: createPlayer(),
      resolveTileDefinition(kind) {
        return {
          name: kind === 'plains' ? 'Grassland' : 'Unknown',
          color: '#000000',
          miniColor: '#111111',
          walkable: kind === 'plains',
          wallHeight: 0,
        };
      },
    });

    expect(state.getTileDefinition('plains')).toEqual(
      expect.objectContaining({
        name: 'Grassland',
        walkable: true,
      })
    );
    expect(state.canWalk(0, 0)).toBe(true);
  });
});
