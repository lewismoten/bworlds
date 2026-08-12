import { clamp } from '@bworlds/core';
import { MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS } from './audio-budget.ts';
import type { InstrumentFamily } from './music-instrument-timbres.ts';
import { resolveSoundBankDebugPreviewDecayMs } from './sound-bank-debug-preview-envelope.ts';
import type { AudioCategory } from './audio-categories.ts';
import {
  resolveMusicEqStages,
  resolveMusicStereoPan,
} from './procedural-music-mix.ts';
import type { MusicSink } from './procedural-music.ts';
import type { MusicSpaceProfile } from './procedural-music-space.ts';

type MusicPosition = { x: number; y: number };

type MusicSinkOptions = {
  getCategoryVolume?: (category: AudioCategory) => number;
};

type AudioContextCtor = new () => AudioContext;
type StereoPannerNodeLike = StereoPannerNode;
type BiquadFilterNodeLike = BiquadFilterNode;
type DelayNodeLike = DelayNode;
type AudioBufferSourceNodeLike = AudioBufferSourceNode;

type SharedReverbBus = {
  send: GainNode;
  delay?: DelayNodeLike | null;
  tone?: BiquadFilterNodeLike | null;
  output: GainNode;
};

type ActiveMusicVoice = {
  loudness: number;
  startedAt: number;
  oscillator: OscillatorNode;
  harmonicOscillator: OscillatorNode;
  vibratoOscillator: OscillatorNode | null;
  vibratoDepthGain: GainNode | null;
  transientSource: AudioBufferSourceNodeLike | null;
  transientGain: GainNode | null;
  transientFilter: BiquadFilterNodeLike | null;
  gain: GainNode;
  harmonicGain: GainNode;
  noiseSource: AudioBufferSourceNodeLike | null;
  noiseGain: GainNode | null;
  noiseFilter: BiquadFilterNodeLike | null;
  reverbSend: GainNode;
  timbreFilter: BiquadFilterNodeLike | null;
  eqFilters: BiquadFilterNodeLike[];
  panner: StereoPannerNodeLike | null;
  remainingOscillators: number;
};

const MIN_VIBRATO_DURATION_MS = 360;

type MusicVibratoProfile = Readonly<{
  rateHz: number;
  depthCents: number;
  leadInSeconds: number;
  fadeOutSeconds: number;
}>;

