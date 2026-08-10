import { describe, expect, it } from 'vitest';

import {
  formatMusicDebugDisplayRoleLabel,
  MUSIC_DEBUG_DISPLAY_ROLE_ORDER,
  resolveMusicDebugDisplayRoleColor,
} from './music-debug-role-display.ts';

describe('music debug role display', () => {
  it('defines the visible role order for the current four-track debug layout', () => {
    expect(MUSIC_DEBUG_DISPLAY_ROLE_ORDER).toEqual([
      'lead',
      'harmony',
      'bass',
      'percussion',
    ]);
  });

  it('maps current generated roles to the requested user-facing labels and colors', () => {
    expect(formatMusicDebugDisplayRoleLabel('lead')).toBe('Melody');
    expect(formatMusicDebugDisplayRoleLabel('harmony')).toBe('Harmony');
    expect(formatMusicDebugDisplayRoleLabel('bass')).toBe('Bass');
    expect(formatMusicDebugDisplayRoleLabel('percussion')).toBe(
      'Percussion'
    );
    expect(resolveMusicDebugDisplayRoleColor('lead')).toBe('#ffcc33');
    expect(resolveMusicDebugDisplayRoleColor('harmony')).toBe('#58c46b');
    expect(resolveMusicDebugDisplayRoleColor('bass')).toBe('#4f8cff');
    expect(resolveMusicDebugDisplayRoleColor('percussion')).toBe('#ff5a5f');
  });
});
