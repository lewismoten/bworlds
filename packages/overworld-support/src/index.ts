import {
  createBoundedCache,
  createCoordinateCache,
  type CoordinateCache,
  type CacheLike,
} from '@bworlds/cache-support';
import {
  appendHashSeedPart,
  clamp,
  createHashSeed,
  generatePoiName,
  hash2D,
  hash2DWithSeed,
  octaveNoise2D,
  ridgedNoise2D,
  type PoiNameType,
} from '@bworlds/core';
import type {
  ClassifyOverworldTileContext,
  DecorateOverworldTileContext,
  OverworldAnchorLike,
  OverworldAnchorSet,
  PoiAnchorLike,
  OverworldSignals,
  PluginRegistryLike,
  ResolveOverworldAnchorsContext,
  Seed,
  TileLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

export type OverworldTerrainSignalSampler = (
  x: number,
  y: number
) => OverworldSignals;

export type RiverControlPoint = {
  x: number;
  y: number;
};

export type RiverForkPath = {
  trunkStartIndex: number;
  trunkEndIndex: number;
  trunkAngle: number;
  points: RiverControlPoint[];
};

type OverworldCellAnchorEvaluation<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
> = {
  candidate: OverworldCellAnchorCandidate<TAnchor>;
  terrain: OverworldSignals;
  terrainSuitable: boolean;
};

const RIVER_CONTROL_CELL_SIZE = 24;
const RIVER_MIN_CONTROL_STEP = 2;
const RIVER_MAX_CONTROL_STEP = 10;
const RIVER_MAX_CONTROL_POINTS = 5;
const RIVER_SEGMENT_FALLOFF = 2.35;
const RIVER_CURVE_SEGMENTS = 6;
const RIVER_FORK_MIN_POINTS = 2;
const RIVER_FORK_MAX_POINTS = 4;
const RIVER_FORK_CHANCE_THRESHOLD = 0.63;
const RIVER_FORK_MAX_ANGLE_DELTA = Math.PI * 0.25;
const RIVER_CONTROL_MEANDER_BIAS = Math.PI * 0.34;
const RIVER_CONTROL_MAX_TURN = Math.PI * 0.88;
const OVERWORLD_SIGNAL_CACHE_LIMIT = 8192;
const OVERWORLD_RIVER_CACHE_LIMIT = 1024;
const OVERWORLD_TILE_CACHE_LIMIT = 4096;
const OVERWORLD_ANCHOR_CACHE_LIMIT = 1024;
const OVERWORLD_ANCHOR_EVALUATION_CACHE_LIMIT = 2048;

export interface OverworldCellAnchorSpec<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
> {
  id: string;
  cellSize: number;
  chanceKey: string;
  offsetXKey: string;
  offsetYKey: string;
  threshold: number;
  offsetScale?: number;
  priority?: number;
  isSuitableTerrain(params: {
    terrain: OverworldSignals;
    x: number;
    y: number;
    sampleTerrainSignals: OverworldTerrainSignalSampler;
  }): boolean;
  createAnchor(params: {
    seed: Seed;
    x: number;
    y: number;
    chance: number;
    cellX: number;
    cellY: number;
  }): TAnchor;
}

export interface OverworldCellAnchorCandidate<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
> {
  spec: OverworldCellAnchorSpec<TAnchor>;
  cellX: number;
  cellY: number;
  x: number;
  y: number;
  chance: number;
}

export type GeneratedNamedOverworldAnchor = OverworldAnchorLike & { name: string };
export type GeneratedNamedPoiAnchor = PoiAnchorLike & { name: string };

export function createOverworldTerrainSignalSampler(
  seed: Seed
): OverworldTerrainSignalSampler {
  const continentSeed = `${seed}:continent`;
  const elevationSeed = `${seed}:elevation`;
  const moistureSeed = `${seed}:moisture`;
  const riverSeed = `${seed}:river`;
  const roadSeed = `${seed}:road`;
  const signalCache = createCoordinateCache<OverworldSignals>();
  const riverControlPointCache = createCoordinateCache<RiverControlPoint[]>();
  const riverCurvePointCache = createCoordinateCache<RiverControlPoint[]>();
  const riverForkPathCache = createCoordinateCache<RiverForkPath | null>();

  return function sampleTerrainSignals(x: number, y: number): OverworldSignals {
    return signalCache.getOrCreate(x, y, () => {
      const scaledX = x / 160;
      const scaledY = y / 160;
      const continent = octaveNoise2D(continentSeed, scaledX, scaledY, {
        octaves: 5,
        persistence: 0.55,
      });
      const elevation = octaveNoise2D(elevationSeed, x / 45, y / 45, {
        octaves: 4,
        persistence: 0.5,
      });
      const moisture = octaveNoise2D(moistureSeed, x / 65, y / 65, {
        octaves: 4,
        persistence: 0.6,
      });
      const baseRiverSignal = ridgedNoise2D(riverSeed, x / 75, y / 75, {
        octaves: 3,
        persistence: 0.52,
      });
      const riverPathSignal = sampleRiverControlPathSignal(
        seed,
        x,
        y,
        riverControlPointCache,
        riverCurvePointCache,
        riverForkPathCache
      );
      const riverPathWeight =
        continent > 0.42 && continent < 0.9 && elevation < 0.68 ? 1 : 0.45;
      const riverSignal = Math.max(
        baseRiverSignal * 0.78,
        Math.min(
          1,
          baseRiverSignal * 0.28 + riverPathSignal * 0.92 * riverPathWeight
        )
      );
      return {
        continent,
        elevation,
        moisture,
        riverSignal,
        roadSignal: ridgedNoise2D(roadSeed, x / 42, y / 42, {
          octaves: 2,
          persistence: 0.6,
        }),
      };
    });
  };
}

export function createRiverControlPoints(
  seed: Seed,
  cellX: number,
  cellY: number
): RiverControlPoint[] {
  const seedHash = createHashSeed(seed);
  const pointCountSeed = appendHashSeedPart(seedHash, 'river-control-point-count');
  const startXSeed = appendHashSeedPart(seedHash, 'river-control-start-x');
  const startYSeed = appendHashSeedPart(seedHash, 'river-control-start-y');
  const meanderSignSeed = appendHashSeedPart(seedHash, 'river-control-meander-sign');
  const meanderStrengthSeed = appendHashSeedPart(seedHash, 'river-control-meander-strength');
  const meanderPhaseSeed = appendHashSeedPart(seedHash, 'river-control-meander-phase');
  const angleSeed = appendHashSeedPart(seedHash, 'river-control-angle');
  const distanceSeed = appendHashSeedPart(seedHash, 'river-control-distance');
  const angleDeltaSeed = appendHashSeedPart(seedHash, 'river-control-angle-delta');
  const cellOriginX = cellX * RIVER_CONTROL_CELL_SIZE;
  const cellOriginY = cellY * RIVER_CONTROL_CELL_SIZE;
  const padding = RIVER_MAX_CONTROL_STEP + 1;
  const minX = cellOriginX - padding;
  const maxX = cellOriginX + RIVER_CONTROL_CELL_SIZE + padding;
  const minY = cellOriginY - padding;
  const maxY = cellOriginY + RIVER_CONTROL_CELL_SIZE + padding;
  const pointCount =
    2 +
    Math.floor(
      hash2DWithSeed(pointCountSeed, cellX, cellY) *
        (RIVER_MAX_CONTROL_POINTS - 1)
    );
  const startX =
    cellOriginX +
    hash2DWithSeed(startXSeed, cellX, cellY) *
      RIVER_CONTROL_CELL_SIZE;
  const startY =
    cellOriginY +
    hash2DWithSeed(startYSeed, cellX, cellY) *
      RIVER_CONTROL_CELL_SIZE;
  const points: RiverControlPoint[] = [
    {
      x: startX,
      y: startY,
    },
  ];
  const meanderSign =
    hash2DWithSeed(meanderSignSeed, cellX, cellY) >= 0.5 ? 1 : -1;
  const meanderStrength =
    0.24 +
    hash2DWithSeed(meanderStrengthSeed, cellX, cellY) * 0.42;
  const meanderPhase =
    hash2DWithSeed(meanderPhaseSeed, cellX, cellY) * Math.PI * 2;
  let previousAngle =
    hash2DWithSeed(angleSeed, cellX, cellY) * Math.PI * 2;

  for (let index = 1; index < pointCount; index += 1) {
    const distance =
      RIVER_MIN_CONTROL_STEP +
      Math.floor(
        hash2DWithSeed(appendHashSeedPart(distanceSeed, index), cellX, cellY) *
          (RIVER_MAX_CONTROL_STEP - RIVER_MIN_CONTROL_STEP + 1)
      );
    const rawAngleDelta =
      (hash2DWithSeed(appendHashSeedPart(angleDeltaSeed, index), cellX, cellY) - 0.5) *
      (Math.PI * 0.92);
    const meanderDelta =
      Math.sin(index * 1.15 + meanderPhase) *
      RIVER_CONTROL_MEANDER_BIAS *
      meanderStrength *
      meanderSign;
    const angleDelta = clamp(
      rawAngleDelta * 0.48 + meanderDelta,
      -RIVER_CONTROL_MAX_TURN,
      RIVER_CONTROL_MAX_TURN
    );
    const angle = previousAngle + angleDelta;
    const priorPoint = points[index - 1];
    const nextX = clamp(
      priorPoint.x + Math.cos(angle) * distance,
      minX,
      maxX
    );
    const nextY = clamp(
      priorPoint.y + Math.sin(angle) * distance,
      minY,
      maxY
    );
    points.push({
      x: nextX,
      y: nextY,
    });
    previousAngle = angle;
  }

  return points;
}

function sampleRiverControlPathSignal(
  seed: Seed,
  x: number,
  y: number,
  controlPointCache: CoordinateCache<RiverControlPoint[]>,
  curvePointCache: CoordinateCache<RiverControlPoint[]>,
  forkPathCache: CoordinateCache<RiverForkPath | null>
): number {
  const cellX = Math.floor(x / RIVER_CONTROL_CELL_SIZE);
  const cellY = Math.floor(y / RIVER_CONTROL_CELL_SIZE);
  let strongestSignal = 0;

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const points = getCachedRiverCurvePoints(
        seed,
        cellX + offsetX,
        cellY + offsetY,
        controlPointCache,
        curvePointCache
      );
      strongestSignal = Math.max(
        strongestSignal,
        getRiverPathSignalAtPoint(points, x, y)
      );
      const forkPath = getCachedRiverForkPath(
        seed,
        cellX + offsetX,
        cellY + offsetY,
        controlPointCache,
        forkPathCache
      );
      if (forkPath) {
        strongestSignal = Math.max(
          strongestSignal,
          getRiverPathSignalAtPoint(forkPath.points, x, y)
        );
      }
    }
  }

  return strongestSignal;
}

