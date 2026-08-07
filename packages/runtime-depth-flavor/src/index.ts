import { hash2D } from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  DecorateDepthTileContext,
  RuntimePlugin,
} from '@bworlds/plugin-api';

export function createDepthFlavorRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-depth-flavor', {
    decorateDepthTile({ context, x, y, tile }: DecorateDepthTileContext) {
      if (tile.kind === 'floor' && hash2D(context.id, x, y) > 0.985) {
        tile.note = `Depth ${context.depth}: ancient markings cover the floor.`;
      }
    },
  });
}
