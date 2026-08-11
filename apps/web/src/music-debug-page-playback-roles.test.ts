import { describe, expect, it } from 'vitest';

import { resolveMusicDebugAudiblePlaybackRoles } from './music-debug-page-playback-roles.ts';

describe('music debug page playback roles', () => {
  it('removes muted roles and honors solo roles in the active playback selection', () => {
    expect(
      resolveMusicDebugAudiblePlaybackRoles({
        variant: 'full',
        trackPlaybackState: {
          mutedRoles: ['harmony', 'percussion'],
        },
      })
    ).toEqual(['bass', 'lead']);
    expect(
      resolveMusicDebugAudiblePlaybackRoles({
        variant: 'melody-only',
        trackPlaybackState: {
          mutedRoles: ['lead'],
        },
      })
    ).toEqual([]);
    expect(
      resolveMusicDebugAudiblePlaybackRoles({
        variant: 'harmony-and-bass',
        trackPlaybackState: {
          soloRoles: ['harmony', 'lead'],
        },
      })
    ).toEqual(['harmony']);
  });
});
