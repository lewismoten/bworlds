import type { ProceduralMusicNote } from './procedural-music.ts';

const ROLE_LOUDNESS_WEIGHTS: Record<ProceduralMusicNote['role'], number> = {
  lead: 1,
  harmony: 0.92,
  bass: 0.74,
  percussion: 0.5,
};

const MIN_LOUDNESS_GAIN = 0.5;
const MAX_LOUDNESS_GAIN = 2.6;
const TARGET_LOUDNESS = 0.026;

export function resolveProceduralMusicLoudness(
  notes: readonly ProceduralMusicNote[]
): number {
  let weightedEnergy = 0;
  let weightTotal = 0;

  for (const note of notes) {
    const roleWeight = ROLE_LOUDNESS_WEIGHTS[note.role];
    const durationWeight = Math.max(0.35, note.durationMs / 360);
    const contribution = note.volume * roleWeight;
    weightedEnergy += contribution * contribution * durationWeight;
    weightTotal += durationWeight;
  }

  if (weightTotal <= 0) {
    return 0;
  }

  return Math.sqrt(weightedEnergy / weightTotal);
}

export function normalizeProceduralMusicLoudness(
  notes: ProceduralMusicNote[]
): ProceduralMusicNote[] {
  const loudness = resolveProceduralMusicLoudness(notes);
  if (loudness <= 0) {
    return notes;
  }

  const gain = clamp(
    TARGET_LOUDNESS / loudness,
    MIN_LOUDNESS_GAIN,
    MAX_LOUDNESS_GAIN
  );
  for (const note of notes) {
    note.volume *= gain;
  }
  return notes;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
