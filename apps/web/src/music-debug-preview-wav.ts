import type { ProceduralMusicNote } from './procedural-music.ts';
import { resolveSoundBankDebugPreviewDecayMs } from './sound-bank-debug-preview-envelope.ts';
import { encodeMonoPcm16Wav } from './wav-file.ts';

const MUSIC_DEBUG_PREVIEW_WAV_SAMPLE_RATE = 48_000;

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
  let previousFilteredNoise = 0;
  const noiseMix = Math.max(0, note.timbre.noiseMix ?? 0);
  const transientMix = Math.max(0, note.timbre.transientMix ?? 0);
  const noiseCoefficient = resolveNoiseFilterCoefficient(
    note.timbre.noiseFilterCutoffHz ?? 2_400,
    sampleRate
  );
  const noiseMode = note.timbre.noiseFilterType ?? 'highpass';
  const transientCoefficient = resolveNoiseFilterCoefficient(
    note.timbre.transientFilterCutoffHz ?? 2_000,
    sampleRate
  );
  const transientMode = note.timbre.transientFilterType ?? 'highpass';

  for (let frame = 0; frame < frameCount; frame += 1) {
    const timeSeconds = frame / sampleRate;
    const pitchSweepMultiplier = resolvePitchSweepFrequencyMultiplier(
      note,
      timeSeconds,
      note.durationMs / 1000
    );
    const carrierPhaseIncrement =
      ((Math.PI * 2 * detunedFrequency) / sampleRate) * pitchSweepMultiplier;
    const harmonicPhaseIncrement =
      ((Math.PI * 2 * harmonicFrequency) / sampleRate) * pitchSweepMultiplier;
    const pulseModulation =
      note.pulseRate > 0
        ? 1 + Math.sin(timeSeconds * note.pulseRate * Math.PI * 2) * 0.08
        : 1;
    const carrier = sampleWaveform(note.waveform, carrierPhase);
    const harmonic = sampleWaveform(
      note.timbre.harmonicWaveform,
      harmonicPhase
    );
    const carrierEnvelopeGain = resolveEnvelopeGain(
      note,
      timeSeconds,
      note.durationMs / 1000
    );
    const harmonicEnvelopeGain = resolveHarmonicEnvelopeGain(
      note,
      timeSeconds,
      note.durationMs / 1000
    );
    const harmonicWeight = Math.max(
      0,
      Math.min(0.65, note.harmonicGain * 0.35)
    );
    const rawNoise = sampleDeterministicNoise(frame);
    const { nextSample, nextFiltered } = filterNoiseSample({
      input: rawNoise,
      previousFiltered: previousFilteredNoise,
      coefficient: noiseCoefficient,
      mode: noiseMode,
    });
    const transientNoise = filterNoiseSample({
      input: sampleDeterministicNoise(frame + 97),
      previousFiltered: previousFilteredNoise,
      coefficient: transientCoefficient,
      mode: transientMode,
    }).nextSample;
    previousFilteredNoise = nextFiltered;
    const transientEnvelopeGain = resolveTransientEnvelopeGain(
      note,
      timeSeconds,
      note.durationMs / 1000
    );
    const noiseBurstGain = resolveNoiseBurstEnvelopeGain(
      note,
      timeSeconds,
      note.durationMs / 1000
    );
    const mixed =
      carrier *
        (1 - harmonicWeight) *
        Math.max(1, note.timbre.fundamentalGainMultiplier ?? 1) *
        carrierEnvelopeGain +
      harmonic * harmonicWeight * pulseModulation * harmonicEnvelopeGain +
      transientNoise * transientMix * transientEnvelopeGain +
      nextSample * noiseMix * carrierEnvelopeGain * noiseBurstGain;
    samples[frame] = mixed * Math.max(0.12, note.volume * 14);
    carrierPhase = advancePhase(carrierPhase, carrierPhaseIncrement);
    harmonicPhase = advancePhase(harmonicPhase, harmonicPhaseIncrement);
  }

  normalizeSamples(samples);
  return samples;
}

export function resolvePitchSweepFrequencyMultiplier(
  note: Pick<ProceduralMusicNote, 'durationMs' | 'timbre'>,
  timeSeconds: number,
  durationSeconds: number
): number {
  const pitchSweepDurationSeconds = Math.max(
    0,
    Math.min(durationSeconds, (note.timbre.pitchSweepDurationMs ?? 0) / 1000)
  );
  if (pitchSweepDurationSeconds <= 0) {
    return 1;
  }
  const pitchSweepSemitones = note.timbre.pitchSweepSemitones ?? 0;
  if (pitchSweepSemitones === 0) {
    return 1;
  }
  const clampedProgress = Math.max(
    0,
    Math.min(1, timeSeconds / pitchSweepDurationSeconds)
  );
  return Math.pow(2, (pitchSweepSemitones * (1 - clampedProgress)) / 12);
}

