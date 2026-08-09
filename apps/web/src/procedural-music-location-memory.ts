import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';

export type ProceduralMusicLocationMemory = {
  locationIdentityId: string;
  locationBand: 'overworld' | 'settlement' | 'depth' | 'landmark';
  recognitionLabel: string;
  recognitionDegreeOffsets: readonly number[];
};

const LOCATION_MEMORY_SEED = registerHashLabel('music-location-memory');
const LOCATION_RECOGNITION_PATTERNS = [
  [0, 2, 1, 3],
  [0, 1, 3, 2],
  [0, 2, 4, 2],
  [0, 3, 1, 2],
  [0, 1, 0, 2, 3],
  [0, 2, 3, 1, 2, 0],
] as const;

export function resolveProceduralMusicLocationMemory(options: {
  tileKind?: string;
  contextType?: string;
  clusterX?: number;
  clusterY?: number;
}): ProceduralMusicLocationMemory {
  const clusterX = options.clusterX ?? 0;
  const clusterY = options.clusterY ?? 0;
  const locationBand = resolveLocationBand(
    options.contextType,
    options.tileKind
  );
  const patternIndex = Math.floor(
    hash2DWithSeed(
      LOCATION_MEMORY_SEED,
      clusterX + locationBand.length * 19,
      clusterY - locationBand.length * 13
    ) * LOCATION_RECOGNITION_PATTERNS.length
  );
  const basePattern =
    LOCATION_RECOGNITION_PATTERNS[patternIndex] ??
    LOCATION_RECOGNITION_PATTERNS[0];
  const recognitionDegreeOffsets = adaptLocationPattern(
    basePattern,
    locationBand
  );

  return {
    locationIdentityId: `${locationBand}:${clusterX}:${clusterY}`,
    locationBand,
    recognitionLabel: resolveLocationRecognitionLabel(
      locationBand,
      patternIndex
    ),
    recognitionDegreeOffsets,
  };
}

function resolveLocationBand(
  contextType?: string,
  tileKind?: string
): ProceduralMusicLocationMemory['locationBand'] {
  if (
    contextType === 'town' ||
    contextType === 'building' ||
    tileKind === 'town' ||
    tileKind === 'floor' ||
    tileKind === 'shop'
  ) {
    return 'settlement';
  }
  if (
    contextType === 'cave' ||
    contextType === 'dungeon' ||
    tileKind === 'cave' ||
    tileKind === 'dungeon'
  ) {
    return 'depth';
  }
  if (
    tileKind === 'ruins' ||
    tileKind === 'tower' ||
    tileKind === 'stronghold' ||
    tileKind === 'observatory' ||
    tileKind === 'lighthouse' ||
    tileKind === 'quarry'
  ) {
    return 'landmark';
  }
  return 'overworld';
}

function adaptLocationPattern(
  pattern: readonly number[],
  locationBand: ProceduralMusicLocationMemory['locationBand']
): readonly number[] {
  switch (locationBand) {
    case 'settlement':
      return [
        pattern[0] ?? 0,
        pattern[1] ?? 0,
        pattern[2] ?? 0,
        pattern[1] ?? 0,
        pattern[3] ?? 0,
      ];
    case 'depth':
      return [
        pattern[0] ?? 0,
        pattern[1] ?? 0,
        Math.max(-1, (pattern[2] ?? 0) - 1),
        pattern[1] ?? 0,
        pattern[0] ?? 0,
      ];
    case 'landmark':
      return [
        pattern[0] ?? 0,
        pattern[1] ?? 0,
        pattern[2] ?? 0,
        pattern[3] ?? 0,
        Math.max(0, (pattern[2] ?? 0) + 1),
      ];
    default:
      return [...pattern];
  }
}

function resolveLocationRecognitionLabel(
  locationBand: ProceduralMusicLocationMemory['locationBand'],
  patternIndex: number
): string {
  const tag = patternIndex + 1;
  switch (locationBand) {
    case 'settlement':
      return `settlement refrain ${tag}`;
    case 'depth':
      return `depth echo ${tag}`;
    case 'landmark':
      return `landmark call ${tag}`;
    default:
      return `trail memory ${tag}`;
  }
}
