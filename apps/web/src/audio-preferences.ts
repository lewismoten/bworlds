export type AudioPreferenceKey =
  'musicEnabled' | 'soundEnabled' | 'ambianceEnabled';

export type AudioPreferences = {
  musicEnabled: boolean;
  soundEnabled: boolean;
  ambianceEnabled: boolean;
};

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  musicEnabled: true,
  soundEnabled: true,
  ambianceEnabled: true,
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
    ambianceEnabled:
      typeof value?.ambianceEnabled === 'boolean'
        ? value.ambianceEnabled
        : DEFAULT_AUDIO_PREFERENCES.ambianceEnabled,
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

export function formatAmbianceToggleLabel(enabled: boolean): string {
  return `Ambiance: ${enabled ? 'On' : 'Off'}`;
}
