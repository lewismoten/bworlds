import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import { getProceduralScaleDegreeSemitones } from './procedural-music-scale.ts';

const MUSIC_PROGRESSION_SEED = registerHashLabel('music-progression');

export type ProceduralChordProgressionProfile = {
  id:
    | 'tonic-dominant-submediant-tonic'
    | 'tonic-subdominant-dominant-tonic'
    | 'tonic-submediant-dominant-tonic'
    | 'tonic-dominant-subdominant-tonic';
  label: '1-5-6-1' | '1-4-5-1' | '1-6-5-1' | '1-5-4-1';
  degrees: readonly number[];
};

export const PROCEDURAL_CHORD_PROGRESSION_PROFILES = [
  {
    id: 'tonic-dominant-submediant-tonic',
    label: '1-5-6-1',
    degrees: [0, 4, 5, 0],
  },
  {
    id: 'tonic-subdominant-dominant-tonic',
    label: '1-4-5-1',
    degrees: [0, 3, 4, 0],
  },
  {
    id: 'tonic-submediant-dominant-tonic',
    label: '1-6-5-1',
    degrees: [0, 5, 4, 0],
  },
  {
    id: 'tonic-dominant-subdominant-tonic',
    label: '1-5-4-1',
    degrees: [0, 4, 3, 0],
  },
] as const satisfies readonly ProceduralChordProgressionProfile[];

const THEME_PROGRESSIONS: Record<string, readonly string[]> = {
  'frontier-plains': ['tonic-dominant-submediant-tonic'],
  'deep-forest': [
    'tonic-subdominant-dominant-tonic',
    'tonic-dominant-submediant-tonic',
    'tonic-submediant-dominant-tonic',
  ],
  'coastal-shore': [
    'tonic-subdominant-dominant-tonic',
    'tonic-dominant-subdominant-tonic',
    'tonic-dominant-submediant-tonic',
  ],
  'town-square': [
    'tonic-dominant-submediant-tonic',
    'tonic-subdominant-dominant-tonic',
    'tonic-dominant-subdominant-tonic',
  ],
  'ridge-pass': [
    'tonic-dominant-subdominant-tonic',
    'tonic-subdominant-dominant-tonic',
    'tonic-dominant-submediant-tonic',
  ],
  'cavern-echo': [
    'tonic-submediant-dominant-tonic',
    'tonic-dominant-subdominant-tonic',
    'tonic-subdominant-dominant-tonic',
  ],
  'interior-hall': [
    'tonic-dominant-submediant-tonic',
    'tonic-submediant-dominant-tonic',
    'tonic-subdominant-dominant-tonic',
  ],
};

export function resolveProceduralChordProgressionProfile(options: {
  themeId: string;
  clusterX: number;
  clusterY: number;
}): ProceduralChordProgressionProfile {
  const profileIds =
    THEME_PROGRESSIONS[options.themeId] ??
    PROCEDURAL_CHORD_PROGRESSION_PROFILES.map((profile) => profile.id);
  const profileIndex = Math.floor(
    hash2DWithSeed(
      MUSIC_PROGRESSION_SEED,
      options.clusterX + options.themeId.length * 17,
      options.clusterY - options.themeId.length * 13
    ) * profileIds.length
  );
  const selectedProfileId = profileIds[profileIndex] ?? profileIds[0];
  return (
    PROCEDURAL_CHORD_PROGRESSION_PROFILES.find(
      (profile) => profile.id === selectedProfileId
    ) ?? PROCEDURAL_CHORD_PROGRESSION_PROFILES[0]
  );
}

export function resolveProceduralChordProgression(options: {
  themeId: string;
  clusterX: number;
  clusterY: number;
}): readonly number[] {
  return resolveProceduralChordProgressionProfile(options).degrees;
}

export function describeProceduralChordQuality(
  scale: readonly number[],
  degreeIndex: number
): 'major' | 'minor' | 'diminished' | 'augmented' | 'modal' {
  const root = getProceduralScaleDegreeSemitones(scale, degreeIndex);
  const third = getProceduralScaleDegreeSemitones(scale, degreeIndex + 2);
  const fifth = getProceduralScaleDegreeSemitones(scale, degreeIndex + 4);
  const thirdInterval = normalizePitchClass(third - root);
  const fifthInterval = normalizePitchClass(fifth - root);

  if (thirdInterval === 4 && fifthInterval === 7) {
    return 'major';
  }
  if (thirdInterval === 3 && fifthInterval === 7) {
    return 'minor';
  }
  if (thirdInterval === 3 && fifthInterval === 6) {
    return 'diminished';
  }
  if (thirdInterval === 4 && fifthInterval === 8) {
    return 'augmented';
  }
  return 'modal';
}

export function describeProceduralChordProgression(
  scale: readonly number[],
  degrees: readonly number[]
): string[] {
  return degrees.map((degreeIndex) => {
    const degreeLabel = degreeIndex + 1;
    const quality = describeProceduralChordQuality(scale, degreeIndex);
    return `${degreeLabel} ${quality}`;
  });
}

function normalizePitchClass(semitones: number): number {
  return ((Math.round(semitones) % 12) + 12) % 12;
}
