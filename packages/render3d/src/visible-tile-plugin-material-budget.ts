import type * as THREE from 'three';
import type { RenderBudgetDetailLevel } from '@bworlds/plugin-api';

export const FULL_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT = 64;
export const LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT = 12;

export type VisibleTilePluginMaterialBudgetEntry = {
  key?: string;
  tilePluginOwnerLabel?: string;
  uniqueMaterials?: readonly THREE.Material[];
};

export function getVisibleTilePluginUniqueMaterialLimit(
  detailLevel: RenderBudgetDetailLevel = 'full'
): number {
  return detailLevel === 'low'
    ? LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT
    : FULL_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT;
}

export function validateVisibleTilePluginMaterialBudget(
  entries: Iterable<VisibleTilePluginMaterialBudgetEntry>,
  pluginLabel: string,
  nextMaterials: readonly THREE.Material[],
  detailLevel: RenderBudgetDetailLevel = 'full',
  excludedTileKey?: string
): {
  accepted: boolean;
  materialCount: number;
  limit: number;
} {
  const limit = getVisibleTilePluginUniqueMaterialLimit(detailLevel);
  const uniqueMaterials = new Set<THREE.Material>();

  for (let index = 0; index < nextMaterials.length; index += 1) {
    uniqueMaterials.add(nextMaterials[index]!);
    if (uniqueMaterials.size > limit) {
      return {
        accepted: false,
        materialCount: uniqueMaterials.size,
        limit,
      };
    }
  }

  for (const entry of entries) {
    if (
      entry.tilePluginOwnerLabel !== pluginLabel ||
      entry.key === excludedTileKey ||
      !entry.uniqueMaterials
    ) {
      continue;
    }
    for (let index = 0; index < entry.uniqueMaterials.length; index += 1) {
      uniqueMaterials.add(entry.uniqueMaterials[index]!);
      if (uniqueMaterials.size > limit) {
        return {
          accepted: false,
          materialCount: uniqueMaterials.size,
          limit,
        };
      }
    }
  }

  return {
    accepted: true,
    materialCount: uniqueMaterials.size,
    limit,
  };
}
