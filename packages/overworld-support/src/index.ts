import { hash2D, octaveNoise2D, ridgedNoise2D } from '@bworlds/core';
import type {
  ClassifyOverworldTileContext,
  OverworldAnchorLike,
  OverworldSignals,
  PluginRegistryLike,
  Seed,
  TileLike,
} from '@bworlds/plugin-api';

export type OverworldTerrainSignalSampler = (
  x: number,
  y: number
) => OverworldSignals;

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
  isSuitableTerrain(terrain: OverworldSignals): boolean;
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

export function createOverworldTerrainSignalSampler(
  seed: Seed
): OverworldTerrainSignalSampler {
  return function sampleTerrainSignals(x: number, y: number): OverworldSignals {
    const scaledX = x / 160;
    const scaledY = y / 160;
    return {
      continent: octaveNoise2D(`${seed}:continent`, scaledX, scaledY, {
        octaves: 5,
        persistence: 0.55,
      }),
      elevation: octaveNoise2D(`${seed}:elevation`, x / 45, y / 45, {
        octaves: 4,
        persistence: 0.5,
      }),
      moisture: octaveNoise2D(`${seed}:moisture`, x / 65, y / 65, {
        octaves: 4,
        persistence: 0.6,
      }),
      riverSignal: ridgedNoise2D(`${seed}:river`, x / 75, y / 75, {
        octaves: 3,
        persistence: 0.52,
      }),
      roadSignal: ridgedNoise2D(`${seed}:road`, x / 42, y / 42, {
        octaves: 2,
        persistence: 0.6,
      }),
    };
  };
}

export function isNearOverworldLand(signals: OverworldSignals): boolean {
  return signals.continent > 0.45 && signals.continent < 0.9;
}

export function createOverworldCellAnchorCandidate<
  TAnchor extends OverworldAnchorLike = OverworldAnchorLike,
>(
  seed: Seed,
  cellX: number,
  cellY: number,
  spec: OverworldCellAnchorSpec<TAnchor>
): OverworldCellAnchorCandidate<TAnchor> {
  const centerX = cellX * spec.cellSize;
  const centerY = cellY * spec.cellSize;
  const offsetScale = spec.offsetScale ?? 0.34;

  return {
    spec,
    cellX,
    cellY,
    chance: hash2D(`${seed}:${spec.chanceKey}`, cellX, cellY),
    x:
      centerX +
      Math.round(
        (hash2D(`${seed}:${spec.offsetXKey}`, cellX, cellY) - 0.5) *
          (spec.cellSize * offsetScale)
      ),
    y:
      centerY +
      Math.round(
        (hash2D(`${seed}:${spec.offsetYKey}`, cellX, cellY) - 0.5) *
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
}: {
  seed: Seed;
  x: number;
  y: number;
  spec: OverworldCellAnchorSpec<TAnchor>;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  cache: Map<string, TAnchor | null>;
  radius?: number;
  minSpacing?: number;
  blockingAnchors?: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  conflictSpecs?: OverworldCellAnchorSpec[];
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
      });
      if (anchor) {
        anchors.push(anchor);
      }
    }
  }

  return anchors;
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
}: {
  seed: Seed;
  cellX: number;
  cellY: number;
  spec: OverworldCellAnchorSpec<TAnchor>;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  cache: Map<string, TAnchor | null>;
  minSpacing?: number;
  blockingAnchors?: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  conflictSpecs?: OverworldCellAnchorSpec[];
}) {
  const key = `${seed}:${spec.id}:${cellX}:${cellY}`;
  if (!cache.has(key)) {
    const candidate = createOverworldCellAnchorCandidate(seed, cellX, cellY, spec);
    const terrain = sampleTerrainSignals(candidate.x, candidate.y);
    const suitable =
      candidate.chance > spec.threshold &&
      spec.isSuitableTerrain(terrain) &&
      !hasOverworldAnchorConflict(candidate, blockingAnchors, minSpacing) &&
      !hasHigherPriorityOverworldAnchorConflict({
        seed,
        candidate,
        sampleTerrainSignals,
        blockingAnchors,
        minSpacing,
        conflictSpecs,
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
}: {
  seed: Seed;
  candidate: OverworldCellAnchorCandidate;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  blockingAnchors: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  minSpacing: number;
  conflictSpecs: OverworldCellAnchorSpec[];
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
        const other = createOverworldCellAnchorCandidate(
          seed,
          cellX + dx,
          cellY + dy,
          spec
        );
        if (
          other.spec.id === candidate.spec.id &&
          other.cellX === candidate.cellX &&
          other.cellY === candidate.cellY
        ) {
          continue;
        }

        const terrain = sampleTerrainSignals(other.x, other.y);
        if (
          other.chance <= other.spec.threshold ||
          !other.spec.isSuitableTerrain(terrain) ||
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

export function createOverworldGenerationContext({
  seed,
  x,
  y,
  tile,
  plugins,
  sampleTerrainSignals,
}: {
  seed: Seed;
  x: number;
  y: number;
  tile: ClassifyOverworldTileContext['tile'];
  plugins: PluginRegistryLike;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
}): ClassifyOverworldTileContext {
  const signals = sampleTerrainSignals(x, y);
  const anchors = plugins.resolveOverworldAnchors({
    seed,
    x,
    y,
    sampleTerrainSignals,
  });

  return {
    seed,
    x,
    y,
    tile,
    nearLand: isNearOverworldLand(signals),
    townChance: hash2D(`${seed}:town`, x, y),
    caveChance: hash2D(`${seed}:cave`, x, y),
    dungeonChance: hash2D(`${seed}:dungeon`, x, y),
    signChance: hash2D(`${seed}:sign`, x, y),
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
  initialTile = { kind: plugins.getDefaultTileKind() },
}: {
  seed: Seed;
  x: number;
  y: number;
  plugins: PluginRegistryLike;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  initialTile?: TileLike;
}): TileLike {
  const curatedTile = plugins.resolveOverworldTile({
    seed,
    x,
    y,
    sampleTerrainSignals,
  });
  if (curatedTile) {
    return curatedTile;
  }

  const generationContext = createOverworldGenerationContext({
    seed,
    x,
    y,
    tile: initialTile,
    plugins,
    sampleTerrainSignals,
  });

  let tile = plugins.classifyTerrainTile(generationContext) ?? initialTile;
  tile =
    plugins.classifyOverworldTile({
      ...generationContext,
      tile,
    }) ?? tile;

  return plugins.decorateOverworldTile({
    seed,
    x,
    y,
    signals: generationContext.signals,
    tile,
  });
}
