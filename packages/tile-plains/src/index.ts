import { paintPlainsBackdrop } from '@bworlds/paint-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import type { Paint2DContext, RuntimePlugin } from '@bworlds/plugin-api';

export function createPlainsTilePlugin(): RuntimePlugin {
  return createTilePlugin('tile-plains', [
    {
      kind: 'plains',
      definition: {
        name: 'Plains',
        color: '#7fb069',
        miniColor: '#95c779',
        walkable: true,
        wallHeight: 0,
      },
      paint2D({ context, x, y, motif, fillRect }: Paint2DContext) {
        paintPlainsBackdrop({ context, x, y, motif, fillRect });
        return true;
      },
    },
  ]);
}
