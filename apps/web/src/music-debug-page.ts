import './music-debug.css';
import {
  createMusicDebugPagePersistenceController,
  loadMusicDebugPagePersistenceState,
  resolveMusicDebugPlaybackResumeOffset,
} from './music-debug-page-persistence.ts';
import { createMusicDebugPageState } from './music-debug-page-state.ts';
import { createMusicDebugPlaybackController } from './music-debug-playback.ts';
import { downloadMusicDebugMidiFile } from './music-debug-midi.ts';
import { createMusicDebugInstrumentPreviewPlayer } from './music-debug-instrument-preview.ts';
import { resolveMusicDebugInstrumentPreviewNote } from './music-debug-instrument-panel.ts';
import {
  clampMusicDebugPreviewOffset,
  resolveMusicDebugDisplayedOffsetMs,
  resolveMusicDebugPlaybackOffsetMs,
  resolveMusicDebugSectionJumpTargets,
  type MusicDebugPlaybackVisualState,
} from './music-debug-transport.ts';
import {
  buildMusicDebugShellMarkup,
  createCachedMusicDebugSnapshot,
  buildMusicDebugSummaryMarkup,
  normalizeMusicDebugOptions,
  randomizeMusicDebugSeed,
  createMusicDebugSongPlayback,
  formatMusicDebugDuration,
  type MusicDebugOptions,
} from './music-debug.ts';
import { MUSIC_DEBUG_PLAYBACK_CONTROLLER_LEAD_MS } from './music-debug-playback-profile.ts';
import {
  drawMusicDebugTimeline,
  resolveMusicDebugTimelineSeekOffset,
} from './music-debug-timeline.ts';

const root = document.querySelector<HTMLElement>('#app');

if (root) {
  root.innerHTML = buildMusicDebugShellMarkup();
}

const form = document.querySelector<HTMLFormElement>('#music-debug-form');
const summary = document.querySelector<HTMLElement>('#music-debug-summary');
const timeline = document.querySelector<HTMLCanvasElement>(
  '#music-debug-timeline'
);
const playButton =
  document.querySelector<HTMLButtonElement>('#music-debug-play');
const randomizeButton = document.querySelector<HTMLButtonElement>(
  '#music-debug-randomize'
);
const downloadButton = document.querySelector<HTMLButtonElement>(
  '#music-debug-download'
);
const loopInput = document.querySelector<HTMLInputElement>('#music-debug-loop');
const currentTimeLabel = document.querySelector<HTMLElement>(
  '#music-debug-current-time'
);
const currentSectionLabel = document.querySelector<HTMLElement>(
  '#music-debug-current-section'
);
const sectionButtons = document.querySelector<HTMLElement>(
  '#music-debug-section-buttons'
);
const clusterXInput = document.querySelector<HTMLInputElement>(
  'input[name="clusterX"]'
);
const clusterYInput = document.querySelector<HTMLInputElement>(
  'input[name="clusterY"]'
);
const scheduleAnimationFrame =
  globalThis.requestAnimationFrame?.bind(globalThis) ??
  ((callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16));
const cancelAnimationFrameFallback =
  globalThis.cancelAnimationFrame?.bind(globalThis) ??
  ((handle: number) => clearTimeout(handle));
const persistedState = loadMusicDebugPagePersistenceState(
  globalThis.localStorage ?? null
);
let previewOffsetMs = 0;
let playbackVisualState: MusicDebugPlaybackVisualState | null = null;
let playbackFrameHandle: number | null = null;
const pagePersistence = createMusicDebugPagePersistenceController({
  storage: globalThis.localStorage ?? null,
});

applyPersistedPageState();

function resolveCurrentSnapshot() {
  return pageState.currentSnapshot();
}

function resolveDisplayedOffsetMs(nowMs = performance.now()): number {
  return resolveMusicDebugDisplayedOffsetMs({
    playback: playbackVisualState,
    snapshot: resolveCurrentSnapshot(),
    previewOffsetMs,
    nowMs,
  });
}

function renderTransport(
  snapshot: ReturnType<typeof resolveCurrentSnapshot>
): void {
  if (!snapshot) {
    return;
  }
  const displayedOffsetMs = resolveDisplayedOffsetMs();
  if (currentTimeLabel) {
    currentTimeLabel.textContent = `${formatMusicDebugDuration(displayedOffsetMs)} / ${formatMusicDebugDuration(snapshot.durationMs)}`;
  }
  if (currentSectionLabel) {
    const currentSection =
      snapshot.song.sections.find(
        (section) =>
          displayedOffsetMs >= section.startOffsetMs &&
          displayedOffsetMs <
            section.startOffsetMs +
              section.durationMs +
              (section.loopEligible ? 1 : 0)
      ) ??
      snapshot.song.sections[snapshot.song.sections.length - 1] ??
      null;
    currentSectionLabel.textContent = currentSection
      ? `Section ${currentSection.label}`
      : 'Not playing';
  }
  if (sectionButtons) {
    sectionButtons.innerHTML = resolveMusicDebugSectionJumpTargets(snapshot)
      .map((target) => {
        const active =
          Math.abs(displayedOffsetMs - target.startOffsetMs) < 250
            ? ' data-active="true"'
            : '';
        return `<button type="button" class="music-debug-section-button"${active} data-offset-ms="${target.startOffsetMs}">${target.label}</button>`;
      })
      .join('');
  }
}

