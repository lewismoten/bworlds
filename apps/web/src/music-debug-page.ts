import './music-debug.css';
import { SESSION_STORAGE_KEY, parseSavedSession } from './session-state.ts';
import {
  buildRuntimePerformanceSnapshot,
  normalizeRuntimePerformanceTrackingPreferences,
  postRuntimePerformanceSnapshot,
  type RuntimePerformanceSnapshot,
  type RuntimePerformanceSnapshotTrigger,
} from './runtime-performance-tracking.ts';
import {
  collectMusicDebugFormOptions,
  setMusicDebugNamedFormValue,
} from './music-debug-form.ts';
import {
  createMusicDebugPagePersistenceController,
  loadMusicDebugPagePersistenceState,
} from './music-debug-page-persistence.ts';
import { restorePersistedPageScrollY } from './page-scroll-state.ts';
import { createMusicDebugPageState } from './music-debug-page-state.ts';
import { createMusicDebugPlaybackController } from './music-debug-playback.ts';
import { downloadMusicDebugMidiFile } from './music-debug-midi.ts';
import { normalizeMusicDebugMidiExportVariant } from './music-debug-midi-export-variant.ts';
import { downloadMusicDebugExportBundle } from './music-debug-export-bundle.ts';
import { createMusicDebugInstrumentPreviewPlayer } from './music-debug-instrument-preview.ts';
import { saveRejectedMusicDebugReport } from './music-debug-rejection-report-storage.ts';
import {
  buildMusicDebugInstrumentPanelMarkup,
  resolveMusicDebugInstrumentPreviewNote,
  type MusicDebugInstrumentPreviewTarget,
} from './music-debug-instrument-panel.ts';
import { resolveMusicDebugLivePlaybackIntent } from './music-debug-live-playback.ts';
import { resolveMusicDebugPlaybackIntent } from './music-debug-playback-intent.ts';
import {
  normalizeMusicDebugPlaybackVariant,
  resolveMusicDebugPlaybackRoles,
} from './music-debug-playback-variant.ts';
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
  formatMusicDebugDisplayRoleLabel,
  MUSIC_DEBUG_DISPLAY_ROLE_ORDER,
  type MusicDebugDisplayRole,
} from './music-debug-role-display.ts';
import {
  drawMusicDebugTimeline,
  resolveMusicDebugTimelineHoverDetail,
  resolveMusicDebugTimelineSeekOffset,
} from './music-debug-timeline.ts';
import {
  createMusicDebugDrumKitAuditionNotes,
  normalizeMusicDebugPercussionPlaybackState,
  resolveMusicDebugPercussionVoiceIdsForPlayback,
  toggleMusicDebugPercussionMutedVoice,
  toggleMusicDebugPercussionSoloVoice,
  type MusicDebugPercussionPlaybackState,
} from './music-debug-percussion-playback.ts';

const root = document.querySelector<HTMLElement>('#app');
const pageLifecycleAbortController =
  typeof AbortController === 'function' ? new AbortController() : null;
const pageLifecycleSignal = pageLifecycleAbortController?.signal;

if (root) {
  root.innerHTML = buildMusicDebugShellMarkup();
}

const form = document.querySelector<HTMLFormElement>('#music-debug-form');
const summary = document.querySelector<HTMLElement>('#music-debug-summary');
const instrumentPanelRoot = document.querySelector<HTMLElement>(
  '#music-debug-instrument-panel-root'
);
const timeline = document.querySelector<HTMLCanvasElement>(
  '#music-debug-timeline'
);
const timelineHover = document.querySelector<HTMLElement>(
  '#music-debug-timeline-hover'
);
const trackVisibilityRoot = document.querySelector<HTMLElement>(
  '#music-debug-track-visibility'
);
const playButton =
  document.querySelector<HTMLButtonElement>('#music-debug-play');
