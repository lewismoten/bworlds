type ProceduralHarmonyTriad = {
  rootSemitones: number;
  thirdSemitones: number;
  fifthSemitones: number;
};

const HARMONY_VOICING_MIN_SEMITONES = 8;
const HARMONY_VOICING_MAX_SEMITONES = 32;

export function resolveProceduralHarmonyChordVoicing(options: {
  chord: ProceduralHarmonyTriad;
  previousChord?: ProceduralHarmonyTriad | null;
}): readonly number[] {
  const currentCandidates = createChordVoicingCandidates(options.chord);
  if (!options.previousChord) {
    return currentCandidates[0] ?? [];
  }

  const previousVoicing =
    createChordVoicingCandidates(options.previousChord)[0] ?? [];
  let bestVoicing = currentCandidates[0] ?? [];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of currentCandidates) {
    const distance = scoreVoicingDistance(candidate, previousVoicing);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestVoicing = candidate;
    }
  }

  return bestVoicing;
}

function createChordVoicingCandidates(
  chord: ProceduralHarmonyTriad
): readonly (readonly number[])[] {
  const inversionSeeds = [
    [
      chord.rootSemitones + 12,
      chord.thirdSemitones + 12,
      chord.fifthSemitones + 12,
    ],
    [
      chord.thirdSemitones + 12,
      chord.fifthSemitones + 12,
      chord.rootSemitones + 24,
    ],
    [
      chord.fifthSemitones + 12,
      chord.rootSemitones + 24,
      chord.thirdSemitones + 24,
    ],
  ] as const;
  const candidates: number[][] = [];
  const seen = new Set<string>();

  for (const inversionSeed of inversionSeeds) {
    for (const octaveShift of [-12, 0, 12]) {
      const candidate = normalizeVoicingCandidate(
        inversionSeed.map((semitones) => semitones + octaveShift)
      );
      if (!candidate) {
        continue;
      }
      const signature = candidate.join(',');
      if (seen.has(signature)) {
        continue;
      }
      seen.add(signature);
      candidates.push(candidate);
    }
  }

  return candidates;
}

function normalizeVoicingCandidate(
  candidate: readonly number[]
): number[] | null {
  const normalized = [...candidate].sort((left, right) => left - right);
  for (let index = 1; index < normalized.length; index += 1) {
    while ((normalized[index] ?? 0) <= (normalized[index - 1] ?? 0)) {
      normalized[index] = (normalized[index] ?? 0) + 12;
    }
  }

  while ((normalized[0] ?? 0) < HARMONY_VOICING_MIN_SEMITONES) {
    for (let index = 0; index < normalized.length; index += 1) {
      normalized[index] = (normalized[index] ?? 0) + 12;
    }
  }
  while (
    (normalized[normalized.length - 1] ?? 0) > HARMONY_VOICING_MAX_SEMITONES
  ) {
    for (let index = 0; index < normalized.length; index += 1) {
      normalized[index] = (normalized[index] ?? 0) - 12;
    }
  }

  if ((normalized[0] ?? 0) < HARMONY_VOICING_MIN_SEMITONES) {
    return null;
  }
  if (
    (normalized[normalized.length - 1] ?? 0) > HARMONY_VOICING_MAX_SEMITONES
  ) {
    return null;
  }

  return normalized;
}

function scoreVoicingDistance(
  current: readonly number[],
  previous: readonly number[]
): number {
  let distance = 0;

  for (let index = 0; index < current.length; index += 1) {
    const movement = Math.abs((current[index] ?? 0) - (previous[index] ?? 0));
    distance += movement;
    if (movement > 7) {
      distance += (movement - 7) * 4;
    }
  }

  const retainedPitchClasses = countRetainedPitchClasses(current, previous);
  const topVoiceMovement = Math.abs(
    (current[current.length - 1] ?? 0) - (previous[previous.length - 1] ?? 0)
  );
  const bassVoiceMovement = Math.abs((current[0] ?? 0) - (previous[0] ?? 0));

  return (
    distance -
    retainedPitchClasses * 6 +
    Math.max(0, topVoiceMovement - 5) * 2 +
    Math.max(0, bassVoiceMovement - 5) * 2
  );
}

function countRetainedPitchClasses(
  current: readonly number[],
  previous: readonly number[]
): number {
  const previousPitchClasses = previous.map(normalizePitchClass);
  let retained = 0;

  for (const semitones of current) {
    const pitchClass = normalizePitchClass(semitones);
    const matchIndex = previousPitchClasses.indexOf(pitchClass);
    if (matchIndex < 0) {
      continue;
    }
    retained += 1;
    previousPitchClasses.splice(matchIndex, 1);
  }

  return retained;
}

function normalizePitchClass(semitones: number): number {
  return ((semitones % 12) + 12) % 12;
}
