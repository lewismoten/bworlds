import { resolveProceduralChordProgression } from './procedural-music-chord-progression.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';
import { resolveProceduralPhraseCadence } from './procedural-music-phrase-structure.ts';

export const PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS = 4;
export const PROCEDURAL_MUSIC_STEPS_PER_MEASURE =
  PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS;

export type ProceduralChordTimelineEntry = {
  progressionIndex: number;
  degreeIndex: number;
  startStepIndex: number;
  endStepIndex: number;
  startMeasure: number;
  endMeasure: number;
};

const proceduralChordTimelineCache = new Map<
  string,
  readonly ProceduralChordTimelineEntry[]
>();

export function resolveProceduralChordTimeline(options: {
  themeId: string;
  themeStepCount: number;
  clusterX: number;
  clusterY: number;
}): readonly ProceduralChordTimelineEntry[] {
  const normalizedThemeStepCount = Math.max(1, options.themeStepCount);
  const phraseStepCount =
    normalizedThemeStepCount * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const cacheKey = [
    options.themeId,
    normalizedThemeStepCount,
    options.clusterX,
    options.clusterY,
  ].join(':');
  const cachedTimeline = proceduralChordTimelineCache.get(cacheKey);
  if (cachedTimeline) {
    return cachedTimeline;
  }

  const progression = resolveProceduralChordProgression({
    themeId: options.themeId,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
  });
  const timeline: ProceduralChordTimelineEntry[] = [];

  for (
    let startStepIndex = 0;
    startStepIndex < phraseStepCount;
    startStepIndex += PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS
  ) {
    const progressionIndex =
      Math.floor(startStepIndex / PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS) %
      progression.length;
    const endStepIndex = Math.min(
      phraseStepCount,
      startStepIndex + PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS
    );
    const degreeIndex = progression[progressionIndex] ?? progression[0] ?? 0;

    timeline.push({
      progressionIndex,
      degreeIndex: isDominantLikeAnswerSetupEntry({
        themeStepCount: normalizedThemeStepCount,
        startStepIndex,
        endStepIndex,
      })
        ? 4
        : degreeIndex,
      startStepIndex,
      endStepIndex,
      startMeasure:
        Math.floor(startStepIndex / PROCEDURAL_MUSIC_STEPS_PER_MEASURE) + 1,
      endMeasure:
        Math.ceil(endStepIndex / PROCEDURAL_MUSIC_STEPS_PER_MEASURE) || 1,
    });
  }

  proceduralChordTimelineCache.set(cacheKey, timeline);
  return timeline;
}

function isDominantLikeAnswerSetupEntry(options: {
  themeStepCount: number;
  startStepIndex: number;
  endStepIndex: number;
}): boolean {
  return (
    resolveProceduralPhraseCadence({
      themeStepCount: options.themeStepCount,
      stepIndex: options.endStepIndex,
    }) === 'answer' &&
    resolveProceduralPhraseCadence({
      themeStepCount: options.themeStepCount,
      stepIndex: options.startStepIndex,
    }) !== 'answer'
  );
}

export function resolveProceduralChordTimelineEntryAtStep(options: {
  themeId: string;
  themeStepCount: number;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
}): ProceduralChordTimelineEntry {
  const timeline = resolveProceduralChordTimeline(options);
  const phraseStepCount =
    Math.max(1, options.themeStepCount) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const normalizedStepIndex =
    ((options.stepIndex % phraseStepCount) + phraseStepCount) % phraseStepCount;
  return (
    timeline.find(
      (entry) =>
        normalizedStepIndex >= entry.startStepIndex &&
        normalizedStepIndex < entry.endStepIndex
    ) ??
    timeline[0] ?? {
      progressionIndex: 0,
      degreeIndex: 0,
      startStepIndex: 0,
      endStepIndex: PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS,
      startMeasure: 1,
      endMeasure: 1,
    }
  );
}
