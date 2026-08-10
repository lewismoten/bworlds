import { randomizeDebugCoordinatePair } from './debug-seed.ts';
import {
  buildMusicDebugInstrumentPanelMarkup,
  resolveMusicDebugInstrumentPreviewNote,
} from './music-debug-instrument-panel.ts';
import {
  createMusicDebugSnapshot,
  DEFAULT_MUSIC_DEBUG_OPTIONS,
  normalizeMusicDebugOptions,
  type MusicDebugContextType,
  type MusicDebugSnapshot,
  type MusicDebugTileKind,
} from './music-debug.ts';

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
  value: Partial<SoundBankDebugOptions> | null | undefined = {}
): SoundBankDebugSnapshot {
  const options = normalizeSoundBankDebugOptions(value);
  return {
    options,
    musicSnapshot: createMusicDebugSnapshot({
      ...DEFAULT_MUSIC_DEBUG_OPTIONS,
      ...options,
    }),
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
    errorMessage?: string | null;
  } = {
    audioStatus: 'Audio idle',
  }
): string {
  const { musicSnapshot } = snapshot;
  const instrumentCards = buildMusicDebugInstrumentPanelMarkup(musicSnapshot);
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
        </article>
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

  return `
    <main class="sound-bank-debug-shell">
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
            </div>
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
  role: keyof MusicDebugSnapshot['instrumentBank']['instruments'],
  nowMs: number
) {
  return resolveMusicDebugInstrumentPreviewNote(
    snapshot.musicSnapshot,
    role,
    nowMs
  );
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
