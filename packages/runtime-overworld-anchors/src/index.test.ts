import { describe, expect, it } from 'vitest';
import { createOverworldAnchorsRuntimePlugin } from './index.ts';
import type { OverworldAnchorSet, OverworldSignals } from '@bworlds/plugin-api';

const plugin = createOverworldAnchorsRuntimePlugin();
type ResolveOverworldAnchorsPayload = Parameters<
  NonNullable<typeof plugin.resolveOverworldAnchors>
>[0];

function createAnchorSignals(): OverworldSignals {
  return {
    continent: 0.6,
    elevation: 0.3,
    moisture: 0.4,
    riverSignal: 0.84,
    roadSignal: 0.45,
  };
}

function createAnchorPayload(
  overrides: Partial<ResolveOverworldAnchorsPayload> = {}
): ResolveOverworldAnchorsPayload {
  return {
    seed: 'spec',
    x: 10,
    y: 12,
    sampleTerrainSignals() {
      return createAnchorSignals();
    },
    ...overrides,
  };
}

describe('runtime overworld anchors', () => {
  it('returns deterministic nearby anchor sets for the same input', () => {
    const payload = createAnchorPayload();
    const first = plugin.resolveOverworldAnchors?.(payload);
    const second = plugin.resolveOverworldAnchors?.(payload);

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
    const anchors = (plugin.resolveOverworldAnchors?.(
      createAnchorPayload({
        seed: 'spacing-spec',
        x: 0,
        y: 0,
        sampleTerrainSignals() {
          return {
            continent: 0.6,
            elevation: 0.45,
            moisture: 0.4,
            riverSignal: 0.3,
            roadSignal: 0.45,
          };
        },
      })
    ) ?? {
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
