import type { Kind, OverworldSignals, Seed } from '@bworlds/plugin-api';
import {
  normalizeTerrainSplatSample,
  packTerrainSplatSample,
  resolveTerrainKindSplatSample,
  unpackTerrainSplatSample,
  validatePackedTerrainSplatSample,
  type PackedTerrainSplatSample,
  type ResolveTerrainKindSplatSampleInput,
  type TerrainKindSplatCatalogEntry,
  type TerrainMaterialLayerCatalogEntry,
  type TerrainMaterialLayerId,
  type TerrainSplatSample,
} from './index.ts';

export type TerrainSplatGridBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  step?: number;
};

export type TerrainSplatGridTile = {
  kind: Kind;
  signals?: ResolveTerrainKindSplatSampleInput['signals'];
};

export type ResolveTerrainSplatGridTile = (position: {
  x: number;
  y: number;
}) => TerrainSplatGridTile;

export type TerrainSplatSampleGrid = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  step: number;
  width: number;
  height: number;
  samples: readonly TerrainSplatSample[];
};

export type PackedTerrainSplatSampleGrid = Omit<
  TerrainSplatSampleGrid,
  'samples'
> & {
  layerIndices: Uint8Array;
  weights: Uint8Array;
};

export type TerrainSplatGridUsageWarningCode =
  | 'too-many-active-layers'
  | 'too-many-unique-layer-combinations'
  | 'hard-boundary-no-blend-zone';

export type TerrainSplatGridUsageWarning = {
  code: TerrainSplatGridUsageWarningCode;
  message: string;
};

export type TerrainSplatGridUsageSummary = {
  activeLayerIds: readonly TerrainMaterialLayerId[];
  activeLayerCounts: Readonly<Record<TerrainMaterialLayerId, number>>;
  uniqueLayerCombinationCount: number;
  dominantLayerId: TerrainMaterialLayerId | null;
  perSampleActiveLayerCount: readonly number[];
  unusedLayerIds: readonly TerrainMaterialLayerId[];
  hardBoundaryCount: number;
  warnings: readonly TerrainSplatGridUsageWarning[];
};

type ResolvedTerrainSplatGridCell = {
  tile: TerrainSplatGridTile;
  sample: TerrainSplatSample;
};

export function createTerrainSplatSampleGrid(params: {
  seed: Seed;
  bounds: TerrainSplatGridBounds;
  kindCatalog:
    | ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>
    | {
        byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
      };
  resolveTile: ResolveTerrainSplatGridTile;
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
}): TerrainSplatSampleGrid {
  const { width, height, minX, maxX, minY, maxY, step } =
    normalizeTerrainSplatGridBounds(params.bounds);
  const blendWidth = normalizeTerrainSplatBlendWidth(params.blendWidth);
  const samples: TerrainSplatSample[] = [];
  const cellCache = new Map<string, ResolvedTerrainSplatGridCell>();

  const resolveCell = (x: number, y: number): ResolvedTerrainSplatGridCell => {
    const key = `${x}:${y}`;
    const cached = cellCache.get(key);
    if (cached) {
      return cached;
    }

    const tile = params.resolveTile({ x, y });
    const sample = resolveTerrainKindSplatSample(
      {
        seed: params.seed,
        x,
        y,
        kind: tile.kind,
        signals: tile.signals,
      },
      params.kindCatalog,
      {
        fallbackKind: params.fallbackKind,
        fallbackLayerId: params.fallbackLayerId,
      }
    );
    const resolved = { tile, sample };
    cellCache.set(key, resolved);
    return resolved;
  };

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const x = minX + column * step;
      const y = minY + row * step;
      const centerCell = resolveCell(x, y);

      samples.push(
        blendWidth > 0
          ? blendTerrainSplatGridSample({
              x,
              y,
              step,
              blendWidth,
              centerCell,
              resolveCell,
              fallbackLayerId: params.fallbackLayerId,
            })
          : centerCell.sample
      );
    }
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    step,
    width,
    height,
    samples,
  };
}

