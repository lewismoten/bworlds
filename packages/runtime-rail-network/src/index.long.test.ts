import { describe, expect, it } from 'vitest';
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

describe('runtime rail network long suite', () => {
  it('recreates deterministic rail overlays after bounded cache eviction churn', () => {
    const plugin = createRailNetworkRuntimePlugin();
    const baseline = plugin.resolveOverworldTile?.({
      seed: 'cache-spec',
      x: 24,
      y: -48,
      sampleTerrainSignals,
    } as never);

    for (let index = 0; index < 8; index += 1) {
      plugin.resolveOverworldTile?.({
        seed: 'cache-spec',
        x: index,
        y: index * 2,
        sampleTerrainSignals,
      } as never);
    }

    const repeated = plugin.resolveOverworldTile?.({
      seed: 'cache-spec',
      x: 24,
      y: -48,
      sampleTerrainSignals,
    } as never);

    expect(repeated).toEqual(baseline);
  });
});
