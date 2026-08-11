import type { ProceduralMusicNote } from './procedural-music.ts';

export const PROCEDURAL_MUSIC_ROLE_LOUDNESS_WEIGHTS: Record<
  ProceduralMusicNote['role'],
  number
> = {
  lead: 1,
  harmony: 0.92,
  bass: 0.74,
  percussion: 0.5,
};

const MIN_LOUDNESS_GAIN = 0.5;
const MAX_LOUDNESS_GAIN = 3.2;
export const PROCEDURAL_MUSIC_TARGET_LOUDNESS = 0.026;

export function resolveProceduralMusicLoudnessPolicy(): {
  targetLoudness: number;
  roleWeights: Readonly<typeof PROCEDURAL_MUSIC_ROLE_LOUDNESS_WEIGHTS>;
} {
  return {
    targetLoudness: PROCEDURAL_MUSIC_TARGET_LOUDNESS,
    roleWeights: PROCEDURAL_MUSIC_ROLE_LOUDNESS_WEIGHTS,
  };
}

export function resolveProceduralMusicRoleLoudnessTargets(): Record<
  ProceduralMusicNote['role'],
  number
> {
  const { targetLoudness, roleWeights } =
    resolveProceduralMusicLoudnessPolicy();

  return {
    lead: targetLoudness * roleWeights.lead,
    harmony: targetLoudness * roleWeights.harmony,
    bass: targetLoudness * roleWeights.bass,
    percussion: targetLoudness * roleWeights.percussion,
  };
}

export function resolveProceduralMusicLoudness(
  notes: readonly ProceduralMusicNote[]
): number {
  let weightedEnergy = 0;
  let weightTotal = 0;
  const { roleWeights } = resolveProceduralMusicLoudnessPolicy();

  for (const note of notes) {
    const roleWeight = roleWeights[note.role];
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

  const { targetLoudness } = resolveProceduralMusicLoudnessPolicy();
  const gain = clamp(
    targetLoudness / loudness,
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