const playbackVariantSelect = document.querySelector<HTMLSelectElement>(
  '#music-debug-playback-variant'
);
const playbackDryInput = document.querySelector<HTMLInputElement>(
  '#music-debug-playback-dry'
);
const randomizeButton = document.querySelector<HTMLButtonElement>(
  '#music-debug-randomize'
);
const downloadButton = document.querySelector<HTMLButtonElement>(
  '#music-debug-download'
);
const downloadBundleButton = document.querySelector<HTMLButtonElement>(
  '#music-debug-download-bundle'
);
const exportVariantSelect = document.querySelector<HTMLSelectElement>(
  '#music-debug-export-variant'
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
  globalThis.localStorage ?? null,
  undefined,
  import.meta.hot
);
const runtimePerformanceTrackingPreferences =
  normalizeRuntimePerformanceTrackingPreferences(
    parseSavedSession(
      globalThis.localStorage?.getItem(SESSION_STORAGE_KEY) ?? null
    )
  );
let previewOffsetMs = 0;
let playbackVisualState: MusicDebugPlaybackVisualState | null = null;
let playbackFrameHandle: number | null = null;
let percussionPlaybackState: MusicDebugPercussionPlaybackState =
  normalizeMusicDebugPercussionPlaybackState(null);
let hiddenRoles: MusicDebugDisplayRole[] = [];
const pagePersistence = createMusicDebugPagePersistenceController({
  storage: globalThis.localStorage ?? null,
  hmr: import.meta.hot,
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
    visibleRoles: resolveVisibleTimelineRoles(),
  });
}

function resolveVisibleTimelineRoles(): MusicDebugDisplayRole[] {
  return MUSIC_DEBUG_DISPLAY_ROLE_ORDER.filter(
    (role) => !hiddenRoles.includes(role)
  );
}

function buildTrackVisibilityButtonMarkup(role: MusicDebugDisplayRole): string {
  const hidden = hiddenRoles.includes(role);
  const label = formatMusicDebugDisplayRoleLabel(role);
  const icon = hidden
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4 20 21" /><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.3 5.4A10.9 10.9 0 0 1 12 5c5.5 0 9.3 4.7 10 7-.3 1-1.2 2.6-2.7 4.1" /><path d="M6.7 6.8C4.4 8.1 2.8 10.2 2 12c.7 2.3 4.5 7 10 7 1.6 0 3-.3 4.3-.8" /></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c.7-2.3 4.5-7 10-7s9.3 4.7 10 7c-.7 2.3-4.5 7-10 7S2.7 14.3 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>';
  return `<button type="button" class="music-debug-track-visibility-button" data-role="${role}" aria-pressed="${hidden}" aria-label="${hidden ? `Show ${label}` : `Hide ${label}`}">${icon}<span>${label}</span></button>`;
}

function renderTrackVisibilityControls(): void {
  if (!trackVisibilityRoot) {
    return;
  }
  trackVisibilityRoot.innerHTML = MUSIC_DEBUG_DISPLAY_ROLE_ORDER.map((role) =>
    buildTrackVisibilityButtonMarkup(role)
  ).join('');
}

function renderPlaybackUi(snapshot = resolveCurrentSnapshot()): void {
  renderTransport(snapshot);
  renderTimeline(snapshot);
}

function syncPlaybackControls(
  snapshot = resolveCurrentSnapshot(),
  playing = playbackController.isPlaying()
): void {
  if (!playButton || !snapshot) {
    return;
  }
  const intent = resolveMusicDebugPlaybackIntent({
    snapshot,
    previewOffsetMs,
    loopEnabled: loopInput?.checked === true,
  });
  playButton.textContent = playing
    ? intent.activeButtonLabel
    : intent.idleButtonLabel;
}

function resolveSelectedPlaybackRoles(
  value = playbackVariantSelect?.value
): ReturnType<typeof resolveMusicDebugPlaybackRoles> {
  return resolveMusicDebugPlaybackRoles(
    normalizeMusicDebugPlaybackVariant(value)
  );
}

function resolveSelectedDryPlaybackEnabled(
  checked = playbackDryInput?.checked
): boolean {
  return checked === true;
}

function resolveSelectedPercussionVoiceIds(
  snapshot = resolveCurrentSnapshot()
): readonly string[] | null {
  if (!snapshot) {
    return null;
  }
  return resolveMusicDebugPercussionVoiceIdsForPlayback(
    snapshot,
    percussionPlaybackState
  );
}

