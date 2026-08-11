import type { MusicDebugSnapshot } from './music-debug.ts';
import { describeProceduralChordQuality } from './procedural-music-chord-progression.ts';
import { resolveProceduralChordTimelineEntryAtStep } from './procedural-music-chord-timeline.ts';

export type MusicDebugChordCue = {
  degreeIndex: number;
  label: string;
  startMeasure: number;
  endMeasure: number;
  startOffsetMs: number;
  endOffsetMs: number;
};

export function formatMusicDebugChordCueLabel(
  scale: readonly number[],
  degreeIndex: number
): string {
  return `Chord ${degreeIndex + 1} ${describeProceduralChordQuality(scale, degreeIndex)}`;
}

export function resolveMusicDebugChordCues(
  snapshot: MusicDebugSnapshot
): MusicDebugChordCue[] {
  const cues: MusicDebugChordCue[] = [];
  let currentCue: MusicDebugChordCue | null = null;

  for (
    let measureNumber = 1;
    measureNumber <= snapshot.measureCount;
    measureNumber += 1
  ) {
    const timelineEntry = resolveProceduralChordTimelineEntryAtStep({
      themeId: snapshot.theme.id,
      themeStepCount: snapshot.theme.stepPattern.length,
      stepIndex: (measureNumber - 1) * 4,
      clusterX: snapshot.options.clusterX,
      clusterY: snapshot.options.clusterY,
    });
    const label = formatMusicDebugChordCueLabel(
      snapshot.theme.scale,
      timelineEntry.degreeIndex
    );

    if (currentCue && currentCue.label === label) {
      currentCue.endMeasure = measureNumber;
      currentCue.endOffsetMs = resolveMusicDebugMeasureEndOffsetMs(
        snapshot,
        measureNumber
      );
      continue;
    }

    currentCue = {
      degreeIndex: timelineEntry.degreeIndex,
      label,
      startMeasure: measureNumber,
      endMeasure: measureNumber,
      startOffsetMs: resolveMusicDebugMeasureStartOffsetMs(
        snapshot,
        measureNumber
      ),
      endOffsetMs: resolveMusicDebugMeasureEndOffsetMs(snapshot, measureNumber),
    };
    cues.push(currentCue);
  }

  return cues;
}

export function resolveMusicDebugChordCueAtOffset(
  snapshot: MusicDebugSnapshot,
  offsetMs: number
): MusicDebugChordCue | null {
  const cues = resolveMusicDebugChordCues(snapshot);
  const clampedOffsetMs = Math.max(0, Math.min(snapshot.durationMs, offsetMs));

  return (
    cues.find(
      (cue) =>
        clampedOffsetMs >= cue.startOffsetMs &&
        (clampedOffsetMs < cue.endOffsetMs || cue === cues[cues.length - 1])
    ) ??
    cues[cues.length - 1] ??
    null
  );
}

function resolveMusicDebugMeasureStartOffsetMs(
  snapshot: MusicDebugSnapshot,
  measureNumber: number
): number {
  const section =
    snapshot.song.sections.find(
      (candidate) =>
        measureNumber >= candidate.startMeasure &&
        measureNumber <= candidate.endMeasure
    ) ?? snapshot.song.sections[0];
  if (!section) {
    return 0;
  }

  const sectionMeasureCount = Math.max(
    1,
    section.endMeasure - section.startMeasure + 1
  );
  const offsetWithinSection = Math.max(0, measureNumber - section.startMeasure);

  return (
    section.startOffsetMs +
    (section.durationMs / sectionMeasureCount) * offsetWithinSection
  );
}

function resolveMusicDebugMeasureEndOffsetMs(
  snapshot: MusicDebugSnapshot,
  measureNumber: number
): number {
  if (measureNumber >= snapshot.measureCount) {
    return snapshot.durationMs;
  }
  return resolveMusicDebugMeasureStartOffsetMs(snapshot, measureNumber + 1);
}
