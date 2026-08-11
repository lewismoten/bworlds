import { describe, expect, it } from 'vitest';
import { getRailTrainPlacements } from '@bworlds/rail-support';
import { createRailNetworkRuntimePlugin } from './index.ts';

function sampleTerrainSignals() {
  return {
    continent: 0.64,
    elevation: 0.32,
    moisture: 0.46,
    riverSignal: 0.2,
    roadSignal: 0.58,
  };
}

describe('runtime rail network', () => {
  it('returns deterministic rail overlays for suitable station corridors', () => {
    const plugin = createRailNetworkRuntimePlugin();
    const first = plugin.resolveOverworldTile?.({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals,
    } as never);
    const second = plugin.resolveOverworldTile?.({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals,
    } as never);

    expect(second).toEqual(first);
  });

  it('annotates rail tiles with an active train when traffic reaches that tile', () => {
    const plugin = createRailNetworkRuntimePlugin();
    let placement:
      ReturnType<typeof getRailTrainPlacements>[number] | undefined;

    for (let y = -96; y <= 96 && !placement; y += 24) {
      for (let x = -96; x <= 96 && !placement; x += 24) {
        const candidate = getRailTrainPlacements({
          seed: 'spec-seed',
          timeMs: 0,
          x,
          y,
          sampleTerrainSignals,
        }).find(
          (entry) =>
            Math.floor(entry.x / 24) === Math.floor(x / 24) &&
            Math.floor(entry.y / 24) === Math.floor(y / 24)
        );
        if (candidate) {
          placement = candidate;
        }
      }
    }

    expect(placement).toBeDefined();
    const tile = plugin.decorateOverworldTile?.({
      seed: 'spec-seed',
      x: placement!.x,
      y: placement!.y,
      tile: { kind: 'rail' },
      signals: sampleTerrainSignals(),
      sampleTerrainSignals,
      state: { timeMs: 0 } as never,
    } as never);

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'rail',
        train: expect.objectContaining({
          x: placement!.x,
          y: placement!.y,
        }),
      })
    );
  });
});
