import type { RenderBudgetDetailLevel } from '@bworlds/plugin-api';
import { getDecodedTextureMemoryEstimateBytes } from './texture-memory-estimate.ts';

export const FULL_DETAIL_TILE_TEXTURE_MEMORY_LIMIT = 25_165_824;
export const LOW_DETAIL_TILE_TEXTURE_MEMORY_LIMIT = 2_097_152;
export const FULL_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT = 50_331_648;
export const LOW_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT = 8_388_608;
export const FULL_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT = 67_108_864;
export const LOW_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT = 12_582_912;
export const FULL_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT = 134_217_728;
export const LOW_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT = 25_165_824;

export type VisibleTileTextureBudgetEntry = {
  key?: string;
  tileX: number;
  tileY: number;
  tilePluginOwnerLabel?: string;
  uniqueTextures?: readonly unknown[];
  pluginUniqueTextures?: readonly unknown[];
};

export function getTileTextureMemoryLimit(
  detailLevel: RenderBudgetDetailLevel = 'full'
): number {
  return detailLevel === 'low'
    ? LOW_DETAIL_TILE_TEXTURE_MEMORY_LIMIT
    : FULL_DETAIL_TILE_TEXTURE_MEMORY_LIMIT;
}

export function getVisibleChunkTextureMemoryLimit(
  detailLevel: RenderBudgetDetailLevel = 'full'
): number {
  return detailLevel === 'low'
    ? LOW_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT
    : FULL_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT;
}

export function getVisiblePluginTextureMemoryLimit(
  detailLevel: RenderBudgetDetailLevel = 'full'
): number {
  return detailLevel === 'low'
    ? LOW_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT
    : FULL_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT;
}

export function getVisibleSceneTextureMemoryLimit(
  detailLevel: RenderBudgetDetailLevel = 'full'
): number {
  return detailLevel === 'low'
    ? LOW_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT
    : FULL_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT;
}

export function getUniqueTextureMemoryEstimateBytes(
  textures: readonly unknown[]
): number {
  const uniqueTextures = new Set<unknown>();
  let bytes = 0;

  for (let index = 0; index < textures.length; index += 1) {
    const texture = textures[index];
    if (uniqueTextures.has(texture)) {
      continue;
    }
    uniqueTextures.add(texture);
    bytes += getDecodedTextureMemoryEstimateBytes(texture);
  }

  return bytes;
}

export function validateVisibleTilePluginTextureBudget(
  entries: Iterable<VisibleTileTextureBudgetEntry>,
  pluginLabel: string,
  nextTextures: readonly unknown[],
  detailLevel: RenderBudgetDetailLevel = 'full',
  excludedTileKey?: string
): {
  accepted: boolean;
  textureMemoryEstimateBytes: number;
  limit: number;
} {
  const limit = getVisiblePluginTextureMemoryLimit(detailLevel);
  const uniqueTextures = new Set<unknown>();
  let textureMemoryEstimateBytes = 0;

  textureMemoryEstimateBytes = accumulateUniqueTextureBytes(
    uniqueTextures,
    nextTextures,
    textureMemoryEstimateBytes
  );
  if (textureMemoryEstimateBytes > limit) {
    return {
      accepted: false,
      textureMemoryEstimateBytes,
      limit,
    };
  }

  for (const entry of entries) {
    if (
      entry.tilePluginOwnerLabel !== pluginLabel ||
      entry.key === excludedTileKey ||
      !entry.pluginUniqueTextures
    ) {
      continue;
    }

    textureMemoryEstimateBytes = accumulateUniqueTextureBytes(
      uniqueTextures,
      entry.pluginUniqueTextures,
      textureMemoryEstimateBytes
    );
    if (textureMemoryEstimateBytes > limit) {
      return {
        accepted: false,
        textureMemoryEstimateBytes,
        limit,
      };
    }
  }

  return {
    accepted: true,
    textureMemoryEstimateBytes,
    limit,
  };
}

