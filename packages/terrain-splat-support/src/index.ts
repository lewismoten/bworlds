import {
  appendHashSeedLabel,
  hash2DWithSeed,
  registerHashLabel,
  resolveHashSeedInput,
} from '@bworlds/core/hash';
import type { Kind, OverworldSignals, Seed } from '@bworlds/plugin-api';
import {
  resolveTerrainMaterialFamilyVariant,
  type TerrainMaterialFamilyCatalogEntry,
  type TerrainMaterialFamilyId,
} from './variant-pool.ts';

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
  tintVariation?: number;
  tintVariationCellSize?: number;
  uvRotationQuarterTurns?: readonly TerrainUvRotationQuarterTurn[];
  allowMirrorU?: boolean;
  allowMirrorV?: boolean;
};

export type TerrainUvRotationQuarterTurn = 0 | 1 | 2 | 3;

export type TerrainMaterialLayerUvTransform = {
  textureScale: number;
  rotationQuarterTurns: TerrainUvRotationQuarterTurn;
  mirrorU: boolean;
  mirrorV: boolean;
};

export type TerrainMaterialLayerWorldUvSample =
  TerrainMaterialLayerUvTransform & {
    u: number;
    v: number;
  };

export type TerrainMaterialLayerTintTransform = {
  defaultTint: string;
  resolvedTint: string;
  variationStrength: number;
};

export type TerrainMaterialLayerCatalogEntry =
  TerrainMaterialLayerDefinition & {
    index: number;
  };

export type TerrainMaterialLayerTextureProperty =
  | 'baseColorTextureId'
  | 'normalTextureId'
  | 'roughnessTextureId'
  | 'metalnessTextureId'
  | 'ambientOcclusionTextureId';

export type TerrainSplatWeight = {
  layerId: TerrainMaterialLayerId;
  weight: number;
};

export type TerrainSplatSample = {
  entries: readonly TerrainSplatWeight[];
};

export type PackedTerrainSplatSample = {
  layerIndices: Uint8Array;
  weights: Uint8Array;
};

export type TerrainKindSplatCondition = {
  minElevation?: number;
  maxElevation?: number;
  minMoisture?: number;
  maxMoisture?: number;
  minRiverSignal?: number;
  maxRiverSignal?: number;
  minRoadSignal?: number;
  maxRoadSignal?: number;
};

export type TerrainKindSplatBlendDefinition = {
  layerId: TerrainMaterialLayerId;
  weight: number;
  when?: TerrainKindSplatCondition;
};

export type TerrainKindSplatDefinition = {
  kind: Kind;
  baseLayerIds?: readonly TerrainMaterialLayerId[];
  baseFamilyId?: TerrainMaterialFamilyId;
  blends?: readonly TerrainKindSplatBlendDefinition[];
  exclude?: boolean;
};

export type TerrainKindSplatCatalogEntry = TerrainKindSplatDefinition & {
  index: number;
};

export type ResolveTerrainKindSplatSampleInput = {
  seed: Seed;
  x: number;
  y: number;
  kind: Kind;
  signals?: Partial<OverworldSignals>;
};

export type OverworldTerrainSplatLayerSet = {
  grassLayerIds: readonly TerrainMaterialLayerId[];
  soilLayerId: TerrainMaterialLayerId;
  leafLayerId: TerrainMaterialLayerId;
  rockLayerId: TerrainMaterialLayerId;
  sandLayerId: TerrainMaterialLayerId;
  dirtLayerId: TerrainMaterialLayerId;
  gravelLayerId: TerrainMaterialLayerId;
  mudLayerId: TerrainMaterialLayerId;
  snowLayerId: TerrainMaterialLayerId;
  dirtRoadLayerId: TerrainMaterialLayerId;
  gravelRoadLayerId: TerrainMaterialLayerId;
};

export const MAX_TERRAIN_SPLAT_SAMPLE_LAYERS = 4;
export const MIN_TERRAIN_SPLAT_WEIGHT = 0.01;
export const PACKED_TERRAIN_SPLAT_WEIGHT_MAX = 255;