export function packTerrainSplatSampleGrid(
  grid: TerrainSplatSampleGrid,
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      },
  options: {
    fallbackLayerId?: TerrainMaterialLayerId;
  } = {}
): PackedTerrainSplatSampleGrid {
  const layerIndices = new Uint8Array(grid.samples.length * 4);
  const weights = new Uint8Array(grid.samples.length * 4);

  grid.samples.forEach((sample, index) => {
    const packed = packTerrainSplatSample(sample, catalog, options);
    layerIndices.set(packed.layerIndices, index * 4);
    weights.set(packed.weights, index * 4);
  });

  return {
    minX: grid.minX,
    maxX: grid.maxX,
    minY: grid.minY,
    maxY: grid.maxY,
    step: grid.step,
    width: grid.width,
    height: grid.height,
    layerIndices,
    weights,
  };
}

export function unpackTerrainSplatSampleGrid(
  grid: PackedTerrainSplatSampleGrid,
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>
): TerrainSplatSampleGrid {
  const samples: TerrainSplatSample[] = [];

  for (let index = 0; index < grid.width * grid.height; index += 1) {
    const packedSample = getPackedTerrainSplatGridSample(grid, index);
    const errors = validatePackedTerrainSplatSample(packedSample, catalog);
    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }
    samples.push(unpackTerrainSplatSample(packedSample, catalog));
  }

  return {
    minX: grid.minX,
    maxX: grid.maxX,
    minY: grid.minY,
    maxY: grid.maxY,
    step: grid.step,
    width: grid.width,
    height: grid.height,
    samples,
  };
}

export function getTerrainSplatGridSample(
  grid: TerrainSplatSampleGrid,
  column: number,
  row: number
): TerrainSplatSample {
  return grid.samples[getTerrainSplatGridOffset(grid, column, row)];
}

export function getPackedTerrainSplatGridSample(
  grid: PackedTerrainSplatSampleGrid,
  sampleIndex: number
): PackedTerrainSplatSample {
  const start = sampleIndex * 4;
  return {
    layerIndices: grid.layerIndices.slice(start, start + 4),
    weights: grid.weights.slice(start, start + 4),
  };
}

export function createTerrainSplatGridTileResolver(
  resolveInput: (
    input: Pick<ResolveTerrainKindSplatSampleInput, 'x' | 'y'>
  ) => TerrainSplatGridTile
): ResolveTerrainSplatGridTile {
  return resolveInput;
}

export function summarizeTerrainSplatSampleGridUsage(
  grid: TerrainSplatSampleGrid,
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
        byId?: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      },
  options: {
    maxActiveLayers?: number;
    maxUniqueLayerCombinations?: number;
    warnOnHardBoundaries?: boolean;
  } = {}
): TerrainSplatGridUsageSummary {
  const catalogEntries = toTerrainMaterialLayerEntries(catalog);
  const activeLayerCounts = new Map<TerrainMaterialLayerId, number>();
  const layerCombinationKeys = new Set<string>();
  const perSampleActiveLayerCount: number[] = [];

  for (const sample of grid.samples) {
    perSampleActiveLayerCount.push(sample.entries.length);
    const combinationKey = sample.entries
      .map((entry) => entry.layerId)
      .sort()
      .join('|');
    layerCombinationKeys.add(combinationKey);

    for (const entry of sample.entries) {
      activeLayerCounts.set(
        entry.layerId,
        (activeLayerCounts.get(entry.layerId) ?? 0) + 1
      );
    }
  }

  const activeLayerIds = [...activeLayerCounts.keys()].sort();
  const unusedLayerIds = catalogEntries
    .map((entry) => entry.id)
    .filter((layerId) => !activeLayerCounts.has(layerId))
    .sort();
  const dominantLayerId =
    [...activeLayerCounts.entries()].sort((left, right) =>
      right[1] === left[1]
        ? left[0].localeCompare(right[0])
        : right[1] - left[1]
    )[0]?.[0] ?? null;
  const warnings: TerrainSplatGridUsageWarning[] = [];
  const maxActiveLayers = options.maxActiveLayers;
  const maxUniqueLayerCombinations = options.maxUniqueLayerCombinations;
  const hardBoundaryCount = options.warnOnHardBoundaries
    ? countHardTerrainBoundaries(grid)
    : 0;

  if (
    typeof maxActiveLayers === 'number' &&
    activeLayerIds.length > maxActiveLayers
  ) {
    warnings.push({
      code: 'too-many-active-layers',
      message: `Terrain splat grid uses ${activeLayerIds.length} active layers, exceeding the chunk budget ${maxActiveLayers}.`,
    });
  }
  if (
    typeof maxUniqueLayerCombinations === 'number' &&
    layerCombinationKeys.size > maxUniqueLayerCombinations
  ) {
    warnings.push({
      code: 'too-many-unique-layer-combinations',
      message: `Terrain splat grid uses ${layerCombinationKeys.size} unique layer combinations, exceeding the chunk budget ${maxUniqueLayerCombinations}.`,
    });
  }
  if (hardBoundaryCount > 0) {
    warnings.push({
      code: 'hard-boundary-no-blend-zone',
      message: `Terrain splat grid contains ${hardBoundaryCount} hard boundary transition(s) with no blend zone.`,
    });
  }

  return {
    activeLayerIds,
    activeLayerCounts: Object.freeze(Object.fromEntries(activeLayerCounts)),
    uniqueLayerCombinationCount: layerCombinationKeys.size,
    dominantLayerId,
    perSampleActiveLayerCount,
    unusedLayerIds,
    hardBoundaryCount,
    warnings,
  };
}

