import { resolveProceduralMeterPosition } from './procedural-music-meter.ts';
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
  meterPosition: ReturnType<typeof resolveProceduralMeterPosition>;
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
  const measureIndex = Math.max(
    0,
    Math.min(
      measureCount - 1,
      Math.floor(relativeStartMs / Math.max(1, measureDurationMs))
    )
  );
  const noteOffsetWithinMeasureMs =
    relativeStartMs - measureIndex * Math.max(1, measureDurationMs);
  const beatDurationMs = Math.max(1, measureDurationMs / 4);
  const beatIndex = Math.max(
    0,
    Math.min(3, Math.floor(noteOffsetWithinMeasureMs / beatDurationMs))
  );

  return {
    section: options.section,
    note: options.note,
    noteIndexInSection: options.noteIndexInSection,
    sectionStartMs,
    sectionEndMs,
    measureDurationMs,
    measureIndex,
    measureCount,
    sectionProgress: Math.min(
      0.999,
      relativeStartMs / Math.max(1, options.section.durationMs)
    ),
    phrasePosition: options.noteIndexInSection % 8,
    meterPosition: resolveProceduralMeterPosition(beatIndex),
    isGeneratedRepairNote: options.note.instrumentId.includes(':measure-'),
  };
}
