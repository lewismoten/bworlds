import { describe, expect, it } from 'vitest';
import { createRailNetworkRuntimePlugin } from './index.ts';

describe('runtime rail network', () => {
  it('returns deterministic rail overlays for suitable station corridors', () => {
    const plugin = createRailNetworkRuntimePlugin();
    const first = plugin.resolveOverworldTile?.({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals() {
        return {
          continent: 0.64,
          elevation: 0.32,
          moisture: 0.46,
          riverSignal: 0.2,
          roadSignal: 0.58,
        };
      },
    } as never);
    const second = plugin.resolveOverworldTile?.({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals() {
        return {
          continent: 0.64,
          elevation: 0.32,
          moisture: 0.46,
          riverSignal: 0.2,
          roadSignal: 0.58,
        };
      },
    } as never);

    expect(second).toEqual(first);
  });
});
