import {
  resolveAmbientIdentityVariantModifiers,
  resolveAmbientIdentityVariants,
} from './ambient-presets.ts';
import { createProceduralSoundEffectGenerator } from './procedural-sound-effect-generator.ts';
import { renderProceduralSoundToBufferData } from './procedural-sound-render.ts';
import { buildSoundDebugWaveformMarkup } from './sound-debug-waveform.ts';
import {
  buildProceduralSoundRecipe,
  getSoundIdentityDescriptor,
} from './sound-effects/recipe-library.ts';
import {
  getSurfaceAudioProfile,
  resolveAmbientSoundFrequency,
  resolvePaddleBoatCalliopeFrequency,
  resolveSteamWhistleFrequency,
} from './sound-effects.ts';
import type { NearbyAmbientKind } from './nearby-ambient.ts';
import type {
  ProceduralSoundEffect,
  SoundEffectKind,
  SoundWaveform,
} from './procedural-sound-effect-generator.ts';

const AMBIENCE_DEBUG_SAMPLE_RATE = 48_000;
const AMBIENCE_DEBUG_DURATION_MS = 60_000;

type AmbientDayPhase = 'dawn' | 'day' | 'dusk' | 'night';
type AmbientSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export type AmbienceDebugPreset = {
  id: string;
  label: string;
  description: string;
  kind: NearbyAmbientKind;
  tileKind: string;
  dayPhase: AmbientDayPhase;
  season: AmbientSeason;
  seed: number;
};

export type AmbienceDebugCue = {
  id: string;
  identityVariant: string;
  effect: ProceduralSoundEffect;
  samples: Float32Array;
  cadenceMultiplier: number;
  volumeMultiplier: number;
  signature: string;
};

export type AmbienceDebugSnapshot = {
  preset: AmbienceDebugPreset;
  cues: AmbienceDebugCue[];
  minuteMixSamples: Float32Array;
  sampleRate: number;
};

const generator = createProceduralSoundEffectGenerator();

export const AMBIENCE_DEBUG_PRESETS: readonly AmbienceDebugPreset[] = [
  {
    id: 'plains-day',
    label: 'Plains Day',
    description: 'Open grassland with insects and layered bird activity.',
    kind: 'plains',
    tileKind: 'plains',
    dayPhase: 'day',
    season: 'summer',
    seed: 61_201,
  },
  {
    id: 'desert-day',
    label: 'Desert Day',
    description: 'Wind-driven dunes with sand movement and sparse wildlife.',
    kind: 'desert',
    tileKind: 'desert',
    dayPhase: 'day',
    season: 'spring',
    seed: 61_233,
  },
  {
    id: 'swamp-day',
    label: 'Swamp Day',
    description: 'Wet marsh layers with insects, movement, and bubbling water.',
    kind: 'swamp',
    tileKind: 'swamp',
    dayPhase: 'day',
    season: 'summer',
    seed: 61_277,
  },
  {
    id: 'snowfield-day',
    label: 'Snowfield Day',
    description: 'Cold open quiet punctuated by gusts and muffled movement.',
    kind: 'snowfield',
    tileKind: 'snow',
    dayPhase: 'day',
    season: 'winter',
    seed: 61_319,
  },
  {
    id: 'observatory-night',
    label: 'Observatory Night',
    description:
      'Unnatural skyward resonance with crystalline chimes and distant arcane drift.',
    kind: 'magical',
    tileKind: 'observatory',
    dayPhase: 'night',
    season: 'winter',
    seed: 61_361,
  },
] as const;

