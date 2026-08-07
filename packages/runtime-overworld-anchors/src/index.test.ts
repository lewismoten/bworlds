import { describe, expect, it } from 'vitest';
import { createOverworldAnchorsRuntimePlugin } from './index.ts';

describe('runtime overworld anchors', () => {
  it('returns deterministic nearby anchor sets for the same input', () => {
    const plugin = createOverworldAnchorsRuntimePlugin();
    const sampleTerrainSignals = () => ({
      continent: 0.6,
      elevation: 0.3,
      moisture: 0.4,
      riverSignal: 0.84,
      roadSignal: 0.45,
    });

    const first = plugin.resolveOverworldAnchors?.({
      seed: 'spec',
      x: 10,
      y: 12,
      sampleTerrainSignals,
    } as any);
    const second = plugin.resolveOverworldAnchors?.({
      seed: 'spec',
      x: 10,
      y: 12,
      sampleTerrainSignals,
    } as any);

    expect(first).toEqual(second);
    expect(first).toEqual(
      expect.objectContaining({
        townAnchors: expect.any(Array),
        bridgeAnchors: expect.any(Array),
      })
    );
  });
});