export function createRiverCurvePoints(
  controlPoints: RiverControlPoint[],
  segmentsPerCurve = RIVER_CURVE_SEGMENTS
): RiverControlPoint[] {
  if (controlPoints.length <= 2) {
    return [...controlPoints];
  }

  const curvePoints = new Array<RiverControlPoint>(
    1 + (controlPoints.length - 1) * segmentsPerCurve
  );
  curvePoints[0] = controlPoints[0];
  let nextPointIndex = 1;
  for (let index = 0; index < controlPoints.length - 1; index += 1) {
    const previous = controlPoints[Math.max(0, index - 1)];
    const start = controlPoints[index];
    const end = controlPoints[index + 1];
    const next = controlPoints[Math.min(controlPoints.length - 1, index + 2)];
    nextPointIndex = appendCubicBezierPoints(
      curvePoints,
      nextPointIndex,
      start,
      start.x + ((end.x - previous.x) / 6),
      start.y + ((end.y - previous.y) / 6),
      end.x - ((next.x - start.x) / 6),
      end.y - ((next.y - start.y) / 6),
      end,
      segmentsPerCurve
    );
  }

  return curvePoints;
}

export function createRiverForkPath(
  seed: Seed,
  cellX: number,
  cellY: number,
  controlPoints: RiverControlPoint[]
): RiverForkPath | null {
  const seedHash = createHashSeed(seed);
  const chanceSeed = appendHashSeedPart(seedHash, 'river-fork-chance');
  const trunkStartSeed = appendHashSeedPart(seedHash, 'river-fork-trunk-start');
  const trunkSpanSeed = appendHashSeedPart(seedHash, 'river-fork-trunk-span');
  const angleSignSeed = appendHashSeedPart(seedHash, 'river-fork-angle-sign');
  const angleDeltaSeed = appendHashSeedPart(seedHash, 'river-fork-angle-delta');
  const pointCountSeed = appendHashSeedPart(seedHash, 'river-fork-point-count');
  const midSwaySeed = appendHashSeedPart(seedHash, 'river-fork-mid-sway');
  if (controlPoints.length < 4) {
    return null;
  }
  if (
    hash2DWithSeed(chanceSeed, cellX, cellY) <
    RIVER_FORK_CHANCE_THRESHOLD
  ) {
    return null;
  }

  const trunkStartIndex =
    1 +
    Math.floor(
      hash2DWithSeed(trunkStartSeed, cellX, cellY) *
        Math.max(1, controlPoints.length - 3)
    );
  const maxAdditionalSpan = Math.max(
    0,
    controlPoints.length - trunkStartIndex - 3
  );
  const trunkEndIndex = Math.min(
    controlPoints.length - 1,
    trunkStartIndex +
      2 +
      Math.floor(
        hash2DWithSeed(trunkSpanSeed, cellX, cellY) *
          (maxAdditionalSpan + 1)
      )
  );
  const pivot = controlPoints[trunkStartIndex];
  const merge = controlPoints[trunkEndIndex];
  const baseAngle = Math.atan2(merge.y - pivot.y, merge.x - pivot.x);
  const angleSign =
    hash2DWithSeed(angleSignSeed, cellX, cellY) >= 0.5 ? 1 : -1;
  const angleDelta =
    (0.25 +
      hash2DWithSeed(angleDeltaSeed, cellX, cellY) * 0.75) *
    RIVER_FORK_MAX_ANGLE_DELTA *
    angleSign;
  const branchAngle = baseAngle + angleDelta;
  const branchStepCount =
    2 +
    Math.floor(
      hash2DWithSeed(pointCountSeed, cellX, cellY) *
        Math.max(1, RIVER_FORK_MAX_POINTS - RIVER_FORK_MIN_POINTS)
    );
  const points: RiverControlPoint[] = [pivot];
  const padding = RIVER_MAX_CONTROL_STEP + 1;
  const minX = cellX * RIVER_CONTROL_CELL_SIZE - padding;
  const maxX = (cellX + 1) * RIVER_CONTROL_CELL_SIZE + padding;
  const minY = cellY * RIVER_CONTROL_CELL_SIZE - padding;
  const maxY = (cellY + 1) * RIVER_CONTROL_CELL_SIZE + padding;
  const trunkDistance = Math.hypot(merge.x - pivot.x, merge.y - pivot.y);
  const branchStepDistance = clamp(
    trunkDistance * 0.32,
    RIVER_MIN_CONTROL_STEP,
    RIVER_MAX_CONTROL_STEP
  );
  const rejoinStepDistance = clamp(
    trunkDistance * 0.28,
    RIVER_MIN_CONTROL_STEP,
    RIVER_MAX_CONTROL_STEP
  );
  const firstStepAngle = clampAngleToRange(
    branchAngle,
    baseAngle - RIVER_FORK_MAX_ANGLE_DELTA,
    baseAngle + RIVER_FORK_MAX_ANGLE_DELTA
  );
  const lastStepAngle = clampAngleToRange(
    branchAngle,
    baseAngle - RIVER_FORK_MAX_ANGLE_DELTA,
    baseAngle + RIVER_FORK_MAX_ANGLE_DELTA
  );
  const branchStart = {
    x: clamp(
      pivot.x + Math.cos(firstStepAngle) * branchStepDistance,
      minX,
      maxX
    ),
    y: clamp(
      pivot.y + Math.sin(firstStepAngle) * branchStepDistance,
      minY,
      maxY
    ),
  };
  points.push(branchStart);

  if (branchStepCount > 2) {
    const branchApproach = {
      x: clamp(
        merge.x - Math.cos(lastStepAngle) * rejoinStepDistance,
        minX,
        maxX
      ),
      y: clamp(
        merge.y - Math.sin(lastStepAngle) * rejoinStepDistance,
        minY,
        maxY
      ),
    };
    if (branchStepCount > 3) {
      const midT = 0.5;
      const swayDistance =
        (hash2DWithSeed(midSwaySeed, cellX, cellY) - 0.5) *
        trunkDistance *
        0.18;
      points.push({
        x: clamp(
          pivot.x +
            (merge.x - pivot.x) * midT +
            Math.cos(branchAngle) * swayDistance,
          minX,
          maxX
        ),
        y: clamp(
          pivot.y +
            (merge.y - pivot.y) * midT +
            Math.sin(branchAngle) * swayDistance,
          minY,
          maxY
        ),
      });
    }
    points.push(branchApproach);
  }
  points.push(merge);

  const curvePoints = createRiverCurvePoints(points);
  if (curvePoints.length >= 4) {
    curvePoints[1] = points[1];
    curvePoints[curvePoints.length - 2] = points[points.length - 2];
  }

  return {
    trunkStartIndex,
    trunkEndIndex,
    trunkAngle: baseAngle,
    points: curvePoints,
  };
}

