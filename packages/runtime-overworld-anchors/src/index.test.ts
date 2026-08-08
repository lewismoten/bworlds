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

function createDenseForestSignals(): OverworldSignals {
  return {
    continent: 0.62,
    elevation: 0.48,
    moisture: 0.72,
    riverSignal: 0.32,
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

    const caves = (anchors.poiAnchors ?? []).filter((anchor) => anchor.type === 'cave');
    expect(caves.length).toBeGreaterThan(0);
    caves.forEach((anchor) => {
      const adjacentElevations = [
        [anchor.x + 1, anchor.y],
        [anchor.x - 1, anchor.y],
        [anchor.x, anchor.y + 1],
        [anchor.x, anchor.y - 1],
      ].map(([x, y]) => sampleTerrainSignals(x, y).elevation);
      expect(adjacentElevations.some((elevation) => elevation > 0.72)).toBe(true);
    });
  });

  it('only places dungeon anchors inside dense forest-like terrain clusters', () => {
    const sampleTerrainSignals = (
      _x: number,
      _y: number
    ): OverworldSignals => createDenseForestSignals();
    let anchors: OverworldAnchorSet = {
      townAnchors: [],
      bridgeAnchors: [],
      poiAnchors: [],
    };
    for (let seedIndex = 0; seedIndex < 256; seedIndex += 1) {
      anchors =
        (plugin.resolveOverworldAnchors?.(
          createAnchorPayload({
            seed: `dungeon-forest-spec:${seedIndex}`,
            x: 0,
            y: 0,
            sampleTerrainSignals,
          })
        ) as OverworldAnchorSet) ?? anchors;
      if ((anchors.poiAnchors ?? []).some((anchor) => anchor.type === 'dungeon')) {
        break;
      }
    }

    const dungeons = (anchors.poiAnchors ?? []).filter(
      (anchor) => anchor.type === 'dungeon'
    );
    expect(dungeons.length).toBeGreaterThan(0);
    dungeons.forEach((anchor) => {
      let forestLikeCount = 0;
      let sampleCount = 0;
      for (let sampleY = anchor.y - 2; sampleY <= anchor.y + 2; sampleY += 1) {
        for (let sampleX = anchor.x - 2; sampleX <= anchor.x + 2; sampleX += 1) {
          sampleCount += 1;
          const terrain = sampleTerrainSignals(sampleX, sampleY);
          if (terrain.moisture >= 0.6) {
            forestLikeCount += 1;
          }
        }
      }
      expect(forestLikeCount).toBeGreaterThanOrEqual(Math.ceil(sampleCount * 0.68));
    });
  });

  it('places quarry anchors on dry rocky foothills near mountain terrain', () => {
    const sampleTerrainSignals = (x: number, y: number): OverworldSignals => {
      if (Math.abs(x) <= 1 && Math.abs(y) <= 1) {
        return {
          continent: 0.68,
          elevation: 0.84,
          moisture: 0.32,
          riverSignal: 0.16,
          roadSignal: 0.28,
        };
      }
      return {
        continent: 0.68,
        elevation: 0.58,
        moisture: 0.34,
        riverSignal: 0.16,
        roadSignal: 0.28,
      };
    };
    let anchors: OverworldAnchorSet = {
      townAnchors: [],
      bridgeAnchors: [],
      poiAnchors: [],
    };

    for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
      anchors =
        (plugin.resolveOverworldAnchors?.(
          createAnchorPayload({
            seed: `quarry-rock-spec:${seedIndex}`,
            x: 0,
            y: 0,
            sampleTerrainSignals,
          })
        ) as OverworldAnchorSet) ?? anchors;
      if ((anchors.poiAnchors ?? []).some((anchor) => anchor.type === 'quarry')) {
        break;
      }
    }

    const quarries = (anchors.poiAnchors ?? []).filter(
      (anchor) => anchor.type === 'quarry'
    );
    expect(quarries.length).toBeGreaterThan(0);
    quarries.forEach((anchor) => {
      expect(sampleTerrainSignals(anchor.x, anchor.y).moisture).toBeLessThan(0.58);
      let foundMountain = false;
      for (let sampleY = anchor.y - 2; sampleY <= anchor.y + 2; sampleY += 1) {
        for (let sampleX = anchor.x - 2; sampleX <= anchor.x + 2; sampleX += 1) {
          if (sampleTerrainSignals(sampleX, sampleY).elevation > 0.72) {
            foundMountain = true;
          }
        }
      }
      expect(foundMountain).toBe(true);
    });
  });

  it('places lighthouse anchors on coastal land within two tiles of the ocean', () => {
    const sampleTerrainSignals = (x: number, y: number): OverworldSignals => {
      if (x >= 2) {
        return {
          continent: 0.2,
          elevation: 0.1,
          moisture: 0.7,
          riverSignal: 0.1,
          roadSignal: 0.2,
        };
      }
      return {
        continent: x >= 0 ? 0.46 : 0.6,
        elevation: 0.26,
        moisture: 0.58,
        riverSignal: 0.12,
        roadSignal: 0.22,
      };
    };
    let anchors: OverworldAnchorSet = {
      townAnchors: [],
      bridgeAnchors: [],
      poiAnchors: [],
    };

    for (let seedIndex = 0; seedIndex < 16; seedIndex += 1) {
      anchors =
        (plugin.resolveOverworldAnchors?.(
          createAnchorPayload({
            seed: `lighthouse-coast-spec:${seedIndex}`,
            x: 0,
            y: 0,
            sampleTerrainSignals,
          })
        ) as OverworldAnchorSet) ?? anchors;
      if ((anchors.poiAnchors ?? []).some((anchor) => anchor.type === 'lighthouse')) {
        break;
      }
    }

    const lighthouses = (anchors.poiAnchors ?? []).filter(
      (anchor) => anchor.type === 'lighthouse'
    );
    expect(lighthouses.length).toBeGreaterThan(0);
    lighthouses.forEach((anchor) => {
      expect(sampleTerrainSignals(anchor.x, anchor.y).continent).toBeGreaterThanOrEqual(0.42);
      let foundOcean = false;
      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          const distance = Math.abs(offsetX) + Math.abs(offsetY);
          if (distance === 0 || distance > 2) {
            continue;
          }
          if (sampleTerrainSignals(anchor.x + offsetX, anchor.y + offsetY).continent <= 0.38) {
            foundOcean = true;
          }
        }
      }
      expect(foundOcean).toBe(true);
    });
  });

  it('places observatory anchors on mountain summit clusters', () => {
    const sampleTerrainSignals = (x: number, y: number): OverworldSignals => {
      const summitCenterX = Math.round(x / 6) * 6;
      const summitCenterY = Math.round(y / 6) * 6;
      if (Math.abs(x - summitCenterX) <= 1 && Math.abs(y - summitCenterY) <= 1) {
        return {
          continent: 0.72,
          elevation: 0.9,
          moisture: 0.36,
          riverSignal: 0.12,
          roadSignal: 0.22,
        };
      }
      return {
        continent: 0.72,
        elevation: 0.7,
        moisture: 0.36,
        riverSignal: 0.12,
        roadSignal: 0.22,
      };
    };
    let anchors: OverworldAnchorSet = {
      townAnchors: [],
      bridgeAnchors: [],
      poiAnchors: [],
    };

    for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
      anchors =
        (plugin.resolveOverworldAnchors?.(
          createAnchorPayload({
            seed: `observatory-summit-spec:${seedIndex}`,
            x: 0,
            y: 0,
            sampleTerrainSignals,
          })
        ) as OverworldAnchorSet) ?? anchors;
      if ((anchors.poiAnchors ?? []).some((anchor) => anchor.type === 'observatory')) {
        break;
      }
    }

    const observatories = (anchors.poiAnchors ?? []).filter(
      (anchor) => anchor.type === 'observatory'
    );
    expect(observatories.length).toBeGreaterThan(0);
    observatories.forEach((anchor) => {
      expect(sampleTerrainSignals(anchor.x, anchor.y).elevation).toBeGreaterThanOrEqual(0.78);
      let elevatedSamples = 0;
      for (let sampleY = anchor.y - 1; sampleY <= anchor.y + 1; sampleY += 1) {
        for (let sampleX = anchor.x - 1; sampleX <= anchor.x + 1; sampleX += 1) {
          if (sampleTerrainSignals(sampleX, sampleY).elevation > 0.72) {
            elevatedSamples += 1;
          }
        }
      }
      expect(elevatedSamples).toBeGreaterThanOrEqual(4);
    });
  });

  it('places ship anchors on coastal land near open water with nearby land support', () => {
    const sampleTerrainSignals = (x: number, y: number): OverworldSignals => {
      const band = ((x % 4) + 4) % 4;
      if (band === 1) {
        return {
          continent: 0.34,
          elevation: 0.08,
          moisture: 0.66,
          riverSignal: 0.12,
          roadSignal: 0.18,
        };
      }
      if (band === 2) {
        return {
          continent: 0.2,
          elevation: 0.04,
          moisture: 0.72,
          riverSignal: 0.08,
          roadSignal: 0.12,
        };
      }
      if (band === 3) {
        return {
          continent: 0.64,
          elevation: 0.26,
          moisture: 0.52,
          riverSignal: 0.16,
          roadSignal: 0.2,
        };
      }
      return {
        continent: 0.56,
        elevation: 0.22,
        moisture: 0.58,
        riverSignal: 0.18,
        roadSignal: 0.24,
      };
    };
    let anchors: OverworldAnchorSet = {
      townAnchors: [],
      bridgeAnchors: [],
      poiAnchors: [],
    };

    for (let seedIndex = 0; seedIndex < 16; seedIndex += 1) {
      anchors =
        (plugin.resolveOverworldAnchors?.(
          createAnchorPayload({
            seed: `ship-coast-spec:${seedIndex}`,
            x: 0,
            y: 0,
            sampleTerrainSignals,
          })
        ) as OverworldAnchorSet) ?? anchors;
      if ((anchors.poiAnchors ?? []).some((anchor) => anchor.type === 'ship')) {
        break;
      }
    }

    const ships = (anchors.poiAnchors ?? []).filter(
      (anchor) => anchor.type === 'ship'
    );
    expect(ships.length).toBeGreaterThan(0);
    ships.forEach((anchor) => {
      expect(sampleTerrainSignals(anchor.x, anchor.y).continent).toBeGreaterThanOrEqual(0.42);
      let foundOcean = false;
      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          const distance = Math.abs(offsetX) + Math.abs(offsetY);
          if (distance === 0 || distance > 2) {
            continue;
          }
          if (sampleTerrainSignals(anchor.x + offsetX, anchor.y + offsetY).continent <= 0.38) {
            foundOcean = true;
          }
        }
      }
      const adjacentLand = [
        sampleTerrainSignals(anchor.x + 1, anchor.y).continent,
        sampleTerrainSignals(anchor.x - 1, anchor.y).continent,
        sampleTerrainSignals(anchor.x, anchor.y + 1).continent,
        sampleTerrainSignals(anchor.x, anchor.y - 1).continent,
      ].some((continent) => continent >= 0.42);
      expect(foundOcean).toBe(true);
      expect(adjacentLand).toBe(true);
    });
  });
});
