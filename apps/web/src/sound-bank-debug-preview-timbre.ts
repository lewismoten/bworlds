import { clamp } from '@bworlds/core';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralInstrument } from './procedural-music-sound-bank.ts';

export type SoundBankDebugPreviewTimbreOverride = Readonly<{
  detuneCents: number;
  filterCutoffHz: number;
  filterQ: number;
  noiseMix: number;
}>;

export type SoundBankDebugPreviewTimbreState =
  SoundBankDebugPreviewTimbreOverride &
    Readonly<{
      instrumentId: string;
    }>;

const MIN_DETUNE_CENTS = -24;
const MAX_DETUNE_CENTS = 24;
const MIN_FILTER_CUTOFF_HZ = 80;
const MAX_FILTER_CUTOFF_HZ = 12_000;
const MIN_FILTER_Q = 0.1;
const MAX_FILTER_Q = 8;
const MIN_NOISE_MIX = 0;
const MAX_NOISE_MIX = 0.4;

export function resolveSoundBankDebugPreviewTimbreDefaults(
  instrument: Pick<ProceduralInstrument, 'id' | 'detuneCents' | 'timbre'>
): SoundBankDebugPreviewTimbreState {
  return {
    instrumentId: instrument.id,
    detuneCents: clamp(
      Math.round(instrument.detuneCents),
      MIN_DETUNE_CENTS,
      MAX_DETUNE_CENTS
    ),
    filterCutoffHz: clamp(
      Math.round(instrument.timbre.filterCutoffHz),
      MIN_FILTER_CUTOFF_HZ,
      MAX_FILTER_CUTOFF_HZ
    ),
    filterQ: clamp(instrument.timbre.filterQ, MIN_FILTER_Q, MAX_FILTER_Q),
    noiseMix: clamp(
      instrument.timbre.noiseMix ?? MIN_NOISE_MIX,
      MIN_NOISE_MIX,
      MAX_NOISE_MIX
    ),
  };
}

export function normalizeSoundBankDebugPreviewTimbreState(
  value: Partial<SoundBankDebugPreviewTimbreState> | null | undefined,
  fallback: Pick<SoundBankDebugPreviewTimbreState, 'instrumentId'> &
    Partial<SoundBankDebugPreviewTimbreOverride>
): SoundBankDebugPreviewTimbreState {
  return {
    instrumentId: value?.instrumentId?.trim() || fallback.instrumentId,
    detuneCents: clamp(
      Math.round(value?.detuneCents ?? fallback.detuneCents ?? 0),
      MIN_DETUNE_CENTS,
      MAX_DETUNE_CENTS
    ),
    filterCutoffHz: clamp(
      Math.round(value?.filterCutoffHz ?? fallback.filterCutoffHz ?? 2_400),
      MIN_FILTER_CUTOFF_HZ,
      MAX_FILTER_CUTOFF_HZ
    ),
    filterQ: clamp(
      value?.filterQ ?? fallback.filterQ ?? 0.9,
      MIN_FILTER_Q,
      MAX_FILTER_Q
    ),
    noiseMix: clamp(
      value?.noiseMix ?? fallback.noiseMix ?? 0,
      MIN_NOISE_MIX,
      MAX_NOISE_MIX
    ),
  };
}

export function applySoundBankDebugPreviewTimbreToNote(
  note: ProceduralMusicNote,
  timbre: SoundBankDebugPreviewTimbreOverride | null | undefined
): ProceduralMusicNote {
  if (!timbre) {
    return note;
  }

  return {
    ...note,
    detuneCents: timbre.detuneCents,
    timbre: {
      ...note.timbre,
      filterCutoffHz: timbre.filterCutoffHz,
      filterQ: timbre.filterQ,
      noiseMix: timbre.noiseMix,
    },
  };
}

export function applySoundBankDebugPreviewTimbreToInstrument(
  instrument: ProceduralInstrument,
  timbre: SoundBankDebugPreviewTimbreState | null | undefined
): ProceduralInstrument {
  if (!timbre || timbre.instrumentId !== instrument.id) {
    return instrument;
  }

  return {
    ...instrument,
    detuneCents: timbre.detuneCents,
    timbre: {
      ...instrument.timbre,
      filterCutoffHz: timbre.filterCutoffHz,
      filterQ: timbre.filterQ,
      noiseMix: timbre.noiseMix,
    },
  };
}

export function formatSoundBankDebugNoiseMix(value: number): string {
  return clamp(value, MIN_NOISE_MIX, MAX_NOISE_MIX).toFixed(2);
}

export function formatSoundBankDebugFilterQ(value: number): string {
  return clamp(value, MIN_FILTER_Q, MAX_FILTER_Q).toFixed(2);
}

export function formatSoundBankDebugDetuneCents(value: number): string {
  const roundedValue = Math.round(
    clamp(value, MIN_DETUNE_CENTS, MAX_DETUNE_CENTS)
  );
  return `${roundedValue > 0 ? '+' : ''}${roundedValue}`;
}

export function formatSoundBankDebugFilterCutoffHz(value: number): string {
  return Math.round(
    clamp(value, MIN_FILTER_CUTOFF_HZ, MAX_FILTER_CUTOFF_HZ)
  ).toLocaleString();
}
