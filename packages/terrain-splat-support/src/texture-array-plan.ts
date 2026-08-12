import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
  TerrainMaterialLayerTextureProperty,
} from './index.ts';

export type TerrainTextureArrayPurpose =
  'baseColor' | 'normal' | 'roughness' | 'metalness' | 'ambientOcclusion';

export type TerrainTextureArraySource = {
  id: string;
  width: number;
  height: number;
  format: string;
  bytesPerPixel?: number;
};

export type TerrainTextureArrayLayerSlot = {
  layerId: TerrainMaterialLayerId;
  layerIndex: number;
  textureId: string;
};

export type TerrainTextureArrayPlan = {
  purpose: TerrainTextureArrayPurpose;
  width: number;
  height: number;
  format: string;
  bytesPerPixel: number;
  depth: number;
  estimatedBytes: number;
  layerSlots: readonly TerrainTextureArrayLayerSlot[];
};

export type TerrainTextureArrayPlanSetWarningCode =
  'unused-layer' | 'unknown-active-layer' | 'texture-array-fallback';

export type TerrainTextureArrayPlanSetWarning = {
  code: TerrainTextureArrayPlanSetWarningCode;
  message: string;
};

export type TerrainTextureArrayPlanSet = {
  layerSlots: readonly Pick<
    TerrainTextureArrayLayerSlot,
    'layerId' | 'layerIndex'
  >[];
  plans: readonly TerrainTextureArrayPlan[];
  activeLayerIds: readonly TerrainMaterialLayerId[];
  unusedLayerIds: readonly TerrainMaterialLayerId[];
  warnings: readonly TerrainTextureArrayPlanSetWarning[];
  estimatedBytes: number;
};

export type TerrainTextureBindingMode = 'texture-array' | 'per-layer-textures';

export type TerrainTextureFallbackLayerBinding = {
  layerId: TerrainMaterialLayerId;
  layerIndex: number;
  textureId: string;
  width: number;
  height: number;
  format: string;
  bytesPerPixel: number;
  estimatedBytes: number;
};

export type TerrainTextureFallbackPlan = {
  purpose: TerrainTextureArrayPurpose;
  layerBindings: readonly TerrainTextureFallbackLayerBinding[];
  estimatedBytes: number;
};

export type TerrainTextureBindingPlan =
  TerrainTextureArrayPlan | TerrainTextureFallbackPlan;

export type TerrainTextureBindingPlanSet = {
  mode: TerrainTextureBindingMode;
  layerSlots: readonly Pick<
    TerrainTextureArrayLayerSlot,
    'layerId' | 'layerIndex'
  >[];
  plans: readonly TerrainTextureBindingPlan[];
  activeLayerIds: readonly TerrainMaterialLayerId[];
  unusedLayerIds: readonly TerrainMaterialLayerId[];
  warnings: readonly TerrainTextureArrayPlanSetWarning[];
  estimatedBytes: number;
};

const DEFAULT_REQUIRED_PURPOSES: readonly TerrainTextureArrayPurpose[] = [
  'baseColor',
  'normal',
  'roughness',
];

export function createTerrainTextureArrayPlanSet(params: {
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
        byId?: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
  purposes?: readonly TerrainTextureArrayPurpose[];
  activeLayerIds?: readonly TerrainMaterialLayerId[];
}): TerrainTextureArrayPlanSet {
  const catalogEntries = getSortedCatalogEntries(params.catalog);
  const activeCatalog = selectActiveTerrainTextureArrayCatalogEntries(
    catalogEntries,
    params.activeLayerIds
  );
  const purposes = [...(params.purposes ?? DEFAULT_REQUIRED_PURPOSES)];
  const plans = purposes.map((purpose) =>
    createTerrainTextureArrayPlanInternal({
      purpose,
      catalogEntries: activeCatalog.entries,
      resolveTexture: params.resolveTexture,
    })
  );
  const layerSlots = activeCatalog.entries.map((entry) => ({
    layerId: entry.id,
    layerIndex: entry.index,
  }));
  const warnings: TerrainTextureArrayPlanSetWarning[] = [];

  if (activeCatalog.unusedLayerIds.length > 0) {
    warnings.push({
      code: 'unused-layer',
      message: `Terrain texture array plan skipped ${activeCatalog.unusedLayerIds.length} unused layer(s): ${activeCatalog.unusedLayerIds.join(', ')}.`,
    });
  }
  if (activeCatalog.unknownActiveLayerIds.length > 0) {
    warnings.push({
      code: 'unknown-active-layer',
      message: `Terrain texture array plan requested ${activeCatalog.unknownActiveLayerIds.length} unknown active layer(s): ${activeCatalog.unknownActiveLayerIds.join(', ')}.`,
    });
  }

  return {
    layerSlots,
    plans,
    activeLayerIds: activeCatalog.entries.map((entry) => entry.id),
    unusedLayerIds: activeCatalog.unusedLayerIds,
    warnings,
    estimatedBytes: plans.reduce((sum, plan) => sum + plan.estimatedBytes, 0),
  };
}

