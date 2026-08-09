import './music-debug.css';
import { createMusicDebugPageState } from './music-debug-page-state.ts';
import { createMusicDebugPlaybackController } from './music-debug-playback.ts';
import { downloadMusicDebugMidiFile } from './music-debug-midi.ts';
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
  randomizeMusicDebugSeed,
  createMusicDebugSongPlayback,
  formatMusicDebugDuration,
  type MusicDebugOptions,
} from './music-debug.ts';
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
let previewOffsetMs = 0;
let playbackVisualState: MusicDebugPlaybackVisualState | null = null;
let playbackFrameHandle: number | null = null;

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
}

function seekToOffset(nextOffsetMs: number): void {
  const snapshot = pageState.refreshNow();
  previewOffsetMs = clampMusicDebugPreviewOffset(snapshot, nextOffsetMs);
  if (playbackController.isPlaying()) {
    playbackController.start(snapshot, {
      loop: loopInput?.checked === true,
      startOffsetMs: previewOffsetMs,
    });
    return;
  }
  renderPlaybackUi(snapshot);
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
  },
});
const playback = createMusicDebugSongPlayback();
const playbackController = createMusicDebugPlaybackController({
  playback,
  onPlayingChange(playing) {
    if (playButton) {
      playButton.textContent = playing ? 'Stop Song' : 'Play Song';
    }
    if (!playing) {
      stopPlaybackFrameLoop();
    }
  },
  onPlaybackCycle(state) {
    playbackVisualState = {
      snapshot: state.snapshot,
      region: state.region,
      startedAtMs: state.startedAtMs,
    };
    previewOffsetMs = state.region?.startOffsetMs ?? 0;
    renderPlaybackUi(state.snapshot);
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
  },
  playbackLeadMs: 8,
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

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  playbackController.stop();
  pageState.refreshNow();
});

form?.addEventListener('input', () => {
  playbackController.stop();
  pageState.scheduleRefresh();
});

playButton?.addEventListener('click', () => {
  if (playbackController.isPlaying()) {
    playbackController.stop();
    return;
  }
  const currentSnapshot = pageState.refreshNow();
  playbackController.start(currentSnapshot, {
    loop: loopInput?.checked === true,
    startOffsetMs: previewOffsetMs,
  });
});

randomizeButton?.addEventListener('click', () => {
  playbackController.stop();
  const randomized = randomizeMusicDebugSeed(collectOptions());
  if (clusterXInput) {
    clusterXInput.value = String(randomized.clusterX);
  }
  if (clusterYInput) {
    clusterYInput.value = String(randomized.clusterY);
  }
  pageState.refreshNow();
});

downloadButton?.addEventListener('click', () => {
  playbackController.stop();
  downloadMusicDebugMidiFile(pageState.refreshNow());
});

sectionButtons?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const offsetMs = Number(target.dataset.offsetMs ?? '0');
  seekToOffset(offsetMs);
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
  pageState.refreshNow();
  updatePreviewOffset(previewOffsetMs);
});