function getCachedRiverControlPoints(
  seed: Seed,
  cellX: number,
  cellY: number,
  cache: CoordinateCache<RiverControlPoint[]>
): RiverControlPoint[] {
  const cached = cache.get(cellX, cellY);
  if (cached !== undefined) {
    return cached;
  }
  const points = createRiverControlPoints(seed, cellX, cellY);
  cache.set(cellX, cellY, points);
  return points;
}

function getCachedRiverCurvePoints(
  seed: Seed,
  cellX: number,
  cellY: number,
  controlPointCache: CoordinateCache<RiverControlPoint[]>,
  curvePointCache: CoordinateCache<RiverControlPoint[]>
): RiverControlPoint[] {
  const cached = curvePointCache.get(cellX, cellY);
  if (cached !== undefined) {
    return cached;
  }
  const points = createRiverCurvePoints(
    getCachedRiverControlPoints(seed, cellX, cellY, controlPointCache)
  );
  curvePointCache.set(cellX, cellY, points);
  return points;
}

function getCachedRiverForkPath(
  seed: Seed,
  cellX: number,
  cellY: number,
  controlPointCache: CoordinateCache<RiverControlPoint[]>,
  forkPathCache: CoordinateCache<RiverForkPath | null>
): RiverForkPath | null {
  return forkPathCache.getOrCreate(cellX, cellY, () =>
    createRiverForkPath(
      seed,
      cellX,
      cellY,
      getCachedRiverControlPoints(seed, cellX, cellY, controlPointCache)
    )
  );
}

