import { describe, expect, it } from 'vitest';

import {
  formatMusicDebugPlaybackVariantLabel,
  normalizeMusicDebugPlaybackVariant,
  resolveMusicDebugPlaybackRoles,
} from './music-debug-playback-variant.ts';

describe('music debug playback variant', () => {
  it('maps playback variants to the intended role sets', () => {
    expect(resolveMusicDebugPlaybackRoles('full')).toEqual([
      'bass',
      'harmony',
      'lead',
      'percussion',
    ]);
    expect(resolveMusicDebugPlaybackRoles('melody-only')).toEqual(['lead']);
    expect(resolveMusicDebugPlaybackRoles('harmony-and-bass')).toEqual([
      'bass',
      'harmony',
    ]);
  });

  it('formats concise labels and normalizes unknown values safely', () => {
    expect(formatMusicDebugPlaybackVariantLabel('full')).toBe('Full Song');
    expect(formatMusicDebugPlaybackVariantLabel('melody-only')).toBe(
      'Melody Only'
    );
    expect(formatMusicDebugPlaybackVariantLabel('harmony-and-bass')).toBe(
      'Harmony + Bass'
    );
    expect(normalizeMusicDebugPlaybackVariant('missing')).toBe('full');
  });
});
