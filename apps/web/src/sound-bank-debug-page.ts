import './music-debug.css';
import './sound-bank-debug.css';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugQuietPercussionPatternNotes,
  createSoundBankDebugPercussionRangeAuditionNotes,
  createSoundBankDebugStandardPercussionPatternNotes,
  createSoundBankDebugSnapshot,
  DEFAULT_SOUND_BANK_DEBUG_GENERAL_MIDI_BROWSER_STATE,
  DEFAULT_SOUND_BANK_DEBUG_PERCUSSION_BROWSER_STATE,
  DEFAULT_SOUND_BANK_DEBUG_OPTIONS,
  normalizeSoundBankDebugGeneralMidiBrowserState,
  normalizeSoundBankDebugPercussionBrowserState,
  normalizeSoundBankDebugOptions,
  randomizeSoundBankDebugSeed,
  resolveSoundBankDebugReferencePreviewPhraseRole,
  resolveSoundBankDebugPreviewPhraseRole,
  resolveSoundBankDebugPreviewNoteRole,
  type SoundBankDebugGeneralMidiBrowserState,
  type SoundBankDebugLayoutMode,
  type SoundBankDebugOptions,
  type SoundBankDebugPercussionBrowserState,
  type SoundBankDebugPreviewEnvelopeState,
  type SoundBankDebugPreviewOscillatorState,
  type SoundBankDebugPreviewTimbreState,
  type SoundBankDebugPreviewMode,
  type SoundBankDebugSnapshot,
} from './sound-bank-debug.ts';
import { normalizeSoundBankDebugPreviewEnvelopeState } from './sound-bank-debug-preview-envelope.ts';
import {
  normalizeSoundBankDebugPreviewOscillatorState,
  resolveSoundBankDebugPreviewOscillatorDefaults,
} from './sound-bank-debug-preview-oscillators.ts';
import { normalizeSoundBankDebugPreviewTimbreState } from './sound-bank-debug-preview-timbre.ts';
import type { MusicDebugInstrumentPreviewTarget } from './music-debug-instrument-panel.ts';
import type {
  MusicDebugInstrumentPreviewAudioState,
  MusicDebugInstrumentPreviewPlayer,
} from './music-debug-instrument-preview.ts';
import type { KnownGoodInstrumentPatchRole } from './music-instrument-timbres.ts';
import type {
  MusicDebugContextType,
  MusicDebugTileKind,
} from './music-debug.ts';

const root = document.querySelector<HTMLElement>('#app');
const pageLifecycleAbortController =
  typeof AbortController === 'function' ? new AbortController() : null;
const pageLifecycleSignal = pageLifecycleAbortController?.signal;
let instrumentPreviewPlayer: MusicDebugInstrumentPreviewPlayer | null = null;
let instrumentPreviewPlayerPromise: Promise<MusicDebugInstrumentPreviewPlayer> | null =
  null;
let options = DEFAULT_SOUND_BANK_DEBUG_OPTIONS;
let generalMidiBrowserState =
  DEFAULT_SOUND_BANK_DEBUG_GENERAL_MIDI_BROWSER_STATE;
let percussionBrowserState = DEFAULT_SOUND_BANK_DEBUG_PERCUSSION_BROWSER_STATE;
let audioStatus = 'Audio idle';
let errorMessage: string | null = null;
let layoutMode: SoundBankDebugLayoutMode = 'expanded';
let previewMode: SoundBankDebugPreviewMode = 'processed';
let previewEnvelopeState: SoundBankDebugPreviewEnvelopeState | null = null;
let previewOscillatorState: SoundBankDebugPreviewOscillatorState | null = null;
let previewTimbreState: SoundBankDebugPreviewTimbreState | null = null;
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

