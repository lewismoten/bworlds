import { randomizeDebugCoordinatePair } from './debug-seed.ts';
import {
  resolveVelocityShapedInstrumentTimbre,
  type MusicWaveform,
} from './music-instrument-timbres.ts';
import {
  buildMusicDebugInstrumentWaveformMarkup,
  buildMusicDebugInstrumentPanelMarkup,
  resolveMusicDebugInstrumentPreviewPhraseNotes,
  resolveMusicDebugInstrumentPreviewNote,
  type MusicDebugInstrumentPreviewTarget,
} from './music-debug-instrument-panel.ts';
import {
  createMusicDebugSnapshot,
  DEFAULT_MUSIC_DEBUG_OPTIONS,
  normalizeMusicDebugOptions,
  type MusicDebugContextType,
  type MusicDebugSnapshot,
  type MusicDebugTileKind,
} from './music-debug.ts';
import {
  listGeneralMidiPercussionNotesForFamily,
  type GeneralMidiPercussionNote,
} from './general-midi-percussion.ts';
import {
  listGeneralMidiFamilyNames,
  listGeneralMidiPrograms,
  type GeneralMidiProgram,
} from './general-midi.ts';
import {
  applyPercussionVoiceToTimbre,
  listPercussionVoicesForFamily,
  resolvePercussionVoiceById,
  type PercussionFamily,
  type PercussionVoiceId,
} from './procedural-music-percussion-voices.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralInstrument } from './procedural-music-sound-bank.ts';
import { MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS } from './audio-budget.ts';
import {
  applySoundBankDebugPreviewEnvelopeToInstrument,
  applySoundBankDebugPreviewEnvelopeToNote,
  normalizeSoundBankDebugPreviewEnvelopeState,
  resolveSoundBankDebugPreviewEnvelopeDefaults,
  type SoundBankDebugPreviewEnvelope,
  type SoundBankDebugPreviewEnvelopeState,
} from './sound-bank-debug-preview-envelope.ts';
import {
  createSoundBankInstrumentRegistry,
  type SoundBankInstrumentRegistryEntry,
  type SoundBankInstrumentRegistration,
} from './sound-bank-registry.ts';

export type SoundBankDebugOptions = {
  tileKind: MusicDebugTileKind;
  contextType: MusicDebugContextType;
  dayProgress: number;
  yearProgress: number;
  clusterX: number;
  clusterY: number;
};

export type SoundBankDebugSnapshot = {
  options: SoundBankDebugOptions;
  musicSnapshot: MusicDebugSnapshot;
  instrumentRegistry: ReturnType<typeof createSoundBankInstrumentRegistry>;
};

export type SoundBankDebugLayoutMode = 'compact' | 'expanded';
export type SoundBankDebugPreviewMode = 'processed' | 'dry';
export type SoundBankDebugGeneralMidiSortMode = 'program' | 'name' | 'family';
export type SoundBankDebugPercussionFamilyFilter = 'all' | PercussionFamily;

export type SoundBankDebugGeneralMidiBrowserState = {
  searchQuery: string;
  familyFilter: string;
  roleFilter: 'all' | 'lead' | 'harmony' | 'bass';
  playableMidiNote: string;
  selectedProgramNumber: string;
  sortMode: SoundBankDebugGeneralMidiSortMode;
};

export type SoundBankDebugPercussionBrowserState = {
  familyFilter: SoundBankDebugPercussionFamilyFilter;
};

export type { SoundBankDebugPreviewEnvelopeState };

export type SoundBankDebugGeneralMidiBrowserSection = Readonly<{
  heading: string;
  programs: readonly SoundBankDebugGeneralMidiProgramView[];
}>;

export type SoundBankDebugGeneralMidiProgramView = Readonly<
  GeneralMidiProgram & {
    isAvailable: boolean;
    isSelected: boolean;
    supportedRoles: readonly string[];
    recommendedRangeSummary: string | null;
    usesPlaceholderPatch: boolean;
    usesCustomPatch: boolean;
  }
>;

export type SoundBankDebugGeneralMidiBrowserModel = Readonly<{
  sections: readonly SoundBankDebugGeneralMidiBrowserSection[];
  selectedProgramNumber: number | null;
  previousProgramNumber: number | null;
  nextProgramNumber: number | null;
}>;

export type SoundBankDebugPercussionBrowserSection = Readonly<{
  family: PercussionFamily;
  heading: string;
  voices: readonly SoundBankDebugPercussionVoiceView[];
}>;

export type SoundBankDebugPercussionVoiceView = Readonly<{
  voiceId: PercussionVoiceId | null;
  midiNote: number;
  name: string;
  previewTarget: MusicDebugInstrumentPreviewTarget | null;
  shortcutKey: string | null;
  isAvailable: boolean;
}>;

export const DEFAULT_SOUND_BANK_DEBUG_GENERAL_MIDI_BROWSER_STATE: SoundBankDebugGeneralMidiBrowserState =
  {
    searchQuery: '',
    familyFilter: 'all',
    roleFilter: 'all',
    playableMidiNote: '',
    selectedProgramNumber: '',
    sortMode: 'program',
  };

export const DEFAULT_SOUND_BANK_DEBUG_PERCUSSION_BROWSER_STATE: SoundBankDebugPercussionBrowserState =
  {
    familyFilter: 'all',
  };

export const DEFAULT_SOUND_BANK_DEBUG_OPTIONS: SoundBankDebugOptions = {
  tileKind: DEFAULT_MUSIC_DEBUG_OPTIONS.tileKind,
  contextType: DEFAULT_MUSIC_DEBUG_OPTIONS.contextType,
  dayProgress: DEFAULT_MUSIC_DEBUG_OPTIONS.dayProgress,
  yearProgress: DEFAULT_MUSIC_DEBUG_OPTIONS.yearProgress,
  clusterX: DEFAULT_MUSIC_DEBUG_OPTIONS.clusterX,
  clusterY: DEFAULT_MUSIC_DEBUG_OPTIONS.clusterY,
};

export function normalizeSoundBankDebugOptions(
  value: Partial<SoundBankDebugOptions> | null | undefined
): SoundBankDebugOptions {
  const normalized = normalizeMusicDebugOptions(value);
  return {
    tileKind: normalized.tileKind,
    contextType: normalized.contextType,
    dayProgress: normalized.dayProgress,
    yearProgress: normalized.yearProgress,
    clusterX: normalized.clusterX,
    clusterY: normalized.clusterY,
  };
}

export function createSoundBankDebugSnapshot(
  value: Partial<SoundBankDebugOptions> | null | undefined = {},
  extras: {
    registeredInstruments?: readonly SoundBankInstrumentRegistration[];
  } = {}
): SoundBankDebugSnapshot {
  const options = normalizeSoundBankDebugOptions(value);
  const musicSnapshot = createMusicDebugSnapshot({
    ...DEFAULT_MUSIC_DEBUG_OPTIONS,
    ...options,
  });
  return {
    options,
    musicSnapshot,
    instrumentRegistry: createSoundBankInstrumentRegistry([
      ...(Object.values(musicSnapshot.instrumentBank.instruments).map(
        (definition) => ({
          definition,
          sourcePlugin: 'core-generated-bank',
        })
      ) satisfies SoundBankInstrumentRegistration[]),
      ...(extras.registeredInstruments ?? []),
    ]),
  };
}

export function randomizeSoundBankDebugSeed(
  options: SoundBankDebugOptions,
  random = Math.random
): SoundBankDebugOptions {
  const randomized = randomizeDebugCoordinatePair(
    {
      x: options.clusterX,
      y: options.clusterY,
    },
    random
  );
  return {
    ...options,
    clusterX: randomized.x,
    clusterY: randomized.y,
  };
}