const TERRAIN_SPLAT_VARIANT_LABEL = registerHashLabel('terrain-splat-variant');
const TERRAIN_SPLAT_UV_ROTATION_LABEL = registerHashLabel(
  'terrain-splat-uv-rotation'
);
const TERRAIN_SPLAT_UV_MIRROR_U_LABEL = registerHashLabel(
  'terrain-splat-uv-mirror-u'
);
const TERRAIN_SPLAT_UV_MIRROR_V_LABEL = registerHashLabel(
  'terrain-splat-uv-mirror-v'
);
const TERRAIN_SPLAT_TINT_VARIATION_LABEL = registerHashLabel(
  'terrain-splat-tint-variation'
);

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
  if (
    layer.tintVariation !== undefined &&
    !isNormalizedScalar(layer.tintVariation)
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must omit tintVariation or define it within 0..1.`
    );
  }
  if (
    layer.tintVariationCellSize !== undefined &&
    !(
      typeof layer.tintVariationCellSize === 'number' &&
      Number.isFinite(layer.tintVariationCellSize) &&
      layer.tintVariationCellSize > 0
    )
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must omit tintVariationCellSize or define a positive finite value.`
    );
  }
  if (layer.uvRotationQuarterTurns !== undefined) {
    if (!Array.isArray(layer.uvRotationQuarterTurns)) {
      errors.push(
        `Terrain material layer ${formatLayerLabel(layer.id)} must omit uvRotationQuarterTurns or define an array of quarter turns.`
      );
    } else if (layer.uvRotationQuarterTurns.length === 0) {
      errors.push(
        `Terrain material layer ${formatLayerLabel(layer.id)} must not use an empty uvRotationQuarterTurns array.`
      );
    } else {
      const seenQuarterTurns = new Set<TerrainUvRotationQuarterTurn>();
      for (const quarterTurns of layer.uvRotationQuarterTurns) {
        if (!isTerrainUvRotationQuarterTurn(quarterTurns)) {
          errors.push(
            `Terrain material layer ${formatLayerLabel(layer.id)} uvRotationQuarterTurns entries must stay within 0..3.`
          );
          continue;
        }
        if (seenQuarterTurns.has(quarterTurns)) {
          errors.push(
            `Terrain material layer ${formatLayerLabel(layer.id)} must not repeat uvRotationQuarterTurns entries.`
          );
          continue;
        }
        seenQuarterTurns.add(quarterTurns);
      }
    }
  }
  if (
    layer.allowMirrorU !== undefined &&
    typeof layer.allowMirrorU !== 'boolean'
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must omit allowMirrorU or define a boolean.`
    );
  }
  if (
    layer.allowMirrorV !== undefined &&
    typeof layer.allowMirrorV !== 'boolean'
  ) {
    errors.push(
      `Terrain material layer ${formatLayerLabel(layer.id)} must omit allowMirrorV or define a boolean.`
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

export function validateTerrainKindSplatDefinition(
  definition: TerrainKindSplatDefinition,
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      },
  options: {
    familyCatalog?:
      | ReadonlyMap<TerrainMaterialFamilyId, TerrainMaterialFamilyCatalogEntry>
      | {
          byId: ReadonlyMap<
            TerrainMaterialFamilyId,
            TerrainMaterialFamilyCatalogEntry
          >;
        };
  } = {}
): string[] {
  const errors: string[] = [];
  const layerMap = 'byId' in catalog ? catalog.byId : catalog;
  const familyMap = options.familyCatalog
    ? 'byId' in options.familyCatalog
      ? options.familyCatalog.byId
      : options.familyCatalog
    : null;

  if (
    typeof definition.kind !== 'string' ||
    definition.kind.trim().length === 0
  ) {
    errors.push('Terrain splat kind definition must use a non-empty kind.');
  }
  if (definition.exclude === true) {
    return errors;
  }

  if (
    (!Array.isArray(definition.baseLayerIds) ||
      definition.baseLayerIds.length === 0) &&
    typeof definition.baseFamilyId !== 'string'
  ) {
    errors.push(
      `Terrain splat kind ${formatLayerLabel(definition.kind)} must define baseLayerIds or one baseFamilyId unless it is excluded.`
    );
  }
  if (
    Array.isArray(definition.baseLayerIds) &&
    definition.baseLayerIds.length > 0 &&
    typeof definition.baseFamilyId === 'string'
  ) {
    errors.push(
      `Terrain splat kind ${formatLayerLabel(definition.kind)} must define baseLayerIds or baseFamilyId, not both.`
    );
  }

  for (const layerId of definition.baseLayerIds ?? []) {
    if (!layerMap.has(layerId)) {
      errors.push(
        `Terrain splat kind ${formatLayerLabel(definition.kind)} references unknown base layer ${formatLayerLabel(layerId)}.`
      );
    }
  }
  if (definition.baseFamilyId !== undefined) {
    if (
      typeof definition.baseFamilyId !== 'string' ||
      definition.baseFamilyId.trim().length === 0
    ) {
      errors.push(
        `Terrain splat kind ${formatLayerLabel(definition.kind)} must use a non-empty baseFamilyId when provided.`
      );
    } else if (!familyMap?.has(definition.baseFamilyId)) {
      errors.push(
        `Terrain splat kind ${formatLayerLabel(definition.kind)} references unknown base family ${formatLayerLabel(definition.baseFamilyId)}.`
      );
    }
  }

  for (const blend of definition.blends ?? []) {
    if (!layerMap.has(blend.layerId)) {
      errors.push(
        `Terrain splat kind ${formatLayerLabel(definition.kind)} references unknown blend layer ${formatLayerLabel(blend.layerId)}.`
      );
    }
    if (!isNormalizedScalar(blend.weight) || blend.weight === 0) {
      errors.push(
        `Terrain splat kind ${formatLayerLabel(definition.kind)} must define blend weights within 0..1.`
      );
    }
    errors.push(
      ...validateTerrainKindSplatCondition(definition.kind, blend.when)
    );
  }

  return errors;
}

export function createTerrainKindSplatCatalog(
  definitions: readonly TerrainKindSplatDefinition[],
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      },
  options: {
    familyCatalog?:
      | ReadonlyMap<TerrainMaterialFamilyId, TerrainMaterialFamilyCatalogEntry>
      | {
          byId: ReadonlyMap<
            TerrainMaterialFamilyId,
            TerrainMaterialFamilyCatalogEntry
          >;
        };
  } = {}
): {
  entries: readonly TerrainKindSplatCatalogEntry[];
  byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
} {
  const errors: string[] = [];
  const byKind = new Map<Kind, TerrainKindSplatCatalogEntry>();

  definitions.forEach((definition, index) => {
    errors.push(
      ...validateTerrainKindSplatDefinition(definition, catalog, options)
    );
    if (byKind.has(definition.kind)) {
      errors.push(
        `Terrain splat kind ${formatLayerLabel(definition.kind)} must be unique within the shared catalog.`
      );
      return;
    }
    byKind.set(definition.kind, {
      ...definition,
      index,
    });
  });

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return {
    entries: [...byKind.values()],
    byKind,
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

export function resolveTerrainKindSplatSample(
  input: ResolveTerrainKindSplatSampleInput,
  kindCatalog:
    | ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>
    | {
        byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
      },
  options: {
    fallbackKind?: Kind;
    fallbackLayerId?: TerrainMaterialLayerId;
    familyCatalog?:
      | ReadonlyMap<TerrainMaterialFamilyId, TerrainMaterialFamilyCatalogEntry>
      | {
          byId: ReadonlyMap<
            TerrainMaterialFamilyId,
            TerrainMaterialFamilyCatalogEntry
          >;
        };
  } = {}
): TerrainSplatSample {
  const byKind = 'byKind' in kindCatalog ? kindCatalog.byKind : kindCatalog;
  const familyMap = options.familyCatalog
    ? 'byId' in options.familyCatalog
      ? options.familyCatalog.byId
      : options.familyCatalog
    : null;
  const kindDefinition =
    byKind.get(input.kind) ??
    (options.fallbackKind ? byKind.get(options.fallbackKind) : undefined);

  if (!kindDefinition) {
    return normalizeTerrainSplatSample(
      {
        entries: [],
      },
      {
        fallbackLayerId: options.fallbackLayerId,
      }
    );
  }
  if (kindDefinition.exclude) {
    return { entries: [] };
  }

  const baseLayerIds = kindDefinition.baseLayerIds ?? [];
  const baseFamily =
    typeof kindDefinition.baseFamilyId === 'string'
      ? familyMap?.get(kindDefinition.baseFamilyId)
      : undefined;
  const baseLayerId = baseFamily
    ? resolveTerrainMaterialFamilyVariant(baseFamily, input)
    : selectTerrainMaterialLayerVariant(baseLayerIds, input);
  const signals = resolveTerrainKindSignals(input.signals);
  const entries: TerrainSplatWeight[] = [];

  if (baseLayerId) {
    entries.push({
      layerId: baseLayerId,
      weight: 1,
    });
  }

  for (const blend of kindDefinition.blends ?? []) {
    if (!matchesTerrainKindSplatCondition(blend.when, signals)) {
      continue;
    }
    entries.push({
      layerId: blend.layerId,
      weight: blend.weight,
    });
  }

  return normalizeTerrainSplatSample(
    {
      entries,
    },
    {
      fallbackLayerId: options.fallbackLayerId ?? baseLayerId,
    }
  );
}

export function createOverworldTerrainSplatDefinitions(
  layers: OverworldTerrainSplatLayerSet
): TerrainKindSplatDefinition[] {
  return [
    {
      kind: 'plains',
      baseLayerIds: layers.grassLayerIds,
      blends: [
        {
          layerId: layers.soilLayerId,
          weight: 0.16,
          when: {
            minMoisture: 0.72,
          },
        },
      ],
    },
    {
      kind: 'forest',
      baseLayerIds: layers.grassLayerIds,
      blends: [
        {
          layerId: layers.soilLayerId,
          weight: 0.22,
        },
        {
          layerId: layers.leafLayerId,
          weight: 0.18,
        },
        {
          layerId: layers.leafLayerId,
          weight: 0.08,
          when: {
            minMoisture: 0.62,
          },
        },
      ],
    },
    {
      kind: 'mountain',
      baseLayerIds: [layers.rockLayerId],
      blends: [
        {
          layerId: layers.soilLayerId,
          weight: 0.2,
          when: {
            maxElevation: 0.78,
          },
        },
      ],
    },
    {
      kind: 'shore',
      baseLayerIds: [layers.sandLayerId],
      blends: [
        {
          layerId: layers.soilLayerId,
          weight: 0.14,
          when: {
            minMoisture: 0.36,
          },
        },
      ],
    },
    {
      kind: 'dirt',
      baseLayerIds: [layers.dirtLayerId],
      blends: [
        {
          layerId: layers.gravelLayerId,
          weight: 0.18,
        },
        {
          layerId: layers.soilLayerId,
          weight: 0.12,
          when: {
            minMoisture: 0.58,
          },
        },
      ],
    },
    {
      kind: 'path',
      baseLayerIds: [layers.dirtLayerId],
      blends: [
        {
          layerId: layers.gravelLayerId,
          weight: 0.24,
        },
        {
          layerId: layers.soilLayerId,
          weight: 0.1,
          when: {
            minMoisture: 0.52,
          },
        },
      ],
    },
    {
      kind: 'road',
      baseLayerIds: [layers.dirtRoadLayerId],
      blends: [
        {
          layerId: layers.gravelRoadLayerId,
          weight: 0.28,
          when: {
            minRoadSignal: 0.28,
          },
        },
      ],
    },
    {
      kind: 'rocky',
      baseLayerIds: [layers.rockLayerId],
      blends: [
        {
          layerId: layers.soilLayerId,
          weight: 0.24,
        },
        {
          layerId: layers.gravelLayerId,
          weight: 0.12,
          when: {
            maxMoisture: 0.42,
          },
        },
      ],
    },
    {
      kind: 'snow',
      baseLayerIds: [layers.snowLayerId],
      blends: [
        {
          layerId: layers.soilLayerId,
          weight: 0.18,
          when: {
            maxMoisture: 0.76,
          },
        },
        {
          layerId: layers.rockLayerId,
          weight: 0.12,
          when: {
            minElevation: 0.72,
          },
        },
      ],
    },
    {
      kind: 'mud',
      baseLayerIds: [layers.mudLayerId],
      blends: [
        {
          layerId: layers.soilLayerId,
          weight: 0.2,
        },
      ],
    },
    {
      kind: 'river',
      exclude: true,
    },
    {
      kind: 'ocean',
      exclude: true,
    },
    {
      kind: 'bridge',
      exclude: true,
    },
    {
      kind: 'dock',
      exclude: true,
    },
  ];
}

export function packTerrainSplatSample(
  sample: TerrainSplatSample,
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
): PackedTerrainSplatSample {
  const layerMap = 'byId' in catalog ? catalog.byId : catalog;
  const fallbackLayerId =
    options.fallbackLayerId ?? getFirstCatalogLayerId(layerMap);
  const normalized = normalizeTerrainSplatSample(sample, {
    fallbackLayerId,
  });
  const layerIndices = new Uint8Array(MAX_TERRAIN_SPLAT_SAMPLE_LAYERS);
  const weights = new Uint8Array(MAX_TERRAIN_SPLAT_SAMPLE_LAYERS);

  normalized.entries.forEach((entry, index) => {
    const layer = layerMap.get(entry.layerId);
    if (!layer) {
      throw new Error(
        `Terrain splat sample references unknown layer ${formatLayerLabel(entry.layerId)}.`
      );
    }
    if (layer.index < 0 || layer.index > PACKED_TERRAIN_SPLAT_WEIGHT_MAX) {
      throw new Error(
        `Terrain material layer ${formatLayerLabel(layer.id)} must keep index within 0..${PACKED_TERRAIN_SPLAT_WEIGHT_MAX} for compact packing.`
      );
    }
    layerIndices[index] = layer.index;
    weights[index] = quantizeTerrainSplatWeight(entry.weight);
  });

  rebalancePackedTerrainSplatWeights(weights);

  return {
    layerIndices,
    weights,
  };
}

export function unpackTerrainSplatSample(
  packed: PackedTerrainSplatSample,
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>
): TerrainSplatSample {
  const errors = validatePackedTerrainSplatSample(packed, catalog);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const layerMap = toTerrainMaterialLayerIndexMap(catalog);

  return normalizeTerrainSplatSample({
    entries: [...packed.weights]
      .map((weight, index) => {
        if (weight === 0) {
          return null;
        }
        const layer = layerMap.get(packed.layerIndices[index]);
        if (!layer) {
          throw new Error(
            `Packed terrain splat sample references unknown layer index ${packed.layerIndices[index]}.`
          );
        }
        return {
          layerId: layer.id,
          weight: weight / PACKED_TERRAIN_SPLAT_WEIGHT_MAX,
        };
      })
      .filter((entry): entry is TerrainSplatWeight => entry !== null),
  });
}

export function validatePackedTerrainSplatSample(
  packed: PackedTerrainSplatSample,
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>
): string[] {
  const errors: string[] = [];

  if (packed.layerIndices.length !== MAX_TERRAIN_SPLAT_SAMPLE_LAYERS) {
    errors.push(
      `Packed terrain splat sample layerIndices must have length ${MAX_TERRAIN_SPLAT_SAMPLE_LAYERS}.`
    );
  }
  if (packed.weights.length !== MAX_TERRAIN_SPLAT_SAMPLE_LAYERS) {
    errors.push(
      `Packed terrain splat sample weights must have length ${MAX_TERRAIN_SPLAT_SAMPLE_LAYERS}.`
    );
  }
  if (errors.length > 0) {
    return errors;
  }

  const layerMap = toTerrainMaterialLayerIndexMap(catalog);
  const totalWeight = [...packed.weights].reduce(
    (sum, weight) => sum + weight,
    0
  );

  packed.weights.forEach((weight, index) => {
    if (weight === 0) {
      return;
    }
    if (!layerMap.has(packed.layerIndices[index])) {
      errors.push(
        `Packed terrain splat sample references unknown layer index ${packed.layerIndices[index]}.`
      );
    }
  });

  if (totalWeight !== PACKED_TERRAIN_SPLAT_WEIGHT_MAX) {
    errors.push(
      `Packed terrain splat sample weights must sum to ${PACKED_TERRAIN_SPLAT_WEIGHT_MAX}, received ${totalWeight}.`
    );
  }

  return errors;
}

export function selectTerrainMaterialLayerVariant(
  layerIds: readonly TerrainMaterialLayerId[],
  input: Pick<ResolveTerrainKindSplatSampleInput, 'seed' | 'x' | 'y' | 'kind'>
): TerrainMaterialLayerId | undefined {
  if (layerIds.length === 0) {
    return undefined;
  }
  if (layerIds.length === 1) {
    return layerIds[0];
  }

  const seedHash = appendHashSeedLabel(
    resolveHashSeedInput(input.seed),
    TERRAIN_SPLAT_VARIANT_LABEL
  );
  const offset = Math.floor(
    hash2DWithSeed(seedHash, input.x + hashString(input.kind), input.y) *
      layerIds.length
  );
  return layerIds[offset] ?? layerIds[0];
}

export function resolveTerrainMaterialLayerUvTransform(
  layer: TerrainMaterialLayerDefinition,
  input: Pick<ResolveTerrainKindSplatSampleInput, 'seed' | 'x' | 'y' | 'kind'>
): TerrainMaterialLayerUvTransform {
  const rotationQuarterTurns = resolveTerrainUvRotationQuarterTurns(
    layer.uvRotationQuarterTurns,
    {
      seed: input.seed,
      x: input.x + hashString(layer.id),
      y: input.y,
      label: TERRAIN_SPLAT_UV_ROTATION_LABEL,
    }
  );

  return {
    textureScale: layer.textureScale,
    rotationQuarterTurns,
    mirrorU: resolveTerrainUvMirrorFlag(layer.allowMirrorU, {
      seed: input.seed,
      x: input.x,
      y: input.y + hashString(layer.id),
      label: TERRAIN_SPLAT_UV_MIRROR_U_LABEL,
    }),
    mirrorV: resolveTerrainUvMirrorFlag(layer.allowMirrorV, {
      seed: input.seed,
      x: input.x,
      y: input.y + hashString(layer.id) + 1,
      label: TERRAIN_SPLAT_UV_MIRROR_V_LABEL,
    }),
  };
}

export function resolveTerrainMaterialLayerWorldUvSample(
  layer: TerrainMaterialLayerDefinition,
  input: Pick<ResolveTerrainKindSplatSampleInput, 'seed' | 'x' | 'y' | 'kind'>
): TerrainMaterialLayerWorldUvSample {
  const transform = resolveTerrainMaterialLayerUvTransform(layer, input);
  let u = wrapUnitCoordinate(input.x / transform.textureScale);
  let v = wrapUnitCoordinate(input.y / transform.textureScale);

  if (transform.mirrorU) {
    u = wrapUnitCoordinate(1 - u);
  }
  if (transform.mirrorV) {
    v = wrapUnitCoordinate(1 - v);
  }

  switch (transform.rotationQuarterTurns) {
    case 1:
      [u, v] = [wrapUnitCoordinate(v), wrapUnitCoordinate(1 - u)];
      break;
    case 2:
      [u, v] = [wrapUnitCoordinate(1 - u), wrapUnitCoordinate(1 - v)];
      break;
    case 3:
      [u, v] = [wrapUnitCoordinate(1 - v), wrapUnitCoordinate(u)];
      break;
  }

  return {
    ...transform,
    u,
    v,
  };
}

export function resolveTerrainMaterialLayerTintTransform(
  layer: TerrainMaterialLayerDefinition,
  input: Pick<ResolveTerrainKindSplatSampleInput, 'seed' | 'x' | 'y' | 'kind'>
): TerrainMaterialLayerTintTransform {
  const defaultTint = normalizeHexColor(layer.defaultTint);
  const variationStrength = clampWeight(layer.tintVariation ?? 0);
  if (variationStrength === 0) {
    return {
      defaultTint,
      resolvedTint: defaultTint,
      variationStrength,
    };
  }

  const seedHash = appendHashSeedLabel(
    resolveHashSeedInput(input.seed),
    TERRAIN_SPLAT_TINT_VARIATION_LABEL
  );
  const tintVariationCellSize = layer.tintVariationCellSize ?? 1;
  const quantizedX = quantizeTintVariationCoordinate(
    input.x,
    tintVariationCellSize
  );
  const quantizedY = quantizeTintVariationCoordinate(
    input.y,
    tintVariationCellSize
  );
  const tintNoise =
    hash2DWithSeed(
      seedHash,
      quantizedX + hashString(layer.id),
      quantizedY + hashString(input.kind)
    ) *
      2 -
    1;

  return {
    defaultTint,
    resolvedTint: applyTintVariation(defaultTint, tintNoise, variationStrength),
    variationStrength,
  };
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

function resolveTerrainUvRotationQuarterTurns(
  options: readonly TerrainUvRotationQuarterTurn[] | undefined,
  input: {
    seed: Seed;
    x: number;
    y: number;
    label: number;
  }
): TerrainUvRotationQuarterTurn {
  const normalizedOptions =
    options?.filter(
      (quarterTurns): quarterTurns is TerrainUvRotationQuarterTurn =>
        isTerrainUvRotationQuarterTurn(quarterTurns)
    ) ?? [];
  if (normalizedOptions.length === 0) {
    return 0;
  }
  if (normalizedOptions.length === 1) {
    return normalizedOptions[0] ?? 0;
  }

  const seedHash = appendHashSeedLabel(
    resolveHashSeedInput(input.seed),
    input.label
  );
  const index = Math.floor(
    hash2DWithSeed(seedHash, input.x, input.y) * normalizedOptions.length
  );
  return normalizedOptions[index] ?? normalizedOptions[0] ?? 0;
}

function resolveTerrainUvMirrorFlag(
  allowed: boolean | undefined,
  input: {
    seed: Seed;
    x: number;
    y: number;
    label: number;
  }
): boolean {
  if (allowed !== true) {
    return false;
  }
  const seedHash = appendHashSeedLabel(
    resolveHashSeedInput(input.seed),
    input.label
  );
  return hash2DWithSeed(seedHash, input.x, input.y) >= 0.5;
}

function quantizeTerrainSplatWeight(value: number): number {
  return Math.round(clampWeight(value) * PACKED_TERRAIN_SPLAT_WEIGHT_MAX);
}

function rebalancePackedTerrainSplatWeights(weights: Uint8Array): void {
  const activeIndices = [...weights.entries()]
    .filter(([, weight]) => weight > 0)
    .map(([index]) => index);

  if (activeIndices.length === 0) {
    weights[0] = PACKED_TERRAIN_SPLAT_WEIGHT_MAX;
    return;
  }

  const total = [...weights].reduce((sum, weight) => sum + weight, 0);
  const delta = PACKED_TERRAIN_SPLAT_WEIGHT_MAX - total;
  const targetIndex = activeIndices[activeIndices.length - 1];
  const rebalanced = weights[targetIndex] + delta;
  weights[targetIndex] = Math.min(
    PACKED_TERRAIN_SPLAT_WEIGHT_MAX,
    Math.max(0, rebalanced)
  );
}

function isNormalizedScalar(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isTerrainUvRotationQuarterTurn(
  value: unknown
): value is TerrainUvRotationQuarterTurn {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function normalizeHexColor(value: string): string {
  return value.trim().toLowerCase();
}

function applyTintVariation(
  hexColor: string,
  tintNoise: number,
  variationStrength: number
): string {
  const rgb = parseHexColor(hexColor);
  const multiplier = 1 + tintNoise * variationStrength;

  return formatHexColor({
    red: clampColorChannel(rgb.red * multiplier),
    green: clampColorChannel(rgb.green * multiplier),
    blue: clampColorChannel(rgb.blue * multiplier),
  });
}

function parseHexColor(hexColor: string): {
  red: number;
  green: number;
  blue: number;
} {
  const normalized = normalizeHexColor(hexColor).slice(1);
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function formatHexColor(rgb: {
  red: number;
  green: number;
  blue: number;
}): string {
  return `#${rgb.red.toString(16).padStart(2, '0')}${rgb.green
    .toString(16)
    .padStart(2, '0')}${rgb.blue.toString(16).padStart(2, '0')}`;
}

function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function wrapUnitCoordinate(value: number): number {
  const wrapped = value - Math.floor(value);
  return wrapped >= 1 ? 0 : wrapped;
}

function quantizeTintVariationCoordinate(
  value: number,
  cellSize: number
): number {
  return Math.floor(value / cellSize);
}

function formatLayerLabel(value: string): string {
  return `"${value}"`;
}

function getFirstCatalogLayerId(
  catalog: ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
): TerrainMaterialLayerId | undefined {
  return catalog.values().next().value?.id;
}

function toTerrainMaterialLayerIndexMap(
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>
): ReadonlyMap<number, TerrainMaterialLayerCatalogEntry> {
  if (Array.isArray(catalog)) {
    return new Map(catalog.map((entry) => [entry.index, entry] as const));
  }
  return catalog as ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>;
}

function validateTerrainKindSplatCondition(
  kind: Kind,
  condition?: TerrainKindSplatCondition
): string[] {
  if (!condition) {
    return [];
  }

  const errors: string[] = [];
  const pairs: Array<[keyof TerrainKindSplatCondition, unknown]> = [
    ['minElevation', condition.minElevation],
    ['maxElevation', condition.maxElevation],
    ['minMoisture', condition.minMoisture],
    ['maxMoisture', condition.maxMoisture],
    ['minRiverSignal', condition.minRiverSignal],
    ['maxRiverSignal', condition.maxRiverSignal],
    ['minRoadSignal', condition.minRoadSignal],
    ['maxRoadSignal', condition.maxRoadSignal],
  ];

  for (const [label, value] of pairs) {
    if (value === undefined) {
      continue;
    }
    if (!isNormalizedScalar(value)) {
      errors.push(
        `Terrain splat kind ${formatLayerLabel(kind)} must keep ${label} within 0..1.`
      );
    }
  }

  return errors;
}

function matchesTerrainKindSplatCondition(
  condition: TerrainKindSplatCondition | undefined,
  signals: OverworldSignals
): boolean {
  if (!condition) {
    return true;
  }

  return (
    matchesMinimum(condition.minElevation, signals.elevation) &&
    matchesMaximum(condition.maxElevation, signals.elevation) &&
    matchesMinimum(condition.minMoisture, signals.moisture) &&
    matchesMaximum(condition.maxMoisture, signals.moisture) &&
    matchesMinimum(condition.minRiverSignal, signals.riverSignal) &&
    matchesMaximum(condition.maxRiverSignal, signals.riverSignal) &&
    matchesMinimum(condition.minRoadSignal, signals.roadSignal) &&
    matchesMaximum(condition.maxRoadSignal, signals.roadSignal)
  );
}

function resolveTerrainKindSignals(
  signals: Partial<OverworldSignals> | undefined
): OverworldSignals {
  return {
    continent: clampWeight(signals?.continent ?? 0),
    elevation: clampWeight(signals?.elevation ?? 0),
    moisture: clampWeight(signals?.moisture ?? 0),
    riverSignal: clampWeight(signals?.riverSignal ?? 0),
    roadSignal: clampWeight(signals?.roadSignal ?? 0),
  };
}

function matchesMinimum(minimum: number | undefined, value: number): boolean {
  return minimum === undefined || value >= minimum;
}

function matchesMaximum(maximum: number | undefined, value: number): boolean {
  return maximum === undefined || value <= maximum;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
