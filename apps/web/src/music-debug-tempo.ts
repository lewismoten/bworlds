import {
  resolveProceduralMusicBlueprintMeasureCount,
  type ProceduralMusicBlueprint,
} from './procedural-music-blueprint.ts';

export const MUSIC_DEBUG_MIDI_TICKS_PER_QUARTER = 480;

export function resolveMusicDebugTempoBpm(options: {
  blueprint: ProceduralMusicBlueprint;
  durationMs: number;
}): number {
  const measureCount = Math.max(
    1,
    resolveProceduralMusicBlueprintMeasureCount(options.blueprint)
  );
  const beatCount = measureCount * 4;
  const durationMs = Math.max(1_000, options.durationMs);
  return (beatCount * 60_000) / durationMs;
}

export function msToMusicDebugTicks(milliseconds: number, bpm: number): number {
  const clampedBpm = Math.max(1, bpm);
  return Math.max(
    0,
    Math.round(
      (milliseconds / 60_000) * MUSIC_DEBUG_MIDI_TICKS_PER_QUARTER * clampedBpm
    )
  );
}
