import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import { resolveProceduralChordProgression as resolveCuratedProceduralChordProgression } from './procedural-music-chord-progression.ts';
import {
  resolveProceduralHarmonicPlanEntryAtStep,
  type ProceduralHarmonicPlanEntry,
} from './procedural-music-harmonic-plan.ts';
import { resolveProceduralHarmonyChordVoicing } from './procedural-music-harmony-voicing.ts';
import { blendLeadMotifWithRecognition } from './procedural-music-lead-motif.ts';
import { scoreProceduralLeadMotionPenalty } from './procedural-music-lead-motion.ts';
import {
  getProceduralScaleDegreeSemitones,
  isProceduralSemitoneInMode,
} from './procedural-music-scale.ts';
import {
  PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  resolveProceduralPhraseCadence,
  resolveProceduralPhraseStep,
} from './procedural-music-phrase-structure.ts';
import { resolveProceduralMeterPosition } from './procedural-music-meter.ts';

export type ProceduralHarmonyTheme = {
  id: string;
  scale: number[];
  stepPattern: number[];
  vocabulary?: {
    melodyRangeSemitones?: readonly [number, number];
    preferredIntervals?: readonly number[];
  };
  motif?: {
    adaptedDegreeOffsets?: readonly number[];
    recognitionDegreeOffsets?: readonly number[];
    sharedDegreeOffsets?: readonly number[];
  };
};

export type ProceduralHarmonyRole = 'lead' | 'harmony' | 'bass' | 'percussion';

export type ProceduralChord = Pick<
  ProceduralHarmonicPlanEntry,
  | 'degreeIndex'
  | 'progressionIndex'
  | 'rootSemitones'
  | 'thirdSemitones'
  | 'fifthSemitones'
  | 'passingSemitones'
>;

export type ProceduralLeadMotif = {
  degreeOffsets: readonly number[];
};

export type ProceduralLeadPhraseCadence = 'neutral' | 'question' | 'answer';

export type ProceduralLeadContourStage =
  'start' | 'rise' | 'climax' | 'descend' | 'resolve';

export type ProceduralLeadContourStep = {
  stage: ProceduralLeadContourStage;
  minDegreeOffset: number;
  degreeOffset: number;
  maxDegreeOffset: number;
};

export type ProceduralLeadContourTargetRange = {
  stage: ProceduralLeadContourStage;
  minSemitones: number;
  targetSemitones: number;
  maxSemitones: number;
  cadence: ProceduralLeadPhraseCadence;
};

export type ProceduralBassFigureStep =
  'root' | 'fifth' | 'passing' | 'octave-root';

export type ProceduralCompositionStep = {
  chord: ProceduralChord;
  cadence: ProceduralLeadPhraseCadence;
  contourStep: ProceduralLeadContourStep;
  motifDegreeOffset: number;
  phraseStep: number;
  phraseCycleStep: number;
};

const MUSIC_MOTIF_SEED = registerHashLabel('music-lead-motif');
const MUSIC_LEAP_SEED = registerHashLabel('music-leap-motion');
const MUSIC_ACCIDENTAL_SEED = registerHashLabel('music-accidental-motion');
const MUSIC_CONTOUR_SEED = registerHashLabel('music-lead-contour');
const MUSIC_BASS_FIGURE_SEED = registerHashLabel('music-bass-figure');
const BASS_MIN_SEMITONES = -7;
const BASS_MAX_SEMITONES = 12;
const BASS_OCTAVE_MAX_SEMITONES = 9;
const LEAD_MIN_SEMITONES = 0;
const LEAD_MAX_SEMITONES = 19;
const ORDINARY_LEAD_MOTION_LIMIT_SEMITONES = 3;
const LARGE_LEAP_LIMIT_SEMITONES = 7;
const OCTAVE_LEAP_LIMIT_SEMITONES = 12;
const MOTIF_PATTERNS = [
  [0, 1, 0],
  [0, 1, 2, 1],
  [0, 2, 1, 0],
  [0, 1, 3, 1, 0],
  [0, 2, 4, 2, 1, 0],
  [0, 1, 0, 2, 1, 3],
  [0, 2, 1, 3, 2, 1, 0],
  [0, 1, 3, 2, 4, 2, 1, 0],
] as const;
const BASS_FIGURE_PATTERNS = [
  ['root', 'root', 'fifth', 'passing'],
  ['root', 'fifth', 'root', 'passing'],
  ['root', 'passing', 'root', 'fifth'],
  ['root', 'root', 'passing', 'fifth'],
] as const satisfies readonly (readonly ProceduralBassFigureStep[])[];
const proceduralBassFigureCache = new Map<
  string,
  readonly ProceduralBassFigureStep[]
>();

export function resolveProceduralChordProgression(
  theme: ProceduralHarmonyTheme,
  clusterX: number,
  clusterY: number
): readonly number[] {
  return resolveCuratedProceduralChordProgression({
    themeId: theme.id,
    clusterX,
    clusterY,
  });
}

export function resolveProceduralLeadMotif(
  theme: ProceduralHarmonyTheme,
  clusterX: number,
  clusterY: number
): ProceduralLeadMotif {
  const candidatePatterns = getPreferredMotifPatterns(theme);
  const patternIndex = Math.floor(
    hash2DWithSeed(
      MUSIC_MOTIF_SEED,
      clusterX - theme.id.length * 29,
      clusterY + theme.id.length * 19
    ) * candidatePatterns.length
  );
  const baseDegreeOffsets =
    candidatePatterns[patternIndex] ?? candidatePatterns[0] ?? [];

  return {
    degreeOffsets: blendLeadMotifWithRecognition({
      baseDegreeOffsets,
      recognitionDegreeOffsets: theme.motif?.recognitionDegreeOffsets,
    }),
  };
}

export function resolveProceduralLeadPhraseCadence(
  theme: ProceduralHarmonyTheme,
  stepIndex: number
): ProceduralLeadPhraseCadence {
  return resolveProceduralPhraseCadence({
    themeStepCount: theme.stepPattern.length,
    stepIndex,
  });
}

