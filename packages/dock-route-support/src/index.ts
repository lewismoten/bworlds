import { hash2D } from '@bworlds/core';
import type { WorldStateLike } from '@bworlds/plugin-api';

type Point = { x: number; y: number };

export type DockRouteStop = {
  x: number;
  y: number;
  name: string;
};

export type DockBoatRoute = {
  boatName: string;
  currentStopIndex: number;
  stops: DockRouteStop[];
};

export type DockBoatPlacement = {
  x: number;
  y: number;
  progress: number;
  direction: 'forward';
  boatName: string;
  from: string;
  to: string;
};

type DockCluster = {
  state: WorldStateLike;
  key: string;
  anchorX: number;
  anchorY: number;
  tiles: Point[];
  edgeTiles: Point[];
  stopName: string;
};

type DockEdge = {
  from: string;
  to: string;
  distance: number;
  pathKeys: Set<string>;
  pathPoints: Point[];
};

type DockRouteSegment = {
  from: DockRouteStop;
  to: DockRouteStop;
  path: Point[];
};

type DockRouteGeometry = {
  points: Point[];
  segments: DockRouteSegment[];
};

const DEFAULT_SEARCH_RADIUS = 72;
const MIN_ROUTE_DISTANCE = 20;
const MAX_ROUTE_DISTANCE = 60;
const MAX_ROUTE_STOPS = 5;
const DOCK_STOP_SEARCH_RADIUS = 12;
const PADDLE_BOAT_TIME_BUCKET_MS = 2_000;
const routeCache = new WeakMap<WorldStateLike, Map<string, DockBoatRoute | null>>();
const routeGeometryCache = new WeakMap<
  WorldStateLike,
  Map<string, DockRouteGeometry | null>
>();

export function resolveDockBoatRoute(
  state: WorldStateLike,
  dockX: number,
  dockY: number,
  searchRadius = DEFAULT_SEARCH_RADIUS
): DockBoatRoute | null {
  if (state.getCurrentContext().type !== 'overworld') {
    return null;
  }
  if (state.getCurrentTile(dockX, dockY).kind !== 'dock') {
    return null;
  }

  const cluster = getDockClusterFromTile(state, dockX, dockY);
  const cacheKey = `${state.getCurrentContext().id}:${cluster.key}:${searchRadius}`;
  let stateCache = routeCache.get(state);
  if (!stateCache) {
    stateCache = new Map();
    routeCache.set(state, stateCache);
  }
  if (stateCache.has(cacheKey)) {
    return stateCache.get(cacheKey) ?? null;
  }

  const clusters = collectDockClusters(state, cluster.anchorX, cluster.anchorY, searchRadius);
  const route = buildDockBoatRoute(clusters, cluster.key);
  stateCache.set(cacheKey, route);
  return route;
}

export function getDockBoatPlacements(
  state: WorldStateLike,
  timeMs: number,
  centerX: number,
  centerY: number,
  searchRadius = DEFAULT_SEARCH_RADIUS
): DockBoatPlacement[] {
  if (state.getCurrentContext().type !== 'overworld') {
    return [];
  }

  const clusters = collectDockClusters(state, centerX, centerY, searchRadius);
  const placements: DockBoatPlacement[] = [];
  const seenRoutes = new Set<string>();

  for (const cluster of clusters) {
    const route = resolveDockBoatRoute(state, cluster.anchorX, cluster.anchorY, searchRadius);
    if (!route) {
      continue;
    }
    const routeKey = getCanonicalRouteKey(route);
    if (seenRoutes.has(routeKey)) {
      continue;
    }
    seenRoutes.add(routeKey);
    const placement = resolveDockBoatPlacement(state, timeMs, route);
    if (placement) {
      placements.push(placement);
    }
  }

  return placements.sort((left, right) =>
    left.y - right.y ||
    left.x - right.x ||
    left.boatName.localeCompare(right.boatName)
  );
}

