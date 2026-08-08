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
};

const DEFAULT_SEARCH_RADIUS = 72;
const MIN_ROUTE_DISTANCE = 20;
const MAX_ROUTE_DISTANCE = 60;
const MAX_ROUTE_STOPS = 5;
const DOCK_STOP_SEARCH_RADIUS = 12;
const routeCache = new WeakMap<WorldStateLike, Map<string, DockBoatRoute | null>>();

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

  for (const neighborKey of currentNeighbors) {
    candidates.push({
      route: [currentClusterKey, neighborKey],
      score: createRouteScore([currentClusterKey, neighborKey], edgeMap),
    });
  }

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
      });
    }
  }
  return edges;
}

function findOceanRouteBetweenClusters(
  state: WorldStateLike,
  from: DockCluster,
  to: DockCluster
): { distance: number; pathKeys: Set<string> } | null {
  const blocked = new Set<string>();
  const queue: Array<{ x: number; y: number; distance: number; path: string[] }> = [];
  const sourceKeys = new Set(from.tiles.map((tile) => toPointKey(tile.x, tile.y)));
  const targetKeys = new Set(to.tiles.map((tile) => toPointKey(tile.x, tile.y)));

  for (const edgeTile of from.edgeTiles) {
    queue.push({
      x: edgeTile.x,
      y: edgeTile.y,
      distance: 0,
      path: [],
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
        pathKeys: new Set(current.path),
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
      queue.push({
        x: neighbor.x,
        y: neighbor.y,
        distance: current.distance + 1,
        path: targetKeys.has(neighborKey)
          ? current.path
          : [...current.path, neighborKey],
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
