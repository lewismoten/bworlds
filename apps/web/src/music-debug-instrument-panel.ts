import type { MusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugPercussionVoiceCounts } from './music-debug-percussion-report.ts';
import {
  createMusicDebugInstrumentPreviewPlaybackNote,
  createMusicDebugInstrumentPreviewPlaybackNotes,
} from './music-debug-playback-profile.ts';
import {
  formatMusicDebugDisplayRoleLabel,
  MUSIC_DEBUG_DISPLAY_ROLE_ORDER,
} from './music-debug-role-display.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralInstrument } from './procedural-music-sound-bank.ts';

export type MusicDebugInstrumentPreviewTarget =
  | keyof MusicDebugSnapshot['instrumentBank']['instruments']
  | `percussion:${string}`;

export type MusicDebugInstrumentCardExport = {
  fileSuffix: string;
  trackLabel: string;
  title: string;
  previewTarget: MusicDebugInstrumentPreviewTarget;
  audioSource: Pick<
    ProceduralInstrument | ProceduralMusicNote,
    'waveform' | 'timbre' | 'attackMs' | 'harmonicGain'
  >;
};

export function buildMusicDebugInstrumentPanelMarkup(
  snapshot: MusicDebugSnapshot
): string {
  const cards = createMusicDebugInstrumentCardExports(snapshot);
  const melodicCards = cards
    .filter((card) => !card.previewTarget.startsWith('percussion:'))
    .map((card) => buildMusicDebugInstrumentCardMarkup(card))
    .join('');
  const percussionCards = cards
    .filter((card) => card.previewTarget.startsWith('percussion:'))
    .map((card) => buildMusicDebugInstrumentCardMarkup(card))
    .join('');

  return `
    <section class="music-debug-instrument-panel" aria-label="Instrument previews">
      ${melodicCards}${percussionCards}
    </section>
  `;
}

export function resolveMusicDebugInstrumentPreviewNote(
  snapshot: MusicDebugSnapshot,
  target: MusicDebugInstrumentPreviewTarget,
  nowMs: number
): ProceduralMusicNote | null {
  if (target.startsWith('percussion:')) {
    const voiceId = target.slice('percussion:'.length);
    const source =
      snapshot.notes.find(
        (note) =>
          note.role === 'percussion' &&
          note.instrumentId.includes(`perc-${voiceId}:`)
      ) ?? null;
    if (!source) {
      return null;
    }
    return createMusicDebugInstrumentPreviewPlaybackNote(
      source,
      source.instrumentId,
      nowMs
    );
  }

  const source =
    snapshot.notes.find((note) => note.role === target) ??
    snapshot.notes[0] ??
    null;
  if (!source) {
    return null;
  }

  return createMusicDebugInstrumentPreviewPlaybackNote(
    source,
    snapshot.instrumentBank.instruments[target].id,
    nowMs
  );
}

export function resolveMusicDebugInstrumentPreviewPhraseNotes(
  snapshot: MusicDebugSnapshot,
  target: MusicDebugInstrumentPreviewTarget,
  nowMs: number
): readonly ProceduralMusicNote[] {
  if (target.startsWith('percussion:')) {
    const voiceId = target.slice('percussion:'.length);
    const sourceNotes = snapshot.notes.filter(
      (note) =>
        note.role === 'percussion' &&
        note.instrumentId.includes(`perc-${voiceId}:`)
    );
    if (sourceNotes.length === 0) {
      return [];
    }
    return createMusicDebugInstrumentPreviewPlaybackNotes(
      sourceNotes,
      sourceNotes[0]?.instrumentId ?? '',
      nowMs
    );
  }

  const sourceNotes = snapshot.notes.filter((note) => note.role === target);
  if (sourceNotes.length === 0) {
    return [];
  }

  return createMusicDebugInstrumentPreviewPlaybackNotes(
    sourceNotes,
    snapshot.instrumentBank.instruments[target].id,
    nowMs
  );
}

function buildMusicDebugInstrumentCardMarkup(options: {
  trackLabel: string;
  title: string;
  previewTarget: MusicDebugInstrumentPreviewTarget;
  audioSource: Pick<
    ProceduralInstrument | ProceduralMusicNote,
    'waveform' | 'timbre' | 'attackMs' | 'harmonicGain'
  >;
}): string {
  return `
    <article class="music-debug-instrument-card">
      <div class="music-debug-instrument-card-head">
        <div>
          <p class="music-debug-instrument-track">${options.trackLabel}</p>
          <h3>${options.title}</h3>
        </div>
        <button
          type="button"
          class="music-debug-instrument-play"
          data-preview-id="${options.previewTarget}"
        >
          Play ${options.trackLabel}
        </button>
        <button
          type="button"
          class="music-debug-instrument-play-phrase"
          data-preview-id="${options.previewTarget}"
        >
          Play Phrase
        </button>
      </div>
      <div class="music-debug-instrument-waveform">
        ${buildMusicDebugInstrumentWaveformMarkup(options.audioSource)}
      </div>
      <dl class="music-debug-instrument-stats">
        <div><dt>Carrier</dt><dd>${options.audioSource.waveform}</dd></div>
        <div><dt>Harmonic</dt><dd>${options.audioSource.timbre.harmonicWaveform}</dd></div>
        <div><dt>Filter</dt><dd>${options.audioSource.timbre.filterType} ${options.audioSource.timbre.filterCutoffHz.toFixed(0)}Hz</dd></div>
        <div><dt>Attack</dt><dd>${Math.round(options.audioSource.attackMs)}ms</dd></div>
      </dl>
    </article>
  `;
}

