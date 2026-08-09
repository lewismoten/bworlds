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
          appendHashSeedLabel(depthFlavorSeed, registerHashLabel(context.id)),
          x,
          y
        ) > 0.985
      ) {
        tile.note = `Depth ${context.depth}: ancient markings cover the floor.`;
      }
    },
  });
}
