import {
  createBoundedCache,
  createCoordinateCache,
  type BoundedCache,
  type CoordinateCache,
} from '@bworlds/cache-support';
import {
  appendHashSeedPart,
  hash2D,
  registerHashLabel,
} from '@bworlds/core/hash';
import type { WorldStateLike } from '@bworlds/plugin-api';

type Point = { x: number; y: number };
const DOCK_BOAT_PHASE_SEED = registerHashLabel('dock-boat-phase');

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
  segmentProgress: number;
  direction: 'forward';
  boatName: string;
  from: string;
  to: string;
  whistlePhase?: 'arrival' | 'departure';
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

type RouteSearchNode = {
  x: number;
  y: number;
  distance: number;
  key: string;
  parent: RouteSearchNode | null;
};
type SurveyedRange = {
  startX: number;
  endX: number;
};
type DockClusterSurveyState = {
  surveyedRows: Map<number, SurveyedRange[]>;
  clusters: Map<string, DockCluster>;
  tileToClusterKey: CoordinateCache<string>;
};

const DEFAULT_SEARCH_RADIUS = 72;
const MIN_ROUTE_DISTANCE = 20;
const MAX_ROUTE_DISTANCE = 60;
const MAX_ROUTE_STOPS = 5;
const DOCK_STOP_SEARCH_RADIUS = 12;
const PADDLE_BOAT_TIME_BUCKET_MS = 2_000;
const DOCK_WHISTLE_WINDOW = 0.08;
const DOCK_ROUTE_CACHE_LIMIT = 256;
const DOCK_ROUTE_PREFIX_SEED = registerHashLabel('dock-route-prefix');
const DOCK_ROUTE_SUFFIX_SEED = registerHashLabel('dock-route-suffix');
const routeCache = new WeakMap<
  WorldStateLike,
  BoundedCache<string, DockBoatRoute | null>
>();
const routeGeometryCache = new WeakMap<
  WorldStateLike,
  BoundedCache<string, DockRouteGeometry | null>
>();
const dockClusterSurveyCache = new WeakMap<
  WorldStateLike,
  DockClusterSurveyState
>();
const CARDINAL_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

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
    stateCache = createBoundedCache<string, DockBoatRoute | null>(
      DOCK_ROUTE_CACHE_LIMIT
    );
    routeCache.set(state, stateCache);
  }
  return stateCache.getOrCreate(cacheKey, () => {
    const clusters = collectDockClusters(
      state,
      cluster.anchorX,
      cluster.anchorY,
      searchRadius
    );
    return buildDockBoatRoute(clusters, cluster.key);
  });
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
    const route = resolveDockBoatRoute(
      state,
      cluster.anchorX,
      cluster.anchorY,
      searchRadius
    );
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

  return placements.sort(
    (left, right) =>
      left.y - right.y ||
      left.x - right.x ||
      left.boatName.localeCompare(right.boatName)
  );
}

