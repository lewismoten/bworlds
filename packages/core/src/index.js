export const CHUNK_SIZE = 32;
export const EARTH_CIRCUMFERENCE_METERS = 40075017;
export const TILE_METERS = 250;
export const WORLD_TILES_WIDE = Math.floor(
  EARTH_CIRCUMFERENCE_METERS / TILE_METERS
);
export const HALF_WORLD_TILES = WORLD_TILES_WIDE / 2;

export function fract(value) {
  return value - Math.floor(value);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function hash2D(seed, x, y) {
  let hash = 2166136261;
  const input = `${seed}:${x}:${y}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function valueNoise2D(seed, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(0, 1, fract(x));
  const ty = smoothstep(0, 1, fract(y));
  const v00 = hash2D(seed, x0, y0);
  const v10 = hash2D(seed, x1, y0);
  const v01 = hash2D(seed, x0, y1);
  const v11 = hash2D(seed, x1, y1);
  const a = lerp(v00, v10, tx);
  const b = lerp(v01, v11, tx);
  return lerp(a, b, ty);
}

export function octaveNoise2D(seed, x, y, options = {}) {
  const octaves = options.octaves ?? 4;
  const persistence = options.persistence ?? 0.5;
  const lacunarity = options.lacunarity ?? 2;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let normalizer = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(seed, x * frequency, y * frequency) * amplitude;
    normalizer += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / normalizer;
}

export function ridgedNoise2D(seed, x, y, options = {}) {
  return 1 - Math.abs(octaveNoise2D(seed, x, y, options) * 2 - 1);
}

export function wrapLongitude(longitude) {
  if (longitude > 180) return longitude - 360;
  if (longitude < -180) return longitude + 360;
  return longitude;
}

export function toGps(x, y) {
  const longitude = wrapLongitude((x / WORLD_TILES_WIDE) * 360);
  const latitude = clamp((-y / WORLD_TILES_WIDE) * 180, -90, 90);
  return {
    latitude: Object.is(latitude, -0) ? 0 : latitude,
    longitude: Object.is(longitude, -0) ? 0 : longitude,
  };
}

export function normalizeAngle(angle) {
  const tau = Math.PI * 2;
  let next = angle % tau;
  if (next < 0) next += tau;
  return next;
}

export function cardinalFromAngle(angle) {
  const normalized = normalizeAngle(angle);
  if (normalized < Math.PI * 0.25 || normalized >= Math.PI * 1.75) return 'E';
  if (normalized < Math.PI * 0.75) return 'S';
  if (normalized < Math.PI * 1.25) return 'W';
  return 'N';
}

export const TILE_DEFINITIONS = {
  ocean: {
    name: 'Ocean',
    color: '#2563eb',
    miniColor: '#4ea3ff',
    walkable: false,
    wallHeight: 0.1,
  },
  shore: {
    name: 'Shore',
    color: '#f4d58d',
    miniColor: '#f8e9b5',
    walkable: true,
    wallHeight: 0,
  },
  plains: {
    name: 'Plains',
    color: '#7fb069',
    miniColor: '#95c779',
    walkable: true,
    wallHeight: 0,
  },
  forest: {
    name: 'Forest',
    color: '#2f6f3e',
    miniColor: '#429154',
    walkable: true,
    wallHeight: 0.38,
  },
  mountain: {
    name: 'Mountain',
    color: '#6b7280',
    miniColor: '#94a3b8',
    walkable: false,
    wallHeight: 0.95,
  },
  river: {
    name: 'River',
    color: '#38bdf8',
    miniColor: '#7dd3fc',
    walkable: false,
    wallHeight: 0.05,
  },
  road: {
    name: 'Road',
    color: '#a16207',
    miniColor: '#ca8a04',
    walkable: true,
    wallHeight: 0,
  },
  bridge: {
    name: 'Bridge',
    color: '#92400e',
    miniColor: '#b45309',
    walkable: true,
    wallHeight: 0.1,
  },
  sign: {
    name: 'Sign Post',
    color: '#d97706',
    miniColor: '#f59e0b',
    walkable: true,
    wallHeight: 0.3,
  },
  town: {
    name: 'Town',
    color: '#e879f9',
    miniColor: '#f0abfc',
    walkable: true,
    wallHeight: 0.5,
  },
  dungeon: {
    name: 'Dungeon',
    color: '#991b1b',
    miniColor: '#ef4444',
    walkable: true,
    wallHeight: 0.65,
  },
  cave: {
    name: 'Cave',
    color: '#52525b',
    miniColor: '#71717a',
    walkable: true,
    wallHeight: 0.55,
  },
  wall: {
    name: 'Wall',
    color: '#334155',
    miniColor: '#64748b',
    walkable: false,
    wallHeight: 1,
  },
  floor: {
    name: 'Floor',
    color: '#94a3b8',
    miniColor: '#cbd5e1',
    walkable: true,
    wallHeight: 0,
  },
  door: {
    name: 'Door',
    color: '#f97316',
    miniColor: '#fb923c',
    walkable: true,
    wallHeight: 0.1,
  },
  stairsDown: {
    name: 'Stairs Down',
    color: '#0f766e',
    miniColor: '#14b8a6',
    walkable: true,
    wallHeight: 0.1,
  },
  stairsUp: {
    name: 'Stairs Up',
    color: '#0891b2',
    miniColor: '#06b6d4',
    walkable: true,
    wallHeight: 0.1,
  },
  shop: {
    name: 'Shop',
    color: '#fb7185',
    miniColor: '#fda4af',
    walkable: true,
    wallHeight: 0.4,
  },
};

export function getTileDefinition(kind) {
  return TILE_DEFINITIONS[kind] ?? TILE_DEFINITIONS.plains;
}

export function createPlayer(overrides = {}) {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    facing: overrides.facing ?? 0,
  };
}

export function createWorldState({ generator, player }) {
  const stack = [
    {
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
      origin: { x: 0, y: 0 },
    },
  ];

  const state = {
    generator,
    player,
    stack,
    viewMode: '2d',
    getCurrentContext() {
      return this.stack[this.stack.length - 1];
    },
    getCurrentMap() {
      return this.generator.getMap(this.getCurrentContext(), this.player);
    },
    getCurrentTile(x = this.player.x, y = this.player.y) {
      return this.getCurrentMap().getTile(x, y);
    },
    canWalk(x, y) {
      return getTileDefinition(this.getCurrentTile(x, y).kind).walkable;
    },
    interact() {
      const map = this.getCurrentMap();
      const action = map.getAction(this.player.x, this.player.y);
      if (!action) return false;
      const nextContext = {
        ...action.context,
        returnTo: action.returnTo ?? {
          x: this.player.x,
          y: this.player.y,
          facing: this.player.facing,
        },
      };
      if (action.type === 'enter') {
        this.stack.push(nextContext);
        this.player.x = action.spawn.x;
        this.player.y = action.spawn.y;
        if (typeof action.facing === 'number') {
          this.player.facing = action.facing;
        }
        return true;
      }
      if (action.type === 'deepen') {
        this.stack.push(nextContext);
        this.player.x = action.spawn.x;
        this.player.y = action.spawn.y;
        return true;
      }
      return false;
    },
    tryExit() {
      const map = this.getCurrentMap();
      const action = map.getExit(this.player.x, this.player.y);
      if (!action) return false;
      const currentContext = this.getCurrentContext();
      this.stack.pop();
      const spawn = action.spawn ?? currentContext.returnTo;
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      if (typeof action.facing === 'number') {
        this.player.facing = action.facing;
      } else if (typeof spawn.facing === 'number') {
        this.player.facing = spawn.facing;
      }
      return true;
    },
  };

  return state;
}