export function resolveProceduralLeadContour(
  theme: ProceduralHarmonyTheme,
  clusterX: number,
  clusterY: number
): readonly ProceduralLeadContourStep[] {
  const phraseLength = Math.max(1, theme.stepPattern.length);
  const contourBias =
    hash2DWithSeed(
      MUSIC_CONTOUR_SEED,
      clusterX + theme.id.length * 23,
      clusterY - theme.id.length * 31
    ) > 0.5
      ? 1
      : 0;
  const climaxIndex = Math.max(1, Math.floor(phraseLength * 0.6));
  const resolveIndex = phraseLength - 1;
  const melodyRange = theme.vocabulary?.melodyRangeSemitones ?? [0, 12];
  const rangeWidth = Math.max(4, melodyRange[1] - melodyRange[0]);
  const climaxDegree = Math.max(3, Math.min(5, Math.round(rangeWidth / 3)));
  const riseCeiling = Math.max(2, climaxDegree - 1);
  const contour: ProceduralLeadContourStep[] = [];

  for (let stepIndex = 0; stepIndex < phraseLength; stepIndex += 1) {
    let stage: ProceduralLeadContourStage;
    let degreeOffset: number;

    if (stepIndex === 0) {
      stage = 'start';
      degreeOffset = 0;
    } else if (stepIndex >= resolveIndex) {
      stage = 'resolve';
      degreeOffset = 0;
    } else if (stepIndex === climaxIndex) {
      stage = 'climax';
      degreeOffset = climaxDegree + contourBias;
    } else if (stepIndex > climaxIndex) {
      stage = 'descend';
      degreeOffset = Math.max(
        1,
        riseCeiling + contourBias - (stepIndex - climaxIndex)
      );
    } else {
      stage = 'rise';
      degreeOffset = Math.min(riseCeiling + contourBias, 1 + stepIndex);
    }

    contour.push({
      stage,
      minDegreeOffset:
        stage === 'start' || stage === 'resolve'
          ? degreeOffset
          : Math.max(0, degreeOffset - 1),
      degreeOffset,
      maxDegreeOffset:
        stage === 'start' || stage === 'resolve'
          ? degreeOffset
          : degreeOffset + 1,
    });
  }

  return contour;
}

export function resolveProceduralCompositionStep(
  theme: ProceduralHarmonyTheme,
  stepIndex: number,
  clusterX: number,
  clusterY: number,
  _allowLeadAccidentals = true
): ProceduralCompositionStep {
  void _allowLeadAccidentals;
  const motif = resolveProceduralLeadMotif(theme, clusterX, clusterY);
  const contour = resolveProceduralLeadContour(theme, clusterX, clusterY);
  const motifStepCount = Math.max(1, theme.stepPattern.length);
  const phraseStep =
    ((stepIndex % motifStepCount) + motifStepCount) % motifStepCount;
  const phraseCycleStep = resolveProceduralPhraseStep({
    themeStepCount: theme.stepPattern.length,
    stepIndex,
  });
  const contourPhraseStepCount =
    motifStepCount * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const contourPhraseStep =
    ((stepIndex % contourPhraseStepCount) + contourPhraseStepCount) %
    contourPhraseStepCount;

  return {
    chord: resolveProceduralChordAtStep(theme, stepIndex, clusterX, clusterY),
    cadence: resolveProceduralLeadPhraseCadence(theme, stepIndex),
    contourStep: resolveInterpolatedLeadContourStep(
      contour,
      contourPhraseStep,
      contourPhraseStepCount
    ),
    motifDegreeOffset:
      motif.degreeOffsets[phraseStep % motif.degreeOffsets.length] ?? 0,
    phraseStep,
    phraseCycleStep,
  };
}

function resolveInterpolatedLeadContourStep(
  contour: readonly ProceduralLeadContourStep[],
  phraseStep: number,
  phraseStepCount: number
): ProceduralLeadContourStep {
  const fallback = contour[0] ?? {
    stage: 'start' as const,
    minDegreeOffset: 0,
    degreeOffset: 0,
    maxDegreeOffset: 0,
  };
  if (contour.length <= 1 || phraseStepCount <= 1) {
    return fallback;
  }

  const progress = phraseStep / Math.max(1, phraseStepCount - 1);
  const checkpointPosition = progress * (contour.length - 1);
  const leftIndex = Math.floor(checkpointPosition);
  const rightIndex = Math.min(
    contour.length - 1,
    Math.ceil(checkpointPosition)
  );
  const blend = checkpointPosition - leftIndex;
  const left = contour[leftIndex] ?? fallback;
  const right = contour[rightIndex] ?? left;
  const minDegreeOffset = Math.round(
    interpolate(left.minDegreeOffset, right.minDegreeOffset, blend)
  );
  const maxDegreeOffset = Math.round(
    interpolate(left.maxDegreeOffset, right.maxDegreeOffset, blend)
  );
  const degreeOffset = Math.min(
    maxDegreeOffset,
    Math.max(
      minDegreeOffset,
      Math.round(interpolate(left.degreeOffset, right.degreeOffset, blend))
    )
  );

  return {
    stage:
      left.stage === right.stage
        ? left.stage
        : blend < 0.5
          ? left.stage
          : right.stage,
    minDegreeOffset,
    degreeOffset,
    maxDegreeOffset,
  };
}

function interpolate(start: number, end: number, blend: number): number {
  return start + (end - start) * blend;
}

export function resolveProceduralLeadContourTargetRange(
  theme: ProceduralHarmonyTheme,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): ProceduralLeadContourTargetRange {
  const composition = resolveProceduralCompositionStep(
    theme,
    stepIndex,
    clusterX,
    clusterY,
    false
  );

  return {
    stage: composition.contourStep.stage,
    minSemitones: getProceduralScaleDegreeSemitones(
      theme.scale,
      composition.chord.degreeIndex +
        composition.motifDegreeOffset +
        composition.contourStep.minDegreeOffset
    ),
    targetSemitones: getProceduralScaleDegreeSemitones(
      theme.scale,
      composition.chord.degreeIndex +
        composition.motifDegreeOffset +
        composition.contourStep.degreeOffset
    ),
    maxSemitones: getProceduralScaleDegreeSemitones(
      theme.scale,
      composition.chord.degreeIndex +
        composition.motifDegreeOffset +
        composition.contourStep.maxDegreeOffset
    ),
    cadence: composition.cadence,
  };
}

function getPreferredMotifPatterns(
  theme: ProceduralHarmonyTheme
): readonly (readonly number[])[] {
  const preferredIntervals = theme.vocabulary?.preferredIntervals;
  if (!preferredIntervals || preferredIntervals.length === 0) {
    if (theme.motif?.adaptedDegreeOffsets?.length) {
      return [theme.motif.adaptedDegreeOffsets];
    }
    return MOTIF_PATTERNS;
  }

  const scoredPatterns = MOTIF_PATTERNS.map((pattern) => ({
    pattern,
    score: scoreMotifPattern(pattern, preferredIntervals),
  })).sort((left, right) => right.score - left.score);
  const bestScore = scoredPatterns[0]?.score ?? 0;
  const preferredPatterns = scoredPatterns
    .filter((entry) => entry.score >= bestScore - 1)
    .map((entry) => entry.pattern);

  if (theme.motif?.adaptedDegreeOffsets?.length) {
    return [theme.motif.adaptedDegreeOffsets, ...preferredPatterns];
  }

  return preferredPatterns.length > 0 ? preferredPatterns : MOTIF_PATTERNS;
}

