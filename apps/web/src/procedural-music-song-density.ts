import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

type MeasureRoleDensityTarget = {
  maxNoteCount?: number;
};

export function applyProceduralSongDensityPlan(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  songStartMs: number;
}): ProceduralMusicNote[] {
  const notes = options.notes.map((note) => ({ ...note }));

  for (
    let sectionIndex = 0;
    sectionIndex < options.sections.length;
    sectionIndex += 1
  ) {
    const section = options.sections[sectionIndex]!;
    applySectionDensityPlan(notes, {
      section,
      songStartMs: options.songStartMs,
    });
  }

  return notes
    .filter((note) => note.durationMs > 0)
    .sort((left, right) => {
      if (left.startMs !== right.startMs) {
        return left.startMs - right.startMs;
      }
      return left.durationMs - right.durationMs;
    });
}

function applySectionDensityPlan(
  notes: ProceduralMusicNote[],
  options: {
    section: ProceduralMusicSongSection;
    songStartMs: number;
  }
): void {
  const sectionStartMs = options.songStartMs + options.section.startOffsetMs;
  const measureCount = Math.max(1, options.section.measureCount);
  const measureDurationMs = options.section.durationMs / measureCount;

  for (let measureIndex = 0; measureIndex < measureCount; measureIndex += 1) {
    const measureStartMs = sectionStartMs + measureIndex * measureDurationMs;
    const measureEndMs = measureStartMs + measureDurationMs;
    const groupedIndexes = collectMeasureRoleIndexes(
      notes,
      measureStartMs,
      measureEndMs
    );
    const leadIndexes = groupedIndexes.lead;
    const accompanimentRestMeasure = leadIndexes.length === 0;

    for (const role of SONG_DENSITY_ROLES) {
      const target = resolveMeasureRoleDensityTarget(
        options.section,
        role,
        measureIndex
      );
      const roleIndexes = groupedIndexes[role];
      if (!target || target.maxNoteCount === undefined) {
        continue;
      }
      if (roleIndexes.length <= target.maxNoteCount) {
        continue;
      }
      if (accompanimentRestMeasure && (role === 'bass' || role === 'harmony')) {
        continue;
      }

      pruneMeasureRoleNotes(notes, roleIndexes, {
        maxNoteCount: target.maxNoteCount,
        protectFirstEntry: measureIndex === 0,
        protectPhraseBoundary:
          measureIndex === measureCount - 1 ||
          isPhraseBoundaryMeasure(measureIndex),
      });
    }
  }
}

function collectMeasureRoleIndexes(
  notes: readonly ProceduralMusicNote[],
  measureStartMs: number,
  measureEndMs: number
): Record<ProceduralMusicRole, number[]> {
  const indexes = createRoleIndexMap();

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;
    if (note.startMs < measureStartMs || note.startMs >= measureEndMs) {
      continue;
    }
    indexes[note.role].push(index);
  }

  for (const role of SONG_DENSITY_ROLES) {
    indexes[role].sort(
      (left, right) => notes[left]!.startMs - notes[right]!.startMs
    );
  }

  return indexes;
}

function pruneMeasureRoleNotes(
  notes: ProceduralMusicNote[],
  noteIndexes: readonly number[],
  options: {
    maxNoteCount: number;
    protectFirstEntry: boolean;
    protectPhraseBoundary: boolean;
  }
): void {
  const keepSet = new Set<number>();
  if (noteIndexes.length === 0) {
    return;
  }

  if (options.protectFirstEntry) {
    keepSet.add(noteIndexes[0]!);
  }
  if (options.protectPhraseBoundary || options.maxNoteCount > 1) {
    keepSet.add(noteIndexes[noteIndexes.length - 1]!);
  }

  const removable = [...noteIndexes].sort((left, right) =>
    compareRemovalPriority(notes[left]!, notes[right]!)
  );

  for (let index = 0; index < removable.length; index += 1) {
    if (noteIndexes.length - keepSet.size <= options.maxNoteCount) {
      break;
    }
    const noteIndex = removable[index]!;
    if (keepSet.has(noteIndex)) {
      continue;
    }
    notes[noteIndex] = {
      ...notes[noteIndex]!,
      durationMs: 0,
    };
  }

  const filteredIndexes = noteIndexes.filter(
    (noteIndex) => notes[noteIndex]!.durationMs > 0
  );
  if (filteredIndexes.length <= options.maxNoteCount) {
    return;
  }

  for (let index = filteredIndexes.length - 1; index >= 0; index -= 1) {
    const noteIndex = filteredIndexes[index]!;
    if (keepSet.has(noteIndex)) {
      continue;
    }
    notes[noteIndex] = {
      ...notes[noteIndex]!,
      durationMs: 0,
    };
    const remaining = filteredIndexes.filter(
      (remainingIndex) => notes[remainingIndex]!.durationMs > 0
    ).length;
    if (remaining <= options.maxNoteCount) {
      break;
    }
  }
}

function compareRemovalPriority(
  left: Pick<ProceduralMusicNote, 'instrumentId' | 'startMs' | 'durationMs'>,
  right: Pick<ProceduralMusicNote, 'instrumentId' | 'startMs' | 'durationMs'>
): number {
  const leftGenerated = isGeneratedRepairNote(left);
  const rightGenerated = isGeneratedRepairNote(right);
  if (leftGenerated !== rightGenerated) {
    return leftGenerated ? -1 : 1;
  }
  if (left.durationMs !== right.durationMs) {
    return left.durationMs - right.durationMs;
  }
  return right.startMs - left.startMs;
}

function resolveMeasureRoleDensityTarget(
  section: ProceduralMusicSongSection,
  role: ProceduralMusicRole,
  measureIndex: number
): MeasureRoleDensityTarget | null {
  const pattern = SECTION_MEASURE_DENSITY_TARGETS[section.id]?.[role];
  if (!pattern || pattern.length === 0) {
    return null;
  }
  const maxNoteCount = pattern[measureIndex] ?? pattern[pattern.length - 1]!;
  return { maxNoteCount };
}

function isPhraseBoundaryMeasure(measureIndex: number): boolean {
  return (measureIndex + 1) % 4 === 0;
}

function isGeneratedRepairNote(
  note: Pick<ProceduralMusicNote, 'instrumentId'>
): boolean {
  return note.instrumentId.includes(':measure-');
}

function createRoleIndexMap(): Record<ProceduralMusicRole, number[]> {
  return {
    bass: [],
    harmony: [],
    lead: [],
    percussion: [],
  };
}

const SONG_DENSITY_ROLES: readonly ProceduralMusicRole[] = [
  'bass',
  'harmony',
  'lead',
  'percussion',
];

const SECTION_MEASURE_DENSITY_TARGETS: Partial<
  Record<
    ProceduralMusicSongSection['id'],
    Partial<Record<ProceduralMusicRole, readonly number[]>>
  >
> = {
  intro: {
    lead: [1, 2, 2, 2, 3, 3, 3, 2],
  },
  variation: {
    lead: [2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 3, 3, 3, 2, 2],
  },
  outro: {
    lead: [3, 3, 2, 2, 2, 2, 1, 1],
  },
};