async function ensureInstrumentPreviewPlayer(): Promise<MusicDebugInstrumentPreviewPlayer> {
  if (instrumentPreviewPlayer) {
    return instrumentPreviewPlayer;
  }
  if (!instrumentPreviewPlayerPromise) {
    instrumentPreviewPlayerPromise =
      import('./music-debug-instrument-preview.ts').then(
        ({ createMusicDebugInstrumentPreviewPlayer }) => {
          const player = createMusicDebugInstrumentPreviewPlayer();
          instrumentPreviewPlayer = player;
          return player;
        }
      );
  }
  return instrumentPreviewPlayerPromise;
}

function getInstrumentPreviewAudioState(): MusicDebugInstrumentPreviewAudioState {
  return instrumentPreviewPlayer?.getAudioState() ?? 'idle';
}

function getInstrumentPreviewAudioSampleRate(): number | null {
  return instrumentPreviewPlayer?.getAudioSampleRate() ?? null;
}

function getInstrumentPreviewOutputLatencySeconds(): number | null {
  return instrumentPreviewPlayer?.getOutputLatencySeconds() ?? null;
}

function getInstrumentPreviewMasterGain(): number {
  return instrumentPreviewPlayer?.getMasterGain() ?? 1;
}

function isInstrumentPreviewMuted(): boolean {
  return instrumentPreviewPlayer?.isMuted() ?? false;
}

function stopPreview(): void {
  instrumentPreviewPlayer?.stop();
}

function disposePreview(): void {
  instrumentPreviewPlayer?.dispose();
  instrumentPreviewPlayer = null;
  instrumentPreviewPlayerPromise = null;
}

function syncAudioContextUi(): void {
  const audioContextState = getInstrumentPreviewAudioState();
  const sampleRate = getInstrumentPreviewAudioSampleRate();
  const outputLatencySeconds = getInstrumentPreviewOutputLatencySeconds();
  const masterGain = getInstrumentPreviewMasterGain();
  const muted = isInstrumentPreviewMuted();
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

function normalizeReferencePatchRole(
  value: string | undefined
): KnownGoodInstrumentPatchRole | null {
  return value === 'lead' ||
    value === 'harmony' ||
    value === 'bass' ||
    value === 'percussion'
    ? value
    : null;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function renderPage(): void {
  if (!root) {
    return;
  }
  const snapshot = createSoundBankDebugSnapshot(options);
  root.innerHTML = buildSoundBankDebugMarkup(snapshot, {
    audioStatus,
    audioContextState: getInstrumentPreviewAudioState(),
    audioSampleRateHz: getInstrumentPreviewAudioSampleRate(),
    outputLatencySeconds: getInstrumentPreviewOutputLatencySeconds(),
    masterGain: getInstrumentPreviewMasterGain(),
    muted: isInstrumentPreviewMuted(),
    layoutMode,
    previewMode,
    errorMessage,
    generalMidiBrowserState,
    percussionBrowserState,
    previewEnvelopeState,
    previewOscillatorState,
    previewTimbreState,
  });
  bindPage(snapshot);
  syncAudioContextUi();
}

function readPreviewTimbreState(): SoundBankDebugPreviewTimbreState | null {
  const controls = document.querySelector<HTMLElement>(
    '[data-preview-timbre-id]'
  );
  const instrumentId = controls?.dataset.previewTimbreId?.trim();
  if (!instrumentId) {
    return null;
  }

  return normalizeSoundBankDebugPreviewTimbreState(
    {
      instrumentId,
      detuneCents: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-timbre-detune'
        )?.value
      ),
      filterCutoffHz: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-timbre-filter-cutoff'
        )?.value
      ),
      filterQ: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-timbre-filter-q'
        )?.value
      ),
      noiseMix: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-timbre-noise-mix'
        )?.value
      ),
    },
    {
      instrumentId,
    }
  );
}

