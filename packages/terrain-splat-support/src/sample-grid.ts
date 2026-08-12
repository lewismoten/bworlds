import type { Kind, OverworldSignals, Seed } from '@bworlds/plugin-api';
import {
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
  signals?: Partial<OverworldSignals>;
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
  'too-many-active-layers' | 'too-many-unique-layer-combinations';

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
  warnings: readonly TerrainSplatGridUsageWarning[];
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
}): TerrainSplatSampleGrid {
  const { width, height, minX, maxX, minY, maxY, step } =
    normalizeTerrainSplatGridBounds(params.bounds);
  const samples: TerrainSplatSample[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const x = minX + column * step;
      const y = minY + row * step;
      const tile = params.resolveTile({ x, y });

      samples.push(
        resolveTerrainKindSplatSample(
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
        )
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
  } = {}
): TerrainSplatGridUsageSummary {
  const catalogEntries = Array.isArray(catalog)
    ? catalog
    : catalog instanceof Map
      ? [...catalog.values()]
      : (catalog.entries ?? (catalog.byId ? [...catalog.byId.values()] : []));
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

  return {
    activeLayerIds,
    activeLayerCounts: Object.freeze(Object.fromEntries(activeLayerCounts)),
    uniqueLayerCombinationCount: layerCombinationKeys.size,
    dominantLayerId,
    perSampleActiveLayerCount,
    unusedLayerIds,
    warnings,
  };
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