function getRiverPathSignalAtPoint(
  points: RiverControlPoint[],
  x: number,
  y: number
): number {
  let strongestSignal = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segmentDistance = getDistanceToLineSegment(
      x,
      y,
      points[index - 1],
      points[index]
    );
    const segmentSignal = Math.max(0, 1 - segmentDistance / RIVER_SEGMENT_FALLOFF);
    if (segmentSignal > strongestSignal) {
      strongestSignal = segmentSignal;
    }
  }
  return strongestSignal;
}

function getDistanceToLineSegment(
  x: number,
  y: number,
  start: RiverControlPoint,
  end: RiverControlPoint
): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const squaredLength = deltaX * deltaX + deltaY * deltaY;
  if (squaredLength === 0) {
    return Math.hypot(x - start.x, y - start.y);
  }
  const projection = clamp(
    ((x - start.x) * deltaX + (y - start.y) * deltaY) / squaredLength,
    0,
    1
  );
  const closestX = start.x + deltaX * projection;
  const closestY = start.y + deltaY * projection;
  return Math.hypot(x - closestX, y - closestY);
}

function appendCubicBezierPoints(
  points: RiverControlPoint[],
  startIndex: number,
  start: RiverControlPoint,
  controlAX: number,
  controlAY: number,
  controlBX: number,
  controlBY: number,
  end: RiverControlPoint,
  segments: number
): number {
  let nextIndex = startIndex;
  for (let index = 1; index <= segments; index += 1) {
    const t = index / segments;
    const inverseT = 1 - t;
    points[nextIndex] = {
      x:
        inverseT * inverseT * inverseT * start.x +
        3 * inverseT * inverseT * t * controlAX +
        3 * inverseT * t * t * controlBX +
        t * t * t * end.x,
      y:
        inverseT * inverseT * inverseT * start.y +
        3 * inverseT * inverseT * t * controlAY +
        3 * inverseT * t * t * controlBY +
        t * t * t * end.y,
    };
    nextIndex += 1;
  }
  return nextIndex;
}

