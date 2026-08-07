import { clamp, hash2D, octaveNoise2D, ridgedNoise2D } from '@bworlds/core';

function makeKey(...parts) {
  return parts.join(':');
}

function distanceToLineSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSquared = abx * abx + aby * aby;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = clamp((apx * abx + apy * aby) / lengthSquared, 0, 1);
  const nearestX = ax + abx * t;
  const nearestY = ay + aby * t;
  return Math.hypot(px - nearestX, py - nearestY);
}

function pickFrom(list, seedValue) {
  return list[Math.floor(seedValue * list.length) % list.length];
}

function createOverworldMap(seed, plugins) {
  const cache = new Map();
  const townAnchorCache = new Map();
  const bridgeAnchorCache = new Map();
  const curatedSpawnTiles = new Map([
    ['-3,-3', { kind: 'forest', note: 'A thick treeline hems the meadow.' }],
    [
      '3,-2',
      { kind: 'forest', note: 'Pines cluster near the starting field.' },
    ],
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
    [
      '1,2',
      { kind: 'sign', note: 'The sign points toward town and the coast.' },
    ],
    ['2,2', { kind: 'road', note: 'Cart tracks press into the packed road.' }],
    [
      '3,1',
      { kind: 'river', note: 'A narrow river winds through the meadow.' },
    ],
    ['3,2', { kind: 'bridge', note: 'A timber bridge crosses the river.' }],
    ['3,3', { kind: 'river', note: 'The river continues toward the coast.' }],
    [
      '7,0',
      { kind: 'shore', note: 'The grass gives way to a sandy shoreline.' },
    ],
    ['8,0', { kind: 'ocean', note: 'Open water stretches beyond the shore.' }],
    ['7,1', { kind: 'shore', note: 'Foamy surf washes onto the coast.' }],
    ['8,1', { kind: 'ocean', note: 'The sea rolls just beyond the beach.' }],
  ]);

  function sampleTerrainSignals(x, y) {
    const scaledX = x / 160;
    const scaledY = y / 160;
    return {
      continent: octaveNoise2D(`${seed}:continent`, scaledX, scaledY, {
        octaves: 5,
        persistence: 0.55,
      }),
      elevation: octaveNoise2D(`${seed}:elevation`, x / 45, y / 45, {
        octaves: 4,
        persistence: 0.5,
      }),
      moisture: octaveNoise2D(`${seed}:moisture`, x / 65, y / 65, {
        octaves: 4,
        persistence: 0.6,
      }),
      riverSignal: ridgedNoise2D(`${seed}:river`, x / 75, y / 75, {
        octaves: 3,
        persistence: 0.52,
      }),
      roadSignal: ridgedNoise2D(`${seed}:road`, x / 42, y / 42, {
        octaves: 2,
        persistence: 0.6,
      }),
    };
  }

  function getRegionalNameStyle(x, y) {
    const regionX = Math.floor(x / 48);
    const regionY = Math.floor(y / 48);
    const prefixSets = [
      ['Ash', 'Briar', 'Cinder', 'Dawn', 'Elder', 'Frost'],
      ['Green', 'High', 'Low', 'Moss', 'Oak', 'Stone'],
      ['Red', 'Silver', 'Sun', 'Thorn', 'West', 'Wind'],
      ['Moon', 'Raven', 'River', 'Storm', 'Vale', 'Wild'],
    ];
    const suffixSets = [
      ['ford', 'gate', 'grove', 'hollow', 'mere', 'watch'],
      ['barrow', 'crest', 'fell', 'hearth', 'rest', 'run'],
      ['bridge', 'field', 'keep', 'pass', 'reach', 'ward'],
      ['den', 'depths', 'hall', 'rift', 'spire', 'way'],
    ];

    return {
      regionX,
      regionY,
      prefixes:
        prefixSets[
          Math.floor(
            hash2D(`${seed}:name-prefix-set`, regionX, regionY) *
              prefixSets.length
          )
        ],
      suffixes:
        suffixSets[
          Math.floor(
            hash2D(`${seed}:name-suffix-set`, regionX, regionY) *
              suffixSets.length
          )
        ],
    };
  }

  function generatePoiName(type, x, y) {
    const style = getRegionalNameStyle(x, y);
    const stem = `${seed}:${type}:${x}:${y}`;
    const prefix = pickFrom(style.prefixes, hash2D(`${stem}:prefix`, x, y));
    const suffix = pickFrom(style.suffixes, hash2D(`${stem}:suffix`, y, x));

    if (type === 'town') {
      const forms = [
        `${prefix}${suffix}`,
        `${prefix} ${suffix}`,
        `${prefix}${pickFrom(['haven', 'stead', 'wick', 'port'], hash2D(`${stem}:tail`, x + y, y))}`,
      ];
      return pickFrom(forms, hash2D(`${stem}:form`, x - y, y - x));
    }

    if (type === 'cave') {
      const nouns = ['Cave', 'Grotto', 'Hollow', 'Mouth', 'Den', 'Sink'];
      return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
    }

    if (type === 'dungeon') {
      const nouns = ['Barrow', 'Crypt', 'Depths', 'Hall', 'Vault', 'Warren'];
      return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
    }

    return `${prefix}${suffix}`;
  }

  curatedSpawnTiles.get('-5,4').poi.name = generatePoiName('dungeon', -5, 4);
  curatedSpawnTiles.get('-4,5').poi.name = generatePoiName('cave', -4, 5);
  curatedSpawnTiles.get('5,4').poi.name = generatePoiName('town', 5, 4);

  function getTownAnchor(cellX, cellY) {
    const key = makeKey(cellX, cellY);
    if (!townAnchorCache.has(key)) {
      const cellSize = 20;
      const centerX = cellX * cellSize;
      const centerY = cellY * cellSize;
      const anchorX =
        centerX +
        Math.round((hash2D(`${seed}:town-anchor-x`, cellX, cellY) - 0.5) * 8);
      const anchorY =
        centerY +
        Math.round((hash2D(`${seed}:town-anchor-y`, cellX, cellY) - 0.5) * 8);
      const chance = hash2D(`${seed}:town-anchor`, cellX, cellY);
      const terrain = sampleTerrainSignals(anchorX, anchorY);
      const suitable =
        chance > 0.64 &&
        terrain.continent > 0.47 &&
        terrain.continent < 0.9 &&
        terrain.elevation < 0.7 &&
        terrain.riverSignal < 0.82;

      townAnchorCache.set(
        key,
        suitable
          ? {
              x: anchorX,
              y: anchorY,
              name: generatePoiName('town', anchorX, anchorY),
            }
          : null
      );
    }
    return townAnchorCache.get(key);
  }

  function getBridgeAnchor(cellX, cellY) {
    const key = makeKey(cellX, cellY);
    if (!bridgeAnchorCache.has(key)) {
      const cellSize = 16;
      const centerX = cellX * cellSize;
      const centerY = cellY * cellSize;
      const anchorX =
        centerX +
        Math.round((hash2D(`${seed}:bridge-anchor-x`, cellX, cellY) - 0.5) * 6);
      const anchorY =
        centerY +
        Math.round((hash2D(`${seed}:bridge-anchor-y`, cellX, cellY) - 0.5) * 6);
      const chance = hash2D(`${seed}:bridge-anchor`, cellX, cellY);
      const terrain = sampleTerrainSignals(anchorX, anchorY);
      const suitable =
        chance > 0.72 &&
        terrain.continent > 0.46 &&
        terrain.continent < 0.88 &&
        terrain.elevation < 0.68 &&
        terrain.riverSignal > 0.8;

      bridgeAnchorCache.set(
        key,
        suitable
          ? {
              x: anchorX,
              y: anchorY,
            }
          : null
      );
    }
    return bridgeAnchorCache.get(key);
  }

  function getNearbyTownAnchors(x, y) {
    const cellSize = 20;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const anchors = [];

    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const anchor = getTownAnchor(cellX + dx, cellY + dy);
        if (anchor) anchors.push(anchor);
      }
    }

    return anchors;
  }

  function getNearbyBridgeAnchors(x, y) {
    const cellSize = 16;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const anchors = [];

    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const anchor = getBridgeAnchor(cellX + dx, cellY + dy);
        if (anchor) anchors.push(anchor);
      }
    }

    return anchors;
  }

  function classifyConnectedRoad(x, y, baseKind, townAnchors, bridgeAnchors) {
    if (baseKind === 'ocean' || baseKind === 'mountain') {
      return null;
    }

    const nearestTown = townAnchors
      .map((anchor) => ({
        anchor,
        distance: Math.hypot(x - anchor.x, y - anchor.y),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (
      nearestTown &&
      nearestTown.distance < 2.6 &&
      baseKind !== 'river' &&
      baseKind !== 'bridge'
    ) {
      return 'road';
    }

    const pairs = [];
    for (let index = 0; index < townAnchors.length; index += 1) {
      for (let next = index + 1; next < townAnchors.length; next += 1) {
        const a = townAnchors[index];
        const b = townAnchors[next];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance <= 28) {
          pairs.push([a, b]);
        }
      }
    }

    for (const [a, b] of pairs) {
      if (distanceToLineSegment(x, y, a.x, a.y, b.x, b.y) < 0.42) {
        return baseKind === 'river' ? 'bridge' : 'road';
      }
    }

    if (nearestTown) {
      const nearestBridge = bridgeAnchors
        .map((anchor) => ({
          anchor,
          distance: Math.hypot(
            nearestTown.anchor.x - anchor.x,
            nearestTown.anchor.y - anchor.y
          ),
        }))
        .sort((a, b) => a.distance - b.distance)[0];

      if (
        nearestBridge &&
        nearestBridge.distance <= 16 &&
        distanceToLineSegment(
          x,
          y,
          nearestTown.anchor.x,
          nearestTown.anchor.y,
          nearestBridge.anchor.x,
          nearestBridge.anchor.y
        ) < 0.38
      ) {
        return baseKind === 'river' ? 'bridge' : 'road';
      }
    }

    for (const bridge of bridgeAnchors) {
      const distance = Math.hypot(x - bridge.x, y - bridge.y);
      if (distance < 0.8) {
        return baseKind === 'river' ? 'bridge' : 'road';
      }
    }

    return null;
  }

  function classifyTile(x, y) {
    const curatedTile = curatedSpawnTiles.get(`${x},${y}`);
    if (curatedTile) {
      return curatedTile;
    }

    if (Math.abs(x) <= 4 && Math.abs(y) <= 4) {
      return {
        kind: 'plains',
        note: 'A calm starting meadow stretches around you.',
      };
    }

    const { continent, elevation, moisture, riverSignal, roadSignal } =
      sampleTerrainSignals(x, y);
    const townChance = hash2D(`${seed}:town`, x, y);
    const dungeonChance = hash2D(`${seed}:dungeon`, x, y);
    const caveChance = hash2D(`${seed}:cave`, x, y);
    const signChance = hash2D(`${seed}:sign`, x, y);
    const townAnchors = getNearbyTownAnchors(x, y);
    const bridgeAnchors = getNearbyBridgeAnchors(x, y);

    let tile = { kind: 'plains' };

    if (continent < 0.38) {
      tile = { kind: 'ocean' };
    } else if (continent < 0.46) {
      tile = { kind: 'shore' };
    } else if (elevation > 0.72) {
      tile = { kind: 'mountain' };
    } else if (riverSignal > 0.82 && elevation < 0.68) {
      tile = { kind: 'river' };
    } else if (moisture > 0.6) {
      tile = { kind: 'forest' };
    }

    const nearLand = continent > 0.45 && continent < 0.9;
    if (
      roadSignal > 0.87 &&
      tile.kind !== 'ocean' &&
      tile.kind !== 'mountain'
    ) {
      tile = { kind: tile.kind === 'river' ? 'bridge' : 'road' };
    }

    const directTownAnchor = townAnchors.find(
      (anchor) => Math.hypot(x - anchor.x, y - anchor.y) < 0.55
    );
    if (
      directTownAnchor &&
      tile.kind !== 'ocean' &&
      tile.kind !== 'river' &&
      tile.kind !== 'mountain'
    ) {
      tile = {
        kind: 'town',
        poi: { type: 'town', name: directTownAnchor.name },
        note: 'A lively town rises where several roads meet.',
      };
    }

    if (
      nearLand &&
      tile.kind !== 'river' &&
      tile.kind !== 'ocean' &&
      tile.kind !== 'mountain'
    ) {
      if (townChance > 0.996) {
        tile = {
          kind: 'town',
          poi: { type: 'town', name: generatePoiName('town', x, y) },
          note: 'A town entrance. Press interact to enter.',
        };
      } else if (dungeonChance > 0.9975) {
        tile = {
          kind: 'dungeon',
          poi: { type: 'dungeon', name: generatePoiName('dungeon', x, y) },
          note: 'A dungeon descent awaits.',
        };
      } else if (caveChance > 0.997) {
        tile = {
          kind: 'cave',
          poi: { type: 'cave', name: generatePoiName('cave', x, y) },
          note: 'A cave mouth opens in the terrain.',
        };
      } else if (signChance > 0.997) {
        tile = {
          kind: 'sign',
          note: `Marker ${x}, ${y}: roads lead onward.`,
        };
      }
    }

    const connectedRoadKind = classifyConnectedRoad(
      x,
      y,
      tile.kind,
      townAnchors,
      bridgeAnchors
    );
    if (
      connectedRoadKind &&
      tile.kind !== 'town' &&
      tile.kind !== 'dungeon' &&
      tile.kind !== 'cave' &&
      tile.kind !== 'sign'
    ) {
      tile = {
        ...tile,
        kind: connectedRoadKind,
        note:
          tile.note ??
          (connectedRoadKind === 'bridge'
            ? 'A crossing links the nearby routes.'
            : 'A road runs between nearby landmarks.'),
      };
    }

    const neighboringSeaSignal = Math.min(
      octaveNoise2D(`${seed}:continent`, (x + 1) / 160, y / 160, {
        octaves: 5,
        persistence: 0.55,
      }),
      octaveNoise2D(`${seed}:continent`, (x - 1) / 160, y / 160, {
        octaves: 5,
        persistence: 0.55,
      }),
      octaveNoise2D(`${seed}:continent`, x / 160, (y + 1) / 160, {
        octaves: 5,
        persistence: 0.55,
      }),
      octaveNoise2D(`${seed}:continent`, x / 160, (y - 1) / 160, {
        octaves: 5,
        persistence: 0.55,
      })
    );

    if (
      tile.kind !== 'ocean' &&
      tile.kind !== 'river' &&
      tile.kind !== 'bridge' &&
      tile.kind !== 'mountain' &&
      neighboringSeaSignal < 0.4
    ) {
      tile = {
        ...tile,
        kind: 'shore',
        note: tile.note ?? 'The terrain softens into a coastal edge.',
      };
    }

    return plugins.runHook('decorateOverworldTile', {
      seed,
      x,
      y,
      tile,
    }).tile;
  }

  function getTile(x, y) {
    const key = makeKey(x, y);
    if (!cache.has(key)) {
      cache.set(key, classifyTile(x, y));
    }
    return cache.get(key);
  }

  function getAction(x, y) {
    const tile = getTile(x, y);
    if (!tile.poi) return null;

    return {
      type: 'enter',
      context: {
        id: `${tile.poi.type}:${x}:${y}:0`,
        label: tile.poi.name,
        type: tile.poi.type,
        depth: 1,
        origin: { x, y },
      },
      spawn: { x: 0, y: 0 },
      facing: 0,
    };
  }

  function getExit() {
    return null;
  }

  return { getTile, getAction, getExit };
}

function createTownMap(context, seed, plugins) {
  const width = 25;
  const height = 25;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  function getTile(x, y) {
    const localX = x + cx;
    const localY = y + cy;
    if (localX < 0 || localY < 0 || localX >= width || localY >= height) {
      return { kind: 'forest' };
    }

    let tile = { kind: 'plains' };
    const onRoad = localX === cx || localY === cy;
    const plaza =
      Math.abs(localX - cx) <= 1 && Math.abs(localY - cy) <= 1 && !onRoad;
    const buildingBand =
      Math.abs(localY - cy) === 3 &&
      Math.abs(localX - cx) <= 8 &&
      localX % 2 === 0;

    if (onRoad || plaza) tile = { kind: 'road' };
    if (buildingBand) {
      tile = { kind: 'shop', building: { id: `${context.id}:${x}:${y}` } };
    }
    if (Math.abs(localX - cx) === 9 || Math.abs(localY - cy) === 9) {
      tile = { kind: 'forest' };
    }
    if (localX === cx && localY === cy) {
      tile = {
        kind: 'town',
        note: 'Town square. Explore the buildings or leave at the gate.',
      };
    }
    if (localX === cx && localY === height - 2) {
      tile = { kind: 'door', note: 'Town gate. Press X to return outside.' };
    }

    return plugins.runHook('decorateTownTile', {
      context,
      seed,
      x,
      y,
      tile,
    }).tile;
  }

  function getAction(x, y) {
    const tile = getTile(x, y);
    if (!tile.building) return null;
    return {
      type: 'enter',
      context: {
        id: `${tile.building.id}:building`,
        label: 'Building Interior',
        type: 'building',
        depth: context.depth + 1,
        origin: context.origin,
      },
      spawn: { x: 0, y: 3 },
    };
  }

  function getExit(x, y) {
    if (x === 0 && y === 11) {
      return { spawn: { x: context.origin.x, y: context.origin.y } };
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

function createBuildingMap(context, seed, plugins) {
  function getTile(x, y) {
    let tile = { kind: 'wall' };
    if (Math.abs(x) <= 3 && Math.abs(y) <= 3) tile = { kind: 'floor' };
    if (y === 3 && x === 0) tile = { kind: 'door', note: 'Press X to leave.' };
    if (y === -2 && Math.abs(x) <= 1) tile = { kind: 'shop' };

    return plugins.runHook('decorateBuildingTile', {
      context,
      seed,
      x,
      y,
      tile,
    }).tile;
  }

  function getAction() {
    return null;
  }

  function getExit(x, y) {
    if (x === 0 && y === 3) {
      return {};
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

function createDepthMap(context, seed, plugins) {
  const size = 21;
  const radius = Math.floor(size / 2);

  function getTile(x, y) {
    const localX = x + radius;
    const localY = y + radius;
    if (localX < 0 || localY < 0 || localX >= size || localY >= size) {
      return { kind: 'wall' };
    }

    let tile = { kind: 'wall' };
    const chamber =
      Math.abs(x) <= 7 &&
      Math.abs(y) <= 7 &&
      (Math.abs(x) <= 1 || Math.abs(y) <= 1 || hash2D(seed, x, y) > 0.3);

    if (chamber) tile = { kind: 'floor' };
    if (x === 0 && y === 0) {
      tile = {
        kind: context.type === 'cave' ? 'cave' : 'dungeon',
        note: 'Press interact on the stairs to go deeper.',
      };
    }
    if (x === 0 && y === 6)
      tile = { kind: 'stairsUp', note: 'Press X to leave.' };
    if (x === 0 && y === -6) {
      tile = {
        kind: 'stairsDown',
        note: 'The next level extends below.',
      };
    }

    return plugins.runHook('decorateDepthTile', {
      context,
      seed,
      x,
      y,
      tile,
    }).tile;
  }

  function getAction(x, y) {
    if (x === 0 && y === -6) {
      return {
        type: 'deepen',
        context: {
          id: `${context.type}:${context.origin.x}:${context.origin.y}:${context.depth + 1}`,
          label: `${context.label} B${context.depth + 1}`,
          type: context.type,
          depth: context.depth + 1,
          origin: context.origin,
        },
        spawn: { x: 0, y: 5 },
      };
    }
    return null;
  }

  function getExit(x, y) {
    if (x === 0 && y === 6) {
      if (context.depth === 1) {
        return { spawn: { x: context.origin.x, y: context.origin.y } };
      }
      return { spawn: { x: 0, y: -5 } };
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

export function createWorldGenerator({ seed, plugins }) {
  const mapCache = new Map();
  const overworld = createOverworldMap(seed, plugins);

  return {
    getMap(context) {
      if (context.type === 'overworld') {
        return overworld;
      }

      const key = makeKey(context.id, context.depth);
      if (!mapCache.has(key)) {
        if (context.type === 'town') {
          mapCache.set(key, createTownMap(context, seed, plugins));
        } else if (context.type === 'building') {
          mapCache.set(key, createBuildingMap(context, seed, plugins));
        } else {
          mapCache.set(key, createDepthMap(context, seed, plugins));
        }
      }
      return mapCache.get(key);
    },
    sampleOverworld(x, y) {
      return overworld.getTile(x, y);
    },
  };
}

export const defaultPlugins = [
  {
    name: 'bridges-on-rivers',
    decorateOverworldTile({ x, y, tile }) {
      if (
        tile.kind === 'river' &&
        clamp(hash2D('bridges', x, y) + hash2D('bridges2', y, x), 0, 1) > 1.65
      ) {
        tile.kind = 'bridge';
        tile.note = 'A narrow bridge spans the river.';
      }
    },
  },
  {
    name: 'wayfinding',
    decorateTownTile({ x, y, tile }) {
      if (tile.kind === 'road' && Math.abs(x) === 4 && y === 0) {
        tile.note = 'The market is busy today.';
      }
    },
  },
  {
    name: 'dungeon-flavor',
    decorateDepthTile({ context, x, y, tile }) {
      if (tile.kind === 'floor' && hash2D(context.id, x, y) > 0.985) {
        tile.note = `Depth ${context.depth}: ancient markings cover the floor.`;
      }
    },
  },
];
