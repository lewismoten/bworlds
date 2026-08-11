export type ProceduralLeadContourRange = {
  minSemitones: number;
  targetSemitones: number;
  maxSemitones: number;
};

export type ProceduralLeadMotionPenaltyOptions = {
  distance: number;
  isPrimaryCandidate: boolean;
  strongLeadBeat: boolean;
  structuralAccent: boolean;
  candidateSemitones: number;
  contourRange?: ProceduralLeadContourRange;
  preferredIntervals?: readonly number[];
  previousLeapDistance?: number | null;
  priorLargeLeapCount?: number;
  repeatedPitchRunLength?: number;
};

const PROCEDURAL_MINOR_SIXTH_INTERVAL = 8;
const PROCEDURAL_ORDINARY_LEAP_LIMIT = 3;
const PROCEDURAL_STEPWISE_RECOVERY_LIMIT = 2;

export function scoreProceduralLeadMotionPenalty(
  options: ProceduralLeadMotionPenaltyOptions
): number {
  const contourPenalty = resolveProceduralLeadContourPenalty(
    options.candidateSemitones,
    options.contourRange
  );
  const preferencePenalty = resolvePreferredIntervalPenalty(
    options.distance,
    options.preferredIntervals
  );
  const repeatedMinorSixthPenalty =
    options.distance === PROCEDURAL_MINOR_SIXTH_INTERVAL &&
    options.previousLeapDistance === PROCEDURAL_MINOR_SIXTH_INTERVAL
      ? 96
      : 0;
  const repeatedLargeLeapPenalty =
    options.distance > PROCEDURAL_ORDINARY_LEAP_LIMIT &&
    (options.priorLargeLeapCount ?? 0) > 0
      ? 140
      : 0;
  const repeatedPitchPenalty =
    options.distance === 0
      ? resolveRepeatedPitchPenalty(
          options.repeatedPitchRunLength ?? 0,
          options.strongLeadBeat,
          options.structuralAccent
        )
      : 0;
  const ordinaryLeapPenalty =
    options.distance === PROCEDURAL_ORDINARY_LEAP_LIMIT + 1 &&
    !options.structuralAccent
      ? 12
      : 0;
  const recoveryPenalty = resolvePostLeapRecoveryPenalty(options);
  const isStepOrThird = options.distance <= PROCEDURAL_ORDINARY_LEAP_LIMIT;

  if (isStepOrThird) {
    return (
      options.distance +
      contourPenalty +
      preferencePenalty +
      repeatedMinorSixthPenalty +
      repeatedLargeLeapPenalty +
      repeatedPitchPenalty +
      recoveryPenalty +
      (options.isPrimaryCandidate ? -0.75 : 0)
    );
  }

  if (
    options.strongLeadBeat &&
    options.structuralAccent &&
    options.distance <= 7
  ) {
    return (
      24 +
      options.distance * 2 +
      contourPenalty +
      preferencePenalty +
      repeatedMinorSixthPenalty +
      repeatedLargeLeapPenalty +
      repeatedPitchPenalty +
      ordinaryLeapPenalty +
      recoveryPenalty +
      (options.isPrimaryCandidate ? -0.1 : 0)
    );
  }

  return (
    160 +
    options.distance * 14 +
    contourPenalty +
    preferencePenalty +
    repeatedMinorSixthPenalty +
    repeatedLargeLeapPenalty +
    repeatedPitchPenalty +
    ordinaryLeapPenalty +
    recoveryPenalty +
    (options.isPrimaryCandidate ? -0.05 : 0)
  );
}

function resolvePostLeapRecoveryPenalty(
  options: ProceduralLeadMotionPenaltyOptions
): number {
  if (
    (options.previousLeapDistance ?? 0) <= PROCEDURAL_ORDINARY_LEAP_LIMIT ||
    options.distance <= PROCEDURAL_STEPWISE_RECOVERY_LIMIT
  ) {
    return 0;
  }

  if (options.structuralAccent && options.strongLeadBeat) {
    return 6 + (options.distance - PROCEDURAL_STEPWISE_RECOVERY_LIMIT) * 4;
  }

  return 24 + (options.distance - PROCEDURAL_STEPWISE_RECOVERY_LIMIT) * 12;
}

function resolveRepeatedPitchPenalty(
  repeatedPitchRunLength: number,
  strongLeadBeat: boolean,
  structuralAccent: boolean
): number {
  if (repeatedPitchRunLength <= 0) {
    return 0;
  }

  if (structuralAccent && strongLeadBeat) {
    return 3 + repeatedPitchRunLength * 3;
  }

  return 10 + repeatedPitchRunLength * 12;
}

function resolvePreferredIntervalPenalty(
  distance: number,
  preferredIntervals: readonly number[] | undefined
): number {
  if (!preferredIntervals || preferredIntervals.length === 0) {
    return 0;
  }
  if (preferredIntervals.includes(distance)) {
    return -2.5;
  }
  if (
    preferredIntervals.some(
      (preferredInterval) => Math.abs(preferredInterval - distance) === 1
    )
  ) {
    return -0.75;
  }

  return distance <= 7 ? 1.5 : 4;
}

function resolveProceduralLeadContourPenalty(
  candidateSemitones: number,
  contourRange: ProceduralLeadContourRange | undefined
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