function buildDockBoatRoute(
  clusters: DockCluster[],
  currentClusterKey: string
): DockBoatRoute | null {
  const clusterMap = new Map(clusters.map((cluster) => [cluster.key, cluster]));
  const currentCluster = clusterMap.get(currentClusterKey);
  if (!currentCluster) {
    return null;
  }

  const edges = collectDockEdges(clusters, currentCluster.state);
  const edgeMap = new Map<string, DockEdge>();
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const forwardKey = `${edge.from}->${edge.to}`;
    const reverseKey = `${edge.to}->${edge.from}`;
    edgeMap.set(forwardKey, edge);
    edgeMap.set(reverseKey, {
      ...edge,
      from: edge.to,
      to: edge.from,
    });
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  }

  const currentNeighbors = [...(adjacency.get(currentClusterKey) ?? [])].sort();
  const candidates: Array<{ route: string[]; score: string }> = [];

  const visited = new Set<string>([currentClusterKey]);
  const stack = [currentClusterKey];

  function walk(): void {
    const currentKey = stack[stack.length - 1]!;
    if (stack.length >= 3) {
      const backEdge = edgeMap.get(`${currentKey}->${currentClusterKey}`);
      if (backEdge && hasUniquePathCoverage(stack, currentClusterKey, edgeMap)) {
        candidates.push({
          route: [...stack],
          score: createRouteScore(stack, edgeMap),
        });
      }
    }
    if (stack.length >= MAX_ROUTE_STOPS) {
      return;
    }

    const neighbors = [...(adjacency.get(currentKey) ?? [])].sort();
    for (const neighborKey of neighbors) {
      if (neighborKey === currentClusterKey || visited.has(neighborKey)) {
        continue;
      }
      stack.push(neighborKey);
      visited.add(neighborKey);
      walk();
      visited.delete(neighborKey);
      stack.pop();
    }
  }

  walk();

  if (currentNeighbors.length === 0) {
    return null;
  }

  candidates.sort((left, right) =>
    left.score < right.score ? -1 : left.score > right.score ? 1 : 0
  );
  const best = candidates[0];
  if (!best) {
    return null;
  }

  return {
    boatName: generateBoatRouteName(currentCluster.anchorX, currentCluster.anchorY),
    currentStopIndex: 0,
    stops: best.route
      .map((clusterKey) => clusterMap.get(clusterKey))
      .filter((cluster): cluster is DockCluster => Boolean(cluster))
      .map((cluster) => ({
        x: cluster.anchorX,
        y: cluster.anchorY,
        name: cluster.stopName,
      })),
  };
}

function createRouteScore(route: string[], edgeMap: Map<string, DockEdge>): string {
  const pathDistance = getRouteDistance(route, edgeMap);
  const stopScore = String(MAX_ROUTE_STOPS - route.length).padStart(2, '0');
  const distanceScore = String(pathDistance).padStart(4, '0');
  return `${stopScore}:${distanceScore}:${route.join('|')}`;
}

function getRouteDistance(route: string[], edgeMap: Map<string, DockEdge>): number {
  let total = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    total += edgeMap.get(`${route[index]}->${route[index + 1]}`)?.distance ?? 0;
  }
  if (route.length > 2) {
    total += edgeMap.get(`${route[route.length - 1]}->${route[0]}`)?.distance ?? 0;
  }
  return total;
}

function hasUniquePathCoverage(
  route: string[],
  currentClusterKey: string,
  edgeMap: Map<string, DockEdge>
): boolean {
  const used = new Set<string>();
  for (let index = 0; index < route.length; index += 1) {
    const from = route[index]!;
    const to = route[(index + 1) % route.length] ?? currentClusterKey;
    if (route.length === 2 && index === route.length - 1) {
      continue;
    }
    const edge = edgeMap.get(`${from}->${to}`);
    if (!edge) {
      return false;
    }
    for (const key of edge.pathKeys) {
      if (used.has(key)) {
        return false;
      }
      used.add(key);
    }
  }
  return true;
}

function collectDockEdges(
  clusters: DockCluster[],
  state: WorldStateLike
): DockEdge[] {
  const edges: DockEdge[] = [];
  for (let index = 0; index < clusters.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < clusters.length; otherIndex += 1) {
      const left = clusters[index]!;
      const right = clusters[otherIndex]!;
      const path = findOceanRouteBetweenClusters(state, left, right);
      if (!path) {
        continue;
      }
      edges.push({
        from: left.key,
        to: right.key,
        distance: path.distance,
        pathKeys: path.pathKeys,
        pathPoints: path.pathPoints,
      });
    }
  }
  return edges;
}