export function buildSoundBankDebugMarkup(
  snapshot: SoundBankDebugSnapshot,
  viewState: {
    audioStatus: string;
    audioContextState?: AudioContextState | 'idle' | 'unavailable';
    audioSampleRateHz?: number | null;
    outputLatencySeconds?: number | null;
    masterGain?: number;
    muted?: boolean;
    layoutMode?: SoundBankDebugLayoutMode;
    previewMode?: SoundBankDebugPreviewMode;
    errorMessage?: string | null;
    generalMidiBrowserState?: Partial<SoundBankDebugGeneralMidiBrowserState>;
    percussionBrowserState?: Partial<SoundBankDebugPercussionBrowserState>;
    previewEnvelopeState?: SoundBankDebugPreviewEnvelopeState | null;
  } = {
    audioStatus: 'Audio idle',
  }
): string {
  const { musicSnapshot } = snapshot;
  const instrumentCards = buildMusicDebugInstrumentPanelMarkup(musicSnapshot);
  const generalMidiBrowserState =
    normalizeSoundBankDebugGeneralMidiBrowserState(
      viewState.generalMidiBrowserState
    );
  const percussionBrowserState = normalizeSoundBankDebugPercussionBrowserState(
    viewState.percussionBrowserState
  );
  const generalMidiBrowserModel = resolveSoundBankDebugGeneralMidiBrowserModel(
    snapshot.instrumentRegistry.entries,
    generalMidiBrowserState
  );
  const summaryCards = (
    Object.entries(musicSnapshot.instrumentBank.instruments) as Array<
      [
        keyof MusicDebugSnapshot['instrumentBank']['instruments'],
        MusicDebugSnapshot['instrumentBank']['instruments'][keyof MusicDebugSnapshot['instrumentBank']['instruments']],
      ]
    >
  )
    .map(
      ([role, instrument]) => `
        <article class="sound-bank-debug-role-card">
          <p class="sound-bank-debug-role-label">${role}</p>
          <h3>${formatLabel(instrument.family)}</h3>
          <p>${instrument.id}</p>
          <p>GM family: ${instrument.generalMidiFamilyName}</p>
          <p>GM name: ${instrument.generalMidiInstrumentName}</p>
          <p>
            GM program:
            ${
              instrument.generalMidiProgramNumber === null
                ? 'Percussion kit'
                : instrument.generalMidiProgramNumber
            }
          </p>
        </article>
      `
    )
    .join('');
  const percussionBrowserSections =
    createSoundBankDebugPercussionBrowserSections(percussionBrowserState);
  const selectedInstrumentDetailsMarkup = buildSelectedInstrumentDetailsMarkup(
    snapshot,
    snapshot.instrumentRegistry.entries,
    generalMidiBrowserModel.selectedProgramNumber,
    viewState.previewEnvelopeState ?? null
  );
  const generalMidiBrowserMarkup = generalMidiBrowserModel.sections
    .map(
      (section) => `
        <section class="sound-bank-debug-midi-family" aria-label="${section.heading}">
          <h3>${section.heading}</h3>
          <ol start="${section.programs[0]?.programNumber ?? 0}">
            ${section.programs
              .map(
                (program) => `
                  <li
                    value="${program.programNumber}"
                    class="${
                      program.isSelected
                        ? 'sound-bank-debug-midi-program-selected'
                        : ''
                    }"
                  >
                    <span
                      class="sound-bank-debug-midi-program-number${
                        program.isAvailable
                          ? ''
                          : ' sound-bank-debug-midi-program-unavailable'
                      }"
                    >${program.programNumber}</span>
                    <span
                      class="sound-bank-debug-midi-program-name${
                        program.isAvailable
                          ? ''
                          : ' sound-bank-debug-midi-program-unavailable'
                      }"
                      aria-current="${program.isSelected ? 'true' : 'false'}"
                      aria-disabled="${program.isAvailable ? 'false' : 'true'}"
                    >${program.instrumentName}</span>
                    ${
                      program.supportedRoles.length > 0
                        ? `<span class="sound-bank-debug-midi-program-roles">${program.supportedRoles.join(', ')}</span>`
                        : '<span class="sound-bank-debug-midi-program-roles sound-bank-debug-midi-program-unavailable">Unavailable</span>'
                    }
                    ${
                      program.recommendedRangeSummary
                        ? `<span class="sound-bank-debug-midi-program-range">${program.recommendedRangeSummary}</span>`
                        : ''
                    }
                    ${
                      program.usesPlaceholderPatch
                        ? '<span class="sound-bank-debug-midi-program-badge sound-bank-debug-midi-program-badge-placeholder">Placeholder patch</span>'
                        : ''
                    }
                    ${
                      program.usesCustomPatch
                        ? '<span class="sound-bank-debug-midi-program-badge sound-bank-debug-midi-program-badge-custom">Custom patch</span>'
                        : ''
                    }
                  </li>
                `
              )
              .join('')}
          </ol>
        </section>
      `
    )
    .join('');
  const errorPanel = viewState.errorMessage
    ? `
      <p class="sound-bank-debug-error" role="alert">
        ${viewState.errorMessage}
      </p>
    `
    : '';
  const registryWarningPanel =
    snapshot.instrumentRegistry.warnings.length === 0
      ? ''
      : `
      <section class="sound-bank-debug-panel" aria-label="Instrument warnings">
        <div class="sound-bank-debug-panel-head">
          <div>
            <p class="sound-bank-debug-panel-kicker">Registry Warnings</p>
            <h2>Instrument Validation</h2>
          </div>
        </div>
        <ul class="sound-bank-debug-warning-list">
          ${snapshot.instrumentRegistry.warnings
            .map(
              (warning) => `
                <li>
                  <strong>${warning.instrumentId}</strong>
                  from ${warning.sourcePlugin}: ${warning.message}
                </li>
              `
            )
            .join('')}
        </ul>
      </section>
    `;
  const layoutMode = viewState.layoutMode ?? 'expanded';
  const previewMode = viewState.previewMode ?? 'processed';
  const audioContextState = viewState.audioContextState ?? 'idle';
  const canStartAudio = audioContextState === 'idle';
  const canResumeAudio = audioContextState === 'suspended';
  const masterGain = Math.max(0, Math.min(1, viewState.masterGain ?? 1));
  const muted = viewState.muted ?? false;
  const audioUnavailableWarning =
    audioContextState === 'unavailable'
      ? 'Browser audio is unavailable. Web Audio previews cannot start here.'
      : null;
  const audioMutedWarning =
    muted || masterGain <= 0
      ? 'Audio output is muted. Unmute or raise master gain to hear previews.'
      : null;
  const audioSampleRateLabel =
    typeof viewState.audioSampleRateHz === 'number'
      ? `${Math.round(viewState.audioSampleRateHz).toLocaleString()} Hz`
      : 'Unavailable until audio starts';
  const outputLatencyLabel =
    typeof viewState.outputLatencySeconds === 'number'
      ? `${(viewState.outputLatencySeconds * 1000).toFixed(1)} ms`
      : 'Unavailable until audio starts';

  return `
    <main class="sound-bank-debug-shell sound-bank-debug-shell-${layoutMode}">
      <section class="sound-bank-debug-hero">
        <p class="sound-bank-debug-kicker">bworlds</p>
        <h1>Sound Bank Debug</h1>
        <p class="sound-bank-debug-lede">
          Inspect the currently generated instrument bank, audition each role,
          and verify how terrain, context, and seasonal inputs reshape the
          procedural patch set.
        </p>
        <p class="sound-bank-debug-breadcrumb"><a href="/debug/">/debug/</a></p>
      </section>
      <section class="sound-bank-debug-layout">
        <form id="sound-bank-debug-form" class="sound-bank-debug-panel">
          <div class="sound-bank-debug-panel-head">
            <div>
              <p class="sound-bank-debug-panel-kicker">Generator Controls</p>
              <h2>Instrument Source</h2>
            </div>
            <div class="sound-bank-debug-actions">
              <div
                class="sound-bank-debug-layout-toggle"
                role="group"
                aria-label="Layout mode"
              >
                <button
                  id="sound-bank-debug-layout-compact"
                  type="button"
                  aria-pressed="${layoutMode === 'compact'}"
                >
                  Compact
                </button>
                <button
                  id="sound-bank-debug-layout-expanded"
                  type="button"
                  aria-pressed="${layoutMode === 'expanded'}"
                >
                  Expanded
                </button>
              </div>
              <button id="sound-bank-debug-generate" type="submit">Generate</button>
              <button id="sound-bank-debug-randomize" type="button">🎲 Generate</button>
              <button id="sound-bank-debug-reset" type="button">Reset</button>
            </div>
          </div>
          <div class="sound-bank-debug-grid">
            <label>
              <span>Tile</span>
              <select name="tileKind">
                ${renderOptionList(
                  [
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
                  ],
                  snapshot.options.tileKind
                )}
              </select>
            </label>
            <label>
              <span>Context</span>
              <select name="contextType">
                ${renderOptionList(
                  ['overworld', 'town', 'building', 'cave', 'dungeon'],
                  snapshot.options.contextType
                )}
              </select>
            </label>
            <label>
              <span>Cluster X</span>
              <input name="clusterX" type="number" value="${snapshot.options.clusterX}" />
            </label>
            <label>
              <span>Cluster Y</span>
              <input name="clusterY" type="number" value="${snapshot.options.clusterY}" />
            </label>
            <label>
              <span>Day</span>
              <input name="dayProgress" type="number" min="0" max="1" step="0.01" value="${snapshot.options.dayProgress}" />
            </label>
            <label>
              <span>Season</span>
              <input name="yearProgress" type="number" min="0" max="1" step="0.01" value="${snapshot.options.yearProgress}" />
            </label>
          </div>
          <section class="sound-bank-debug-status-panel" aria-label="Audio status">
            <div>
              <p class="sound-bank-debug-panel-kicker">Audio</p>
              <strong id="sound-bank-debug-audio-status">${viewState.audioStatus}</strong>
              <p class="sound-bank-debug-context-state">
                Context state:
                <span id="sound-bank-debug-context-state">${audioContextState}</span>
              </p>
              <dl class="sound-bank-debug-audio-stats">
                <div>
                  <dt>Sample rate</dt>
                  <dd id="sound-bank-debug-sample-rate">${audioSampleRateLabel}</dd>
                </div>
                <div>
                  <dt>Output latency</dt>
                  <dd id="sound-bank-debug-output-latency">${outputLatencyLabel}</dd>
                </div>
              </dl>
              <label class="sound-bank-debug-master-gain" for="sound-bank-debug-master-gain">
                <span>Master gain</span>
                <div class="sound-bank-debug-master-gain-row">
                  <input
                    id="sound-bank-debug-master-gain"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value="${Math.round(masterGain * 100)}"
                  />
                  <output id="sound-bank-debug-master-gain-value" for="sound-bank-debug-master-gain">
                    ${Math.round(masterGain * 100)}%
                  </output>
                </div>
              </label>
              <div class="sound-bank-debug-preview-mode">
                <span>Preview mode</span>
                <div
                  class="sound-bank-debug-preview-mode-toggle"
                  role="group"
                  aria-label="Preview mode"
                >
                  <button
                    id="sound-bank-debug-preview-mode-processed"
                    type="button"
                    aria-pressed="${previewMode === 'processed'}"
                  >
                    Processed previews
                  </button>
                  <button
                    id="sound-bank-debug-preview-mode-dry"
                    type="button"
                    aria-pressed="${previewMode === 'dry'}"
                  >
                    Dry previews
                  </button>
                </div>
              </div>
            </div>
            <div class="sound-bank-debug-audio-actions">
              <button
                id="sound-bank-debug-toggle-mute"
                type="button"
                aria-pressed="${muted}"
              >
                ${muted ? 'Unmute Audio' : 'Mute Audio'}
              </button>
              <button
                id="sound-bank-debug-start-audio"
                type="button"
                ${canStartAudio ? '' : 'disabled'}
              >
                Start Audio
              </button>
              <button
                id="sound-bank-debug-resume-audio"
                type="button"
                ${canResumeAudio ? '' : 'disabled'}
              >
                Resume Audio
              </button>
            </div>
            ${
              audioUnavailableWarning
                ? `
              <p class="sound-bank-debug-warning" role="status">
                ${audioUnavailableWarning}
              </p>
            `
                : ''
            }
            ${
              audioMutedWarning
                ? `
              <p class="sound-bank-debug-warning" role="status">
                ${audioMutedWarning}
              </p>
            `
                : ''
            }
            ${errorPanel}
          </section>
        </form>
        <section class="sound-bank-debug-panel">
          <div class="sound-bank-debug-panel-head">
            <div>
              <p class="sound-bank-debug-panel-kicker">Resolved Bank</p>
              <h2>${formatLabel(musicSnapshot.theme.id)}</h2>
              <p>
                ${musicSnapshot.theme.vocabulary.modeLabel} at
                ${musicSnapshot.resolvedBpm.toFixed(1)} BPM with
                ${musicSnapshot.notes.length} generated notes.
              </p>
            </div>
          </div>
          <div class="sound-bank-debug-role-grid">
            ${summaryCards}
          </div>
        </section>
        ${registryWarningPanel}
        <section class="sound-bank-debug-panel">
          <div class="sound-bank-debug-panel-head">
            <div>
              <p class="sound-bank-debug-panel-kicker">Percussion</p>
              <h2>Percussion Browser</h2>
              <p>
                General MIDI drum mappings grouped by family, with a direct
                preview for each available percussion voice.
              </p>
            </div>
            <div class="sound-bank-debug-actions">
              <button
                id="sound-bank-debug-percussion-range-audition"
                type="button"
              >
                Range Audition
              </button>
              <button
                id="sound-bank-debug-percussion-standard-pattern"
                type="button"
              >
                Standard Pattern
              </button>
              <button
                id="sound-bank-debug-percussion-quiet-pattern"
                type="button"
              >
                Quiet Pattern
              </button>
            </div>
          </div>
          <div class="sound-bank-debug-midi-controls">
            <label>
              <span>Drum family</span>
              <select
                id="sound-bank-debug-percussion-family-filter"
                name="percussionFamilyFilter"
              >
                ${renderOptionList(
                  ['all', ...PERCUSSION_FAMILY_ORDER],
                  percussionBrowserState.familyFilter
                )}
              </select>
            </label>
          </div>
          <div class="sound-bank-debug-percussion-pad-grid" role="group" aria-label="Percussion pad grid">
            ${percussionBrowserSections
              .flatMap((section) => section.voices)
              .map(
                (voice) => `
                  <button
                    type="button"
                    class="music-debug-instrument-play sound-bank-debug-percussion-pad"
                    data-preview-id="${voice.previewTarget}"
                    data-percussion-key="${voice.shortcutKey}"
                  >
                    <span class="sound-bank-debug-percussion-pad-key">${voice.shortcutKey}</span>
                    <span class="sound-bank-debug-percussion-pad-note">${voice.midiNote}</span>
                    <span class="sound-bank-debug-percussion-pad-name">${formatLabel(
                      voice.name
                    )}</span>
                  </button>
                `
              )
              .join('')}
          </div>
          <div class="sound-bank-debug-percussion-browser">
            ${createSoundBankDebugPercussionBrowserDisplaySections(
              percussionBrowserState
            )
              .map(
                (section) => `
                  <section
                    class="sound-bank-debug-percussion-family"
                    aria-label="${section.heading}"
                  >
                    <h3>${section.heading}</h3>
                    <ul class="sound-bank-debug-percussion-voice-list">
                      ${section.voices
                        .map(
                          (voice) => `
                            <li class="sound-bank-debug-percussion-voice">
                              <span class="sound-bank-debug-percussion-note">${voice.midiNote}</span>
                              <span class="sound-bank-debug-percussion-name">${formatLabel(
                                voice.name
                              )}</span>
                              ${
                                voice.isAvailable
                                  ? ''
                                  : '<span class="sound-bank-debug-midi-program-badge sound-bank-debug-midi-program-badge-placeholder">Missing patch</span>'
                              }
                              <button
                                type="button"
                                class="sound-bank-debug-percussion-play${
                                  voice.isAvailable
                                    ? ' music-debug-instrument-play'
                                    : ''
                                }"
                                ${
                                  voice.previewTarget
                                    ? `data-preview-id="${voice.previewTarget}"`
                                    : 'disabled'
                                }
                              >
                                ${voice.isAvailable ? 'Play' : 'Unavailable'}
                              </button>
                            </li>
                          `
                        )
                        .join('')}
                    </ul>
                  </section>
                `
              )
              .join('')}
          </div>
        </section>
        <section class="sound-bank-debug-panel">
          <div class="sound-bank-debug-panel-head">
            <div>
              <p class="sound-bank-debug-panel-kicker">General MIDI</p>
              <h2>Program Browser</h2>
              <p>
                Standard programs 0 through 127 grouped by family and sorted by
                program number.
              </p>
            </div>
            <div class="sound-bank-debug-actions">
              <button
                id="sound-bank-debug-midi-previous"
                type="button"
                ${
                  generalMidiBrowserModel.previousProgramNumber === null
                    ? 'disabled'
                    : `data-program-number="${generalMidiBrowserModel.previousProgramNumber}"`
                }
              >
                Previous
              </button>
              <button
                id="sound-bank-debug-midi-next"
                type="button"
                ${
                  generalMidiBrowserModel.nextProgramNumber === null
                    ? 'disabled'
                    : `data-program-number="${generalMidiBrowserModel.nextProgramNumber}"`
                }
              >
                Next
              </button>
            </div>
          </div>
          <div class="sound-bank-debug-midi-controls">
            <label>
              <span>Search</span>
              <input
                id="sound-bank-debug-midi-search"
                name="generalMidiSearchQuery"
                type="search"
                value="${escapeAttribute(generalMidiBrowserState.searchQuery)}"
                placeholder="Search instrument names"
              />
            </label>
            <label>
              <span>Family</span>
              <select
                id="sound-bank-debug-midi-family-filter"
                name="generalMidiFamilyFilter"
              >
                ${renderOptionList(
                  ['all', ...listGeneralMidiFamilyNames()],
                  generalMidiBrowserState.familyFilter
                )}
              </select>
            </label>
            <label>
              <span>Role</span>
              <select
                id="sound-bank-debug-midi-role-filter"
                name="generalMidiRoleFilter"
              >
                ${renderOptionList(
                  ['all', 'lead', 'harmony', 'bass'],
                  generalMidiBrowserState.roleFilter
                )}
              </select>
            </label>
            <label>
              <span>Playable MIDI Note</span>
              <input
                id="sound-bank-debug-midi-range-filter"
                name="generalMidiPlayableMidiNote"
                type="number"
                min="0"
                max="127"
                value="${escapeAttribute(generalMidiBrowserState.playableMidiNote)}"
                placeholder="Any"
              />
            </label>
            <label>
              <span>Selected Program</span>
              <input
                id="sound-bank-debug-midi-selected-program"
                name="generalMidiSelectedProgramNumber"
                type="number"
                min="0"
                max="127"
                value="${
                  generalMidiBrowserModel.selectedProgramNumber === null
                    ? ''
                    : generalMidiBrowserModel.selectedProgramNumber
                }"
                placeholder="Visible default"
              />
            </label>
            <label>
              <span>Sort</span>
              <select
                id="sound-bank-debug-midi-sort"
                name="generalMidiSortMode"
              >
                ${renderOptionList(
                  ['program', 'name', 'family'],
                  generalMidiBrowserState.sortMode
                )}
              </select>
            </label>
          </div>
          <div class="sound-bank-debug-midi-browser">
            ${generalMidiBrowserMarkup}
          </div>
        </section>
        <section class="sound-bank-debug-panel">
          <div class="sound-bank-debug-panel-head">
            <div>
              <p class="sound-bank-debug-panel-kicker">Instrument Details</p>
              <h2>Selected Program</h2>
              <p>
                Details for the currently selected General MIDI program and the
                resolved patch registration behind it.
              </p>
            </div>
          </div>
          ${selectedInstrumentDetailsMarkup}
        </section>
        <section class="sound-bank-debug-panel">
          <div class="sound-bank-debug-panel-head">
            <div>
              <p class="sound-bank-debug-panel-kicker">Instrument Browser</p>
              <h2>Role Patches</h2>
              <p>
                Each card previews the generated waveform mix and can audition a
                representative note from the current song seed.
              </p>
            </div>
          </div>
          ${instrumentCards}
        </section>
      </section>
    </main>
  `;
}

