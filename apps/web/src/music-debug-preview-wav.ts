import type { ProceduralMusicNote } from './procedural-music.ts';
import { encodeMonoPcm16Wav } from './wav-file.ts';

export const MUSIC_DEBUG_PREVIEW_WAV_SAMPLE_RATE = 48_000;

export type MusicDebugPreviewWavFile = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
};

export function renderMusicDebugPreviewNoteToSamples(
  note: ProceduralMusicNote,
  sampleRate = MUSIC_DEBUG_PREVIEW_WAV_SAMPLE_RATE
): Float32Array {
  const frameCount = Math.max(
    1,
    Math.ceil((Math.max(1, note.durationMs) / 1000) * sampleRate)
  );
  const samples = new Float32Array(frameCount);
  const detunedFrequency =
    note.frequency * Math.pow(2, (note.detuneCents ?? 0) / 1200);
  const harmonicFrequency = Math.max(
    1,
    detunedFrequency * Math.max(0.5, note.timbre.harmonicRatio)
  );
  let carrierPhase = 0;
  let harmonicPhase = 0;
  const carrierPhaseIncrement = (Math.PI * 2 * detunedFrequency) / sampleRate;
  const harmonicPhaseIncrement = (Math.PI * 2 * harmonicFrequency) / sampleRate;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const timeSeconds = frame / sampleRate;
    const pulseModulation =
      note.pulseRate > 0
        ? 1 + Math.sin(timeSeconds * note.pulseRate * Math.PI * 2) * 0.08
        : 1;
    const carrier = sampleWaveform(note.waveform, carrierPhase);
    const harmonic = sampleWaveform(
      note.timbre.harmonicWaveform,
      harmonicPhase
    );
    const harmonicWeight = Math.max(
      0,
      Math.min(0.65, note.harmonicGain * 0.35)
    );
    const mixed =
      carrier * (1 - harmonicWeight) +
      harmonic * harmonicWeight * pulseModulation;
    samples[frame] =
      mixed *
      resolveEnvelopeGain(note, timeSeconds, note.durationMs / 1000) *
      Math.max(0.12, note.volume * 14);
    carrierPhase = advancePhase(carrierPhase, carrierPhaseIncrement);
    harmonicPhase = advancePhase(harmonicPhase, harmonicPhaseIncrement);
  }

  normalizeSamples(samples);
  return samples;
}

export function createMusicDebugPreviewWavFile(options: {
  note: ProceduralMusicNote;
  fileName: string;
}): MusicDebugPreviewWavFile {
  const samples = renderMusicDebugPreviewNoteToSamples(options.note);
  return {
    bytes: encodeMonoPcm16Wav({
      samples,
      sampleRate: MUSIC_DEBUG_PREVIEW_WAV_SAMPLE_RATE,
    }),
    fileName: options.fileName,
    mimeType: 'audio/wav',
  };
}

function sampleWaveform(
  waveform: ProceduralMusicNote['waveform'],
  phase: number
): number {
  switch (waveform) {
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'sawtooth':
      return ((phase / Math.PI) % 2) - 1;
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'sine':
    default:
      return Math.sin(phase);
  }
}

function resolveEnvelopeGain(
  note: Pick<ProceduralMusicNote, 'attackMs' | 'releaseMs'>,
  timeSeconds: number,
  durationSeconds: number
): number {
  const attackSeconds = Math.max(0.001, note.attackMs / 1000);
  const releaseSeconds = Math.max(0.001, note.releaseMs / 1000);
  if (timeSeconds <= attackSeconds) {
    return timeSeconds / attackSeconds;
  }

  const releaseStartSeconds = Math.max(
    attackSeconds,
    durationSeconds - releaseSeconds
  );
  if (timeSeconds >= releaseStartSeconds) {
    return Math.max(
      0,
      (durationSeconds - timeSeconds) /
        Math.max(0.001, durationSeconds - releaseStartSeconds)
    );
  }

  return 1;
}

function advancePhase(currentPhase: number, phaseIncrement: number): number {
  const nextPhase = currentPhase + phaseIncrement;
  return nextPhase >= Math.PI * 2 ? nextPhase % (Math.PI * 2) : nextPhase;
}

function normalizeSamples(samples: Float32Array): void {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index] ?? 0));
  }
  if (peak <= 0) {
    return;
  }
  const multiplier = 0.92 / peak;
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.max(
      -1,
      Math.min(1, (samples[index] ?? 0) * multiplier)
    );
  }
}
