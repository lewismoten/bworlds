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

  it('gives forks a fairly high chance of getting a sign beside the road', () => {
    const plugin = createSignTilePlugin();
    const classifier = plugin.tiles?.find((tile) => tile.kind === 'sign')
      ?.classifyOverworldTile;

    const tile = classifier?.({
      seed: 'fork-spec',
      x: 10,
      y: 10,
      tile: { kind: 'plains' },
      nearLand: true,
      signChance: 0.986,
      signals: {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.1,
        roadSignal: 0.2,
      },
      sampleTerrainSignals(x, y) {
        if ((x === 10 && (y === 9 || y === 11)) || (y === 10 && x === 11)) {
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
      townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
      bridgeAnchors: [],
      poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
    } as any);

    expect(tile?.kind).toBe('sign');
  });

  it('detects forks when the sign sits beside the approach road', () => {
    const plugin = createSignTilePlugin();
    const classifier = plugin.tiles?.find((tile) => tile.kind === 'sign')
      ?.classifyOverworldTile;

    const tile = classifier?.({
      seed: 'fork-approach-spec',
      x: 9,
      y: 10,
      tile: { kind: 'plains' },
      nearLand: true,
      signChance: 0.99,
      signals: {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.1,
        roadSignal: 0.2,
      },
      sampleTerrainSignals(x, y) {
        if (
          (x === 10 && y === 10) ||
          (x === 10 && (y === 9 || y === 11)) ||
          (x === 11 && y === 10)
        ) {
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
      townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
      bridgeAnchors: [],
      poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
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

  it('allows occasional signs along long roads that point toward nearby poi', () => {
    const plugin = createSignTilePlugin();
    const classifier = plugin.tiles?.find((tile) => tile.kind === 'sign')
      ?.classifyOverworldTile;

    const tile = classifier?.({
      seed: 'long-road-spec',
      x: 30,
      y: 30,
      tile: { kind: 'plains' },
      nearLand: true,
      signChance: 0.998,
      signals: {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.1,
        roadSignal: 0.2,
      },
      sampleTerrainSignals(x, y) {
        if (y === 31 && x >= 24 && x <= 36) {
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
      townAnchors: [{ x: 40, y: 31, name: 'Longford' }],
      bridgeAnchors: [],
      poiAnchors: [{ x: 40, y: 31, type: 'town', name: 'Longford' }],
    } as any);

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'sign',
        note: expect.stringContaining('Longford'),
      })
    );
  });
});