function toTerrainMaterialLayerEntries(
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
        byId?: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      }
): readonly TerrainMaterialLayerCatalogEntry[] {
  if (Array.isArray(catalog)) {
    return catalog;
  }
  if (catalog instanceof Map) {
    return [...catalog.values()];
  }
  if (hasTerrainMaterialLayerCatalogEntries(catalog)) {
    return catalog.entries;
  }
  if (hasTerrainMaterialLayerCatalogMap(catalog)) {
    return [...catalog.byId.values()];
  }
  return [];
}

function hasTerrainMaterialLayerCatalogEntries(value: unknown): value is {
  entries: readonly TerrainMaterialLayerCatalogEntry[];
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'entries' in value &&
    Array.isArray(
      (value as { entries?: readonly TerrainMaterialLayerCatalogEntry[] })
        .entries
    )
  );
}

function hasTerrainMaterialLayerCatalogMap(value: unknown): value is {
  byId: ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'byId' in value &&
    (value as { byId?: unknown }).byId instanceof Map
  );
}

function normalizeTerrainSplatGridBounds(bounds: TerrainSplatGridBounds): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  step: number;
  width: number;
  height: number;
} {
  const minX = bounds.minX;
  const maxX = bounds.maxX;
  const minY = bounds.minY;
  const maxY = bounds.maxY;
  const step = bounds.step ?? 1;

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    throw new Error('Terrain splat grid bounds must use finite coordinates.');
  }
  if (!(step > 0) || !Number.isFinite(step)) {
    throw new Error(
      'Terrain splat grid bounds must use a positive finite step.'
    );
  }
  if (maxX < minX || maxY < minY) {
    throw new Error(
      'Terrain splat grid bounds must keep maximum coordinates at or above minimum coordinates.'
    );
  }

  const width = computeGridAxisLength(minX, maxX, step, 'x');
  const height = computeGridAxisLength(minY, maxY, step, 'y');

  return {
    minX,
    maxX,
    minY,
    maxY,
    step,
    width,
    height,
  };
}

function computeGridAxisLength(
  min: number,
  max: number,
  step: number,
  axis: 'x' | 'y'
): number {
  const span = max - min;
  const rawLength = span / step;
  const roundedLength = Math.round(rawLength);

  if (Math.abs(rawLength - roundedLength) > 1e-9) {
    throw new Error(
      `Terrain splat grid ${axis}-axis span ${span} must divide evenly by step ${step}.`
    );
  }

  return roundedLength + 1;
}

