import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import { resolveProceduralHarmonyChordVoicing } from './procedural-music-harmony-voicing.ts';
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
  minDegreeOffset: number;
  degreeOffset: number;
  maxDegreeOffset: number;
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
const BASS_MIN_SEMITONES = -7;
const BASS_MAX_SEMITONES = 12;
const LEAD_MIN_SEMITONES = 0;
const LEAD_MAX_SEMITONES = 19;
const LARGE_LEAP_LIMIT_SEMITONES = 7;
const OCTAVE_LEAP_LIMIT_SEMITONES = 12;
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
      contour[0] ?? {
        stage: 'start',
        minDegreeOffset: 0,
        degreeOffset: 0,
        maxDegreeOffset: 0,
      },
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
    options.clusterY
  );
}

export function resolveProceduralHarmonyVoicing(options: {
  theme: ProceduralHarmonyTheme;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
}): readonly number[] {
  const chord = resolveProceduralChordAtStep(
    options.theme,
    options.stepIndex,
    options.clusterX,
    options.clusterY
  );
  const previousChord =
    options.stepIndex > 0
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
  });
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
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): number {
  const candidates = resolveBassSemitoneCandidates(chord, stepIndex);
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
  const bassPulseIndex = Math.floor(stepIndex / 4);
  const phrasePulse = bassPulseIndex % 4;
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
  chord: ProceduralChord,
  stepIndex: number
): readonly number[] {
  const bassPulseIndex = Math.floor(stepIndex / 4);
  const phrasePulse = bassPulseIndex % 4;
  if (phrasePulse === 0) {
    return [chord.rootSemitones, chord.fifthSemitones];
  }
  if (phrasePulse === 1) {
    return [chord.fifthSemitones, chord.rootSemitones];
  }
  if (phrasePulse === 2) {
    return [
      chord.rootSemitones + 12,
      chord.rootSemitones,
      chord.fifthSemitones,
    ];
  }
  return [chord.passingSemitones, chord.rootSemitones];
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
  clusterY: number
): number {
  return resolveLeadSemitonesCached(
    theme,
    chord,
    stepIndex,
    clusterX,
    clusterY,
    new Map<number, number>()
  );
}

