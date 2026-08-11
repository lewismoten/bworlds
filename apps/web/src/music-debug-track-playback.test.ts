import { describe, expect, it } from 'vitest';

import {
  normalizeMusicDebugTrackPlaybackState,
  resolveMusicDebugAudibleTrackRoles,
  toggleMusicDebugTrackMutedRole,
  toggleMusicDebugTrackSoloRole,
} from './music-debug-track-playback.ts';

describe('music debug track playback', () => {
  it('normalizes persisted solo and muted track roles conservatively', () => {
    expect(
      normalizeMusicDebugTrackPlaybackState({
        soloRoles: ['lead', 'lead', 'invalid' as never],
        mutedRoles: ['bass', 'percussion', '' as never],
      })
    ).toEqual({
      soloRoles: ['lead'],
      mutedRoles: ['bass', 'percussion'],
    });
  });

  it('lets solo and mute toggles clear conflicting state for the same track role', () => {
    const initialState = {
      soloRoles: ['lead'],
      mutedRoles: ['bass'],
    } as const;

    expect(toggleMusicDebugTrackMutedRole(initialState, 'lead')).toEqual({
      soloRoles: [],
      mutedRoles: ['bass', 'lead'],
    });
    expect(toggleMusicDebugTrackSoloRole(initialState, 'bass')).toEqual({
      soloRoles: ['lead', 'bass'],
      mutedRoles: [],
    });
  });

  it('resolves audible track roles from soloed or muted track selections', () => {
    expect(
      resolveMusicDebugAudibleTrackRoles({
        soloRoles: ['harmony', 'percussion'],
        mutedRoles: ['lead'],
      })
    ).toEqual(['harmony', 'percussion']);
    expect(
      resolveMusicDebugAudibleTrackRoles(
        {
          soloRoles: [],
          mutedRoles: ['harmony'],
        },
        ['lead', 'harmony', 'bass']
      )
    ).toEqual(['lead', 'bass']);
  });
});