export function resolveSoundBankDebugPreviewNoteRole(
  snapshot: SoundBankDebugSnapshot,
  role: MusicDebugInstrumentPreviewTarget,
  nowMs: number,
  options: {
    dry?: boolean;
    envelope?: SoundBankDebugPreviewEnvelope | null;
  } = {}
) {
  const existingPreview = resolveMusicDebugInstrumentPreviewNote(
    snapshot.musicSnapshot,
    role,
    nowMs
  );
  if (existingPreview) {
    return applySoundBankDebugPreviewOptions(existingPreview, options);
  }
  if (!role.startsWith('percussion:')) {
    return null;
  }

  return applySoundBankDebugPreviewOptions(
    createFallbackPercussionPreviewNote(
      snapshot.musicSnapshot,
      role.slice('percussion:'.length) as PercussionVoiceId,
      nowMs
    ),
    options
  );
}

export function resolveSoundBankDebugPreviewPhraseRole(
  snapshot: SoundBankDebugSnapshot,
  role: MusicDebugInstrumentPreviewTarget,
  nowMs: number,
  options: {
    dry?: boolean;
    envelope?: SoundBankDebugPreviewEnvelope | null;
  } = {}
): readonly ProceduralMusicNote[] {
  return resolveMusicDebugInstrumentPreviewPhraseNotes(
    snapshot.musicSnapshot,
    role,
    nowMs
  ).map((note) => applySoundBankDebugPreviewOptions(note, options));
}

