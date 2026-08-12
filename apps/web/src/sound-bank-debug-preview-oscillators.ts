import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralInstrument } from './procedural-music-sound-bank.ts';
import type { MusicWaveform } from './music-instrument-timbres.ts';

export const SOUND_BANK_DEBUG_PREVIEW_OSCILLATOR_WAVEFORMS = [
  'sine',
  'triangle',
  'square',
  'sawtooth',
] as const satisfies readonly MusicWaveform[];

export type SoundBankDebugPreviewOscillatorSoloTarget =
  'all' | 'carrier' | 'harmonic';

export type SoundBankDebugPreviewOscillatorOverride = Readonly<{
  carrierEnabled: boolean;
  harmonicEnabled: boolean;
  carrierWaveform: MusicWaveform;
  harmonicWaveform: MusicWaveform;
  soloTarget: SoundBankDebugPreviewOscillatorSoloTarget;
}>;

export type SoundBankDebugPreviewOscillatorState =
  SoundBankDebugPreviewOscillatorOverride &
    Readonly<{
      instrumentId: string;
    }>;

export function resolveSoundBankDebugPreviewOscillatorDefaults(
  instrument: Pick<
    ProceduralInstrument,
    'id' | 'waveform' | 'harmonicGain' | 'timbre'
  >
): SoundBankDebugPreviewOscillatorState {
  return {
    instrumentId: instrument.id,
    carrierEnabled: (instrument.timbre.fundamentalGainMultiplier ?? 1) > 0,
    harmonicEnabled: instrument.harmonicGain > 0,
    carrierWaveform: instrument.waveform,
    harmonicWaveform: instrument.timbre.harmonicWaveform,
    soloTarget: 'all',
  };
}

export function normalizeSoundBankDebugPreviewOscillatorState(
  value: Partial<SoundBankDebugPreviewOscillatorState> | null | undefined,
  fallback: Pick<SoundBankDebugPreviewOscillatorState, 'instrumentId'> &
    Partial<SoundBankDebugPreviewOscillatorOverride>
): SoundBankDebugPreviewOscillatorState {
  return {
    instrumentId: value?.instrumentId?.trim() || fallback.instrumentId,
    carrierEnabled: value?.carrierEnabled ?? fallback.carrierEnabled ?? true,
    harmonicEnabled: value?.harmonicEnabled ?? fallback.harmonicEnabled ?? true,
    carrierWaveform: resolveWaveform(
      value?.carrierWaveform ?? fallback.carrierWaveform
    ),
    harmonicWaveform: resolveWaveform(
      value?.harmonicWaveform ?? fallback.harmonicWaveform
    ),
    soloTarget: resolveSoloTarget(value?.soloTarget ?? fallback.soloTarget),
  };
}

export function resolveCarrierEnabled(
  state: SoundBankDebugPreviewOscillatorOverride | null | undefined
): boolean {
  if (!state) {
    return true;
  }
  if (state.soloTarget === 'harmonic') {
    return false;
  }
  if (state.soloTarget === 'carrier') {
    return true;
  }
  return state.carrierEnabled;
}

export function resolveHarmonicEnabled(
  state: SoundBankDebugPreviewOscillatorOverride | null | undefined
): boolean {
  if (!state) {
    return true;
  }
  if (state.soloTarget === 'carrier') {
    return false;
  }
  if (state.soloTarget === 'harmonic') {
    return true;
  }
  return state.harmonicEnabled;
}

export function applySoundBankDebugPreviewOscillatorStateToNote(
  note: ProceduralMusicNote,
  state: SoundBankDebugPreviewOscillatorOverride | null | undefined
): ProceduralMusicNote {
  if (!state) {
    return note;
  }

  const carrierEnabled = resolveCarrierEnabled(state);
  const harmonicEnabled = resolveHarmonicEnabled(state);

  return {
    ...note,
    waveform: state.carrierWaveform,
    harmonicGain: harmonicEnabled ? note.harmonicGain : 0,
    timbre: {
      ...note.timbre,
      harmonicWaveform: state.harmonicWaveform,
      fundamentalGainMultiplier: carrierEnabled
        ? Math.max(0, note.timbre.fundamentalGainMultiplier ?? 1)
        : 0,
    },
  };
}

export function applySoundBankDebugPreviewOscillatorStateToInstrument<
  T extends Pick<
    ProceduralInstrument,
    'id' | 'waveform' | 'harmonicGain' | 'timbre'
  >,
>(
  instrument: T,
  state: SoundBankDebugPreviewOscillatorState | null | undefined
): T {
  if (!state || state.instrumentId !== instrument.id) {
    return instrument;
  }

  const carrierEnabled = resolveCarrierEnabled(state);
  const harmonicEnabled = resolveHarmonicEnabled(state);

  return {
    ...instrument,
    waveform: state.carrierWaveform,
    harmonicGain: harmonicEnabled ? instrument.harmonicGain : 0,
    timbre: {
      ...instrument.timbre,
      harmonicWaveform: state.harmonicWaveform,
      fundamentalGainMultiplier: carrierEnabled
        ? Math.max(0, instrument.timbre.fundamentalGainMultiplier ?? 1)
        : 0,
    },
  };
}

function resolveSoloTarget(
  value: string | null | undefined
): SoundBankDebugPreviewOscillatorSoloTarget {
  if (value === 'carrier' || value === 'harmonic' || value === 'all') {
    return value;
  }
  return 'all';
}

function resolveWaveform(
  value: MusicWaveform | string | null | undefined
): MusicWaveform {
  return value === 'triangle' ||
    value === 'square' ||
    value === 'sawtooth' ||
    value === 'sine'
    ? value
    : 'sine';
}