export function buildMusicDebugInstrumentWaveformMarkup(
  instrument: Pick<
    ProceduralInstrument | ProceduralMusicNote,
    'waveform' | 'timbre' | 'harmonicGain'
  >
): string {
  return buildMusicDebugInstrumentWaveformSvgMarkup(instrument);
}

export function buildMusicDebugInstrumentWaveformSvgMarkup(
  instrument: Pick<
    ProceduralInstrument | ProceduralMusicNote,
    'waveform' | 'timbre' | 'harmonicGain'
  >
): string {
  const width = 180;
  const height = 56;
  const midY = height / 2;
  const points: string[] = [];
  const carrierWeight = Math.max(
    0,
    instrument.timbre.fundamentalGainMultiplier ?? 1
  );
  const harmonicWeight = Math.max(0, instrument.harmonicGain * 0.45);
  const totalWeight = carrierWeight + harmonicWeight;

  for (let sampleIndex = 0; sampleIndex < 48; sampleIndex += 1) {
    const phase = sampleIndex / 47;
    const carrier = resolveWaveSample(instrument.waveform, phase);
    const harmonic = resolveWaveSample(
      instrument.timbre.harmonicWaveform,
      (phase * instrument.timbre.harmonicRatio) % 1
    );
    const mixed =
      totalWeight <= 0
        ? 0
        : (carrier * carrierWeight + harmonic * harmonicWeight) / totalWeight;
    const x = (sampleIndex / 47) * width;
    const y = midY - mixed * (height * 0.32);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="12" ry="12" fill="#08131b"></rect>
      <path class="music-debug-instrument-waveform-line" d="M0 ${midY.toFixed(2)} H${width}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1"></path>
      <polyline
        class="music-debug-instrument-waveform-shape"
        points="${points.join(' ')}"
        fill="none"
        stroke="#55d6be"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></polyline>
    </svg>
  `;
}

function resolveWaveSample(
  waveform: ProceduralInstrument['waveform'],
  phase: number
): number {
  const normalizedPhase = phase % 1;
  switch (waveform) {
    case 'triangle':
      return 1 - 4 * Math.abs(normalizedPhase - 0.5);
    case 'square':
      return normalizedPhase < 0.5 ? 1 : -1;
    case 'sawtooth':
      return normalizedPhase * 2 - 1;
    case 'sine':
    default:
      return Math.sin(normalizedPhase * Math.PI * 2);
  }
}

function formatInstrumentFamilyLabel(
  family: ProceduralInstrument['family']
): string {
  return family
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPercussionVoiceTitle(voiceName: string): string {
  return voiceName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function createMusicDebugInstrumentCardExports(
  snapshot: MusicDebugSnapshot
): readonly MusicDebugInstrumentCardExport[] {
  const melodicCards = MUSIC_DEBUG_DISPLAY_ROLE_ORDER.filter(
    (role) => role !== 'percussion'
  ).map((role) => ({
    fileSuffix: `${role}-waveform`,
    trackLabel: formatMusicDebugDisplayRoleLabel(role),
    title: formatInstrumentFamilyLabel(
      snapshot.instrumentBank.instruments[role].family
    ),
    previewTarget: role,
    audioSource: snapshot.instrumentBank.instruments[role],
  }));
  const percussionCards = createMusicDebugPercussionVoiceCounts(
    snapshot.notes
  ).flatMap((voice) => {
    if (!voice.voiceId) {
      return [];
    }
    const representativeNote = snapshot.notes.find(
      (note) =>
        note.role === 'percussion' &&
        note.instrumentId.includes(`perc-${voice.voiceId}:`)
    );
    if (!representativeNote) {
      return [];
    }
    return [
      {
        fileSuffix: `percussion-${voice.voiceId}-waveform`,
        trackLabel: `percussion / ${voice.voiceName}`,
        title: formatPercussionVoiceTitle(voice.voiceName),
        previewTarget: `percussion:${voice.voiceId}` as const,
        audioSource: representativeNote,
      },
    ];
  });

  return [...melodicCards, ...percussionCards];
}
