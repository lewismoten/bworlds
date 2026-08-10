import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export type ProceduralMusicSongSectionContext = {
  section: ProceduralMusicSongSection;
  note: Pick<ProceduralMusicNote, 'role' | 'startMs' | 'instrumentId'>;
  noteIndexInSection: number;
  sectionStartMs: number;
  sectionEndMs: number;
  measureDurationMs: number;
  measureIndex: number;
  measureCount: number;
  sectionProgress: number;
  phrasePosition: number;
  isGeneratedRepairNote: boolean;
};

export function createProceduralMusicSongSectionContext(options: {
  section: ProceduralMusicSongSection;
  note: Pick<ProceduralMusicNote, 'role' | 'startMs' | 'instrumentId'>;
  noteIndexInSection: number;
  songStartMs: number;
}): ProceduralMusicSongSectionContext {
  const sectionStartMs = options.songStartMs + options.section.startOffsetMs;
  const sectionEndMs = sectionStartMs + options.section.durationMs;
  const measureCount = Math.max(1, options.section.measureCount);
  const measureDurationMs = options.section.durationMs / measureCount;
  const relativeStartMs = Math.max(0, options.note.startMs - sectionStartMs);

  return {
    section: options.section,
    note: options.note,
    noteIndexInSection: options.noteIndexInSection,
    sectionStartMs,
    sectionEndMs,
    measureDurationMs,
    measureIndex: Math.max(
      0,
      Math.min(
        measureCount - 1,
        Math.floor(relativeStartMs / Math.max(1, measureDurationMs))
      )
    ),
    measureCount,
    sectionProgress: Math.min(
      0.999,
      relativeStartMs / Math.max(1, options.section.durationMs)
    ),
    phrasePosition: options.noteIndexInSection % 8,
    isGeneratedRepairNote: options.note.instrumentId.includes(':measure-'),
  };
}
