import { createBoundedCache } from '@bworlds/cache-support';
import {
  appendHashSeedLabel,
  createHashSeed,
  hash2D,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core/hash';
import {
  createChildContext,
  createContextMapPlugin,
  createDecoratedMapTileGetter,
  createDeepenMapAction,
  createExitMapAction,
} from '@bworlds/map-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };
type NamedPoint = Point & { name?: string };

type DepthTile = TileLike;
type CaveFeatureTileKind =
  | 'cave-floor'
  | 'cave-wall'
  | 'cave-mushrooms'
  | 'cave-dripstone'
  | 'cave-obstacle';

type DepthContext = WorldContextLike & {
  origin: Point;
  entrances?: NamedPoint[];
  systemId?: string;
};

type DepthLayout = {
  size: number;
  radius: number;
  stairsDown: Point;
  tiles: Map<string, DepthTile>;
};

type DepthEntranceExit = {
  world: NamedPoint;
  local: Point;
  label?: string;
};

const DEFAULT_DEPTH_SIZE = 21;
const CAVE_DEPTH_SIZE = 27;
const DEPTH_LAYOUT_CACHE_LIMIT = 256;
const CAVE_CHAMBER_WEST_SEED = registerHashLabel('cave-chamber-west');
const CAVE_CHAMBER_WEST_Y_SEED = registerHashLabel('cave-chamber-west-y');
const CAVE_CHAMBER_WEST_RADIUS_SEED = registerHashLabel('cave-chamber-west-r');
const CAVE_CHAMBER_EAST_SEED = registerHashLabel('cave-chamber-east');
const CAVE_CHAMBER_EAST_Y_SEED = registerHashLabel('cave-chamber-east-y');
const CAVE_CHAMBER_EAST_RADIUS_SEED = registerHashLabel('cave-chamber-east-r');
const CAVE_CHAMBER_NORTH_SEED = registerHashLabel('cave-chamber-north');
const CAVE_CHAMBER_NORTH_RADIUS_SEED = registerHashLabel('cave-chamber-north-r');
const CAVE_BRIDGE_AXIS_SEED = registerHashLabel('cave-bridge-axis');
const CAVE_POOL_X_SEED = registerHashLabel('cave-pool-x');
const CAVE_POOL_Y_SEED = registerHashLabel('cave-pool-y');
const CAVE_WIDEN_SEED = registerHashLabel('cave-widen');
const CAVE_FEATURE_KIND_SEEDS: Record<CaveFeatureTileKind, number> = {
  'cave-floor': registerHashLabel('cave-floor'),
  'cave-wall': registerHashLabel('cave-wall'),
  'cave-mushrooms': registerHashLabel('cave-mushrooms'),
  'cave-dripstone': registerHashLabel('cave-dripstone'),
  'cave-obstacle': registerHashLabel('cave-obstacle'),
};
const depthLayoutCache = createBoundedCache<string, DepthLayout>(
  DEPTH_LAYOUT_CACHE_LIMIT
);

export function createDepthMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<DepthContext>({
    name: 'map-depth',
    contextType: ['cave', 'dungeon'],
    createMap: createDepthMap,
  });
}

export function createCaveDepthLayout(
  context: DepthContext,
  seed: string | number
): DepthLayout {
  const seedHash = resolveDepthSeed(seed);
  const entranceExits = getDepthEntranceExits(context);
  const size = CAVE_DEPTH_SIZE;
  const radius = Math.floor(size / 2);
  const stairsDown = { x: 0, y: -7 };
  const tiles = new Map<string, DepthTile>();
  const protectedTiles = new Set<string>();

  fillRect(tiles, radius, -radius, -radius, size, size, { kind: 'cave-wall' });

  carveBrush(tiles, radius, 0, 0, 3, { kind: 'cave-floor' });
  carveBrush(tiles, radius, stairsDown.x, stairsDown.y, 2, { kind: 'cave-floor' });
  markProtected(protectedTiles, stairsDown);

  entranceExits.forEach((exit) => {
    carveBrush(tiles, radius, exit.local.x, exit.local.y, 2, {
      kind: 'cave-floor',
    });
    carvePath(tiles, radius, exit.local, { x: 0, y: 2 }, 2, {
      kind: 'cave-floor',
    });
    markProtected(protectedTiles, exit.local);
  });

  carvePath(tiles, radius, { x: 0, y: 2 }, stairsDown, 2, { kind: 'cave-floor' });

  const chamberSeeds = createCaveChamberSeeds(context, seedHash);
  chamberSeeds.forEach(({ center, chamberRadius }) => {
    carveBrush(tiles, radius, center.x, center.y, chamberRadius, {
      kind: 'cave-floor',
    });
  });

  widenNearbyFloors(tiles, radius, seedHash, context.depth ?? 1);
  const bridgeAxis = addPoolAndBridge(
    tiles,
    radius,
    context,
    seedHash,
    protectedTiles
  );
  decorateCaveFeatures(tiles, radius, context, seedHash, protectedTiles, bridgeAxis);

  entranceExits.forEach((exit) => {
    tiles.set(toTileKey(exit.local.x, exit.local.y), {
      kind: 'stairsUp',
      note:
        typeof exit.label === 'string' && exit.label.length > 0
          ? `Press X to leave through ${exit.label}.`
          : 'Press X to leave.',
    });
  });
  tiles.set(toTileKey(stairsDown.x, stairsDown.y), {
    kind: 'stairsDown',
    note: 'A rope ladder drops deeper into the cave system.',
  });
  tiles.set(toTileKey(0, 0), {
    kind: 'cave-floor',
    note: 'A broad chamber links the cave passages together.',
  });

  return {
    size,
    radius,
    stairsDown,
    tiles,
  };
}

