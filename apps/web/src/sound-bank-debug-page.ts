import './music-debug.css';
import './sound-bank-debug.css';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugSnapshot,
  DEFAULT_SOUND_BANK_DEBUG_OPTIONS,
  normalizeSoundBankDebugOptions,
  randomizeSoundBankDebugSeed,
  resolveSoundBankDebugPreviewNoteRole,
  type SoundBankDebugLayoutMode,
  type SoundBankDebugOptions,
} from './sound-bank-debug.ts';
import { createMusicDebugInstrumentPreviewPlayer } from './music-debug-instrument-preview.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';
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
  const outputLatencySeconds = instrumentPreviewPlayer.getOutputLatencySeconds();
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
    layoutMode,
    errorMessage,
  });
  bindPage(snapshot.musicSnapshot);
  syncAudioContextUi();
}

function bindPage(musicSnapshot: MusicDebugSnapshot): void {
  document
    .querySelector<HTMLFormElement>('#sound-bank-debug-form')
    ?.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        stopPreview();
        options = readFormOptions();
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
          const role = button.dataset.role as
            | keyof MusicDebugSnapshot['instrumentBank']['instruments']
            | undefined;
          if (!role) {
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
            { options, musicSnapshot },
            role,
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
          setAudioFeedback(`Previewing ${role}`, null);
        },
        pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
      );
    });
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
