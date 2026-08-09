import {
  appendHashSeedLabel,
  hash2D,
  registerHashLabel,
} from '@bworlds/core/hash';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  DecorateDepthTileContext,
  RuntimePlugin,
} from '@bworlds/plugin-api';

export function createDepthFlavorRuntimePlugin(): RuntimePlugin {
  const depthFlavorSeed = registerHashLabel('runtime-depth-flavor');
  return createRuntimePlugin('runtime-depth-flavor', {
    decorateDepthTile({ context, x, y, tile }: DecorateDepthTileContext) {
      if (
        tile.kind === 'floor' &&
        hash2D(
          getDepthFlavorContextSeed(depthFlavorSeed, context.id),
          x,
          y
        ) > 0.985
      ) {
        tile.note = `Depth ${context.depth}: ancient markings cover the floor.`;
      }
    },
  });
}

const depthFlavorContextSeedCache = new Map<string, number>();

export function getDepthFlavorContextSeed(
  depthFlavorSeed: number,
  contextId: string
): number {
  const cacheKey = `${depthFlavorSeed}:${contextId}`;
  const cached = depthFlavorContextSeedCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const seedHash = appendHashSeedLabel(depthFlavorSeed, registerHashLabel(contextId));
  depthFlavorContextSeedCache.set(cacheKey, seedHash);
  return seedHash;
}
