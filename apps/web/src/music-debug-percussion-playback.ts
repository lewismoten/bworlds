import type { MusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugPercussionVoiceCounts } from './music-debug-percussion-report.ts';
import { resolveMusicDebugInstrumentPreviewNote } from './music-debug-instrument-panel.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import {
  resolvePercussionVoiceById,
  type PercussionFamily,
  type PercussionVoiceId,
} from './procedural-music-percussion-voices.ts';

export type MusicDebugPercussionPlaybackState = {
  soloVoiceIds: readonly string[];
  mutedVoiceIds: readonly string[];
};

export type MusicDebugPercussionPlaybackVoice = {
  voiceId: string;
  voiceName: string;
  noteCount: number;
};

const PERCUSSION_VOICE_ID_PATTERN = /:perc-([a-z-]+-\d+):/;
const MUSIC_DEBUG_DRUM_KIT_AUDITION_STEP_MS = 170;
const MUSIC_DEBUG_DRUM_KIT_AUDITION_PATTERN: ReadonlyArray<{
  preferredVoiceId: PercussionVoiceId;
  fallbackFamily: PercussionFamily;
}> = [
  { preferredVoiceId: 'kick-36', fallbackFamily: 'kick' },
  { preferredVoiceId: 'cymbals-42', fallbackFamily: 'cymbals' },
  { preferredVoiceId: 'snare-38', fallbackFamily: 'snare' },
  { preferredVoiceId: 'cymbals-42', fallbackFamily: 'cymbals' },
  { preferredVoiceId: 'kick-36', fallbackFamily: 'kick' },
  { preferredVoiceId: 'cymbals-42', fallbackFamily: 'cymbals' },
  { preferredVoiceId: 'snare-38', fallbackFamily: 'snare' },
  { preferredVoiceId: 'cymbals-46', fallbackFamily: 'cymbals' },
];

export function normalizeMusicDebugPercussionPlaybackState(
  value: Partial<MusicDebugPercussionPlaybackState> | null | undefined
): MusicDebugPercussionPlaybackState {
  return {
    soloVoiceIds: normalizeMusicDebugPercussionVoiceIdList(value?.soloVoiceIds),
    mutedVoiceIds: normalizeMusicDebugPercussionVoiceIdList(
      value?.mutedVoiceIds
    ),
  };
}

export function toggleMusicDebugPercussionSoloVoice(
  state: MusicDebugPercussionPlaybackState,
  voiceId: string
): MusicDebugPercussionPlaybackState {
  const nextSoloVoiceIds = state.soloVoiceIds.includes(voiceId)
    ? state.soloVoiceIds.filter((candidate) => candidate !== voiceId)
    : [...state.soloVoiceIds, voiceId];
  return normalizeMusicDebugPercussionPlaybackState({
    soloVoiceIds: nextSoloVoiceIds,
    mutedVoiceIds: state.mutedVoiceIds.filter(
      (candidate) => candidate !== voiceId
    ),
  });
}

export function toggleMusicDebugPercussionMutedVoice(
  state: MusicDebugPercussionPlaybackState,
  voiceId: string
): MusicDebugPercussionPlaybackState {
  const nextMutedVoiceIds = state.mutedVoiceIds.includes(voiceId)
    ? state.mutedVoiceIds.filter((candidate) => candidate !== voiceId)
    : [...state.mutedVoiceIds, voiceId];
  return normalizeMusicDebugPercussionPlaybackState({
    soloVoiceIds: state.soloVoiceIds.filter(
      (candidate) => candidate !== voiceId
    ),
    mutedVoiceIds: nextMutedVoiceIds,
  });
}

export function createMusicDebugPercussionPlaybackVoices(
  snapshot: MusicDebugSnapshot
): readonly MusicDebugPercussionPlaybackVoice[] {
  return createMusicDebugPercussionVoiceCounts(snapshot.notes)
    .filter(
      (
        voice
      ): voice is typeof voice & {
        voiceId: string;
      } => Boolean(voice.voiceId)
    )
    .map((voice) => ({
      voiceId: voice.voiceId,
      voiceName: voice.voiceName,
      noteCount: voice.noteCount,
    }));
}

export function resolveMusicDebugPercussionVoiceIdsForPlayback(
  snapshot: MusicDebugSnapshot,
  state: MusicDebugPercussionPlaybackState
): readonly string[] | null {
  const availableVoiceIds = createMusicDebugPercussionPlaybackVoices(
    snapshot
  ).map((voice) => voice.voiceId);
  if (availableVoiceIds.length === 0) {
    return null;
  }

  const availableVoiceIdSet = new Set(availableVoiceIds);
  const soloVoiceIds = state.soloVoiceIds.filter((voiceId) =>
    availableVoiceIdSet.has(voiceId)
  );
  if (soloVoiceIds.length > 0) {
    return soloVoiceIds;
  }

  const mutedVoiceIdSet = new Set(
    state.mutedVoiceIds.filter((voiceId) => availableVoiceIdSet.has(voiceId))
  );
  if (mutedVoiceIdSet.size === 0) {
    return null;
  }

  const allowedVoiceIds = availableVoiceIds.filter(
    (voiceId) => !mutedVoiceIdSet.has(voiceId)
  );
  return allowedVoiceIds.length === availableVoiceIds.length
    ? null
    : allowedVoiceIds;
}

export function resolveMusicDebugPercussionVoiceId(
  instrumentId: string
): string | null {
  return instrumentId.match(PERCUSSION_VOICE_ID_PATTERN)?.[1] ?? null;
}