function scoreMotifPattern(
  pattern: readonly number[],
  preferredIntervals: readonly number[]
): number {
  let score = 0;

  for (let index = 1; index < pattern.length; index += 1) {
    const interval = Math.abs(pattern[index]! - pattern[index - 1]!);
    if (preferredIntervals.includes(interval)) {
      score += 2;
      continue;
    }
    if (
      preferredIntervals.some(
        (preferredInterval) => Math.abs(preferredInterval - interval) <= 1
      )
    ) {
      score += 1;
    }
  }

  return score;
}

export function isProceduralSemitoneInScale(
  scale: readonly number[],
  semitone: number
): boolean {
  return isProceduralSemitoneInMode(scale, semitone);
}

export function resolveProceduralChordAtStep(
  theme: ProceduralHarmonyTheme,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): ProceduralChord {
  const planEntry = resolveProceduralHarmonicPlanEntryAtStep(
    theme,
    stepIndex,
    clusterX,
    clusterY
  );

  return {
    degreeIndex: planEntry.degreeIndex,
    progressionIndex: planEntry.progressionIndex,
    rootSemitones: planEntry.rootSemitones,
    thirdSemitones: planEntry.thirdSemitones,
    fifthSemitones: planEntry.fifthSemitones,
    passingSemitones: planEntry.passingSemitones,
  };
}

export function resolveProceduralInstrumentSemitones(options: {
  theme: ProceduralHarmonyTheme;
  role: ProceduralHarmonyRole;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  allowLeadAccidentals?: boolean;
  chord?: ProceduralChord;
}): number {
  const chord =
    options.chord ??
    resolveProceduralChordAtStep(
      options.theme,
      options.stepIndex,
      options.clusterX,
      options.clusterY
    );

  if (options.role === 'bass') {
    return resolveBassSemitones(
      options.theme,
      chord,
      options.stepIndex,
      options.clusterX,
      options.clusterY
    );
  }
  if (options.role === 'harmony') {
    return resolveHarmonySemitones(chord, options.stepIndex);
  }
  if (options.role === 'percussion') {
    return [0, 7, 12, 3][options.stepIndex % 4] ?? 0;
  }

  return resolveLeadSemitones(
    options.theme,
    chord,
    options.stepIndex,
    options.clusterX,
    options.clusterY,
    options.allowLeadAccidentals
  );
}

export function resolveProceduralHarmonyVoicing(options: {
  theme: ProceduralHarmonyTheme;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  chord?: ProceduralChord;
  previousChord?: ProceduralChord | null;
  maxTopSemitones?: number;
}): readonly number[] {
  const chord =
    options.chord ??
    resolveProceduralChordAtStep(
      options.theme,
      options.stepIndex,
      options.clusterX,
      options.clusterY
    );
  const previousChord =
    options.previousChord !== undefined
      ? options.previousChord
      : options.stepIndex > 0
        ? resolveProceduralChordAtStep(
            options.theme,
            options.stepIndex - 1,
            options.clusterX,
            options.clusterY
          )
        : null;

  return resolveProceduralHarmonyChordVoicing({
    chord,
    previousChord,
    maxTopSemitones: options.maxTopSemitones,
  });
}

function resolveBassSemitones(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): number {
  const candidates = resolveBassSemitoneCandidates(
    theme,
    chord,
    stepIndex,
    clusterX,
    clusterY
  );
  if (stepIndex <= 0) {
    return candidates[0] ?? chord.rootSemitones;
  }

  const previous = resolveBassSemitones(
    theme,
    resolveProceduralChordAtStep(theme, stepIndex - 1, clusterX, clusterY),
    stepIndex - 1,
    clusterX,
    clusterY
  );
  const phrasePulse = stepIndex % 4;
  if (phrasePulse === 0) {
    const preferredRoot = selectPreferredBassTarget(
      chord.rootSemitones,
      previous
    );
    if (preferredRoot !== null) {
      return preferredRoot;
    }
    return clampBassFallback(chord.rootSemitones);
  }
  if (phrasePulse === 1) {
    const preferredFifth = selectPreferredBassTarget(
      chord.fifthSemitones,
      previous
    );
    if (preferredFifth !== null) {
      return preferredFifth;
    }
  }

  return selectBassSemitoneCandidate({
    targetCandidates: candidates,
    previousBassSemitones: previous,
  });
}

function resolveBassSemitoneCandidates(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): readonly number[] {
  const phraseLength = Math.max(4, theme.stepPattern.length);
  const phraseStep = stepIndex % phraseLength;
  const figure = resolveProceduralBassFigure(theme, clusterX, clusterY);
  const figureStep = figure[phraseStep] ?? 'root';

  if (figureStep === 'root') {
    return [chord.rootSemitones, chord.fifthSemitones];
  }
  if (figureStep === 'fifth') {
    return [chord.fifthSemitones, chord.rootSemitones];
  }
  if (figureStep === 'octave-root') {
    return [
      chord.rootSemitones + 12,
      chord.rootSemitones,
      chord.fifthSemitones,
    ];
  }
  return [chord.passingSemitones, chord.rootSemitones];
}

export function resolveProceduralBassFigure(
  theme: ProceduralHarmonyTheme,
  clusterX: number,
  clusterY: number
): readonly ProceduralBassFigureStep[] {
  const cacheKey = `${theme.id}:${clusterX}:${clusterY}:${theme.stepPattern.length}`;
  const cachedFigure = proceduralBassFigureCache.get(cacheKey);
  if (cachedFigure) {
    return cachedFigure;
  }

  const phraseLength = Math.max(4, theme.stepPattern.length);
  const patternIndex = Math.floor(
    hash2DWithSeed(
      MUSIC_BASS_FIGURE_SEED,
      clusterX + theme.id.length * 37,
      clusterY - theme.id.length * 41
    ) * BASS_FIGURE_PATTERNS.length
  );
  const measurePattern =
    BASS_FIGURE_PATTERNS[patternIndex] ?? BASS_FIGURE_PATTERNS[0];
  const figure = Array.from({ length: phraseLength }, (_, stepIndex) => {
    const pulseInMeasure = stepIndex % 4;
    if (pulseInMeasure === 0) {
      return 'root';
    }
    return measurePattern[pulseInMeasure] ?? 'root';
  });

  proceduralBassFigureCache.set(cacheKey, figure);
  return figure;
}