function renderSummary(
  snapshot: ReturnType<typeof resolveCurrentSnapshot>
): void {
  if (!summary || !snapshot) {
    return;
  }
  summary.innerHTML = buildMusicDebugSummaryMarkup(snapshot, {
    percussionPlaybackState,
  });
}

function renderInstrumentPanel(
  snapshot: ReturnType<typeof resolveCurrentSnapshot>
): void {
  if (!instrumentPanelRoot || !snapshot) {
    return;
  }
  instrumentPanelRoot.innerHTML =
    buildMusicDebugInstrumentPanelMarkup(snapshot);
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
      ...resolveMusicDebugPlaybackIntent({
        snapshot,
        previewOffsetMs,
        loopEnabled: loopInput?.checked === true,
      }),
      roles: resolveSelectedPlaybackRoles(),
      percussionVoiceIds: resolveSelectedPercussionVoiceIds(snapshot),
      dry: resolveSelectedDryPlaybackEnabled(),
    });
    persistPageState(true);
    return;
  }
  renderPlaybackUi(snapshot);
  persistPageState(false);
}

const pageState = createMusicDebugPageState({
  createSnapshot: () => {
    const startedAtMs = performance.now();
    const snapshot = createCachedMusicDebugSnapshot(collectOptions());
    saveRejectedMusicDebugReport(snapshot, globalThis.localStorage ?? null);
    reportMusicDebugRuntimePerformanceSnapshot('song-generated', snapshot, {
      songGenerationMs: performance.now() - startedAtMs,
    });
    return snapshot;
  },
  onSnapshot(nextSnapshot) {
    renderInstrumentPanel(nextSnapshot);
    renderSummary(nextSnapshot);
    if (playbackController.isPlaying()) {
      playbackController.start(nextSnapshot, {
        ...resolveMusicDebugLivePlaybackIntent({
          snapshot: nextSnapshot,
          playback: playbackVisualState,
          previewOffsetMs,
          loopEnabled: loopInput?.checked === true,
          nowMs: performance.now(),
        }),
        roles: resolveSelectedPlaybackRoles(),
        percussionVoiceIds: resolveSelectedPercussionVoiceIds(nextSnapshot),
        dry: resolveSelectedDryPlaybackEnabled(),
      });
      return;
    }
    previewOffsetMs = clampMusicDebugPreviewOffset(
      nextSnapshot,
      previewOffsetMs
    );
    renderPlaybackUi(nextSnapshot);
    syncPlaybackControls(nextSnapshot);
    persistPageState(playbackController.isPlaying());
  },
});
const playback = createMusicDebugSongPlayback();
const instrumentPreviewPlayer = createMusicDebugInstrumentPreviewPlayer();
const playbackController = createMusicDebugPlaybackController({
  playback,
  onPlayingChange(playing) {
    syncPlaybackControls(resolveCurrentSnapshot(), playing);
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
  ...(pageLifecycleSignal ? { signal: pageLifecycleSignal } : {}),
});
document.addEventListener('keydown', warmMusicDebugPlayback, {
  passive: true,
  once: true,
  ...(pageLifecycleSignal ? { signal: pageLifecycleSignal } : {}),
});

function collectOptions(): Partial<MusicDebugOptions> {
  return collectMusicDebugFormOptions(form);
}

function buildMusicDebugSnapshotContext(
  snapshot: ReturnType<typeof resolveCurrentSnapshot>
) {
  if (!snapshot) {
    return null;
  }

  return {
    id: `${snapshot.options.contextType}:${snapshot.options.tileKind}:${snapshot.options.clusterX}:${snapshot.options.clusterY}`,
    label: `${snapshot.options.contextType} ${snapshot.options.tileKind}`,
    depth: 0,
  };
}

function reportMusicDebugRuntimePerformanceSnapshot(
  trigger: RuntimePerformanceSnapshotTrigger,
  snapshot: ReturnType<typeof resolveCurrentSnapshot>,
  metrics: Partial<RuntimePerformanceSnapshot['metrics']>
): void {
  if (!runtimePerformanceTrackingPreferences.enabled || !snapshot) {
    return;
  }

  void postRuntimePerformanceSnapshot(
    buildRuntimePerformanceSnapshot({
      source: 'music-debug',
      trigger,
      route: window.location.pathname || '/debug/music',
      worldSeed: null,
      context: buildMusicDebugSnapshotContext(snapshot),
      metrics,
    })
  );
}

function applyPersistedPageState(): void {
  if (!form || !persistedState) {
    return;
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
  previewOffsetMs = persistedState.previewOffsetMs;
  if (loopInput) {
    loopInput.checked = persistedState.loopEnabled;
  }
  if (playbackVariantSelect) {
    playbackVariantSelect.value = persistedState.playbackVariant;
  }
  if (playbackDryInput) {
    playbackDryInput.checked = persistedState.dryPlaybackEnabled;
  }
  percussionPlaybackState = normalizeMusicDebugPercussionPlaybackState(
    persistedState.percussionPlaybackState
  );
  hiddenRoles = [...persistedState.hiddenRoles];
  renderTrackVisibilityControls();
}

function persistPageState(
  shouldResume: boolean,
  offsetMs = previewOffsetMs
): void {
  pagePersistence.save({
    options: normalizeMusicDebugOptions(collectOptions()),
    loopEnabled: loopInput?.checked === true,
    playbackVariant: normalizeMusicDebugPlaybackVariant(
      playbackVariantSelect?.value
    ),
    dryPlaybackEnabled: resolveSelectedDryPlaybackEnabled(),
    percussionPlaybackState,
    hiddenRoles,
    previewOffsetMs: offsetMs,
    shouldResume,
    scrollY: Math.max(0, Math.round(globalThis.scrollY ?? 0)),
  });
}

globalThis.addEventListener?.(
  'scroll',
  () => {
    persistPageState(playbackController.isPlaying());
  },
  { passive: true }
);

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  instrumentPreviewPlayer.stop();
  pageState.refreshNow();
});

