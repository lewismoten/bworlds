import type { ProceduralMusicNote } from './procedural-music.ts';

const MUSIC_DEBUG_INSTRUMENT_PREVIEW_LEAD_MS = 4;
const MUSIC_DEBUG_INSTRUMENT_PREVIEW_MIN_DURATION_MS = 140;
const MUSIC_DEBUG_INSTRUMENT_PREVIEW_MAX_DURATION_MS = 420;
export const MUSIC_DEBUG_PLAYBACK_CONTROLLER_LEAD_MS = 6;
export const MUSIC_DEBUG_PLAYBACK_SCHEDULE_AHEAD_MS = 16;
export const MUSIC_DEBUG_PLAYBACK_SCHEDULE_WINDOW_MS = 320;
export const MUSIC_DEBUG_PLAYBACK_SCHEDULE_TICK_MS = 48;

const MUSIC_DEBUG_PREVIEW_ATTACK_CAP_MS = 14;
const MUSIC_DEBUG_PREVIEW_RELEASE_CAP_MS = 140;
const MUSIC_DEBUG_PLAYBACK_ATTACK_CAP_MS = 24;
const MUSIC_DEBUG_PLAYBACK_RELEASE_CAP_MS = 180;

export function createMusicDebugInstrumentPreviewPlaybackNote(
  note: ProceduralMusicNote,
  instrumentId: string,
  nowMs: number
): ProceduralMusicNote {
  return {
    ...note,
    instrumentId,
    startMs: nowMs + MUSIC_DEBUG_INSTRUMENT_PREVIEW_LEAD_MS,
    durationMs: Math.max(
      MUSIC_DEBUG_INSTRUMENT_PREVIEW_MIN_DURATION_MS,
      Math.min(
        MUSIC_DEBUG_INSTRUMENT_PREVIEW_MAX_DURATION_MS,
        Math.round(note.durationMs * 0.72)
      )
    ),
    attackMs: Math.max(
      6,
      Math.min(MUSIC_DEBUG_PREVIEW_ATTACK_CAP_MS, Math.round(note.attackMs))
    ),
    releaseMs: Math.max(
      36,
      Math.min(MUSIC_DEBUG_PREVIEW_RELEASE_CAP_MS, Math.round(note.releaseMs))
    ),
    volume: Math.min(0.072, note.volume * 1.18),
  };
}

export function createMusicDebugScheduledPlaybackNote(
  note: ProceduralMusicNote,
  scheduledStartMs: number
): ProceduralMusicNote {
  return {
    ...note,
    startMs: scheduledStartMs,
    attackMs: Math.max(
      8,
      Math.min(MUSIC_DEBUG_PLAYBACK_ATTACK_CAP_MS, Math.round(note.attackMs))
    ),
    releaseMs: Math.max(
      48,
      Math.min(MUSIC_DEBUG_PLAYBACK_RELEASE_CAP_MS, Math.round(note.releaseMs))
    ),
  };
}
