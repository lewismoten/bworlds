import { DEFAULT_CONSTELLATION_COUNT } from './time.ts';
import {
  appendHashSeedLabel,
  hash2DWithSeed,
  registerHashLabel,
  registerHashSeed,
} from '../hash.ts';

export const DEFAULT_CONSTELLATION_SEED = registerHashSeed('bworlds-celestial');

const CONSTELLATION_FIGURES = [
  'The Stag',
  'The Cedar',
  'The Giant',
  'The Heron',
  'The Lantern',
  'The Mariner',
  'The Orchard',
  'The Serpent',
  "Andre's Arm",
  "Mira's Crown",
  'The Open Hand',
  'The Wolf',
];

const CONSTELLATION_PREFIXES = [
  'Astral',
  'Aurora',
  'Celest',
  'Cinder',
  'Comet',
  'Crown',
  'Dawn',
  'Ember',
  'Ether',
  'Lumen',
  'Moon',
  'Nebula',
  'Nova',
  'Solstice',
  'Star',
  'Zephyr',
];
const CONSTELLATION_SUFFIXES = [
  'Arch',
  'Beacon',
  'Crown',
  'Drift',
  'Gate',
  'Halo',
  'Harp',
  'Lantern',
  'Mantle',
  'Omen',
  'Pillar',
  'Sail',
  'Spire',
  'Thread',
  'Veil',
  'Wake',
];

const CONSTELLATION_STARS_LABEL = registerHashLabel('stars');
const CONSTELLATION_RADIAL_LABEL = registerHashLabel('r');
const CONSTELLATION_THETA_LABEL = registerHashLabel('theta');
const CONSTELLATION_STRETCH_LABEL = registerHashLabel('stretch');
const CONSTELLATION_BRIGHTNESS_LABEL = registerHashLabel('b');
const CONSTELLATION_DAYLIGHT_BIAS_LABEL = registerHashLabel('bias');
const CONSTELLATION_SYMBOL_ROTATION_LABEL =
  registerHashLabel('symbol-rotation');
const CONSTELLATION_RING_JITTER_LABEL = registerHashLabel('ring-jitter');
const CONSTELLATION_ARCHETYPE_LABEL = registerHashLabel(
  'constellation-archetype'
);
const CONSTELLATION_ROTATION_LABEL = registerHashLabel(
  'constellation-rotation'
);
const CONSTELLATION_FORM_LABEL = registerHashLabel('constellation-form');
const CONSTELLATION_FIGURE_LABEL = registerHashLabel('constellation-figure');
const CONSTELLATION_PREFIX_LABEL = registerHashLabel('constellation-prefix');
const CONSTELLATION_SUFFIX_LABEL = registerHashLabel('constellation-suffix');

export interface ConstellationStarLike {
  id: string;
  x: number;
  y: number;
  brightness: number;
}