export function createWebAudioMusicSink(
  options: MusicSinkOptions = {}
): MusicSink {
  let audioContext: AudioContext | null = null;
  let activeSourceCount = 0;
  let masterGain = 1;
  let muted = false;
  let outputGainNode: GainNode | null = null;
  let sharedNoiseBuffer: AudioBuffer | null = null;
  const activeVoices = new Set<ActiveMusicVoice>();
  const sharedReverbBuses = new Map<string, SharedReverbBus>();

  function resolveAudioContextCtor(): AudioContextCtor | null {
    const globalCtor = globalThis as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const ContextCtor =
      globalCtor.AudioContext ?? globalCtor.webkitAudioContext;
    return ContextCtor ?? null;
  }

  function getAudioContext(): AudioContext | null {
    if (audioContext) {
      return audioContext;
    }
    const ContextCtor = resolveAudioContextCtor();
    if (!ContextCtor) {
      return null;
    }
    audioContext = new ContextCtor();
    return audioContext;
  }

  function getResolvedMasterGain(): number {
    return muted ? 0 : masterGain;
  }

  function updateOutputGainNode(context: AudioContext): void {
    outputGainNode?.gain.setValueAtTime(
      getResolvedMasterGain(),
      context.currentTime
    );
  }

  function getOutputGainNode(context: AudioContext): GainNode {
    if (outputGainNode) {
      updateOutputGainNode(context);
      return outputGainNode;
    }
    outputGainNode = context.createGain();
    outputGainNode.gain.setValueAtTime(
      getResolvedMasterGain(),
      context.currentTime
    );
    outputGainNode.connect(context.destination);
    return outputGainNode;
  }

  function removeVoice(voice: ActiveMusicVoice): void {
    if (!activeVoices.delete(voice)) {
      return;
    }
    activeSourceCount = Math.max(
      0,
      activeSourceCount - voice.remainingOscillators
    );
    voice.oscillator.onended = null;
    voice.harmonicOscillator.onended = null;
    if (voice.vibratoOscillator) {
      voice.vibratoOscillator.onended = null;
    }
    voice.oscillator.disconnect?.();
    voice.harmonicOscillator.disconnect?.();
    voice.vibratoOscillator?.disconnect?.();
    voice.vibratoDepthGain?.disconnect?.();
    voice.transientSource?.disconnect?.();
    voice.transientGain?.disconnect?.();
    voice.transientFilter?.disconnect?.();
    voice.gain.disconnect?.();
    voice.harmonicGain.disconnect?.();
    voice.noiseSource?.disconnect?.();
    voice.noiseGain?.disconnect?.();
    voice.noiseFilter?.disconnect?.();
    voice.reverbSend.disconnect?.();
    voice.timbreFilter?.disconnect?.();
    voice.eqFilters.forEach((filter) => filter.disconnect?.());
    voice.panner?.disconnect?.();
  }

  function handleVoiceOscillatorEnded(voice: ActiveMusicVoice): void {
    if (!activeVoices.has(voice)) {
      return;
    }
    voice.remainingOscillators = Math.max(0, voice.remainingOscillators - 1);
    activeSourceCount = Math.max(0, activeSourceCount - 1);
    if (voice.remainingOscillators === 0) {
      removeVoice(voice);
    }
  }

  function stopVoice(
    voice: ActiveMusicVoice,
    stopAt = audioContext?.currentTime ?? 0
  ): void {
    voice.oscillator.onended = null;
    voice.harmonicOscillator.onended = null;
    if (voice.vibratoOscillator) {
      voice.vibratoOscillator.onended = null;
    }
    try {
      voice.oscillator.stop(stopAt);
    } catch {
      // Ignore duplicate stop calls while pruning voices.
    }
    try {
      voice.harmonicOscillator.stop(stopAt);
    } catch {
      // Ignore duplicate stop calls while pruning voices.
    }
    try {
      voice.vibratoOscillator?.stop(stopAt);
    } catch {
      // Ignore duplicate stop calls while pruning voices.
    }
    try {
      voice.transientSource?.stop(stopAt);
    } catch {
      // Ignore duplicate stop calls while pruning voices.
    }
    try {
      voice.noiseSource?.stop(stopAt);
    } catch {
      // Ignore duplicate stop calls while pruning voices.
    }
    removeVoice(voice);
  }

  function enforceMusicOscillatorBudget(
    nextVoiceLoudness: number,
    requiredOscillatorCount: number
  ): boolean {
    if (
      activeSourceCount + requiredOscillatorCount <=
      MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS
    ) {
      return true;
    }

    const weakestVoice = [...activeVoices].reduce<ActiveMusicVoice | null>(
      (weakest, current) => {
        if (!weakest) {
          return current;
        }
        if (current.loudness !== weakest.loudness) {
          return current.loudness < weakest.loudness ? current : weakest;
        }
        return current.startedAt < weakest.startedAt ? current : weakest;
      },
      null
    );
    if (!weakestVoice || nextVoiceLoudness <= weakestVoice.loudness) {
      return false;
    }

    stopVoice(weakestVoice);
    return (
      activeSourceCount + requiredOscillatorCount <=
      MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS
    );
  }

  function disposeSharedReverbBuses(): void {
    for (const bus of sharedReverbBuses.values()) {
      bus.send.disconnect?.();
      bus.delay?.disconnect?.();
      bus.tone?.disconnect?.();
      bus.output.disconnect?.();
    }
    sharedReverbBuses.clear();
  }

  function getSharedNoiseBuffer(context: AudioContext): AudioBuffer | null {
    if (sharedNoiseBuffer) {
      return sharedNoiseBuffer;
    }
    if (typeof context.createBuffer !== 'function') {
      return null;
    }
    const frameCount = Math.max(1, Math.round(context.sampleRate));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    sharedNoiseBuffer = buffer;
    return sharedNoiseBuffer;
  }

  return {
    getAudioState() {
      if (audioContext) {
        return audioContext.state;
      }
      return resolveAudioContextCtor() ? 'idle' : 'unavailable';
    },
    getAudioSampleRate() {
      return audioContext?.sampleRate ?? null;
    },
    getOutputLatencySeconds() {
      const latency = audioContext?.outputLatency;
      return typeof latency === 'number' && Number.isFinite(latency)
        ? Math.max(0, latency)
        : null;
    },
    getMasterGain() {
      return masterGain;
    },
    setMasterGain(value) {
      masterGain = clamp(value, 0, 1);
      if (audioContext) {
        updateOutputGainNode(audioContext);
      }
      return masterGain;
    },
    isMuted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (audioContext) {
        updateOutputGainNode(audioContext);
      }
      return muted;
    },
    resume() {
      const context = getAudioContext();
      if (!context || context.state === 'running') {
        return;
      }
      void context.resume();
    },
    play(note) {
      const context = getAudioContext();
      if (!context) {
        return;
      }
      const categoryVolume = clamp(
        options.getCategoryVolume?.('music') ?? 1,
        0,
        1
      );
      if (categoryVolume <= 0) {
        return;
      }
      const nowMs = performance.now();
      const spatial = getMusicSpatialMix(note.emitter, note.listener);
      const resolvedPan = resolveMusicStereoPan(note, spatial.pan);
      const space = note.space ?? null;
      const startAt =
        context.currentTime + Math.max(0, (note.startMs - nowMs) / 1000);
      const durationSeconds = note.durationMs / 1000;
      const attackSeconds = Math.max(0.001, note.attackMs / 1000);
      const pitchSweepDurationSeconds = Math.max(
        0,
        Math.min(
          durationSeconds,
          (note.timbre.pitchSweepDurationMs ?? 0) / 1000
        )
      );
      const pitchSweepMultiplier =
        pitchSweepDurationSeconds > 0
          ? Math.pow(2, (note.timbre.pitchSweepSemitones ?? 0) / 12)
          : 1;
      const sweepStartFrequency = note.frequency * pitchSweepMultiplier;
      const sweepEndAt = startAt + pitchSweepDurationSeconds;
      const fundamentalGainMultiplier = Math.max(
        0,
        note.timbre.fundamentalGainMultiplier ?? 1
      );
      const bodySustainLevel = clamp(
        note.timbre.bodySustainLevel ?? 0.74,
        0.5,
        1
      );
      const harmonicBodyLevel = clamp(
        note.timbre.harmonicBodyLevel ?? Math.max(0.5, bodySustainLevel - 0.06),
        0.2,
        1
      );
      const harmonicReleaseLeadSeconds = Math.max(
        0,
        (note.timbre.harmonicReleaseLeadMs ?? 0) / 1000
      );
      const attackPeakGainMultiplier = Math.max(
        1,
        note.timbre.attackPeakGainMultiplier ?? 1
      );
      const decaySeconds = resolveSoundBankDebugPreviewDecayMs(note) / 1000;
      const bodySettleAt =
        startAt + Math.min(durationSeconds, attackSeconds + decaySeconds);
      const harmonicReleaseStartAt =
        startAt +
        Math.max(
          bodySettleAt - startAt,
          durationSeconds - note.releaseMs / 1000 - harmonicReleaseLeadSeconds
        );
      const vibratoProfile = resolveMusicVibratoProfile(note.family);
      const sustainVolume =
        note.volume * categoryVolume * spatial.gainMultiplier;
      const vibratoOscillatorCount = shouldUseMusicVibrato(
        note.durationMs,
        note.role,
        vibratoProfile
      )
        ? 1
        : 0;
      if (
        !enforceMusicOscillatorBudget(sustainVolume, 2 + vibratoOscillatorCount)
      ) {
        return;
      }
      const oscillator = context.createOscillator();
      const harmonicOscillator = context.createOscillator();
      const vibratoOscillator =
        vibratoOscillatorCount > 0 ? context.createOscillator() : null;
      const vibratoDepthGain =
        vibratoOscillatorCount > 0 ? context.createGain() : null;
      const transientMix = Math.max(0, note.timbre.transientMix ?? 0);
      const transientGain = transientMix > 0 ? context.createGain() : null;
      const transientFilter =
        transientMix > 0 && typeof context.createBiquadFilter === 'function'
          ? (context.createBiquadFilter() as BiquadFilterNodeLike)
          : null;
      const transientSource =
        transientMix > 0 && typeof context.createBufferSource === 'function'
          ? (context.createBufferSource() as AudioBufferSourceNodeLike)
          : null;
      const gain = context.createGain();
      const harmonicGain = context.createGain();
      const noiseMix = Math.max(0, note.timbre.noiseMix ?? 0);
      const noiseGain = noiseMix > 0 ? context.createGain() : null;
      const noiseFilter =
        noiseMix > 0 && typeof context.createBiquadFilter === 'function'
          ? (context.createBiquadFilter() as BiquadFilterNodeLike)
          : null;
      const noiseSource =
        noiseMix > 0 && typeof context.createBufferSource === 'function'
          ? (context.createBufferSource() as AudioBufferSourceNodeLike)
          : null;
      const timbreFilter =
        typeof context.createBiquadFilter === 'function'
          ? (context.createBiquadFilter() as BiquadFilterNodeLike)
          : null;
      const eqFilters =
        typeof context.createBiquadFilter === 'function'
          ? resolveMusicEqStages(note).map(
              () => context.createBiquadFilter() as BiquadFilterNodeLike
            )
          : [];
      const panner =
        typeof context.createStereoPanner === 'function'
          ? (context.createStereoPanner() as StereoPannerNodeLike)
          : null;
      const reverbSend = context.createGain();
      const outputGain = getOutputGainNode(context);

      oscillator.type = note.waveform;
      oscillator.frequency.setValueAtTime(sweepStartFrequency, startAt);
      oscillator.detune.setValueAtTime(note.detuneCents, startAt);
      harmonicOscillator.type = note.timbre.harmonicWaveform;
      harmonicOscillator.frequency.setValueAtTime(
        sweepStartFrequency * note.timbre.harmonicRatio,
        startAt
      );
      harmonicOscillator.detune.setValueAtTime(note.detuneCents * 0.5, startAt);
      if (vibratoOscillator && vibratoDepthGain && vibratoProfile) {
        const vibratoLeadInAt = Math.min(
          startAt + durationSeconds,
          startAt +
            Math.min(
              Math.max(attackSeconds * 1.4, vibratoProfile.leadInSeconds),
              Math.max(0.06, durationSeconds * 0.3)
            )
        );
        const vibratoFadeOutAt = Math.max(
          vibratoLeadInAt,
          startAt + durationSeconds - vibratoProfile.fadeOutSeconds
        );
        vibratoOscillator.type = 'sine';
        vibratoOscillator.frequency.setValueAtTime(
          vibratoProfile.rateHz,
          startAt
        );
        vibratoDepthGain.gain.setValueAtTime(0, startAt);
        rampAudioParamToValue(
          vibratoDepthGain.gain,
          vibratoProfile.depthCents,
          vibratoLeadInAt
        );
        vibratoDepthGain.gain.setValueAtTime(
          vibratoProfile.depthCents,
          vibratoFadeOutAt
        );
        rampAudioParamToValue(
          vibratoDepthGain.gain,
          0,
          startAt + durationSeconds
        );
      }
      if (pitchSweepDurationSeconds > 0) {
        oscillator.frequency.exponentialRampToValueAtTime(
          note.frequency,
          sweepEndAt
        );
        harmonicOscillator.frequency.exponentialRampToValueAtTime(
          note.frequency * note.timbre.harmonicRatio,
          sweepEndAt
        );
      }
      oscillator.frequency.exponentialRampToValueAtTime(
        note.frequency * (0.985 + note.pulseRate * 0.002),
        startAt + durationSeconds
      );
      harmonicOscillator.frequency.exponentialRampToValueAtTime(
        note.frequency *
          note.timbre.harmonicRatio *
          (0.992 + note.pulseRate * 0.001),
        startAt + durationSeconds
      );
      gain.gain.setValueAtTime(0.0001, startAt);
      harmonicGain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(
        sustainVolume * fundamentalGainMultiplier * attackPeakGainMultiplier,
        startAt + attackSeconds
      );
      harmonicGain.gain.exponentialRampToValueAtTime(
        sustainVolume * note.harmonicGain * attackPeakGainMultiplier,
        startAt + attackSeconds
      );
      gain.gain.exponentialRampToValueAtTime(
        sustainVolume * fundamentalGainMultiplier * bodySustainLevel,
        bodySettleAt
      );
      harmonicGain.gain.exponentialRampToValueAtTime(
        sustainVolume * note.harmonicGain * harmonicBodyLevel,
        bodySettleAt
      );
      gain.gain.exponentialRampToValueAtTime(
        sustainVolume * fundamentalGainMultiplier * bodySustainLevel,
        startAt +
          Math.max(
            durationSeconds - note.releaseMs / 1000,
            bodySettleAt - startAt
          )
      );
      harmonicGain.gain.exponentialRampToValueAtTime(
        sustainVolume * note.harmonicGain * harmonicBodyLevel,
        harmonicReleaseStartAt
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);
      harmonicGain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + durationSeconds
      );
      if (transientGain) {
        const transientDurationSeconds = Math.max(
          0.008,
          Math.min(
            durationSeconds,
            (note.timbre.transientDurationMs ?? 24) / 1000
          )
        );
        transientGain.gain.setValueAtTime(0.0001, startAt);
        transientGain.gain.exponentialRampToValueAtTime(
          sustainVolume * transientMix,
          startAt + Math.min(0.006, transientDurationSeconds * 0.35)
        );
        transientGain.gain.exponentialRampToValueAtTime(
          0.0001,
          startAt + transientDurationSeconds
        );
      }
      if (noiseGain) {
        noiseGain.gain.setValueAtTime(0.0001, startAt);
        const noiseBurstRate = Math.max(0, note.timbre.noiseBurstRate ?? 0);
        if (noiseBurstRate <= 0) {
          noiseGain.gain.exponentialRampToValueAtTime(
            sustainVolume * noiseMix * attackPeakGainMultiplier,
            startAt + Math.max(0.01, attackSeconds * 0.75)
          );
          noiseGain.gain.exponentialRampToValueAtTime(
            sustainVolume * noiseMix * bodySustainLevel,
            bodySettleAt
          );
          noiseGain.gain.exponentialRampToValueAtTime(
            sustainVolume * noiseMix * Math.max(0.45, bodySustainLevel - 0.12),
            startAt +
              Math.max(
                durationSeconds - note.releaseMs / 1000,
                bodySettleAt - startAt
              )
          );
          noiseGain.gain.exponentialRampToValueAtTime(
            0.0001,
            startAt + durationSeconds
          );
        } else {
          const noiseBurstDepth = clamp(
            note.timbre.noiseBurstDepth ?? 0.75,
            0,
            1
          );
          const burstPeriodSeconds = 1 / noiseBurstRate;
          for (
            let burstStartSeconds = 0;
            burstStartSeconds < durationSeconds;
            burstStartSeconds += burstPeriodSeconds
          ) {
            const burstStartAt = startAt + burstStartSeconds;
            const burstPeakAt = Math.min(
              startAt + durationSeconds,
              burstStartAt + Math.min(0.01, burstPeriodSeconds * 0.24)
            );
            const burstFallAt = Math.min(
              startAt + durationSeconds,
              burstStartAt + Math.min(0.028, burstPeriodSeconds * 0.7)
            );
            const envelopeLevel = resolveBurstNoiseEnvelopeLevel({
              attackSeconds,
              attackPeakGainMultiplier,
              bodySettleSeconds: bodySettleAt - startAt,
              bodySustainLevel,
              durationSeconds,
              releaseSeconds: note.releaseMs / 1000,
              timeSeconds: burstStartSeconds,
            });
            const floorLevel = Math.max(
              0.0001,
              sustainVolume *
                noiseMix *
                envelopeLevel *
                Math.max(0.12, 1 - noiseBurstDepth)
            );
            const peakLevel = Math.max(
              floorLevel,
              sustainVolume * noiseMix * envelopeLevel
            );
            noiseGain.gain.setValueAtTime(floorLevel, burstStartAt);
            noiseGain.gain.exponentialRampToValueAtTime(peakLevel, burstPeakAt);
            noiseGain.gain.exponentialRampToValueAtTime(
              floorLevel,
              burstFallAt
            );
          }
          noiseGain.gain.exponentialRampToValueAtTime(
            0.0001,
            startAt + durationSeconds
          );
        }
      }
      reverbSend.gain.setValueAtTime(space?.wetGain ?? 0, startAt);

      oscillator.connect(gain);
      harmonicOscillator.connect(harmonicGain);
      if (vibratoOscillator && vibratoDepthGain) {
        vibratoOscillator.connect(vibratoDepthGain);
        vibratoDepthGain.connect(oscillator.detune);
        vibratoDepthGain.connect(harmonicOscillator.detune);
      }
      if (transientSource && transientGain) {
        transientSource.buffer = getSharedNoiseBuffer(context);
        transientSource.connect(transientGain);
        if (transientFilter) {
          transientFilter.type = note.timbre.transientFilterType ?? 'highpass';
          transientFilter.frequency.setValueAtTime(
            note.timbre.transientFilterCutoffHz ?? 2_000,
            startAt
          );
          transientFilter.Q.setValueAtTime(
            note.timbre.transientFilterQ ?? 0.8,
            startAt
          );
          transientGain.connect(transientFilter);
        }
      }
      if (noiseSource && noiseGain) {
        noiseSource.buffer = getSharedNoiseBuffer(context);
        noiseSource.loop = true;
        noiseSource.connect(noiseGain);
        if (noiseFilter) {
          noiseFilter.type = note.timbre.noiseFilterType ?? 'highpass';
          noiseFilter.frequency.setValueAtTime(
            note.timbre.noiseFilterCutoffHz ?? 2_400,
            startAt
          );
          noiseFilter.Q.setValueAtTime(
            note.timbre.noiseFilterQ ?? 0.7,
            startAt
          );
          noiseGain.connect(noiseFilter);
        }
      }
      if (timbreFilter) {
        timbreFilter.type = note.timbre.filterType;
        timbreFilter.frequency.setValueAtTime(
          note.timbre.filterCutoffHz,
          startAt
        );
        timbreFilter.Q.setValueAtTime(note.timbre.filterQ, startAt);
        gain.connect(timbreFilter);
        harmonicGain.connect(timbreFilter);
      }

      let outputNode = timbreFilter;
      const eqStages = resolveMusicEqStages(note);
      for (let index = 0; index < eqStages.length; index += 1) {
        const stage = eqStages[index]!;
        const filter = eqFilters[index]!;
        filter.type = stage.type;
        filter.frequency.setValueAtTime(stage.frequencyHz, startAt);
        filter.Q.setValueAtTime(stage.q, startAt);
        if (outputNode) {
          outputNode.connect(filter);
        } else {
          gain.connect(filter);
          harmonicGain.connect(filter);
        }
        outputNode = filter;
      }

      if (panner) {
        panner.pan.setValueAtTime(resolvedPan, startAt);
        if (outputNode) {
          outputNode.connect(panner);
          outputNode.connect(reverbSend);
        } else {
          gain.connect(panner);
          harmonicGain.connect(panner);
          gain.connect(reverbSend);
          harmonicGain.connect(reverbSend);
        }
        if (transientFilter) {
          transientFilter.connect(panner);
        } else if (transientGain) {
          transientGain.connect(panner);
        }
        if (noiseFilter) {
          noiseFilter.connect(panner);
          noiseFilter.connect(reverbSend);
        } else if (noiseGain) {
          noiseGain.connect(panner);
          noiseGain.connect(reverbSend);
        }
        panner.connect(outputGain);
      } else {
        if (outputNode) {
          outputNode.connect(outputGain);
          outputNode.connect(reverbSend);
        } else {
          gain.connect(outputGain);
          harmonicGain.connect(outputGain);
          gain.connect(reverbSend);
          harmonicGain.connect(reverbSend);
        }
        if (transientFilter) {
          transientFilter.connect(outputGain);
        } else if (transientGain) {
          transientGain.connect(outputGain);
        }
        if (noiseFilter) {
          noiseFilter.connect(outputGain);
          noiseFilter.connect(reverbSend);
        } else if (noiseGain) {
          noiseGain.connect(outputGain);
          noiseGain.connect(reverbSend);
        }
      }
      if (space) {
        const reverbBus = getSharedReverbBus(
          context,
          sharedReverbBuses,
          space,
          outputGain
        );
        reverbSend.connect(reverbBus.send);
      }

      const voice: ActiveMusicVoice = {
        loudness: sustainVolume,
        startedAt: startAt,
        oscillator,
        harmonicOscillator,
        vibratoOscillator,
        vibratoDepthGain,
        transientSource,
        transientGain,
        transientFilter,
        gain,
        harmonicGain,
        noiseSource,
        noiseGain,
        noiseFilter,
        reverbSend,
        timbreFilter,
        eqFilters,
        panner,
        remainingOscillators: 2 + vibratoOscillatorCount,
      };
      activeVoices.add(voice);
      activeSourceCount += 2 + vibratoOscillatorCount;
      oscillator.onended = () => {
        handleVoiceOscillatorEnded(voice);
      };
      harmonicOscillator.onended = () => {
        handleVoiceOscillatorEnded(voice);
      };
      if (vibratoOscillator) {
        vibratoOscillator.onended = () => {
          handleVoiceOscillatorEnded(voice);
        };
      }
      oscillator.start(startAt);
      harmonicOscillator.start(startAt);
      vibratoOscillator?.start(startAt);
      transientSource?.start(startAt);
      noiseSource?.start(startAt);
      oscillator.stop(startAt + durationSeconds);
      harmonicOscillator.stop(startAt + durationSeconds);
      vibratoOscillator?.stop(startAt + durationSeconds);
      transientSource?.stop(
        startAt +
          Math.max(
            0.008,
            Math.min(
              durationSeconds,
              (note.timbre.transientDurationMs ?? 24) / 1000
            )
          )
      );
      noiseSource?.stop(startAt + durationSeconds);
    },
    stopAll() {
      const context = getAudioContext();
      if (!context) {
        return;
      }
      for (const voice of [...activeVoices]) {
        stopVoice(voice, context.currentTime);
      }
      activeSourceCount = 0;
    },
    dispose() {
      const context = audioContext;
      if (context) {
        for (const voice of [...activeVoices]) {
          stopVoice(voice, context.currentTime);
        }
      }
      activeSourceCount = 0;
      disposeSharedReverbBuses();
      outputGainNode?.disconnect?.();
      outputGainNode = null;
      audioContext = null;
      if (context && context.state !== 'closed') {
        void context.close?.();
      }
    },
    getActiveSourceCount() {
      return activeSourceCount;
    },
  };
}

