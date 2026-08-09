export type ProceduralScaleMap = {
  rootMidiNote: number;
  modePitchOffsets: readonly number[];
};

export function resolveProceduralRootMidiNote(rootHz: number): number {
  return Math.round(69 + 12 * Math.log2(Math.max(rootHz, 1) / 440));
}

export function resolveProceduralModePitchOffsets(
  scale: readonly number[]
): readonly number[] {
  return scale.map((scaleSemitone) => normalizePitchClass(scaleSemitone));
}

export function createProceduralScaleMap(options: {
  rootHz: number;
  scale: readonly number[];
}): ProceduralScaleMap {
  return {
    rootMidiNote: resolveProceduralRootMidiNote(options.rootHz),
    modePitchOffsets: resolveProceduralModePitchOffsets(options.scale),
  };
}

export function getProceduralScaleDegreeSemitones(
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

export function resolveProceduralScaleDegreeMidiNote(options: {
  scaleMap: ProceduralScaleMap;
  degreeIndex: number;
}): number {
  return (
    options.scaleMap.rootMidiNote +
    getProceduralScaleDegreeSemitones(
      options.scaleMap.modePitchOffsets,
      options.degreeIndex
    )
  );
}

export function isProceduralSemitoneInMode(
  modePitchOffsets: readonly number[],
  semitone: number
): boolean {
  const normalizedSemitone = normalizePitchClass(semitone);
  return modePitchOffsets.some(
    (scaleSemitone) => normalizePitchClass(scaleSemitone) === normalizedSemitone
  );
}

function normalizePitchClass(semitone: number): number {
  return ((Math.round(semitone) % 12) + 12) % 12;
}
