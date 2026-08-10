import './music-debug.css';
import './sound-bank-debug.css';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugSnapshot,
  DEFAULT_SOUND_BANK_DEBUG_GENERAL_MIDI_BROWSER_STATE,
  DEFAULT_SOUND_BANK_DEBUG_PERCUSSION_BROWSER_STATE,
  DEFAULT_SOUND_BANK_DEBUG_OPTIONS,
  normalizeSoundBankDebugGeneralMidiBrowserState,
  normalizeSoundBankDebugPercussionBrowserState,
  normalizeSoundBankDebugOptions,
  randomizeSoundBankDebugSeed,
  resolveSoundBankDebugPreviewNoteRole,
  type SoundBankDebugGeneralMidiBrowserState,
  type SoundBankDebugLayoutMode,
  type SoundBankDebugOptions,
  type SoundBankDebugPercussionBrowserState,
  type SoundBankDebugSnapshot,
} from './sound-bank-debug.ts';
import { createMusicDebugInstrumentPreviewPlayer } from './music-debug-instrument-preview.ts';
import type { MusicDebugInstrumentPreviewTarget } from './music-debug-instrument-panel.ts';
import type {
  MusicDebugContextType,
  MusicDebugTileKind,
} from './music-debug.ts';

const root = document.querySelector<HTMLElement>('#app');
const pageLifecycleAbortController =
  typeof AbortController === 'function' ? new AbortController() : null;
const pageLifecycleSignal = pageLifecycleAbortController?.signal;
const instrumentPreviewPlayer = createMusicDebugInstrumentPreviewPlayer();
let options = DEFAULT_SOUND_BANK_DEBUG_OPTIONS;
let generalMidiBrowserState =
  DEFAULT_SOUND_BANK_DEBUG_GENERAL_MIDI_BROWSER_STATE;
let percussionBrowserState = DEFAULT_SOUND_BANK_DEBUG_PERCUSSION_BROWSER_STATE;
let audioStatus = 'Audio idle';
let errorMessage: string | null = null;
let layoutMode: SoundBankDebugLayoutMode = 'expanded';
const SOUND_BANK_TILE_KINDS: readonly MusicDebugTileKind[] = [
  'plains',
  'forest',
  'shore',
  'town',
  'mountain',
  'cave',
  'floor',
  'ruins',
  'tower',
  'stronghold',
  'observatory',
  'lighthouse',
];
const SOUND_BANK_CONTEXT_TYPES: readonly MusicDebugContextType[] = [
  'overworld',
  'town',
  'building',
  'cave',
  'dungeon',
];
function stopPreview(): void {
  instrumentPreviewPlayer.stop();
}

function disposePreview(): void {
  instrumentPreviewPlayer.dispose();
}

function syncAudioContextUi(): void {
  const audioContextState = instrumentPreviewPlayer.getAudioState();
  const sampleRate = instrumentPreviewPlayer.getAudioSampleRate();
  const outputLatencySeconds =
    instrumentPreviewPlayer.getOutputLatencySeconds();
  const masterGain = instrumentPreviewPlayer.getMasterGain();
  const muted = instrumentPreviewPlayer.isMuted();
  document
    .querySelector<HTMLElement>('#sound-bank-debug-context-state')
    ?.replaceChildren(document.createTextNode(audioContextState));
  document
    .querySelector<HTMLElement>('#sound-bank-debug-sample-rate')
    ?.replaceChildren(
      document.createTextNode(
        typeof sampleRate === 'number'
          ? `${Math.round(sampleRate).toLocaleString()} Hz`
          : 'Unavailable until audio starts'
      )
    );
  document
    .querySelector<HTMLElement>('#sound-bank-debug-output-latency')
    ?.replaceChildren(
      document.createTextNode(
        typeof outputLatencySeconds === 'number'
          ? `${(outputLatencySeconds * 1000).toFixed(1)} ms`
          : 'Unavailable until audio starts'
      )
    );
  const masterGainInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-master-gain'
  );
  if (masterGainInput) {
    masterGainInput.value = String(Math.round(masterGain * 100));
  }
  document
    .querySelector<HTMLOutputElement>('#sound-bank-debug-master-gain-value')
    ?.replaceChildren(
      document.createTextNode(`${Math.round(masterGain * 100)}%`)
    );
  const muteButton = document.querySelector<HTMLButtonElement>(
    '#sound-bank-debug-toggle-mute'
  );
  if (muteButton) {
    muteButton.ariaPressed = String(muted);
    muteButton.textContent = muted ? 'Unmute Audio' : 'Mute Audio';
  }

  const startButton = document.querySelector<HTMLButtonElement>(
    '#sound-bank-debug-start-audio'
  );
  if (startButton) {
    startButton.disabled = audioContextState !== 'idle';
  }

  const resumeButton = document.querySelector<HTMLButtonElement>(
    '#sound-bank-debug-resume-audio'
  );
  if (resumeButton) {
    resumeButton.disabled = audioContextState !== 'suspended';
  }
}

