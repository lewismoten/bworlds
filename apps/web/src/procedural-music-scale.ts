export type ProceduralScaleMap = {
  rootMidiNote: number;
  modePitchOffsets: readonly number[];
};

export const PROCEDURAL_MUSIC_INTERVAL_UNIT = 'semitones';

export function resolveProceduralRootMidiNote(rootHz: number): number {
  return Math.round(69 + 12 * Math.log2(Math.max(rootHz, 1) / 440));
}

export function resolveProceduralMidiNoteFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function resolveProceduralModePitchOffsets(
  scale: readonly number[]
): readonly number[] {
  return validateProceduralModePitchOffsets(scale);
}

export function createProceduralScaleMap(options: {
  rootHz?: number;
  rootMidiNote?: number;
  scale: readonly number[];
}): ProceduralScaleMap {
  const rootMidiNote =
    options.rootMidiNote ?? resolveProceduralRootMidiNote(options.rootHz ?? 0);
  return {
    rootMidiNote,
    modePitchOffsets: resolveProceduralModePitchOffsets(options.scale),
  };
}

export function validateProceduralModePitchOffsets(
  scale: readonly number[]
): readonly number[] {
  const normalized = scale.map((scaleSemitone) =>
    normalizePitchClass(scaleSemitone)
  );
  const unique = new Set(normalized);

  if (normalized.length === 7 && unique.size < 7) {
    throw new Error(
      `Seven-note modes must provide seven unique offsets: ${normalized.join(', ')}`
    );
  }

  if (unique.size !== normalized.length) {
    throw new Error(
      `Duplicate scale degrees are not allowed: ${normalized.join(', ')}`
    );
  }

  return normalized;
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