export function getDockBoatPhaseSeed(
  route: Pick<DockBoatRoute, 'stops'>
): number {
  let seed = DOCK_BOAT_PHASE_SEED;
  for (let index = 0; index < route.stops.length; index += 1) {
    const stop = route.stops[index];
    if (!stop) {
      continue;
    }
    seed = appendHashSeedPart(seed, index);
    seed = appendHashSeedPart(seed, stop.x);
    seed = appendHashSeedPart(seed, stop.y);
  }
  return seed;
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
      if (
        backEdge &&
        hasUniquePathCoverage(stack, currentClusterKey, edgeMap)
      ) {
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
    boatName: generateBoatRouteName(
      currentCluster.anchorX,
      currentCluster.anchorY
    ),
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

function createRouteScore(
  route: string[],
  edgeMap: Map<string, DockEdge>
): string {
  const pathDistance = getRouteDistance(route, edgeMap);
  const stopScore = String(MAX_ROUTE_STOPS - route.length).padStart(2, '0');
  const distanceScore = String(pathDistance).padStart(4, '0');
  return `${stopScore}:${distanceScore}:${route.join('|')}`;
}

function getRouteDistance(
  route: string[],
  edgeMap: Map<string, DockEdge>
): number {
  let total = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    total += edgeMap.get(`${route[index]}->${route[index + 1]}`)?.distance ?? 0;
  }
  if (route.length > 2) {
    total +=
      edgeMap.get(`${route[route.length - 1]}->${route[0]}`)?.distance ?? 0;
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
    for (
      let otherIndex = index + 1;
      otherIndex < clusters.length;
      otherIndex += 1
    ) {
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
  const blocked = createCoordinateCache<boolean>();
  const queue: RouteSearchNode[] = [];
  const sourceKeys = createCoordinateCache<boolean>();
  const targetKeys = createCoordinateCache<boolean>();
  for (const tile of from.tiles) {
    sourceKeys.set(tile.x, tile.y, true);
  }
  for (const tile of to.tiles) {
    targetKeys.set(tile.x, tile.y, true);
  }

  for (const edgeTile of from.edgeTiles) {
    const key = toPointKey(edgeTile.x, edgeTile.y);
    queue.push({
      x: edgeTile.x,
      y: edgeTile.y,
      distance: 0,
      key,
      parent: null,
    });
    blocked.set(edgeTile.x, edgeTile.y, true);
  }

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex]!;
    queueIndex += 1;
    if (current.distance > MAX_ROUTE_DISTANCE) {
      continue;
    }
    if (
      current.distance >= MIN_ROUTE_DISTANCE &&
      targetKeys.has(current.x, current.y)
    ) {
      const pathKeys = new Set<string>();
      const pathPoints: Point[] = [];
      let cursor = current.parent;
      while (cursor) {
        if (!targetKeys.has(cursor.x, cursor.y)) {
          pathKeys.add(cursor.key);
          pathPoints.push({ x: cursor.x, y: cursor.y });
        }
        cursor = cursor.parent;
      }
      pathPoints.reverse();
      return { distance: current.distance, pathKeys, pathPoints };
    }

    for (
      let directionIndex = 0;
      directionIndex < CARDINAL_DIRECTIONS.length;
      directionIndex += 1
    ) {
      const direction = CARDINAL_DIRECTIONS[directionIndex]!;
      const neighborX = current.x + direction.x;
      const neighborY = current.y + direction.y;
      const neighborKey = toPointKey(neighborX, neighborY);
      if (
        blocked.has(neighborX, neighborY) ||
        sourceKeys.has(neighborX, neighborY)
      ) {
        continue;
      }
      const kind = state.getCurrentTile(neighborX, neighborY).kind;
      if (!isBoatTravelKind(kind)) {
        continue;
      }
      blocked.set(neighborX, neighborY, true);
      queue.push({
        x: neighborX,
        y: neighborY,
        distance: current.distance + 1,
        key: neighborKey,
        parent: current,
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
  const minX = centerX - searchRadius;
  const maxX = centerX + searchRadius;
  const minY = centerY - searchRadius;
  const maxY = centerY + searchRadius;
  const survey = getDockClusterSurveyState(state);

  for (let y = minY; y <= maxY; y += 1) {
    const surveyedRanges = survey.surveyedRows.get(y) ?? [];
    const unsurveyedRanges = getUnsurveyedRanges(surveyedRanges, minX, maxX);

    for (
      let rangeIndex = 0;
      rangeIndex < unsurveyedRanges.length;
      rangeIndex += 1
    ) {
      const range = unsurveyedRanges[rangeIndex]!;
      for (let x = range.startX; x <= range.endX; x += 1) {
        if (
          survey.tileToClusterKey.has(x, y) ||
          state.getCurrentTile(x, y).kind !== 'dock'
        ) {
          continue;
        }
        const cluster = getDockClusterFromTile(state, x, y);
        survey.clusters.set(cluster.key, cluster);
        for (
          let tileIndex = 0;
          tileIndex < cluster.tiles.length;
          tileIndex += 1
        ) {
          const tile = cluster.tiles[tileIndex]!;
          survey.tileToClusterKey.set(tile.x, tile.y, cluster.key);
        }
      }
      addSurveyedRange(survey.surveyedRows, y, range.startX, range.endX);
    }
  }

  return [...survey.clusters.values()]
    .filter((cluster) =>
      cluster.tiles.some(
        (tile) =>
          tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY
      )
    )
    .sort((left, right) =>
      left.anchorY === right.anchorY
        ? left.anchorX - right.anchorX
        : left.anchorY - right.anchorY
    );
}

function getDockClusterSurveyState(
  state: WorldStateLike
): DockClusterSurveyState {
  let survey = dockClusterSurveyCache.get(state);
  if (!survey) {
    survey = {
      surveyedRows: new Map(),
      clusters: new Map(),
      tileToClusterKey: createCoordinateCache<string>(),
    };
    dockClusterSurveyCache.set(state, survey);
  }
  return survey;
}

function getUnsurveyedRanges(
  ranges: SurveyedRange[],
  minX: number,
  maxX: number
): SurveyedRange[] {
  if (ranges.length === 0) {
    return [{ startX: minX, endX: maxX }];
  }

  const unsurveyed: SurveyedRange[] = [];
  let cursor = minX;
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]!;
    if (range.endX < cursor) {
      continue;
    }
    if (range.startX > maxX) {
      break;
    }
    if (range.startX > cursor) {
      unsurveyed.push({
        startX: cursor,
        endX: Math.min(maxX, range.startX - 1),
      });
    }
    cursor = Math.max(cursor, range.endX + 1);
    if (cursor > maxX) {
      break;
    }
  }

  if (cursor <= maxX) {
    unsurveyed.push({ startX: cursor, endX: maxX });
  }

  return unsurveyed;
}

function addSurveyedRange(
  surveyedRows: Map<number, SurveyedRange[]>,
  y: number,
  startX: number,
  endX: number
): void {
  const ranges = surveyedRows.get(y) ?? [];
  const merged: SurveyedRange[] = [];
  let nextRange = { startX, endX };
  let inserted = false;

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]!;
    if (range.endX + 1 < nextRange.startX) {
      merged.push(range);
      continue;
    }
    if (nextRange.endX + 1 < range.startX) {
      if (!inserted) {
        merged.push(nextRange);
        inserted = true;
      }
      merged.push(range);
      continue;
    }
    nextRange = {
      startX: Math.min(nextRange.startX, range.startX),
      endX: Math.max(nextRange.endX, range.endX),
    };
  }

  if (!inserted) {
    merged.push(nextRange);
  }

  surveyedRows.set(y, merged);
}

function getDockClusterFromTile(
  state: WorldStateLike,
  tileX: number,
  tileY: number
): DockCluster {
  const queue = [{ x: tileX, y: tileY }];
  const visited = createCoordinateCache<boolean>();
  visited.set(tileX, tileY, true);
  const tiles: Point[] = [];

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex]!;
    queueIndex += 1;
    tiles.push({ x: current.x, y: current.y });
    for (
      let directionIndex = 0;
      directionIndex < CARDINAL_DIRECTIONS.length;
      directionIndex += 1
    ) {
      const direction = CARDINAL_DIRECTIONS[directionIndex]!;
      const neighborX = current.x + direction.x;
      const neighborY = current.y + direction.y;
      if (
        visited.has(neighborX, neighborY) ||
        state.getCurrentTile(neighborX, neighborY).kind !== 'dock'
      ) {
        continue;
      }
      visited.set(neighborX, neighborY, true);
      queue.push({ x: neighborX, y: neighborY });
    }
  }

  tiles.sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y
  );
  const anchor = tiles[0]!;
  const edgeTiles: Point[] = [];
  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index]!;
    let isEdgeTile = false;
    for (
      let directionIndex = 0;
      directionIndex < CARDINAL_DIRECTIONS.length;
      directionIndex += 1
    ) {
      const direction = CARDINAL_DIRECTIONS[directionIndex]!;
      if (
        isBoatTravelKind(
          state.getCurrentTile(tile.x + direction.x, tile.y + direction.y).kind
        )
      ) {
        isEdgeTile = true;
        break;
      }
    }
    if (isEdgeTile) {
      edgeTiles.push(tile);
    }
  }
  const stopName =
    findNearestDockStopName(state, tiles) ?? `Dock ${anchor.x},${anchor.y}`;

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

  for (
    let y = anchor.y - DOCK_STOP_SEARCH_RADIUS;
    y <= anchor.y + DOCK_STOP_SEARCH_RADIUS;
    y += 1
  ) {
    for (
      let x = anchor.x - DOCK_STOP_SEARCH_RADIUS;
      x <= anchor.x + DOCK_STOP_SEARCH_RADIUS;
      x += 1
    ) {
      const tile = state.getCurrentTile(x, y);
      const poiName = typeof tile.poi?.name === 'string' ? tile.poi.name : null;
      if (!poiName) {
        continue;
      }
      let distance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < tiles.length; index += 1) {
        const dockTile = tiles[index]!;
        const candidateDistance = Math.hypot(x - dockTile.x, y - dockTile.y);
        if (candidateDistance < distance) {
          distance = candidateDistance;
        }
      }
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && poiName < best.name)
      ) {
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
    prefixes[
      Math.floor(
        hash2D(DOCK_ROUTE_PREFIX_SEED, anchorX, anchorY) * prefixes.length
      )
    ] ?? prefixes[0]!;
  const suffix =
    suffixes[
      Math.floor(
        hash2D(DOCK_ROUTE_SUFFIX_SEED, anchorX, anchorY) * suffixes.length
      )
    ] ?? suffixes[0]!;
  return `${prefix} ${suffix}`;
}