function setAudioFeedback(nextStatus: string, nextError: string | null): void {
  audioStatus = nextStatus;
  errorMessage = nextError;
  document
    .querySelector<HTMLElement>('#sound-bank-debug-audio-status')
    ?.replaceChildren(document.createTextNode(audioStatus));
  syncAudioContextUi();
  const errorPanel = document.querySelector<HTMLElement>(
    '.sound-bank-debug-error'
  );
  if (nextError) {
    if (errorPanel) {
      errorPanel.textContent = nextError;
      return;
    }
    renderPage();
    return;
  }
  errorPanel?.remove();
}

function readFormOptions(): SoundBankDebugOptions {
  const form = document.querySelector<HTMLFormElement>(
    '#sound-bank-debug-form'
  );
  if (!form) {
    return options;
  }
  const formData = new FormData(form);
  const tileKind = formData.get('tileKind');
  const contextType = formData.get('contextType');
  return normalizeSoundBankDebugOptions({
    tileKind:
      typeof tileKind === 'string' &&
      SOUND_BANK_TILE_KINDS.includes(tileKind as MusicDebugTileKind)
        ? (tileKind as MusicDebugTileKind)
        : undefined,
    contextType:
      typeof contextType === 'string' &&
      SOUND_BANK_CONTEXT_TYPES.includes(contextType as MusicDebugContextType)
        ? (contextType as MusicDebugContextType)
        : undefined,
    clusterX: Number(formData.get('clusterX') ?? options.clusterX),
    clusterY: Number(formData.get('clusterY') ?? options.clusterY),
    dayProgress: Number(formData.get('dayProgress') ?? options.dayProgress),
    yearProgress: Number(formData.get('yearProgress') ?? options.yearProgress),
  });
}

function readGeneralMidiBrowserState(): SoundBankDebugGeneralMidiBrowserState {
  const form = document.querySelector<HTMLFormElement>(
    '#sound-bank-debug-form'
  );
  if (!form) {
    return generalMidiBrowserState;
  }
  const formData = new FormData(form);
  return normalizeSoundBankDebugGeneralMidiBrowserState({
    searchQuery:
      typeof formData.get('generalMidiSearchQuery') === 'string'
        ? String(formData.get('generalMidiSearchQuery'))
        : generalMidiBrowserState.searchQuery,
    familyFilter:
      typeof formData.get('generalMidiFamilyFilter') === 'string'
        ? String(formData.get('generalMidiFamilyFilter'))
        : generalMidiBrowserState.familyFilter,
    roleFilter:
      typeof formData.get('generalMidiRoleFilter') === 'string'
        ? (String(
            formData.get('generalMidiRoleFilter')
          ) as SoundBankDebugGeneralMidiBrowserState['roleFilter'])
        : generalMidiBrowserState.roleFilter,
    playableMidiNote:
      typeof formData.get('generalMidiPlayableMidiNote') === 'string'
        ? String(formData.get('generalMidiPlayableMidiNote'))
        : generalMidiBrowserState.playableMidiNote,
    selectedProgramNumber:
      typeof formData.get('generalMidiSelectedProgramNumber') === 'string'
        ? String(formData.get('generalMidiSelectedProgramNumber'))
        : generalMidiBrowserState.selectedProgramNumber,
    sortMode:
      typeof formData.get('generalMidiSortMode') === 'string'
        ? (String(
            formData.get('generalMidiSortMode')
          ) as SoundBankDebugGeneralMidiBrowserState['sortMode'])
        : generalMidiBrowserState.sortMode,
  });
}