function createDepthMap(
  context: DepthContext,
  seed: string | number,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
  const entranceExits = getDepthEntranceExits(context);
  const layout = getDepthLayout(context, seed);

  const getTile = createDecoratedMapTileGetter<DepthTile, DepthContext>({
    context,
    seed,
    resolveTile(x: number, y: number) {
      return getLayoutTile(layout, x, y);
    },
    decorateTile(payload) {
      return plugins.decorateDepthTile(payload);
    },
  });

  function getAction(x: number, y: number) {
    if (x === layout.stairsDown.x && y === layout.stairsDown.y) {
      return createDeepenMapAction({
        context: createChildContext(context, {
          id: resolveDepthContextId(context),
          label: `${context.label} B${context.depth + 1}`,
          type: context.type!,
          origin: context.origin,
        }),
        spawn: { x: 0, y: 5 },
      });
    }
    return null;
  }

  function getExit(x?: number, y?: number) {
    const exit = entranceExits.find(
      (entry) => entry.local.x === x && entry.local.y === y
    );
    if (exit) {
      if (context.depth === 1) {
        return createExitMapAction(exit.world);
      }
      return createExitMapAction({ x: 0, y: -5 });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

function getDepthLayout(
  context: DepthContext,
  seed: string | number
): DepthLayout {
  const cacheKey = createDepthLayoutCacheKey(context, seed);
  const cached = depthLayoutCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const layout =
    context.type === 'cave'
      ? createCaveDepthLayout(context, seed)
      : createDefaultDepthLayout(context, seed);
  depthLayoutCache.set(cacheKey, layout);
  return layout;
}

function createDefaultDepthLayout(
  context: DepthContext,
  seed: string | number
): DepthLayout {
  const seedHash = resolveDepthSeed(seed);
  const size = DEFAULT_DEPTH_SIZE;
  const radius = Math.floor(size / 2);
  const stairsDown = { x: 0, y: -6 };
  const entranceExits = getDepthEntranceExits(context);
  const tiles = new Map<string, DepthTile>();

  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const chamber =
        Math.abs(x) <= 7 &&
        Math.abs(y) <= 7 &&
        (Math.abs(x) <= 1 || Math.abs(y) <= 1 || hash2D(seedHash, x, y) > 0.3);
      tiles.set(toTileKey(x, y), {
        kind: chamber ? 'floor' : 'wall',
      });
    }
  }

  tiles.set(toTileKey(0, 0), {
    kind: context.type === 'cave' ? 'cave' : 'dungeon',
    note: 'Press interact on the stairs to go deeper.',
  });
  tiles.set(toTileKey(stairsDown.x, stairsDown.y), {
    kind: 'stairsDown',
    note: 'The next level extends below.',
  });
  entranceExits.forEach((exit) => {
    tiles.set(toTileKey(exit.local.x, exit.local.y), {
      kind: 'stairsUp',
      note:
        typeof exit.label === 'string' && exit.label.length > 0
          ? `Press X to leave through ${exit.label}.`
          : 'Press X to leave.',
    });
  });

  return {
    size,
    radius,
    stairsDown,
    tiles,
  };
}

function getLayoutTile(
  layout: DepthLayout,
  x: number,
  y: number
): DepthTile {
  if (
    Math.abs(x) > layout.radius ||
    Math.abs(y) > layout.radius
  ) {
    return { kind: 'wall' };
  }
  return layout.tiles.get(toTileKey(x, y)) ?? { kind: 'wall' };
}

function resolveDepthContextId(context: DepthContext): string {
  if (context.type === 'cave' && typeof context.systemId === 'string') {
    return context.systemId;
  }
  return `${context.type}:${context.origin.x}:${context.origin.y}:${context.depth + 1}`;
}

function getDepthEntranceExits(context: DepthContext): DepthEntranceExit[] {
  const worldEntrances: NamedPoint[] =
    Array.isArray(context.entrances) && context.entrances.length > 0
      ? context.entrances
      : [{ ...context.origin }];
  const localExitPoints = [
    { x: 0, y: 6 },
    { x: -3, y: 5 },
    { x: 3, y: 5 },
    { x: -5, y: 3 },
    { x: 5, y: 3 },
  ];

  return worldEntrances.slice(0, localExitPoints.length).map((world, index) => ({
    world,
    local: localExitPoints[index] ?? localExitPoints[0],
    label:
      typeof world.name === 'string'
        ? world.name
        : undefined,
  }));
}

function createDepthLayoutCacheKey(
  context: DepthContext,
  seed: string | number
): string {
  const entrances =
    context.entrances?.map(({ x, y, name }) => `${x}:${y}:${name ?? ''}`).join('|') ??
    '';
  return [seed, context.type, context.id, context.depth, entrances].join('::');
}

function createCaveChamberSeeds(
  context: DepthContext,
  seedHash: number
): Array<{ center: Point; chamberRadius: number }> {
  const bias = typeof context.depth === 'number' ? context.depth : 1;
  const westSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_WEST_SEED);
  const westYSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_WEST_Y_SEED);
  const westRadiusSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_WEST_RADIUS_SEED);
  const eastSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_EAST_SEED);
  const eastYSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_EAST_Y_SEED);
  const eastRadiusSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_EAST_RADIUS_SEED);
  const northSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_NORTH_SEED);
  const northRadiusSeed = appendHashSeedLabel(seedHash, CAVE_CHAMBER_NORTH_RADIUS_SEED);
  return [
    {
      center: {
        x: -6 + Math.round((hash2DWithSeed(westSeed, bias, 0) - 0.5) * 4),
        y: -2 + Math.round((hash2DWithSeed(westYSeed, bias, 0) - 0.5) * 5),
      },
      chamberRadius: 3 + Math.floor(hash2DWithSeed(westRadiusSeed, bias, 0) * 2),
    },
    {
      center: {
        x: 6 + Math.round((hash2DWithSeed(eastSeed, bias, 0) - 0.5) * 4),
        y: -1 + Math.round((hash2DWithSeed(eastYSeed, bias, 0) - 0.5) * 5),
      },
      chamberRadius: 3 + Math.floor(hash2DWithSeed(eastRadiusSeed, bias, 0) * 2),
    },
    {
      center: {
        x: 0,
        y: -6 + Math.round((hash2DWithSeed(northSeed, bias, 0) - 0.5) * 4),
      },
      chamberRadius: 3 + Math.floor(hash2DWithSeed(northRadiusSeed, bias, 0) * 2),
    },
    {
      center: {
        x: 0,
        y: 2,
      },
      chamberRadius: 3,
    },
  ];
}

