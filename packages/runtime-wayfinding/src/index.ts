import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  DecorateTownTileContext,
  RuntimePlugin,
} from '@bworlds/plugin-api';

export function createWayfindingRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-wayfinding', {
    decorateTownTile({ x, y, tile }: DecorateTownTileContext) {
      if (tile.kind === 'road' && Math.abs(x) === 4 && y === 0) {
        tile.note = 'The market is busy today.';
      }
    },
  });
}
