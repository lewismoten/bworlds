import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import {
  resolveMusicTheme,
  scheduleProceduralMusicNotes,
  type MusicUpdateOptions,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import { transformSongSectionNote } from './procedural-music-song-variation.ts';

export type ProceduralMusicSongSectionId =
  'intro' | 'a' | 'a-prime' | 'b' | 'variation' | 'return' | 'outro';

export type ProceduralMusicSongSection = {
  id: ProceduralMusicSongSectionId;
  label: string;
  startOffsetMs: number;
  durationMs: number;
  loopEligible: boolean;
};

export type ProceduralMusicSong = {
  startMs: number;
  durationMs: number;
  loopStartOffsetMs: number;
  loopEndOffsetMs: number;
  sections: ProceduralMusicSongSection[];
  notes: ProceduralMusicNote[];
};

type SongSectionTemplate = {
  id: ProceduralMusicSongSectionId;
  label: string;
  baseDurationMs: number;
  loopEligible: boolean;
};

const MUSIC_SONG_DURATION_SEED = registerHashLabel('music-song-duration');
const SONG_SECTION_TEMPLATES: readonly SongSectionTemplate[] = [
  { id: 'intro', label: 'Intro', baseDurationMs: 8_000, loopEligible: false },
  { id: 'a', label: 'Section A', baseDurationMs: 24_000, loopEligible: true },
  {
    id: 'a-prime',
    label: "Section A'",
    baseDurationMs: 24_000,
    loopEligible: true,
  },
  { id: 'b', label: 'Section B', baseDurationMs: 24_000, loopEligible: true },
  {
    id: 'variation',
    label: 'Variation',
    baseDurationMs: 24_000,
    loopEligible: true,
  },
  { id: 'return', label: 'Return', baseDurationMs: 16_000, loopEligible: true },
  { id: 'outro', label: 'Outro', baseDurationMs: 8_000, loopEligible: false },
];
const SONG_STRUCTURE_BASE_DURATION_MS = SONG_SECTION_TEMPLATES.reduce(
  (total, section) => total + section.baseDurationMs,
  0
);

export function createProceduralMusicSong(
  options: MusicUpdateOptions
): ProceduralMusicSong {
  const startMs = options.nowMs;
  const durationMs = resolveProceduralMusicSongDurationMs(options);
  const sections = buildProceduralMusicSongSections(durationMs);
  const baseNotes = collectProceduralMusicSongNotes(options, durationMs);
  const notes = applySongSectionsToNotes(baseNotes, sections, startMs);
  const loopStartOffsetMs = sections[1]?.startOffsetMs ?? 0;
  const outro = sections[sections.length - 1];
  const loopEndOffsetMs = outro
    ? Math.max(loopStartOffsetMs, outro.startOffsetMs)
    : durationMs;

  return {
    startMs,
    durationMs,
    loopStartOffsetMs,
    loopEndOffsetMs,
    sections,
    notes,
  };
}

export function resolveProceduralMusicSongDurationMs(
  options: Pick<
    MusicUpdateOptions,
    'tileKind' | 'contextType' | 'clusterX' | 'clusterY'
  >
): number {
  const theme = resolveMusicTheme(options.tileKind, options.contextType);
  const { minDurationMs, maxDurationMs } = getMusicSongDurationRange(options);
  const clusterX = options.clusterX ?? 0;
  const clusterY = options.clusterY ?? 0;
  const durationSignal = hash2DWithSeed(
    MUSIC_SONG_DURATION_SEED,
    clusterX + theme.id.length * 17,
    clusterY - theme.id.length * 13
  );
  const unroundedDuration =
    minDurationMs + (maxDurationMs - minDurationMs) * durationSignal;
  return roundToNearestThousand(unroundedDuration);
}

function getMusicSongDurationRange(
  options: Pick<MusicUpdateOptions, 'tileKind' | 'contextType'>
): { minDurationMs: number; maxDurationMs: number } {
  if (options.contextType === 'town' || options.tileKind === 'town') {
    return { minDurationMs: 120_000, maxDurationMs: 180_000 };
  }
  if (options.contextType === 'overworld') {
    return { minDurationMs: 120_000, maxDurationMs: 180_000 };
  }
  if (options.contextType === 'building') {
    return { minDurationMs: 90_000, maxDurationMs: 135_000 };
  }
  return { minDurationMs: 96_000, maxDurationMs: 150_000 };
}

function buildProceduralMusicSongSections(
  durationMs: number
): ProceduralMusicSongSection[] {
  const scale = durationMs / SONG_STRUCTURE_BASE_DURATION_MS;
  const sections: ProceduralMusicSongSection[] = [];
  let cursorMs = 0;

  for (let index = 0; index < SONG_SECTION_TEMPLATES.length; index += 1) {
    const template = SONG_SECTION_TEMPLATES[index]!;
    const isLast = index === SONG_SECTION_TEMPLATES.length - 1;
    const durationForSection = isLast
      ? Math.max(1_000, durationMs - cursorMs)
      : Math.max(
          4_000,
          roundToNearestThousand(template.baseDurationMs * scale)
        );
    sections.push({
      id: template.id,
      label: template.label,
      startOffsetMs: cursorMs,
      durationMs: durationForSection,
      loopEligible: template.loopEligible,
    });
    cursorMs += durationForSection;
  }

  return sections;
}

function collectProceduralMusicSongNotes(
  options: MusicUpdateOptions,
  durationMs: number
): ProceduralMusicNote[] {
  const endMs = options.nowMs + durationMs;
  const notes: ProceduralMusicNote[] = [];
  let previousState:
    ReturnType<typeof scheduleProceduralMusicNotes>['state'] | undefined;
  let cursorNowMs = options.nowMs;

  while (cursorNowMs < endMs) {
    const scheduled = scheduleProceduralMusicNotes(
      {
        ...options,
        nowMs: cursorNowMs,
      },
      previousState
    );
    previousState = scheduled.state;
    for (let index = 0; index < scheduled.notes.length; index += 1) {
      const note = scheduled.notes[index]!;
      if (note.startMs >= endMs) {
        continue;
      }
      notes.push(note);
    }
    if (scheduled.state.nextNoteAtMs <= cursorNowMs) {
      cursorNowMs += 1;
    } else {
      cursorNowMs = scheduled.state.nextNoteAtMs;
    }
  }

  return notes;
}

function applySongSectionsToNotes(
  notes: readonly ProceduralMusicNote[],
  sections: readonly ProceduralMusicSongSection[],
  songStartMs: number
): ProceduralMusicNote[] {
  const transformedNotes: ProceduralMusicNote[] = [];
  let sectionIndex = 0;
  let noteIndexInSection = 0;

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;

    while (
      sectionIndex < sections.length - 1 &&
      note.startMs >=
        songStartMs +
          sections[sectionIndex]!.startOffsetMs +
          sections[sectionIndex]!.durationMs
    ) {
      sectionIndex += 1;
      noteIndexInSection = 0;
    }

    const section = sections[sectionIndex]!;
    const transformed = transformSongSectionNote(
      note,
      section,
      noteIndexInSection
    );
    noteIndexInSection += 1;

    if (transformed) {
      transformedNotes.push(transformed);
    }
  }

  return transformedNotes;
}

function roundToNearestThousand(value: number): number {
  return Math.max(1_000, Math.round(value / 1_000) * 1_000);
}
