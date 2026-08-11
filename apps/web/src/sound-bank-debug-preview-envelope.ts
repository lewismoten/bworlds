import { clamp } from '@bworlds/core';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralInstrument } from './procedural-music-sound-bank.ts';

export type SoundBankDebugPreviewEnvelope = Readonly<{
  attackMs: number;
  decayMs: number;
  sustainLevel: number;
  releaseMs: number;
}>;

export type SoundBankDebugPreviewEnvelopeState = SoundBankDebugPreviewEnvelope &
  Readonly<{
    instrumentId: string;
  }>;

const DEFAULT_SUSTAIN_LEVEL = 0.74;
const MIN_ATTACK_MS = 1;
const MAX_ATTACK_MS = 120;
const MIN_DECAY_MS = 20;
const MAX_DECAY_MS = 240;
const MIN_SUSTAIN_LEVEL = 0.5;
const MAX_SUSTAIN_LEVEL = 1;
const MIN_RELEASE_MS = 20;
const MAX_RELEASE_MS = 360;

type EnvelopeSource = {
  attackMs: number;
  timbre: ProceduralMusicNote['timbre'];
};

export function resolveSoundBankDebugPreviewDecayMs(
  options: Pick<EnvelopeSource, 'attackMs' | 'timbre'>
): number {
  const explicitDecayMs = options.timbre.bodySettleMs;
  if (Number.isFinite(explicitDecayMs)) {
    return clamp(
      Math.round(explicitDecayMs ?? MIN_DECAY_MS),
      MIN_DECAY_MS,
      MAX_DECAY_MS
    );
  }

  return clamp(
    Math.round(Math.min(80, Math.max(20, options.attackMs * 0.5))),
    MIN_DECAY_MS,
    MAX_DECAY_MS
  );
}

export function resolveSoundBankDebugPreviewEnvelopeDefaults(
  instrument: Pick<
    ProceduralInstrument,
    'id' | 'attackMs' | 'releaseMs' | 'timbre'
  >
): SoundBankDebugPreviewEnvelopeState {
  return {
    instrumentId: instrument.id,
    attackMs: clamp(
      Math.round(instrument.attackMs),
      MIN_ATTACK_MS,
      MAX_ATTACK_MS
    ),
    decayMs: resolveSoundBankDebugPreviewDecayMs(instrument),
    sustainLevel: clamp(
      instrument.timbre.bodySustainLevel ?? DEFAULT_SUSTAIN_LEVEL,
      MIN_SUSTAIN_LEVEL,
      MAX_SUSTAIN_LEVEL
    ),
    releaseMs: clamp(
      Math.round(instrument.releaseMs),
      MIN_RELEASE_MS,
      MAX_RELEASE_MS
    ),
  };
}

export function normalizeSoundBankDebugPreviewEnvelopeState(
  value: Partial<SoundBankDebugPreviewEnvelopeState> | null | undefined,
  fallback: Pick<SoundBankDebugPreviewEnvelopeState, 'instrumentId'> &
    Partial<SoundBankDebugPreviewEnvelope>
): SoundBankDebugPreviewEnvelopeState {
  return {
    instrumentId: value?.instrumentId?.trim() || fallback.instrumentId,
    attackMs: clamp(
      Math.round(value?.attackMs ?? fallback.attackMs ?? 24),
      MIN_ATTACK_MS,
      MAX_ATTACK_MS
    ),
    decayMs: clamp(
      Math.round(value?.decayMs ?? fallback.decayMs ?? 40),
      MIN_DECAY_MS,
      MAX_DECAY_MS
    ),
    sustainLevel: clamp(
      value?.sustainLevel ?? fallback.sustainLevel ?? DEFAULT_SUSTAIN_LEVEL,
      MIN_SUSTAIN_LEVEL,
      MAX_SUSTAIN_LEVEL
    ),
    releaseMs: clamp(
      Math.round(value?.releaseMs ?? fallback.releaseMs ?? 140),
      MIN_RELEASE_MS,
      MAX_RELEASE_MS
    ),
  };
}

export function applySoundBankDebugPreviewEnvelopeToNote(
  note: ProceduralMusicNote,
  envelope: SoundBankDebugPreviewEnvelope | null | undefined
): ProceduralMusicNote {
  if (!envelope) {
    return note;
  }

  return {
    ...note,
    attackMs: envelope.attackMs,
    releaseMs: envelope.releaseMs,
    timbre: {
      ...note.timbre,
      bodySettleMs: envelope.decayMs,
      bodySustainLevel: envelope.sustainLevel,
      harmonicBodyLevel: clamp(
        envelope.sustainLevel - resolveHarmonicBodyGap(note),
        0.2,
        1
      ),
    },
  };
}

export function applySoundBankDebugPreviewEnvelopeToInstrument(
  instrument: ProceduralInstrument,
  envelope: SoundBankDebugPreviewEnvelopeState | null | undefined
): ProceduralInstrument {
  if (!envelope || envelope.instrumentId !== instrument.id) {
    return instrument;
  }

  return {
    ...instrument,
    attackMs: envelope.attackMs,
    releaseMs: envelope.releaseMs,
    timbre: {
      ...instrument.timbre,
      bodySettleMs: envelope.decayMs,
      bodySustainLevel: envelope.sustainLevel,
      harmonicBodyLevel: clamp(
        envelope.sustainLevel - resolveHarmonicBodyGap(instrument),
        0.2,
        1
      ),
    },
  };
}

function resolveHarmonicBodyGap(
  source: Pick<EnvelopeSource, 'timbre'>
): number {
  const sustainLevel = source.timbre.bodySustainLevel ?? DEFAULT_SUSTAIN_LEVEL;
  const harmonicBodyLevel =
    source.timbre.harmonicBodyLevel ?? Math.max(0.5, sustainLevel - 0.06);
  return clamp(sustainLevel - harmonicBodyLevel, 0, 0.3);
}
