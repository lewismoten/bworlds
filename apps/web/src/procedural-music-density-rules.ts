import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export type ProceduralMusicRole = ProceduralMusicNote['role'];

export function resolveProceduralSongDensityMeasureTargets(
  sectionId: ProceduralMusicSongSection['id'],
  role: ProceduralMusicRole,
  measureCount: number
): readonly number[] | null {
  const sectionTargets = SECTION_MEASURE_DENSITY_TARGETS[sectionId];
  const pattern = sectionTargets?.[role];
  if (!pattern || pattern.length === 0) {
    return null;
  }
  if (pattern.length === measureCount) {
    return pattern;
  }

  const expanded: number[] = [];
  for (let index = 0; index < measureCount; index += 1) {
    expanded.push(pattern[index % pattern.length] ?? pattern.at(-1) ?? 0);
  }
  return expanded;
}

const SECTION_MEASURE_DENSITY_TARGETS: Partial<
  Record<
    ProceduralMusicSongSection['id'],
    Partial<Record<ProceduralMusicRole, readonly number[]>>
  >
> = {
  intro: {
    harmony: [3, 3, 2, 2, 3, 3, 2, 2],
    lead: [1, 2, 2, 2, 3, 3, 3, 2],
    percussion: [0, 0, 0, 0, 0, 0, 0, 0],
  },
  a: {
    harmony: [3, 2, 3, 0, 3, 2, 3, 0],
    percussion: [2, 2, 2, 1, 2, 2, 2, 1],
  },
  'a-prime': {
    harmony: [3, 2, 3, 0, 3, 2, 3, 0],
    percussion: [2, 2, 2, 1, 2, 2, 2, 1],
  },
  b: {
    harmony: [2, 1, 2, 0, 2, 1, 2, 0],
    percussion: [2, 1, 2, 1, 2, 1, 2, 1],
  },
  variation: {
    harmony: [2, 1, 2, 0, 2, 1, 3, 1],
    lead: [2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 3, 3, 3, 2, 2],
    percussion: [1, 0, 2, 1, 1, 0, 2, 1],
  },
  return: {
    harmony: [3, 2, 3, 1, 3, 2, 3, 1],
    percussion: [2, 2, 2, 1, 2, 2, 2, 1],
  },
  outro: {
    harmony: [3, 2, 2, 2, 2, 1, 1, 1],
    lead: [3, 3, 2, 2, 2, 2, 1, 1],
    percussion: [0, 0, 0, 0, 0, 0, 0, 0],
  },
};
