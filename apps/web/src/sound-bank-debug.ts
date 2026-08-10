import { randomizeDebugCoordinatePair } from './debug-seed.ts';
import {
  buildMusicDebugInstrumentPanelMarkup,
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
  listGeneralMidiFamilyNames,
  listGeneralMidiPrograms,
  type GeneralMidiProgram,
} from './general-midi.ts';
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
export type SoundBankDebugGeneralMidiSortMode = 'program' | 'name' | 'family';

export type SoundBankDebugGeneralMidiBrowserState = {
  searchQuery: string;
  familyFilter: string;
  roleFilter:
    | 'all'
    | MusicDebugSnapshot['instrumentBank']['instruments'][keyof MusicDebugSnapshot['instrumentBank']['instruments']]['role'];
  playableMidiNote: string;
  selectedProgramNumber: string;
  sortMode: SoundBankDebugGeneralMidiSortMode;
};

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

export const DEFAULT_SOUND_BANK_DEBUG_GENERAL_MIDI_BROWSER_STATE: SoundBankDebugGeneralMidiBrowserState =
  {
    searchQuery: '',
    familyFilter: 'all',
    roleFilter: 'all',
    playableMidiNote: '',
    selectedProgramNumber: '',
    sortMode: 'program',
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
    errorMessage?: string | null;
    generalMidiBrowserState?: Partial<SoundBankDebugGeneralMidiBrowserState>;
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
                  ['all', 'lead', 'harmony', 'bass', 'percussion'],
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
  nowMs: number
) {
  return resolveMusicDebugInstrumentPreviewNote(
    snapshot.musicSnapshot,
    role,
    nowMs
  );
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
    value?.roleFilter === 'bass' ||
    value?.roleFilter === 'percussion'
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

function formatLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

  return programs[0]!.programNumber;
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