function clampAngleToRange(angle: number, min: number, max: number): number {
  if (angle < min) {
    return min;
  }
  if (angle > max) {
    return max;
  }
  return angle;
}

export function isNearOverworldLand(signals: OverworldSignals): boolean {
  return signals.continent > 0.45 && signals.continent < 0.9;
}

export function getOverworldPlacementChance(
  seed: Seed,
  chanceKey: string,
  x: number,
  y: number
) {
  return hash2DWithSeed(
    appendHashSeedPart(createHashSeed(seed), chanceKey),
    x,
    y
  );
}

export function createCachedOverworldTileResolver(
  resolveTile: (params: { seed: Seed; x: number; y: number }) => TileLike | null
) {
  const cache = createBoundedCache<string, TileLike | null>(
    OVERWORLD_TILE_CACHE_LIMIT
  );

  return function resolveOverworldTile({
    seed,
    x,
    y,
  }: {
    seed: Seed;
    x: number;
    y: number;
  }) {
    const key = `${seed}:${x}:${y}`;
    return cache.getOrCreate(key, () => resolveTile({ seed, x, y }));
  };
}

export function createGeneratedNamedOverworldCellAnchorSpec<
  TAnchor extends GeneratedNamedOverworldAnchor = GeneratedNamedOverworldAnchor,
>(
  options: Omit<
    OverworldCellAnchorSpec<TAnchor>,
    'createAnchor'
  > & {
    nameType: PoiNameType;
    createAnchorExtras?(
      params: {
        seed: Seed;
        x: number;
        y: number;
        chance: number;
        cellX: number;
        cellY: number;
      }
    ): Omit<TAnchor, 'x' | 'y' | 'name'>;
  }
): OverworldCellAnchorSpec<TAnchor> {
  return {
    ...options,
    createAnchor({ seed, x, y, chance, cellX, cellY }) {
      return {
        x,
        y,
        name: generatePoiName(seed, options.nameType, x, y),
        ...(options.createAnchorExtras?.({
          seed,
          x,
          y,
          chance,
          cellX,
          cellY,
        }) ?? {}),
      } as TAnchor;
    },
  };
}

export function createGeneratedPoiOverworldCellAnchorSpec<
  TAnchor extends GeneratedNamedPoiAnchor = GeneratedNamedPoiAnchor,
>(
  options: Omit<
    OverworldCellAnchorSpec<TAnchor>,
    'createAnchor'
  > & {
    poiType: PoiNameType;
    createAnchorExtras?(
      params: {
        seed: Seed;
        x: number;
        y: number;
        chance: number;
        cellX: number;
        cellY: number;
      }
    ): Omit<TAnchor, 'x' | 'y' | 'name' | 'type'>;
  }
): OverworldCellAnchorSpec<TAnchor> {
  return createGeneratedNamedOverworldCellAnchorSpec<TAnchor>({
    ...options,
    nameType: options.poiType,
    createAnchorExtras(params) {
      return {
        type: options.poiType,
        ...(options.createAnchorExtras?.(params) ?? {}),
      } as Omit<TAnchor, 'x' | 'y' | 'name'>;
    },
  });
}

export function createOverworldCellAnchorCandidate<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
>(
  seed: Seed,
  cellX: number,
  cellY: number,
  spec: OverworldCellAnchorSpec<TAnchor>
): OverworldCellAnchorCandidate<TAnchor> {
  const seedHash = createHashSeed(seed);
  const chanceSeed = appendHashSeedPart(seedHash, spec.chanceKey);
  const offsetXSeed = appendHashSeedPart(seedHash, spec.offsetXKey);
  const offsetYSeed = appendHashSeedPart(seedHash, spec.offsetYKey);
  const centerX = cellX * spec.cellSize;
  const centerY = cellY * spec.cellSize;
  const offsetScale = spec.offsetScale ?? 0.34;

  return {
    spec,
    cellX,
    cellY,
    chance: hash2DWithSeed(chanceSeed, cellX, cellY),
    x:
      centerX +
      Math.round(
        (hash2DWithSeed(offsetXSeed, cellX, cellY) - 0.5) *
          (spec.cellSize * offsetScale)
      ),
    y:
      centerY +
      Math.round(
        (hash2DWithSeed(offsetYSeed, cellX, cellY) - 0.5) *
          (spec.cellSize * offsetScale)
      ),
  };
}

export function compareOverworldCellAnchorPriority(
  left: OverworldCellAnchorCandidate,
  right: OverworldCellAnchorCandidate
) {
  const leftPriority = left.spec.priority ?? 0;
  const rightPriority = right.spec.priority ?? 0;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  if (left.cellY !== right.cellY) {
    return left.cellY - right.cellY;
  }
  if (left.cellX !== right.cellX) {
    return left.cellX - right.cellX;
  }
  return 0;
}

export function hasOverworldAnchorConflict(
  candidate: Pick<OverworldCellAnchorCandidate, 'x' | 'y'>,
  anchors: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>,
  minSpacing: number
) {
  return anchors.some(
    (anchor) => Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y) < minSpacing
  );
}