function renderTimeline(
  snapshot: ReturnType<typeof resolveCurrentSnapshot>
): void {
  if (!timeline || !snapshot) {
    return;
  }
  drawMusicDebugTimeline(timeline, snapshot, {
    playheadOffsetMs: resolveDisplayedOffsetMs(),
    activeRegion: playbackVisualState?.region ?? null,
  });
}

function renderPlaybackUi(snapshot = resolveCurrentSnapshot()): void {
  renderTransport(snapshot);
  renderTimeline(snapshot);
}

function stopPlaybackFrameLoop(): void {
  if (playbackFrameHandle === null) {
    return;
  }
  cancelAnimationFrameFallback(playbackFrameHandle);
  playbackFrameHandle = null;
}

function tickPlaybackFrame(): void {
  playbackFrameHandle = null;
  if (!playbackVisualState) {
    return;
  }
  renderPlaybackUi(playbackVisualState.snapshot);
  persistPageState(true, resolveDisplayedOffsetMs());
  playbackFrameHandle = scheduleAnimationFrame(() => {
    tickPlaybackFrame();
  });
}

function startPlaybackFrameLoop(): void {
  if (playbackFrameHandle !== null) {
    return;
  }
  playbackFrameHandle = scheduleAnimationFrame(() => {
    tickPlaybackFrame();
  });
}

function updatePreviewOffset(nextOffsetMs: number): void {
  const snapshot = resolveCurrentSnapshot();
  if (!snapshot) {
    previewOffsetMs = nextOffsetMs;
    return;
  }
  previewOffsetMs = clampMusicDebugPreviewOffset(snapshot, nextOffsetMs);
  renderPlaybackUi(snapshot);
  persistPageState(false);
}

function seekToOffset(nextOffsetMs: number): void {
  const snapshot = pageState.refreshNow();
  previewOffsetMs = clampMusicDebugPreviewOffset(snapshot, nextOffsetMs);
  if (playbackController.isPlaying()) {
    playbackController.start(snapshot, {
      loop: loopInput?.checked === true,
      startOffsetMs: previewOffsetMs,
    });
    persistPageState(true);
    return;
  }
  renderPlaybackUi(snapshot);
  persistPageState(false);
}

const pageState = createMusicDebugPageState({
  createSnapshot: () => createCachedMusicDebugSnapshot(collectOptions()),
  onSnapshot(nextSnapshot) {
    if (summary) {
      summary.innerHTML = buildMusicDebugSummaryMarkup(nextSnapshot);
    }
    previewOffsetMs = clampMusicDebugPreviewOffset(
      nextSnapshot,
      previewOffsetMs
    );
    renderPlaybackUi(nextSnapshot);
    persistPageState(playbackController.isPlaying());
  },
});
const playback = createMusicDebugSongPlayback();
const instrumentPreviewPlayer = createMusicDebugInstrumentPreviewPlayer();
const playbackController = createMusicDebugPlaybackController({
  playback,
  onPlayingChange(playing) {
    if (playButton) {
      playButton.textContent = playing ? 'Stop Song' : 'Play Song';
    }
    if (!playing) {
      stopPlaybackFrameLoop();
    }
    persistPageState(playing);
  },
  onPlaybackCycle(state) {
    playbackVisualState = {
      snapshot: state.snapshot,
      region: state.region,
      startedAtMs: state.startedAtMs,
    };
    previewOffsetMs = state.region?.startOffsetMs ?? 0;
    renderPlaybackUi(state.snapshot);
    persistPageState(true);
    startPlaybackFrameLoop();
  },
  onPlaybackStop() {
    if (playbackVisualState) {
      previewOffsetMs = resolveMusicDebugPlaybackOffsetMs(
        playbackVisualState,
        performance.now()
      );
    }
    playbackVisualState = null;
    renderPlaybackUi();
    persistPageState(false);
  },
  playbackLeadMs: MUSIC_DEBUG_PLAYBACK_CONTROLLER_LEAD_MS,
});

function warmMusicDebugPlayback(): void {
  playback.prepare?.();
}

document.addEventListener('pointerdown', warmMusicDebugPlayback, {
  passive: true,
  once: true,
});
document.addEventListener('keydown', warmMusicDebugPlayback, {
  passive: true,
  once: true,
});