function selectBassSemitoneCandidate(options: {
  targetCandidates: readonly number[];
  previousBassSemitones: number;
}): number {
  const candidates: Array<{ semitones: number; priority: number }> = [];
  for (
    let priority = 0;
    priority < options.targetCandidates.length;
    priority += 1
  ) {
    const targetSemitones =
      options.targetCandidates[priority] ?? options.targetCandidates[0];
    if (targetSemitones === undefined) {
      continue;
    }
    for (let octaveShift = -24; octaveShift <= 24; octaveShift += 12) {
      const candidate = targetSemitones + octaveShift;
      if (candidate < BASS_MIN_SEMITONES || candidate > BASS_MAX_SEMITONES) {
        continue;
      }
      if (
        priority === 0 &&
        targetSemitones - (options.targetCandidates[1] ?? targetSemitones) >=
          7 &&
        candidate > BASS_OCTAVE_MAX_SEMITONES
      ) {
        continue;
      }
      candidates.push({ semitones: candidate, priority });
    }
  }
  candidates.sort(
    (left, right) =>
      Math.abs(left.semitones - options.previousBassSemitones) -
        Math.abs(right.semitones - options.previousBassSemitones) ||
      left.priority - right.priority
  );

  const boundedCandidate =
    candidates.find(
      (candidate) =>
        Math.abs(candidate.semitones - options.previousBassSemitones) <= 5
    ) ?? candidates[0];

  return (
    boundedCandidate?.semitones ??
    clampBassFallback(options.targetCandidates[0] ?? 0)
  );
}

function selectPreferredBassTarget(
  targetSemitones: number,
  previousBassSemitones: number
): number | null {
  const candidates: number[] = [];
  for (let octaveShift = -24; octaveShift <= 24; octaveShift += 12) {
    const candidate = targetSemitones + octaveShift;
    if (candidate < BASS_MIN_SEMITONES || candidate > BASS_MAX_SEMITONES) {
      continue;
    }
    candidates.push(candidate);
  }
  candidates.sort(
    (left, right) =>
      Math.abs(left - previousBassSemitones) -
      Math.abs(right - previousBassSemitones)
  );
  return (
    candidates.find(
      (candidate) => Math.abs(candidate - previousBassSemitones) <= 7
    ) ?? null
  );
}

function clampBassFallback(targetSemitones: number): number {
  let candidate = targetSemitones;
  while (candidate > BASS_MAX_SEMITONES) {
    candidate -= 12;
  }
  while (candidate < BASS_MIN_SEMITONES) {
    candidate += 12;
  }
  return Math.min(BASS_MAX_SEMITONES, Math.max(BASS_MIN_SEMITONES, candidate));
}

function resolveHarmonySemitones(
  chord: ProceduralChord,
  stepIndex: number
): number {
  const harmonyPattern = [
    chord.thirdSemitones,
    chord.fifthSemitones,
    chord.rootSemitones + 12,
    chord.thirdSemitones + 12,
  ];
  return (
    harmonyPattern[Math.floor(stepIndex / 4) % harmonyPattern.length] ??
    chord.thirdSemitones
  );
}

function resolveLeadSemitones(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number,
  allowLeadAccidentals = true
): number {
  return resolveLeadSemitonesCached(
    theme,
    chord,
    stepIndex,
    clusterX,
    clusterY,
    allowLeadAccidentals,
    new Map<number, number>()
  );
}

