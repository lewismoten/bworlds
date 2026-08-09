import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIO_PREFERENCES,
  formatMusicToggleLabel,
  formatSoundToggleLabel,
  normalizeAudioPreferences,
  toggleAudioPreference,
} from './audio-preferences.ts';

describe('audio preferences', () => {
  it('defaults missing preferences to enabled audio', () => {
    expect(normalizeAudioPreferences(null)).toEqual(DEFAULT_AUDIO_PREFERENCES);
    expect(normalizeAudioPreferences({ musicEnabled: false })).toEqual({
      musicEnabled: false,
      soundEnabled: true,
    });
  });

  it('toggles individual audio preferences without mutating the other channel', () => {
    const first = toggleAudioPreference(DEFAULT_AUDIO_PREFERENCES, 'musicEnabled');
    const second = toggleAudioPreference(first, 'soundEnabled');

    expect(first).toEqual({
      musicEnabled: false,
      soundEnabled: true,
    });
    expect(second).toEqual({
      musicEnabled: false,
      soundEnabled: false,
    });
  });

  it('formats button labels for both audio channels', () => {
    expect(formatMusicToggleLabel(true)).toBe('Music: On');
    expect(formatMusicToggleLabel(false)).toBe('Music: Off');
    expect(formatSoundToggleLabel(true)).toBe('Sound: On');
    expect(formatSoundToggleLabel(false)).toBe('Sound: Off');
  });
});
