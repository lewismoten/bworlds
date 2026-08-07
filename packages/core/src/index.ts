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

export function octaveNoise2D(
  seed,
  x,
  y,
  options: {
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
  } = {}
) {
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

export function ridgedNoise2D(
  seed,
  x,
  y,
  options: {
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
  } = {}
) {
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

function pickFrom(list, seedValue) {
  return list[Math.floor(seedValue * list.length) % list.length];
}

export function getRegionalPoiNameStyle(seed, x, y) {
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

export function generatePoiName(seed, type, x, y) {
  const style = getRegionalPoiNameStyle(seed, x, y);
  const stem = `${seed}:${type}:${x}:${y}`;
  const prefix = pickFrom(style.prefixes, hash2D(`${stem}:prefix`, x, y));
  const suffix = pickFrom(style.suffixes, hash2D(`${stem}:suffix`, y, x));

  if (type === 'town') {
    const forms = [
      `${prefix}${suffix}`,
      `${prefix} ${suffix}`,
      `${prefix}${pickFrom(
        ['haven', 'stead', 'wick', 'port'],
        hash2D(`${stem}:tail`, x + y, y)
      )}`,
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

  if (type === 'ruins') {
    const nouns = ['Ruins', 'Forum', 'Temple', 'Sanctum', 'Court', 'Stones'];
    return `${prefix} ${pickFrom(nouns, hash2D(`${stem}:noun`, x, y))}`;
  }

  return `${prefix}${suffix}`;
}

export const DEFAULT_TILE_DEFINITION = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};

export function getTileDefinition(kind) {
  return {
    ...DEFAULT_TILE_DEFINITION,
    name: kind
      ? `${String(kind).slice(0, 1).toUpperCase()}${String(kind).slice(1)}`
      : DEFAULT_TILE_DEFINITION.name,
  };
}

export function createPlayer(
  overrides: {
    x?: number;
    y?: number;
    facing?: number;
  } = {}
) {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    facing: overrides.facing ?? 0,
  };
}

export function snapWorldCoordinate(value) {
  return Math.round(value);
}

export function createWorldState({
  generator,
  player,
  resolveTileDefinition,
}: {
  generator: {
    getMap(context: unknown, player?: unknown): {
      getTile(x: number, y: number): { kind: string };
      getAction?(x: number, y: number): any;
      getExit?(x?: number, y?: number): any;
    };
  };
  player: {
    x: number;
    y: number;
    facing: number;
  };
  resolveTileDefinition?: (kind: string) => any;
}) {
  const getResolvedTileDefinition =
    resolveTileDefinition ?? ((kind) => getTileDefinition(kind));
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
      return this.getCurrentMap().getTile(
        snapWorldCoordinate(x),
        snapWorldCoordinate(y)
      );
    },
    getTileDefinition(kind) {
      return getResolvedTileDefinition(kind);
    },
    canWalk(x, y) {
      const probes = [
        [x, y],
        [x + 0.3, y],
        [x - 0.3, y],
        [x, y + 0.3],
        [x, y - 0.3],
      ];

      return probes.every(
        ([probeX, probeY]) =>
          this.getTileDefinition(this.getCurrentTile(probeX, probeY).kind)
            .walkable
      );
    },
    interact() {
      const map = this.getCurrentMap();
      const action = map.getAction(
        snapWorldCoordinate(this.player.x),
        snapWorldCoordinate(this.player.y)
      );
      if (!action) return false;
      const nextContext = {
        ...action.context,
        returnTo: action.returnTo ?? {
          x: snapWorldCoordinate(this.player.x),
          y: snapWorldCoordinate(this.player.y),
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
      const action = map.getExit(
        snapWorldCoordinate(this.player.x),
        snapWorldCoordinate(this.player.y)
      );
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
