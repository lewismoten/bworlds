import {
  createMapFeatureGeneratorPlugin,
  type MapFeatureGeneratorPlugin,
  type PmtilesExportRequest,
} from './map-pmtiles.ts';
import type { MapFeatureRecord } from './map-features.ts';

export type MapDerivedDataSourceReference = {
  kind: string;
  sourceId: string;
  description?: string;
};

export interface DerivedMapFeatureGeneratorPlugin
  extends MapFeatureGeneratorPlugin {
  dataSources: readonly MapDerivedDataSourceReference[];
}

export function createMapDerivedDataSourceReference(
  source: MapDerivedDataSourceReference
): MapDerivedDataSourceReference {
  const kind = normalizeNonEmptyString(source.kind, 'Map data source kind');
  const sourceId = normalizeNonEmptyString(
    source.sourceId,
    'Map data source sourceId'
  );
  const description =
    typeof source.description === 'string' && source.description.trim().length > 0
      ? source.description.trim()
      : undefined;
  return {
    kind,
    sourceId,
    ...(description == null ? {} : { description }),
  };
}

export function createMapDerivedDataSourceReferences(
  sources: readonly MapDerivedDataSourceReference[]
): readonly MapDerivedDataSourceReference[] {
  if (sources.length === 0) {
    throw new Error('Map data sources must include at least one reference.');
  }
  const deduped = new Map<string, MapDerivedDataSourceReference>();
  for (const source of sources) {
    const normalized = createMapDerivedDataSourceReference(source);
    const key = `${normalized.kind}:${normalized.sourceId}`;
    const existing = deduped.get(key);
    deduped.set(key, {
      kind: normalized.kind,
      sourceId: normalized.sourceId,
      description: existing?.description ?? normalized.description,
    });
  }
  return Object.freeze([...deduped.values()]);
}

export function createDerivedMapFeatureGeneratorPlugin(options: {
  id: string;
  label?: string;
  layerId: string;
  dataSources: readonly MapDerivedDataSourceReference[];
  getFeatures(request: PmtilesExportRequest): readonly MapFeatureRecord[];
}): DerivedMapFeatureGeneratorPlugin {
  const generator = createMapFeatureGeneratorPlugin({
    id: options.id,
    label: options.label,
    layerId: options.layerId,
    getFeatures: options.getFeatures,
  });
  return {
    ...generator,
    dataSources: createMapDerivedDataSourceReferences(options.dataSources),
  };
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}
