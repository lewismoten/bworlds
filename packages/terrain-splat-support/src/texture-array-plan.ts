import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
  TerrainMaterialLayerTextureProperty,
} from './index.ts';

export type TerrainTextureArrayPurpose =
  | 'baseColor'
  | 'normal'
  | 'roughness'
  | 'metalness'
  | 'ambientOcclusion';

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

export type TerrainTextureArrayPlanSet = {
  layerSlots: readonly Pick<TerrainTextureArrayLayerSlot, 'layerId' | 'layerIndex'>[];
  plans: readonly TerrainTextureArrayPlan[];
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
}): TerrainTextureArrayPlanSet {
  const catalogEntries = getSortedCatalogEntries(params.catalog);
  const purposes = [...(params.purposes ?? DEFAULT_REQUIRED_PURPOSES)];
  const plans = purposes.map((purpose) =>
    createTerrainTextureArrayPlanInternal({
      purpose,
      catalogEntries,
      resolveTexture: params.resolveTexture,
    })
  );
  const layerSlots = catalogEntries.map((entry) => ({
    layerId: entry.id,
    layerIndex: entry.index,
  }));

  return {
    layerSlots,
    plans,
    estimatedBytes: plans.reduce((sum, plan) => sum + plan.estimatedBytes, 0),
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
}): TerrainTextureArrayPlan {
  return createTerrainTextureArrayPlanInternal({
    purpose: params.purpose,
    catalogEntries: getSortedCatalogEntries(params.catalog),
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
  const format =
    typeof source.format === 'string' ? source.format.trim() : '';
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
    return [...catalog.values()].sort((left, right) => left.index - right.index);
  }

  const entries = hasTerrainMaterialLayerCatalogEntries(catalog)
    ? catalog.entries
    : hasTerrainMaterialLayerCatalogMap(catalog)
      ? [...catalog.byId.values()]
      : [];

  return [...entries].sort((left, right) => left.index - right.index);
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