function readPercussionBrowserState(): SoundBankDebugPercussionBrowserState {
  const form = document.querySelector<HTMLFormElement>(
    '#sound-bank-debug-form'
  );
  if (!form) {
    return percussionBrowserState;
  }
  const formData = new FormData(form);
  return normalizeSoundBankDebugPercussionBrowserState({
    familyFilter:
      typeof formData.get('percussionFamilyFilter') === 'string'
        ? (String(
            formData.get('percussionFamilyFilter')
          ) as SoundBankDebugPercussionBrowserState['familyFilter'])
        : percussionBrowserState.familyFilter,
  });
}

function isSoundBankPreviewRole(
  value: string | undefined
): value is MusicDebugInstrumentPreviewTarget {
  return (
    value === 'lead' ||
    value === 'harmony' ||
    value === 'bass' ||
    value === 'percussion' ||
    (value?.startsWith('percussion:') === true && value.length > 11)
  );
}

function renderPage(): void {
  if (!root) {
    return;
  }
  const snapshot = createSoundBankDebugSnapshot(options);
  root.innerHTML = buildSoundBankDebugMarkup(snapshot, {
    audioStatus,
    audioContextState: instrumentPreviewPlayer.getAudioState(),
    audioSampleRateHz: instrumentPreviewPlayer.getAudioSampleRate(),
    outputLatencySeconds: instrumentPreviewPlayer.getOutputLatencySeconds(),
    masterGain: instrumentPreviewPlayer.getMasterGain(),
    muted: instrumentPreviewPlayer.isMuted(),
    layoutMode,
    errorMessage,
    generalMidiBrowserState,
    percussionBrowserState,
  });
  bindPage(snapshot);
  syncAudioContextUi();
}