function collectOptions(): Partial<MusicDebugOptions> {
  if (!form) {
    return {};
  }
  const data = new FormData(form);
  return {
    tileKind: String(data.get('tileKind') ?? ''),
    contextType: String(data.get('contextType') ?? ''),
    encounterMode: String(data.get('encounterMode') ?? ''),
    weatherKind: String(data.get('weatherKind') ?? ''),
    weatherIntensity: Number(data.get('weatherIntensity') ?? 0),
    dayProgress: Number(data.get('dayProgress') ?? 0),
    yearProgress: Number(data.get('yearProgress') ?? 0),
    clusterX: Number(data.get('clusterX') ?? 0),
    clusterY: Number(data.get('clusterY') ?? 0),
  } as Partial<MusicDebugOptions>;
}

function applyPersistedPageState(): void {
  if (!form || !persistedState) {
    return;
  }
  setNamedFormValue('tileKind', persistedState.options.tileKind);
  setNamedFormValue('contextType', persistedState.options.contextType);
  setNamedFormValue('encounterMode', persistedState.options.encounterMode);
  setNamedFormValue('weatherKind', persistedState.options.weatherKind);
  setNamedFormValue(
    'weatherIntensity',
    String(persistedState.options.weatherIntensity)
  );
  setNamedFormValue('dayProgress', String(persistedState.options.dayProgress));
  setNamedFormValue(
    'yearProgress',
    String(persistedState.options.yearProgress)
  );
  setNamedFormValue('clusterX', String(persistedState.options.clusterX));
  setNamedFormValue('clusterY', String(persistedState.options.clusterY));
  previewOffsetMs = persistedState.previewOffsetMs;
  if (loopInput) {
    loopInput.checked = persistedState.loopEnabled;
  }
}

function setNamedFormValue(name: string, value: string): void {
  const field = form?.elements.namedItem(name);
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  )) {
    return;
  }
  field.value = value;
}

function persistPageState(
  shouldResume: boolean,
  offsetMs = previewOffsetMs
): void {
  pagePersistence.save({
    options: normalizeMusicDebugOptions(collectOptions()),
    loopEnabled: loopInput?.checked === true,
    previewOffsetMs: offsetMs,
    shouldResume,
  });
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  instrumentPreviewPlayer.stop();
  playbackController.stop();
  pageState.refreshNow();
});

form?.addEventListener('input', () => {
  instrumentPreviewPlayer.stop();
  playbackController.stop();
  pageState.scheduleRefresh();
  persistPageState(false);
});

playButton?.addEventListener('click', () => {
  if (playbackController.isPlaying()) {
    playbackController.stop();
    return;
  }
  const currentSnapshot = pageState.refreshNow();
  const startOffsetMs = resolveMusicDebugPlaybackResumeOffset({
    snapshot: currentSnapshot,
    previewOffsetMs,
  });
  playbackController.start(currentSnapshot, {
    loop: loopInput?.checked === true,
    startOffsetMs,
  });
});

randomizeButton?.addEventListener('click', () => {
  instrumentPreviewPlayer.stop();
  playbackController.stop();
  const randomized = randomizeMusicDebugSeed(collectOptions());
  if (clusterXInput) {
    clusterXInput.value = String(randomized.clusterX);
  }
  if (clusterYInput) {
    clusterYInput.value = String(randomized.clusterY);
  }
  pageState.refreshNow();
  persistPageState(false);
});

downloadButton?.addEventListener('click', () => {
  instrumentPreviewPlayer.stop();
  playbackController.stop();
  downloadMusicDebugMidiFile(pageState.refreshNow());
});

summary?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const role = target.dataset.role;
  if (
    role !== 'lead' &&
    role !== 'harmony' &&
    role !== 'bass' &&
    role !== 'percussion'
  ) {
    return;
  }
  const snapshot = pageState.refreshNow();
  const note = resolveMusicDebugInstrumentPreviewNote(
    snapshot,
    role,
    performance.now()
  );
  if (!note) {
    return;
  }
  instrumentPreviewPlayer.stop();
  instrumentPreviewPlayer.play(note);
});

sectionButtons?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const offsetMs = Number(target.dataset.offsetMs ?? '0');
  seekToOffset(offsetMs);
});

loopInput?.addEventListener('change', () => {
  persistPageState(playbackController.isPlaying());
});

timeline?.addEventListener('click', (event) => {
  const bounds = timeline.getBoundingClientRect();
  const snapshot = pageState.refreshNow();
  const nextOffsetMs = resolveMusicDebugTimelineSeekOffset({
    snapshot,
    canvas: timeline,
    clientX: event.clientX,
    boundsLeft: bounds.left,
    boundsWidth: bounds.width,
  });
  seekToOffset(nextOffsetMs);
});

const scheduleAfterPaint =
  globalThis.requestAnimationFrame?.bind(globalThis) ??
  ((callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0));

scheduleAfterPaint(() => {
  const snapshot = pageState.refreshNow();
  if (persistedState?.shouldResume) {
    const startOffsetMs = resolveMusicDebugPlaybackResumeOffset({
      snapshot,
      previewOffsetMs,
    });
    playbackController.start(snapshot, {
      loop: loopInput?.checked === true,
      startOffsetMs,
    });
  }
  updatePreviewOffset(previewOffsetMs);
});

globalThis.addEventListener?.('pagehide', () => {
  pagePersistence.flush();
});