export function buildAmbienceDebugSnapshot(
  presetId: string = AMBIENCE_DEBUG_PRESETS[0]?.id ?? ''
): AmbienceDebugSnapshot {
  const preset =
    AMBIENCE_DEBUG_PRESETS.find((entry) => entry.id === presetId) ??
    AMBIENCE_DEBUG_PRESETS[0];
  if (!preset) {
    throw new Error('At least one ambiance debug preset is required.');
  }

  const effectKind = resolveAmbientEffectKind(preset.kind);
  const variants = resolveAmbientIdentityVariants(
    preset.kind,
    preset.dayPhase,
    preset.season
  );
  const cues = variants.map((identityVariant, cueIndex) => {
    const profile = getSurfaceAudioProfile(preset.tileKind);
    const recipe = buildProceduralSoundRecipe({
      kind: effectKind,
      tileKind: preset.tileKind,
      identityVariant,
      profile,
      variantOffset: 0,
      resolveAdvancementFrequency,
      resolveAmbientSoundFrequency,
      resolveInteractionFrequency,
      resolveInteractionWaveform,
      resolvePaddleBoatCalliopeFrequency,
      resolveSteamWhistleFrequency,
    });
    const effect = generator.generate({
      kind: effectKind,
      nowMs: 0,
      seed: preset.seed + cueIndex * 97,
      recipe,
    });
    const modifiers = resolveAmbientIdentityVariantModifiers({
      kind: preset.kind,
      dayPhase: preset.dayPhase,
      season: preset.season,
      identityVariant,
    });
    return {
      id: `${preset.id}:${identityVariant}`,
      identityVariant,
      effect,
      samples: renderProceduralSoundToBufferData(
        effect,
        AMBIENCE_DEBUG_SAMPLE_RATE
      ),
      cadenceMultiplier: modifiers.cadenceMultiplier,
      volumeMultiplier: modifiers.volumeMultiplier,
      signature: getSoundIdentityDescriptor(effect.kind).signature,
    };
  });

  return {
    preset,
    cues,
    minuteMixSamples: buildAmbienceMinuteMix(cues),
    sampleRate: AMBIENCE_DEBUG_SAMPLE_RATE,
  };
}

export function buildAmbienceDebugShellMarkup(
  snapshot: AmbienceDebugSnapshot
): string {
  const presetButtons = AMBIENCE_DEBUG_PRESETS.map((preset) => {
    const active =
      preset.id === snapshot.preset.id ? ' data-active="true"' : '';
    return `
      <button
        type="button"
        class="ambience-debug-preset-button"
        data-preset-id="${preset.id}"${active}
      >
        <strong>${preset.label}</strong>
        <span>${preset.description}</span>
      </button>
    `;
  }).join('');

  const cueCards = snapshot.cues
    .map(
      (cue) => `
        <article class="ambience-debug-cue-card">
          <div>
            <p class="ambience-debug-cue-variant">${cue.identityVariant}</p>
            <h3>${formatCueTitle(cue.identityVariant)}</h3>
            <p>${cue.signature}</p>
          </div>
          <div class="ambience-debug-cue-actions">
            <button type="button" data-cue-play="${cue.id}">Play Cue</button>
            <button type="button" data-cue-download="${cue.id}">Download WAV</button>
          </div>
        </article>
      `
    )
    .join('');

  return `
    <main class="ambience-debug-shell">
      <section class="ambience-debug-hero">
        <p class="ambience-debug-kicker">bworlds</p>
        <h1>Ambience Debug</h1>
        <p class="ambience-debug-lede">
          Preview layered ambient presets, audition each rendered cue, and export a one-minute procedural ambience bed as a WAV file.
        </p>
      </section>
      <section class="ambience-debug-layout">
        <aside class="ambience-debug-sidebar">
          <h2>Ambience Presets</h2>
          <div class="ambience-debug-preset-list" aria-label="Ambience presets">
            ${presetButtons}
          </div>
        </aside>
        <section class="ambience-debug-panel">
          <div class="ambience-debug-panel-head">
            <div>
              <p class="ambience-debug-panel-meta">${snapshot.preset.kind} • ${snapshot.preset.dayPhase} • ${snapshot.preset.season}</p>
              <h2>${snapshot.preset.label}</h2>
              <p>${snapshot.preset.description}</p>
            </div>
            <div class="ambience-debug-actions">
              <button id="ambience-debug-play" type="button">Play Ambience</button>
              <button id="ambience-debug-download-minute" type="button">Download Minute</button>
            </div>
          </div>
          <section class="ambience-debug-waveform" aria-label="Ambience waveform preview">
            ${buildSoundDebugWaveformMarkup(snapshot.minuteMixSamples)}
          </section>
          <section class="ambience-debug-cues" aria-label="Ambience cues">
            <h3>Rendered Cues</h3>
            ${cueCards}
          </section>
        </section>
      </section>
    </main>
  `;
}

