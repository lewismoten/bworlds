import { describe, expect, it } from 'vitest';
import { createSignTilePlugin } from './index.ts';
import type { OverworldSignals } from '@bworlds/plugin-api';

const plugin = createSignTilePlugin();
const classifier = plugin.tiles?.find((tile) => tile.kind === 'sign')
  ?.classifyOverworldTile;
type SignClassifierPayload = Parameters<NonNullable<typeof classifier>>[0];

function createSignSignals(roadSignal = 0.2): OverworldSignals {
  return {
    continent: 0.6,
    elevation: 0.4,
    moisture: 0.5,
    riverSignal: 0.1,
    roadSignal,
  };
}

function createSignClassifierPayload(
  overrides: Partial<SignClassifierPayload> = {}
): SignClassifierPayload {
  return {
    seed: 'spec',
    x: 1,
    y: 1,
    tile: { kind: 'plains' },
    nearLand: true,
    signChance: 0.999,
    signals: createSignSignals(),
    sampleTerrainSignals() {
      return createSignSignals();
    },
    townAnchors: [{ x: 8, y: 1, name: 'Oakcross' }],
    bridgeAnchors: [],
    ...overrides,
  };
}

describe('tile sign', () => {
  it('prefers placing signs beside crossroads', () => {
    const tile = classifier?.(createSignClassifierPayload({
      sampleTerrainSignals(x, y) {
        if ((x === 1 && (y === 0 || y === 2)) || (y === 1 && (x === 0 || x === 2))) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
    }));

    expect(tile?.kind).toBe('sign');
  });

  it('gives forks a fairly high chance of getting a sign beside the road', () => {
    const tile = classifier?.(createSignClassifierPayload({
      seed: 'fork-spec',
      x: 10,
      y: 10,
      signChance: 0.986,
      sampleTerrainSignals(x, y) {
        if ((x === 10 && (y === 9 || y === 11)) || (y === 10 && x === 11)) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
      poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
    }));

    expect(tile?.kind).toBe('sign');
  });

  it('detects forks when the sign sits beside the approach road', () => {
    const tile = classifier?.(createSignClassifierPayload({
      seed: 'fork-approach-spec',
      x: 9,
      y: 10,
      signChance: 0.99,
      sampleTerrainSignals(x, y) {
        if (
          (x === 10 && y === 10) ||
          (x === 10 && (y === 9 || y === 11)) ||
          (x === 11 && y === 10)
        ) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
      poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
    }));

    expect(tile?.kind).toBe('sign');
  });

  it('keeps roadside signs sparse away from junctions', () => {
    const tile = classifier?.(createSignClassifierPayload({
      x: 4,
      y: 4,
      sampleTerrainSignals(x, y) {
        if (y === 4 && (x === 3 || x === 5)) {
          return createSignSignals(0.95);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 20, y: 20, name: 'Farwatch' }],
    }));

    expect(tile).toBeNull();
  });

  it('allows occasional signs along long roads that point toward nearby poi', () => {
    const tile = classifier?.(createSignClassifierPayload({
      seed: 'long-road-spec',
      x: 30,
      y: 30,
      signChance: 0.998,
      sampleTerrainSignals(x, y) {
        if (y === 31 && x >= 24 && x <= 36) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 40, y: 31, name: 'Longford' }],
      poiAnchors: [{ x: 40, y: 31, type: 'town', name: 'Longford' }],
    }));

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'sign',
        note: expect.stringContaining('Longford'),
      })
    );
  });
});