form?.addEventListener('input', () => {
  instrumentPreviewPlayer.stop();
  pageState.scheduleRefresh();
  persistPageState(playbackController.isPlaying(), resolveDisplayedOffsetMs());
});

playButton?.addEventListener('click', () => {
  if (playbackController.isPlaying()) {
    playbackController.stop();
    return;
  }
  const currentSnapshot = pageState.refreshNow();
  playbackController.start(currentSnapshot, {
    ...resolveMusicDebugPlaybackIntent({
      snapshot: currentSnapshot,
      previewOffsetMs,
      loopEnabled: loopInput?.checked === true,
    }),
    roles: resolveSelectedPlaybackRoles(),
    percussionVoiceIds: resolveSelectedPercussionVoiceIds(currentSnapshot),
    dry: resolveSelectedDryPlaybackEnabled(),
  });
});

randomizeButton?.addEventListener('click', () => {
  instrumentPreviewPlayer.stop();
  const randomized = randomizeMusicDebugSeed(collectOptions());
  if (clusterXInput) {
    clusterXInput.value = String(randomized.clusterX);
  }
  if (clusterYInput) {
    clusterYInput.value = String(randomized.clusterY);
  }
  pageState.refreshNow();
  persistPageState(playbackController.isPlaying(), resolveDisplayedOffsetMs());
});

downloadButton?.addEventListener('click', () => {
  instrumentPreviewPlayer.stop();
  playbackController.stop();
  const snapshot = pageState.refreshNow();
  const startedAtMs = performance.now();
  downloadMusicDebugMidiFile(snapshot, undefined, {
    variant: normalizeMusicDebugMidiExportVariant(exportVariantSelect?.value),
  });
  reportMusicDebugRuntimePerformanceSnapshot('midi-export', snapshot, {
    midiExportMs: performance.now() - startedAtMs,
  });
});

downloadBundleButton?.addEventListener('click', () => {
  instrumentPreviewPlayer.stop();
  playbackController.stop();
  const snapshot = pageState.refreshNow();
  const metrics = downloadMusicDebugExportBundle(snapshot, undefined, {
    variant: normalizeMusicDebugMidiExportVariant(exportVariantSelect?.value),
  });
  reportMusicDebugRuntimePerformanceSnapshot('bundle-export', snapshot, {
    midiExportMs: metrics.midiExportMs,
    wavExportMs: metrics.wavExportMs,
  });
});