export function createTerrainTextureBindingPlanSet(params: {
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
        byId?: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
  purposes?: readonly TerrainTextureArrayPurpose[];
  activeLayerIds?: readonly TerrainMaterialLayerId[];
  supportsTextureArrays: boolean;
}): TerrainTextureBindingPlanSet {
  if (params.supportsTextureArrays) {
    return {
      mode: 'texture-array',
      ...createTerrainTextureArrayPlanSet(params),
    };
  }

  const fallbackPlanSet = createTerrainTextureFallbackPlanSet(params);
  return {
    mode: 'per-layer-textures',
    ...fallbackPlanSet,
    warnings: [
      {
        code: 'texture-array-fallback',
        message:
          'Terrain texture binding plan is using per-layer texture fallback because texture arrays are unavailable.',
      },
      ...fallbackPlanSet.warnings,
    ],
  };
}

export function createTerrainTextureArrayPlan(params: {
  purpose: TerrainTextureArrayPurpose;
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
        byId?: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
  activeLayerIds?: readonly TerrainMaterialLayerId[];
}): TerrainTextureArrayPlan {
  const catalogEntries = getSortedCatalogEntries(params.catalog);
  return createTerrainTextureArrayPlanInternal({
    purpose: params.purpose,
    catalogEntries: selectActiveTerrainTextureArrayCatalogEntries(
      catalogEntries,
      params.activeLayerIds
    ).entries,
    resolveTexture: params.resolveTexture,
  });
}

function createTerrainTextureArrayPlanInternal(params: {
  purpose: TerrainTextureArrayPurpose;
  catalogEntries: readonly TerrainMaterialLayerCatalogEntry[];
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
}): TerrainTextureArrayPlan {
  const property = getTexturePropertyName(params.purpose);
  const label = formatPurposeLabel(params.purpose);
  const layerSlots: TerrainTextureArrayLayerSlot[] = [];
  let width = 0;
  let height = 0;
  let format = '';
  let bytesPerPixel = 0;

  for (const layer of params.catalogEntries) {
    const textureId = layer[property];
    if (typeof textureId !== 'string' || textureId.trim().length === 0) {
      throw new Error(
        `Terrain layer "${layer.id}" must define ${property} before building the ${label} texture array plan.`
      );
    }
    const source = params.resolveTexture(textureId);
    if (!source) {
      throw new Error(
        `Terrain ${label} texture array plan is missing descriptor "${textureId}" for layer "${layer.id}".`
      );
    }
    const normalized = normalizeTerrainTextureArraySource(source, {
      purpose: params.purpose,
      layerId: layer.id,
      textureId,
    });

    if (layerSlots.length === 0) {
      width = normalized.width;
      height = normalized.height;
      format = normalized.format;
      bytesPerPixel = normalized.bytesPerPixel;
    } else {
      assertMatchingTextureArraySource(
        normalized,
        {
          width,
          height,
          format,
          bytesPerPixel,
        },
        {
          purpose: params.purpose,
          layerId: layer.id,
          textureId,
        }
      );
    }

    layerSlots.push({
      layerId: layer.id,
      layerIndex: layer.index,
      textureId,
    });
  }

  return {
    purpose: params.purpose,
    width,
    height,
    format,
    bytesPerPixel,
    depth: layerSlots.length,
    estimatedBytes: width * height * layerSlots.length * bytesPerPixel,
    layerSlots,
  };
}

