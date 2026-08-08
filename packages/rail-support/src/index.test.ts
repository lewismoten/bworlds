import { describe, expect, it } from 'vitest';
import {
  buildRailConnections,
  buildRailCurvePoints,
  getRailTrainPlacements,
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
});
