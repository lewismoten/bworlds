import { describe, expect, it } from 'vitest';
import { createFrontierFlavorRuntimePlugin } from './index.ts';
import type { OverworldSignals } from '@bworlds/plugin-api';

type FrontierTestTile = {
  kind: string;
  note?: string;
  regionFlavor?: string;
};

const plugin = createFrontierFlavorRuntimePlugin();
type FrontierWorldEnvironmentPayload = Parameters<
  NonNullable<typeof plugin.resolveWorldEnvironment>
>[0];
type FrontierDecorateOverworldPayload = Parameters<
  NonNullable<typeof plugin.decorateOverworldTile>
>[0];

function createFrontierSignals(): OverworldSignals {
  return {
    continent: 0.6,
    elevation: 0.4,
    moisture: 0.5,
    riverSignal: 0.2,
    roadSignal: 0.3,
  };
}

function createFrontierEnvironmentPayload(): FrontierWorldEnvironmentPayload {
  return {
    state: {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return {
          name: 'Plains',
          color: '#84cc16',
          miniColor: '#65a30d',
          walkable: true,
          wallHeight: 0,
        };
      },
    },
  };
}

function createFrontierDecoratePayload(
  tile: FrontierTestTile
): FrontierDecorateOverworldPayload {
  return {
    seed: 'spec',
    x: 12,
    y: -8,
    tile,
    signals: createFrontierSignals(),
  };
}

describe('runtime frontier flavor', () => {
  it('provides a shared overworld environment profile', () => {
    expect(plugin.resolveWorldEnvironment?.(createFrontierEnvironmentPayload())).toEqual(
      expect.objectContaining({
        stars: expect.objectContaining({
          density: 1,
        }),
      })
    );
  });

  it('adds regional flavor metadata and plains notes', () => {
    const tile: FrontierTestTile = { kind: 'plains' };

    plugin.decorateOverworldTile?.(createFrontierDecoratePayload(tile));

    expect(tile.regionFlavor).toMatch(/-/);
    expect(tile.note).toMatch(/^A .* stretch of .* rolls into the distance\.$/);
  });

  it('preserves existing notes while still adding region flavor', () => {
    const tile: FrontierTestTile = { kind: 'plains', note: 'Existing note.' };

    plugin.decorateOverworldTile?.({
      ...createFrontierDecoratePayload(tile),
      x: 2,
      y: 3,
      tile,
    });

    expect(tile.regionFlavor).toBeTruthy();
    expect(tile.note).toBe('Existing note.');
  });
});
