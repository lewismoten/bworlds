import { describe, expect, it } from 'vitest';
import { createSignTilePlugin } from './index.ts';

describe('tile sign', () => {
  it('prefers placing signs beside crossroads', () => {
    const plugin = createSignTilePlugin();
    const classifier = plugin.tiles?.find((tile) => tile.kind === 'sign')
      ?.classifyOverworldTile;

    const tile = classifier?.({
      seed: 'spec',
      x: 1,
      y: 1,
      tile: { kind: 'plains' },
      nearLand: true,
      signChance: 0.999,
      signals: {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.1,
        roadSignal: 0.2,
      },
      sampleTerrainSignals(x, y) {
        if ((x === 1 && (y === 0 || y === 2)) || (y === 1 && (x === 0 || x === 2))) {
          return {
            continent: 0.6,
            elevation: 0.4,
            moisture: 0.5,
            riverSignal: 0.1,
            roadSignal: 0.96,
          };
        }
        return {
          continent: 0.6,
          elevation: 0.4,
          moisture: 0.5,
          riverSignal: 0.1,
          roadSignal: 0.2,
        };
      },
      townAnchors: [{ x: 8, y: 1, name: 'Oakcross' }],
      bridgeAnchors: [],
    } as any);

    expect(tile?.kind).toBe('sign');
  });

  it('keeps roadside signs sparse away from junctions', () => {
    const plugin = createSignTilePlugin();
    const classifier = plugin.tiles?.find((tile) => tile.kind === 'sign')
      ?.classifyOverworldTile;

    const tile = classifier?.({
      seed: 'spec',
      x: 4,
      y: 4,
      tile: { kind: 'plains' },
      nearLand: true,
      signChance: 0.999,
      signals: {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.1,
        roadSignal: 0.2,
      },
      sampleTerrainSignals(x, y) {
        if (y === 4 && (x === 3 || x === 5)) {
          return {
            continent: 0.6,
            elevation: 0.4,
            moisture: 0.5,
            riverSignal: 0.1,
            roadSignal: 0.95,
          };
        }
        return {
          continent: 0.6,
          elevation: 0.4,
          moisture: 0.5,
          riverSignal: 0.1,
          roadSignal: 0.2,
        };
      },
      townAnchors: [{ x: 20, y: 20, name: 'Farwatch' }],
      bridgeAnchors: [],
    } as any);

    expect(tile).toBeNull();
  });
});