function resolveLeadSemitonesCached(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number,
  allowLeadAccidentals: boolean,
  memo: Map<number, number>
): number {
  const cached = memo.get(stepIndex);
  if (cached !== undefined) {
    return cached;
  }

  const commit = (value: number): number => {
    memo.set(stepIndex, value);
    return value;
  };

  const current = resolveLeadSemitonePlan(
    theme,
    chord,
    stepIndex,
    clusterX,
    clusterY,
    allowLeadAccidentals
  );
  if (stepIndex <= 0) {
    return commit(current.semitones);
  }

  const previousChord = resolveProceduralChordAtStep(
    theme,
    stepIndex - 1,
    clusterX,
    clusterY
  );
  const previous = {
    ...resolveLeadSemitonePlan(
      theme,
      previousChord,
      stepIndex - 1,
      clusterX,
      clusterY,
      allowLeadAccidentals
    ),
    semitones: resolveLeadSemitonesCached(
      theme,
      previousChord,
      stepIndex - 1,
      clusterX,
      clusterY,
      allowLeadAccidentals,
      memo
    ),
  };
  const previousLeapDistance =
    stepIndex > 1
      ? Math.abs(
          previous.semitones -
            resolveLeadSemitonesCached(
              theme,
              resolveProceduralChordAtStep(
                theme,
                stepIndex - 2,
                clusterX,
                clusterY
              ),
              stepIndex - 2,
              clusterX,
              clusterY,
              allowLeadAccidentals,
              memo
            )
        )
      : null;
  const priorLargeLeapCount = countPriorLargeLeadLeapsInPhrase({
    theme,
    stepIndex,
    clusterX,
    clusterY,
    allowLeadAccidentals,
    memo,
    threshold: ORDINARY_LEAD_MOTION_LIMIT_SEMITONES,
  });
  const repeatedPitchRunLength = countTrailingRepeatedLeadPitchInPhrase({
    theme,
    stepIndex,
    clusterX,
    clusterY,
    allowLeadAccidentals,
    memo,
  });
  let selectedCurrentSemitones = selectPreferredLeadSemitoneClass({
    candidates: current.candidateSemitones,
    previousSemitones: previous.semitones,
    strongLeadBeat: current.strongLeadBeat,
    structuralAccent: current.structuralAccent,
    contourRange: current.contourRange,
    preferredIntervals: theme.vocabulary?.preferredIntervals,
    previousLeapDistance,
    priorLargeLeapCount,
    repeatedPitchRunLength,
  });
  selectedCurrentSemitones = shapeLeadSemitonesForContourStage({
    theme,
    stepIndex,
    clusterX,
    clusterY,
    allowLeadAccidentals,
    memo,
    selectedSemitones: selectedCurrentSemitones,
    previousSemitones: previous.semitones,
    previousContourStage: previous.contourStage,
    currentContourStage: current.contourStage,
    currentContourRange: current.contourRange,
  });
  const previousBassSemitones = resolveBassSemitones(
    theme,
    previousChord,
    stepIndex - 1,
    clusterX,
    clusterY
  );
  const currentBassSemitones = resolveBassSemitones(
    theme,
    chord,
    stepIndex,
    clusterX,
    clusterY
  );
  selectedCurrentSemitones = resolveLeadCounterMotionSemitones({
    selectedSemitones: selectedCurrentSemitones,
    candidates: current.candidateSemitones,
    previousSemitones: previous.semitones,
    previousBassSemitones,
    currentBassSemitones,
    cadence: current.cadence,
    structuralAccent: current.structuralAccent,
    strongLeadBeat: current.strongLeadBeat,
    contourRange: current.contourRange,
    preferredIntervals: theme.vocabulary?.preferredIntervals,
    previousLeapDistance,
    priorLargeLeapCount,
    repeatedPitchRunLength,
  });
  const leap = selectedCurrentSemitones - previous.semitones;
  const leapMagnitude = Math.abs(leap);
  const allowWideLeap =
    current.strongLeadBeat &&
    current.cadence === 'answer' &&
    hash2DWithSeed(
      MUSIC_LEAP_SEED,
      clusterX + stepIndex + theme.id.length * 7,
      clusterY - stepIndex - theme.id.length * 5
    ) > 0.96;
  const allowOctaveLeap =
    current.strongLeadBeat &&
    current.contourStage === 'climax' &&
    hash2DWithSeed(
      MUSIC_LEAP_SEED,
      clusterX + stepIndex + theme.id.length * 17,
      clusterY - stepIndex - theme.id.length * 13
    ) > 0.995;

  if (allowOctaveLeap && leapMagnitude > OCTAVE_LEAP_LIMIT_SEMITONES) {
    return commit(
      resolveNearbyScaleMotion({
        scale: theme.scale,
        previousSemitones: previous.semitones,
        direction: Math.sign(leap),
        maxDistance: OCTAVE_LEAP_LIMIT_SEMITONES - 1,
        fallbackSemitones:
          previous.semitones +
          Math.sign(leap) * (OCTAVE_LEAP_LIMIT_SEMITONES - 1),
      })
    );
  }

  if (!allowOctaveLeap && leapMagnitude >= OCTAVE_LEAP_LIMIT_SEMITONES) {
    return commit(
      resolveNearbyScaleMotion({
        scale: theme.scale,
        previousSemitones: previous.semitones,
        direction: Math.sign(leap),
        maxDistance: LARGE_LEAP_LIMIT_SEMITONES,
        fallbackSemitones:
          previous.semitones + Math.sign(leap) * LARGE_LEAP_LIMIT_SEMITONES,
      })
    );
  }

  if (!allowWideLeap && leapMagnitude > LARGE_LEAP_LIMIT_SEMITONES) {
    return commit(
      resolveNearbyScaleMotion({
        scale: theme.scale,
        previousSemitones: previous.semitones,
        direction: Math.sign(leap),
        maxDistance: 5,
        fallbackSemitones: previous.semitones + Math.sign(leap) * 5,
      })
    );
  }

  if (
    current.cadence === 'neutral' &&
    !current.structuralAccent &&
    leapMagnitude > ORDINARY_LEAD_MOTION_LIMIT_SEMITONES
  ) {
    return commit(
      resolveNearbyScaleMotion({
        scale: theme.scale,
        previousSemitones: previous.semitones,
        direction: Math.sign(leap),
        maxDistance: ORDINARY_LEAD_MOTION_LIMIT_SEMITONES,
        fallbackSemitones:
          previous.semitones +
          Math.sign(leap) * ORDINARY_LEAD_MOTION_LIMIT_SEMITONES,
      })
    );
  }

  if (
    leapMagnitude > ORDINARY_LEAD_MOTION_LIMIT_SEMITONES &&
    priorLargeLeapCount > 0 &&
    !current.structuralAccent
  ) {
    return commit(
      resolveNearbyScaleMotion({
        scale: theme.scale,
        previousSemitones: previous.semitones,
        direction: Math.sign(leap),
        maxDistance: ORDINARY_LEAD_MOTION_LIMIT_SEMITONES,
        fallbackSemitones:
          previous.semitones +
          Math.sign(leap) * ORDINARY_LEAD_MOTION_LIMIT_SEMITONES,
      })
    );
  }

  if (current.cadence === 'neutral' && leapMagnitude > 5) {
    return commit(
      resolveNearbyScaleMotion({
        scale: theme.scale,
        previousSemitones: previous.semitones,
        direction: Math.sign(leap),
        maxDistance: 4,
        fallbackSemitones: previous.semitones + Math.sign(leap) * 4,
      })
    );
  }

  if (current.cadence !== 'neutral') {
    return commit(selectedCurrentSemitones);
  }

  if (stepIndex > 1) {
    const previousPreviousChord = resolveProceduralChordAtStep(
      theme,
      stepIndex - 2,
      clusterX,
      clusterY
    );
    const previousPrevious = {
      ...resolveLeadSemitonePlan(
        theme,
        previousPreviousChord,
        stepIndex - 2,
        clusterX,
        clusterY,
        allowLeadAccidentals
      ),
      semitones: resolveLeadSemitonesCached(
        theme,
        previousPreviousChord,
        stepIndex - 2,
        clusterX,
        clusterY,
        allowLeadAccidentals,
        memo
      ),
    };
    const priorLeap = previous.semitones - previousPrevious.semitones;
    if (
      Math.abs(priorLeap) > ORDINARY_LEAD_MOTION_LIMIT_SEMITONES &&
      (Math.sign(priorLeap) === Math.sign(leap) ||
        Math.abs(leap) > 2 ||
        Math.abs(leap) <= 1)
    ) {
      return commit(
        resolveNearbyScaleMotion({
          scale: theme.scale,
          previousSemitones: previous.semitones,
          direction: -Math.sign(priorLeap),
          maxDistance: Math.min(2, Math.abs(priorLeap) - 1),
          fallbackSemitones:
            previous.semitones -
            Math.sign(priorLeap) * Math.min(2, Math.abs(priorLeap) - 1),
        })
      );
    }
  }

  return commit(selectedCurrentSemitones);
}

