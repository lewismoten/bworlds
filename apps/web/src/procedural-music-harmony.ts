import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';

export type ProceduralHarmonyTheme = {
  id: string;
  scale: number[];
  stepPattern: number[];
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

const MUSIC_PROGRESSION_SEED = registerHashLabel('music-progression');
const MUSIC_MOTIF_SEED = registerHashLabel('music-lead-motif');
const MUSIC_LEAP_SEED = registerHashLabel('music-leap-motion');
const MUSIC_ACCIDENTAL_SEED = registerHashLabel('music-accidental-motion');
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
  const patternIndex = Math.floor(
    hash2DWithSeed(
      MUSIC_MOTIF_SEED,
      clusterX - theme.id.length * 29,
      clusterY + theme.id.length * 19
    ) * MOTIF_PATTERNS.length
  );
  return {
    degreeOffsets: MOTIF_PATTERNS[patternIndex] ?? MOTIF_PATTERNS[0],
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

export function isProceduralSemitoneInScale(
  scale: readonly number[],
  semitone: number
): boolean {
  const normalizedSemitone = ((Math.round(semitone) % 12) + 12) % 12;
  return scale.some(
    (scaleSemitone) => ((scaleSemitone % 12) + 12) % 12 === normalizedSemitone
  );
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
  const rootSemitones = getScaleDegreeSemitones(theme.scale, degreeIndex);
  const thirdSemitones = getScaleDegreeSemitones(theme.scale, degreeIndex + 2);
  const fifthSemitones = getScaleDegreeSemitones(theme.scale, degreeIndex + 4);
  const passingSemitones = getScaleDegreeSemitones(
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
  const motif = resolveProceduralLeadMotif(theme, clusterX, clusterY);
  const phraseStep = stepIndex % theme.stepPattern.length;
  const cadence = resolveProceduralLeadPhraseCadence(theme, stepIndex);
  const melodyPatternIndex =
    chord.degreeIndex +
    (motif.degreeOffsets[phraseStep % motif.degreeOffsets.length] ?? 0);
  const leadScaleSemitones = getScaleDegreeSemitones(
    theme.scale,
    melodyPatternIndex
  );
  const strongLeadBeat = phraseStep === 2 || phraseStep === 6;

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
      cadence,
      strongLeadBeat,
    };
  }

  if (cadence === 'question') {
    return {
      semitones: chord.passingSemitones,
      cadence,
      strongLeadBeat,
    };
  }
  if (cadence === 'answer') {
    return {
      semitones: chord.rootSemitones,
      cadence,
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
      cadence,
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
      melodicOptions[phraseStep % melodicOptions.length] ?? leadScaleSemitones,
    cadence,
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

function getScaleDegreeSemitones(
  scale: readonly number[],
  degreeIndex: number
): number {
  if (scale.length === 0) {
    return 0;
  }

  const octave = Math.floor(degreeIndex / scale.length);
  const normalizedDegreeIndex =
    ((degreeIndex % scale.length) + scale.length) % scale.length;
  return (scale[normalizedDegreeIndex] ?? 0) + octave * 12;
}
