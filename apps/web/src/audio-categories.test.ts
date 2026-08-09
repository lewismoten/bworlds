import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AUDIO_CATEGORY_VOLUMES,
  getAudioCategoryLabel,
  isAudioCategoryVolumeMapLike,
  normalizeAudioCategoryVolumes,
  resolveSoundEffectCategory,
} from './audio-categories.ts';

describe('audio categories', () => {
  it('normalizes missing and out-of-range category volumes', () => {
    expect(normalizeAudioCategoryVolumes(null)).toEqual(
      DEFAULT_AUDIO_CATEGORY_VOLUMES
    );
    expect(
      normalizeAudioCategoryVolumes({
        music: 0.4,
        combat: 2,
        environment: -1,
      })
    ).toEqual({
      music: 0.4,
      ui: 1,
      speech: 1,
      combat: 1,
      environment: 0,
      creatures: 1,
    });
  });

  it('validates persisted category volume maps conservatively', () => {
    expect(
      isAudioCategoryVolumeMapLike({
        music: 0.8,
        speech: 0.6,
      })
    ).toBe(true);
    expect(isAudioCategoryVolumeMapLike('loud')).toBe(false);
    expect(
      isAudioCategoryVolumeMapLike({
        music: 'loud',
      })
    ).toBe(false);
  });

  it('maps sound effects into stable audio categories', () => {
    expect(resolveSoundEffectCategory('combat-weapon')).toBe('combat');
    expect(resolveSoundEffectCategory('open')).toBe('ui');
    expect(resolveSoundEffectCategory('rain')).toBe('environment');
    expect(resolveSoundEffectCategory('hail')).toBe('environment');
    expect(resolveSoundEffectCategory('snowstorm')).toBe('environment');
    expect(resolveSoundEffectCategory('forest-ambience')).toBe('environment');
  });

  it('formats readable category labels for the settings ui', () => {
    expect(getAudioCategoryLabel('music')).toBe('Music');
    expect(getAudioCategoryLabel('creatures')).toBe('Creatures');
  });
});
