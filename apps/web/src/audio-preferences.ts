export type AudioPreferenceKey = 'musicEnabled' | 'soundEnabled';

export type AudioPreferences = {
  musicEnabled: boolean;
  soundEnabled: boolean;
};

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  musicEnabled: true,
  soundEnabled: true,
};

export function normalizeAudioPreferences(
  value: Partial<AudioPreferences> | null | undefined
): AudioPreferences {
  return {
    musicEnabled:
      typeof value?.musicEnabled === 'boolean'
        ? value.musicEnabled
        : DEFAULT_AUDIO_PREFERENCES.musicEnabled,
    soundEnabled:
      typeof value?.soundEnabled === 'boolean'
        ? value.soundEnabled
        : DEFAULT_AUDIO_PREFERENCES.soundEnabled,
  };
}

export function toggleAudioPreference(
  preferences: AudioPreferences,
  key: AudioPreferenceKey
): AudioPreferences {
  return {
    ...preferences,
    [key]: !preferences[key],
  };
}

export function formatMusicToggleLabel(enabled: boolean): string {
  return `Music: ${enabled ? 'On' : 'Off'}`;
}

export function formatSoundToggleLabel(enabled: boolean): string {
  return `Sound: ${enabled ? 'On' : 'Off'}`;
}