function findOceanRouteBetweenClusters(
  state: WorldStateLike,
  from: DockCluster,
  to: DockCluster
): { distance: number; pathKeys: Set<string>; pathPoints: Point[] } | null {
  const blocked = new Set<string>();
  const queue: Array<{
    x: number;
    y: number;
    distance: number;
    pathKeys: string[];
    pathPoints: Point[];
  }> = [];
  const sourceKeys = new Set(from.tiles.map((tile) => toPointKey(tile.x, tile.y)));
  const targetKeys = new Set(to.tiles.map((tile) => toPointKey(tile.x, tile.y)));

  for (const edgeTile of from.edgeTiles) {
    queue.push({
      x: edgeTile.x,
      y: edgeTile.y,
      distance: 0,
      pathKeys: [],
      pathPoints: [],
    });
    blocked.add(toPointKey(edgeTile.x, edgeTile.y));
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.distance > MAX_ROUTE_DISTANCE) {
      continue;
    }
    const currentKey = toPointKey(current.x, current.y);
    if (current.distance >= MIN_ROUTE_DISTANCE && targetKeys.has(currentKey)) {
      return {
        distance: current.distance,
        pathKeys: new Set(current.pathKeys),
        pathPoints: current.pathPoints,
      };
    }

    for (const neighbor of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      const neighborKey = toPointKey(neighbor.x, neighbor.y);
      if (blocked.has(neighborKey) || sourceKeys.has(neighborKey)) {
        continue;
      }
      const kind = state.getCurrentTile(neighbor.x, neighbor.y).kind;
      if (!isBoatTravelKind(kind)) {
        continue;
      }
      blocked.add(neighborKey);
      const reachesTarget = targetKeys.has(neighborKey);
      queue.push({
        x: neighbor.x,
        y: neighbor.y,
        distance: current.distance + 1,
        pathKeys: reachesTarget ? current.pathKeys : [...current.pathKeys, neighborKey],
        pathPoints: reachesTarget
          ? current.pathPoints
          : [...current.pathPoints, { x: neighbor.x, y: neighbor.y }],
      });
    }
  }

  return null;
}

function collectDockClusters(
  state: WorldStateLike,
  centerX: number,
  centerY: number,
  searchRadius: number
): DockCluster[] {
  const visited = new Set<string>();
  const clusters: DockCluster[] = [];
  for (let y = centerY - searchRadius; y <= centerY + searchRadius; y += 1) {
    for (let x = centerX - searchRadius; x <= centerX + searchRadius; x += 1) {
      const key = toPointKey(x, y);
      if (visited.has(key) || state.getCurrentTile(x, y).kind !== 'dock') {
        continue;
      }
      const cluster = getDockClusterFromTile(state, x, y);
      cluster.tiles.forEach((tile) => {
        visited.add(toPointKey(tile.x, tile.y));
      });
      clusters.push(cluster);
    }
  }
  return clusters.sort((left, right) =>
    left.anchorY === right.anchorY
      ? left.anchorX - right.anchorX
      : left.anchorY - right.anchorY
  );
}

function getDockClusterFromTile(
  state: WorldStateLike,
  tileX: number,
  tileY: number
): DockCluster {
  const queue = [{ x: tileX, y: tileY }];
  const visited = new Set([toPointKey(tileX, tileY)]);
  const tiles: Point[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    tiles.push({ x: current.x, y: current.y });
    for (const neighbor of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      const key = toPointKey(neighbor.x, neighbor.y);
      if (visited.has(key) || state.getCurrentTile(neighbor.x, neighbor.y).kind !== 'dock') {
        continue;
      }
      visited.add(key);
      queue.push(neighbor);
    }
  }

  tiles.sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y
  );
  const anchor = tiles[0]!;
  const edgeTiles = tiles.filter((tile) =>
    [
      state.getCurrentTile(tile.x + 1, tile.y).kind,
      state.getCurrentTile(tile.x - 1, tile.y).kind,
      state.getCurrentTile(tile.x, tile.y + 1).kind,
      state.getCurrentTile(tile.x, tile.y - 1).kind,
    ].some((kind) => isBoatTravelKind(kind))
  );
  const stopName = findNearestDockStopName(state, tiles) ?? `Dock ${anchor.x},${anchor.y}`;

  return {
    key: `${anchor.x}:${anchor.y}`,
    anchorX: anchor.x,
    anchorY: anchor.y,
    state,
    tiles,
    edgeTiles,
    stopName,
  };
}

function findNearestDockStopName(
  state: WorldStateLike,
  tiles: Point[]
): string | null {
  let best: { name: string; distance: number } | null = null;
  const [anchor] = tiles;
  if (!anchor) {
    return null;
  }

  for (let y = anchor.y - DOCK_STOP_SEARCH_RADIUS; y <= anchor.y + DOCK_STOP_SEARCH_RADIUS; y += 1) {
    for (let x = anchor.x - DOCK_STOP_SEARCH_RADIUS; x <= anchor.x + DOCK_STOP_SEARCH_RADIUS; x += 1) {
      const tile = state.getCurrentTile(x, y);
      const poiName = typeof tile.poi?.name === 'string' ? tile.poi.name : null;
      if (!poiName) {
        continue;
      }
      const distance = Math.min(
        ...tiles.map((dockTile) => Math.hypot(x - dockTile.x, y - dockTile.y))
      );
      if (!best || distance < best.distance || (distance === best.distance && poiName < best.name)) {
        best = { name: poiName, distance };
      }
    }
  }

  return best?.name ?? null;
}

