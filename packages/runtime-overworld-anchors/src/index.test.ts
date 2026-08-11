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

  it('only places cave anchors next to mountain-grade terrain', () => {
    const sampleTerrainSignals = (x: number, y: number): OverworldSignals => {
      if ((Math.abs(x) + Math.abs(y)) % 2 === 1) {
        return {
          continent: 0.64,
          elevation: 0.84,
          moisture: 0.4,
          riverSignal: 0.2,
          roadSignal: 0.3,
        };
      }
      return {
        continent: 0.64,
        elevation: 0.56,
        moisture: 0.4,
        riverSignal: 0.2,
        roadSignal: 0.3,
      };
    };
    const anchors = plugin.resolveOverworldAnchors?.(
      createAnchorPayload({
        seed: 'cave-adjacency-spec',
        x: 0,
        y: 0,
        sampleTerrainSignals,
      })
    ) as OverworldAnchorSet;

    const caves = (anchors.poiAnchors ?? []).filter(
      (anchor) => anchor.type === 'cave'
    );
    expect(caves.length).toBeGreaterThan(0);
    caves.forEach((anchor) => {
      const adjacentElevations = [
        [anchor.x + 1, anchor.y],
        [anchor.x - 1, anchor.y],
        [anchor.x, anchor.y + 1],
        [anchor.x, anchor.y - 1],
      ].map(([x, y]) => sampleTerrainSignals(x, y).elevation);
      expect(adjacentElevations.some((elevation) => elevation > 0.72)).toBe(
        true
      );
    });
  });

  it('reuses terrain samples across overlapping anchor suitability scans', () => {
    const sampleCounts = new Map<string, number>();

    plugin.resolveOverworldAnchors?.(
      createAnchorPayload({
        seed: 'terrain-cache-spec',
        x: 0,
        y: 0,
        sampleTerrainSignals(x, y) {
          const key = `${x},${y}`;
          sampleCounts.set(key, (sampleCounts.get(key) ?? 0) + 1);
          return {
            continent: 0.64,
            elevation: 0.56,
            moisture: 0.62,
            riverSignal: 0.22,
            roadSignal: 0.46,
          };
        },
      })
    );

    expect(sampleCounts.size).toBeGreaterThan(1);
    expect(Math.max(...sampleCounts.values())).toBe(1);
  });
});