export function collectNearbyOverworldCellAnchors<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
>({
  seed,
  x,
  y,
  spec,
  sampleTerrainSignals,
  cache,
  radius = 2,
  minSpacing = 0,
  blockingAnchors = [],
  conflictSpecs = [spec],
  evaluationCache = new Map<string, OverworldCellAnchorEvaluation>(),
}: {
  seed: Seed;
  x: number;
  y: number;
  spec: OverworldCellAnchorSpec<TAnchor>;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  cache: CacheLike<string, TAnchor | null>;
  radius?: number;
  minSpacing?: number;
  blockingAnchors?: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  conflictSpecs?: OverworldCellAnchorSpec[];
  evaluationCache?: CacheLike<string, OverworldCellAnchorEvaluation>;
}) {
  const cellX = Math.floor(x / spec.cellSize);
  const cellY = Math.floor(y / spec.cellSize);
  const anchors: TAnchor[] = [];

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const anchor = resolveOverworldCellAnchor({
        seed,
        cellX: cellX + dx,
        cellY: cellY + dy,
        spec,
        sampleTerrainSignals,
        cache,
        minSpacing,
        blockingAnchors,
        conflictSpecs,
        evaluationCache,
      });
      if (anchor) {
        anchors.push(anchor);
      }
    }
  }

  return anchors;
}

export function collectNearbyOverworldPoiAnchors<
  TPoiType extends string,
  TAnchor extends GeneratedNamedPoiAnchor = GeneratedNamedPoiAnchor,
>({
  seed,
  x,
  y,
  specs,
  caches,
  sampleTerrainSignals,
  minSpacing = 0,
  blockingAnchors = [],
  baseAnchors = [],
  evaluationCache = new Map<string, OverworldCellAnchorEvaluation>(),
}: {
  seed: Seed;
  x: number;
  y: number;
  specs: Record<TPoiType, OverworldCellAnchorSpec<TAnchor>>;
  caches: Record<TPoiType, CacheLike<string, TAnchor | null>>;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  minSpacing?: number;
  blockingAnchors?: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  baseAnchors?: TAnchor[];
  evaluationCache?: CacheLike<string, OverworldCellAnchorEvaluation>;
}) {
  const anchors = [...baseAnchors];
  const specList = Object.values(specs) as OverworldCellAnchorSpec<TAnchor>[];

  for (const poiType of Object.keys(specs) as TPoiType[]) {
    anchors.push(
      ...collectNearbyOverworldCellAnchors({
        seed,
        x,
        y,
        spec: specs[poiType],
        sampleTerrainSignals,
        cache: caches[poiType],
        minSpacing,
        blockingAnchors,
        conflictSpecs: specList,
        evaluationCache,
      })
    );
  }

  return anchors;
}

export interface OverworldAnchorCollectionOptions<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
> {
  spec: OverworldCellAnchorSpec<TAnchor>;
  radius?: number;
  minSpacing?: number;
  blockingAnchors?: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  conflictSpecs?: OverworldCellAnchorSpec[];
}

export interface OverworldPoiAnchorCollectionOptions<
  TPoiType extends string = string,
  TAnchor extends GeneratedNamedPoiAnchor = GeneratedNamedPoiAnchor,
  TTownAnchor extends OverworldAnchorLike = OverworldAnchorLike,
  TBridgeAnchor extends OverworldAnchorLike = OverworldAnchorLike,
> {
  specs: Record<TPoiType, OverworldCellAnchorSpec<TAnchor>>;
  minSpacing?: number;
  blockingAnchors?(params: {
    townAnchors: TTownAnchor[];
    bridgeAnchors: TBridgeAnchor[];
  }): Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  baseAnchors?(params: {
    townAnchors: TTownAnchor[];
    bridgeAnchors: TBridgeAnchor[];
  }): TAnchor[];
}

export function createOverworldAnchorResolver<
  TTownAnchor extends OverworldAnchorLike = OverworldAnchorLike,
  TBridgeAnchor extends OverworldAnchorLike = OverworldAnchorLike,
  TPoiType extends string = string,
  TPoiAnchor extends GeneratedNamedPoiAnchor = GeneratedNamedPoiAnchor,
