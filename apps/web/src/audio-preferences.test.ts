import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIO_PREFERENCES,
  formatAudioCategoryVolumeLabel,
  formatAmbianceToggleLabel,
  formatMusicToggleLabel,
  formatSoundToggleLabel,
  normalizeAudioPreferences,
  setAudioCategoryVolume,
  toggleAudioPreference,
} from './audio-preferences.ts';

describe('audio preferences', () => {
  it('defaults missing preferences to enabled audio', () => {
    expect(normalizeAudioPreferences(null)).toEqual(DEFAULT_AUDIO_PREFERENCES);
    expect(normalizeAudioPreferences({ musicEnabled: false })).toEqual({
      musicEnabled: false,
      soundEnabled: true,
      ambianceEnabled: true,
      categoryVolumes: DEFAULT_AUDIO_PREFERENCES.categoryVolumes,
    });
  });

  it('toggles individual audio preferences without mutating the other channel', () => {
    const first = toggleAudioPreference(
      DEFAULT_AUDIO_PREFERENCES,
      'musicEnabled'
    );
    const second = toggleAudioPreference(first, 'soundEnabled');
    const third = toggleAudioPreference(second, 'ambianceEnabled');

    expect(first).toEqual({
      musicEnabled: false,
      soundEnabled: true,
      ambianceEnabled: true,
      categoryVolumes: DEFAULT_AUDIO_PREFERENCES.categoryVolumes,
    });
    expect(second).toEqual({
      musicEnabled: false,
      soundEnabled: false,
      ambianceEnabled: true,
      categoryVolumes: DEFAULT_AUDIO_PREFERENCES.categoryVolumes,
    });
    expect(third).toEqual({
      musicEnabled: false,
      soundEnabled: false,
      ambianceEnabled: false,
      categoryVolumes: DEFAULT_AUDIO_PREFERENCES.categoryVolumes,
    });
  });

  it('formats button labels for both audio channels', () => {
    expect(formatMusicToggleLabel(true)).toBe('Music: On');
    expect(formatMusicToggleLabel(false)).toBe('Music: Off');
    expect(formatSoundToggleLabel(true)).toBe('Sound: On');
    expect(formatSoundToggleLabel(false)).toBe('Sound: Off');
    expect(formatAmbianceToggleLabel(true)).toBe('Ambiance: On');
    expect(formatAmbianceToggleLabel(false)).toBe('Ambiance: Off');
  });

  it('stores normalized per-category volume preferences', () => {
    const next = setAudioCategoryVolume(
      DEFAULT_AUDIO_PREFERENCES,
      'combat',
      1.4
    );

    expect(next.categoryVolumes.combat).toBe(1);
    expect(next.categoryVolumes.music).toBe(1);
    expect(formatAudioCategoryVolumeLabel(0.455)).toBe('46%');
  });
});
