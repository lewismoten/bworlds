import { describe, expect, it } from 'vitest';
import {
  buildRailConnections,
  buildRailCurvePoints,
  getRailTrainPlacements,
  resolveRailTile,
  type StationAnchorLike,
} from './index.ts';

const sampleTerrainSignals = (x: number, y: number) => ({
  continent: 0.64,
  elevation: 0.34 + Math.abs(y) * 0.002,
  moisture: 0.42,
  riverSignal: Math.abs(y) <= 1 ? 0.2 : 0.14,
  roadSignal: Math.abs(y) <= 4 ? 0.58 : 0.24,
});

describe('rail support', () => {
  it('builds deterministic curved rail points between stations', () => {
    const from = { x: 0, y: 0, type: 'station', name: 'Alpha Station' } as StationAnchorLike;
    const to = { x: 28, y: 10, type: 'station', name: 'Beta Station' } as StationAnchorLike;

    const first = buildRailCurvePoints('spec-seed', from, to);
    const second = buildRailCurvePoints('spec-seed', from, to);

    expect(first).toEqual(second);
    expect(first[0]).toEqual({ x: 0, y: 0 });
    expect(first.at(-1)).toEqual({ x: 28, y: 10 });
    expect(first.some((point) => point.y !== 0)).toBe(true);
  });

  it('keeps the rasterized rail curve path stable after allocation-trimming refactors', () => {
    const from = { x: 0, y: 0, type: 'station', name: 'Alpha Station' } as StationAnchorLike;
    const to = { x: 28, y: 10, type: 'station', name: 'Beta Station' } as StationAnchorLike;

    expect(buildRailCurvePoints('spec-seed', from, to)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: -0 },
      { x: 4, y: -0 },
      { x: 5, y: -0 },
      { x: 6, y: -0 },
      { x: 7, y: -0 },
      { x: 8, y: -0 },
      { x: 9, y: 0 },
      { x: 10, y: 0 },
      { x: 11, y: 1 },
      { x: 12, y: 1 },
      { x: 13, y: 1 },
      { x: 14, y: 1 },
      { x: 15, y: 2 },
      { x: 16, y: 2 },
      { x: 17, y: 2 },
      { x: 18, y: 3 },
      { x: 19, y: 4 },
      { x: 20, y: 4 },
      { x: 21, y: 4 },
      { x: 22, y: 5 },
      { x: 23, y: 6 },
      { x: 24, y: 7 },
      { x: 25, y: 7 },
      { x: 26, y: 8 },
      { x: 27, y: 9 },
      { x: 28, y: 10 },
    ]);
  });

  it('connects nearby stations with at most two deterministic rail links each', () => {
    const stations = [
      { x: 0, y: 0, type: 'station', name: 'Alpha Station' },
      { x: 28, y: 10, type: 'station', name: 'Beta Station' },
      { x: 56, y: 2, type: 'station', name: 'Gamma Station' },
    ] as StationAnchorLike[];

    const connections = buildRailConnections({
      seed: 'spec-seed',
      stationAnchors: stations,
      sampleTerrainSignals,
    });

    expect(connections.length).toBeGreaterThan(0);
    expect(
      connections.every((connection) => connection.points.length >= 3)
    ).toBe(true);
    const degree = new Map<string, number>();
    connections.forEach((connection) => {
      const fromKey = `${connection.from.x},${connection.from.y}`;
      const toKey = `${connection.to.x},${connection.to.y}`;
      degree.set(fromKey, (degree.get(fromKey) ?? 0) + 1);
      degree.set(toKey, (degree.get(toKey) ?? 0) + 1);
    });
    expect(Math.max(...degree.values())).toBeLessThanOrEqual(2);
  });

  it('rejects paths that would cross unsuitable river-heavy terrain', () => {
    const stations = [
      { x: 0, y: 0, type: 'station', name: 'Alpha Station' },
      { x: 30, y: 0, type: 'station', name: 'Beta Station' },
    ] as StationAnchorLike[];

    const blocked = buildRailConnections({
      seed: 'blocked-spec',
      stationAnchors: stations,
      sampleTerrainSignals(x: number) {
        return {
          continent: 0.62,
          elevation: 0.38,
          moisture: 0.42,
          riverSignal: x >= 10 && x <= 20 ? 0.92 : 0.18,
          roadSignal: 0.55,
        };
      },
    });

    expect(blocked).toEqual([]);
  });

  it('creates deterministic train placements that move along rail connections over time', () => {
    const first = getRailTrainPlacements({
      seed: 'spec-seed',
      timeMs: 0,
      x: 24,
      y: 8,
      sampleTerrainSignals,
    });
    const second = getRailTrainPlacements({
      seed: 'spec-seed',
      timeMs: 0,
      x: 24,
      y: 8,
      sampleTerrainSignals,
    });
    let foundMovement = false;
    for (let minute = 2; minute <= 24 && !foundMovement; minute += 2) {
      const later = getRailTrainPlacements({
        seed: 'spec-seed',
        timeMs: minute * 60 * 1000,
        x: 24,
        y: 8,
        sampleTerrainSignals,
      });
      foundMovement =
        later[0]?.x !== first[0]?.x ||
        later[0]?.y !== first[0]?.y ||
        later[0]?.progress !== first[0]?.progress ||
        later[0]?.direction !== first[0]?.direction;
    }

    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
    expect(first[0]).toEqual(
      expect.objectContaining({
        lineName: expect.stringContaining('Line'),
        direction: expect.stringMatching(/forward|backward/),
      })
    );
    expect(foundMovement).toBe(true);
  });

  it('keeps resolved rail tiles deterministic after bounded region cache eviction churn', () => {
    const baseline = resolveRailTile({
      seed: 'spec-seed',
      x: 24,
      y: 8,
      sampleTerrainSignals,
    });

    for (let index = 0; index < 320; index += 1) {
      resolveRailTile({
        seed: 'spec-seed',
        x: index * 24,
        y: (index % 9) * 24,
        sampleTerrainSignals,
      });
    }

    expect(
      resolveRailTile({
        seed: 'spec-seed',
        x: 24,
        y: 8,
        sampleTerrainSignals,
      })
    ).toEqual(baseline);
  });

  it('keeps train placements deterministic after bounded time-bucket cache eviction churn', () => {
    const baseline = getRailTrainPlacements({
      seed: 'spec-seed',
      timeMs: 0,
      x: 24,
      y: 8,
      sampleTerrainSignals,
    });

    for (let index = 0; index < 640; index += 1) {
      getRailTrainPlacements({
        seed: 'spec-seed',
        timeMs: index * 2_000,
        x: 24 + (index % 5) * 24,
        y: 8 + (index % 7) * 24,
        sampleTerrainSignals,
      });
    }

    expect(
      getRailTrainPlacements({
        seed: 'spec-seed',
        timeMs: 0,
        x: 24,
        y: 8,
        sampleTerrainSignals,
      })
    ).toEqual(baseline);
  });
});