export function validateVisibleTileSceneTextureBudget(
  entries: Iterable<VisibleTileTextureBudgetEntry>,
  nextEntry: VisibleTileTextureBudgetEntry,
  detailLevel: RenderBudgetDetailLevel = 'full',
  excludedTileKey?: string
): {
  accepted: boolean;
  textureMemoryEstimateBytes: number;
  limit: number;
} {
  const limit = getVisibleSceneTextureMemoryLimit(detailLevel);
  const uniqueTextures = new Set<unknown>();
  let textureMemoryEstimateBytes = 0;

  for (const entry of entries) {
    if (entry.key === excludedTileKey || !entry.uniqueTextures) {
      continue;
    }
    textureMemoryEstimateBytes = accumulateUniqueTextureBytes(
      uniqueTextures,
      entry.uniqueTextures,
      textureMemoryEstimateBytes
    );
  }

  textureMemoryEstimateBytes = accumulateUniqueTextureBytes(
    uniqueTextures,
    nextEntry.uniqueTextures ?? [],
    textureMemoryEstimateBytes
  );

  return {
    accepted: textureMemoryEstimateBytes <= limit,
    textureMemoryEstimateBytes,
    limit,
  };
}

export function validateVisibleTileChunkTextureBudget(
  entries: Iterable<VisibleTileTextureBudgetEntry>,
  nextEntry: VisibleTileTextureBudgetEntry,
  detailLevel: RenderBudgetDetailLevel = 'full',
  excludedTileKey?: string,
  chunkTileSize = 4
): {
  accepted: boolean;
  textureMemoryEstimateBytes: number;
  limit: number;
} {
  const limit = getVisibleChunkTextureMemoryLimit(detailLevel);
  const normalizedChunkTileSize = Math.max(1, Math.floor(chunkTileSize));
  const chunkTextureSets = new Map<string, Set<unknown>>();
  const chunkTextureBytes = new Map<string, number>();
  const targetChunkKey = getChunkKey(
    nextEntry.tileX,
    nextEntry.tileY,
    normalizedChunkTileSize
  );

  for (const entry of entries) {
    if (entry.key === excludedTileKey || !entry.uniqueTextures) {
      continue;
    }
    const chunkKey = getChunkKey(entry.tileX, entry.tileY, normalizedChunkTileSize);
    const uniqueTextures = getOrCreateChunkTextureSet(chunkTextureSets, chunkKey);
    const currentBytes = chunkTextureBytes.get(chunkKey) ?? 0;
    chunkTextureBytes.set(
      chunkKey,
      accumulateUniqueTextureBytes(uniqueTextures, entry.uniqueTextures, currentBytes)
    );
  }

  const targetTextures = getOrCreateChunkTextureSet(chunkTextureSets, targetChunkKey);
  const targetBytes = chunkTextureBytes.get(targetChunkKey) ?? 0;
  const textureMemoryEstimateBytes = accumulateUniqueTextureBytes(
    targetTextures,
    nextEntry.uniqueTextures ?? [],
    targetBytes
  );

  return {
    accepted: textureMemoryEstimateBytes <= limit,
    textureMemoryEstimateBytes,
    limit,
  };
}

function accumulateUniqueTextureBytes(
  uniqueTextures: Set<unknown>,
  textures: readonly unknown[],
  currentBytes: number
): number {
  let totalBytes = currentBytes;

  for (let index = 0; index < textures.length; index += 1) {
    const texture = textures[index];
    if (uniqueTextures.has(texture)) {
      continue;
    }
    uniqueTextures.add(texture);
    totalBytes += getDecodedTextureMemoryEstimateBytes(texture);
  }

  return totalBytes;
}

function getOrCreateChunkTextureSet(
  chunkTextureSets: Map<string, Set<unknown>>,
  chunkKey: string
): Set<unknown> {
  let chunkTextures = chunkTextureSets.get(chunkKey);
  if (!chunkTextures) {
    chunkTextures = new Set<unknown>();
    chunkTextureSets.set(chunkKey, chunkTextures);
  }
  return chunkTextures;
}

function getChunkKey(tileX: number, tileY: number, chunkTileSize: number): string {
  return `${Math.floor(tileX / chunkTileSize)}:${Math.floor(tileY / chunkTileSize)}`;
}
