import { hash2D } from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

const SKY_DESCRIPTORS = ['clear', 'bright', 'golden', 'windy', 'cool'];
const LAND_DESCRIPTORS = ['frontier', 'wilds', 'marches', 'reach', 'expanse'];

export function createFrontierFlavorRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-frontier-flavor', {
    decorateOverworldTile({ seed, tile, x, y }) {
      const sky =
        SKY_DESCRIPTORS[
          Math.floor(hash2D(`${seed}:frontier-sky`, x, y) * SKY_DESCRIPTORS.length)
        ];
      const land =
        LAND_DESCRIPTORS[
          Math.floor(
            hash2D(`${seed}:frontier-land`, Math.floor(x / 24), Math.floor(y / 24)) *
              LAND_DESCRIPTORS.length
          )
        ];

      tile.regionFlavor = `${sky}-${land}`;

      if (!tile.note && tile.kind === 'plains') {
        tile.note = `A ${sky} stretch of ${land} rolls into the distance.`;
      }
    },
  });
}