function resolveLeadSemitonePlan(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number,
  allowLeadAccidentals: boolean
): {
  semitones: number;
  candidateSemitones: readonly number[];
  contourRange: {
    minSemitones: number;
    targetSemitones: number;
    maxSemitones: number;
  };
  cadence: ProceduralLeadPhraseCadence;
  contourStage: ProceduralLeadContourStage;
  strongLeadBeat: boolean;
  structuralAccent: boolean;
} {
  const composition = resolveProceduralCompositionStep(
    theme,
    stepIndex,
    clusterX,
    clusterY,
    allowLeadAccidentals
  );
  const contourTargetRange = resolveProceduralLeadContourTargetRange(
    theme,
    stepIndex,
    clusterX,
    clusterY
  );
  const strongLeadBeat = resolveProceduralMeterPosition(stepIndex).isStrongBeat;
  const structuralAccent =
    composition.cadence === 'answer' ||
    composition.contourStep.stage === 'climax';

  if (composition.cadence === 'question') {
    return {
      semitones: chord.passingSemitones,
      candidateSemitones: [chord.passingSemitones],
      contourRange: contourTargetRange,
      cadence: composition.cadence,
      contourStage: composition.contourStep.stage,
      strongLeadBeat,
      structuralAccent,
    };
  }
  if (composition.cadence === 'answer') {
    return {
      semitones: chord.rootSemitones,
      candidateSemitones: [chord.rootSemitones],
      contourRange: contourTargetRange,
      cadence: composition.cadence,
      contourStage: composition.contourStep.stage,
      strongLeadBeat,
      structuralAccent,
    };
  }

  if (strongLeadBeat) {
    const chordTonePattern = [
      chord.rootSemitones,
      chord.thirdSemitones,
      chord.fifthSemitones,
      chord.thirdSemitones,
    ];
    return {
      semitones:
        chordTonePattern[Math.floor(stepIndex / 4) % chordTonePattern.length] ??
        chord.rootSemitones,
      candidateSemitones: chordTonePattern,
      contourRange: contourTargetRange,
      cadence: composition.cadence,
      contourStage: composition.contourStep.stage,
      strongLeadBeat,
      structuralAccent,
    };
  }

  const accidentalSemitones = allowLeadAccidentals
    ? resolveLeadAccidentalSemitones(
        theme,
        chord,
        stepIndex,
        clusterX,
        clusterY
      )
    : null;
  if (accidentalSemitones !== null) {
    return {
      semitones: accidentalSemitones,
      candidateSemitones: [accidentalSemitones],
      contourRange: contourTargetRange,
      cadence: composition.cadence,
      contourStage: composition.contourStep.stage,
      strongLeadBeat,
      structuralAccent,
    };
  }

  const melodicOptions = [
    contourTargetRange.targetSemitones,
    chord.passingSemitones,
    chord.thirdSemitones,
    chord.fifthSemitones,
  ];
  return {
    semitones: melodicOptions[0] ?? contourTargetRange.targetSemitones,
    candidateSemitones: melodicOptions,
    contourRange: contourTargetRange,
    cadence: composition.cadence,
    contourStage: composition.contourStep.stage,
    strongLeadBeat,
    structuralAccent,
  };
}

function selectPreferredLeadSemitoneClass(options: {
  candidates: readonly number[];
  previousSemitones: number | null;
  strongLeadBeat: boolean;
  structuralAccent: boolean;
  preferredIntervals?: readonly number[];
  previousLeapDistance?: number | null;
  priorLargeLeapCount?: number;
  repeatedPitchRunLength?: number;
  contourRange?: {
    minSemitones: number;
    targetSemitones: number;
    maxSemitones: number;
  };
}): number {
  const fallback = options.candidates[0] ?? 0;
  if (options.previousSemitones === null) {
    return fallback;
  }

  const rankedCandidates = rankLeadSemitoneCandidates(options);

  return rankedCandidates[0]?.candidate ?? clampLeadSemitone(fallback);
}

function rankLeadSemitoneCandidates(options: {
  candidates: readonly number[];
  previousSemitones: number;
  strongLeadBeat: boolean;
  structuralAccent: boolean;
  preferredIntervals?: readonly number[];
  previousLeapDistance?: number | null;
  priorLargeLeapCount?: number;
  repeatedPitchRunLength?: number;
  contourRange?: {
    minSemitones: number;
    targetSemitones: number;
    maxSemitones: number;
  };
}): Array<{
  candidate: number;
  index: number;
  distance: number;
}> {
  return options.candidates
    .flatMap((candidate, index) =>
      resolveLeadOctaveCandidates(
        options.previousSemitones,
        candidate,
        options.contourRange
      )
        .filter(
          (shiftedCandidate) =>
            shiftedCandidate >= LEAD_MIN_SEMITONES &&
            shiftedCandidate <= LEAD_MAX_SEMITONES
        )
        .map((shiftedCandidate) => ({
          candidate: shiftedCandidate,
          index,
          distance: Math.abs(shiftedCandidate - options.previousSemitones),
        }))
    )
    .sort((left, right) => {
      const leftPenalty = scoreProceduralLeadMotionPenalty({
        distance: left.distance,
        isPrimaryCandidate: left.index === 0,
        strongLeadBeat: options.strongLeadBeat,
        structuralAccent: options.structuralAccent,
        candidateSemitones: left.candidate,
        contourRange: options.contourRange,
        preferredIntervals: options.preferredIntervals,
        previousLeapDistance: options.previousLeapDistance,
        priorLargeLeapCount: options.priorLargeLeapCount,
        repeatedPitchRunLength: options.repeatedPitchRunLength,
      });
      const rightPenalty = scoreProceduralLeadMotionPenalty({
        distance: right.distance,
        isPrimaryCandidate: right.index === 0,
        strongLeadBeat: options.strongLeadBeat,
        structuralAccent: options.structuralAccent,
        candidateSemitones: right.candidate,
        contourRange: options.contourRange,
        preferredIntervals: options.preferredIntervals,
        previousLeapDistance: options.previousLeapDistance,
        priorLargeLeapCount: options.priorLargeLeapCount,
        repeatedPitchRunLength: options.repeatedPitchRunLength,
      });
      return leftPenalty - rightPenalty || left.index - right.index;
    });
}

function resolveLeadCounterMotionSemitones(options: {
  selectedSemitones: number;
  candidates: readonly number[];
  previousSemitones: number;
  previousBassSemitones: number;
  currentBassSemitones: number;
  cadence: ProceduralLeadPhraseCadence;
  structuralAccent: boolean;
  strongLeadBeat: boolean;
  contourRange?: {
    minSemitones: number;
    targetSemitones: number;
    maxSemitones: number;
  };
  preferredIntervals?: readonly number[];
  previousLeapDistance?: number | null;
  priorLargeLeapCount?: number;
  repeatedPitchRunLength?: number;
}): number {
  if (options.cadence !== 'neutral' || options.structuralAccent) {
    return options.selectedSemitones;
  }
  if ((options.repeatedPitchRunLength ?? 0) > 0) {
    return options.selectedSemitones;
  }

  const bassMotion =
    options.currentBassSemitones - options.previousBassSemitones;
  const leadMotion = options.selectedSemitones - options.previousSemitones;
  if (
    Math.abs(bassMotion) < 2 ||
    leadMotion === 0 ||
    Math.sign(leadMotion) !== Math.sign(bassMotion)
  ) {
    return options.selectedSemitones;
  }

  const contraryCandidate = rankLeadSemitoneCandidates({
    candidates: options.candidates,
    previousSemitones: options.previousSemitones,
    strongLeadBeat: options.strongLeadBeat,
    structuralAccent: options.structuralAccent,
    contourRange: options.contourRange,
    preferredIntervals: options.preferredIntervals,
    previousLeapDistance: options.previousLeapDistance,
    priorLargeLeapCount: options.priorLargeLeapCount,
    repeatedPitchRunLength: options.repeatedPitchRunLength,
  }).find((candidate) => {
    const candidateMotion = candidate.candidate - options.previousSemitones;
    return (
      candidateMotion !== 0 &&
      Math.sign(candidateMotion) === -Math.sign(bassMotion)
    );
  });

  return contraryCandidate?.candidate ?? options.selectedSemitones;
}

