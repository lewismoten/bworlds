import { describe, expect, it } from 'vitest';
import {
  buildRailConnections,
  buildRailCurvePoints,
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
});

function createStation(name: string, x: number, y: number) {
  return {
    type: 'station' as const,
    name,
    x,
    y,
  };
}