export function createSoundBankDebugPercussionRangeAuditionNotes(
  snapshot: SoundBankDebugSnapshot,
  state: Partial<SoundBankDebugPercussionBrowserState>,
  nowMs: number,
  options: {
    dry?: boolean;
    envelope?: SoundBankDebugPreviewEnvelope | null;
  } = {}
): readonly ProceduralMusicNote[] {
  const percussionBrowserState =
    normalizeSoundBankDebugPercussionBrowserState(state);
  const voices = createSoundBankDebugPercussionBrowserSections(
    percussionBrowserState
  ).flatMap((section) => section.voices);

  return voices.flatMap((voice, index) => {
    const note = resolveSoundBankDebugPreviewNoteRole(
      snapshot,
      voice.previewTarget,
      nowMs + index * 180,
      options
    );
    return note ? [note] : [];
  });
}

export function createSoundBankDebugStandardPercussionPatternNotes(
  snapshot: SoundBankDebugSnapshot,
  state: Partial<SoundBankDebugPercussionBrowserState>,
  nowMs: number,
  options: {
    dry?: boolean;
    envelope?: SoundBankDebugPreviewEnvelope | null;
  } = {}
): readonly ProceduralMusicNote[] {
  const percussionBrowserState =
    normalizeSoundBankDebugPercussionBrowserState(state);
  const visibleVoiceIds = new Set(
    createSoundBankDebugPercussionBrowserSections(percussionBrowserState)
      .flatMap((section) => section.voices)
      .map((voice) => voice.voiceId)
  );

  return STANDARD_PERCUSSION_PATTERN_VOICE_IDS.flatMap((voiceId, index) => {
    if (!visibleVoiceIds.has(voiceId)) {
      return [];
    }
    const note = resolveSoundBankDebugPreviewNoteRole(
      snapshot,
      `percussion:${voiceId}`,
      nowMs + index * 170,
      options
    );
    return note ? [note] : [];
  });
}