function addPoolAndBridge(
  tiles: Map<string, DepthTile>,
  radius: number,
  context: DepthContext,
  seedHash: number,
  protectedTiles: Set<string>
): 'horizontal' | 'vertical' {
  const bridgeAxisSeed = appendHashSeedLabel(seedHash, CAVE_BRIDGE_AXIS_SEED);
  const poolXSeed = appendHashSeedLabel(seedHash, CAVE_POOL_X_SEED);
  const poolYSeed = appendHashSeedLabel(seedHash, CAVE_POOL_Y_SEED);
  const bridgeAxis =
    hash2DWithSeed(bridgeAxisSeed, context.depth ?? 1, 0) > 0.5
      ? 'horizontal'
      : 'vertical';
  const poolCenter = {
    x:
      bridgeAxis === 'horizontal'
        ? 0
        : -1 + Math.round((hash2DWithSeed(poolXSeed, context.depth ?? 1, 0) - 0.5) * 2),
    y:
      bridgeAxis === 'horizontal'
        ? -2 + Math.round((hash2DWithSeed(poolYSeed, context.depth ?? 1, 0) - 0.5) * 2)
        : -1,
  };
  carveBrush(tiles, radius, poolCenter.x, poolCenter.y, 4, { kind: 'cave-floor' });

  if (bridgeAxis === 'horizontal') {
    for (let x = -5; x <= 5; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        const worldY = poolCenter.y + y;
        if (Math.abs(x) <= 1) {
          setTile(tiles, poolCenter.x + x, worldY, {
            kind: 'bridge',
            note: 'A rope bridge sways over the underground pool.',
          });
          markProtected(protectedTiles, { x: poolCenter.x + x, y: worldY });
          continue;
        }
        if (Math.abs(worldY - poolCenter.y) <= 1) {
          setTile(tiles, poolCenter.x + x, worldY, {
            kind: 'river',
            note: 'Still water fills the cavern floor.',
          });
        }
      }
    }
  } else {
    for (let y = -5; y <= 5; y += 1) {
      for (let x = -1; x <= 1; x += 1) {
        const worldX = poolCenter.x + x;
        if (Math.abs(y) <= 1) {
          setTile(tiles, worldX, poolCenter.y + y, {
            kind: 'bridge',
            note: 'A rope bridge sways over the underground pool.',
          });
          markProtected(protectedTiles, { x: worldX, y: poolCenter.y + y });
          continue;
        }
        if (Math.abs(worldX - poolCenter.x) <= 1) {
          setTile(tiles, worldX, poolCenter.y + y, {
            kind: 'river',
            note: 'Still water fills the cavern floor.',
          });
        }
      }
    }
  }

  return bridgeAxis;
}