function resolveLeadOctaveCandidates(
  previousSemitones: number,
  candidateSemitones: number,
  contourRange?:
    | {
        minSemitones: number;
        targetSemitones: number;
        maxSemitones: number;
      }
    | undefined
): readonly number[] {
  const rawCandidates = [-12, 0, 12]
    .map((octaveShift) => candidateSemitones + octaveShift)
    .filter(
      (candidate) =>
        candidate >= LEAD_MIN_SEMITONES && candidate <= LEAD_MAX_SEMITONES
    );
  const contourBoundCandidates =
    contourRange === undefined
      ? rawCandidates
      : rawCandidates.filter(
          (candidate) =>
            candidate >= contourRange.minSemitones - 2 &&
            candidate <= contourRange.maxSemitones + 2
        );
  const candidates =
    contourBoundCandidates.length > 0 ? contourBoundCandidates : rawCandidates;

  candidates.sort((left, right) => {
    const leftContourDistance =
      contourRange === undefined
        ? 0
        : Math.abs(left - contourRange.targetSemitones);
    const rightContourDistance =
      contourRange === undefined
        ? 0
        : Math.abs(right - contourRange.targetSemitones);

    return (
      leftContourDistance - rightContourDistance ||
      Math.abs(left - previousSemitones) - Math.abs(right - previousSemitones)
    );
  });

  return candidates.slice(0, 2);
}

function clampLeadSemitone(targetSemitones: number): number {
  let candidate = targetSemitones;
  while (candidate > LEAD_MAX_SEMITONES) {
    candidate -= 12;
  }
  while (candidate < LEAD_MIN_SEMITONES) {
    candidate += 12;
  }
  return Math.min(LEAD_MAX_SEMITONES, Math.max(LEAD_MIN_SEMITONES, candidate));
}

function resolveNearbyScaleMotion(options: {
  scale: readonly number[];
  previousSemitones: number;
  direction: number;
  maxDistance: number;
  fallbackSemitones: number;
}): number {
  const direction = options.direction === 0 ? 1 : Math.sign(options.direction);
  for (
    let distance = 1;
    distance <= Math.max(1, options.maxDistance);
    distance += 1
  ) {
    const candidate = options.previousSemitones + direction * distance;
    if (isProceduralSemitoneInScale(options.scale, candidate)) {
      return candidate;
    }
  }
  return options.fallbackSemitones;
}

function resolveLeadAccidentalSemitones(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): number | null {
  const phraseLength = Math.max(1, theme.stepPattern.length);
  const phraseStep = stepIndex % phraseLength;
  const approachStep = Math.max(0, phraseLength - 3);
  if (phraseStep !== approachStep) {
    return null;
  }

  const accidentalSignal = hash2DWithSeed(
    MUSIC_ACCIDENTAL_SEED,
    clusterX + stepIndex + theme.id.length * 11,
    clusterY - stepIndex - theme.id.length * 3
  );
  if (accidentalSignal <= 0.95) {
    return null;
  }

  const lowerApproach = chord.rootSemitones - 1;
  if (!isProceduralSemitoneInScale(theme.scale, lowerApproach)) {
    return lowerApproach;
  }
  const upperApproach = chord.rootSemitones + 1;
  if (!isProceduralSemitoneInScale(theme.scale, upperApproach)) {
    return upperApproach;
  }
  return null;
}

function countPriorLargeLeadLeapsInPhrase(options: {
  theme: ProceduralHarmonyTheme;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  allowLeadAccidentals: boolean;
  memo: Map<number, number>;
  threshold: number;
}): number {
  const phraseLength = Math.max(1, options.theme.stepPattern.length);
  const phraseStart =
    Math.floor(options.stepIndex / phraseLength) * phraseLength;
  let count = 0;

  for (
    let index = Math.max(phraseStart + 1, 1);
    index < options.stepIndex;
    index += 1
  ) {
    const current = resolveLeadSemitonesCached(
      options.theme,
      resolveProceduralChordAtStep(
        options.theme,
        index,
        options.clusterX,
        options.clusterY
      ),
      index,
      options.clusterX,
      options.clusterY,
      options.allowLeadAccidentals,
      options.memo
    );
    const previous = resolveLeadSemitonesCached(
      options.theme,
      resolveProceduralChordAtStep(
        options.theme,
        index - 1,
        options.clusterX,
        options.clusterY
      ),
      index - 1,
      options.clusterX,
      options.clusterY,
      options.allowLeadAccidentals,
      options.memo
    );
    if (Math.abs(current - previous) > options.threshold) {
      count += 1;
    }
  }

  return count;
}

function countTrailingRepeatedLeadPitchInPhrase(options: {
  theme: ProceduralHarmonyTheme;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  allowLeadAccidentals: boolean;
  memo: Map<number, number>;
}): number {
  if (options.stepIndex <= 0) {
    return 0;
  }

  const phraseLength = Math.max(1, options.theme.stepPattern.length);
  const phraseStart =
    Math.floor(options.stepIndex / phraseLength) * phraseLength;
  const previousStepIndex = options.stepIndex - 1;
  const previousSemitones = resolveLeadSemitonesCached(
    options.theme,
    resolveProceduralChordAtStep(
      options.theme,
      previousStepIndex,
      options.clusterX,
      options.clusterY
    ),
    previousStepIndex,
    options.clusterX,
    options.clusterY,
    options.allowLeadAccidentals,
    options.memo
  );
  let runLength = 1;

  for (let index = previousStepIndex - 1; index >= phraseStart; index -= 1) {
    const currentSemitones = resolveLeadSemitonesCached(
      options.theme,
      resolveProceduralChordAtStep(
        options.theme,
        index,
        options.clusterX,
        options.clusterY
      ),
      index,
      options.clusterX,
      options.clusterY,
      options.allowLeadAccidentals,
      options.memo
    );

    if (currentSemitones !== previousSemitones) {
      break;
    }
    runLength += 1;
  }

  return runLength;
}

