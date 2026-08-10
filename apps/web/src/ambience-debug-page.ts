import './ambience-debug.css';
import {
  buildAmbienceDebugSnapshot,
  buildAmbienceDebugShellMarkup,
  normalizeAmbienceDebugPresetId,
} from './ambience-debug.ts';
import { restorePersistedPageScrollY } from './page-scroll-state.ts';
import { encodeMonoPcm16Wav } from './wav-file.ts';
import {
  createAmbienceDebugPagePersistenceController,
  loadAmbienceDebugPagePersistenceState,
} from './ambience-debug-page-persistence.ts';

const root = document.querySelector<HTMLElement>('#app');
const pageLifecycleAbortController =
  typeof AbortController === 'function' ? new AbortController() : null;
const pageLifecycleSignal = pageLifecycleAbortController?.signal;
const persistedState = loadAmbienceDebugPagePersistenceState(
  globalThis.sessionStorage ?? null,
  undefined,
  import.meta.hot
);
const pagePersistence = createAmbienceDebugPagePersistenceController({
  storage: globalThis.sessionStorage ?? null,
  hmr: import.meta.hot,
});
let selectedPresetId = normalizeAmbienceDebugPresetId(persistedState?.presetId);
let audioContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;

function persistPageState(): void {
  pagePersistence.save({
    presetId: selectedPresetId,
    scrollY: Math.max(0, Math.round(globalThis.scrollY ?? 0)),
  });
}

function stopPlayback(): void {
  activeSource?.stop();
  activeSource = null;
  const button = document.querySelector<HTMLButtonElement>(
    '#ambience-debug-play'
  );
  if (button) {
    button.textContent = 'Play Ambience';
  }
}

function playSamples(
  samples: Float32Array,
  sampleRate: number,
  buttonLabel: string
): void {
  const nextAudioContext =
    audioContext ??
    (typeof AudioContext === 'function' ? new AudioContext() : null);
  if (!nextAudioContext) {
    return;
  }

  audioContext = nextAudioContext;
  void audioContext.resume?.();
  stopPlayback();

  const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
  buffer.getChannelData(0).set(samples);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.onended = () => {
    if (activeSource === source) {
      activeSource = null;
    }
    const button = document.querySelector<HTMLButtonElement>(
      '#ambience-debug-play'
    );
    if (buttonLabel === 'ambience' && button) {
      button.textContent = 'Play Ambience';
    }
  };
  source.start();
  activeSource = source;

  if (buttonLabel === 'ambience') {
    const button = document.querySelector<HTMLButtonElement>(
      '#ambience-debug-play'
    );
    if (button) {
      button.textContent = 'Stop Ambience';
    }
  }
}

function downloadSamples(
  filename: string,
  samples: Float32Array,
  sampleRate: number
): void {
  const wav = encodeMonoPcm16Wav({ samples, sampleRate });
  const blob = new Blob([new Uint8Array(wav).buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderPage(): void {
  const snapshot = buildAmbienceDebugSnapshot(selectedPresetId);
  if (!root) {
    return;
  }
  const scrollY = Math.max(0, Math.round(globalThis.scrollY ?? 0));
  root.innerHTML = buildAmbienceDebugShellMarkup(snapshot);

  document
    .querySelectorAll<HTMLButtonElement>('.ambience-debug-preset-button')
    .forEach((button) => {
      button.addEventListener('click', () => {
        selectedPresetId = normalizeAmbienceDebugPresetId(
          button.dataset.presetId
        );
        stopPlayback();
        renderPage();
      });
    });

  document
    .querySelector<HTMLButtonElement>('#ambience-debug-play')
    ?.addEventListener('click', () => {
      if (activeSource) {
        stopPlayback();
        return;
      }
      playSamples(snapshot.minuteMixSamples, snapshot.sampleRate, 'ambience');
    });

  document
    .querySelector<HTMLButtonElement>('#ambience-debug-download-minute')
    ?.addEventListener('click', () => {
      downloadSamples(
        `${snapshot.preset.id}-minute.wav`,
        snapshot.minuteMixSamples,
        snapshot.sampleRate
      );
    });

  document
    .querySelectorAll<HTMLButtonElement>('[data-cue-play]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const cue = snapshot.cues.find(
          (entry) => entry.id === button.dataset.cuePlay
        );
        if (!cue) {
          return;
        }
        playSamples(cue.samples, snapshot.sampleRate, 'cue');
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('[data-cue-download]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const cue = snapshot.cues.find(
          (entry) => entry.id === button.dataset.cueDownload
        );
        if (!cue) {
          return;
        }
        downloadSamples(`${cue.id}.wav`, cue.samples, snapshot.sampleRate);
      });
    });

  persistPageState();
  restorePersistedPageScrollY(scrollY);
}

globalThis.addEventListener?.(
  'scroll',
  persistPageState,
  pageLifecycleSignal
    ? { passive: true, signal: pageLifecycleSignal }
    : { passive: true }
);

globalThis.addEventListener?.(
  'pagehide',
  () => {
    persistPageState();
    pagePersistence.flush();
    stopPlayback();
  },
  pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
);

import.meta.hot?.on('vite:beforeUpdate', () => {
  persistPageState();
  pagePersistence.flush();
  stopPlayback();
});

import.meta.hot?.dispose(() => {
  pageLifecycleAbortController?.abort();
  persistPageState();
  pagePersistence.flush();
  stopPlayback();
});

renderPage();
restorePersistedPageScrollY(persistedState?.scrollY ?? 0);
