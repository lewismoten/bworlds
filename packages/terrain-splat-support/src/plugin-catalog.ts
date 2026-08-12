import type { Kind } from '@bworlds/plugin-api';
import {
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
  type TerrainKindSplatCatalogEntry,
  type TerrainKindSplatDefinition,
  type TerrainMaterialLayerCatalogEntry,
  type TerrainMaterialLayerDefinition,
  type TerrainMaterialLayerId,
} from './index.ts';
import {
  createTerrainMaterialFamilyCatalog,
  type TerrainMaterialFamilyCatalogEntry,
  type TerrainMaterialFamilyDefinition,
  type TerrainMaterialFamilyId,
} from './variant-pool.ts';

export type TerrainSplatPluginContribution = {
  pluginId: string;
  layers?: readonly TerrainMaterialLayerDefinition[];
  families?: readonly TerrainMaterialFamilyDefinition[];
  kinds?: readonly TerrainKindSplatDefinition[];
};

export type TerrainSplatPluginCatalog = {
  pluginIds: readonly string[];
  layerCatalog: {
    entries: readonly TerrainMaterialLayerCatalogEntry[];
    byId: ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>;
  };
  familyCatalog: {
    entries: readonly TerrainMaterialFamilyCatalogEntry[];
    byId: ReadonlyMap<TerrainMaterialFamilyId, TerrainMaterialFamilyCatalogEntry>;
  };
  kindCatalog: {
    entries: readonly TerrainKindSplatCatalogEntry[];
    byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
  };
  layerOwners: ReadonlyMap<TerrainMaterialLayerId, string>;
  familyOwners: ReadonlyMap<TerrainMaterialFamilyId, string>;
  kindOwners: ReadonlyMap<Kind, string>;
};

export function createTerrainSplatPluginCatalog(
  contributions: readonly TerrainSplatPluginContribution[],
  options: {
    maxFamilyVariants?: number;
  } = {}
): TerrainSplatPluginCatalog {
  const errors: string[] = [];
  const pluginIds = new Set<string>();
  const layerOwners = new Map<TerrainMaterialLayerId, string>();
  const familyOwners = new Map<TerrainMaterialFamilyId, string>();
  const kindOwners = new Map<Kind, string>();
  const layers: TerrainMaterialLayerDefinition[] = [];
  const families: TerrainMaterialFamilyDefinition[] = [];
  const kinds: TerrainKindSplatDefinition[] = [];

  for (const contribution of contributions) {
    const pluginId = contribution.pluginId.trim();
    if (pluginId.length === 0) {
      errors.push('Terrain splat plugin contribution must use a non-empty pluginId.');
      continue;
    }
    if (pluginIds.has(pluginId)) {
      errors.push(
        `Terrain splat plugin id ${JSON.stringify(pluginId)} must be unique within the shared plugin catalog.`
      );
      continue;
    }
    pluginIds.add(pluginId);

    for (const layer of contribution.layers ?? []) {
      const existing = layerOwners.get(layer.id);
      if (existing) {
        errors.push(
          `Terrain layer ${JSON.stringify(layer.id)} is contributed by both ${JSON.stringify(existing)} and ${JSON.stringify(pluginId)}.`
        );
        continue;
      }
      layerOwners.set(layer.id, pluginId);
      layers.push(layer);
    }

    for (const family of contribution.families ?? []) {
      const existing = familyOwners.get(family.id);
      if (existing) {
        errors.push(
          `Terrain family ${JSON.stringify(family.id)} is contributed by both ${JSON.stringify(existing)} and ${JSON.stringify(pluginId)}.`
        );
        continue;
      }
      familyOwners.set(family.id, pluginId);
      families.push(family);
    }

    for (const kind of contribution.kinds ?? []) {
      const existing = kindOwners.get(kind.kind);
      if (existing) {
        errors.push(
          `Terrain kind ${JSON.stringify(kind.kind)} is contributed by both ${JSON.stringify(existing)} and ${JSON.stringify(pluginId)}.`
        );
        continue;
      }
      kindOwners.set(kind.kind, pluginId);
      kinds.push(kind);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const layerCatalog = createTerrainMaterialLayerCatalog(layers);
  const familyCatalog = createTerrainMaterialFamilyCatalog(families, layerCatalog, {
    maxVariants: options.maxFamilyVariants,
  });
  const kindCatalog = createTerrainKindSplatCatalog(kinds, layerCatalog, {
    familyCatalog,
  });

  return {
    pluginIds: [...pluginIds].sort(),
    layerCatalog,
    familyCatalog,
    kindCatalog,
    layerOwners,
    familyOwners,
    kindOwners,
  };
}
