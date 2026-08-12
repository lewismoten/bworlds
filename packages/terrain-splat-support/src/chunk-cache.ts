import { createBoundedCache } from '@bworlds/cache-support';
import type { TerrainSplatWorkerBuildRequest } from './worker-contract.ts';

export type TerrainSplatChunkStateKeyInput = {
  request: TerrainSplatWorkerBuildRequest;
  terrainStateRevision?: string | number;
  cameraX?: number;
  cameraY?: number;
  cameraFacing?: number;
};

export type TerrainSplatChunkBuildCache<TResult> = {
  clear(): void;
  get(key: string): TResult | undefined;
  getOrCreate(
    input: TerrainSplatChunkStateKeyInput,
    create: () => TResult
  ): TResult;
  has(key: string): boolean;
  set(key: string, value: TResult): void;
  size(): number;
};

export function createTerrainSplatChunkStateKey(
  input: TerrainSplatChunkStateKeyInput
): string {
  return stableStringify({
    terrainStateRevision: normalizeCacheScalar(input.terrainStateRevision),
    seed: input.request.seed,
    bounds: input.request.bounds,
    build: {
      blendWidth: input.request.blendWidth ?? null,
      lodStepMultiplier: input.request.lodStepMultiplier ?? null,
      fallbackKind: input.request.fallbackKind ?? null,
      fallbackLayerId: input.request.fallbackLayerId ?? null,
    },
    tiles: [...input.request.tiles]
      .sort((left, right) =>
        left.y === right.y
          ? left.x === right.x
            ? left.kind.localeCompare(right.kind)
            : left.x - right.x
          : left.y - right.y
      )
      .map((tile) => ({
        x: tile.x,
        y: tile.y,
        kind: tile.kind,
        signals: tile.signals ?? null,
      })),
  });
}

export function createTerrainSplatChunkBuildCache<TResult>(
  maxEntries = 32
): TerrainSplatChunkBuildCache<TResult> {
  const cache = createBoundedCache<string, TResult>(maxEntries);

  return {
    clear() {
      cache.clear();
    },
    get(key) {
      return cache.get(key);
    },
    getOrCreate(input, create) {
      const key = createTerrainSplatChunkStateKey(input);
      return cache.getOrCreate(key, create);
    },
    has(key) {
      return cache.has(key);
    },
    set(key, value) {
      cache.set(key, value);
    },
    size() {
      return cache.size();
    },
  };
}

function normalizeCacheScalar(value: string | number | undefined): string | number | null {
  return value ?? null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
