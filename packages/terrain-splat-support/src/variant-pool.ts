import {
  appendHashSeedLabel,
  hash2DWithSeed,
  registerHashLabel,
  resolveHashSeedInput,
} from '@bworlds/core/hash';
import type { Seed } from '@bworlds/plugin-api';
import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';

export type TerrainMaterialFamilyId = string;

export type TerrainMaterialFamilyDefinition = {
  id: TerrainMaterialFamilyId;
  layerIds: readonly TerrainMaterialLayerId[];
};

export type TerrainMaterialFamilyCatalogEntry =
  TerrainMaterialFamilyDefinition & {
    index: number;
  };

export const DEFAULT_MAX_TERRAIN_FAMILY_VARIANTS = 4;

const TERRAIN_FAMILY_VARIANT_LABEL = registerHashLabel(
  'terrain-family-variant'
);

export function validateTerrainMaterialFamilyDefinition(
  definition: TerrainMaterialFamilyDefinition,
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      },
  options: {
    maxVariants?: number;
  } = {}
): string[] {
  const layerMap = 'byId' in catalog ? catalog.byId : catalog;
  const maxVariants =
    options.maxVariants ?? DEFAULT_MAX_TERRAIN_FAMILY_VARIANTS;
  const errors: string[] = [];

  if (typeof definition.id !== 'string' || definition.id.trim().length === 0) {
    errors.push('Terrain material family id must be a non-empty string.');
  }
  if (!Array.isArray(definition.layerIds) || definition.layerIds.length === 0) {
    errors.push(
      `Terrain material family ${formatFamilyLabel(definition.id)} must define at least one layerId.`
    );
    return errors;
  }
  if (definition.layerIds.length > maxVariants) {
    errors.push(
      `Terrain material family ${formatFamilyLabel(definition.id)} exceeds the variant limit ${maxVariants}.`
    );
  }

  const uniqueLayerIds = new Set<TerrainMaterialLayerId>();
  for (const layerId of definition.layerIds) {
    if (!layerMap.has(layerId)) {
      errors.push(
        `Terrain material family ${formatFamilyLabel(definition.id)} references unknown layer ${formatFamilyLabel(layerId)}.`
      );
    }
    if (uniqueLayerIds.has(layerId)) {
      errors.push(
        `Terrain material family ${formatFamilyLabel(definition.id)} must not repeat layer ${formatFamilyLabel(layerId)}.`
      );
      continue;
    }
    uniqueLayerIds.add(layerId);
  }

  return errors;
}

export function createTerrainMaterialFamilyCatalog(
  definitions: readonly TerrainMaterialFamilyDefinition[],
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      },
  options: {
    maxVariants?: number;
  } = {}
): {
  entries: readonly TerrainMaterialFamilyCatalogEntry[];
  byId: ReadonlyMap<TerrainMaterialFamilyId, TerrainMaterialFamilyCatalogEntry>;
} {
  const errors: string[] = [];
  const byId = new Map<
    TerrainMaterialFamilyId,
    TerrainMaterialFamilyCatalogEntry
  >();

  definitions.forEach((definition, index) => {
    errors.push(
      ...validateTerrainMaterialFamilyDefinition(definition, catalog, options)
    );
    if (byId.has(definition.id)) {
      errors.push(
        `Terrain material family id ${formatFamilyLabel(definition.id)} must be unique within the shared catalog.`
      );
      return;
    }
    byId.set(definition.id, {
      ...definition,
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

export function resolveTerrainMaterialFamilyVariant(
  family:
    | TerrainMaterialFamilyCatalogEntry
    | TerrainMaterialFamilyDefinition
    | readonly TerrainMaterialLayerId[],
  input: {
    seed: Seed;
    x: number;
    y: number;
    salt?: number;
  }
): TerrainMaterialLayerId | undefined {
  const layerIds = Array.isArray(family) ? family : family.layerIds;

  if (layerIds.length === 0) {
    return undefined;
  }
  if (layerIds.length === 1) {
    return layerIds[0];
  }

  const seedHash = appendHashSeedLabel(
    resolveHashSeedInput(input.seed),
    TERRAIN_FAMILY_VARIANT_LABEL
  );
  const salt = input.salt ?? 0;
  const variantIndex = Math.floor(
    hash2DWithSeed(seedHash, input.x + salt, input.y - salt) * layerIds.length
  );

  return layerIds[variantIndex] ?? layerIds[0];
}

function formatFamilyLabel(value: string): string {
  return `"${value}"`;
}
