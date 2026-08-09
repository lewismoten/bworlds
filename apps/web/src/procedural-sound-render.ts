import { appendHashSeedPart } from '@bworlds/core';
import { createProceduralNoiseSamples } from './procedural-sound-noise.ts';
import type {
  ProceduralAmplitudeEnvelope,
  ProceduralNoiseColor,
  ProceduralSoundEffect,
  ProceduralSoundEffectLayer,
  SoundWaveform,
} from './procedural-sound-effect-generator.ts';

const DEFAULT_RENDER_ENVELOPE: ProceduralAmplitudeEnvelope = {
  attackMs: 4,
  decayMs: 24,
  sustainLevel: 0.4,
  releaseMs: 24,
};

type RenderableSoundComponent = Pick<
  ProceduralSoundEffect,
  | 'durationMs'
  | 'envelope'
  | 'frequency'
  | 'noiseColor'
  | 'seed'
  | 'startOffsetMs'
  | 'volume'
  | 'waveform'
>;

type RenderableSoundSourceComponent = RenderableSoundComponent &
  Pick<
    ProceduralSoundEffect,
    | 'delay'
    | 'distortion'
    | 'filters'
    | 'frequencyModulation'
    | 'pitchEnvelope'
    | 'reverb'
    | 'ringModulation'
    | 'sweeps'
    | 'tremolo'
    | 'vibrato'
  >;

export function canRenderProceduralSoundToBuffer(
  effect: ProceduralSoundEffect
): boolean {
  return collectRenderableComponents(effect).every(isRenderableSoundComponent);
}

export function buildRenderedProceduralSoundBufferKey(
  effect: ProceduralSoundEffect,
  sampleRate: number
): string {
  return JSON.stringify({
    sampleRate,
    components: collectRenderableComponents(effect).map((component) => ({
      durationMs: component.durationMs,
      envelope: component.envelope ?? null,
      frequency: component.frequency,
      noiseColor: component.noiseColor ?? null,
      seed: component.seed ?? 0,
      volume: component.volume,
      waveform: component.waveform,
    })),
  });
}

export function renderProceduralSoundToBufferData(
  effect: ProceduralSoundEffect,
  sampleRate: number
): Float32Array {
  const components = collectRenderableComponents(effect);
  const frameCount = resolveRenderedSoundFrameCount(effect, sampleRate);
  const mixed = new Float32Array(frameCount);

  components.forEach((component, index) => {
    const componentStartFrame = Math.max(
      0,
      Math.round(((component.startOffsetMs ?? 0) / 1000) * sampleRate)
    );
    const componentFrameCount = Math.max(
      1,
      Math.ceil((component.durationMs / 1000) * sampleRate)
    );
    const componentSamples = component.noiseColor
      ? createProceduralNoiseSamples({
          color: component.noiseColor as ProceduralNoiseColor,
          frameCount: componentFrameCount,
          seed: appendHashSeedPart(component.seed ?? 0, index + 1),
        })
      : renderWaveformSamples(component, componentFrameCount, sampleRate);

    for (
      let frame = 0;
      frame < componentFrameCount && componentStartFrame + frame < mixed.length;
      frame += 1
    ) {
      const envelopeGain = resolveEnvelopeGain(
        component.envelope ?? DEFAULT_RENDER_ENVELOPE,
        frame / sampleRate,
        component.durationMs / 1000
      );
      mixed[componentStartFrame + frame]! +=
        componentSamples[frame]! * component.volume * envelopeGain;
    }
  });

  for (let index = 0; index < mixed.length; index += 1) {
    mixed[index] = clampValue(mixed[index] ?? 0, -1, 1);
  }

  return mixed;
}

export function resolveRenderedSoundFrameCount(
  effect: ProceduralSoundEffect,
  sampleRate: number
): number {
  return Math.max(
    1,
    ...collectRenderableComponents(effect).map((component) => {
      const startOffsetMs = component.startOffsetMs ?? 0;
      return Math.ceil(
        ((startOffsetMs + component.durationMs) / 1000) * sampleRate
      );
    })
  );
}

function collectRenderableComponents(
  effect: ProceduralSoundEffect
): RenderableSoundSourceComponent[] {
  const components: RenderableSoundSourceComponent[] = [effect];
  const layerCount = effect.layers?.length ?? 0;
  if (layerCount === 0) {
    return components;
  }

  for (let index = 0; index < layerCount; index += 1) {
    const layer = effect.layers?.[index];
    if (!layer) {
      continue;
    }
    components.push(createRenderableLayerComponent(effect, layer, index + 1));
  }

  return components;
}

