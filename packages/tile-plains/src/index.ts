import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import { createSingleTilePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

export function createPlainsTilePlugin(): RuntimePlugin {
  return createSingleTilePlugin('tile-plains', {
    kind: 'plains',
    definition: {
      name: 'Plains',
      color: '#7fb069',
      miniColor: '#95c779',
      walkable: true,
      wallHeight: 0,
    },
    paint2D: createPlainsBackedTilePainter(),
    create3DModel() {
      // render3d already creates the shared visible floor mesh for plains tiles.
      // Returning null avoids stacking a second coplanar ground plane per tile.
      return null;
    },
  });
}
