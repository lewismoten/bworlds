import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import {
  getProceduralScaleDegreeSemitones,
  isProceduralSemitoneInMode,
} from './procedural-music-scale.ts';
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

export type ProceduralChord = {
  degreeIndex: number;
  progressionIndex: number;
  rootSemitones: number;
  thirdSemitones: number;
  fifthSemitones: number;
  passingSemitones: number;
};

export type ProceduralLeadMotif = {
  degreeOffsets: readonly number[];
};

export type ProceduralLeadPhraseCadence = 'neutral' | 'question' | 'answer';

export type ProceduralLeadContourStage =
  'start' | 'rise' | 'climax' | 'descend' | 'resolve';

export type ProceduralLeadContourStep = {
  stage: ProceduralLeadContourStage;
  degreeOffset: number;
};

export type ProceduralCompositionStep = {
  chord: ProceduralChord;
  cadence: ProceduralLeadPhraseCadence;
  contourStep: ProceduralLeadContourStep;
  motifDegreeOffset: number;
  phraseStep: number;
};

const MUSIC_PROGRESSION_SEED = registerHashLabel('music-progression');
const MUSIC_MOTIF_SEED = registerHashLabel('music-lead-motif');
const MUSIC_LEAP_SEED = registerHashLabel('music-leap-motion');
const MUSIC_ACCIDENTAL_SEED = registerHashLabel('music-accidental-motion');
const MUSIC_CONTOUR_SEED = registerHashLabel('music-lead-contour');
const PROGRESSION_PATTERNS = [
  [0, 3, 4, 0],
  [0, 4, 5, 0],
  [0, 5, 3, 4],
  [0, 2, 5, 0],
] as const;
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

export function resolveProceduralChordProgression(
  theme: ProceduralHarmonyTheme,
  clusterX: number,
  clusterY: number
): readonly number[] {
  const patternIndex = Math.floor(
    hash2DWithSeed(
      MUSIC_PROGRESSION_SEED,
      clusterX + theme.id.length * 17,
      clusterY - theme.id.length * 13
    ) * PROGRESSION_PATTERNS.length
  );
  return PROGRESSION_PATTERNS[patternIndex] ?? PROGRESSION_PATTERNS[0];
}

export function resolveProceduralLeadMotif(
  theme: ProceduralHarmonyTheme,
  clusterX: number,
  clusterY: number
): ProceduralLeadMotif {
  if (theme.motif?.recognitionDegreeOffsets?.length) {
    return {
      degreeOffsets: theme.motif.recognitionDegreeOffsets,
    };
  }

  const candidatePatterns = getPreferredMotifPatterns(theme);
  const patternIndex = Math.floor(
    hash2DWithSeed(
      MUSIC_MOTIF_SEED,
      clusterX - theme.id.length * 29,
      clusterY + theme.id.length * 19
    ) * candidatePatterns.length
  );
  return {
    degreeOffsets: candidatePatterns[patternIndex] ?? candidatePatterns[0],
  };
}

export function resolveProceduralLeadPhraseCadence(
  theme: ProceduralHarmonyTheme,
  stepIndex: number
): ProceduralLeadPhraseCadence {
  const phraseLength = Math.max(1, theme.stepPattern.length);
  const phraseStep = stepIndex % phraseLength;
  const questionStep = Math.max(0, Math.floor(phraseLength / 2) - 1);
  const answerStep = phraseLength - 1;

  if (phraseStep === questionStep) {
    return 'question';
  }
  if (phraseStep === answerStep) {
    return 'answer';
  }
  return 'neutral';
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
    let stage: ProceduralLeadContourStage = 'rise';
    let degreeOffset = 1 + contourBias;

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
      degreeOffset,
    });
  }

  return contour;
}

