import { describe, expect, it } from 'vitest';

import { resolveMusicDebugAudiblePlaybackRoles } from './music-debug-page-playback-roles.ts';

describe('music debug page playback roles', () => {
  it('removes hidden roles from the active playback selection', () => {
    expect(
      resolveMusicDebugAudiblePlaybackRoles({
        variant: 'full',
        hiddenRoles: ['harmony', 'percussion'],
      })
    ).toEqual(['bass', 'lead']);
    expect(
      resolveMusicDebugAudiblePlaybackRoles({
        variant: 'melody-only',
        hiddenRoles: ['lead'],
      })
    ).toEqual([]);
    expect(
      resolveMusicDebugAudiblePlaybackRoles({
        variant: 'harmony-and-bass',
        hiddenRoles: ['lead', 'invalid' as never],
      })
    ).toEqual(['bass', 'harmony']);
  });
});
