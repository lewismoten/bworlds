import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';

export type ProceduralMusicPitchRole =
  'lead' | 'harmony' | 'bass' | 'percussion';

const ROLE_REGISTER_SHIFT_SEMITONES: Record<ProceduralMusicPitchRole, number> =
  {
    lead: 0,
    harmony: 0,
    bass: -12,
    percussion: 12,
  };

export function resolveProceduralNoteFrequency(options: {
  rootMidiNote: number;
  semitones: number;
  role: ProceduralMusicPitchRole;
  octaveShiftSemitones?: number;
}): number {
  const totalSemitones =
    options.semitones +
    ROLE_REGISTER_SHIFT_SEMITONES[options.role] +
    (options.octaveShiftSemitones ?? 0);

  return resolveProceduralMidiNoteFrequency(
    options.rootMidiNote + totalSemitones
  );
}

export function resolveProceduralNoteHarmonicGain(options: {
  baseHarmonicGain: number;
  harmonicGainMultiplier: number;
  moodBrightness: number;
  brightnessMultiplier: number;
}): number {
  return (
    options.baseHarmonicGain *
    options.harmonicGainMultiplier *
    options.moodBrightness *
    options.brightnessMultiplier
  );
}

export function normalizeProceduralLeadSemitones(options: {
  targetSemitones: number;
  melodyRangeSemitones: readonly [number, number];
  previousLeadSemitones?: number | null;
  maxLeapSemitones?: number;
}): number {
  const [minSemitones, maxSemitones] = options.melodyRangeSemitones;
  const previousLeadSemitones = options.previousLeadSemitones ?? null;
  const maxLeapSemitones = Math.max(1, options.maxLeapSemitones ?? 7);
  const candidates = collectLeadRegisterCandidates(
    options.targetSemitones,
    minSemitones,
    maxSemitones
  );
  const referenceSemitones =
    previousLeadSemitones ?? (minSemitones + maxSemitones) / 2;
  const rankedCandidates = [...candidates].sort((left, right) => {
    const leftDistance = Math.abs(left - referenceSemitones);
    const rightDistance = Math.abs(right - referenceSemitones);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    return (
      Math.abs(left - options.targetSemitones) -
      Math.abs(right - options.targetSemitones)
    );
  });

  if (previousLeadSemitones !== null) {
    const boundedCandidate = rankedCandidates.find(
      (candidate) =>
        Math.abs(candidate - previousLeadSemitones) <= maxLeapSemitones
    );
    if (boundedCandidate !== undefined) {
      return boundedCandidate;
    }
  }

  return (
    rankedCandidates[0] ??
    clampLeadRegisterFallback(
      options.targetSemitones,
      minSemitones,
      maxSemitones
    )
  );
}

function collectLeadRegisterCandidates(
  targetSemitones: number,
  minSemitones: number,
  maxSemitones: number
): number[] {
  const candidates: number[] = [];
  for (let octaveShift = -36; octaveShift <= 36; octaveShift += 12) {
    const candidate = targetSemitones + octaveShift;
    if (candidate < minSemitones || candidate > maxSemitones) {
      continue;
    }
    candidates.push(candidate);
  }
  if (candidates.length > 0) {
    return candidates;
  }
  return [
    clampLeadRegisterFallback(targetSemitones, minSemitones, maxSemitones),
  ];
}

function clampLeadRegisterFallback(
  targetSemitones: number,
  minSemitones: number,
  maxSemitones: number
): number {
  let candidate = targetSemitones;
  while (candidate > maxSemitones) {
    candidate -= 12;
  }
  while (candidate < minSemitones) {
    candidate += 12;
  }
  return Math.min(maxSemitones, Math.max(minSemitones, candidate));
}