function readPreviewEnvelopeState(): SoundBankDebugPreviewEnvelopeState | null {
  const controls = document.querySelector<HTMLElement>(
    '.sound-bank-debug-preview-envelope'
  );
  const instrumentId = controls?.dataset.instrumentId?.trim();
  if (!instrumentId) {
    return null;
  }

  return normalizeSoundBankDebugPreviewEnvelopeState(
    {
      instrumentId,
      attackMs: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-envelope-attack'
        )?.value
      ),
      decayMs: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-envelope-decay'
        )?.value
      ),
      sustainLevel: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-envelope-sustain'
        )?.value
      ),
      releaseMs: Number(
        document.querySelector<HTMLInputElement>(
          '#sound-bank-debug-envelope-release'
        )?.value
      ),
    },
    {
      instrumentId,
    }
  );
}

function readPreviewOscillatorState(): SoundBankDebugPreviewOscillatorState | null {
  const controls = document.querySelector<HTMLElement>(
    '[data-preview-oscillator-id]'
  );
  const instrumentId = controls?.dataset.previewOscillatorId?.trim();
  if (!instrumentId) {
    return null;
  }

  return normalizeSoundBankDebugPreviewOscillatorState(
    previewOscillatorState ?? {
      instrumentId,
    },
    {
      instrumentId,
    }
  );
}

function syncPreviewEnvelopeUi(): void {
  const attackInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-envelope-attack'
  );
  const decayInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-envelope-decay'
  );
  const sustainInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-envelope-sustain'
  );
  const releaseInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-envelope-release'
  );

  document
    .querySelector<HTMLOutputElement>('#sound-bank-debug-envelope-attack-value')
    ?.replaceChildren(
      document.createTextNode(`${attackInput?.value ?? '0'}ms`)
    );
  document
    .querySelector<HTMLOutputElement>('#sound-bank-debug-envelope-decay-value')
    ?.replaceChildren(document.createTextNode(`${decayInput?.value ?? '0'}ms`));
  document
    .querySelector<HTMLOutputElement>(
      '#sound-bank-debug-envelope-sustain-value'
    )
    ?.replaceChildren(
      document.createTextNode(Number(sustainInput?.value ?? 0).toFixed(2))
    );
  document
    .querySelector<HTMLOutputElement>(
      '#sound-bank-debug-envelope-release-value'
    )
    ?.replaceChildren(
      document.createTextNode(`${releaseInput?.value ?? '0'}ms`)
    );
}

function syncPreviewTimbreUi(): void {
  const detuneInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-timbre-detune'
  );
  const filterCutoffInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-timbre-filter-cutoff'
  );
  const filterQInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-timbre-filter-q'
  );
  const noiseMixInput = document.querySelector<HTMLInputElement>(
    '#sound-bank-debug-timbre-noise-mix'
  );

  document
    .querySelector<HTMLOutputElement>('#sound-bank-debug-timbre-detune-value')
    ?.replaceChildren(document.createTextNode(`${detuneInput?.value ?? '0'}c`));
  document
    .querySelector<HTMLOutputElement>(
      '#sound-bank-debug-timbre-filter-cutoff-value'
    )
    ?.replaceChildren(
      document.createTextNode(`${filterCutoffInput?.value ?? '0'}Hz`)
    );
  document
    .querySelector<HTMLOutputElement>('#sound-bank-debug-timbre-filter-q-value')
    ?.replaceChildren(
      document.createTextNode(Number(filterQInput?.value ?? 0).toFixed(1))
    );
  document
    .querySelector<HTMLOutputElement>(
      '#sound-bank-debug-timbre-noise-mix-value'
    )
    ?.replaceChildren(
      document.createTextNode(Number(noiseMixInput?.value ?? 0).toFixed(2))
    );
}

function resolveSelectedRuntimeInstrument(snapshot: SoundBankDebugSnapshot) {
  const selectedProgramNumber = Number.parseInt(
    readGeneralMidiBrowserState().selectedProgramNumber,
    10
  );
  if (!Number.isInteger(selectedProgramNumber)) {
    return null;
  }

  const selectedEntry =
    snapshot.instrumentRegistry.entries.find(
      (entry) =>
        entry.isValid &&
        entry.generalMidiProgramNumber === selectedProgramNumber &&
        entry.sourcePlugin === 'core-generated-bank'
    ) ?? null;
  if (!selectedEntry) {
    return null;
  }

  return (
    Object.values(snapshot.musicSnapshot.instrumentBank.instruments).find(
      (instrument) => instrument.id === selectedEntry.id
    ) ?? null
  );
}

