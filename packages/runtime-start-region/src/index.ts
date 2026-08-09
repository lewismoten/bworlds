import { generatePoiName } from '@bworlds/core';
import { resolveHashSeed } from '@bworlds/core/hash';
import { createCachedOverworldTileResolver } from '@bworlds/overworld-support';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin, Seed, TileLike } from '@bworlds/plugin-api';

const curatedSpawnTiles = new Map<string, TileLike>([
  ['-3,-3', { kind: 'forest', note: 'A thick treeline hems the meadow.' }],
  ['3,-2', { kind: 'forest', note: 'Pines cluster near the starting field.' }],
  ['-2,3', { kind: 'forest', note: 'A small woodland borders the plains.' }],
  ['-5,-1', { kind: 'mountain', note: 'A rugged mountain rises nearby.' }],
  [
    '-6,-2',
    {
      kind: 'observatory',
      poi: { type: 'observatory', name: 'Starter Observatory' },
      note: 'An observatory keeps watch from the nearby summit.',
    },
  ],
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
  ['-1,2', { kind: 'road', note: 'A road reaches in from the western meadow.' }],
  ['0,2', { kind: 'road', note: 'A road cuts through the starting plains.' }],
  ['1,2', { kind: 'road', note: 'Wheel tracks mark the road across the meadow.' }],
  ['1,1', { kind: 'sign', note: 'The sign points toward town, the cave, and the coast.' }],
  ['2,2', { kind: 'road', note: 'Cart tracks press into the packed road.' }],
  ['3,-1', { kind: 'river', note: 'The river begins as a winding stream beyond the meadow.' }],
  ['4,-1', { kind: 'river', note: 'The river curls south toward the crossing.' }],
  ['4,0', { kind: 'river', note: 'Water bends around the edge of the plains.' }],
  ['3,1', { kind: 'river', note: 'A narrow river winds through the meadow.' }],
  ['3,2', { kind: 'bridge', note: 'A timber bridge crosses the river.' }],
  ['3,3', { kind: 'river', note: 'The river continues toward the coast.' }],
  ['4,2', { kind: 'road', note: 'The road climbs away from the bridge.' }],
  ['5,2', { kind: 'road', note: 'The road turns toward the town gate.' }],
  ['5,3', { kind: 'road', note: 'The road leads directly toward the nearby town.' }],
  ['4,4', { kind: 'river', note: 'The river arcs southeast toward the shore.' }],
  ['5,5', { kind: 'river', note: 'The river widens as it nears the sea.' }],
  [
    '6,0',
    {
      kind: 'lighthouse',
      poi: { type: 'lighthouse', name: 'Starter Lighthouse' },
      note: 'A lighthouse watches over the nearby shoals.',
    },
  ],
  ['7,0', { kind: 'dock', note: 'The dock begins at the coastal stones below the light.' }],
  ['8,0', { kind: 'dock', note: 'The dock stretches out above the rolling tide.' }],
  [
    '9,0',
    {
      kind: 'ship',
      poi: { type: 'ship', name: 'Starter Ship' },
      note: 'A moored ship rocks gently at the end of the dock.',
    },
  ],
  ['7,1', { kind: 'shore', note: 'Foamy surf washes onto the coast.' }],
  ['8,1', { kind: 'ocean', note: 'The sea rolls just beyond the beach.' }],
  ['9,1', { kind: 'ocean', note: 'Deep water laps against the moored hull.' }],
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
  seed: Seed;
  x: number;
  y: number;
}) {
  const seedHash = resolveHashSeed(seed);
  const tile = curatedSpawnTiles.get(`${x},${y}`);
  if (tile) {
    if (tile.kind === 'dungeon' && tile.poi) {
      return {
        ...tile,
        poi: { ...tile.poi, name: generatePoiName(seedHash, 'dungeon', -5, 4) },
      };
    }
    if (tile.kind === 'cave' && tile.poi) {
      return {
        ...tile,
        poi: { ...tile.poi, name: generatePoiName(seedHash, 'cave', -4, 5) },
      };
    }
    if (tile.kind === 'town' && tile.poi) {
      return {
        ...tile,
        poi: { ...tile.poi, name: generatePoiName(seedHash, 'town', 5, 4) },
      };
    }
    if (tile.kind === 'lighthouse' && tile.poi) {
      return {
        ...tile,
        poi: { ...tile.poi, name: generatePoiName(seedHash, 'lighthouse', 6, 0) },
      };
    }
    if (tile.kind === 'ship' && tile.poi) {
      return {
        ...tile,
        poi: { ...tile.poi, name: generatePoiName(seedHash, 'ship', 9, 0) },
      };
    }
    if (tile.kind === 'observatory' && tile.poi) {
      return {
        ...tile,
        poi: { ...tile.poi, name: generatePoiName(seedHash, 'observatory', -6, -2) },
      };
    }

    return tile;
  }

  if (Math.abs(x) <= 4 && Math.abs(y) <= 4) {
    return {
      kind: 'plains',
      note: 'A calm starting meadow stretches around you.',
    };
  }

  return null;
}