function getSharedReverbBus(
  context: AudioContext,
  buses: Map<string, SharedReverbBus>,
  profile: MusicSpaceProfile,
  output: GainNode
): SharedReverbBus {
  const cached = buses.get(profile.id);
  if (cached) {
    return cached;
  }

  const send = context.createGain();
  const delay =
    typeof context.createDelay === 'function'
      ? (context.createDelay() as DelayNodeLike)
      : null;
  const tone =
    typeof context.createBiquadFilter === 'function'
      ? (context.createBiquadFilter() as BiquadFilterNodeLike)
      : null;
  const wet = context.createGain();

  wet.gain.setValueAtTime(0.24, context.currentTime);
  if (delay) {
    delay.delayTime.setValueAtTime(profile.delayMs / 1000, context.currentTime);
  }
  if (tone) {
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(profile.toneHz, context.currentTime);
    tone.Q.setValueAtTime(0.7, context.currentTime);
  }

  if (delay && tone) {
    send.connect(delay);
    delay.connect(tone);
    tone.connect(wet);
  } else if (delay) {
    send.connect(delay);
    delay.connect(wet);
  } else if (tone) {
    send.connect(tone);
    tone.connect(wet);
  } else {
    send.connect(wet);
  }

  wet.connect(output);

  const bus = { send, delay, tone, output: wet };
  buses.set(profile.id, bus);
  return bus;
}