export interface ConstellationLike {
  id: string;
  name: string;
  stars: ConstellationStarLike[];
  connections: Array<[number, number]>;
  daylightBias: number;
  symbolRotation: number;
  ringJitter: number;
}
type ConstellationConnectionStyle = 'arc' | 'zigzag' | 'fork' | 'kite';
type ConstellationArchetypePoint = {
  angle: number;
  radial: number;
};
type ConstellationArchetype = {
  points: readonly ConstellationArchetypePoint[];
  verticalScale: number;
  connectionStyle: ConstellationConnectionStyle;
  rotation: number;
};
export function generateConstellations(
  seedHash: number,
  options: {
    count?: number;
  } = {}
): ConstellationLike[] {
  const count = Math.max(
    1,
    Math.floor(options.count ?? DEFAULT_CONSTELLATION_COUNT)
  );
  const starsSeed = appendHashSeedLabel(seedHash, CONSTELLATION_STARS_LABEL);
  const radialSeed = appendHashSeedLabel(seedHash, CONSTELLATION_RADIAL_LABEL);
  const thetaSeed = appendHashSeedLabel(seedHash, CONSTELLATION_THETA_LABEL);
  const stretchSeed = appendHashSeedLabel(
    seedHash,
    CONSTELLATION_STRETCH_LABEL
  );
  const brightnessSeed = appendHashSeedLabel(
    seedHash,
    CONSTELLATION_BRIGHTNESS_LABEL
  );
  const daylightBiasSeed = appendHashSeedLabel(
    seedHash,
    CONSTELLATION_DAYLIGHT_BIAS_LABEL
  );
  const symbolRotationSeed = appendHashSeedLabel(
    seedHash,
    CONSTELLATION_SYMBOL_ROTATION_LABEL
  );
  const ringJitterSeed = appendHashSeedLabel(
    seedHash,
    CONSTELLATION_RING_JITTER_LABEL
  );
  const usedNames = new Set<string>();
  const prefixCounts = new Map<string, number>();
  const suffixCounts = new Map<string, number>();
  const figureCounts = new Map<string, number>();

  return Array.from({ length: count }, (_, index) => {
    const starCount =
      5 + Math.floor(hash2DWithSeed(starsSeed, index, count) * 4);
    const archetype = getConstellationArchetype(seedHash, index);
    const stars = Array.from({ length: starCount }, (_, starIndex) => {
      const blueprint = archetype.points[starIndex % archetype.points.length];
      const radial =
        blueprint.radial *
        (0.82 + hash2DWithSeed(radialSeed, index, starIndex) * 0.36);
      const angle =
        blueprint.angle +
        hash2DWithSeed(thetaSeed, index, starIndex) * 0.72 +
        archetype.rotation;
      return {
        id: `${index}:${starIndex}`,
        x: 0.5 + Math.cos(angle) * radial,
        y:
          0.5 +
          Math.sin(angle) *
            radial *
            archetype.verticalScale *
            (0.8 + hash2DWithSeed(stretchSeed, index, starIndex) * 0.46),
        brightness:
          0.45 + hash2DWithSeed(brightnessSeed, index, starIndex) * 0.55,
      };
    }).sort((left, right) => left.x - right.x);

    const connections = buildConstellationConnections(
      stars.length,
      archetype.connectionStyle
    );

    let name = createConstellationName(
      seedHash,
      index,
      prefixCounts,
      suffixCounts,
      figureCounts
    );
    while (usedNames.has(name)) {
      name = `${name} ${index + 1}`;
    }
    usedNames.add(name);

    return {
      id: `constellation-${index + 1}`,
      name,
      stars,
      connections,
      daylightBias:
        -0.12 + hash2DWithSeed(daylightBiasSeed, index, count) * 0.24,
      symbolRotation:
        hash2DWithSeed(symbolRotationSeed, index, count) * Math.PI * 2,
      ringJitter: (hash2DWithSeed(ringJitterSeed, index, count) * 2 - 1) * 0.28,
    };
  });
}

function getConstellationArchetype(
  seedHash: number,
  index: number
): ConstellationArchetype {
  const baseArchetypes = [
    {
      points: [
        { angle: -1.4, radial: 0.3 },
        { angle: -0.7, radial: 0.16 },
        { angle: -0.2, radial: 0.24 },
        { angle: 0.35, radial: 0.15 },
        { angle: 1.1, radial: 0.3 },
      ],
      verticalScale: 1.05,
      connectionStyle: 'arc',
    },
    {
      points: [
        { angle: -1.5, radial: 0.26 },
        { angle: -0.9, radial: 0.12 },
        { angle: -0.15, radial: 0.28 },
        { angle: 0.6, radial: 0.14 },
        { angle: 1.35, radial: 0.27 },
      ],
      verticalScale: 0.68,
      connectionStyle: 'zigzag',
    },
    {
      points: [
        { angle: -1.35, radial: 0.18 },
        { angle: -0.8, radial: 0.28 },
        { angle: -0.15, radial: 0.1 },
        { angle: 0.55, radial: 0.27 },
        { angle: 1.25, radial: 0.18 },
      ],
      verticalScale: 1.22,
      connectionStyle: 'fork',
    },
    {
      points: [
        { angle: -1.2, radial: 0.22 },
        { angle: -0.55, radial: 0.3 },
        { angle: 0.1, radial: 0.18 },
        { angle: 0.72, radial: 0.31 },
        { angle: 1.4, radial: 0.2 },
      ],
      verticalScale: 0.92,
      connectionStyle: 'kite',
    },
  ] as const;
  const archetypeSeed = appendHashSeedLabel(
    seedHash,
    CONSTELLATION_ARCHETYPE_LABEL
  );
  const rotationSeed = appendHashSeedLabel(
    seedHash,
    CONSTELLATION_ROTATION_LABEL
  );

  const base =
    baseArchetypes[
      Math.floor(
        hash2DWithSeed(archetypeSeed, index, 0) * baseArchetypes.length
      )
    ];
  return {
    ...base,
    rotation: hash2DWithSeed(rotationSeed, index, 1) * Math.PI * 2,
  };
}

