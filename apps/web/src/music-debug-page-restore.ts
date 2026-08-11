import {
  normalizeMusicDebugPercussionPlaybackState,
  type MusicDebugPercussionPlaybackState,
} from './music-debug-percussion-playback.ts';
import { setMusicDebugNamedFormValue } from './music-debug-form.ts';
import type { MusicDebugDisplayRole } from './music-debug-role-display.ts';
import type { MusicDebugPagePersistenceState } from './music-debug-page-persistence.ts';
import type { MusicDebugTrackPlaybackState } from './music-debug-track-playback.ts';

export type RestoredMusicDebugPageState = {
  previewOffsetMs: number;
  percussionPlaybackState: MusicDebugPercussionPlaybackState;
  hiddenRoles: MusicDebugDisplayRole[];
  trackPlaybackState: MusicDebugTrackPlaybackState;
};

export function restoreMusicDebugPageStateFromPersistence(options: {
  form: HTMLFormElement | null;
  persistedState: MusicDebugPagePersistenceState | null;
  loopInput: HTMLInputElement | null;
  playbackVariantSelect: HTMLSelectElement | null;
  playbackDryInput: HTMLInputElement | null;
}): RestoredMusicDebugPageState | null {
  const {
    form,
    persistedState,
    loopInput,
    playbackVariantSelect,
    playbackDryInput,
  } = options;
  if (!form || !persistedState) {
    return null;
  }

  setMusicDebugNamedFormValue(
    form,
    'tileKind',
    persistedState.options.tileKind
  );
  setMusicDebugNamedFormValue(
    form,
    'contextType',
    persistedState.options.contextType
  );
  setMusicDebugNamedFormValue(
    form,
    'encounterMode',
    persistedState.options.encounterMode
  );
  setMusicDebugNamedFormValue(
    form,
    'weatherKind',
    persistedState.options.weatherKind
  );
  setMusicDebugNamedFormValue(
    form,
    'weatherIntensity',
    String(persistedState.options.weatherIntensity)
  );
  setMusicDebugNamedFormValue(
    form,
    'combatIntensity',
    String(persistedState.options.combatIntensity)
  );
  setMusicDebugNamedFormValue(
    form,
    'dayProgress',
    String(persistedState.options.dayProgress)
  );
  setMusicDebugNamedFormValue(
    form,
    'yearProgress',
    String(persistedState.options.yearProgress)
  );
  setMusicDebugNamedFormValue(
    form,
    'clusterX',
    String(persistedState.options.clusterX)
  );
  setMusicDebugNamedFormValue(
    form,
    'clusterY',
    String(persistedState.options.clusterY)
  );

  if (loopInput) {
    loopInput.checked = persistedState.loopEnabled;
  }
  if (playbackVariantSelect) {
    playbackVariantSelect.value = persistedState.playbackVariant;
  }
  if (playbackDryInput) {
    playbackDryInput.checked = persistedState.dryPlaybackEnabled;
  }

  return {
    previewOffsetMs: persistedState.previewOffsetMs,
    percussionPlaybackState: normalizeMusicDebugPercussionPlaybackState(
      persistedState.percussionPlaybackState
    ),
    hiddenRoles: [...persistedState.hiddenRoles],
    trackPlaybackState: persistedState.trackPlaybackState,
  };
}
