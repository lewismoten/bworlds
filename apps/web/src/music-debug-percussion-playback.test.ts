import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  buildMusicDebugPercussionPlaybackControlsMarkup,
  createMusicDebugDrumKitAuditionNotes,
  createMusicDebugPercussionPlaybackVoices,
  normalizeMusicDebugPercussionPlaybackState,
  resolveMusicDebugPercussionVoiceId,
  resolveMusicDebugPercussionVoiceIdsForPlayback,
  toggleMusicDebugPercussionMutedVoice,
  toggleMusicDebugPercussionSoloVoice,
} from './music-debug-percussion-playback.ts';

const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
});
const FOREST_PERCUSSION_IDS = FOREST_SNAPSHOT.notes
  .filter((note) => note.role === 'percussion')
  .map((note) => resolveMusicDebugPercussionVoiceId(note.instrumentId))
  .filter((voiceId): voiceId is string => Boolean(voiceId));
const FOREST_DISTINCT_VOICE_IDS = [...new Set(FOREST_PERCUSSION_IDS)];
const FOREST_VOICES = createMusicDebugPercussionPlaybackVoices(FOREST_SNAPSHOT);
const SOLO_AUDITION_STATE = normalizeMusicDebugPercussionPlaybackState({
  soloVoiceIds: ['kick-41', 'shaker-42'],
});

describe('music debug percussion playback', () => {
  it('normalizes persisted solo and mute voice lists conservatively', () => {
    expect(
      normalizeMusicDebugPercussionPlaybackState({
        soloVoiceIds: ['kick-35', ' ', 'kick-35'],
        mutedVoiceIds: ['snare-38', 'snare-38', ''],
      })
    ).toEqual({
      soloVoiceIds: ['kick-35'],
      mutedVoiceIds: ['snare-38'],
    });
  });

  it('lets solo and mute toggles clear conflicting state for the same voice', () => {
    const initial = normalizeMusicDebugPercussionPlaybackState({
      soloVoiceIds: ['kick-35'],
      mutedVoiceIds: ['snare-38'],
    });

    expect(toggleMusicDebugPercussionMutedVoice(initial, 'kick-35')).toEqual({
      soloVoiceIds: [],
      mutedVoiceIds: ['snare-38', 'kick-35'],
    });
    expect(toggleMusicDebugPercussionSoloVoice(initial, 'snare-38')).toEqual({
      soloVoiceIds: ['kick-35', 'snare-38'],
      mutedVoiceIds: [],
    });
  });

  it('resolves playback voice filters from soloed or muted percussion voices', () => {
    expect(FOREST_DISTINCT_VOICE_IDS.length).toBeGreaterThan(2);
    expect(
      resolveMusicDebugPercussionVoiceIdsForPlayback(
        FOREST_SNAPSHOT,
        normalizeMusicDebugPercussionPlaybackState({
          soloVoiceIds: [FOREST_DISTINCT_VOICE_IDS[0]!],
        })
      )
    ).toEqual([FOREST_DISTINCT_VOICE_IDS[0]]);
    expect(
      resolveMusicDebugPercussionVoiceIdsForPlayback(
        FOREST_SNAPSHOT,
        normalizeMusicDebugPercussionPlaybackState({
          mutedVoiceIds: [FOREST_DISTINCT_VOICE_IDS[0]!],
        })
      )
    ).toEqual(FOREST_DISTINCT_VOICE_IDS.slice(1));
  });

  it('renders solo and mute controls for each percussion voice', () => {
    const markup = buildMusicDebugPercussionPlaybackControlsMarkup(
      FOREST_SNAPSHOT,
      normalizeMusicDebugPercussionPlaybackState({
        soloVoiceIds: [FOREST_VOICES[0]?.voiceId ?? ''],
        mutedVoiceIds: [FOREST_VOICES[1]?.voiceId ?? ''],
      })
    );

    expect(FOREST_VOICES.length).toBeGreaterThan(1);
    expect(markup).toContain('music-debug-percussion-playback-panel');
    expect(markup).toContain('Percussion Voice Playback');
    expect(markup).toContain('Audition Drum Kit');
    expect(markup).toContain(
      'data-percussion-playback-action="audition-pattern"'
    );
    expect(markup).toContain('data-percussion-playback-action="solo"');
    expect(markup).toContain('data-percussion-playback-action="mute"');
    expect(markup).toContain(
      `data-percussion-voice-id="${FOREST_VOICES[0]?.voiceId}"`
    );
    expect(markup).toContain(
      `data-percussion-voice-id="${FOREST_VOICES[1]?.voiceId}"`
    );
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('hits');
  });

  it('builds a stable drum-kit audition pattern from the currently allowed voices', () => {
    const allowedVoiceIds =
      resolveMusicDebugPercussionVoiceIdsForPlayback(
        FOREST_SNAPSHOT,
        SOLO_AUDITION_STATE
      ) ?? [];

    const notes = createMusicDebugDrumKitAuditionNotes(
      FOREST_SNAPSHOT,
      SOLO_AUDITION_STATE,
      24_000
    );

    expect(allowedVoiceIds).toEqual(['kick-41', 'shaker-42']);
    expect(notes).toHaveLength(8);
    expect(notes.map((note) => note.startMs)).toEqual([
      24_004, 24_174, 24_344, 24_514, 24_684, 24_854, 25_024, 25_194,
    ]);
    expect(
      new Set(
        notes.map(
          (note) => resolveMusicDebugPercussionVoiceId(note.instrumentId) ?? ''
        )
      )
    ).toEqual(new Set(['kick-41', 'shaker-42']));
  });
});