function createTerrainTextureFallbackPlanSet(params: {
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
        byId?: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
  purposes?: readonly TerrainTextureArrayPurpose[];
  activeLayerIds?: readonly TerrainMaterialLayerId[];
}): Omit<TerrainTextureBindingPlanSet, 'mode'> {
  const catalogEntries = getSortedCatalogEntries(params.catalog);
  const activeCatalog = selectActiveTerrainTextureArrayCatalogEntries(
    catalogEntries,
    params.activeLayerIds
  );
  const purposes = [...(params.purposes ?? DEFAULT_REQUIRED_PURPOSES)];
  const plans = purposes.map((purpose) =>
    createTerrainTextureFallbackPlanInternal({
      purpose,
      catalogEntries: activeCatalog.entries,
      resolveTexture: params.resolveTexture,
    })
  );
  const layerSlots = activeCatalog.entries.map((entry) => ({
    layerId: entry.id,
    layerIndex: entry.index,
  }));
  const warnings: TerrainTextureArrayPlanSetWarning[] = [];

  if (activeCatalog.unusedLayerIds.length > 0) {
    warnings.push({
      code: 'unused-layer',
      message: `Terrain texture array plan skipped ${activeCatalog.unusedLayerIds.length} unused layer(s): ${activeCatalog.unusedLayerIds.join(', ')}.`,
    });
  }
  if (activeCatalog.unknownActiveLayerIds.length > 0) {
    warnings.push({
      code: 'unknown-active-layer',
      message: `Terrain texture array plan requested ${activeCatalog.unknownActiveLayerIds.length} unknown active layer(s): ${activeCatalog.unknownActiveLayerIds.join(', ')}.`,
    });
  }

  return {
    layerSlots,
    plans,
    activeLayerIds: activeCatalog.entries.map((entry) => entry.id),
    unusedLayerIds: activeCatalog.unusedLayerIds,
    warnings,
    estimatedBytes: plans.reduce((sum, plan) => sum + plan.estimatedBytes, 0),
  };
}

function createTerrainTextureFallbackPlanInternal(params: {
  purpose: TerrainTextureArrayPurpose;
  catalogEntries: readonly TerrainMaterialLayerCatalogEntry[];
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
}): TerrainTextureFallbackPlan {
  const property = getTexturePropertyName(params.purpose);
  const label = formatPurposeLabel(params.purpose);
  const layerBindings: TerrainTextureFallbackLayerBinding[] = [];

  for (const layer of params.catalogEntries) {
    const textureId = layer[property];
    if (typeof textureId !== 'string' || textureId.trim().length === 0) {
      throw new Error(
        `Terrain layer "${layer.id}" must define ${property} before building the ${label} texture fallback plan.`
      );
    }
    const source = params.resolveTexture(textureId);
    if (!source) {
      throw new Error(
        `Terrain ${label} texture fallback plan is missing descriptor "${textureId}" for layer "${layer.id}".`
      );
    }
    const normalized = normalizeTerrainTextureArraySource(source, {
      purpose: params.purpose,
      layerId: layer.id,
      textureId,
    });

    layerBindings.push({
      layerId: layer.id,
      layerIndex: layer.index,
      textureId,
      width: normalized.width,
      height: normalized.height,
      format: normalized.format,
      bytesPerPixel: normalized.bytesPerPixel,
      estimatedBytes:
        normalized.width * normalized.height * normalized.bytesPerPixel,
    });
  }

  return {
    purpose: params.purpose,
    layerBindings,
    estimatedBytes: layerBindings.reduce(
      (sum, binding) => sum + binding.estimatedBytes,
      0
    ),
  };
}

function normalizeTerrainTextureArraySource(
  source: TerrainTextureArraySource,
  context: {
    purpose: TerrainTextureArrayPurpose;
    layerId: TerrainMaterialLayerId;
    textureId: string;
  }
): Required<TerrainTextureArraySource> {
  const width = normalizePositiveInteger(source.width);
  const height = normalizePositiveInteger(source.height);
  const bytesPerPixel = normalizePositiveInteger(source.bytesPerPixel ?? 4);
  const format = typeof source.format === 'string' ? source.format.trim() : '';
  const label = formatPurposeLabel(context.purpose);

  if (typeof source.id !== 'string' || source.id.trim().length === 0) {
    throw new Error(
      `Terrain ${label} texture array descriptor "${context.textureId}" for layer "${context.layerId}" must define a non-empty id.`
    );
  }
  if (width === 0 || height === 0) {
    throw new Error(
      `Terrain ${label} texture array descriptor "${context.textureId}" for layer "${context.layerId}" must use positive finite dimensions.`
    );
  }
  if (format.length === 0) {
    throw new Error(
      `Terrain ${label} texture array descriptor "${context.textureId}" for layer "${context.layerId}" must define a non-empty format.`
    );
  }
  if (bytesPerPixel === 0) {
    throw new Error(
      `Terrain ${label} texture array descriptor "${context.textureId}" for layer "${context.layerId}" must define a positive finite bytesPerPixel.`
    );
  }

  return {
    id: source.id,
    width,
    height,
    format,
    bytesPerPixel,
  };
}

