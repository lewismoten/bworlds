import { generatePoiName } from '@bworlds/core';
import { createCachedOverworldTileResolver } from '@bworlds/overworld-support';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin, TileLike } from '@bworlds/plugin-api';

const curatedSpawnTiles = new Map<string, TileLike>([
  ['-3,-3', { kind: 'forest', note: 'A thick treeline hems the meadow.' }],
  ['3,-2', { kind: 'forest', note: 'Pines cluster near the starting field.' }],
  ['-2,3', { kind: 'forest', note: 'A small woodland borders the plains.' }],
  ['-5,-1', { kind: 'mountain', note: 'A rugged mountain rises nearby.' }],
  [
    '-5,4',
    {
      kind: 'dungeon',
      poi: { type: 'dungeon', name: 'Starter Dungeon' },
      note: 'A dungeon entrance waits in the foothills.',
    },
  ],
  [
    '-4,5',
    {
      kind: 'cave',
      poi: { type: 'cave', name: 'Starter Cave' },
      note: 'A cave mouth opens beneath the ridge.',
    },
  ],
  [
    '5,4',
    {
      kind: 'town',
      poi: { type: 'town', name: 'Starter Town' },
      note: 'A welcoming town sits just beyond the meadow.',
    },
  ],
  ['0,2', { kind: 'road', note: 'A road cuts through the starting plains.' }],
  ['1,2', { kind: 'sign', note: 'The sign points toward town and the coast.' }],
  ['2,2', { kind: 'road', note: 'Cart tracks press into the packed road.' }],
  ['3,1', { kind: 'river', note: 'A narrow river winds through the meadow.' }],
  ['3,2', { kind: 'bridge', note: 'A timber bridge crosses the river.' }],
  ['3,3', { kind: 'river', note: 'The river continues toward the coast.' }],
  ['7,0', { kind: 'shore', note: 'The grass gives way to a sandy shoreline.' }],
  ['8,0', { kind: 'ocean', note: 'Open water stretches beyond the shore.' }],
  ['7,1', { kind: 'shore', note: 'Foamy surf washes onto the coast.' }],
  ['8,1', { kind: 'ocean', note: 'The sea rolls just beyond the beach.' }],
]);

export function createStartRegionRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-start-region', {
    resolveOverworldTile: createCachedOverworldTileResolver(getCuratedTile),
  });
}

function getCuratedTile({
  seed,
  x,
  y,
}: {
  seed: string | number;
  x: number;
  y: number;
}) {
  if (Math.abs(x) <= 4 && Math.abs(y) <= 4) {
    return {
      kind: 'plains',
      note: 'A calm starting meadow stretches around you.',
    };
  }

  const tile = curatedSpawnTiles.get(`${x},${y}`);
  if (!tile) {
    return null;
  }

  if (tile.kind === 'dungeon' && tile.poi) {
    return {
      ...tile,
      poi: { ...tile.poi, name: generatePoiName(seed, 'dungeon', -5, 4) },
    };
  }
  if (tile.kind === 'cave' && tile.poi) {
    return {
      ...tile,
      poi: { ...tile.poi, name: generatePoiName(seed, 'cave', -4, 5) },
    };
  }
  if (tile.kind === 'town' && tile.poi) {
    return {
      ...tile,
      poi: { ...tile.poi, name: generatePoiName(seed, 'town', 5, 4) },
    };
  }

  return tile;
}