function isRenderableSoundComponent(
  component: RenderableSoundSourceComponent
): boolean {
  return (
    !('filters' in component && component.filters?.length) &&
    !('distortion' in component && component.distortion) &&
    !('delay' in component && component.delay) &&
    !('reverb' in component && component.reverb) &&
    !('tremolo' in component && component.tremolo) &&
    !('vibrato' in component && component.vibrato) &&
    !('frequencyModulation' in component && component.frequencyModulation) &&
    !('ringModulation' in component && component.ringModulation) &&
    !('pitchEnvelope' in component && component.pitchEnvelope) &&
    !('sweeps' in component && component.sweeps?.length)
  );
}

function createRenderableLayerComponent(
  effect: ProceduralSoundEffect,
  layer: ProceduralSoundEffectLayer,
  seedOffset: number
): RenderableSoundSourceComponent {
  return {
    durationMs: layer.durationMs,
    envelope: layer.envelope ?? effect.envelope,
    frequency: layer.frequency,
    noiseColor: layer.noiseColor,
    seed: appendHashSeedPart(effect.seed ?? 0, seedOffset),
    startOffsetMs: layer.startOffsetMs,
    volume: layer.volume,
    waveform: layer.waveform,
    delay: layer.delay ?? effect.delay,
    distortion: layer.distortion ?? effect.distortion,
    filters: layer.filters ?? effect.filters,
    frequencyModulation:
      layer.frequencyModulation ?? effect.frequencyModulation,
    pitchEnvelope: layer.pitchEnvelope ?? effect.pitchEnvelope,
    reverb: layer.reverb ?? effect.reverb,
    ringModulation: layer.ringModulation ?? effect.ringModulation,
    sweeps: layer.sweeps ?? effect.sweeps,
    tremolo: layer.tremolo ?? effect.tremolo,
    vibrato: layer.vibrato ?? effect.vibrato,
  };
}

function renderWaveformSamples(
  component: RenderableSoundComponent,
  frameCount: number,
  sampleRate: number
): Float32Array {
  const samples = new Float32Array(frameCount);
  let phase = 0;
  const phaseIncrement = (Math.PI * 2 * component.frequency) / sampleRate;

  for (let frame = 0; frame < frameCount; frame += 1) {
    samples[frame] = sampleWaveform(component.waveform, phase);
    phase += phaseIncrement;
    if (phase >= Math.PI * 2) {
      phase %= Math.PI * 2;
    }
  }

  return samples;
}

function resolveEnvelopeGain(
  envelope: ProceduralAmplitudeEnvelope,
  timeSeconds: number,
  durationSeconds: number
): number {
  const minimumGain = 0.0001;
  const attackSeconds = Math.max(0, envelope.attackMs / 1000);
  const decaySeconds = Math.max(0, envelope.decayMs / 1000);
  const releaseSeconds = Math.max(0, envelope.releaseMs / 1000);
  const attackEndAt = Math.min(durationSeconds, attackSeconds);
  const decayEndAt = Math.min(durationSeconds, attackEndAt + decaySeconds);
  const releaseStartAt = Math.max(decayEndAt, durationSeconds - releaseSeconds);

  if (timeSeconds <= 0) {
    return minimumGain;
  }
  if (attackEndAt > 0 && timeSeconds < attackEndAt) {
    return minimumGain + ((1 - minimumGain) * timeSeconds) / attackEndAt;
  }
  if (timeSeconds < decayEndAt && decayEndAt > attackEndAt) {
    const progress = (timeSeconds - attackEndAt) / (decayEndAt - attackEndAt);
    return 1 + (envelope.sustainLevel - 1) * progress;
  }
  if (timeSeconds < releaseStartAt) {
    return envelope.sustainLevel;
  }
  if (timeSeconds < durationSeconds && durationSeconds > releaseStartAt) {
    const progress =
      (timeSeconds - releaseStartAt) / (durationSeconds - releaseStartAt);
    return (
      envelope.sustainLevel + (minimumGain - envelope.sustainLevel) * progress
    );
  }
  return minimumGain;
}

function sampleWaveform(waveform: SoundWaveform, phase: number): number {
  switch (waveform) {
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'sawtooth':
      return phase / Math.PI - 1;
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'sine':
    default:
      return Math.sin(phase);
  }
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
