import { hash2D, clamp } from '@bworlds/core';
import type {
  OverworldAnchors,
  PoiAnchorLike,
  SampleTerrainSignalsLike,
  Seed,
  TileLike,
} from '@bworlds/plugin-api';
import { createOverworldAnchorsRuntimePlugin } from '@bworlds/runtime-overworld-anchors';

export type StationAnchorLike = PoiAnchorLike & { type: 'station'; name: string };
export type RailConnection = {
  from: StationAnchorLike;
  to: StationAnchorLike;
  points: Array<{ x: number; y: number }>;
};
export type RailTrainPlacement = {
  x: number;
  y: number;
  progress: number;
  direction: 'forward' | 'backward';
  lineName: string;
  from: string;
  to: string;
};

const STATION_CELL_SIZE = 24;
const STATION_SCAN_RADIUS_CELLS = 4;
const MIN_RAIL_DISTANCE = 18;
const MAX_RAIL_DISTANCE = 72;
const MAX_CONNECTIONS_PER_STATION = 2;
const MIN_RAIL_CONTINENT = 0.44;
const MAX_RAIL_ELEVATION = 0.72;
const MAX_RAIL_RIVER_SIGNAL = 0.82;
const MIN_ROUTE_SIGNAL_SHARE = 0.35;
const RAIL_SAMPLE_SEGMENTS = 20;

const anchorPlugin = createOverworldAnchorsRuntimePlugin();
const railRegionCache = new Map<string, Map<string, TileLike>>();
const railTrainCache = new Map<string, RailTrainPlacement[]>();

export function resolveRailTile({
  seed,
  x,
  y,
  sampleTerrainSignals,
}: {
  seed: Seed;
  x: number;
  y: number;
  sampleTerrainSignals: SampleTerrainSignalsLike;
}): TileLike | null {
  const regionX = Math.floor(x / STATION_CELL_SIZE);
  const regionY = Math.floor(y / STATION_CELL_SIZE);
  const regionKey = `${seed}:${regionX}:${regionY}`;
  if (!railRegionCache.has(regionKey)) {
    railRegionCache.set(
      regionKey,
      buildRailRegionTileMap({
        seed,
        x,
        y,
        sampleTerrainSignals,
      })
    );
  }
  return railRegionCache.get(regionKey)?.get(`${x},${y}`) ?? null;
}

export function collectNearbyStationAnchors(
  seed: Seed,
  x: number,
  y: number,
  sampleTerrainSignals: SampleTerrainSignalsLike
): StationAnchorLike[] {
  const centerCellX = Math.floor(x / STATION_CELL_SIZE);
  const centerCellY = Math.floor(y / STATION_CELL_SIZE);
  const anchors = new Map<string, StationAnchorLike>();

  for (let offsetY = -STATION_SCAN_RADIUS_CELLS; offsetY <= STATION_SCAN_RADIUS_CELLS; offsetY += 1) {
    for (let offsetX = -STATION_SCAN_RADIUS_CELLS; offsetX <= STATION_SCAN_RADIUS_CELLS; offsetX += 1) {
      const scanX = (centerCellX + offsetX) * STATION_CELL_SIZE;
      const scanY = (centerCellY + offsetY) * STATION_CELL_SIZE;
      const resolved = anchorPlugin.resolveOverworldAnchors?.({
        seed,
        x: scanX,
        y: scanY,
        sampleTerrainSignals,
      }) as OverworldAnchors | undefined;
      for (const anchor of resolved?.poiAnchors ?? []) {
        if (anchor.type !== 'station' || typeof anchor.name !== 'string') {
          continue;
        }
        anchors.set(`${anchor.x},${anchor.y}`, anchor as StationAnchorLike);
      }
    }
  }

  return [...anchors.values()].sort(
    (left, right) =>
      left.x - right.x || left.y - right.y || left.name.localeCompare(right.name)
  );
}

