import {
  resolveProceduralChordTimeline,
  type ProceduralChordTimelineEntry,
} from './procedural-music-chord-timeline.ts';
import { getProceduralScaleDegreeSemitones } from './procedural-music-scale.ts';

export type ProceduralHarmonicPlanTheme = {
  id: string;
  scale: readonly number[];
  stepPattern: readonly number[];
};

export type ProceduralHarmonicPlanEntry = ProceduralChordTimelineEntry & {
  rootSemitones: number;
  thirdSemitones: number;
  fifthSemitones: number;
  passingSemitones: number;
};

const proceduralHarmonicPlanCache = new Map<
  string,
  readonly ProceduralHarmonicPlanEntry[]
>();

export function resolveProceduralHarmonicPlan(
  theme: ProceduralHarmonicPlanTheme,
  clusterX: number,
  clusterY: number
): readonly ProceduralHarmonicPlanEntry[] {
  const cacheKey = [
    theme.id,
    theme.stepPattern.length,
    clusterX,
    clusterY,
    theme.scale.join(','),
  ].join(':');
  const cached = proceduralHarmonicPlanCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const timeline = resolveProceduralChordTimeline({
    themeId: theme.id,
    themeStepCount: theme.stepPattern.length,
    clusterX,
    clusterY,
  });
  const plan = timeline.map((entry) =>
    createProceduralHarmonicPlanEntry(theme, entry)
  );

  proceduralHarmonicPlanCache.set(cacheKey, plan);
  return plan;
}

export function resolveProceduralHarmonicPlanEntryAtStep(
  theme: ProceduralHarmonicPlanTheme,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): ProceduralHarmonicPlanEntry {
  const plan = resolveProceduralHarmonicPlan(theme, clusterX, clusterY);
  const phraseStepCount = Math.max(1, theme.stepPattern.length) * 8;
  const normalizedStepIndex =
    ((stepIndex % phraseStepCount) + phraseStepCount) % phraseStepCount;

  return (
    plan.find(
      (entry) =>
        normalizedStepIndex >= entry.startStepIndex &&
        normalizedStepIndex < entry.endStepIndex
    ) ??
    plan[0] ?? {
      progressionIndex: 0,
      degreeIndex: 0,
      startStepIndex: 0,
      endStepIndex: 4,
      startMeasure: 1,
      endMeasure: 1,
      rootSemitones: 0,
      thirdSemitones: 4,
      fifthSemitones: 7,
      passingSemitones: 2,
    }
  );
}

function createProceduralHarmonicPlanEntry(
  theme: ProceduralHarmonicPlanTheme,
  timelineEntry: ProceduralChordTimelineEntry
): ProceduralHarmonicPlanEntry {
  const degreeIndex = timelineEntry.degreeIndex;

  return {
    ...timelineEntry,
    rootSemitones: getProceduralScaleDegreeSemitones(theme.scale, degreeIndex),
    thirdSemitones: getProceduralScaleDegreeSemitones(
      theme.scale,
      degreeIndex + 2
    ),
    fifthSemitones: getProceduralScaleDegreeSemitones(
      theme.scale,
      degreeIndex + 4
    ),
    passingSemitones: getProceduralScaleDegreeSemitones(
      theme.scale,
      degreeIndex + 1
    ),
  };
}
