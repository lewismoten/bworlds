import { describe, expect, it } from 'vitest';
import { createOverworldAnchorsRuntimePlugin } from './index.ts';
import type { OverworldAnchorSet } from '@bworlds/plugin-api';

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
        poiAnchors: expect.any(Array),
      })
    );
  });

  it('keeps generated poi anchors spaced away from each other', () => {
    const plugin = createOverworldAnchorsRuntimePlugin();
    const sampleTerrainSignals = () => ({
      continent: 0.6,
      elevation: 0.45,
      moisture: 0.4,
      riverSignal: 0.3,
      roadSignal: 0.45,
    });

    const anchors = (plugin.resolveOverworldAnchors?.({
      seed: 'spacing-spec',
      x: 0,
      y: 0,
      sampleTerrainSignals,
    } as any) ?? {
        townAnchors: [],
        bridgeAnchors: [],
        poiAnchors: [],
      }) as OverworldAnchorSet;
    const pois = anchors.poiAnchors ?? [];

    for (let index = 0; index < pois.length; index += 1) {
      for (let next = index + 1; next < pois.length; next += 1) {
        expect(
          Math.hypot(pois[index].x - pois[next].x, pois[index].y - pois[next].y)
        ).toBeGreaterThanOrEqual(9);
      }
    }
  });
});
