import type {
  Seed,
  WorldGenerationBounds,
  WorldGenerationFeatureRecordLike,
  WorldGenerationLayerContext,
  WorldGenerationLayerDependency,
  WorldGenerationLayerPlugin,
  WorldGenerationLayerPluginId,
  WorldGenerationRecordType,
} from './types';
import {
  createWorldGenerationDependencyKey,
  sortWorldGenerationLayerPlugins,
} from './world-generation-layers';

export interface WorldGenerationRecordQuery {
  bounds?: WorldGenerationBounds;
  pluginId?: WorldGenerationLayerPluginId;
  recordType?: WorldGenerationRecordType;
  zoomLevel?: number;
}

export interface WorldGenerationRecordSummary {
  pluginId: WorldGenerationLayerPluginId;
  recordType: WorldGenerationRecordType;
  count: number;
}

export interface WorldGenerationRegionRunResult {
  readonly bounds: WorldGenerationBounds;
  readonly orderedPlugins: readonly WorldGenerationLayerPlugin[];
  readonly records: readonly WorldGenerationFeatureRecordLike[];
  queryRecords(
    query?: WorldGenerationRecordQuery
  ): readonly WorldGenerationFeatureRecordLike[];
  summarizeRecords(
    query?: WorldGenerationRecordQuery
  ): readonly WorldGenerationRecordSummary[];
}

export interface WorldGenerationRegionRunner {
  runRegion(params: {
    seed: Seed;
    bounds: WorldGenerationBounds;
    worldRevision?: string | number;
  }): WorldGenerationRegionRunResult;
  clearCache(): void;
}

export function createWorldGenerationRegionRunner(params: {
  plugins: readonly WorldGenerationLayerPlugin[];
  maxCachedRegions?: number;
}): WorldGenerationRegionRunner {
  const orderedPlugins = sortWorldGenerationLayerPlugins(params.plugins);
  const maxCachedRegions = normalizeMaxCachedRegions(params.maxCachedRegions);
  const regionCache = new Map<string, WorldGenerationRegionRunResult>();

  function runRegion({
    seed,
    bounds,
    worldRevision,
  }: {
    seed: Seed;
    bounds: WorldGenerationBounds;
    worldRevision?: string | number;
  }): WorldGenerationRegionRunResult {
    const normalizedBounds = normalizeBounds(bounds);
    const cacheKey = createRegionCacheKey({
      seed,
      worldRevision,
      bounds: normalizedBounds,
      orderedPlugins,
    });
    const cached = regionCache.get(cacheKey);
    if (cached) {
      regionCache.delete(cacheKey);
      regionCache.set(cacheKey, cached);
      return cached;
    }

    const result = runWorldGenerationRegion({
      seed,
      bounds: normalizedBounds,
      worldRevision,
      orderedPlugins,
    });
    regionCache.set(cacheKey, result);
    trimOldestEntries(regionCache, maxCachedRegions);
    return result;
  }

  return {
    runRegion,
    clearCache() {
      regionCache.clear();
    },
  };
}

function runWorldGenerationRegion(params: {
  seed: Seed;
  bounds: WorldGenerationBounds;
  worldRevision?: string | number;
  orderedPlugins: readonly WorldGenerationLayerPlugin[];
}): WorldGenerationRegionRunResult {
  const dependencyIndex = new Map<string, WorldGenerationFeatureRecordLike[]>();
  const records: WorldGenerationFeatureRecordLike[] = [];
  const queryCache = new Map<string, readonly WorldGenerationFeatureRecordLike[]>();
  const summaryCache = new Map<string, readonly WorldGenerationRecordSummary[]>();

  const contextBase = {
    seed: params.seed,
    worldRevision: params.worldRevision,
    bounds: params.bounds,
  } satisfies Omit<WorldGenerationLayerContext, 'queryRecords'>;

  for (const plugin of params.orderedPlugins) {
    const pluginRecords = plugin.run({
      ...contextBase,
      queryRecords(dependency: WorldGenerationLayerDependency) {
        return queryDependencyRecords(
          dependencyIndex,
          dependency,
          params.bounds
        );
      },
    });
    for (const record of pluginRecords) {
      const normalizedRecord = normalizeFeatureRecord(plugin.id, record);
      records.push(normalizedRecord);
      const dependencyKey = createWorldGenerationDependencyKey({
        pluginId: normalizedRecord.pluginId,
        recordType: normalizedRecord.type,
      });
      const bucket = dependencyIndex.get(dependencyKey);
      if (bucket) {
        bucket.push(normalizedRecord);
      } else {
        dependencyIndex.set(dependencyKey, [normalizedRecord]);
      }
    }
  }

  const frozenRecords = Object.freeze(records.slice());

  return {
    bounds: params.bounds,
    orderedPlugins: Object.freeze(params.orderedPlugins.slice()),
    records: frozenRecords,
    queryRecords(query = {}) {
      const normalizedQuery = normalizeRecordQuery(query);
      const cacheKey = createRecordQueryCacheKey(normalizedQuery);
      const cached = queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      const filtered = Object.freeze(
        frozenRecords.filter((record) => matchesRecordQuery(record, normalizedQuery))
      );
      queryCache.set(cacheKey, filtered);
      return filtered;
    },
    summarizeRecords(query = {}) {
      const normalizedQuery = normalizeRecordQuery(query);
      const cacheKey = createRecordQueryCacheKey(normalizedQuery);
      const cached = summaryCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      const counts = new Map<string, WorldGenerationRecordSummary>();
      for (const record of frozenRecords) {
        if (!matchesRecordQuery(record, normalizedQuery)) {
          continue;
        }
        const key = createWorldGenerationDependencyKey({
          pluginId: record.pluginId,
          recordType: record.type,
        });
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, {
            pluginId: record.pluginId,
            recordType: record.type,
            count: 1,
          });
        }
      }
      const summarized = Object.freeze(
        [...counts.values()].sort(compareRecordSummaries)
      );
      summaryCache.set(cacheKey, summarized);
      return summarized;
    },
  };
}

