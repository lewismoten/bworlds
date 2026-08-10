import type { MusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugInstrumentPreviewPlaybackNote } from './music-debug-playback-profile.ts';
import type {
  ProceduralMusicNote,
} from './procedural-music.ts';
import type { ProceduralInstrument } from './procedural-music-sound-bank.ts';

export function buildMusicDebugInstrumentPanelMarkup(
  snapshot: MusicDebugSnapshot
): string {
  const cards = (
    Object.entries(snapshot.instrumentBank.instruments) as Array<
      [
        keyof MusicDebugSnapshot['instrumentBank']['instruments'],
        ProceduralInstrument,
      ]
    >
  )
    .map(([role, instrument]) =>
      buildMusicDebugInstrumentCardMarkup({
        role,
        instrument,
      })
    )
    .join('');

  return `
    <section class="music-debug-instrument-panel" aria-label="Instrument previews">
      ${cards}
    </section>
  `;
}

export function resolveMusicDebugInstrumentPreviewNote(
  snapshot: MusicDebugSnapshot,
  role: keyof MusicDebugSnapshot['instrumentBank']['instruments'],
  nowMs: number
): ProceduralMusicNote | null {
  const source =
    snapshot.notes.find((note) => note.role === role) ??
    snapshot.notes[0] ??
    null;
  if (!source) {
    return null;
  }

  return createMusicDebugInstrumentPreviewPlaybackNote(
    source,
    snapshot.instrumentBank.instruments[role].id,
    nowMs
  );
}

function buildMusicDebugInstrumentCardMarkup(options: {
  role: keyof MusicDebugSnapshot['instrumentBank']['instruments'];
  instrument: ProceduralInstrument;
}): string {
  return `
    <article class="music-debug-instrument-card">
      <div class="music-debug-instrument-card-head">
        <div>
          <p class="music-debug-instrument-track">${options.role}</p>
          <h3>${formatInstrumentFamilyLabel(options.instrument.family)}</h3>
        </div>
        <button
          type="button"
          class="music-debug-instrument-play"
          data-role="${options.role}"
        >
          Play ${options.role}
        </button>
      </div>
      <div class="music-debug-instrument-waveform">
        ${buildMusicDebugInstrumentWaveformMarkup(options.instrument)}
      </div>
      <dl class="music-debug-instrument-stats">
        <div><dt>Carrier</dt><dd>${options.instrument.waveform}</dd></div>
        <div><dt>Harmonic</dt><dd>${options.instrument.timbre.harmonicWaveform}</dd></div>
        <div><dt>Filter</dt><dd>${options.instrument.timbre.filterType} ${options.instrument.timbre.filterCutoffHz.toFixed(0)}Hz</dd></div>
        <div><dt>Attack</dt><dd>${Math.round(options.instrument.attackMs)}ms</dd></div>
      </dl>
    </article>
  `;
}

function buildMusicDebugInstrumentWaveformMarkup(
  instrument: ProceduralInstrument
): string {
  const width = 180;
  const height = 56;
  const midY = height / 2;
  const points: string[] = [];

  for (let sampleIndex = 0; sampleIndex < 48; sampleIndex += 1) {
    const phase = sampleIndex / 47;
    const carrier = resolveWaveSample(instrument.waveform, phase);
    const harmonic = resolveWaveSample(
      instrument.timbre.harmonicWaveform,
      (phase * instrument.timbre.harmonicRatio) % 1
    );
    const mixed =
      carrier * (1 - instrument.harmonicGain * 0.45) +
      harmonic * instrument.harmonicGain * 0.45;
    const x = (sampleIndex / 47) * width;
    const y = midY - mixed * (height * 0.32);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <rect width="${width}" height="${height}" rx="12" ry="12"></rect>
      <path class="music-debug-instrument-waveform-line" d="M0 ${midY.toFixed(2)} H${width}"></path>
      <polyline
        class="music-debug-instrument-waveform-shape"
        points="${points.join(' ')}"
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