export function getMusicSpatialMix(
  emitter?: MusicPosition,
  listener?: MusicPosition
): { gainMultiplier: number; pan: number } {
  if (!emitter || !listener) {
    return { gainMultiplier: 1, pan: 0 };
  }
  const deltaX = emitter.x - listener.x;
  const deltaY = emitter.y - listener.y;
  const distance = Math.hypot(deltaX, deltaY);
  return {
    gainMultiplier: 1 / (1 + distance * 0.45),
    pan: clamp(deltaX / 7, -1, 1),
  };
}

function resolveBurstNoiseEnvelopeLevel(options: {
  attackSeconds: number;
  attackPeakGainMultiplier: number;
  bodySettleSeconds: number;
  bodySustainLevel: number;
  durationSeconds: number;
  releaseSeconds: number;
  timeSeconds: number;
}): number {
  if (options.timeSeconds <= options.attackSeconds) {
    return (
      (options.timeSeconds / Math.max(0.001, options.attackSeconds)) *
      options.attackPeakGainMultiplier
    );
  }
  if (options.timeSeconds <= options.bodySettleSeconds) {
    const settleProgress =
      (options.timeSeconds - options.attackSeconds) /
      Math.max(0.001, options.bodySettleSeconds - options.attackSeconds);
    return (
      options.attackPeakGainMultiplier +
      (options.bodySustainLevel - options.attackPeakGainMultiplier) *
        settleProgress
    );
  }
  const releaseStartSeconds = Math.max(
    options.bodySettleSeconds,
    options.durationSeconds - options.releaseSeconds
  );
  if (options.timeSeconds >= releaseStartSeconds) {
    return Math.max(
      0.12,
      options.bodySustainLevel *
        ((options.durationSeconds - options.timeSeconds) /
          Math.max(0.001, options.durationSeconds - releaseStartSeconds))
    );
  }
  return options.bodySustainLevel;
}