export function createMusicDebugDrumKitAuditionNotes(
  snapshot: MusicDebugSnapshot,
  state: MusicDebugPercussionPlaybackState,
  nowMs: number
): readonly ProceduralMusicNote[] {
  const allowedVoiceIds =
    resolveMusicDebugPercussionVoiceIdsForPlayback(snapshot, state) ??
    createMusicDebugPercussionPlaybackVoices(snapshot).map(
      (voice) => voice.voiceId
    );
  if (allowedVoiceIds.length === 0) {
    return [];
  }

  return MUSIC_DEBUG_DRUM_KIT_AUDITION_PATTERN.flatMap((step, index) => {
    const voiceId =
      resolveMatchingPercussionVoiceId(
        allowedVoiceIds,
        step.preferredVoiceId
      ) ??
      resolveMatchingPercussionFamilyVoiceId(
        allowedVoiceIds,
        step.fallbackFamily
      ) ??
      allowedVoiceIds[index % allowedVoiceIds.length] ??
      null;
    if (!voiceId) {
      return [];
    }
    const note = resolveMusicDebugInstrumentPreviewNote(
      snapshot,
      `percussion:${voiceId}`,
      nowMs + index * MUSIC_DEBUG_DRUM_KIT_AUDITION_STEP_MS
    );
    return note ? [note] : [];
  });
}

export function buildMusicDebugPercussionPlaybackControlsMarkup(
  snapshot: MusicDebugSnapshot,
  state: MusicDebugPercussionPlaybackState
): string {
  const voices = createMusicDebugPercussionPlaybackVoices(snapshot);
  if (voices.length === 0) {
    return '';
  }

  return `
    <section class="music-debug-percussion-playback-panel" aria-label="Percussion voice playback controls">
      <div class="music-debug-percussion-playback-panel-head">
        <h3>Percussion Voice Playback</h3>
        <p>Solo or mute individual drum voices while keeping the rest of the current playback variant intact.</p>
        <button
          type="button"
          class="music-debug-percussion-playback-audition"
          data-percussion-playback-action="audition-pattern"
        >
          Audition Drum Kit
        </button>
      </div>
      <div class="music-debug-percussion-playback-grid">
        ${voices
          .map((voice) => {
            const soloPressed = state.soloVoiceIds.includes(voice.voiceId);
            const mutePressed = state.mutedVoiceIds.includes(voice.voiceId);
            return `
              <article class="music-debug-percussion-playback-row">
                <div class="music-debug-percussion-playback-copy">
                  <strong>${voice.voiceName}</strong>
                  <span>${voice.noteCount} hits</span>
                </div>
                <div class="music-debug-percussion-playback-actions">
                  <button
                    type="button"
                    class="music-debug-percussion-playback-toggle"
                    data-percussion-playback-action="solo"
                    data-percussion-voice-id="${voice.voiceId}"
                    aria-pressed="${soloPressed ? 'true' : 'false'}"
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    class="music-debug-percussion-playback-toggle"
                    data-percussion-playback-action="mute"
                    data-percussion-voice-id="${voice.voiceId}"
                    aria-pressed="${mutePressed ? 'true' : 'false'}"
                  >
                    Mute
                  </button>
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

export function buildMusicDebugPercussionLaneTogglesMarkup(
  snapshot: MusicDebugSnapshot,
  state: MusicDebugPercussionPlaybackState
): string {
  const voices = createMusicDebugPercussionPlaybackVoices(snapshot);
  if (voices.length === 0) {
    return '';
  }

  return `
    <div class="music-debug-percussion-lane-toggles" aria-label="Percussion lane voice controls">
      ${voices
        .map((voice) => {
          const soloPressed = state.soloVoiceIds.includes(voice.voiceId);
          const mutePressed = state.mutedVoiceIds.includes(voice.voiceId);
          return `
            <div class="music-debug-percussion-lane-chip">
              <span class="music-debug-percussion-lane-chip-label">${voice.voiceName}</span>
              <div class="music-debug-percussion-lane-chip-actions">
                <button
                  type="button"
                  class="music-debug-percussion-lane-toggle"
                  data-percussion-playback-action="solo"
                  data-percussion-voice-id="${voice.voiceId}"
                  aria-pressed="${soloPressed ? 'true' : 'false'}"
                  aria-label="${soloPressed ? `Clear solo for ${voice.voiceName}` : `Solo ${voice.voiceName}`}"
                >
                  Solo
                </button>
                <button
                  type="button"
                  class="music-debug-percussion-lane-toggle"
                  data-percussion-playback-action="mute"
                  data-percussion-voice-id="${voice.voiceId}"
                  aria-pressed="${mutePressed ? 'true' : 'false'}"
                  aria-label="${mutePressed ? `Unmute ${voice.voiceName}` : `Mute ${voice.voiceName}`}"
                >
                  Mute
                </button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function normalizeMusicDebugPercussionVoiceIdList(
  values: readonly string[] | null | undefined
): readonly string[] {
  if (!values) {
    return [];
  }
  const uniqueVoiceIds: string[] = [];
  for (const value of values) {
    const voiceId = value.trim();
    if (!voiceId || uniqueVoiceIds.includes(voiceId)) {
      continue;
    }
    uniqueVoiceIds.push(voiceId);
  }
  return uniqueVoiceIds;
}

function resolveMatchingPercussionVoiceId(
  allowedVoiceIds: readonly string[],
  preferredVoiceId: PercussionVoiceId
): string | null {
  return allowedVoiceIds.includes(preferredVoiceId) ? preferredVoiceId : null;
}

function resolveMatchingPercussionFamilyVoiceId(
  allowedVoiceIds: readonly string[],
  family: PercussionFamily
): string | null {
  for (const voiceId of allowedVoiceIds) {
    if (
      resolvePercussionVoiceById(voiceId as PercussionVoiceId)?.family ===
      family
    ) {
      return voiceId;
    }
  }
  return null;
}
