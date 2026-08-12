export type TerrainMaterialLayerId = string;

export type TerrainMaterialLayerDefinition = {
  id: TerrainMaterialLayerId;
  baseColorTextureId: string;
  normalTextureId: string;
  roughnessTextureId: string;
  metalnessTextureId?: string;
  ambientOcclusionTextureId?: string;
  textureScale: number;
  defaultTint: string;
  defaultRoughness: number;
  defaultMetalness?: number;
};

export type TerrainMaterialLayerCatalogEntry =
  TerrainMaterialLayerDefinition & {
    index: number;
  };

export type TerrainSplatWeight = {
  layerId: TerrainMaterialLayerId;
  weight: number;
};

export type TerrainSplatSample = {
  entries: readonly TerrainSplatWeight[];
};

export const MAX_TERRAIN_SPLAT_SAMPLE_LAYERS = 4;
export const MIN_TERRAIN_SPLAT_WEIGHT = 0.01;

export function validateTerrainMaterialLayerDefinition(
  layer: TerrainMaterialLayerDefinition
): string[] {
  const errors: string[] = [];

  if (typeof layer.id !== 'string' || layer.id.trim().length === 0) {
    errors.push('Terrain material layer id must be a non-empty string.');
  }
  if (
    typeof layer.baseColorTextureId !== 'string' ||
    layer.baseColorTextureId.trim().length === 0
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must define a non-empty baseColorTextureId.`
    );
  }
  if (
    typeof layer.normalTextureId !== 'string' ||
    layer.normalTextureId.trim().length === 0
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must define a non-empty normalTextureId.`
    );
  }
  if (
    typeof layer.roughnessTextureId !== 'string' ||
    layer.roughnessTextureId.trim().length === 0
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must define a non-empty roughnessTextureId.`
    );
  }
  if (
    layer.metalnessTextureId !== undefined &&
    (typeof layer.metalnessTextureId !== 'string' ||
      layer.metalnessTextureId.trim().length === 0)
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must omit metalnessTextureId or provide a non-empty string.`
    );
  }
  if (
    layer.ambientOcclusionTextureId !== undefined &&
    (typeof layer.ambientOcclusionTextureId !== 'string' ||
      layer.ambientOcclusionTextureId.trim().length === 0)
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must omit ambientOcclusionTextureId or provide a non-empty string.`
    );
  }
  if (!(
    typeof layer.textureScale === 'number' &&
    Number.isFinite(layer.textureScale) &&
    layer.textureScale > 0
  )) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must define a positive finite textureScale.`
    );
  }
  if (
    typeof layer.defaultTint !== 'string' ||
    !/^#[0-9a-f]{6}$/iu.test(layer.defaultTint.trim())
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must define a #RRGGBB defaultTint.`
    );
  }
  if (!isNormalizedScalar(layer.defaultRoughness)) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must define defaultRoughness within 0..1.`
    );
  }
  if (
    layer.defaultMetalness !== undefined &&
    !isNormalizedScalar(layer.defaultMetalness)
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must omit defaultMetalness or define it within 0..1.`
    );
  }

  return errors;
}

export function createTerrainMaterialLayerCatalog(
  layers: readonly TerrainMaterialLayerDefinition[]
): {
  entries: readonly TerrainMaterialLayerCatalogEntry[];
  byId: ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>;
} {
  const errors: string[] = [];
  const byId = new Map<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  >();

  layers.forEach((layer, index) => {
    errors.push(...validateTerrainMaterialLayerDefinition(layer));
    if (byId.has(layer.id)) {
      errors.push(
        `Terrain material layer id ${formatLayerLabel(layer.id)} must be unique within the shared catalog.`
      );
      return;
    }
    byId.set(layer.id, {
      ...layer,
      index,
    });
  });

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return {
    entries: [...byId.values()],
    byId,
  };
}