function queryDependencyRecords(
  dependencyIndex: ReadonlyMap<string, readonly WorldGenerationFeatureRecordLike[]>,
  dependency: WorldGenerationLayerDependency,
  bounds: WorldGenerationBounds
): readonly WorldGenerationFeatureRecordLike[] {
  const key = createWorldGenerationDependencyKey(dependency);
  const records = dependencyIndex.get(key) ?? [];
  return records.filter((record) => boundsIntersect(record.bounds, bounds));
}

function normalizeFeatureRecord(
  pluginId: WorldGenerationLayerPluginId,
  record: WorldGenerationFeatureRecordLike
): WorldGenerationFeatureRecordLike {
  return {
    ...record,
    pluginId,
    bounds: normalizeBounds(record.bounds),
  };
}

function normalizeRecordQuery(
  query: WorldGenerationRecordQuery
): WorldGenerationRecordQuery {
  return {
    bounds: query.bounds ? normalizeBounds(query.bounds) : undefined,
    pluginId: normalizeOptionalString(query.pluginId),
    recordType: normalizeOptionalString(query.recordType),
    zoomLevel:
      typeof query.zoomLevel === 'number' && Number.isFinite(query.zoomLevel)
        ? query.zoomLevel
        : undefined,
  };
}

function matchesRecordQuery(
  record: WorldGenerationFeatureRecordLike,
  query: WorldGenerationRecordQuery
): boolean {
  if (query.pluginId && record.pluginId !== query.pluginId) {
    return false;
  }
  if (query.recordType && record.type !== query.recordType) {
    return false;
  }
  if (query.bounds && !boundsIntersect(record.bounds, query.bounds)) {
    return false;
  }
  if (
    query.zoomLevel !== undefined &&
    !matchesZoomLevel(record.zoomRelevance, query.zoomLevel)
  ) {
    return false;
  }
  return true;
}

function matchesZoomLevel(
  zoomRelevance: WorldGenerationFeatureRecordLike['zoomRelevance'],
  zoomLevel: number
): boolean {
  if (!zoomRelevance) {
    return true;
  }
  if (
    typeof zoomRelevance.min === 'number' &&
    Number.isFinite(zoomRelevance.min) &&
    zoomLevel < zoomRelevance.min
  ) {
    return false;
  }
  if (
    typeof zoomRelevance.max === 'number' &&
    Number.isFinite(zoomRelevance.max) &&
    zoomLevel > zoomRelevance.max
  ) {
    return false;
  }
  return true;
}

function createRegionCacheKey(params: {
  seed: Seed;
  worldRevision?: string | number;
  bounds: WorldGenerationBounds;
  orderedPlugins: readonly WorldGenerationLayerPlugin[];
}): string {
  return [
    `seed=${String(params.seed)}`,
    `revision=${params.worldRevision === undefined ? '' : String(params.worldRevision)}`,
    `bounds=${createBoundsKey(params.bounds)}`,
    `plugins=${params.orderedPlugins.map((plugin) => plugin.id).join(',')}`,
  ].join('|');
}

function createRecordQueryCacheKey(query: WorldGenerationRecordQuery): string {
  return [
    query.bounds ? createBoundsKey(query.bounds) : '',
    query.pluginId ?? '',
    query.recordType ?? '',
    query.zoomLevel === undefined ? '' : String(query.zoomLevel),
  ].join('|');
}

function createBoundsKey(bounds: WorldGenerationBounds): string {
  return `${bounds.minX}:${bounds.maxX}:${bounds.minY}:${bounds.maxY}`;
}

function normalizeBounds(bounds: WorldGenerationBounds): WorldGenerationBounds {
  return {
    minX: Math.min(bounds.minX, bounds.maxX),
    maxX: Math.max(bounds.minX, bounds.maxX),
    minY: Math.min(bounds.minY, bounds.maxY),
    maxY: Math.max(bounds.minY, bounds.maxY),
  };
}

function boundsIntersect(
  left: WorldGenerationBounds,
  right: WorldGenerationBounds
): boolean {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeMaxCachedRegions(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 16;
  }
  return Math.max(1, Math.floor(value));
}

function trimOldestEntries(
  cache: Map<string, unknown>,
  maxEntries: number
): void {
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) {
      return;
    }
    cache.delete(oldestKey);
  }
}

function compareRecordSummaries(
  left: WorldGenerationRecordSummary,
  right: WorldGenerationRecordSummary
): number {
  if (left.pluginId !== right.pluginId) {
    return left.pluginId.localeCompare(right.pluginId);
  }
  if (left.recordType !== right.recordType) {
    return left.recordType.localeCompare(right.recordType);
  }
  return left.count - right.count;
}