export function createMusicDebugPreviewWavFile(options: {
  note: ProceduralMusicNote;
  fileName: string;
}): MusicDebugPreviewWavFile {
  const samples = renderMusicDebugPreviewNoteToSamples(options.note);
  return createMusicDebugPreviewWavFileFromSamples({
    samples,
    fileName: options.fileName,
  });
}

export function renderMusicDebugPreviewNotesToSamples(
  notes: readonly ProceduralMusicNote[],
  sampleRate = MUSIC_DEBUG_PREVIEW_WAV_SAMPLE_RATE
): Float32Array {
  if (notes.length === 0) {
    return new Float32Array(1);
  }
  const noteStartMs = Math.min(...notes.map((note) => note.startMs));
  const noteEndMs = Math.max(
    ...notes.map((note) => note.startMs + Math.max(1, note.durationMs))
  );
  const totalDurationMs = Math.max(1, noteEndMs - noteStartMs);
  const totalFrameCount = Math.max(
    1,
    Math.ceil((totalDurationMs / 1000) * sampleRate)
  );
  const mixed = new Float32Array(totalFrameCount);

  for (const note of notes) {
    const rendered = renderMusicDebugPreviewNoteToSamples(note, sampleRate);
    const startFrame = Math.max(
      0,
      Math.round(((note.startMs - noteStartMs) / 1000) * sampleRate)
    );
    for (
      let frameIndex = 0;
      frameIndex < rendered.length && startFrame + frameIndex < mixed.length;
      frameIndex += 1
    ) {
      mixed[startFrame + frameIndex] += rendered[frameIndex] ?? 0;
    }
  }

  normalizeSamples(mixed);
  return mixed;
}

export function createMusicDebugPreviewWavFileForNotes(options: {
  notes: readonly ProceduralMusicNote[];
  fileName: string;
}): MusicDebugPreviewWavFile {
  const samples = renderMusicDebugPreviewNotesToSamples(options.notes);
  return createMusicDebugPreviewWavFileFromSamples({
    samples,
    fileName: options.fileName,
  });
}

