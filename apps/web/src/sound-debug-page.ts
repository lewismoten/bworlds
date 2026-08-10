import './sound-debug.css';
import { restorePersistedPageScrollY } from './page-scroll-state.ts';
import {
  createSoundDebugPagePersistenceController,
  loadSoundDebugPagePersistenceState,
} from './sound-debug-page-persistence.ts';
import {
  buildSoundDebugShellMarkup,
  createSoundDebugRenderableSnapshot,
  normalizeSoundDebugPresetId,
} from './sound-debug.ts';
import { encodeMonoPcm16Wav } from './wav-file.ts';

const root = document.querySelector<HTMLElement>('#app');
const pageLifecycleAbortController =
  typeof AbortController === 'function' ? new AbortController() : null;
const pageLifecycleSignal = pageLifecycleAbortController?.signal;
const persistedState = loadSoundDebugPagePersistenceState(
  globalThis.sessionStorage ?? null,
  undefined,
  import.meta.hot
);
const pagePersistence = createSoundDebugPagePersistenceController({
  storage: globalThis.sessionStorage ?? null,
  hmr: import.meta.hot,
});
let selectedPresetId = normalizeSoundDebugPresetId(persistedState?.presetId);
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
  const playButton =
    document.querySelector<HTMLButtonElement>('#sound-debug-play');
  if (playButton) {
    playButton.textContent = 'Play Sound';
  }
}

function playSnapshot(): void {
  const snapshot = createSoundDebugRenderableSnapshot(selectedPresetId);
  const nextAudioContext =
    audioContext ??
    (typeof AudioContext === 'function' ? new AudioContext() : null);

  if (!nextAudioContext) {
    return;
  }

  audioContext = nextAudioContext;
  audioContext.resume?.();
  stopPlayback();

  const buffer = audioContext.createBuffer(
    1,
    snapshot.samples.length,
    snapshot.sampleRate
  );
  buffer.getChannelData(0).set(snapshot.samples);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.onended = () => {
    if (activeSource === source) {
      activeSource = null;
    }
    const playButton =
      document.querySelector<HTMLButtonElement>('#sound-debug-play');
    if (playButton) {
      playButton.textContent = 'Play Sound';
    }
  };
  source.start();
  activeSource = source;

  const playButton =
    document.querySelector<HTMLButtonElement>('#sound-debug-play');
  if (playButton) {
    playButton.textContent = 'Stop Sound';
  }
}

function downloadSnapshot(): void {
  const snapshot = createSoundDebugRenderableSnapshot(selectedPresetId);
  const wav = encodeMonoPcm16Wav({
    samples: snapshot.samples,
    sampleRate: snapshot.sampleRate,
  });
  const blob = new Blob([new Uint8Array(wav).buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${snapshot.preset.id}.wav`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderPage(): void {
  const snapshot = createSoundDebugRenderableSnapshot(selectedPresetId);
  if (!root) {
    return;
  }

  const scrollY = Math.max(0, Math.round(globalThis.scrollY ?? 0));
  root.innerHTML = buildSoundDebugShellMarkup(snapshot);

  document
    .querySelectorAll<HTMLButtonElement>('.sound-debug-preset-button')
    .forEach((button) => {
      button.addEventListener('click', () => {
        selectedPresetId = normalizeSoundDebugPresetId(button.dataset.presetId);
        stopPlayback();
        renderPage();
      });
    });

  document
    .querySelector<HTMLButtonElement>('#sound-debug-play')
    ?.addEventListener('click', () => {
      if (activeSource) {
        stopPlayback();
        return;
      }
      playSnapshot();
    });

  document
    .querySelector<HTMLButtonElement>('#sound-debug-download')
    ?.addEventListener('click', downloadSnapshot);

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
