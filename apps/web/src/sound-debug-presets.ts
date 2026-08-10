import { createProceduralSoundEffectGenerator } from './procedural-sound-effect-generator.ts';
import { canRenderProceduralSoundToBuffer } from './procedural-sound-render.ts';
import {
  buildProceduralSoundRecipe,
  getSoundIdentityDescriptor,
} from './sound-effects/recipe-library.ts';
import {
  getSurfaceAudioFamily,
  getSurfaceAudioProfile,
  resolveAmbientSoundFrequency,
  resolvePaddleBoatCalliopeFrequency,
  resolveSteamWhistleFrequency,
} from './sound-effects.ts';
import type {
  ProceduralSoundEffect,
  SoundEffectKind,
  SoundWaveform,
} from './procedural-sound-effect-generator.ts';
import type { ProceduralSoundRecipe } from './procedural-sound-effect-generator.ts';

export type SoundDebugPreset = {
  id: string;
  label: string;
  category: string;
  description: string;
  kind: SoundEffectKind;
  tileKind?: string;
  identityVariant?: string;
  seed: number;
  nowMs: number;
};

export type SoundDebugSnapshot = {
  preset: SoundDebugPreset;
  effect: ProceduralSoundEffect;
  recipe: ProceduralSoundRecipe;
  renderable: boolean;
  details: {
    family: string;
    signature: string;
    recipeId: string;
    tileKind: string;
    identityVariant: string;
  };
};

const proceduralSoundEffectGenerator = createProceduralSoundEffectGenerator();

export const SOUND_DEBUG_PRESETS: readonly SoundDebugPreset[] = [
  {
    id: 'footstep-dirt',
    label: 'Dirt Footstep',
    category: 'Movement',
    description: 'A short dry footfall on compact earth.',
    kind: 'footstep',
    tileKind: 'dirt',
    seed: 14_021,
    nowMs: 0,
  },
  {
    id: 'footstep-bridge',
    label: 'Bridge Footstep',
    category: 'Movement',
    description: 'A woodier step with a lighter, hollow deck response.',
    kind: 'footstep',
    tileKind: 'bridge',
    seed: 14_077,
    nowMs: 0,
  },
  {
    id: 'blocked-forest',
    label: 'Blocked Movement',
    category: 'Movement',
    description:
      'Movement feedback when the player collides with dense terrain.',
    kind: 'blocked',
    tileKind: 'forest',
    seed: 22_510,
    nowMs: 0,
  },
  {
    id: 'open-door',
    label: 'Open Door',
    category: 'Interaction',
    description: 'A quick wooden/mechanical opening gesture for doors.',
    kind: 'open',
    tileKind: 'door',
    seed: 31_305,
    nowMs: 0,
  },
  {
    id: 'close-town',
    label: 'Close Stone Door',
    category: 'Interaction',
    description:
      'A denser closing response against the town stone-floor family.',
    kind: 'close',
    tileKind: 'town',
    seed: 31_321,
    nowMs: 0,
  },
  {
    id: 'thunder-near',
    label: 'Nearby Thunder',
    category: 'Weather',
    description:
      'The brighter near-storm thunder crack used for closer strikes.',
    kind: 'thunder',
    tileKind: 'plains',
    identityVariant: 'near',
    seed: 48_401,
    nowMs: 0,
  },
] as const;

export function buildSoundDebugSnapshot(
  presetId: string = SOUND_DEBUG_PRESETS[0]?.id ?? ''
): SoundDebugSnapshot {
  const preset =
    SOUND_DEBUG_PRESETS.find((entry) => entry.id === presetId) ??
    SOUND_DEBUG_PRESETS[0];
  if (!preset) {
    throw new Error('At least one sound debug preset is required.');
  }

  const profile = getSurfaceAudioProfile(preset.tileKind);
  const recipe = buildProceduralSoundRecipe({
    kind: preset.kind,
    tileKind: preset.tileKind,
    identityVariant: preset.identityVariant,
    profile,
    variantOffset: 0,
    resolveAdvancementFrequency,
    resolveAmbientSoundFrequency,
    resolveInteractionFrequency,
    resolveInteractionWaveform,
    resolvePaddleBoatCalliopeFrequency,
    resolveSteamWhistleFrequency,
  });
  const effect = proceduralSoundEffectGenerator.generate({
    kind: preset.kind,
    nowMs: preset.nowMs,
    seed: preset.seed,
    recipe,
  });
  const identity = getSoundIdentityDescriptor(preset.kind);

  return {
    preset,
    effect,
    recipe,
    renderable: canRenderProceduralSoundToBuffer(effect),
    details: {
      family: identity.family,
      signature: identity.signature,
      recipeId: recipe.id,
      tileKind: preset.tileKind ?? 'n/a',
      identityVariant: preset.identityVariant ?? 'base',
    },
  };
}

function resolveInteractionFrequency(
  event: 'open' | 'close',
  tileKind: string | undefined,
  profile: ReturnType<typeof getSurfaceAudioProfile>,
  variantOffset: number
): number {
  const family = getSurfaceAudioFamily(tileKind);
  const base =
    tileKind === 'door' || family === 'wood'
      ? 212
      : tileKind === 'cave-floor' || family === 'rock'
        ? 134
        : family === 'stone-floor'
          ? 184
          : 166;

  return event === 'open'
    ? base + 18 + variantOffset * 0.5
    : base - 14 + variantOffset * 0.35 + profile.landingFrequency * 0.08;
}

function resolveInteractionWaveform(
  tileKind: string | undefined,
  fallback: SoundWaveform
): SoundWaveform {
  const family = getSurfaceAudioFamily(tileKind);
  if (tileKind === 'door' || family === 'wood') {
    return 'square';
  }
  if (tileKind === 'cave-floor' || family === 'rock') {
    return 'triangle';
  }
  return fallback;
}

function resolveAdvancementFrequency(level?: number): number {
  const normalizedLevel = Math.max(1, Math.min(99, Math.round(level ?? 1)));
  return 300 + Math.min(18, normalizedLevel - 1) * 12;
}
