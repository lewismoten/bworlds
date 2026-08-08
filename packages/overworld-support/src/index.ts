import {
  generatePoiName,
  hash2D,
  octaveNoise2D,
  ridgedNoise2D,
  type PoiNameType,
} from '@bworlds/core';
import type {
  ClassifyOverworldTileContext,
  OverworldAnchorLike,
  OverworldAnchorSet,
  PoiAnchorLike,
  OverworldSignals,
  PluginRegistryLike,
  ResolveOverworldAnchorsContext,
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

export type GeneratedNamedOverworldAnchor = OverworldAnchorLike & { name: string };
export type GeneratedNamedPoiAnchor = PoiAnchorLike & { name: string };

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

export function getOverworldPlacementChance(
  seed: Seed,
  chanceKey: string,
  x: number,
  y: number
) {
  return hash2D(`${seed}:${chanceKey}`, x, y);
}

export function createCachedOverworldTileResolver(
  resolveTile: (params: { seed: Seed; x: number; y: number }) => TileLike | null
) {
  const cache = new Map<string, TileLike | null>();

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
    if (!cache.has(key)) {
      cache.set(key, resolveTile({ seed, x, y }));
    }
    return cache.get(key) ?? null;
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
}: {
  seed: Seed;
  x: number;
  y: number;
  specs: Record<TPoiType, OverworldCellAnchorSpec<TAnchor>>;
  caches: Record<TPoiType, Map<string, TAnchor | null>>;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
  minSpacing?: number;
  blockingAnchors?: Array<Pick<OverworldAnchorLike, 'x' | 'y'>>;
  baseAnchors?: TAnchor[];
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
  const townCache = new Map<string, TTownAnchor | null>();
  const bridgeCache = new Map<string, TBridgeAnchor | null>();
  const poiCaches = Object.fromEntries(
    Object.keys(options.poi?.specs ?? {}).map((poiType) => [
      poiType,
      new Map<string, TPoiAnchor | null>(),
    ])
  ) as Record<TPoiType, Map<string, TPoiAnchor | null>>;

  return function resolveOverworldAnchors({
    seed,
    x,
    y,
    sampleTerrainSignals,
  }: ResolveOverworldAnchorsContext): OverworldAnchorSet {
    const townAnchors = options.town
      ? collectNearbyOverworldCellAnchors({
          seed,
          x,
          y,
          spec: options.town.spec,
          sampleTerrainSignals,
          cache: townCache,
          radius: options.town.radius,
          minSpacing: options.town.minSpacing,
          blockingAnchors: options.town.blockingAnchors,
          conflictSpecs: options.town.conflictSpecs,
        })
      : [];
    const bridgeAnchors = options.bridge
      ? collectNearbyOverworldCellAnchors({
          seed,
          x,
          y,
          spec: options.bridge.spec,
          sampleTerrainSignals,
          cache: bridgeCache,
          radius: options.bridge.radius,
          minSpacing: options.bridge.minSpacing,
          blockingAnchors: options.bridge.blockingAnchors,
          conflictSpecs: options.bridge.conflictSpecs,
        })
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
        })
      : [];

    return {
      townAnchors,
      bridgeAnchors,
      poiAnchors,
    };
  };
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
  });

  let tile = plugins.classifyTerrainTile(generationContext) ?? startingTile;
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