function handleInstrumentPreviewClick(event: Event): boolean {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return false;
  }
  const previewTarget = normalizeInstrumentPreviewTarget(
    target.dataset.previewId
  );
  if (!previewTarget) {
    return false;
  }
  const snapshot = pageState.refreshNow();
  const note = resolveMusicDebugInstrumentPreviewNote(
    snapshot,
    previewTarget,
    performance.now()
  );
  if (!note) {
    return true;
  }
  instrumentPreviewPlayer.stop();
  instrumentPreviewPlayer.play(note);
  return true;
}

summary?.addEventListener('click', (event) => {
  if (handleInstrumentPreviewClick(event)) {
    return;
  }
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const percussionAction = target.dataset.percussionPlaybackAction;
  const percussionVoiceId = target.dataset.percussionVoiceId;
  if (
    percussionAction &&
    percussionVoiceId &&
    (percussionAction === 'solo' || percussionAction === 'mute')
  ) {
    percussionPlaybackState =
      percussionAction === 'solo'
        ? toggleMusicDebugPercussionSoloVoice(
            percussionPlaybackState,
            percussionVoiceId
          )
        : toggleMusicDebugPercussionMutedVoice(
            percussionPlaybackState,
            percussionVoiceId
          );
    const snapshot = pageState.refreshNow();
    renderSummary(snapshot);
    if (playbackController.isPlaying()) {
      playbackController.start(snapshot, {
        ...resolveMusicDebugLivePlaybackIntent({
          snapshot,
          playback: playbackVisualState,
          previewOffsetMs,
          loopEnabled: loopInput?.checked === true,
          nowMs: performance.now(),
        }),
        roles: resolveSelectedPlaybackRoles(),
        percussionVoiceIds: resolveSelectedPercussionVoiceIds(snapshot),
        dry: resolveSelectedDryPlaybackEnabled(),
      });
    }
    persistPageState(
      playbackController.isPlaying(),
      resolveDisplayedOffsetMs()
    );
    return;
  }
  if (percussionAction === 'audition-pattern') {
    const snapshot = pageState.refreshNow();
    const notes = createMusicDebugDrumKitAuditionNotes(
      snapshot,
      percussionPlaybackState,
      performance.now()
    );
    if (notes.length === 0) {
      return;
    }
    instrumentPreviewPlayer.stop();
    for (const note of notes) {
      instrumentPreviewPlayer.play(note);
    }
    return;
  }
});

instrumentPanelRoot?.addEventListener('click', (event) => {
  handleInstrumentPreviewClick(event);
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
  syncPlaybackControls();
  persistPageState(playbackController.isPlaying());
});

playbackVariantSelect?.addEventListener('change', () => {
  if (playbackController.isPlaying()) {
    const snapshot = pageState.refreshNow();
    playbackController.start(snapshot, {
      ...resolveMusicDebugLivePlaybackIntent({
        snapshot,
        playback: playbackVisualState,
        previewOffsetMs,
        loopEnabled: loopInput?.checked === true,
        nowMs: performance.now(),
      }),
      roles: resolveSelectedPlaybackRoles(),
      percussionVoiceIds: resolveSelectedPercussionVoiceIds(snapshot),
      dry: resolveSelectedDryPlaybackEnabled(),
    });
    persistPageState(true, resolveDisplayedOffsetMs());
    return;
  }
  persistPageState(false);
});

