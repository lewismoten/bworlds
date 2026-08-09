import type {
  ProceduralMusicBlueprint,
  ProceduralMusicSongSectionTemplate,
} from './procedural-music-blueprint.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export const PROCEDURAL_MUSIC_BEATS_PER_MEASURE = 4;
export const PROCEDURAL_MUSIC_TICKS_PER_MEASURE =
  480 * PROCEDURAL_MUSIC_BEATS_PER_MEASURE;

export function buildProceduralMusicSongSections(
  blueprint: ProceduralMusicBlueprint,
  durationMs: number
): ProceduralMusicSongSection[] {
  const totalMeasures = Math.max(
    1,
    blueprint.sections.reduce((sum, section) => sum + section.measureCount, 0)
  );
  const msPerMeasure = durationMs / totalMeasures;
  const sections: ProceduralMusicSongSection[] = [];
  let cumulativeMeasures = 0;
  let previousEndOffsetMs = 0;

  for (let index = 0; index < blueprint.sections.length; index += 1) {
    const template: ProceduralMusicSongSectionTemplate =
      blueprint.sections[index]!;
    const startMeasure = cumulativeMeasures + 1;
    cumulativeMeasures += template.measureCount;
    const endMeasure = cumulativeMeasures;
    const isLast = index === blueprint.sections.length - 1;
    const endOffsetMs = isLast
      ? durationMs
      : Math.round(endMeasure * msPerMeasure);
    sections.push({
      id: template.id,
      label: template.label,
      startOffsetMs: previousEndOffsetMs,
      durationMs: Math.max(1_000, endOffsetMs - previousEndOffsetMs),
      loopEligible: template.loopEligible,
      measureCount: template.measureCount,
      startMeasure,
      endMeasure,
      startTick: (startMeasure - 1) * PROCEDURAL_MUSIC_TICKS_PER_MEASURE,
      endTick: endMeasure * PROCEDURAL_MUSIC_TICKS_PER_MEASURE,
    });
    previousEndOffsetMs = endOffsetMs;
  }

  return sections;
}
