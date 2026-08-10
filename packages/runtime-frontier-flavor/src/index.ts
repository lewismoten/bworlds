import {} from '@bworlds/core';
import {
  appendHashSeedLabel,
  createHashSeed,
  hash2D,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core/hash';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

const SKY_DESCRIPTORS = ['clear', 'bright', 'golden', 'windy', 'cool'];
const LAND_DESCRIPTORS = ['frontier', 'wilds', 'marches', 'reach', 'expanse'];
const FRONTIER_SKY_LABEL = registerHashLabel('frontier-sky');
const FRONTIER_LAND_LABEL = registerHashLabel('frontier-land');
const FRONTIER_WARNING_LABEL = registerHashLabel('frontier-weather-warning');
const FRONTIER_DELIGHT_LABEL = registerHashLabel('frontier-weather-delight');

export function createFrontierFlavorRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-frontier-flavor', {
    resolveWorldEnvironment({ state }) {
      const skyProfile = resolveFrontierSkyProfile(
        state?.player?.x ?? 0,
        state?.player?.y ?? 0
      );
      return {
        sky: {
          dayColor: '#9ed8ff',
          sunsetColor: '#f2a06a',
          dawnColor: skyProfile.dawnColor,
          duskColor: skyProfile.duskColor,
          nightColor: '#06111f',
          fogDayColor: '#9ed8ff',
          fogDawnColor: skyProfile.fogDawnColor,
          fogDuskColor: skyProfile.fogDuskColor,
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
      const seedHash = createHashSeed(seed);
      const sky =
        SKY_DESCRIPTORS[
          Math.floor(
            hash2DWithSeed(
              appendHashSeedLabel(seedHash, FRONTIER_SKY_LABEL),
              x,
              y
            ) * SKY_DESCRIPTORS.length
          )
        ];
      const land =
        LAND_DESCRIPTORS[
          Math.floor(
            hash2DWithSeed(
              appendHashSeedLabel(seedHash, FRONTIER_LAND_LABEL),
              Math.floor(x / 24),
              Math.floor(y / 24)
            ) * LAND_DESCRIPTORS.length
          )
        ];

      tile.regionFlavor = `${sky}-${land}`;

      if (!tile.note && tile.kind === 'plains') {
        tile.note = `A ${sky} stretch of ${land} rolls into the distance.`;
      }
    },
  });
}

export function resolveFrontierSkyProfile(playerX: number, playerY: number) {
  const regionX = Math.floor(playerX / 24);
  const regionY = Math.floor(playerY / 24);
  const warningSignal = hash2D(FRONTIER_WARNING_LABEL, regionX, regionY);
  const delightSignal = hash2D(FRONTIER_DELIGHT_LABEL, regionX, regionY);

  return {
    dawnColor:
      warningSignal > 0.64
        ? pickFrontierWarningColor(warningSignal)
        : '#f2a06a',
    duskColor:
      delightSignal > 0.58
        ? pickFrontierDelightColor(delightSignal)
        : '#f2a06a',
    fogDawnColor: warningSignal > 0.64 ? '#dba27d' : '#9ed8ff',
    fogDuskColor: delightSignal > 0.58 ? '#e3b18a' : '#9ed8ff',
  };
}

function pickFrontierWarningColor(signal: number) {
  return signal > 0.82 ? '#ff7c5c' : '#f68f63';
}

function pickFrontierDelightColor(signal: number) {
  return signal > 0.8 ? '#ff9a68' : '#f2a06a';
}
