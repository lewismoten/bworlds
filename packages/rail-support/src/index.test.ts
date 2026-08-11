import { describe, expect, it } from 'vitest';
import {
  buildRailConnections,
  buildRailCurvePoints,
  collectNearbyStationAnchors,
  getRailTrainPlacements,
  resolveRailTile,
} from './index.ts';

describe('rail support', () => {
  it('builds deterministic curved rail points for the same station pair', () => {
    const from = createStation('North Gate', 0, 0);
    const to = createStation('South Gate', 30, 18);

    expect(buildRailCurvePoints('spec-seed', from, to)).toEqual(
      buildRailCurvePoints('spec-seed', from, to)
    );
  });

  it('builds stable nearby rail connections without exceeding station degree limits', () => {
    const stations = [
      createStation('Aster', 0, 0),
      createStation('Birch', 24, 0),
      createStation('Cinder', 48, 0),
      createStation('Dawn', 24, 24),
    ];

    const connections = buildRailConnections({
      seed: 'spec-seed',
      stationAnchors: stations,
      sampleTerrainSignals() {
        return {
          continent: 0.62,
          elevation: 0.28,
          moisture: 0.44,
          riverSignal: 0.16,
          roadSignal: 0.58,
        };
      },
    });

    const repeated = buildRailConnections({
      seed: 'spec-seed',
      stationAnchors: stations,
      sampleTerrainSignals() {
        return {
          continent: 0.62,
          elevation: 0.28,
          moisture: 0.44,
          riverSignal: 0.16,
          roadSignal: 0.58,
        };
      },
    });

    expect(repeated).toEqual(connections);
    expect(connections.length).toBeGreaterThan(0);

    const degrees = new Map<string, number>();
    for (let index = 0; index < connections.length; index += 1) {
      const connection = connections[index]!;
      const fromKey = `${connection.from.x},${connection.from.y}`;
      const toKey = `${connection.to.x},${connection.to.y}`;
      degrees.set(fromKey, (degrees.get(fromKey) ?? 0) + 1);
      degrees.set(toKey, (degrees.get(toKey) ?? 0) + 1);
      expect(connection.points.length).toBeGreaterThanOrEqual(3);
    }

    for (const degree of degrees.values()) {
      expect(degree).toBeLessThanOrEqual(2);
    }
  });

  it('keeps rail connections deterministic even when station input order changes', () => {
    const stations = [
      createStation('Aster', 0, 0),
      createStation('Birch', 24, 0),
      createStation('Cinder', 48, 0),
      createStation('Dawn', 24, 24),
    ];

    const forward = buildRailConnections({
      seed: 'spec-seed',
      stationAnchors: stations,
      sampleTerrainSignals() {
        return {
          continent: 0.62,
          elevation: 0.28,
          moisture: 0.44,
          riverSignal: 0.16,
          roadSignal: 0.58,
        };
      },
    });
    const reversed = buildRailConnections({
      seed: 'spec-seed',
      stationAnchors: [...stations].reverse(),
      sampleTerrainSignals() {
        return {
          continent: 0.62,
          elevation: 0.28,
          moisture: 0.44,
          riverSignal: 0.16,
          roadSignal: 0.58,
        };
      },
    });

    expect(reversed).toEqual(forward);
  });

  it('deduplicates nearby station anchors that resolve to the same coordinates', () => {
    const anchors = collectNearbyStationAnchors(
      'spec-seed',
      0,
      0,
      () => ({
        continent: 0.62,
        elevation: 0.28,
        moisture: 0.44,
        riverSignal: 0.16,
        roadSignal: 0.58,
      })
    );

    const coordinateKeys = new Set(
      anchors.map((anchor) => `${anchor.x},${anchor.y}`)
    );

    expect(coordinateKeys.size).toBe(anchors.length);
  });

  it('reuses shared regional rail analysis across tile and train queries', () => {
    let signalCalls = 0;
    const sampleTerrainSignals = () => {
      signalCalls += 1;
      return {
        continent: 0.62,
        elevation: 0.28,
        moisture: 0.44,
        riverSignal: 0.16,
        roadSignal: 0.58,
      };
    };

    const tile = resolveRailTile({
      seed: 'spec-seed',
      x: 24,
      y: 24,
      sampleTerrainSignals,
    });
    const callsAfterTile = signalCalls;
    const placements = getRailTrainPlacements({
      seed: 'spec-seed',
      timeMs: 0,
      x: 24,
      y: 24,
      sampleTerrainSignals,
    });

    expect(tile === null || tile.kind === 'rail').toBe(true);
    expect(signalCalls).toBe(callsAfterTile);
    expect(Array.isArray(placements)).toBe(true);
  });

  it('reuses terrain signal reads across overlapping candidate rail paths', () => {
    let signalCalls = 0;
    const seenCoordinates = new Set<string>();
    const stations = [
      createStation('Aster', 0, 0),
      createStation('Birch', 24, 0),
      createStation('Cinder', 48, 0),
      createStation('Dawn', 24, 24),
    ];

    buildRailConnections({
      seed: 'spec-seed',
      stationAnchors: stations,
      sampleTerrainSignals(x, y) {
        signalCalls += 1;
        seenCoordinates.add(`${x},${y}`);
        return {
          continent: 0.62,
          elevation: 0.28,
          moisture: 0.44,
          riverSignal: 0.16,
          roadSignal: 0.58,
        };
      },
    });

    expect(signalCalls).toBe(seenCoordinates.size);
    expect(signalCalls).toBeGreaterThan(0);
  });
});

function createStation(name: string, x: number, y: number) {
  return {
    type: 'station' as const,
    name,
    x,
    y,
  };
}