>(options: {
  town?: OverworldAnchorCollectionOptions<TTownAnchor>;
  bridge?: OverworldAnchorCollectionOptions<TBridgeAnchor>;
  poi?: OverworldPoiAnchorCollectionOptions<
    TPoiType,
    TPoiAnchor,
    TTownAnchor,
    TBridgeAnchor
  >;
}) {
  const townCache = createBoundedCache<string, TTownAnchor | null>(
    OVERWORLD_ANCHOR_CACHE_LIMIT
  );
  const bridgeCache = createBoundedCache<string, TBridgeAnchor | null>(
    OVERWORLD_ANCHOR_CACHE_LIMIT
  );
  const anchorEvaluationCache = createBoundedCache<
    string,
    OverworldCellAnchorEvaluation
  >(OVERWORLD_ANCHOR_EVALUATION_CACHE_LIMIT);
  const nearbyAnchorCollectionCache = createBoundedCache<
    string,
    OverworldAnchorLike[]
  >(OVERWORLD_ANCHOR_CACHE_LIMIT * 2);
  const poiCaches = Object.fromEntries(
    Object.keys(options.poi?.specs ?? {}).map((poiType) => [
      poiType,
      createBoundedCache<string, TPoiAnchor | null>(OVERWORLD_ANCHOR_CACHE_LIMIT),
    ])
  ) as unknown as Record<TPoiType, CacheLike<string, TPoiAnchor | null>>;

  return function resolveOverworldAnchors({
    seed,
    x,
    y,
    sampleTerrainSignals,
  }: ResolveOverworldAnchorsContext): OverworldAnchorSet {
    const sampleCollection = <TAnchor extends OverworldAnchorLike>(
      spec: OverworldCellAnchorSpec<TAnchor>,
      cache: CacheLike<string, TAnchor | null>,
      options: OverworldAnchorCollectionOptions<TAnchor>
    ): TAnchor[] => {
      const radius = options.radius ?? 2;
      const minSpacing = options.minSpacing ?? 0;
      const conflictSpecs = options.conflictSpecs ?? [spec];
      const blockingAnchors = options.blockingAnchors ?? [];
      const key = createNearbyAnchorCollectionCacheKey({
        seed,
        x,
        y,
        spec,
        radius,
        minSpacing,
        conflictSpecs,
        blockingAnchors,
      });

      return nearbyAnchorCollectionCache.getOrCreate(
        key,
        () =>
          collectNearbyOverworldCellAnchors({
            seed,
            x,
            y,
            spec,
            sampleTerrainSignals,
            cache,
            radius,
            minSpacing,
            blockingAnchors,
            conflictSpecs,
            evaluationCache: anchorEvaluationCache,
          }) as OverworldAnchorLike[]
      ) as TAnchor[];
    };

    const townAnchors = options.town
      ? sampleCollection(options.town.spec, townCache, options.town)
      : [];
    const bridgeAnchors = options.bridge
      ? sampleCollection(options.bridge.spec, bridgeCache, options.bridge)
      : [];
    const poiAnchors = options.poi
      ? collectNearbyOverworldPoiAnchors({
          seed,
          x,
          y,
          specs: options.poi.specs,
          caches: poiCaches,
          sampleTerrainSignals,
          minSpacing: options.poi.minSpacing,
          blockingAnchors:
            options.poi.blockingAnchors?.({
              townAnchors,
              bridgeAnchors,
            }) ?? townAnchors,
          baseAnchors:
            options.poi.baseAnchors?.({
              townAnchors,
              bridgeAnchors,
            }) ?? [],
          evaluationCache: anchorEvaluationCache,
        })
      : [];

    return {
      townAnchors,
      bridgeAnchors,
      poiAnchors,
    };
  };
}

function createNearbyAnchorCollectionCacheKey({
  seed,
  x,
  y,
  spec,
  radius,
  minSpacing,
  conflictSpecs,
  blockingAnchors,
}: {
  seed: Seed;
  x: number;
  y: number;
  spec: OverworldCellAnchorSpec;
  radius: number;
  minSpacing: number;
  conflictSpecs: OverworldCellAnchorSpec[];
  blockingAnchors: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
}) {
  const cellX = Math.floor(x / spec.cellSize);
  const cellY = Math.floor(y / spec.cellSize);
  let key =
    `${seed}:${spec.id}:${cellX}:${cellY}:${radius}:${minSpacing}:` +
    `${conflictSpecs.map((entry) => entry.id).join(',')}`;
  for (const anchor of blockingAnchors) {
    key += `:${anchor.x},${anchor.y}`;
  }
  return key;
}

export function resolveOverworldCellAnchor<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
>({
  seed,
  cellX,
  cellY,
  spec,
  sampleTerrainSignals,
  cache,
  minSpacing = 0,
  blockingAnchors = [],
  conflictSpecs = [spec],
  evaluationCache = new Map<string, OverworldCellAnchorEvaluation>(),
}: {
  seed: Seed;
  cellX: number;
  cellY: number;
  spec: OverworldCellAnchorSpec<TAnchor>;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  cache: CacheLike<string, TAnchor | null>;
  minSpacing?: number;
  blockingAnchors?: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  conflictSpecs?: OverworldCellAnchorSpec[];
  evaluationCache?: CacheLike<string, OverworldCellAnchorEvaluation>;
}) {
  const key = `${seed}:${spec.id}:${cellX}:${cellY}`;
  if (!cache.has(key)) {
    const evaluation = getOverworldCellAnchorEvaluation({
      seed,
      cellX,
      cellY,
      spec,
      sampleTerrainSignals,
      evaluationCache,
    });
    const { candidate } = evaluation;
    const suitable =
      candidate.chance > spec.threshold &&
      evaluation.terrainSuitable &&
      !hasOverworldAnchorConflict(candidate, blockingAnchors, minSpacing) &&
      !hasHigherPriorityOverworldAnchorConflict({
        seed,
        candidate,
        sampleTerrainSignals,
        blockingAnchors,
        minSpacing,
        conflictSpecs,
        evaluationCache,
      });

    cache.set(
      key,
      suitable
        ? spec.createAnchor({
            seed,
            x: candidate.x,
            y: candidate.y,
            chance: candidate.chance,
            cellX,
            cellY,
          })
        : null
    );
  }

  return cache.get(key) ?? null;
}