function buildConstellationConnections(
  starCount: number,
  style: ConstellationConnectionStyle
): [number, number][] {
  const chain = Array.from(
    { length: Math.max(0, starCount - 1) },
    (_, starIndex) => [starIndex, starIndex + 1] as [number, number]
  );
  if (starCount < 4) {
    return chain;
  }

  if (style === 'arc') {
    return [...chain, [0, Math.floor(starCount / 2)] as [number, number]];
  }
  if (style === 'zigzag') {
    return [...chain, [1, starCount - 1] as [number, number]];
  }
  if (style === 'fork') {
    return [
      ...chain,
      [0, Math.floor(starCount / 2)] as [number, number],
      [2, starCount - 1] as [number, number],
    ];
  }
  return [
    ...chain,
    [0, starCount - 2] as [number, number],
    [1, starCount - 1] as [number, number],
  ];
}

function pickLimitedNamePart(
  parts: readonly string[],
  counts: Map<string, number>,
  maxCount: number,
  seedValue: number
) {
  const startIndex = Math.floor(seedValue * parts.length) % parts.length;
  for (let offset = 0; offset < parts.length; offset += 1) {
    const candidate = parts[(startIndex + offset) % parts.length];
    const currentCount = counts.get(candidate) ?? 0;
    if (currentCount < maxCount) {
      counts.set(candidate, currentCount + 1);
      return candidate;
    }
  }

  const fallback = parts[startIndex];
  counts.set(fallback, (counts.get(fallback) ?? 0) + 1);
  return fallback;
}

export function createConstellationName(
  seedHash: number,
  index: number,
  prefixCounts = new Map<string, number>(),
  suffixCounts = new Map<string, number>(),
  figureCounts = new Map<string, number>()
) {
  const formSeed = appendHashSeedLabel(seedHash, CONSTELLATION_FORM_LABEL);
  const figureSeed = appendHashSeedLabel(seedHash, CONSTELLATION_FIGURE_LABEL);
  const prefixSeed = appendHashSeedLabel(seedHash, CONSTELLATION_PREFIX_LABEL);
  const suffixSeed = appendHashSeedLabel(seedHash, CONSTELLATION_SUFFIX_LABEL);
  const useFigure = hash2DWithSeed(formSeed, index, 0) < 0.28;
  if (useFigure) {
    const figure = pickLimitedNamePart(
      CONSTELLATION_FIGURES,
      figureCounts,
      2,
      hash2DWithSeed(figureSeed, index, 0)
    );
    return figure;
  }

  const prefix = pickLimitedNamePart(
    CONSTELLATION_PREFIXES,
    prefixCounts,
    2,
    hash2DWithSeed(prefixSeed, index, 0)
  );
  const suffix = pickLimitedNamePart(
    CONSTELLATION_SUFFIXES,
    suffixCounts,
    2,
    hash2DWithSeed(suffixSeed, 0, index)
  );
  return `${prefix} ${suffix}`;
}