function decorateCaveFeatures(
  tiles: Map<string, DepthTile>,
  radius: number,
  context: DepthContext,
  seedHash: number,
  protectedTiles: Set<string>,
  bridgeAxis: 'horizontal' | 'vertical'
): void {
  const mushroomCandidates: Point[] = [];
  const dripstoneCandidates: Point[] = [];
  const obstacleCandidates: Point[] = [];

  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const tile = tiles.get(toTileKey(x, y));
      if (!tile || tile.kind !== 'cave-floor') {
        continue;
      }
      const key = toTileKey(x, y);
      if (protectedTiles.has(key)) {
        continue;
      }
      const adjacentWalls = countAdjacentKinds(tiles, x, y, new Set(['cave-wall']));
      const adjacentWater = countAdjacentKinds(tiles, x, y, new Set(['river']));
      if (adjacentWater > 0 || adjacentWalls >= 2) {
        mushroomCandidates.push({ x, y });
      }
      if (adjacentWalls >= 3) {
        dripstoneCandidates.push({ x, y });
      }
      if (
        adjacentWalls >= 1 &&
        Math.abs(x) + Math.abs(y) > 3 &&
        (bridgeAxis === 'horizontal' ? Math.abs(y) > 1 : Math.abs(x) > 1)
      ) {
        obstacleCandidates.push({ x, y });
      }
    }
  }

  placeFeatureTiles(
    tiles,
    seedHash,
    context.depth ?? 1,
    mushroomCandidates,
    Math.min(5, Math.max(2, Math.floor(mushroomCandidates.length / 10))),
    'cave-mushrooms',
    'Clusters of glowing mushrooms brighten the damp stone.'
  );
  placeFeatureTiles(
    tiles,
    seedHash,
    (context.depth ?? 1) + 17,
    dripstoneCandidates,
    Math.min(5, Math.max(2, Math.floor(dripstoneCandidates.length / 12))),
    'cave-dripstone',
    'Dripstone spires rise from the floor beneath hanging stalactites.'
  );
  placeFeatureTiles(
    tiles,
    seedHash,
    (context.depth ?? 1) + 29,
    obstacleCandidates,
    Math.min(4, Math.max(1, Math.floor(obstacleCandidates.length / 14))),
    'cave-obstacle',
    'A tumbled barricade of rock blocks the narrow passage.'
  );
}

