import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import { createSingleTilePlugin } from '@bworlds/plugin-api';
import type { Create3DModelContext, RuntimePlugin } from '@bworlds/plugin-api';

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
    create3DModel({ three }: Create3DModelContext) {
      // render3d already creates the shared visible floor mesh for plains tiles.
      // Return a hidden empty group so visible-LOD recovery treats plains as a
      // valid model without paying for a duplicate coplanar ground plane.
      const group = new three.Group();
      group.visible = false;
      group.userData = {
        ...(group.userData ?? {}),
        plainsUsesSharedFloorMesh: true,
      };
      return group;
    },
  });
}
