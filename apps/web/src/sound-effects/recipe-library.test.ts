import { describe, expect, it } from 'vitest';
import { createProceduralSoundEffectGenerator } from '../procedural-sound-effect-generator.ts';
import {
  buildProceduralSoundRecipeId,
  buildProceduralSoundRecipe,
  getSoundIdentityDescriptor,
  SOUND_IDENTITY_DESCRIPTORS,
  type SoundRecipeSurfaceProfile,
} from './recipe-library.ts';

const DEFAULT_SURFACE_PROFILE: SoundRecipeSurfaceProfile = {
  cadenceMs: 310,
  footstepFrequency: 122,
  landingFrequency: 92,
  footstepVolume: 0.045,
  landingVolume: 0.065,
  waveform: 'triangle',
};

describe('sound recipe library', () => {
  it('defines explicit identity descriptors and base recipes for every sound kind', () => {
    for (const [kind, identity] of Object.entries(SOUND_IDENTITY_DESCRIPTORS)) {
      const recipe = buildProceduralSoundRecipe({
        kind: kind as keyof typeof SOUND_IDENTITY_DESCRIPTORS,
        profile: DEFAULT_SURFACE_PROFILE,
        variantOffset: 0,
        resolveAdvancementFrequency: () => 300,
        resolveAmbientSoundFrequency: () => 180,
        resolveInteractionFrequency: () => 128,
        resolveInteractionWaveform: (_tileKind, fallback) => fallback,
        resolvePaddleBoatCalliopeFrequency: () => 520,
        resolveSteamWhistleFrequency: () => 360,
      });

      expect(identity.family.length).toBeGreaterThan(0);
      expect(identity.signature.length).toBeGreaterThan(0);
      expect(recipe.id).toBe(kind);
      expect(recipe.baseFrequency).toBeGreaterThan(0);
      expect(recipe.baseDurationMs).toBeGreaterThan(0);
      expect(recipe.baseVolume).toBeGreaterThan(0);
    }
  });

  it('applies family-specific variation budgets and hard ranges that preserve identity', () => {
    const recipe = buildProceduralSoundRecipe({
      kind: 'combat-magic',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 180,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(recipe.frequencyVariation).toBeGreaterThan(0);
    expect(recipe.durationVariation).toBeGreaterThan(0);
    expect(recipe.volumeVariation).toBeGreaterThan(0);
    expect(recipe.minFrequency).toBeLessThan(recipe.baseFrequency);
    expect(recipe.maxFrequency).toBeGreaterThan(recipe.baseFrequency);
    expect(recipe.minDurationMs).toBeLessThan(recipe.baseDurationMs);
    expect(recipe.maxDurationMs).toBeGreaterThan(recipe.baseDurationMs);
    expect(recipe.minVolume).toBeLessThan(recipe.baseVolume);
    expect(recipe.maxVolume).toBeGreaterThan(recipe.baseVolume);
  });

  it('keeps generated variations inside the family clamps while reusing the same base recipe', () => {
    const generator = createProceduralSoundEffectGenerator();
    const recipe = buildProceduralSoundRecipe({
      kind: 'forest-ambience',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: -8,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const first = generator.generate({
      kind: 'forest-ambience',
      nowMs: 0,
      seed: 11,
      recipe,
    });
    const second = generator.generate({
      kind: 'forest-ambience',
      nowMs: 0,
      seed: 29,
      recipe,
    });

    expect(first.recipeId).toBe('forest-ambience');
    expect(second.recipeId).toBe('forest-ambience');
    expect(first.frequency).toBeGreaterThanOrEqual(recipe.minFrequency ?? 0);
    expect(first.frequency).toBeLessThanOrEqual(
      recipe.maxFrequency ?? Infinity
    );
    expect(second.frequency).toBeGreaterThanOrEqual(recipe.minFrequency ?? 0);
    expect(second.frequency).toBeLessThanOrEqual(
      recipe.maxFrequency ?? Infinity
    );
    expect(first.durationMs).toBeGreaterThanOrEqual(recipe.minDurationMs ?? 0);
    expect(first.durationMs).toBeLessThanOrEqual(
      recipe.maxDurationMs ?? Infinity
    );
    expect(second.durationMs).toBeGreaterThanOrEqual(recipe.minDurationMs ?? 0);
    expect(second.durationMs).toBeLessThanOrEqual(
      recipe.maxDurationMs ?? Infinity
    );
    expect(first.volume).toBeGreaterThanOrEqual(recipe.minVolume ?? 0);
    expect(first.volume).toBeLessThanOrEqual(recipe.maxVolume ?? Infinity);
    expect(second.volume).toBeGreaterThanOrEqual(recipe.minVolume ?? 0);
    expect(second.volume).toBeLessThanOrEqual(recipe.maxVolume ?? Infinity);
    expect(
      first.frequency !== second.frequency ||
        first.durationMs !== second.durationMs ||
        first.volume !== second.volume
    ).toBe(true);
  });

  it('uses narrow oscillator palettes for modulation-heavy identity sounds', () => {
    const steamWhistleRecipe = buildProceduralSoundRecipe({
      kind: 'steam-whistle',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 180,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const advancementRecipe = buildProceduralSoundRecipe({
      kind: 'advancement',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 180,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(steamWhistleRecipe.tremolo?.waveform).toEqual(['triangle', 'sine']);
    expect(steamWhistleRecipe.vibrato?.waveform).toEqual(['sine', 'triangle']);
    expect(advancementRecipe.frequencyModulation?.waveform).toEqual([
      'sine',
      'triangle',
    ]);
  });

  it('builds multiple independently varying layers for ambient identities', () => {
    const generator = createProceduralSoundEffectGenerator();
    const recipe = buildProceduralSoundRecipe({
      kind: 'forest-ambience',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 6,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const first = generator.generate({
      kind: 'forest-ambience',
      nowMs: 0,
      seed: 11,
      recipe,
    });
    const second = generator.generate({
      kind: 'forest-ambience',
      nowMs: 0,
      seed: 29,
      recipe,
    });

    expect(recipe.layers).toHaveLength(2);
    expect(first.layers).toHaveLength(2);
    expect(second.layers).toHaveLength(2);
    expect(first.layers?.map((layer) => layer.id)).toEqual([
      'forest-noise-bed',
      'forest-canopy-rustle',
    ]);
    expect(second.layers?.map((layer) => layer.id)).toEqual([
      'forest-noise-bed',
      'forest-canopy-rustle',
    ]);
    expect(first.layers?.[0]?.frequency).not.toBe(first.layers?.[1]?.frequency);
    expect(first.layers?.[0]?.startOffsetMs).not.toBe(
      first.layers?.[1]?.startOffsetMs
    );
    expect(
      first.layers?.[0]?.frequency !== second.layers?.[0]?.frequency ||
        first.layers?.[0]?.durationMs !== second.layers?.[0]?.durationMs
    ).toBe(true);
    expect(
      first.layers?.[1]?.frequency !== second.layers?.[1]?.frequency ||
        first.layers?.[1]?.durationMs !== second.layers?.[1]?.durationMs
    ).toBe(true);
    expect(first.layers?.[0]?.frequency).not.toBe(
      second.layers?.[1]?.frequency
    );
  });

  it('supports mountain and cave ambience variants with dedicated layer sets', () => {
    const mountainRecipe = buildProceduralSoundRecipe({
      kind: 'mountain-ambience',
      identityVariant: 'stone',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 4,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const caveRecipe = buildProceduralSoundRecipe({
      kind: 'cave-ambience',
      identityVariant: 'underground-wind',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: -2,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(mountainRecipe.id).toBe('mountain-ambience:stone');
    expect(mountainRecipe.layers?.map((layer) => layer.id)).toEqual([
      'mountain-rumble-bed',
      'mountain-rock-shift',
    ]);
    expect(caveRecipe.id).toBe('cave-ambience:underground-wind');
    expect(caveRecipe.layers?.map((layer) => layer.id)).toEqual([
      'cave-wind-bed',
      'cave-whistle-edge',
    ]);
  });

  it('lets related movement sounds inherit the same family identity while keeping different signatures', () => {
    expect(getSoundIdentityDescriptor('footstep').family).toBe('movement');
    expect(getSoundIdentityDescriptor('jump').family).toBe('movement');
    expect(getSoundIdentityDescriptor('landing').family).toBe('movement');
    expect(getSoundIdentityDescriptor('footstep').signature).not.toBe(
      getSoundIdentityDescriptor('landing').signature
    );
  });

  it('builds stable contextual recipe ids for recurring sound signatures', () => {
    expect(buildProceduralSoundRecipeId('footstep', 'cave-floor')).toBe(
      'footstep:cave-floor'
    );
    expect(buildProceduralSoundRecipeId('open', 'stairsUp')).toBe(
      'open:stairsup'
    );
    expect(
      buildProceduralSoundRecipeId('combat-magic', undefined, 'fire')
    ).toBe('combat-magic:fire');
    expect(
      buildProceduralSoundRecipeId('combat-magic', 'tower', 'arcane')
    ).toBe('combat-magic:tower:arcane');
  });
});