export function buildRailConnections({
  seed,
  stationAnchors,
  sampleTerrainSignals,
}: {
  seed: Seed;
  stationAnchors: StationAnchorLike[];
  sampleTerrainSignals: SampleTerrainSignalsLike;
}): RailConnection[] {
  const connections: RailConnection[] = [];
  const degrees = new Map<string, number>();
  const claimed = new Set<string>();
  const sortedStations = [...stationAnchors].sort(
    (left, right) =>
      left.x - right.x || left.y - right.y || left.name.localeCompare(right.name)
  );

  for (const station of sortedStations) {
    const stationKey = `${station.x},${station.y}`;
    const used = degrees.get(stationKey) ?? 0;
    if (used >= MAX_CONNECTIONS_PER_STATION) {
      continue;
    }

    const candidates = [...sortedStations]
      .filter((other) => other !== station)
      .map((other) => ({
        other,
        distance: Math.hypot(other.x - station.x, other.y - station.y),
      }))
      .filter(
        ({ distance }) => distance >= MIN_RAIL_DISTANCE && distance <= MAX_RAIL_DISTANCE
      )
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          left.other.x - right.other.x ||
          left.other.y - right.other.y
      );

    for (const { other } of candidates) {
      const otherKey = `${other.x},${other.y}`;
      const connectionKey = [stationKey, otherKey].sort().join('|');
      if (claimed.has(connectionKey)) {
        continue;
      }
      if ((degrees.get(stationKey) ?? 0) >= MAX_CONNECTIONS_PER_STATION) {
        break;
      }
      if ((degrees.get(otherKey) ?? 0) >= MAX_CONNECTIONS_PER_STATION) {
        continue;
      }

      const points = buildRailCurvePoints(seed, station, other);
      if (!isRailPathSuitable(points, sampleTerrainSignals, station, other)) {
        continue;
      }

      connections.push({ from: station, to: other, points });
      claimed.add(connectionKey);
      degrees.set(stationKey, (degrees.get(stationKey) ?? 0) + 1);
      degrees.set(otherKey, (degrees.get(otherKey) ?? 0) + 1);
    }
  }

  return connections;
}

export function getRailTrainPlacements({
  seed,
  timeMs,
  x,
  y,
  sampleTerrainSignals,
}: {
  seed: Seed;
  timeMs: number;
  x: number;
  y: number;
  sampleTerrainSignals: SampleTerrainSignalsLike;
}): RailTrainPlacement[] {
  const regionX = Math.floor(x / STATION_CELL_SIZE);
  const regionY = Math.floor(y / STATION_CELL_SIZE);
  const timeBucket = Math.floor(timeMs / 2000);
  const cacheKey = `${seed}:${regionX}:${regionY}:${timeBucket}`;
  if (railTrainCache.has(cacheKey)) {
    return railTrainCache.get(cacheKey) ?? [];
  }

  const stations = collectNearbyStationAnchors(seed, x, y, sampleTerrainSignals);
  const connections = buildRailConnections({
    seed,
    stationAnchors: stations,
    sampleTerrainSignals,
  });
  const placements = connections
    .map((connection, index) =>
      resolveRailTrainPlacement(seed, timeMs, connection, index)
    )
    .filter((placement): placement is RailTrainPlacement => placement !== null);

  railTrainCache.set(cacheKey, placements);
  return placements;
}

export function buildRailCurvePoints(
  seed: Seed,
  from: StationAnchorLike,
  to: StationAnchorLike
): Array<{ x: number; y: number }> {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  const midpointX = (from.x + to.x) * 0.5;
  const midpointY = (from.y + to.y) * 0.5;
  const perpendicularX = distance === 0 ? 0 : -deltaY / distance;
  const perpendicularY = distance === 0 ? 0 : deltaX / distance;
  const curveDirection =
    hash2D(`${seed}:rail-curve-direction`, from.x + to.x, from.y + to.y) >= 0.5
      ? 1
      : -1;
  const curveOffset =
    clamp(distance * 0.18, 3.2, 9.5) *
    (0.8 +
      hash2D(
        `${seed}:rail-curve-offset`,
        from.x * 13 + to.x,
        from.y * 17 + to.y
      ) *
        0.55);
  const control = {
    x: midpointX + perpendicularX * curveOffset * curveDirection,
    y: midpointY + perpendicularY * curveOffset * curveDirection,
  };
  const sampled: Array<{ x: number; y: number }> = [];

  for (let index = 0; index <= RAIL_SAMPLE_SEGMENTS; index += 1) {
    const t = index / RAIL_SAMPLE_SEGMENTS;
    const inverse = 1 - t;
    sampled.push({
      x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
    });
  }

  return rasterizePath(sampled);
}

function rasterizePath(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length === 0) {
    return [];
  }

  const rounded = points.map((point) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
  }));
  const raster: Array<{ x: number; y: number }> = [rounded[0]!];

  for (let index = 1; index < rounded.length; index += 1) {
    const segment = getLinePoints(raster[raster.length - 1]!, rounded[index]!);
    for (const point of segment.slice(1)) {
      const previous = raster[raster.length - 1]!;
      if (previous.x === point.x && previous.y === point.y) {
        continue;
      }
      raster.push(point);
    }
  }

  return raster;
}

function getLinePoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  let x = start.x;
  let y = start.y;
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = deltaX - deltaY;

  while (true) {
    points.push({ x, y });
    if (x === end.x && y === end.y) {
      return points;
    }
    const doubleError = error * 2;
    if (doubleError > -deltaY) {
      error -= deltaY;
      x += stepX;
    }
    if (doubleError < deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

function isRailPathSuitable(
  points: Array<{ x: number; y: number }>,
  sampleTerrainSignals: SampleTerrainSignalsLike,
  from: StationAnchorLike,
  to: StationAnchorLike
): boolean {
  if (points.length < 3) {
    return false;
  }

  let routeFriendlyCount = 0;
  let sampleCount = 0;

  for (const point of points.slice(1, -1)) {
    const terrain = sampleTerrainSignals(point.x, point.y);
    if (
      terrain.continent < MIN_RAIL_CONTINENT ||
      terrain.elevation > MAX_RAIL_ELEVATION ||
      terrain.riverSignal > MAX_RAIL_RIVER_SIGNAL
    ) {
      return false;
    }
    sampleCount += 1;
    if (terrain.roadSignal >= 0.28) {
      routeFriendlyCount += 1;
    }
  }

  if (sampleCount === 0) {
    return false;
  }

  const routeShare = routeFriendlyCount / sampleCount;
  if (routeShare < MIN_ROUTE_SIGNAL_SHARE) {
    return false;
  }

  return !(from.x === to.x && from.y === to.y);
}

function getRailTileAtPoint(
  x: number,
  y: number,
  connections: RailConnection[]
): TileLike | null {
  for (const connection of connections) {
    const pointIndex = connection.points.findIndex(
      (point) => point.x === x && point.y === y
    );
    if (pointIndex === -1) {
      continue;
    }
    const terminal =
      (x === connection.from.x && y === connection.from.y) ||
      (x === connection.to.x && y === connection.to.y);
    if (terminal) {
      return null;
    }
    return {
      kind: 'rail',
      note: `Curved rails link ${connection.from.name} and ${connection.to.name}.`,
      railConnection: {
        from: connection.from.name,
        to: connection.to.name,
        segmentIndex: pointIndex,
      },
    };
  }

  return null;
}

function buildRailRegionTileMap({
  seed,
  x,
  y,
  sampleTerrainSignals,
}: {
  seed: Seed;
  x: number;
  y: number;
  sampleTerrainSignals: SampleTerrainSignalsLike;
}): Map<string, TileLike> {
  const stations = collectNearbyStationAnchors(seed, x, y, sampleTerrainSignals);
  const connections = buildRailConnections({
    seed,
    stationAnchors: stations,
    sampleTerrainSignals,
  });
  const tileMap = new Map<string, TileLike>();

  for (const connection of connections) {
    connection.points.forEach((point, index) => {
      const tile = getRailTileAtPoint(point.x, point.y, [connection]);
      if (!tile) {
        return;
      }
      tileMap.set(`${point.x},${point.y}`, tile);
      if (index === 0 || index === connection.points.length - 1) {
        tileMap.delete(`${point.x},${point.y}`);
      }
    });
  }

  return tileMap;
}

function resolveRailTrainPlacement(
  seed: Seed,
  timeMs: number,
  connection: RailConnection,
  index: number
): RailTrainPlacement | null {
  if (connection.points.length < 3) {
    return null;
  }

  const routeLength = connection.points.length - 1;
  const dwelllessDurationMs =
    Math.max(6, Math.min(18, Math.round(routeLength / 3))) * 60 * 1000;
  const phaseOffset = hash2D(`${seed}:rail-train-phase`, index, routeLength);
  const loopProgress = ((timeMs + dwelllessDurationMs * phaseOffset) % dwelllessDurationMs) /
    dwelllessDurationMs;
  const triangularProgress =
    loopProgress <= 0.5 ? loopProgress * 2 : (1 - loopProgress) * 2;
  const direction = loopProgress <= 0.5 ? 'forward' : 'backward';
  const pointIndex = Math.min(
    routeLength - 1,
    Math.max(1, Math.round(triangularProgress * routeLength))
  );
  const point = connection.points[pointIndex];
  if (!point) {
    return null;
  }

  return {
    x: point.x,
    y: point.y,
    progress: triangularProgress,
    direction,
    lineName: `${connection.from.name} Line`,
    from: connection.from.name,
    to: connection.to.name,
  };
}
