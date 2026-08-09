import type { ProceduralMusicNote } from './procedural-music.ts';

const MIN_COMPRESSION_THRESHOLD = 0.018;
const COMPRESSION_RATIO = 0.56;
const QUIET_ROLE_FLOOR: Record<ProceduralMusicNote['role'], number> = {
  lead: 0.72,
  harmony: 0.76,
  bass: 0.8,
  percussion: 0.84,
};

export function applyGentleProceduralMusicCompression(
  notes: ProceduralMusicNote[]
): ProceduralMusicNote[] {
  if (notes.length === 0) {
    return notes;
  }

  const threshold = resolveCompressionThreshold(notes);
  for (const note of notes) {
    const originalVolume = note.volume;
    if (originalVolume > threshold) {
      note.volume =
        threshold + (originalVolume - threshold) * COMPRESSION_RATIO;
      continue;
    }

    const floor = threshold * (QUIET_ROLE_FLOOR[note.role] ?? 0.78);
    if (originalVolume < floor) {
      note.volume = originalVolume + (floor - originalVolume) * 0.12;
    }
  }

  return notes;
}

function resolveCompressionThreshold(
  notes: readonly ProceduralMusicNote[]
): number {
  const sortedVolumes = notes
    .map((note) => note.volume)
    .sort((left, right) => left - right);
  const medianVolume =
    sortedVolumes[Math.floor(sortedVolumes.length / 2)] ??
    MIN_COMPRESSION_THRESHOLD;
  return Math.max(MIN_COMPRESSION_THRESHOLD, medianVolume * 1.34);
}