export function resolveProceduralCompositionStep(
  theme: ProceduralHarmonyTheme,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): ProceduralCompositionStep {
  const motif = resolveProceduralLeadMotif(theme, clusterX, clusterY);
  const contour = resolveProceduralLeadContour(theme, clusterX, clusterY);
  const phraseLength = Math.max(1, theme.stepPattern.length);
  const phraseStep = stepIndex % phraseLength;

  return {
    chord: resolveProceduralChordAtStep(theme, stepIndex, clusterX, clusterY),
    cadence: resolveProceduralLeadPhraseCadence(theme, stepIndex),
    contourStep: contour[phraseStep] ??
      contour[0] ?? { stage: 'start', degreeOffset: 0 },
    motifDegreeOffset:
      motif.degreeOffsets[phraseStep % motif.degreeOffsets.length] ?? 0,
    phraseStep,
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
  const progression = resolveProceduralChordProgression(
    theme,
    clusterX,
    clusterY
  );
  const progressionIndex = Math.floor(stepIndex / 4) % progression.length;
  const degreeIndex = progression[progressionIndex] ?? progression[0] ?? 0;

  return createProceduralChord(theme, degreeIndex, progressionIndex);
}

export function resolveProceduralInstrumentSemitones(options: {
  theme: ProceduralHarmonyTheme;
  role: ProceduralHarmonyRole;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
}): number {
  const chord = resolveProceduralChordAtStep(
    options.theme,
    options.stepIndex,
    options.clusterX,
    options.clusterY
  );

  if (options.role === 'bass') {
    return resolveBassSemitones(chord, options.stepIndex);
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
    options.clusterY
  );
}

function createProceduralChord(
  theme: ProceduralHarmonyTheme,
  degreeIndex: number,
  progressionIndex: number
): ProceduralChord {
  const rootSemitones = getProceduralScaleDegreeSemitones(
    theme.scale,
    degreeIndex
  );
  const thirdSemitones = getProceduralScaleDegreeSemitones(
    theme.scale,
    degreeIndex + 2
  );
  const fifthSemitones = getProceduralScaleDegreeSemitones(
    theme.scale,
    degreeIndex + 4
  );
  const passingSemitones = getProceduralScaleDegreeSemitones(
    theme.scale,
    degreeIndex + 1
  );

  return {
    degreeIndex,
    progressionIndex,
    rootSemitones,
    thirdSemitones,
    fifthSemitones,
    passingSemitones,
  };
}

function resolveBassSemitones(
  chord: ProceduralChord,
  stepIndex: number
): number {
  const bassPulseIndex = Math.floor(stepIndex / 4);
  const bassPattern = [
    chord.rootSemitones,
    chord.fifthSemitones,
    chord.rootSemitones,
    chord.rootSemitones + 12,
    chord.rootSemitones,
    chord.passingSemitones,
  ];
  return (
    bassPattern[bassPulseIndex % bassPattern.length] ?? chord.rootSemitones
  );
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
  clusterY: number
): number {
  const current = resolveLeadSemitonePlan(
    theme,
    chord,
    stepIndex,
    clusterX,
    clusterY
  );
  if (stepIndex <= 0) {
    return current.semitones;
  }

  const previous = resolveLeadSemitonePlan(
    theme,
    resolveProceduralChordAtStep(theme, stepIndex - 1, clusterX, clusterY),
    stepIndex - 1,
    clusterX,
    clusterY
  );
  const leap = current.semitones - previous.semitones;
  const leapMagnitude = Math.abs(leap);
  const allowLargeLeap =
    current.cadence === 'answer' ||
    (current.strongLeadBeat &&
      hash2DWithSeed(
        MUSIC_LEAP_SEED,
        clusterX + stepIndex + theme.id.length * 7,
        clusterY - stepIndex - theme.id.length * 5
      ) > 0.9);

  if (!allowLargeLeap && leapMagnitude > 7) {
    return previous.semitones + Math.sign(leap) * 5;
  }

  if (stepIndex > 1) {
    const previousPrevious = resolveLeadSemitonePlan(
      theme,
      resolveProceduralChordAtStep(theme, stepIndex - 2, clusterX, clusterY),
      stepIndex - 2,
      clusterX,
      clusterY
    );
    const priorLeap = previous.semitones - previousPrevious.semitones;
    if (
      Math.abs(priorLeap) > 7 &&
      Math.sign(priorLeap) === Math.sign(leap) &&
      leapMagnitude > 2
    ) {
      return (
        previous.semitones -
        Math.sign(priorLeap) * Math.min(4, Math.abs(priorLeap) - 2)
      );
    }
  }

  return current.semitones;
}

function resolveLeadSemitonePlan(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): {
  semitones: number;
  cadence: ProceduralLeadPhraseCadence;
  strongLeadBeat: boolean;
} {
  const composition = resolveProceduralCompositionStep(
    theme,
    stepIndex,
    clusterX,
    clusterY
  );
  const melodyPatternIndex =
    chord.degreeIndex +
    composition.motifDegreeOffset +
    composition.contourStep.degreeOffset;
  const leadScaleSemitones = getProceduralScaleDegreeSemitones(
    theme.scale,
    melodyPatternIndex
  );
  const strongLeadBeat = resolveProceduralMeterPosition(stepIndex).isStrongBeat;

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
      cadence: composition.cadence,
      strongLeadBeat,
    };
  }

  if (composition.cadence === 'question') {
    return {
      semitones: chord.passingSemitones,
      cadence: composition.cadence,
      strongLeadBeat,
    };
  }
  if (composition.cadence === 'answer') {
    return {
      semitones: chord.rootSemitones,
      cadence: composition.cadence,
      strongLeadBeat,
    };
  }

  const accidentalSemitones = resolveLeadAccidentalSemitones(
    theme,
    chord,
    stepIndex,
    clusterX,
    clusterY
  );
  if (accidentalSemitones !== null) {
    return {
      semitones: accidentalSemitones,
      cadence: composition.cadence,
      strongLeadBeat,
    };
  }

  const melodicOptions = [
    leadScaleSemitones,
    chord.passingSemitones,
    chord.thirdSemitones,
    chord.fifthSemitones,
  ];
  return {
    semitones:
      melodicOptions[composition.phraseStep % melodicOptions.length] ??
      leadScaleSemitones,
    cadence: composition.cadence,
    strongLeadBeat,
  };
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
  if (accidentalSignal <= 0.72) {
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
