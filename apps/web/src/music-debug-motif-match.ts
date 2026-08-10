export function countMusicDebugExactMotifMatches(
  sequence: readonly number[],
  targetMotif: readonly number[]
): number {
  if (targetMotif.length === 0 || sequence.length < targetMotif.length) {
    return 0;
  }

  let matches = 0;
  for (
    let startIndex = 0;
    startIndex <= sequence.length - targetMotif.length;
    startIndex += 1
  ) {
    let exactMatch = true;
    for (let offset = 0; offset < targetMotif.length; offset += 1) {
      if (sequence[startIndex + offset] !== targetMotif[offset]) {
        exactMatch = false;
        break;
      }
    }
    if (exactMatch) {
      matches += 1;
    }
  }

  return matches;
}

export function countMusicDebugVariedMotifMatches(
  sequence: readonly number[],
  targetMotif: readonly number[]
): number {
  if (targetMotif.length === 0 || sequence.length < targetMotif.length) {
    return 0;
  }

  const targetPattern = createMusicDebugIntervalPattern(targetMotif);
  if (targetPattern.length === 0) {
    return 0;
  }

  let matches = 0;
  for (
    let startIndex = 0;
    startIndex <= sequence.length - targetMotif.length;
    startIndex += 1
  ) {
    const phrase = sequence.slice(startIndex, startIndex + targetMotif.length);
    if (musicDebugPhrasesMatchExactly(phrase, targetMotif)) {
      continue;
    }
    if (
      musicDebugPhrasesMatchExactly(
        createMusicDebugIntervalPattern(phrase),
        targetPattern
      )
    ) {
      matches += 1;
    }
  }

  return matches;
}

export function collectMusicDebugScaleDegreesFromMidiNotes(options: {
  midiNotes: readonly number[];
  rootMidiNote: number;
  modePitchOffsets: readonly number[];
}): number[] {
  const degrees: number[] = [];

  for (const midiNote of options.midiNotes) {
    const degree = resolveMusicDebugScaleDegreeFromMidiNote({
      midiNote,
      rootMidiNote: options.rootMidiNote,
      modePitchOffsets: options.modePitchOffsets,
    });
    if (degree !== null) {
      degrees.push(degree);
    }
  }

  return degrees;
}

function resolveMusicDebugScaleDegreeFromMidiNote(options: {
  midiNote: number;
  rootMidiNote: number;
  modePitchOffsets: readonly number[];
}): number | null {
  if (options.modePitchOffsets.length === 0) {
    return null;
  }

  const relativeSemitones = options.midiNote - options.rootMidiNote;
  const pitchClass = normalizeMusicDebugPitchClass(relativeSemitones);

  for (
    let degreeIndex = 0;
    degreeIndex < options.modePitchOffsets.length;
    degreeIndex += 1
  ) {
    const offset = options.modePitchOffsets[degreeIndex];
    if (offset === undefined) {
      continue;
    }
    if (normalizeMusicDebugPitchClass(offset) === pitchClass) {
      return degreeIndex;
    }
  }

  return null;
}

function createMusicDebugIntervalPattern(
  sequence: readonly number[]
): number[] {
  const pattern: number[] = [];
  for (let index = 1; index < sequence.length; index += 1) {
    pattern.push(sequence[index]! - sequence[index - 1]!);
  }
  return pattern;
}

function musicDebugPhrasesMatchExactly(
  left: readonly number[],
  right: readonly number[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function normalizeMusicDebugPitchClass(semitone: number): number {
  return ((Math.round(semitone) % 12) + 12) % 12;
}