function shouldUseMusicVibrato(
  durationMs: number,
  role: 'lead' | 'harmony' | 'bass' | 'percussion',
  profile: MusicVibratoProfile | null
): boolean {
  return (
    role !== 'percussion' &&
    profile !== null &&
    durationMs >= MIN_VIBRATO_DURATION_MS
  );
}

function resolveMusicVibratoProfile(
  family: InstrumentFamily | undefined
): MusicVibratoProfile | null {
  switch (family) {
    case 'strings':
      return {
        rateHz: 4.8,
        depthCents: 4,
        leadInSeconds: 0.08,
        fadeOutSeconds: 0.09,
      };
    case 'violin':
      return {
        rateHz: 5.2,
        depthCents: 5,
        leadInSeconds: 0.06,
        fadeOutSeconds: 0.08,
      };
    case 'flute':
      return {
        rateHz: 5,
        depthCents: 4.5,
        leadInSeconds: 0.07,
        fadeOutSeconds: 0.08,
      };
    case 'trumpet':
      return {
        rateHz: 5.4,
        depthCents: 4.2,
        leadInSeconds: 0.07,
        fadeOutSeconds: 0.08,
      };
    default:
      return null;
  }
}

function rampAudioParamToValue(
  parameter: AudioParam,
  value: number,
  atTime: number
): void {
  if (typeof parameter.linearRampToValueAtTime === 'function') {
    parameter.linearRampToValueAtTime(value, atTime);
    return;
  }

  parameter.exponentialRampToValueAtTime(Math.max(0.0001, value), atTime);
  if (value === 0) {
    parameter.setValueAtTime(0, atTime);
  }
}