export function createSoundBankDebugQuietPercussionPatternNotes(
  snapshot: SoundBankDebugSnapshot,
  state: Partial<SoundBankDebugPercussionBrowserState>,
  nowMs: number,
  options: {
    dry?: boolean;
    envelope?: SoundBankDebugPreviewEnvelope | null;
  } = {}
): readonly ProceduralMusicNote[] {
  return createSoundBankDebugStandardPercussionPatternNotes(
    snapshot,
    state,
    nowMs,
    options
  ).map((note) => ({
    ...note,
    volume: Number(
      Math.max(
        0.01,
        Math.min(1, note.volume * QUIET_PERCUSSION_PATTERN_VOLUME_MULTIPLIER)
      ).toFixed(4)
    ),
    velocity:
      note.velocity === undefined
        ? note.velocity
        : Math.max(
            1,
            Math.round(
              note.velocity * QUIET_PERCUSSION_PATTERN_VELOCITY_MULTIPLIER
            )
          ),
  }));
}

export function normalizeSoundBankDebugGeneralMidiBrowserState(
  value: Partial<SoundBankDebugGeneralMidiBrowserState> | null | undefined
): SoundBankDebugGeneralMidiBrowserState {
  const searchQuery = value?.searchQuery?.trim() ?? '';
  const familyFilter =
    value?.familyFilter &&
    listGeneralMidiFamilyNames().includes(value.familyFilter)
      ? value.familyFilter
      : 'all';
  const sortMode =
    value?.sortMode === 'name' || value?.sortMode === 'family'
      ? value.sortMode
      : 'program';
  const roleFilter =
    value?.roleFilter === 'lead' ||
    value?.roleFilter === 'harmony' ||
    value?.roleFilter === 'bass'
      ? value.roleFilter
      : 'all';
  const playableMidiNoteValue = value?.playableMidiNote?.trim() ?? '';
  const playableMidiNote = /^\d{1,3}$/.test(playableMidiNoteValue)
    ? String(
        Math.max(0, Math.min(127, Number.parseInt(playableMidiNoteValue, 10)))
      )
    : '';
  const selectedProgramNumberValue = value?.selectedProgramNumber?.trim() ?? '';
  const selectedProgramNumber = /^\d{1,3}$/.test(selectedProgramNumberValue)
    ? String(
        Math.max(
          0,
          Math.min(127, Number.parseInt(selectedProgramNumberValue, 10))
        )
      )
    : '';

  return {
    searchQuery,
    familyFilter,
    roleFilter,
    playableMidiNote,
    selectedProgramNumber,
    sortMode,
  };
}

export function normalizeSoundBankDebugPercussionBrowserState(
  value: Partial<SoundBankDebugPercussionBrowserState> | null | undefined
): SoundBankDebugPercussionBrowserState {
  const familyFilter =
    value?.familyFilter === 'kick' ||
    value?.familyFilter === 'snare' ||
    value?.familyFilter === 'cymbals' ||
    value?.familyFilter === 'shaker' ||
    value?.familyFilter === 'hand-percussion'
      ? value.familyFilter
      : 'all';

  return {
    familyFilter,
  };
}

export function resolveSoundBankDebugGeneralMidiBrowserModel(
  registryEntries: readonly SoundBankInstrumentRegistryEntry[],
  browserState: Partial<SoundBankDebugGeneralMidiBrowserState>
): SoundBankDebugGeneralMidiBrowserModel {
  const normalizedState =
    normalizeSoundBankDebugGeneralMidiBrowserState(browserState);
  const searchQuery = normalizedState.searchQuery.toLowerCase();
  const playableMidiNote =
    normalizedState.playableMidiNote.length > 0
      ? Number.parseInt(normalizedState.playableMidiNote, 10)
      : null;
  const programViews = listGeneralMidiPrograms().map((program) =>
    createGeneralMidiProgramView(program, registryEntries)
  );
  const visiblePrograms = programViews.filter((program) => {
    if (
      normalizedState.familyFilter !== 'all' &&
      program.familyName !== normalizedState.familyFilter
    ) {
      return false;
    }
    if (
      normalizedState.roleFilter !== 'all' &&
      !program.supportedRoles.includes(normalizedState.roleFilter)
    ) {
      return false;
    }
    if (
      playableMidiNote !== null &&
      !programHasPlayableMidiNote(
        program.programNumber,
        registryEntries,
        playableMidiNote
      )
    ) {
      return false;
    }

    return (
      searchQuery.length === 0 ||
      program.instrumentName.toLowerCase().includes(searchQuery)
    );
  });

  const sortedSections = resolveSortedGeneralMidiSections(
    visiblePrograms,
    normalizedState.sortMode
  );
  const flatPrograms = sortedSections.flatMap((section) => section.programs);
  const selectedProgramNumber = resolveSelectedProgramNumber(
    flatPrograms,
    normalizedState.selectedProgramNumber
  );
  const selectedIndex = flatPrograms.findIndex(
    (program) => program.programNumber === selectedProgramNumber
  );
  const sections = sortedSections.map((section) => ({
    heading: section.heading,
    programs: section.programs.map((program) => ({
      ...program,
      isSelected: program.programNumber === selectedProgramNumber,
    })),
  }));

  return {
    sections,
    selectedProgramNumber,
    previousProgramNumber:
      selectedIndex > 0 ? flatPrograms[selectedIndex - 1]!.programNumber : null,
    nextProgramNumber:
      selectedIndex >= 0 && selectedIndex < flatPrograms.length - 1
        ? flatPrograms[selectedIndex + 1]!.programNumber
        : null,
  };
}

function renderOptionList(
  values: readonly string[],
  selectedValue: string
): string {
  return values
    .map(
      (value) => `
        <option value="${value}"${
          value === selectedValue ? ' selected' : ''
        }>${formatLabel(value)}</option>
      `
    )
    .join('');
}