function isBoatTravelKind(kind: string): boolean {
  return kind === 'ocean' || kind === 'bridge' || kind === 'dock';
}

function toPointKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function generateBoatRouteName(anchorX: number, anchorY: number): string {
  const prefixes = ['Harbor', 'Compass', 'Mast', 'Lantern', 'Tide', 'Mariner'];
  const suffixes = ['Circle', 'Circuit', 'Run', 'Line', 'Loop', 'Crown'];
  const prefix =
    prefixes[Math.floor(hash2D('dock-route-prefix', anchorX, anchorY) * prefixes.length)] ??
    prefixes[0]!;
  const suffix =
    suffixes[Math.floor(hash2D('dock-route-suffix', anchorX, anchorY) * suffixes.length)] ??
    suffixes[0]!;
  return `${prefix} ${suffix}`;
}

function resolveDockBoatPlacement(
  state: WorldStateLike,
  timeMs: number,
  route: DockBoatRoute
): DockBoatPlacement | null {
  const geometry = getDockBoatRouteGeometry(state, route);
  if (!geometry || geometry.points.length === 0 || geometry.segments.length === 0) {
    return null;
  }

  const loopDurationMs =
    Math.max(12, Math.min(30, Math.round(geometry.points.length / 4))) * 60 * 1000;
  const phaseOffset =
    hash2D(
      `dock-boat-phase:${route.boatName}`,
      route.stops[0]?.x ?? 0,
      route.stops[0]?.y ?? 0
    ) * loopDurationMs;
  const timeBucketStart = Math.floor(timeMs / PADDLE_BOAT_TIME_BUCKET_MS) *
    PADDLE_BOAT_TIME_BUCKET_MS;
  const loopProgress =
    ((((timeBucketStart + phaseOffset) % loopDurationMs) + loopDurationMs) %
      loopDurationMs) /
    loopDurationMs;
  const pointIndex = Math.min(
    geometry.points.length - 1,
    Math.floor(loopProgress * geometry.points.length)
  );
  const point = geometry.points[pointIndex];
  if (!point) {
    return null;
  }

  let remainingIndex = pointIndex;
  let activeSegment = geometry.segments[0]!;
  for (const segment of geometry.segments) {
    if (remainingIndex < segment.path.length) {
      activeSegment = segment;
      break;
    }
    remainingIndex -= segment.path.length;
  }

  return {
    x: point.x,
    y: point.y,
    progress: loopProgress,
    direction: 'forward',
    boatName: route.boatName,
    from: activeSegment.from.name,
    to: activeSegment.to.name,
  };
}

function getDockBoatRouteGeometry(
  state: WorldStateLike,
  route: DockBoatRoute
): DockRouteGeometry | null {
  let stateCache = routeGeometryCache.get(state);
  if (!stateCache) {
    stateCache = new Map();
    routeGeometryCache.set(state, stateCache);
  }
  const routeKey = getCanonicalRouteKey(route);
  if (stateCache.has(routeKey)) {
    return stateCache.get(routeKey) ?? null;
  }

  const segments: DockRouteSegment[] = [];
  for (let index = 0; index < route.stops.length; index += 1) {
    const from = route.stops[index]!;
    const to = route.stops[(index + 1) % route.stops.length];
    if (!to) {
      continue;
    }
    const fromCluster = getDockClusterFromTile(state, from.x, from.y);
    const toCluster = getDockClusterFromTile(state, to.x, to.y);
    const path = findOceanRouteBetweenClusters(state, fromCluster, toCluster);
    if (!path || path.pathPoints.length === 0) {
      stateCache.set(routeKey, null);
      return null;
    }
    segments.push({
      from,
      to,
      path: path.pathPoints,
    });
  }

  const geometry = {
    segments,
    points: segments.flatMap((segment) => segment.path),
  };
  stateCache.set(routeKey, geometry);
  return geometry;
}

function getCanonicalRouteKey(route: DockBoatRoute): string {
  const stopKeys = route.stops.map((stop) => `${stop.x}:${stop.y}`);
  if (stopKeys.length === 0) {
    return route.boatName;
  }
  const forwardRotations = stopKeys.map((_, index) =>
    [...stopKeys.slice(index), ...stopKeys.slice(0, index)].join('|')
  );
  const reversed = [...stopKeys].reverse();
  const reverseRotations = reversed.map((_, index) =>
    [...reversed.slice(index), ...reversed.slice(0, index)].join('|')
  );
  return [...forwardRotations, ...reverseRotations].sort()[0] ?? route.boatName;
}
