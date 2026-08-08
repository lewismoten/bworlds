import { hash2D } from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

const SKY_DESCRIPTORS = ['clear', 'bright', 'golden', 'windy', 'cool'];
const LAND_DESCRIPTORS = ['frontier', 'wilds', 'marches', 'reach', 'expanse'];

export function createFrontierFlavorRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-frontier-flavor', {
    resolveWorldEnvironment() {
      return {
        sky: {
          dayColor: '#9ed8ff',
          sunsetColor: '#f2a06a',
          nightColor: '#06111f',
          fogDayColor: '#9ed8ff',
          fogNightColor: '#0a1524',
        },
        lighting: {
          sunColor: '#fff3cf',
          moonColor: '#9ec5ff',
          ambientDayColor: '#eaf6ff',
          ambientNightColor: '#9fc4ff',
          groundDayColor: '#28442f',
          groundNightColor: '#101826',
          shadowStrength: 1,
        },
        stars: {
          density: 1,
        },
      };
    },
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