function buildSelectedInstrumentDetailsMarkup(
  snapshot: SoundBankDebugSnapshot,
  registryEntries: readonly SoundBankInstrumentRegistryEntry[],
  selectedProgramNumber: number | null,
  previewEnvelopeState: SoundBankDebugPreviewEnvelopeState | null
): string {
  const selectedEntry =
    selectedProgramNumber === null
      ? null
      : (registryEntries.find(
          (entry) =>
            entry.isValid &&
            entry.generalMidiProgramNumber === selectedProgramNumber
        ) ?? null);

  if (!selectedEntry) {
    return `
      <p class="sound-bank-debug-warning" role="status">
        No registered patch is available for the selected General MIDI program.
      </p>
    `;
  }

  const runtimeInstrument = resolveSelectedRuntimeInstrument(
    snapshot,
    selectedEntry.id
  );
  const effectiveInstrument =
    runtimeInstrument === null
      ? null
      : applySoundBankDebugPreviewEnvelopeToInstrument(
          runtimeInstrument,
          previewEnvelopeState
        );
  const usesSamples = runtimeInstrument ? 'No' : 'Unknown';
  const usesSynthesis = runtimeInstrument ? 'Yes' : 'Unknown';
  const patchVariant = runtimeInstrument
    ? formatLabel(snapshot.musicSnapshot.songDna.variantLabel)
    : 'Unknown';
  const polyphonyLimit = runtimeInstrument
    ? `${resolvePreviewPolyphonyLimit()} voices`
    : 'Unknown';
  const estimatedComplexity = runtimeInstrument
    ? resolveEstimatedPatchComplexity(runtimeInstrument)
    : 'Unknown';
  const waveformPreviewMarkup = effectiveInstrument
    ? buildMusicDebugInstrumentWaveformMarkup(effectiveInstrument)
    : '<p class="sound-bank-debug-warning" role="status">Waveform preview unavailable for this patch source.</p>';
  const attackMs = effectiveInstrument
    ? `${Math.round(effectiveInstrument.attackMs)} ms`
    : 'Unknown';
  const releaseMs = effectiveInstrument
    ? `${Math.round(effectiveInstrument.releaseMs)} ms`
    : 'Unknown';
  const sustainLevel = effectiveInstrument
    ? formatNormalizedValue(effectiveInstrument.timbre.bodySustainLevel ?? 0.74)
    : 'Unknown';
  const primaryOscillatorType = effectiveInstrument
    ? effectiveInstrument.waveform
    : 'Unknown';
  const harmonicOscillatorType = effectiveInstrument
    ? effectiveInstrument.timbre.harmonicWaveform
    : 'Unknown';
  const primaryHarmonicContent = effectiveInstrument
    ? describeWaveformHarmonicContent(effectiveInstrument.waveform)
    : 'Unknown';
  const harmonicOscillatorContent = effectiveInstrument
    ? describeWaveformHarmonicContent(
        effectiveInstrument.timbre.harmonicWaveform
      )
    : 'Unknown';
  const activeOscillatorCount = effectiveInstrument
    ? String(resolveActiveOscillatorCount(effectiveInstrument))
    : 'Unknown';
  const filterType = effectiveInstrument
    ? effectiveInstrument.timbre.filterType
    : 'Unknown';
  const filterResponseCurveMarkup = effectiveInstrument
    ? buildSelectedInstrumentFilterResponseCurveMarkup(effectiveInstrument)
    : '<p class="sound-bank-debug-warning" role="status">Filter response preview unavailable for this patch source.</p>';
  const previewEnvelopeControlsMarkup = effectiveInstrument
    ? buildSoundBankDebugPreviewEnvelopeControlsMarkup(
        effectiveInstrument,
        previewEnvelopeState
      )
    : '';

  return `
    <div class="music-debug-instrument-waveform">
      ${waveformPreviewMarkup}
    </div>
    <div class="music-debug-instrument-waveform">
      ${filterResponseCurveMarkup}
    </div>
    ${previewEnvelopeControlsMarkup}
    <dl class="music-debug-instrument-stats">
      <div><dt>Instrument ID</dt><dd>${selectedEntry.id}</dd></div>
      <div><dt>GM Program</dt><dd>${selectedEntry.generalMidiProgramNumber}</dd></div>
      <div><dt>GM Name</dt><dd>${selectedEntry.generalMidiInstrumentName}</dd></div>
      <div><dt>Family</dt><dd>${selectedEntry.generalMidiFamilyName}</dd></div>
      <div><dt>Supported Roles</dt><dd>${selectedEntry.supportedRoles.join(', ')}</dd></div>
      <div><dt>Preferred Range</dt><dd>${formatMidiRange(selectedEntry.preferredMidiRange)}</dd></div>
      <div><dt>Playable Range</dt><dd>${formatMidiRange(selectedEntry.recommendedMidiRange)}</dd></div>
      <div><dt>Patch Variant</dt><dd>${patchVariant}</dd></div>
      <div><dt>Patch Source</dt><dd>${selectedEntry.sourcePlugin}</dd></div>
      <div><dt>Generated</dt><dd>${selectedEntry.sourcePlugin === 'core-generated-bank' ? 'Yes' : 'No'}</dd></div>
      <div><dt>Attack</dt><dd>${attackMs}</dd></div>
      <div><dt>Release</dt><dd>${releaseMs}</dd></div>
      <div><dt>Sustain</dt><dd>${sustainLevel}</dd></div>
      <div><dt>Primary Oscillator</dt><dd>${primaryOscillatorType}</dd></div>
      <div><dt>Primary Harmonics</dt><dd>${primaryHarmonicContent}</dd></div>
      <div><dt>Harmonic Oscillator</dt><dd>${harmonicOscillatorType}</dd></div>
      <div><dt>Harmonic Content</dt><dd>${harmonicOscillatorContent}</dd></div>
      <div><dt>Active Oscillator Count</dt><dd>${activeOscillatorCount}</dd></div>
      <div><dt>Filter Type</dt><dd>${filterType}</dd></div>
      <div><dt>Uses Samples</dt><dd>${usesSamples}</dd></div>
      <div><dt>Uses Synthesis</dt><dd>${usesSynthesis}</dd></div>
      <div><dt>Polyphony Limit</dt><dd>${polyphonyLimit}</dd></div>
      <div><dt>Estimated Complexity</dt><dd>${estimatedComplexity}</dd></div>
      <div><dt>Validation Warnings</dt><dd>${formatValidationWarnings(selectedEntry.validationMessages)}</dd></div>
    </dl>
  `;
}

function resolveSelectedRuntimeInstrument(
  snapshot: SoundBankDebugSnapshot,
  instrumentId: string
) {
  return (
    Object.values(snapshot.musicSnapshot.instrumentBank.instruments).find(
      (instrument) => instrument.id === instrumentId
    ) ?? null
  );
}

function resolvePreviewPolyphonyLimit(): number {
  return Math.max(1, Math.floor(MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS / 2));
}

function resolveActiveOscillatorCount(
  instrument: SoundBankDebugSnapshot['musicSnapshot']['instrumentBank']['instruments'][keyof SoundBankDebugSnapshot['musicSnapshot']['instrumentBank']['instruments']]
): number {
  return instrument.harmonicGain > 0 ? 2 : 1;
}