function resolveLeadSemitonesCached(
  theme: ProceduralHarmonyTheme,
  chord: ProceduralChord,
  stepIndex: number,
  clusterX: number,
  clusterY: number,
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
    clusterY
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
      clusterY
    ),
    semitones: resolveLeadSemitonesCached(
      theme,
      previousChord,
      stepIndex - 1,
      clusterX,
      clusterY,
      memo
    ),
  };
  const selectedCurrentSemitones = selectPreferredLeadSemitoneClass({
    candidates: current.candidateSemitones,
    previousSemitones: previous.semitones,
    strongLeadBeat: current.strongLeadBeat,
    structuralAccent: current.structuralAccent,
    contourRange: current.contourRange,
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
    leapMagnitude > 4
  ) {
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

  if (current.cadence !== 'answer' && leapMagnitude > 5) {
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
        clusterY
      ),
      semitones: resolveLeadSemitonesCached(
        theme,
        previousPreviousChord,
        stepIndex - 2,
        clusterX,
        clusterY,
        memo
      ),
    };
    const priorLeap = previous.semitones - previousPrevious.semitones;
    if (
      Math.abs(priorLeap) > LARGE_LEAP_LIMIT_SEMITONES &&
      (Math.sign(priorLeap) === Math.sign(leap) || Math.abs(leap) <= 1)
    ) {
      return commit(
        resolveNearbyScaleMotion({
          scale: theme.scale,
          previousSemitones: previous.semitones,
          direction: -Math.sign(priorLeap),
          maxDistance: Math.min(4, Math.abs(priorLeap) - 2),
          fallbackSemitones:
            previous.semitones -
            Math.sign(priorLeap) * Math.min(4, Math.abs(priorLeap) - 2),
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
  clusterY: number
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
  const minLeadScaleSemitones = getProceduralScaleDegreeSemitones(
    theme.scale,
    chord.degreeIndex +
      composition.motifDegreeOffset +
      composition.contourStep.minDegreeOffset
  );
  const maxLeadScaleSemitones = getProceduralScaleDegreeSemitones(
    theme.scale,
    chord.degreeIndex +
      composition.motifDegreeOffset +
      composition.contourStep.maxDegreeOffset
  );
  const strongLeadBeat = resolveProceduralMeterPosition(stepIndex).isStrongBeat;
  const structuralAccent =
    composition.cadence === 'answer' ||
    composition.contourStep.stage === 'climax';

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
      contourRange: {
        minSemitones: minLeadScaleSemitones,
        targetSemitones: leadScaleSemitones,
        maxSemitones: maxLeadScaleSemitones,
      },
      cadence: composition.cadence,
      contourStage: composition.contourStep.stage,
      strongLeadBeat,
      structuralAccent,
    };
  }

  if (composition.cadence === 'question') {
    return {
      semitones: chord.passingSemitones,
      candidateSemitones: [chord.passingSemitones],
      contourRange: {
        minSemitones: minLeadScaleSemitones,
        targetSemitones: leadScaleSemitones,
        maxSemitones: maxLeadScaleSemitones,
      },
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
      contourRange: {
        minSemitones: minLeadScaleSemitones,
        targetSemitones: leadScaleSemitones,
        maxSemitones: maxLeadScaleSemitones,
      },
      cadence: composition.cadence,
      contourStage: composition.contourStep.stage,
      strongLeadBeat,
      structuralAccent,
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
      candidateSemitones: [accidentalSemitones],
      contourRange: {
        minSemitones: minLeadScaleSemitones,
        targetSemitones: leadScaleSemitones,
        maxSemitones: maxLeadScaleSemitones,
      },
      cadence: composition.cadence,
      contourStage: composition.contourStep.stage,
      strongLeadBeat,
      structuralAccent,
    };
  }

  const melodicOptions = [
    leadScaleSemitones,
    chord.passingSemitones,
    chord.thirdSemitones,
    chord.fifthSemitones,
  ];
  return {
    semitones: melodicOptions[0] ?? leadScaleSemitones,
    candidateSemitones: melodicOptions,
    contourRange: {
      minSemitones: minLeadScaleSemitones,
      targetSemitones: leadScaleSemitones,
      maxSemitones: maxLeadScaleSemitones,
    },
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

  const rankedCandidates = options.candidates
    .flatMap((candidate, index) =>
      resolveLeadOctaveCandidates(options.previousSemitones ?? 0, candidate)
        .filter(
          (shiftedCandidate) =>
            shiftedCandidate >= LEAD_MIN_SEMITONES &&
            shiftedCandidate <= LEAD_MAX_SEMITONES
        )
        .map((shiftedCandidate) => ({
          candidate: shiftedCandidate,
          index,
          distance: Math.abs(
            shiftedCandidate - (options.previousSemitones ?? 0)
          ),
        }))
    )
    .sort((left, right) => {
      const leftPenalty = scoreLeadMotionPenalty({
        distance: left.distance,
        isPrimaryCandidate: left.index === 0,
        strongLeadBeat: options.strongLeadBeat,
        structuralAccent: options.structuralAccent,
        candidateSemitones: left.candidate,
        contourRange: options.contourRange,
      });
      const rightPenalty = scoreLeadMotionPenalty({
        distance: right.distance,
        isPrimaryCandidate: right.index === 0,
        strongLeadBeat: options.strongLeadBeat,
        structuralAccent: options.structuralAccent,
        candidateSemitones: right.candidate,
        contourRange: options.contourRange,
      });
      return leftPenalty - rightPenalty || left.index - right.index;
    });

  return rankedCandidates[0]?.candidate ?? clampLeadSemitone(fallback);
}

function resolveLeadOctaveCandidates(
  previousSemitones: number,
  candidateSemitones: number
): readonly number[] {
  const candidates: number[] = [];
  for (let octaveShift = -24; octaveShift <= 24; octaveShift += 12) {
    candidates.push(candidateSemitones + octaveShift);
  }
  candidates.sort(
    (left, right) =>
      Math.abs(left - previousSemitones) - Math.abs(right - previousSemitones)
  );
  return candidates.slice(0, 3);
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

function scoreLeadMotionPenalty(options: {
  distance: number;
  isPrimaryCandidate: boolean;
  strongLeadBeat: boolean;
  structuralAccent: boolean;
  candidateSemitones: number;
  contourRange?: {
    minSemitones: number;
    targetSemitones: number;
    maxSemitones: number;
  };
}): number {
  const contourPenalty = resolveLeadContourPenalty(
    options.candidateSemitones,
    options.contourRange
  );
  const isStepOrThird = options.distance <= 4;
  if (isStepOrThird) {
    return (
      options.distance +
      contourPenalty +
      (options.isPrimaryCandidate ? -0.75 : 0)
    );
  }

  if (
    options.strongLeadBeat &&
    options.structuralAccent &&
    options.distance <= LARGE_LEAP_LIMIT_SEMITONES
  ) {
    return (
      24 +
      options.distance * 2 +
      contourPenalty +
      (options.isPrimaryCandidate ? -0.1 : 0)
    );
  }

  return (
    160 +
    options.distance * 14 +
    contourPenalty +
    (options.isPrimaryCandidate ? -0.05 : 0)
  );
}

function resolveLeadContourPenalty(
  candidateSemitones: number,
  contourRange:
    | {
        minSemitones: number;
        targetSemitones: number;
        maxSemitones: number;
      }
    | undefined
): number {
  if (!contourRange) {
    return 0;
  }

  if (candidateSemitones < contourRange.minSemitones) {
    return (contourRange.minSemitones - candidateSemitones) * 0.75;
  }
  if (candidateSemitones > contourRange.maxSemitones) {
    return (candidateSemitones - contourRange.maxSemitones) * 0.75;
  }
  return Math.abs(candidateSemitones - contourRange.targetSemitones) * 0.08;
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