function bindPage(snapshot: SoundBankDebugSnapshot): void {
  document
    .querySelector<HTMLFormElement>('#sound-bank-debug-form')
    ?.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        stopPreview();
        options = readFormOptions();
        generalMidiBrowserState = readGeneralMidiBrowserState();
        percussionBrowserState = readPercussionBrowserState();
        audioStatus = 'Audio idle';
        errorMessage = null;
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-layout-compact')
    ?.addEventListener(
      'click',
      () => {
        layoutMode = 'compact';
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-layout-expanded')
    ?.addEventListener(
      'click',
      () => {
        layoutMode = 'expanded';
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-toggle-mute')
    ?.addEventListener(
      'click',
      () => {
        const nextMuted = instrumentPreviewPlayer.setMuted(
          !instrumentPreviewPlayer.isMuted()
        );
        setAudioFeedback(
          nextMuted ? 'Audio muted' : 'Audio unmuted',
          errorMessage
        );
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLInputElement>('#sound-bank-debug-master-gain')
    ?.addEventListener(
      'input',
      (event) => {
        const target = event.currentTarget as HTMLInputElement;
        const nextGain = instrumentPreviewPlayer.setMasterGain(
          Number(target.value) / 100
        );
        const nextStatus =
          nextGain <= 0
            ? 'Audio muted'
            : `Master gain ${Math.round(nextGain * 100)}%`;
        setAudioFeedback(nextStatus, errorMessage);
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-start-audio')
    ?.addEventListener(
      'click',
      () => {
        const audioContextState = instrumentPreviewPlayer.start();
        if (audioContextState === 'unavailable') {
          setAudioFeedback(
            'Audio unavailable',
            'This browser does not expose the Web Audio API for previews.'
          );
          return;
        }
        setAudioFeedback(
          audioContextState === 'running'
            ? 'Audio ready'
            : `Audio context ${audioContextState}`,
          null
        );
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-resume-audio')
    ?.addEventListener(
      'click',
      () => {
        const audioContextState = instrumentPreviewPlayer.resume();
        if (audioContextState === 'unavailable') {
          setAudioFeedback(
            'Audio unavailable',
            'This browser does not expose the Web Audio API for previews.'
          );
          return;
        }
        setAudioFeedback(
          audioContextState === 'running'
            ? 'Audio resumed'
            : `Audio context ${audioContextState}`,
          null
        );
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-randomize')
    ?.addEventListener(
      'click',
      () => {
        stopPreview();
        options = randomizeSoundBankDebugSeed(readFormOptions());
        generalMidiBrowserState = readGeneralMidiBrowserState();
        audioStatus = 'Audio idle';
        errorMessage = null;
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-reset')
    ?.addEventListener(
      'click',
      () => {
        stopPreview();
        options = DEFAULT_SOUND_BANK_DEBUG_OPTIONS;
        generalMidiBrowserState =
          DEFAULT_SOUND_BANK_DEBUG_GENERAL_MIDI_BROWSER_STATE;
        percussionBrowserState = DEFAULT_SOUND_BANK_DEBUG_PERCUSSION_BROWSER_STATE;
        audioStatus = 'Audio idle';
        errorMessage = null;
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelectorAll<HTMLButtonElement>('.music-debug-instrument-play')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const previewTarget = button.dataset.previewId;
          if (!isSoundBankPreviewRole(previewTarget)) {
            return;
          }
          if (instrumentPreviewPlayer.getAudioState() === 'unavailable') {
            setAudioFeedback(
              'Audio unavailable',
              'This browser does not expose the Web Audio API for previews.'
            );
            return;
          }
          const previewNote = resolveSoundBankDebugPreviewNoteRole(
            snapshot,
            previewTarget,
            performance.now()
          );
          if (!previewNote) {
            setAudioFeedback(
              'Audio unavailable',
              'No preview note could be resolved for this role.'
            );
            return;
          }
          stopPreview();
          instrumentPreviewPlayer.play(previewNote);
          setAudioFeedback(
            `Previewing ${previewTarget.replace('percussion:', 'percussion / ')}`,
            null
          );
        },
        pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
      );
    });

  document
    .querySelector<HTMLSelectElement>('#sound-bank-debug-percussion-family-filter')
    ?.addEventListener(
      'change',
      () => {
        percussionBrowserState = readPercussionBrowserState();
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLInputElement>('#sound-bank-debug-midi-search')
    ?.addEventListener(
      'input',
      () => {
        generalMidiBrowserState = readGeneralMidiBrowserState();
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLSelectElement>('#sound-bank-debug-midi-family-filter')
    ?.addEventListener(
      'change',
      () => {
        generalMidiBrowserState = readGeneralMidiBrowserState();
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLSelectElement>('#sound-bank-debug-midi-role-filter')
    ?.addEventListener(
      'change',
      () => {
        generalMidiBrowserState = readGeneralMidiBrowserState();
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLInputElement>('#sound-bank-debug-midi-range-filter')
    ?.addEventListener(
      'input',
      () => {
        generalMidiBrowserState = readGeneralMidiBrowserState();
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLInputElement>('#sound-bank-debug-midi-selected-program')
    ?.addEventListener(
      'input',
      () => {
        generalMidiBrowserState = readGeneralMidiBrowserState();
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLSelectElement>('#sound-bank-debug-midi-sort')
    ?.addEventListener(
      'change',
      () => {
        generalMidiBrowserState = readGeneralMidiBrowserState();
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-midi-previous')
    ?.addEventListener(
      'click',
      (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const programNumber = target.dataset.programNumber;
        if (!programNumber) {
          return;
        }
        generalMidiBrowserState =
          normalizeSoundBankDebugGeneralMidiBrowserState({
            ...readGeneralMidiBrowserState(),
            selectedProgramNumber: programNumber,
          });
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-midi-next')
    ?.addEventListener(
      'click',
      (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const programNumber = target.dataset.programNumber;
        if (!programNumber) {
          return;
        }
        generalMidiBrowserState =
          normalizeSoundBankDebugGeneralMidiBrowserState({
            ...readGeneralMidiBrowserState(),
            selectedProgramNumber: programNumber,
          });
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );
}

globalThis.addEventListener?.(
  'pagehide',
  () => {
    disposePreview();
  },
  pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
);

import.meta.hot?.dispose(() => {
  pageLifecycleAbortController?.abort();
  disposePreview();
});

renderPage();