playbackDryInput?.addEventListener('change', () => {
  if (playbackController.isPlaying()) {
    const snapshot = pageState.refreshNow();
    playbackController.start(snapshot, {
      ...resolveMusicDebugLivePlaybackIntent({
        snapshot,
        playback: playbackVisualState,
        previewOffsetMs,
        loopEnabled: loopInput?.checked === true,
        nowMs: performance.now(),
      }),
      roles: resolveSelectedPlaybackRoles(),
      percussionVoiceIds: resolveSelectedPercussionVoiceIds(snapshot),
      dry: resolveSelectedDryPlaybackEnabled(),
    });
    persistPageState(true, resolveDisplayedOffsetMs());
    return;
  }
  persistPageState(false);
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

timeline?.addEventListener('pointermove', (event) => {
  if (!timelineHover) {
    return;
  }
  const snapshot = resolveCurrentSnapshot();
  if (!snapshot) {
    hideTimelineHover();
    return;
  }
  const bounds = timeline.getBoundingClientRect();
  const hoverDetail = resolveMusicDebugTimelineHoverDetail({
    snapshot,
    canvas: timeline,
    clientX: event.clientX,
    clientY: event.clientY,
    boundsLeft: bounds.left,
    boundsTop: bounds.top,
    boundsWidth: bounds.width,
    boundsHeight: bounds.height,
    visibleRoles: resolveVisibleTimelineRoles(),
  });
  if (!hoverDetail) {
    hideTimelineHover();
    return;
  }
  showTimelineHover({
    label: hoverDetail.hoverLabel,
    durationLabel: hoverDetail.hoverDurationLabel,
    x:
      ((event.clientX - bounds.left) / Math.max(1, bounds.width)) *
      timeline.clientWidth,
    y:
      ((event.clientY - bounds.top) / Math.max(1, bounds.height)) *
      timeline.clientHeight,
  });
});

timeline?.addEventListener('pointerleave', hideTimelineHover);

trackVisibilityRoot?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const button = target.closest<HTMLButtonElement>(
    '.music-debug-track-visibility-button'
  );
  const role = button?.dataset.role as MusicDebugDisplayRole | undefined;
  if (!button || !role) {
    return;
  }
  hiddenRoles = hiddenRoles.includes(role)
    ? hiddenRoles.filter((entry) => entry !== role)
    : [...hiddenRoles, role];
  renderTrackVisibilityControls();
  renderPlaybackUi();
  persistPageState(playbackController.isPlaying(), resolveDisplayedOffsetMs());
});

const scheduleAfterPaint =
  globalThis.requestAnimationFrame?.bind(globalThis) ??
  ((callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0));

scheduleAfterPaint(() => {
  const snapshot = pageState.refreshNow();
  if (persistedState?.shouldResume) {
    playbackController.start(snapshot, {
      ...resolveMusicDebugPlaybackIntent({
        snapshot,
        previewOffsetMs,
        loopEnabled: loopInput?.checked === true,
      }),
      roles: resolveSelectedPlaybackRoles(persistedState.playbackVariant),
      percussionVoiceIds: resolveSelectedPercussionVoiceIds(snapshot),
      dry: resolveSelectedDryPlaybackEnabled(persistedState.dryPlaybackEnabled),
    });
  }
  updatePreviewOffset(previewOffsetMs);
  syncPlaybackControls(snapshot);
  restorePersistedPageScrollY(persistedState?.scrollY ?? 0);
});

renderTrackVisibilityControls();

globalThis.addEventListener?.(
  'pagehide',
  () => {
    persistPageState(playbackController.isPlaying());
    pagePersistence.flush();
  },
  pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
);

function normalizeInstrumentPreviewTarget(
  value: string | undefined
): MusicDebugInstrumentPreviewTarget | null {
  if (
    value === 'lead' ||
    value === 'harmony' ||
    value === 'bass' ||
    value === 'percussion'
  ) {
    return value;
  }
  if (value?.startsWith('percussion:') === true && value.length > 11) {
    return value as MusicDebugInstrumentPreviewTarget;
  }
  return null;
}

import.meta.hot?.on('vite:beforeUpdate', () => {
  persistPageState(playbackController.isPlaying());
  pagePersistence.flush();
});

import.meta.hot?.dispose(() => {
  pageLifecycleAbortController?.abort();
  persistPageState(playbackController.isPlaying());
  pagePersistence.flush();
});

function showTimelineHover(options: {
  label: string;
  durationLabel: string;
  x: number;
  y: number;
}): void {
  if (!timelineHover || !timeline) {
    return;
  }
  timelineHover.hidden = false;
  timelineHover.textContent = `${options.label} • ${options.durationLabel}`;
  timelineHover.style.left = `${Math.max(
    12,
    Math.min(timeline.clientWidth - 12, options.x)
  )}px`;
  timelineHover.style.top = `${Math.max(12, options.y - 10)}px`;
  timeline.title = `${options.label} (${options.durationLabel})`;
}

function hideTimelineHover(): void {
  if (!timelineHover || !timeline) {
    return;
  }
  timelineHover.hidden = true;
  timelineHover.textContent = '';
  timeline.removeAttribute('title');
}
