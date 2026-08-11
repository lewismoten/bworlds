import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralInstrument } from './procedural-music-sound-bank.ts';

export type SoundBankDebugPreviewOscillatorSoloTarget =
  'all' | 'carrier' | 'harmonic';

export type SoundBankDebugPreviewOscillatorOverride = Readonly<{
  carrierEnabled: boolean;
  harmonicEnabled: boolean;
  soloTarget: SoundBankDebugPreviewOscillatorSoloTarget;
}>;

export type SoundBankDebugPreviewOscillatorState =
  SoundBankDebugPreviewOscillatorOverride &
    Readonly<{
      instrumentId: string;
    }>;

export function resolveSoundBankDebugPreviewOscillatorDefaults(
  instrument: Pick<ProceduralInstrument, 'id' | 'harmonicGain' | 'timbre'>
): SoundBankDebugPreviewOscillatorState {
  return {
    instrumentId: instrument.id,
    carrierEnabled: (instrument.timbre.fundamentalGainMultiplier ?? 1) > 0,
    harmonicEnabled: instrument.harmonicGain > 0,
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
    harmonicGain: harmonicEnabled ? note.harmonicGain : 0,
    timbre: {
      ...note.timbre,
      fundamentalGainMultiplier: carrierEnabled
        ? Math.max(0, note.timbre.fundamentalGainMultiplier ?? 1)
        : 0,
    },
  };
}

export function applySoundBankDebugPreviewOscillatorStateToInstrument(
  instrument: ProceduralInstrument,
  state: SoundBankDebugPreviewOscillatorState | null | undefined
): ProceduralInstrument {
  if (!state || state.instrumentId !== instrument.id) {
    return instrument;
  }

  const carrierEnabled = resolveCarrierEnabled(state);
  const harmonicEnabled = resolveHarmonicEnabled(state);

  return {
    ...instrument,
    harmonicGain: harmonicEnabled ? instrument.harmonicGain : 0,
    timbre: {
      ...instrument.timbre,
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
