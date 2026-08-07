import { clamp, hash2D, octaveNoise2D, ridgedNoise2D } from '@bworlds/core';

function makeKey(...parts) {
  return parts.join(':');
}

function isTownTile(tile) {
  return tile.poi?.type === 'town' || tile.kind === 'town';
}

function createOverworldMap(seed, plugins) {
  const cache = new Map();

  function classifyTile(x, y) {
    if (Math.abs(x) <= 2 && Math.abs(y) <= 2) {
      return {
        kind: 'plains',
        note: 'A calm starting meadow stretches around you.',
      };
    }

    const scaledX = x / 160;
    const scaledY = y / 160;
    const continent = octaveNoise2D(`${seed}:continent`, scaledX, scaledY, {
      octaves: 5,
      persistence: 0.55,
    });
    const elevation = octaveNoise2D(`${seed}:elevation`, x / 45, y / 45, {
      octaves: 4,
      persistence: 0.5,
    });
    const moisture = octaveNoise2D(`${seed}:moisture`, x / 65, y / 65, {
      octaves: 4,
      persistence: 0.6,
    });
    const riverSignal = ridgedNoise2D(`${seed}:river`, x / 75, y / 75, {
      octaves: 3,
      persistence: 0.52,
    });
    const roadSignal = ridgedNoise2D(`${seed}:road`, x / 42, y / 42, {
      octaves: 2,
      persistence: 0.6,
    });
    const townChance = hash2D(`${seed}:town`, x, y);
    const dungeonChance = hash2D(`${seed}:dungeon`, x, y);
    const caveChance = hash2D(`${seed}:cave`, x, y);
    const signChance = hash2D(`${seed}:sign`, x, y);

    let tile = { kind: 'plains' };

    if (continent < 0.38) {
      tile = { kind: 'ocean' };
    } else if (continent < 0.42) {
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

    if (
      nearLand &&
      tile.kind !== 'river' &&
      tile.kind !== 'ocean' &&
      tile.kind !== 'mountain'
    ) {
      if (townChance > 0.996) {
        tile = {
          kind: 'town',
          poi: { type: 'town', name: `Town ${Math.abs(x)}:${Math.abs(y)}` },
          note: 'A town entrance. Press interact to enter.',
        };
      } else if (dungeonChance > 0.9975) {
        tile = {
          kind: 'dungeon',
          poi: { type: 'dungeon', name: `Dungeon ${x}:${y}` },
          note: 'A dungeon descent awaits.',
        };
      } else if (caveChance > 0.997) {
        tile = {
          kind: 'cave',
          poi: { type: 'cave', name: `Cave ${x}:${y}` },
          note: 'A cave mouth opens in the terrain.',
        };
      } else if (signChance > 0.997) {
        tile = {
          kind: 'sign',
          note: `Marker ${x}, ${y}: roads lead onward.`,
        };
      }
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