function hasHigherPriorityOverworldAnchorConflict({
  seed,
  candidate,
  sampleTerrainSignals,
  blockingAnchors,
  minSpacing,
  conflictSpecs,
  evaluationCache,
}: {
  seed: Seed;
  candidate: OverworldCellAnchorCandidate;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  blockingAnchors: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  minSpacing: number;
  conflictSpecs: OverworldCellAnchorSpec[];
  evaluationCache: CacheLike<string, OverworldCellAnchorEvaluation>;
}) {
  if (minSpacing <= 0) {
    return false;
  }

  for (const spec of conflictSpecs) {
    const radius = Math.ceil(minSpacing / spec.cellSize) + 1;
    const cellX = Math.floor(candidate.x / spec.cellSize);
    const cellY = Math.floor(candidate.y / spec.cellSize);

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const otherEvaluation = getOverworldCellAnchorEvaluation({
          seed,
          cellX: cellX + dx,
          cellY: cellY + dy,
          spec,
          sampleTerrainSignals,
          evaluationCache,
        });
        const other = otherEvaluation.candidate;
        if (
          other.spec.id === candidate.spec.id &&
          other.cellX === candidate.cellX &&
          other.cellY === candidate.cellY
        ) {
          continue;
        }

        if (
          other.chance <= other.spec.threshold ||
          !otherEvaluation.terrainSuitable ||
          hasOverworldAnchorConflict(other, blockingAnchors, minSpacing)
        ) {
          continue;
        }

        if (Math.hypot(candidate.x - other.x, candidate.y - other.y) >= minSpacing) {
          continue;
        }

        if (compareOverworldCellAnchorPriority(other, candidate) < 0) {
          return true;
        }
      }
    }
  }

  return false;
}

function getOverworldCellAnchorEvaluation<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
>({
  seed,
  cellX,
  cellY,
  spec,
  sampleTerrainSignals,
  evaluationCache,
}: {
  seed: Seed;
  cellX: number;
  cellY: number;
  spec: OverworldCellAnchorSpec<TAnchor>;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  evaluationCache: CacheLike<string, OverworldCellAnchorEvaluation>;
}): OverworldCellAnchorEvaluation<TAnchor> {
  const key = `${seed}:${spec.id}:${cellX}:${cellY}`;
  const cached = evaluationCache.get(key);
  if (cached !== undefined) {
    return cached as OverworldCellAnchorEvaluation<TAnchor>;
  }
  const candidate = createOverworldCellAnchorCandidate(seed, cellX, cellY, spec);
  const terrain = sampleTerrainSignals(candidate.x, candidate.y);
  const evaluation = {
    candidate,
    terrain,
    terrainSuitable:
      candidate.chance > spec.threshold &&
      spec.isSuitableTerrain({
        terrain,
        x: candidate.x,
        y: candidate.y,
        sampleTerrainSignals,
      }),
  };
  evaluationCache.set(key, evaluation);
  return evaluation as OverworldCellAnchorEvaluation<TAnchor>;
}

export function createOverworldGenerationContext({
  seed,
  x,
  y,
  tile,
  plugins,
  sampleTerrainSignals,
  state,
}: {
  seed: Seed;
  x: number;
  y: number;
  tile: ClassifyOverworldTileContext['tile'];
  plugins: PluginRegistryLike;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  state?: WorldStateLike;
}): ClassifyOverworldTileContext & { state?: WorldStateLike } {
  const signals = sampleTerrainSignals(x, y);
  const anchors = plugins.resolveOverworldAnchors({
    seed,
    x,
    y,
    sampleTerrainSignals,
    state,
  });
  const placementChances = {
    town: getOverworldPlacementChance(seed, 'town', x, y),
    cave: getOverworldPlacementChance(seed, 'cave', x, y),
    dungeon: getOverworldPlacementChance(seed, 'dungeon', x, y),
    sign: getOverworldPlacementChance(seed, 'sign', x, y),
  };

  return {
    seed,
    x,
    y,
    tile,
    state,
    nearLand: isNearOverworldLand(signals),
    townChance: placementChances.town,
    caveChance: placementChances.cave,
    dungeonChance: placementChances.dungeon,
    signChance: placementChances.sign,
    placementChances,
    getPlacementChance(chanceKey: string) {
      return (
        placementChances[chanceKey] ??
        getOverworldPlacementChance(seed, chanceKey, x, y)
      );
    },
    signals,
    sampleTerrainSignals,
    townAnchors: anchors.townAnchors,
    bridgeAnchors: anchors.bridgeAnchors,
    poiAnchors: anchors.poiAnchors,
  };
}

export function composeOverworldTileFromPlugins({
  seed,
  x,
  y,
  plugins,
  sampleTerrainSignals,
  initialTile,
  state,
}: {
  seed: Seed;
  x: number;
  y: number;
  plugins: PluginRegistryLike;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  initialTile?: TileLike;
  state?: WorldStateLike;
}): TileLike {
  const curatedTile = plugins.resolveOverworldTile({
    seed,
    x,
    y,
    sampleTerrainSignals,
    state,
  });
  if (curatedTile) {
    return curatedTile;
  }

  const startingTile = initialTile ?? {
    kind: plugins.getDefaultTileKind?.('plains') ?? 'plains',
  };

  const generationContext = createOverworldGenerationContext({
    seed,
    x,
    y,
    tile: startingTile,
    plugins,
    sampleTerrainSignals,
    state,
  });

  generationContext.tile =
    plugins.classifyTerrainTile(generationContext) ?? generationContext.tile;
  generationContext.tile =
    plugins.classifyOverworldTile(generationContext) ?? generationContext.tile;

  return plugins.decorateOverworldTile(
    generationContext as DecorateOverworldTileContext
  );
}