function placeFeatureTiles(
  tiles: Map<string, DepthTile>,
  seedHash: number,
  salt: number,
  candidates: Point[],
  count: number,
  kind: CaveFeatureTileKind,
  note: string
): void {
  const featureKindSeed = CAVE_FEATURE_KIND_SEEDS[kind];
  const rankingSeed = appendHashSeedLabel(
    appendHashSeedLabel(seedHash, featureKindSeed),
    createHashSeed(salt)
  );
  const fallbackCandidates =
    candidates.length >= count
      ? candidates
      : [
          ...candidates,
          ...listAvailableCaveFloorTiles(tiles).filter(
            ({ x, y }) =>
              !candidates.some((candidate) => candidate.x === x && candidate.y === y)
          ),
        ];
  const ranked = [...fallbackCandidates].sort(
    (left, right) =>
      hash2DWithSeed(rankingSeed, left.x, left.y) -
      hash2DWithSeed(rankingSeed, right.x, right.y)
  );
  for (let index = 0; index < Math.min(count, ranked.length); index += 1) {
    const candidate = ranked[index];
    setTile(tiles, candidate.x, candidate.y, { kind, note });
  }
}

function widenNearbyFloors(
  tiles: Map<string, DepthTile>,
  radius: number,
  seedHash: number,
  depth: number
): void {
  const widenSeed = appendHashSeedLabel(
    appendHashSeedLabel(seedHash, CAVE_WIDEN_SEED),
    createHashSeed(depth)
  );
  const additions: Point[] = [];
  for (let y = -radius + 1; y <= radius - 1; y += 1) {
    for (let x = -radius + 1; x <= radius - 1; x += 1) {
      const key = toTileKey(x, y);
      if ((tiles.get(key)?.kind ?? 'cave-wall') !== 'cave-wall') {
        continue;
      }
      const floorNeighbors = countAdjacentKinds(tiles, x, y, new Set(['cave-floor']));
      if (
        floorNeighbors >= 4 ||
        (floorNeighbors >= 3 && hash2DWithSeed(widenSeed, x, y) > 0.72)
      ) {
        additions.push({ x, y });
      }
    }
  }
  additions.forEach(({ x, y }) => {
    setTile(tiles, x, y, { kind: 'cave-floor' });
  });
}

function listAvailableCaveFloorTiles(tiles: Map<string, DepthTile>): Point[] {
  const candidates: Point[] = [];
  tiles.forEach((tile, key) => {
    if (tile.kind !== 'cave-floor') {
      return;
    }
    const [xText, yText] = key.split(':');
    candidates.push({ x: Number(xText), y: Number(yText) });
  });
  return candidates;
}

function carvePath(
  tiles: Map<string, DepthTile>,
  radius: number,
  start: Point,
  end: Point,
  thickness: number,
  tile: DepthTile
): void {
  const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y), 1) * 2;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(start.x + (end.x - start.x) * t);
    const y = Math.round(start.y + (end.y - start.y) * t);
    carveBrush(tiles, radius, x, y, thickness, tile);
  }
}

function resolveDepthSeed(seed: string | number): number {
  return typeof seed === 'number' ? createHashSeed(seed) : registerHashLabel(seed);
}

function carveBrush(
  tiles: Map<string, DepthTile>,
  radius: number,
  centerX: number,
  centerY: number,
  brushRadius: number,
  tile: DepthTile
): void {
  for (let y = centerY - brushRadius; y <= centerY + brushRadius; y += 1) {
    for (let x = centerX - brushRadius; x <= centerX + brushRadius; x += 1) {
      if (Math.abs(x) > radius || Math.abs(y) > radius) {
        continue;
      }
      if (Math.hypot(x - centerX, y - centerY) <= brushRadius + 0.35) {
        setTile(tiles, x, y, tile);
      }
    }
  }
}

function fillRect(
  tiles: Map<string, DepthTile>,
  radius: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  tile: DepthTile
): void {
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const x = originX + column;
      const y = originY + row;
      if (Math.abs(x) > radius || Math.abs(y) > radius) {
        continue;
      }
      setTile(tiles, x, y, tile);
    }
  }
}

function countAdjacentKinds(
  tiles: Map<string, DepthTile>,
  x: number,
  y: number,
  kinds: ReadonlySet<string>
): number {
  let count = 0;
  [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ].forEach(([dx, dy]) => {
    const neighbor = tiles.get(toTileKey(x + dx, y + dy));
    if (neighbor && kinds.has(neighbor.kind)) {
      count += 1;
    }
  });
  return count;
}

function markProtected(protectedTiles: Set<string>, point: Point): void {
  protectedTiles.add(toTileKey(point.x, point.y));
}

function setTile(
  tiles: Map<string, DepthTile>,
  x: number,
  y: number,
  tile: DepthTile
): void {
  tiles.set(toTileKey(x, y), tile);
}

function toTileKey(x: number, y: number): string {
  return `${x}:${y}`;
}
