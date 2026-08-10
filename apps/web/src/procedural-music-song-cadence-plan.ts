export type SongCadenceKind = 'question' | 'weak' | 'loop' | 'answer';

export type SongCadenceSection = {
  id: string;
  label: string;
  startOffsetMs: number;
  durationMs: number;
  measureCount: number;
};

export type SongCadencePoint = {
  kind: SongCadenceKind;
  section: SongCadenceSection;
  boundaryOffsetMs: number;
  windowStartOffsetMs: number;
  windowEndOffsetMs: number;
};

export function collectSongCadencePoints(
  sections: readonly SongCadenceSection[]
): SongCadencePoint[] {
  const points: SongCadencePoint[] = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index]!;
    const measureDurationMs =
      section.durationMs / Math.max(1, section.measureCount);
    const cadenceWindowMs = Math.max(320, measureDurationMs * 1.5);
    const sectionEndOffsetMs = section.startOffsetMs + section.durationMs;

    if (section.measureCount >= 16) {
      const midpointOffsetMs = section.startOffsetMs + section.durationMs / 2;
      points.push({
        kind: 'question',
        section,
        boundaryOffsetMs: midpointOffsetMs,
        windowStartOffsetMs: midpointOffsetMs - cadenceWindowMs,
        windowEndOffsetMs: midpointOffsetMs,
      });
    }

    points.push({
      kind: resolveSectionEndingCadenceKind(sections, index),
      section,
      boundaryOffsetMs: sectionEndOffsetMs,
      windowStartOffsetMs: sectionEndOffsetMs - cadenceWindowMs,
      windowEndOffsetMs: sectionEndOffsetMs,
    });
  }

  return points;
}

function resolveSectionEndingCadenceKind(
  sections: readonly SongCadenceSection[],
  sectionIndex: number
): SongCadenceKind {
  const section = sections[sectionIndex];
  if (!section) {
    return 'weak';
  }
  const isFinalSection = sectionIndex === sections.length - 1;
  if (isFinalSection || section.id === 'outro') {
    return 'answer';
  }
  const nextSection = sections[sectionIndex + 1];
  if (nextSection?.id === 'outro') {
    return 'loop';
  }
  return 'weak';
}