export function normalizeTerrainSplatSample(
  sample: TerrainSplatSample,
  options: {
    maxActiveLayers?: number;
    minimumWeight?: number;
    fallbackLayerId?: TerrainMaterialLayerId;
  } = {}
): TerrainSplatSample {
  const maxActiveLayers =
    options.maxActiveLayers ?? MAX_TERRAIN_SPLAT_SAMPLE_LAYERS;
  const minimumWeight = options.minimumWeight ?? MIN_TERRAIN_SPLAT_WEIGHT;
  const collapsed = collapseTerrainSplatWeights(sample.entries);
  const clamped = collapsed
    .map(({ layerId, weight }) => ({
      layerId,
      weight: clampWeight(weight),
    }))
    .filter((entry) => entry.weight > 0);
  const sorted = [...clamped].sort((left, right) =>
    right.weight === left.weight
      ? left.layerId.localeCompare(right.layerId)
      : right.weight - left.weight
  );
  const trimmed = sorted
    .slice(0, Math.max(1, Math.floor(maxActiveLayers)))
    .filter((entry) => entry.weight >= minimumWeight);

  if (trimmed.length === 0) {
    if (!options.fallbackLayerId) {
      return { entries: [] };
    }
    return {
      entries: [{ layerId: options.fallbackLayerId, weight: 1 }],
    };
  }

  const totalWeight = trimmed.reduce((sum, entry) => sum + entry.weight, 0);
  if (!(totalWeight > 0)) {
    if (!options.fallbackLayerId) {
      return { entries: [] };
    }
    return {
      entries: [{ layerId: options.fallbackLayerId, weight: 1 }],
    };
  }

  return {
    entries: trimmed.map((entry, index, entries) => {
      if (index === entries.length - 1) {
        const priorTotal = entries
          .slice(0, -1)
          .reduce((sum, current) => sum + current.weight / totalWeight, 0);
        return {
          layerId: entry.layerId,
          weight: clampWeight(1 - priorTotal),
        };
      }
      return {
        layerId: entry.layerId,
        weight: entry.weight / totalWeight,
      };
    }),
  };
}

export function validateTerrainSplatSample(
  sample: TerrainSplatSample,
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      }
): string[] {
  const errors: string[] = [];
  const layerMap = 'byId' in catalog ? catalog.byId : catalog;
  const entries = sample.entries;

  if (!Array.isArray(entries)) {
    return ['Terrain splat sample entries must be an array.'];
  }
  if (entries.length > MAX_TERRAIN_SPLAT_SAMPLE_LAYERS) {
    errors.push(
      `Terrain splat sample must not exceed ${MAX_TERRAIN_SPLAT_SAMPLE_LAYERS} active layers.`
    );
  }

  let totalWeight = 0;
  for (const entry of entries) {
    if (
      typeof entry.layerId !== 'string' ||
      entry.layerId.trim().length === 0
    ) {
      errors.push('Terrain splat sample layerId must be a non-empty string.');
      continue;
    }
    if (!layerMap.has(entry.layerId)) {
      errors.push(
        `Terrain splat sample references unknown layer ${formatLayerLabel(entry.layerId)}.`
      );
    }
    if (typeof entry.weight !== 'number' || Number.isNaN(entry.weight)) {
      errors.push(
        `Terrain splat sample weight for ${formatLayerLabel(entry.layerId)} must not be NaN.`
      );
      continue;
    }
    if (
      !Number.isFinite(entry.weight) ||
      entry.weight < 0 ||
      entry.weight > 1
    ) {
      errors.push(
        `Terrain splat sample weight for ${formatLayerLabel(entry.layerId)} must stay within 0..1.`
      );
      continue;
    }
    totalWeight += entry.weight;
  }

  if (entries.length > 0 && Math.abs(totalWeight - 1) > 0.001) {
    errors.push(
      `Terrain splat sample weights must sum near 1.0, received ${totalWeight.toFixed(3)}.`
    );
  }

  return errors;
}

function collapseTerrainSplatWeights(
  entries: readonly TerrainSplatWeight[]
): TerrainSplatWeight[] {
  const byLayer = new Map<TerrainMaterialLayerId, number>();
  for (const entry of entries) {
    if (
      typeof entry.layerId !== 'string' ||
      entry.layerId.trim().length === 0 ||
      typeof entry.weight !== 'number'
    ) {
      continue;
    }
    byLayer.set(
      entry.layerId,
      (byLayer.get(entry.layerId) ?? 0) + entry.weight
    );
  }
  return [...byLayer.entries()].map(([layerId, weight]) => ({
    layerId,
    weight,
  }));
}

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function isNormalizedScalar(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function formatLayerLabel(value: string): string {
  return `"${value}"`;
}