function getTerrainSplatGridOffset(
  grid: Pick<TerrainSplatSampleGrid, 'width' | 'height'>,
  column: number,
  row: number
): number {
  if (column < 0 || column >= grid.width || row < 0 || row >= grid.height) {
    throw new Error(
      `Terrain splat grid sample coordinates ${column}:${row} are outside ${grid.width}x${grid.height}.`
    );
  }

  return row * grid.width + column;
}

function countHardTerrainBoundaries(
  grid: Pick<TerrainSplatSampleGrid, 'width' | 'height' | 'samples'>
): number {
  let count = 0;

  for (let row = 0; row < grid.height; row += 1) {
    for (let column = 0; column < grid.width; column += 1) {
      const current = getTerrainSplatGridSample(
        grid as TerrainSplatSampleGrid,
        column,
        row
      );
      if (column + 1 < grid.width) {
        const right = getTerrainSplatGridSample(
          grid as TerrainSplatSampleGrid,
          column + 1,
          row
        );
        if (isHardTerrainBoundary(current, right)) {
          count += 1;
        }
      }
      if (row + 1 < grid.height) {
        const below = getTerrainSplatGridSample(
          grid as TerrainSplatSampleGrid,
          column,
          row + 1
        );
        if (isHardTerrainBoundary(current, below)) {
          count += 1;
        }
      }
    }
  }

  return count;
}

function isHardTerrainBoundary(
  left: TerrainSplatSample,
  right: TerrainSplatSample
): boolean {
  if (left.entries.length !== 1 || right.entries.length !== 1) {
    return false;
  }

  const leftLayerId = left.entries[0]?.layerId;
  const rightLayerId = right.entries[0]?.layerId;

  return (
    typeof leftLayerId === 'string' &&
    typeof rightLayerId === 'string' &&
    leftLayerId !== rightLayerId
  );
}

function blendTerrainSplatGridSample(params: {
  x: number;
  y: number;
  step: number;
  blendWidth: number;
  centerCell: ResolvedTerrainSplatGridCell;
  resolveCell: (x: number, y: number) => ResolvedTerrainSplatGridCell;
  fallbackLayerId?: TerrainMaterialLayerId;
}): TerrainSplatSample {
  const entries = params.centerCell.sample.entries.map((entry) => ({
    layerId: entry.layerId,
    weight: entry.weight,
  }));

  for (
    let rowOffset = -params.blendWidth;
    rowOffset <= params.blendWidth;
    rowOffset += 1
  ) {
    for (
      let columnOffset = -params.blendWidth;
      columnOffset <= params.blendWidth;
      columnOffset += 1
    ) {
      if (columnOffset === 0 && rowOffset === 0) {
        continue;
      }

      const neighborCell = params.resolveCell(
        params.x + columnOffset * params.step,
        params.y + rowOffset * params.step
      );
      if (neighborCell.tile.kind === params.centerCell.tile.kind) {
        continue;
      }

      const blendWeight = computeTerrainSplatNeighborBlendWeight(
        columnOffset,
        rowOffset,
        params.blendWidth
      );
      if (blendWeight <= 0) {
        continue;
      }

      for (const entry of neighborCell.sample.entries) {
        entries.push({
          layerId: entry.layerId,
          weight: entry.weight * blendWeight,
        });
      }
    }
  }

  return normalizeTerrainSplatSample(
    { entries },
    {
      fallbackLayerId: params.fallbackLayerId,
    }
  );
}

function computeTerrainSplatNeighborBlendWeight(
  columnOffset: number,
  rowOffset: number,
  blendWidth: number
): number {
  const chebyshevDistance = Math.max(
    Math.abs(columnOffset),
    Math.abs(rowOffset)
  );
  if (chebyshevDistance > blendWidth) {
    return 0;
  }

  const distanceFactor =
    (blendWidth - chebyshevDistance + 1) / (blendWidth + 1);
  const directionalFactor = columnOffset !== 0 && rowOffset !== 0 ? 0.18 : 0.32;

  return distanceFactor * directionalFactor;
}

function normalizeTerrainSplatBlendWidth(value: unknown): number {
  if (value === undefined) {
    return 0;
  }
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isInteger(value)
  ) {
    throw new Error(
      'Terrain splat grid blendWidth must be a non-negative finite integer.'
    );
  }
  return value;
}
