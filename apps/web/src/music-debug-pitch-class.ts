import type { ProceduralMusicNote } from './procedural-music.ts';

export type MusicDebugPitchClassLabel =
  'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export const MUSIC_DEBUG_PITCH_CLASS_LABELS: readonly MusicDebugPitchClassLabel[] =
  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function resolveMusicDebugPitchClassLabel(
  midiNote: number
): MusicDebugPitchClassLabel {
  return (
    MUSIC_DEBUG_PITCH_CLASS_LABELS[
      normalizeMusicDebugPitchClassSemitone(midiNote)
    ] ?? MUSIC_DEBUG_PITCH_CLASS_LABELS[0]
  );
}

export function normalizeMusicDebugPitchClassSemitone(
  semitone: number
): number {
  return ((Math.round(semitone) % 12) + 12) % 12;
}

export function createMusicDebugPitchClassCountMapByRole(): Record<
  ProceduralMusicNote['role'],
  Partial<Record<MusicDebugPitchClassLabel, number>>
> {
  return {
    lead: {},
    harmony: {},
    bass: {},
    percussion: {},
  };
}
