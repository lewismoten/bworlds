import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import type { MusicRegionThemeId } from './procedural-music-vocabulary.ts';

export type ProceduralThemeMotif = {
  sharedDegreeOffsets: readonly [number, number, number, number];
  adaptedDegreeOffsets: readonly number[];
  adaptationLabel: string;
  recognitionDegreeOffsets?: readonly number[];
  recognitionLabel?: string;
};

const MUSIC_THEME_MOTIF_SEED = registerHashLabel('music-theme-motif');
const SHARED_MOTIF_PATTERNS = [
  [0, 2, 1, 3],
  [0, 1, 3, 2],
  [0, 2, 4, 2],
  [0, 1, 2, 0],
  [0, 3, 2, 1],
] as const satisfies readonly (readonly [number, number, number, number])[];

export function resolveProceduralThemeMotif(options: {
  themeId: MusicRegionThemeId;
  contextType?: string;
  tileKind?: string;
  clusterX?: number;
  clusterY?: number;
}): ProceduralThemeMotif {
  const regionBucketX = Math.floor((options.clusterX ?? 0) / 48);
  const regionBucketY = Math.floor((options.clusterY ?? 0) / 48);
  const patternIndex = Math.floor(
    hash2DWithSeed(MUSIC_THEME_MOTIF_SEED, regionBucketX, regionBucketY) *
      SHARED_MOTIF_PATTERNS.length
  );
  const sharedDegreeOffsets =
    SHARED_MOTIF_PATTERNS[patternIndex] ?? SHARED_MOTIF_PATTERNS[0];
  const contextBand = resolveMotifContextBand(
    options.contextType,
    options.tileKind
  );

  return {
    sharedDegreeOffsets,
    adaptedDegreeOffsets: adaptMotifForContext(
      sharedDegreeOffsets,
      contextBand
    ),
    adaptationLabel: contextBand,
  };
}

function resolveMotifContextBand(
  contextType?: string,
  tileKind?: string
): 'overworld' | 'town' | 'interior' | 'ruins' | 'cave' {
  if (
    contextType === 'cave' ||
    contextType === 'dungeon' ||
    tileKind === 'cave' ||
    tileKind === 'dungeon'
  ) {
    return 'cave';
  }
  if (
    contextType === 'building' ||
    tileKind === 'floor' ||
    tileKind === 'shop' ||
    tileKind === 'stairsUp' ||
    tileKind === 'stairsDown'
  ) {
    return 'interior';
  }
  if (contextType === 'town' || tileKind === 'town') {
    return 'town';
  }
  if (
    tileKind === 'ruins' ||
    tileKind === 'quarry' ||
    tileKind === 'tower' ||
    tileKind === 'stronghold'
  ) {
    return 'ruins';
  }

  return 'overworld';
}

function adaptMotifForContext(
  sharedDegreeOffsets: readonly [number, number, number, number],
  contextBand: 'overworld' | 'town' | 'interior' | 'ruins' | 'cave'
): readonly number[] {
  switch (contextBand) {
    case 'town':
      return [
        sharedDegreeOffsets[0],
        sharedDegreeOffsets[0],
        sharedDegreeOffsets[1],
        sharedDegreeOffsets[2],
        sharedDegreeOffsets[2],
        sharedDegreeOffsets[3],
      ];
    case 'interior':
      return [
        sharedDegreeOffsets[0],
        sharedDegreeOffsets[1],
        sharedDegreeOffsets[1],
        sharedDegreeOffsets[2],
        sharedDegreeOffsets[3],
      ];
    case 'ruins':
      return [
        sharedDegreeOffsets[0],
        Math.max(-1, sharedDegreeOffsets[1] - 1),
        sharedDegreeOffsets[2],
        Math.max(-1, sharedDegreeOffsets[3] - 1),
      ];
    case 'cave':
      return [
        sharedDegreeOffsets[0],
        sharedDegreeOffsets[1],
        Math.max(-1, sharedDegreeOffsets[2] - 1),
        sharedDegreeOffsets[1],
        sharedDegreeOffsets[0],
      ];
    default:
      return [...sharedDegreeOffsets];
  }
}