function assertMatchingTextureArraySource(
  source: Required<TerrainTextureArraySource>,
  expected: {
    width: number;
    height: number;
    format: string;
    bytesPerPixel: number;
  },
  context: {
    purpose: TerrainTextureArrayPurpose;
    layerId: TerrainMaterialLayerId;
    textureId: string;
  }
): void {
  const label = formatPurposeLabel(context.purpose);

  if (source.width !== expected.width || source.height !== expected.height) {
    throw new Error(
      `Terrain ${label} texture array plan requires consistent dimensions; layer "${context.layerId}" texture "${context.textureId}" uses ${source.width}x${source.height} instead of ${expected.width}x${expected.height}.`
    );
  }
  if (source.format !== expected.format) {
    throw new Error(
      `Terrain ${label} texture array plan requires one shared format; layer "${context.layerId}" texture "${context.textureId}" uses "${source.format}" instead of "${expected.format}".`
    );
  }
  if (source.bytesPerPixel !== expected.bytesPerPixel) {
    throw new Error(
      `Terrain ${label} texture array plan requires one shared bytesPerPixel; layer "${context.layerId}" texture "${context.textureId}" uses ${source.bytesPerPixel} instead of ${expected.bytesPerPixel}.`
    );
  }
}

function getSortedCatalogEntries(
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
    return [...catalog].sort((left, right) => left.index - right.index);
  }
  if (catalog instanceof Map) {
    return [...catalog.values()].sort(
      (left, right) => left.index - right.index
    );
  }

  const entries = hasTerrainMaterialLayerCatalogEntries(catalog)
    ? catalog.entries
    : hasTerrainMaterialLayerCatalogMap(catalog)
      ? [...catalog.byId.values()]
      : [];

  return [...entries].sort((left, right) => left.index - right.index);
}

function selectActiveTerrainTextureArrayCatalogEntries(
  catalogEntries: readonly TerrainMaterialLayerCatalogEntry[],
  activeLayerIds: readonly TerrainMaterialLayerId[] | undefined
): {
  entries: readonly TerrainMaterialLayerCatalogEntry[];
  unusedLayerIds: readonly TerrainMaterialLayerId[];
  unknownActiveLayerIds: readonly TerrainMaterialLayerId[];
} {
  if (!activeLayerIds || activeLayerIds.length === 0) {
    return {
      entries: catalogEntries,
      unusedLayerIds: [],
      unknownActiveLayerIds: [],
    };
  }

  const catalogById = new Map(catalogEntries.map((entry) => [entry.id, entry]));
  const requestedIds = [...new Set(activeLayerIds)];
  const activeEntries = requestedIds
    .map((layerId) => catalogById.get(layerId))
    .filter(
      (entry): entry is TerrainMaterialLayerCatalogEntry => entry !== undefined
    )
    .sort((left, right) => left.index - right.index);
  const activeIdSet = new Set(activeEntries.map((entry) => entry.id));

  return {
    entries: activeEntries,
    unusedLayerIds: catalogEntries
      .map((entry) => entry.id)
      .filter((layerId) => !activeIdSet.has(layerId)),
    unknownActiveLayerIds: requestedIds.filter(
      (layerId) => !catalogById.has(layerId)
    ),
  };
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

function getTexturePropertyName(
  purpose: TerrainTextureArrayPurpose
): TerrainMaterialLayerTextureProperty {
  switch (purpose) {
    case 'baseColor':
      return 'baseColorTextureId';
    case 'normal':
      return 'normalTextureId';
    case 'roughness':
      return 'roughnessTextureId';
    case 'metalness':
      return 'metalnessTextureId';
    case 'ambientOcclusion':
      return 'ambientOcclusionTextureId';
  }
}

function formatPurposeLabel(purpose: TerrainTextureArrayPurpose): string {
  switch (purpose) {
    case 'baseColor':
      return 'base color';
    case 'normal':
      return 'normal';
    case 'roughness':
      return 'roughness';
    case 'metalness':
      return 'metalness';
    case 'ambientOcclusion':
      return 'ambient occlusion';
  }
}

function normalizePositiveInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}