function togglePreviewOscillatorCarrier(
  snapshot: SoundBankDebugSnapshot
): void {
  const instrument = resolveSelectedRuntimeInstrument(snapshot);
  if (!instrument) {
    return;
  }
  const current = normalizeSoundBankDebugPreviewOscillatorState(
    readPreviewOscillatorState(),
    resolveSoundBankDebugPreviewOscillatorDefaults(instrument)
  );
  previewOscillatorState = {
    ...current,
    carrierEnabled: !current.carrierEnabled,
    soloTarget: current.soloTarget === 'carrier' ? 'all' : current.soloTarget,
  };
  renderPage();
}

function togglePreviewOscillatorHarmonic(
  snapshot: SoundBankDebugSnapshot
): void {
  const instrument = resolveSelectedRuntimeInstrument(snapshot);
  if (!instrument) {
    return;
  }
  const current = normalizeSoundBankDebugPreviewOscillatorState(
    readPreviewOscillatorState(),
    resolveSoundBankDebugPreviewOscillatorDefaults(instrument)
  );
  previewOscillatorState = {
    ...current,
    harmonicEnabled: !current.harmonicEnabled,
    soloTarget: current.soloTarget === 'harmonic' ? 'all' : current.soloTarget,
  };
  renderPage();
}

function togglePreviewOscillatorSolo(
  snapshot: SoundBankDebugSnapshot,
  soloTarget: 'carrier' | 'harmonic'
): void {
  const instrument = resolveSelectedRuntimeInstrument(snapshot);
  if (!instrument) {
    return;
  }
  const current = normalizeSoundBankDebugPreviewOscillatorState(
    readPreviewOscillatorState(),
    resolveSoundBankDebugPreviewOscillatorDefaults(instrument)
  );
  previewOscillatorState = {
    ...current,
    soloTarget: current.soloTarget === soloTarget ? 'all' : soloTarget,
  };
  renderPage();
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
        previewEnvelopeState = null;
        previewOscillatorState = null;
        previewTimbreState = null;
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
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-preview-mode-processed'
    )
    ?.addEventListener(
      'click',
      () => {
        previewMode = 'processed';
        setAudioFeedback('Processed previews enabled', null);
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-preview-mode-dry')
    ?.addEventListener(
      'click',
      () => {
        previewMode = 'dry';
        setAudioFeedback('Dry previews enabled', null);
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>('#sound-bank-debug-toggle-mute')
    ?.addEventListener(
      'click',
      async () => {
        const player = await ensureInstrumentPreviewPlayer();
        const nextMuted = player.setMuted(!player.isMuted());
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
      async (event) => {
        const target = event.currentTarget as HTMLInputElement;
        const player = await ensureInstrumentPreviewPlayer();
        const nextGain = player.setMasterGain(Number(target.value) / 100);
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
      async () => {
        const player = await ensureInstrumentPreviewPlayer();
        const audioContextState = player.start();
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
      async () => {
        const player = await ensureInstrumentPreviewPlayer();
        const audioContextState = player.resume();
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
        previewEnvelopeState = null;
        previewOscillatorState = null;
        previewTimbreState = null;
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
        percussionBrowserState =
          DEFAULT_SOUND_BANK_DEBUG_PERCUSSION_BROWSER_STATE;
        previewEnvelopeState = null;
        previewOscillatorState = null;
        previewTimbreState = null;
        previewMode = 'processed';
        audioStatus = 'Audio idle';
        errorMessage = null;
        renderPage();
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelectorAll<HTMLButtonElement>(
      '.music-debug-instrument-play, .music-debug-instrument-play-phrase'
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        async () => {
          const previewTarget = button.dataset.previewId;
          const referencePatchRole = normalizeReferencePatchRole(
            button.dataset.referencePatchRole
          );
          if (!referencePatchRole && !isSoundBankPreviewRole(previewTarget)) {
            return;
          }
          const player = await ensureInstrumentPreviewPlayer();
          if (player.getAudioState() === 'unavailable') {
            setAudioFeedback(
              'Audio unavailable',
              'This browser does not expose the Web Audio API for previews.'
            );
            return;
          }
          const nowMs = performance.now();
          const previewNotes = referencePatchRole
            ? resolveSoundBankDebugReferencePreviewPhraseRole(
                snapshot,
                referencePatchRole,
                nowMs,
                {
                  dry: previewMode === 'dry',
                }
              )
            : button.classList.contains('music-debug-instrument-play-phrase')
              ? resolveSoundBankDebugPreviewPhraseRole(
                  snapshot,
                  previewTarget,
                  nowMs,
                  {
                    dry: previewMode === 'dry',
                    envelope: readPreviewEnvelopeState(),
                    oscillators: readPreviewOscillatorState(),
                    timbre: readPreviewTimbreState(),
                  }
                )
              : (() => {
                  const previewNote = resolveSoundBankDebugPreviewNoteRole(
                    snapshot,
                    previewTarget,
                    nowMs,
                    {
                      dry: previewMode === 'dry',
                      envelope: readPreviewEnvelopeState(),
                      oscillators: readPreviewOscillatorState(),
                      timbre: readPreviewTimbreState(),
                    }
                  );
                  return previewNote ? [previewNote] : [];
                })();
          if (previewNotes.length === 0) {
            setAudioFeedback(
              'Audio unavailable',
              'No preview notes could be resolved for this role.'
            );
            return;
          }
          stopPreview();
          for (const previewNote of previewNotes) {
            player.play(previewNote);
          }
          setAudioFeedback(
            referencePatchRole
              ? `Previewing reference ${referencePatchRole} phrase (${previewMode})`
              : `Previewing ${previewTarget.replace('percussion:', 'percussion / ')}${
                  previewNotes.length > 1 ? ' phrase' : ''
                } (${previewMode})`,
            null
          );
        },
        pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
      );
    });

  document
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-percussion-range-audition'
    )
    ?.addEventListener(
      'click',
      async () => {
        const player = await ensureInstrumentPreviewPlayer();
        if (player.getAudioState() === 'unavailable') {
          setAudioFeedback(
            'Audio unavailable',
            'This browser does not expose the Web Audio API for previews.'
          );
          return;
        }
        const notes = createSoundBankDebugPercussionRangeAuditionNotes(
          snapshot,
          readPercussionBrowserState(),
          performance.now(),
          {
            dry: previewMode === 'dry',
            envelope: readPreviewEnvelopeState(),
            oscillators: readPreviewOscillatorState(),
            timbre: readPreviewTimbreState(),
          }
        );
        if (notes.length === 0) {
          setAudioFeedback(
            'Audio unavailable',
            'No percussion preview notes could be resolved for the current filter.'
          );
          return;
        }
        stopPreview();
        for (const note of notes) {
          player.play(note);
        }
        setAudioFeedback(
          `Previewing percussion range (${previewMode}, ${notes.length} hits)`,
          null
        );
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-percussion-standard-pattern'
    )
    ?.addEventListener(
      'click',
      async () => {
        const player = await ensureInstrumentPreviewPlayer();
        if (player.getAudioState() === 'unavailable') {
          setAudioFeedback(
            'Audio unavailable',
            'This browser does not expose the Web Audio API for previews.'
          );
          return;
        }
        const notes = createSoundBankDebugStandardPercussionPatternNotes(
          snapshot,
          readPercussionBrowserState(),
          performance.now(),
          {
            dry: previewMode === 'dry',
            envelope: readPreviewEnvelopeState(),
            oscillators: readPreviewOscillatorState(),
            timbre: readPreviewTimbreState(),
          }
        );
        if (notes.length === 0) {
          setAudioFeedback(
            'Audio unavailable',
            'No percussion preview notes could be resolved for the current filter.'
          );
          return;
        }
        stopPreview();
        for (const note of notes) {
          player.play(note);
        }
        setAudioFeedback(
          `Previewing standard percussion pattern (${previewMode}, ${notes.length} hits)`,
          null
        );
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-percussion-quiet-pattern'
    )
    ?.addEventListener(
      'click',
      async () => {
        const player = await ensureInstrumentPreviewPlayer();
        if (player.getAudioState() === 'unavailable') {
          setAudioFeedback(
            'Audio unavailable',
            'This browser does not expose the Web Audio API for previews.'
          );
          return;
        }
        const notes = createSoundBankDebugQuietPercussionPatternNotes(
          snapshot,
          readPercussionBrowserState(),
          performance.now(),
          {
            dry: previewMode === 'dry',
            envelope: readPreviewEnvelopeState(),
            oscillators: readPreviewOscillatorState(),
            timbre: readPreviewTimbreState(),
          }
        );
        if (notes.length === 0) {
          setAudioFeedback(
            'Audio unavailable',
            'No percussion preview notes could be resolved for the current filter.'
          );
          return;
        }
        stopPreview();
        for (const note of notes) {
          player.play(note);
        }
        setAudioFeedback(
          `Previewing quiet percussion pattern (${previewMode}, ${notes.length} hits)`,
          null
        );
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isEditableEventTarget(event.target)
      ) {
        return;
      }
      const shortcutKey = event.key.toLowerCase();
      const shortcutButton = document.querySelector<HTMLButtonElement>(
        `.sound-bank-debug-percussion-pad[data-percussion-key="${shortcutKey}"]`
      );
      if (!shortcutButton) {
        return;
      }
      event.preventDefault();
      shortcutButton.click();
    },
    pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
  );

  document
    .querySelector<HTMLSelectElement>(
      '#sound-bank-debug-percussion-family-filter'
    )
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

  document
    .querySelectorAll<HTMLInputElement>(
      '#sound-bank-debug-envelope-attack, #sound-bank-debug-envelope-decay, #sound-bank-debug-envelope-sustain, #sound-bank-debug-envelope-release'
    )
    .forEach((input) => {
      input.addEventListener(
        'input',
        () => {
          previewEnvelopeState = readPreviewEnvelopeState();
          syncPreviewEnvelopeUi();
        },
        pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
      );
    });

  syncPreviewEnvelopeUi();

  document
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-oscillator-carrier-toggle'
    )
    ?.addEventListener(
      'click',
      () => {
        togglePreviewOscillatorCarrier(snapshot);
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-oscillator-harmonic-toggle'
    )
    ?.addEventListener(
      'click',
      () => {
        togglePreviewOscillatorHarmonic(snapshot);
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-oscillator-carrier-solo'
    )
    ?.addEventListener(
      'click',
      () => {
        togglePreviewOscillatorSolo(snapshot, 'carrier');
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelector<HTMLButtonElement>(
      '#sound-bank-debug-oscillator-harmonic-solo'
    )
    ?.addEventListener(
      'click',
      () => {
        togglePreviewOscillatorSolo(snapshot, 'harmonic');
      },
      pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
    );

  document
    .querySelectorAll<HTMLInputElement>(
      '#sound-bank-debug-timbre-detune, #sound-bank-debug-timbre-filter-cutoff, #sound-bank-debug-timbre-filter-q, #sound-bank-debug-timbre-noise-mix'
    )
    .forEach((input) => {
      input.addEventListener(
        'input',
        () => {
          previewTimbreState = readPreviewTimbreState();
          syncPreviewTimbreUi();
        },
        pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
      );
    });

  syncPreviewTimbreUi();
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
