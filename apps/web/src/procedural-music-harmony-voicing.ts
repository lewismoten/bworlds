type ProceduralHarmonyTriad = {
  rootSemitones: number;
  thirdSemitones: number;
  fifthSemitones: number;
};

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
  return [
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
  ];
}

function scoreVoicingDistance(
  current: readonly number[],
  previous: readonly number[]
): number {
  let distance = 0;

  for (let index = 0; index < current.length; index += 1) {
    distance += Math.abs((current[index] ?? 0) - (previous[index] ?? 0));
  }

  return distance;
}