export function normalizeAmbienceDebugPresetId(value: unknown): string {
  const presetId = typeof value === 'string' ? value : '';
  return AMBIENCE_DEBUG_PRESETS.some((preset) => preset.id === presetId)
    ? presetId
    : (AMBIENCE_DEBUG_PRESETS[0]?.id ?? '');
}

function buildAmbienceMinuteMix(
  cues: readonly AmbienceDebugCue[]
): Float32Array {
  const frameCount = Math.round(
    (AMBIENCE_DEBUG_DURATION_MS / 1000) * AMBIENCE_DEBUG_SAMPLE_RATE
  );
  const mix = new Float32Array(frameCount);

  cues.forEach((cue, cueIndex) => {
    const intervalMs = Math.max(
      cue.effect.durationMs + 350,
      Math.round(5200 * cue.cadenceMultiplier)
    );
    const gain = Math.max(0.14, Math.min(0.82, cue.volumeMultiplier * 0.42));
    for (
      let startMs = cueIndex * 1100;
      startMs < AMBIENCE_DEBUG_DURATION_MS;
      startMs += intervalMs
    ) {
      const startFrame = Math.round(
        (startMs / 1000) * AMBIENCE_DEBUG_SAMPLE_RATE
      );
      for (
        let sampleIndex = 0;
        sampleIndex < cue.samples.length &&
        startFrame + sampleIndex < mix.length;
        sampleIndex += 1
      ) {
        const nextValue =
          (mix[startFrame + sampleIndex] ?? 0) +
          (cue.samples[sampleIndex] ?? 0) * gain;
        mix[startFrame + sampleIndex] = Math.max(-1, Math.min(1, nextValue));
      }
    }
  });

  return mix;
}

function resolveAmbientEffectKind(kind: NearbyAmbientKind): SoundEffectKind {
  switch (kind) {
    case 'river':
      return 'river-ambience';
    case 'forest':
      return 'forest-ambience';
    case 'plains':
      return 'plains-ambience';
    case 'desert':
      return 'desert-ambience';
    case 'snowfield':
      return 'snowfield-ambience';
    case 'swamp':
      return 'swamp-ambience';
    case 'volcanic':
      return 'volcanic-ambience';
    case 'mountain':
      return 'mountain-ambience';
    case 'cave':
      return 'cave-ambience';
    case 'magical':
      return 'magical-ambience';
    case 'settlement':
      return 'settlement-ambience';
    case 'ruins':
      return 'ruins-ambience';
    case 'ocean':
    default:
      return 'ocean';
  }
}

function resolveInteractionFrequency(
  event: 'open' | 'close',
  _tileKind: string | undefined,
  profile: ReturnType<typeof getSurfaceAudioProfile>,
  variantOffset: number
): number {
  const base = 166;
  return event === 'open'
    ? base + 18 + variantOffset * 0.5
    : base - 14 + variantOffset * 0.35 + profile.landingFrequency * 0.08;
}

function resolveInteractionWaveform(
  _tileKind: string | undefined,
  fallback: SoundWaveform
): SoundWaveform {
  return fallback;
}

function resolveAdvancementFrequency(level?: number): number {
  const normalizedLevel = Math.max(1, Math.min(99, Math.round(level ?? 1)));
  return 300 + Math.min(18, normalizedLevel - 1) * 12;
}

function formatCueTitle(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