function resolveDockBoatPlacement(
  state: WorldStateLike,
  timeMs: number,
  route: DockBoatRoute
): DockBoatPlacement | null {
  const geometry = getDockBoatRouteGeometry(state, route);
  if (
    !geometry ||
    geometry.points.length === 0 ||
    geometry.segments.length === 0
  ) {
    return null;
  }

  const loopDurationMs =
    Math.max(12, Math.min(30, Math.round(geometry.points.length / 4))) *
    60 *
    1000;
  const phaseOffset =
    hash2D(
      getDockBoatPhaseSeed(route),
      route.stops[0]?.x ?? 0,
      route.stops[0]?.y ?? 0
    ) * loopDurationMs;
  const timeBucketStart =
    Math.floor(timeMs / PADDLE_BOAT_TIME_BUCKET_MS) *
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

  const segmentLength = Math.max(1, activeSegment.path.length);
  const segmentProgress = remainingIndex / segmentLength;
  const whistlePhase = resolveDockBoatWhistlePhase(segmentProgress);

  return {
    x: point.x,
    y: point.y,
    progress: loopProgress,
    segmentProgress,
    direction: 'forward',
    boatName: route.boatName,
    from: activeSegment.from.name,
    to: activeSegment.to.name,
    whistlePhase,
  };
}

function getDockBoatRouteGeometry(
  state: WorldStateLike,
  route: DockBoatRoute
): DockRouteGeometry | null {
  let stateCache = routeGeometryCache.get(state);
  if (!stateCache) {
    stateCache = createBoundedCache<string, DockRouteGeometry | null>(
      DOCK_ROUTE_CACHE_LIMIT
    );
    routeGeometryCache.set(state, stateCache);
  }
  const routeKey = getCanonicalRouteKey(route);
  return stateCache.getOrCreate(routeKey, () => {
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
        return null;
      }
      segments.push({
        from,
        to,
        path: path.pathPoints,
      });
    }

    return {
      segments,
      points: segments.flatMap((segment) => segment.path),
    };
  });
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

function resolveDockBoatWhistlePhase(
  segmentProgress: number
): 'arrival' | 'departure' | undefined {
  if (segmentProgress <= DOCK_WHISTLE_WINDOW) {
    return 'departure';
  }
  if (segmentProgress >= 1 - DOCK_WHISTLE_WINDOW) {
    return 'arrival';
  }
  return undefined;
}
