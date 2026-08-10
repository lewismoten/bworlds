import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import {
  type ProceduralMusicBlueprint,
  type ProceduralMusicSongSectionId,
  resolveProceduralMusicBlueprint,
} from './procedural-music-blueprint.ts';
import {
  createProceduralSongDna,
  type ProceduralSongDna,
} from './procedural-music-song-dna.ts';
import { constrainSongSectionNote } from './procedural-music-song-boundaries.ts';
import {
  resolveMusicEncounterMode,
  resolveMusicTheme,
  scheduleProceduralMusicNotes,
  type MusicEncounterMode,
  type MusicUpdateOptions,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import { transformSongSectionNote } from './procedural-music-song-variation.ts';
import { buildProceduralMusicSongSections } from './procedural-music-song-timing.ts';
import {
  collectProceduralMusicPhraseNotes,
  PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  repeatProceduralMusicPhraseNotes,
} from './procedural-music-song-phrase.ts';
import { stateLeadMotifInFirstASection } from './procedural-music-song-motif.ts';

export type ProceduralMusicSongSection = {
  id: ProceduralMusicSongSectionId;
  label: string;
  startOffsetMs: number;
  durationMs: number;
  loopEligible: boolean;
  measureCount: number;
  startMeasure: number;
  endMeasure: number;
  startTick: number;
  endTick: number;
};

export type ProceduralMusicSong = {
  startMs: number;
  durationMs: number;
  loopStartOffsetMs: number;
  loopEndOffsetMs: number;
  dna: ProceduralSongDna;
  blueprint: ProceduralMusicBlueprint;
  sections: ProceduralMusicSongSection[];
  notes: ProceduralMusicNote[];
};

const MUSIC_SONG_DURATION_SEED = registerHashLabel('music-song-duration');

export function createProceduralMusicSong(
  options: MusicUpdateOptions
): ProceduralMusicSong {
  const startMs = options.nowMs;
  const dna = createProceduralSongDna(options);
  const durationMs = resolveProceduralMusicSongDurationMs(options);
  const theme = resolveMusicTheme(
    options.tileKind,
    options.contextType,
    undefined,
    options.clusterX ?? 0,
    options.clusterY ?? 0
  );
  const blueprint = resolveProceduralMusicBlueprint(options);
  const sections = buildProceduralMusicSongSections(blueprint, durationMs);
  const phraseDurationMs = resolveProceduralMusicPhraseDurationMs(
    sections,
    durationMs
  );
  const basePhraseNotes = collectProceduralMusicPhraseNotes(
    options,
    phraseDurationMs
  );
  const baseNotes = repeatProceduralMusicPhraseNotes(basePhraseNotes, {
    phraseStartMs: startMs,
    phraseDurationMs,
    songStartMs: startMs,
    songDurationMs: durationMs,
  });
  const arrangedNotes = applySongSectionsToNotes(baseNotes, sections, startMs);
  const notes = stateLeadMotifInFirstASection({
    notes: arrangedNotes,
    sections,
    songStartMs: startMs,
    leadMotif: dna.leadMotif,
    theme,
  });
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
    dna,
    blueprint,
    sections,
    notes,
  };
}

export function resolveProceduralMusicSongDurationMs(
  options: Pick<
    MusicUpdateOptions,
    | 'tileKind'
    | 'contextType'
    | 'clusterX'
    | 'clusterY'
    | 'encounterMode'
    | 'combatIntensity'
  >
): number {
  const theme = resolveMusicTheme(
    options.tileKind,
    options.contextType,
    undefined,
    options.clusterX ?? 0,
    options.clusterY ?? 0
  );
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
  options: Pick<
    MusicUpdateOptions,
    'tileKind' | 'contextType' | 'encounterMode' | 'combatIntensity'
  >
): { minDurationMs: number; maxDurationMs: number } {
  const encounterMode: MusicEncounterMode =
    options.encounterMode ?? resolveMusicEncounterMode(options);

  if (encounterMode === 'battle') {
    return { minDurationMs: 60_000, maxDurationMs: 120_000 };
  }
  if (encounterMode === 'boss') {
    return { minDurationMs: 180_000, maxDurationMs: 360_000 };
  }
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

function applySongSectionsToNotes(
  notes: readonly ProceduralMusicNote[],
  sections: readonly ProceduralMusicSongSection[],
  songStartMs: number
): ProceduralMusicNote[] {
  const transformedNotes: ProceduralMusicNote[] = [];
  let sectionIndex = 0;
  let noteIndexesByRoleInSection: Record<ProceduralMusicNote['role'], number> =
    createSectionRoleNoteIndexMap();

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
      noteIndexesByRoleInSection = createSectionRoleNoteIndexMap();
    }

    const section = sections[sectionIndex]!;
    const noteIndexInSection = noteIndexesByRoleInSection[note.role];
    const transformed = transformSongSectionNote(
      note,
      section,
      noteIndexInSection
    );
    noteIndexesByRoleInSection[note.role] += 1;

    if (transformed) {
      const constrained = constrainSongSectionNote(
        transformed,
        section,
        songStartMs
      );
      if (constrained) {
        transformedNotes.push(constrained);
      }
    }
  }

  transformedNotes.sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }
    return left.durationMs - right.durationMs;
  });

  return transformedNotes;
}

function resolveProceduralMusicPhraseDurationMs(
  sections: readonly ProceduralMusicSongSection[],
  durationMs: number
): number {
  const totalMeasures = Math.max(
    1,
    sections.reduce((sum, section) => sum + section.measureCount, 0)
  );
  return Math.max(
    1_000,
    Math.round(
      (durationMs / totalMeasures) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
    )
  );
}

function roundToNearestThousand(value: number): number {
  return Math.max(1_000, Math.round(value / 1_000) * 1_000);
}

function createSectionRoleNoteIndexMap(): Record<
  ProceduralMusicNote['role'],
  number
> {
  return {
    lead: 0,
    harmony: 0,
    bass: 0,
    percussion: 0,
  };
}
