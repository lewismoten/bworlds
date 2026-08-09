import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIO_PREFERENCES,
  formatAmbianceToggleLabel,
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
      ambianceEnabled: true,
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
    });
    expect(second).toEqual({
      musicEnabled: false,
      soundEnabled: false,
      ambianceEnabled: true,
    });
    expect(third).toEqual({
      musicEnabled: false,
      soundEnabled: false,
      ambianceEnabled: false,
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
});