function shapeLeadSemitonesForContourStage(options: {
  theme: ProceduralHarmonyTheme;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  allowLeadAccidentals: boolean;
  memo: Map<number, number>;
  selectedSemitones: number;
  previousSemitones: number;
  previousContourStage: ProceduralLeadContourStage;
  currentContourStage: ProceduralLeadContourStage;
  currentContourRange: {
    minSemitones: number;
    targetSemitones: number;
    maxSemitones: number;
  };
}): number {
  const phraseStartStep = resolveLeadPhraseStartStep(
    options.theme,
    options.stepIndex
  );
  const phraseStepCount = resolveLeadPhraseStepCount(options.theme);
  const phraseEndStep = phraseStartStep + phraseStepCount - 1;
  const priorPhraseMaxSemitones = resolvePriorLeadPhraseMaxSemitones({
    theme: options.theme,
    stepIndex: options.stepIndex,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
    allowLeadAccidentals: options.allowLeadAccidentals,
    memo: options.memo,
  });
  const plannedClimaxWindow = resolveLeadPhraseClimaxWindow({
    theme: options.theme,
    phraseStartStep,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
  });
  let selectedSemitones = options.selectedSemitones;

  if (options.currentContourStage === 'climax') {
    if (options.previousContourStage !== 'climax') {
      selectedSemitones =
        resolveScaleAtOrAbove(
          options.theme.scale,
          Math.max(
            options.currentContourRange.targetSemitones,
            priorPhraseMaxSemitones + 2
          ),
          LEAD_MAX_SEMITONES
        ) ?? selectedSemitones;
    } else if (selectedSemitones >= priorPhraseMaxSemitones) {
      selectedSemitones =
        resolveScaleAtOrBelow(
          options.theme.scale,
          Math.max(
            options.currentContourRange.minSemitones,
            priorPhraseMaxSemitones - 1
          ),
          LEAD_MIN_SEMITONES
        ) ?? selectedSemitones;
    }
  }

  if (
    options.stepIndex < plannedClimaxWindow.firstClimaxStep &&
    selectedSemitones >= plannedClimaxWindow.plannedClimaxTargetSemitones
  ) {
    selectedSemitones =
      resolveScaleAtOrBelow(
        options.theme.scale,
        plannedClimaxWindow.plannedClimaxTargetSemitones - 1,
        LEAD_MIN_SEMITONES
      ) ?? selectedSemitones;
  }

  if (
    options.currentContourStage === 'descend' ||
    options.currentContourStage === 'resolve'
  ) {
    if (selectedSemitones > options.previousSemitones) {
      selectedSemitones =
        resolveScaleAtOrBelow(
          options.theme.scale,
          options.previousSemitones - 1,
          LEAD_MIN_SEMITONES
        ) ?? options.previousSemitones;
    }
    if (options.previousSemitones - selectedSemitones > 3) {
      selectedSemitones = resolveNearbyScaleMotion({
        scale: options.theme.scale,
        previousSemitones: options.previousSemitones,
        direction: -1,
        maxDistance: 3,
        fallbackSemitones: options.previousSemitones - 3,
      });
    }
  }

  if (
    options.currentContourStage === 'resolve' &&
    options.stepIndex >= phraseEndStep - 1
  ) {
    selectedSemitones =
      resolveNearestTonicAtOrBelow(
        options.theme.scale,
        options.previousSemitones
      ) ?? selectedSemitones;
  }

  return selectedSemitones;
}

function resolveLeadPhraseStepCount(theme: ProceduralHarmonyTheme): number {
  return Math.max(
    1,
    theme.stepPattern.length * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
  );
}

function resolveLeadPhraseStartStep(
  theme: ProceduralHarmonyTheme,
  stepIndex: number
): number {
  const phraseStepCount = resolveLeadPhraseStepCount(theme);
  return Math.floor(stepIndex / phraseStepCount) * phraseStepCount;
}

function resolvePriorLeadPhraseMaxSemitones(options: {
  theme: ProceduralHarmonyTheme;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  allowLeadAccidentals: boolean;
  memo: Map<number, number>;
}): number {
  const phraseStartStep = resolveLeadPhraseStartStep(
    options.theme,
    options.stepIndex
  );
  let maxSemitones = LEAD_MIN_SEMITONES;

  for (let index = phraseStartStep; index < options.stepIndex; index += 1) {
    const semitones = resolveLeadSemitonesCached(
      options.theme,
      resolveProceduralChordAtStep(
        options.theme,
        index,
        options.clusterX,
        options.clusterY
      ),
      index,
      options.clusterX,
      options.clusterY,
      options.allowLeadAccidentals,
      options.memo
    );
    maxSemitones = Math.max(maxSemitones, semitones);
  }

  return maxSemitones;
}

function resolveLeadPhraseClimaxWindow(options: {
  theme: ProceduralHarmonyTheme;
  phraseStartStep: number;
  clusterX: number;
  clusterY: number;
}): {
  firstClimaxStep: number;
  lastClimaxStep: number;
  plannedClimaxTargetSemitones: number;
} {
  const phraseStepCount = resolveLeadPhraseStepCount(options.theme);
  let firstClimaxStep = options.phraseStartStep + phraseStepCount - 1;
  let lastClimaxStep = firstClimaxStep;
  let plannedClimaxTargetSemitones = LEAD_MIN_SEMITONES;

  for (
    let index = options.phraseStartStep;
    index < options.phraseStartStep + phraseStepCount;
    index += 1
  ) {
    const range = resolveProceduralLeadContourTargetRange(
      options.theme,
      index,
      options.clusterX,
      options.clusterY
    );
    if (range.stage !== 'climax') {
      continue;
    }
    firstClimaxStep = Math.min(firstClimaxStep, index);
    lastClimaxStep = Math.max(lastClimaxStep, index);
    plannedClimaxTargetSemitones = Math.max(
      plannedClimaxTargetSemitones,
      range.targetSemitones
    );
  }

  return {
    firstClimaxStep,
    lastClimaxStep,
    plannedClimaxTargetSemitones,
  };
}

function resolveScaleAtOrAbove(
  scale: readonly number[],
  minimumSemitones: number,
  ceilingSemitones: number
): number | null {
  for (
    let semitones = minimumSemitones;
    semitones <= ceilingSemitones;
    semitones += 1
  ) {
    if (isProceduralSemitoneInScale(scale, semitones)) {
      return semitones;
    }
  }
  return null;
}

function resolveScaleAtOrBelow(
  scale: readonly number[],
  maximumSemitones: number,
  floorSemitones: number
): number | null {
  for (
    let semitones = maximumSemitones;
    semitones >= floorSemitones;
    semitones -= 1
  ) {
    if (isProceduralSemitoneInScale(scale, semitones)) {
      return semitones;
    }
  }
  return null;
}

function resolveNearestTonicAtOrBelow(
  scale: readonly number[],
  previousSemitones: number
): number | null {
  for (
    let semitones = previousSemitones;
    semitones >= LEAD_MIN_SEMITONES;
    semitones -= 1
  ) {
    if (
      isProceduralSemitoneInScale(scale, semitones) &&
      ((semitones % 12) + 12) % 12 === 0
    ) {
      return semitones;
    }
  }
  return null;
}