function buildSelectedInstrumentFilterResponseCurveMarkup(
  instrument: SoundBankDebugSnapshot['musicSnapshot']['instrumentBank']['instruments'][keyof SoundBankDebugSnapshot['musicSnapshot']['instrumentBank']['instruments']]
): string {
  const width = 180;
  const height = 56;
  const baselineY = height - 10;
  const resonance = Math.max(0.1, instrument.timbre.filterQ);
  const cutoffHz = Math.max(40, instrument.timbre.filterCutoffHz);
  const normalizedCutoff = Math.min(
    1,
    Math.max(
      0,
      (Math.log10(cutoffHz) - Math.log10(40)) /
        (Math.log10(12_000) - Math.log10(40))
    )
  );
  const points: string[] = [];

  for (let sampleIndex = 0; sampleIndex < 48; sampleIndex += 1) {
    const ratio = sampleIndex / 47;
    const offset = ratio - normalizedCutoff;
    const magnitude = resolveInstrumentFilterResponseMagnitude({
      filterType: instrument.timbre.filterType,
      offset,
      resonance,
    });

    const x = ratio * width;
    const y = baselineY - Math.min(1, magnitude) * (height * 0.62);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  const cutoffX = (normalizedCutoff * width).toFixed(2);

  return `
    <svg
      class="music-debug-instrument-filter-response"
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Filter response preview for ${instrument.timbre.filterType} at ${Math.round(cutoffHz)} hertz"
    >
      <rect width="${width}" height="${height}" rx="12" ry="12"></rect>
      <path class="music-debug-instrument-waveform-line" d="M0 ${baselineY.toFixed(2)} H${width}"></path>
      <path class="music-debug-instrument-waveform-line" d="M${cutoffX} 6 V${height - 6}"></path>
      <polyline
        class="music-debug-instrument-waveform-shape"
        points="${points.join(' ')}"
      ></polyline>
    </svg>
  `;
}

function resolveInstrumentFilterResponseMagnitude(options: {
  filterType: ProceduralInstrument['timbre']['filterType'];
  offset: number;
  resonance: number;
}): number {
  switch (options.filterType) {
    case 'highpass':
      return (
        1 / (1 + Math.exp(-(options.offset * 14 + options.resonance * 0.15)))
      );
    case 'bandpass': {
      const distance = Math.abs(options.offset);
      const widthScale = 0.1 + 0.3 / Math.min(6, options.resonance + 1);
      const peak = 1 + Math.min(0.45, options.resonance / 10);
      return Math.max(0, peak * (1 - distance / widthScale));
    }
    case 'lowpass':
    default:
      return 1 / (1 + Math.exp(options.offset * 14 - options.resonance * 0.15));
  }
}

function describeWaveformHarmonicContent(waveform: MusicWaveform): string {
  switch (waveform) {
    case 'sine':
      return 'Fundamental only';
    case 'triangle':
      return 'Odd harmonics with gentle rolloff';
    case 'square':
      return 'Odd harmonics with strong presence';
    case 'sawtooth':
      return 'Full harmonic series';
    default:
      return 'Custom harmonic profile';
  }
}

function resolveEstimatedPatchComplexity(
  instrument: SoundBankDebugSnapshot['musicSnapshot']['instrumentBank']['instruments'][keyof SoundBankDebugSnapshot['musicSnapshot']['instrumentBank']['instruments']]
): 'Low' | 'Medium' | 'High' {
  let score = 2;
  if ((instrument.timbre.noiseMix ?? 0) > 0) {
    score += 2;
  }
  if ((instrument.timbre.transientMix ?? 0) > 0) {
    score += 2;
  }
  if ((instrument.timbre.pitchSweepSemitones ?? 0) !== 0) {
    score += 1;
  }
  if (instrument.pulseRate > 1.2) {
    score += 1;
  }
  if (instrument.timbre.filterQ > 1.4) {
    score += 1;
  }
  if (score >= 6) {
    return 'High';
  }
  if (score >= 4) {
    return 'Medium';
  }
  return 'Low';
}

function formatLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMidiRange(range: {
  minMidiNote: number;
  maxMidiNote: number;
}): string {
  return `${range.minMidiNote}-${range.maxMidiNote}`;
}

function formatValidationWarnings(messages: readonly string[]): string {
  return messages.length === 0 ? 'None' : messages.join(' | ');
}

function formatNormalizedValue(value: number): string {
  return value.toFixed(2);
}

function groupProgramsByFamily(
  programs: readonly SoundBankDebugGeneralMidiProgramView[]
): readonly SoundBankDebugGeneralMidiBrowserSection[] {
  return listGeneralMidiFamilyNames()
    .map((familyName) => ({
      heading: familyName,
      programs: programs.filter((program) => program.familyName === familyName),
    }))
    .filter((section) => section.programs.length > 0);
}

function resolveSortedGeneralMidiSections(
  programs: readonly SoundBankDebugGeneralMidiProgramView[],
  sortMode: SoundBankDebugGeneralMidiSortMode
): readonly SoundBankDebugGeneralMidiBrowserSection[] {
  if (sortMode === 'name') {
    return [
      {
        heading: 'All Matching Programs',
        programs: [...programs].sort((left, right) =>
          left.instrumentName.localeCompare(right.instrumentName)
        ),
      },
    ];
  }

  if (sortMode === 'family') {
    return [...groupProgramsByFamily(programs)]
      .sort((left, right) => left.heading.localeCompare(right.heading))
      .map((section) => ({
        heading: section.heading,
        programs: [...section.programs].sort((left, right) =>
          left.instrumentName.localeCompare(right.instrumentName)
        ),
      }));
  }

  return groupProgramsByFamily(programs);
}

function resolveSelectedProgramNumber(
  programs: readonly SoundBankDebugGeneralMidiProgramView[],
  selectedProgramNumber: string
): number | null {
  if (programs.length === 0) {
    return null;
  }

  const selectedProgram =
    selectedProgramNumber.length > 0
      ? Number.parseInt(selectedProgramNumber, 10)
      : Number.NaN;
  if (
    Number.isInteger(selectedProgram) &&
    programs.some((program) => program.programNumber === selectedProgram)
  ) {
    return selectedProgram;
  }

  return (
    programs.find((program) => program.isAvailable)?.programNumber ??
    programs[0]!.programNumber
  );
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function createGeneralMidiProgramView(
  program: GeneralMidiProgram,
  registryEntries: readonly SoundBankInstrumentRegistryEntry[]
): SoundBankDebugGeneralMidiProgramView {
  const matchingEntries = registryEntries.filter(
    (entry) =>
      entry.isValid && entry.generalMidiProgramNumber === program.programNumber
  );

  return {
    ...program,
    isAvailable: matchingEntries.length > 0,
    isSelected: false,
    supportedRoles: [
      ...new Set(matchingEntries.flatMap((entry) => entry.supportedRoles)),
    ].sort(),
    recommendedRangeSummary:
      matchingEntries.length === 0
        ? null
        : summarizeRecommendedRange(matchingEntries),
    usesPlaceholderPatch: matchingEntries.some(
      (entry) => entry.sourcePlugin === 'core-generated-bank'
    ),
    usesCustomPatch: matchingEntries.some(
      (entry) => entry.sourcePlugin !== 'core-generated-bank'
    ),
  };
}

function createSoundBankDebugPercussionBrowserSections(
  state: SoundBankDebugPercussionBrowserState
): readonly SoundBankDebugPercussionBrowserSection[] {
  return PERCUSSION_FAMILY_ORDER.filter(
    (family) => state.familyFilter === 'all' || family === state.familyFilter
  ).map((family) => ({
    family,
    heading: formatLabel(family),
    voices: listPercussionVoicesForFamily(family).map((voice) => ({
      voiceId: voice.id,
      midiNote: voice.midiNote,
      name: voice.name,
      previewTarget: `percussion:${voice.id}`,
      shortcutKey: resolvePercussionPadShortcutKey(voice.id),
      isAvailable: true,
    })),
  }));
}

function createSoundBankDebugPercussionBrowserDisplaySections(
  state: SoundBankDebugPercussionBrowserState
): readonly SoundBankDebugPercussionBrowserSection[] {
  return createSoundBankDebugPercussionBrowserSections(state).map((section) => {
    const availableByMidiNote = new Map(
      section.voices.map((voice) => [voice.midiNote, voice])
    );
    const voices = listGeneralMidiPercussionNotesForFamily(section.family).map(
      (note) =>
        availableByMidiNote.get(note.midiNote) ??
        createMissingPercussionVoiceView(note)
    );
    return {
      ...section,
      voices,
    };
  });
}

function createFallbackPercussionPreviewNote(
  snapshot: MusicDebugSnapshot,
  voiceId: PercussionVoiceId,
  nowMs: number
): ProceduralMusicNote {
  const voice = resolvePercussionVoiceById(voiceId);
  const baseInstrument = snapshot.instrumentBank.instruments.percussion;
  const velocity = baseInstrument.defaultVelocity;
  const timbre = resolveVelocityShapedInstrumentTimbre({
    timbre: applyPercussionVoiceToTimbre({
      voice,
      timbre: baseInstrument.timbre,
    }),
    velocity,
  });

  return {
    themeId: snapshot.theme.id,
    instrumentId: `${baseInstrument.id}:perc-${voice.id}:preview`,
    role: 'percussion',
    startMs: nowMs + 4,
    durationMs: Math.max(
      96,
      Math.min(260, Math.round(baseInstrument.defaultNoteDurationMs * 0.68))
    ),
    frequency: resolveFrequencyFromMidiNote(voice.midiNote),
    volume: 0.06,
    velocity,
    waveform: voice.waveform,
    timbre,
    attackMs: Math.max(
      4,
      Math.round(baseInstrument.attackMs * voice.attackMultiplier)
    ),
    releaseMs: Math.max(
      24,
      Math.round(baseInstrument.releaseMs * voice.releaseMultiplier * 0.42)
    ),
    detuneCents: baseInstrument.detuneCents * voice.detuneMultiplier,
    harmonicGain: baseInstrument.harmonicGain * voice.harmonicGainMultiplier,
    pulseRate: baseInstrument.pulseRate * voice.pulseRateMultiplier,
  };
}

function createMissingPercussionVoiceView(
  note: GeneralMidiPercussionNote
): SoundBankDebugPercussionVoiceView {
  return {
    voiceId: null,
    midiNote: note.midiNote,
    name: note.name,
    previewTarget: null,
    shortcutKey: null,
    isAvailable: false,
  };
}

function summarizeRecommendedRange(
  entries: readonly SoundBankInstrumentRegistryEntry[]
): string {
  const minMidiNote = Math.min(
    ...entries.map((entry) => entry.recommendedMidiRange.minMidiNote)
  );
  const maxMidiNote = Math.max(
    ...entries.map((entry) => entry.recommendedMidiRange.maxMidiNote)
  );
  return `${minMidiNote}-${maxMidiNote}`;
}

function programHasPlayableMidiNote(
  programNumber: number,
  registryEntries: readonly SoundBankInstrumentRegistryEntry[],
  midiNote: number
): boolean {
  return registryEntries.some(
    (entry) =>
      entry.isValid &&
      entry.generalMidiProgramNumber === programNumber &&
      midiNote >= entry.recommendedMidiRange.minMidiNote &&
      midiNote <= entry.recommendedMidiRange.maxMidiNote
  );
}

function resolveFrequencyFromMidiNote(midiNote: number): number {
  return 440 * 2 ** ((midiNote - 69) / 12);
}

function applySoundBankDebugPreviewMode(
  note: ProceduralMusicNote,
  options: { dry?: boolean }
): ProceduralMusicNote {
  if (!options.dry || !note.space) {
    return note;
  }
  return {
    ...note,
    space: {
      ...note.space,
      wetGain: 0,
    },
  };
}

function buildSoundBankDebugPreviewEnvelopeControlsMarkup(
  instrument: ProceduralInstrument,
  previewEnvelopeState: SoundBankDebugPreviewEnvelopeState | null
): string {
  const previewEnvelope = normalizeSoundBankDebugPreviewEnvelopeState(
    previewEnvelopeState,
    resolveSoundBankDebugPreviewEnvelopeDefaults(instrument)
  );

  return `
    <section
      class="sound-bank-debug-preview-envelope"
      aria-label="Preview envelope controls"
      data-instrument-id="${instrument.id}"
    >
      <div class="sound-bank-debug-panel-head">
        <div>
          <p class="sound-bank-debug-panel-kicker">Live Preview Controls</p>
          <h3>ADSR Envelope</h3>
          <p>
            Override the selected patch envelope for debug playback without
            changing the generated bank.
          </p>
        </div>
      </div>
      <div class="sound-bank-debug-grid sound-bank-debug-preview-envelope-grid">
        ${buildSoundBankDebugPreviewEnvelopeSliderMarkup({
          inputId: 'sound-bank-debug-envelope-attack',
          outputId: 'sound-bank-debug-envelope-attack-value',
          label: 'Attack',
          value: previewEnvelope.attackMs,
          min: 1,
          max: 120,
          step: 1,
          suffix: 'ms',
        })}
        ${buildSoundBankDebugPreviewEnvelopeSliderMarkup({
          inputId: 'sound-bank-debug-envelope-decay',
          outputId: 'sound-bank-debug-envelope-decay-value',
          label: 'Decay',
          value: previewEnvelope.decayMs,
          min: 20,
          max: 240,
          step: 1,
          suffix: 'ms',
        })}
        ${buildSoundBankDebugPreviewEnvelopeSliderMarkup({
          inputId: 'sound-bank-debug-envelope-sustain',
          outputId: 'sound-bank-debug-envelope-sustain-value',
          label: 'Sustain',
          value: previewEnvelope.sustainLevel,
          min: 0.5,
          max: 1,
          step: 0.01,
          suffix: '',
        })}
        ${buildSoundBankDebugPreviewEnvelopeSliderMarkup({
          inputId: 'sound-bank-debug-envelope-release',
          outputId: 'sound-bank-debug-envelope-release-value',
          label: 'Release',
          value: previewEnvelope.releaseMs,
          min: 20,
          max: 360,
          step: 1,
          suffix: 'ms',
        })}
      </div>
    </section>
  `;
}

function buildSoundBankDebugPreviewEnvelopeSliderMarkup(options: {
  inputId: string;
  outputId: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
}): string {
  return `
    <label>
      <span>${options.label}</span>
      <div class="sound-bank-debug-master-gain-row">
        <input
          id="${options.inputId}"
          type="range"
          min="${options.min}"
          max="${options.max}"
          step="${options.step}"
          value="${options.value}"
        />
        <output id="${options.outputId}" for="${options.inputId}">
          ${formatSoundBankDebugPreviewEnvelopeValue(
            options.value,
            options.suffix
          )}
        </output>
      </div>
    </label>
  `;
}

function formatSoundBankDebugPreviewEnvelopeValue(
  value: number,
  suffix: string
): string {
  const roundedValue =
    suffix.length === 0 ? value.toFixed(2) : String(Math.round(value));
  return `${roundedValue}${suffix}`;
}

function applySoundBankDebugPreviewOptions(
  note: ProceduralMusicNote,
  options: {
    dry?: boolean;
    envelope?: SoundBankDebugPreviewEnvelope | null;
  }
): ProceduralMusicNote {
  const withEnvelope = applySoundBankDebugPreviewEnvelopeToNote(
    note,
    options.envelope
  );
  return applySoundBankDebugPreviewMode(withEnvelope, options);
}

const PERCUSSION_FAMILY_ORDER: readonly PercussionFamily[] = [
  'kick',
  'snare',
  'cymbals',
  'shaker',
  'hand-percussion',
];

const STANDARD_PERCUSSION_PATTERN_VOICE_IDS: readonly PercussionVoiceId[] = [
  'kick-36',
  'cymbals-42',
  'snare-38',
  'cymbals-42',
  'kick-36',
  'cymbals-42',
  'snare-38',
  'cymbals-46',
];
const QUIET_PERCUSSION_PATTERN_VOLUME_MULTIPLIER = 0.7;
const QUIET_PERCUSSION_PATTERN_VELOCITY_MULTIPLIER = 0.64;

const PERCUSSION_PAD_SHORTCUT_KEYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0',
  'q',
  'w',
  'e',
  'r',
  't',
  'y',
  'u',
  'i',
  'o',
  'p',
] as const;

const PERCUSSION_PAD_SHORTCUT_VOICE_ORDER = PERCUSSION_FAMILY_ORDER.flatMap(
  (family) => listPercussionVoicesForFamily(family).map((voice) => voice.id)
);

function resolvePercussionPadShortcutKey(voiceId: PercussionVoiceId): string {
  const shortcutIndex = PERCUSSION_PAD_SHORTCUT_VOICE_ORDER.indexOf(voiceId);
  return PERCUSSION_PAD_SHORTCUT_KEYS[shortcutIndex] ?? '';
}