function createMusicDebugPreviewWavFileFromSamples(options: {
  samples: Float32Array;
  fileName: string;
}): MusicDebugPreviewWavFile {
  return {
    bytes: encodeMonoPcm16Wav({
      samples: options.samples,
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

export function resolveEnvelopeGain(
  note: Pick<ProceduralMusicNote, 'attackMs' | 'releaseMs' | 'timbre'>,
  timeSeconds: number,
  durationSeconds: number
): number {
  const attackSeconds = Math.max(0.001, note.attackMs / 1000);
  const releaseSeconds = Math.max(0.001, note.releaseMs / 1000);
  const attackPeakGainMultiplier = Math.max(
    1,
    note.timbre.attackPeakGainMultiplier ?? 1
  );
  const bodySustainLevel = Math.max(
    0.5,
    Math.min(1, note.timbre.bodySustainLevel ?? 0.74)
  );
  const decaySeconds = resolveSoundBankDebugPreviewDecayMs(note) / 1000;
  const bodySettleSeconds = Math.min(
    durationSeconds,
    attackSeconds + decaySeconds
  );
  if (timeSeconds <= attackSeconds) {
    return (timeSeconds / attackSeconds) * attackPeakGainMultiplier;
  }

  if (timeSeconds <= bodySettleSeconds) {
    const settleProgress =
      (timeSeconds - attackSeconds) /
      Math.max(0.001, bodySettleSeconds - attackSeconds);
    return (
      attackPeakGainMultiplier +
      (bodySustainLevel - attackPeakGainMultiplier) * settleProgress
    );
  }

  const releaseStartSeconds = Math.max(
    bodySettleSeconds,
    durationSeconds - releaseSeconds
  );
  if (timeSeconds >= releaseStartSeconds) {
    return Math.max(
      0,
      bodySustainLevel *
        ((durationSeconds - timeSeconds) /
          Math.max(0.001, durationSeconds - releaseStartSeconds))
    );
  }

  return bodySustainLevel;
}

export function resolveHarmonicEnvelopeGain(
  note: Pick<ProceduralMusicNote, 'attackMs' | 'releaseMs' | 'timbre'>,
  timeSeconds: number,
  durationSeconds: number
): number {
  const attackSeconds = Math.max(0.001, note.attackMs / 1000);
  const attackPeakGainMultiplier = Math.max(
    1,
    note.timbre.attackPeakGainMultiplier ?? 1
  );
  const harmonicBodyLevel = Math.max(
    0.2,
    Math.min(
      1,
      note.timbre.harmonicBodyLevel ??
        Math.max(0.5, (note.timbre.bodySustainLevel ?? 0.74) - 0.06)
    )
  );
  const decaySeconds = resolveSoundBankDebugPreviewDecayMs(note) / 1000;
  const bodySettleSeconds = Math.min(
    durationSeconds,
    attackSeconds + decaySeconds
  );
  const harmonicReleaseLeadSeconds = Math.max(
    0,
    (note.timbre.harmonicReleaseLeadMs ?? 0) / 1000
  );
  const harmonicReleaseStartSeconds = Math.max(
    bodySettleSeconds,
    durationSeconds -
      Math.max(0.001, note.releaseMs / 1000) -
      harmonicReleaseLeadSeconds
  );

  if (timeSeconds <= attackSeconds) {
    return (timeSeconds / attackSeconds) * attackPeakGainMultiplier;
  }
  if (timeSeconds <= bodySettleSeconds) {
    const settleProgress =
      (timeSeconds - attackSeconds) /
      Math.max(0.001, bodySettleSeconds - attackSeconds);
    return (
      attackPeakGainMultiplier +
      (harmonicBodyLevel - attackPeakGainMultiplier) * settleProgress
    );
  }
  if (timeSeconds >= harmonicReleaseStartSeconds) {
    return Math.max(
      0,
      harmonicBodyLevel *
        ((durationSeconds - timeSeconds) /
          Math.max(0.001, durationSeconds - harmonicReleaseStartSeconds))
    );
  }
  return harmonicBodyLevel;
}

export function resolveTransientEnvelopeGain(
  note: Pick<ProceduralMusicNote, 'timbre'>,
  timeSeconds: number,
  durationSeconds: number
): number {
  const transientDurationSeconds = Math.max(
    0.008,
    Math.min(durationSeconds, (note.timbre.transientDurationMs ?? 0) / 1000)
  );
  if (
    (note.timbre.transientMix ?? 0) <= 0 ||
    timeSeconds > transientDurationSeconds
  ) {
    return 0;
  }
  const peakAt = Math.min(0.006, transientDurationSeconds * 0.35);
  if (timeSeconds <= peakAt) {
    return timeSeconds / Math.max(0.001, peakAt);
  }
  return Math.max(
    0,
    (transientDurationSeconds - timeSeconds) /
      Math.max(0.001, transientDurationSeconds - peakAt)
  );
}

export function resolveNoiseBurstEnvelopeGain(
  note: Pick<ProceduralMusicNote, 'timbre'>,
  timeSeconds: number,
  durationSeconds: number
): number {
  const burstRate = Math.max(0, note.timbre.noiseBurstRate ?? 0);
  if ((note.timbre.noiseMix ?? 0) <= 0 || burstRate <= 0) {
    return 1;
  }
  const burstDepth = Math.max(
    0,
    Math.min(1, note.timbre.noiseBurstDepth ?? 0.75)
  );
  const periodSeconds = 1 / burstRate;
  const cycleProgress =
    (((timeSeconds % periodSeconds) + periodSeconds) % periodSeconds) /
    periodSeconds;
  const pulseShape =
    cycleProgress <= 0.24
      ? cycleProgress / 0.24
      : Math.max(0, 1 - (cycleProgress - 0.24) / 0.46);
  const floorGain = Math.max(0.12, 1 - burstDepth);
  const releaseFadeStartSeconds = Math.max(
    0,
    durationSeconds - Math.min(0.04, periodSeconds)
  );
  const releaseFade =
    timeSeconds <= releaseFadeStartSeconds
      ? 1
      : Math.max(
          0,
          (durationSeconds - timeSeconds) /
            Math.max(0.001, durationSeconds - releaseFadeStartSeconds)
        );
  return (floorGain + pulseShape * burstDepth) * releaseFade;
}

function advancePhase(currentPhase: number, phaseIncrement: number): number {
  const nextPhase = currentPhase + phaseIncrement;
  return nextPhase >= Math.PI * 2 ? nextPhase % (Math.PI * 2) : nextPhase;
}

function sampleDeterministicNoise(frame: number): number {
  const signal = Math.sin((frame + 1) * 12.9898) * 43_758.5453;
  return (signal - Math.floor(signal)) * 2 - 1;
}

function resolveNoiseFilterCoefficient(
  cutoffHz: number,
  sampleRate: number
): number {
  const clampedCutoff = Math.max(80, Math.min(sampleRate * 0.45, cutoffHz));
  return Math.exp((-Math.PI * 2 * clampedCutoff) / sampleRate);
}

function filterNoiseSample(options: {
  input: number;
  previousFiltered: number;
  coefficient: number;
  mode: BiquadFilterType;
}): { nextSample: number; nextFiltered: number } {
  const lowpass =
    (1 - options.coefficient) * options.input +
    options.coefficient * options.previousFiltered;
  if (options.mode === 'lowpass') {
    return { nextSample: lowpass, nextFiltered: lowpass };
  }
  if (options.mode === 'bandpass') {
    return {
      nextSample: (options.input - lowpass) * 0.7,
      nextFiltered: lowpass,
    };
  }
  return {
    nextSample: options.input - lowpass,
    nextFiltered: lowpass,
  };
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
