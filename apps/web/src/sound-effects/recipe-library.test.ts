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

  it('supports swamp ambience variants with wetland-specific layer sets', () => {
    const frogRecipe = buildProceduralSoundRecipe({
      kind: 'swamp-ambience',
      identityVariant: 'frogs',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 3,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const bubbleRecipe = buildProceduralSoundRecipe({
      kind: 'swamp-ambience',
      identityVariant: 'bubbles',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: -1,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(frogRecipe.id).toBe('swamp-ambience:frogs');
    expect(frogRecipe.layers?.map((layer) => layer.id)).toEqual([
      'swamp-frog-bed',
      'swamp-frog-ripples',
    ]);
    expect(bubbleRecipe.id).toBe('swamp-ambience:bubbles');
    expect(bubbleRecipe.layers?.map((layer) => layer.id)).toEqual([
      'swamp-bubble-bed',
      'swamp-bubble-pop',
    ]);
  });

  it('supports surface-aware rain variants for open air, roofs, leaves, and water', () => {
    const openRecipe = buildProceduralSoundRecipe({
      kind: 'rain',
      identityVariant: 'open',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const roofRecipe = buildProceduralSoundRecipe({
      kind: 'rain',
      identityVariant: 'roof',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const leavesRecipe = buildProceduralSoundRecipe({
      kind: 'rain',
      identityVariant: 'leaves',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const waterRecipe = buildProceduralSoundRecipe({
      kind: 'rain',
      identityVariant: 'water',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(openRecipe.id).toBe('rain:open');
    expect(openRecipe.layers?.map((layer) => layer.id)).toEqual([
      'rain-open-bed',
      'rain-open-drops',
    ]);
    expect(roofRecipe.id).toBe('rain:roof');
    expect(roofRecipe.layers?.map((layer) => layer.id)).toEqual([
      'rain-roof-bed',
      'rain-roof-ticks',
    ]);
    expect(leavesRecipe.id).toBe('rain:leaves');
    expect(leavesRecipe.layers?.map((layer) => layer.id)).toEqual([
      'rain-canopy-bed',
      'rain-leaf-drips',
    ]);
    expect(waterRecipe.id).toBe('rain:water');
    expect(waterRecipe.layers?.map((layer) => layer.id)).toEqual([
      'rain-water-bed',
      'rain-water-ripples',
    ]);
  });

  it('supports canopy and crossdraft wind variants for weather-responsive surfaces', () => {
    const canopyRecipe = buildProceduralSoundRecipe({
      kind: 'wind',
      identityVariant: 'canopy',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const crossdraftRecipe = buildProceduralSoundRecipe({
      kind: 'wind',
      identityVariant: 'crossdraft',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(canopyRecipe.id).toBe('wind:canopy');
    expect(canopyRecipe.layers?.map((layer) => layer.id)).toEqual([
      'wind-canopy-bed',
      'wind-leaf-whistle',
    ]);
    expect(crossdraftRecipe.id).toBe('wind:crossdraft');
    expect(crossdraftRecipe.layers?.map((layer) => layer.id)).toEqual([
      'wind-crossdraft-bed',
      'wind-crossdraft-whistle',
    ]);
  });

  it('supports sandstorm and cyclone wind variants for harsh weather', () => {
    const sandstormRecipe = buildProceduralSoundRecipe({
      kind: 'wind',
      identityVariant: 'sandstorm',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const cycloneRecipe = buildProceduralSoundRecipe({
      kind: 'wind',
      identityVariant: 'cyclone',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(sandstormRecipe.id).toBe('wind:sandstorm');
    expect(sandstormRecipe.layers?.map((layer) => layer.id)).toEqual([
      'wind-sandstorm-bed',
      'wind-sand-grit',
    ]);
    expect(cycloneRecipe.id).toBe('wind:cyclone');
    expect(cycloneRecipe.layers?.map((layer) => layer.id)).toEqual([
      'wind-cyclone-bed',
      'wind-cyclone-whirl',
    ]);
  });

  it('supports seasonal storm variants for spring rain, summer thunder, and autumn wind', () => {
    const springRainRecipe = buildProceduralSoundRecipe({
      kind: 'rain',
      identityVariant: 'spring-open',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const summerThunderRecipe = buildProceduralSoundRecipe({
      kind: 'thunder',
      identityVariant: 'summer-overhead',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const autumnWindRecipe = buildProceduralSoundRecipe({
      kind: 'wind',
      identityVariant: 'autumn-stormfront',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(springRainRecipe.id).toBe('rain:spring-open');
    expect(springRainRecipe.layers?.map((layer) => layer.id)).toEqual([
      'rain-spring-bed',
      'rain-spring-squall',
    ]);
    expect(summerThunderRecipe.id).toBe('thunder:summer-overhead');
    expect(summerThunderRecipe.layers?.map((layer) => layer.id)).toEqual([
      'thunder-summer-crack',
      'thunder-summer-rumble',
      'thunder-summer-reflections',
    ]);
    expect(autumnWindRecipe.id).toBe('wind:autumn-stormfront');
    expect(autumnWindRecipe.layers?.map((layer) => layer.id)).toEqual([
      'wind-autumn-gale-bed',
      'wind-autumn-leaf-gust',
    ]);
  });

  it('supports snowstorm and hail variants for winter weather surfaces', () => {
    const flurryRecipe = buildProceduralSoundRecipe({
      kind: 'snowstorm',
      identityVariant: 'flurries',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const whiteoutRecipe = buildProceduralSoundRecipe({
      kind: 'snowstorm',
      identityVariant: 'whiteout',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const hailRoofRecipe = buildProceduralSoundRecipe({
      kind: 'hail',
      identityVariant: 'roof',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const hailSnowRecipe = buildProceduralSoundRecipe({
      kind: 'hail',
      identityVariant: 'snow',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(flurryRecipe.id).toBe('snowstorm:flurries');
    expect(flurryRecipe.layers?.map((layer) => layer.id)).toEqual([
      'snowstorm-flurry-bed',
      'snowstorm-grit',
    ]);
    expect(whiteoutRecipe.id).toBe('snowstorm:whiteout');
    expect(whiteoutRecipe.layers?.map((layer) => layer.id)).toEqual([
      'snowstorm-whiteout-bed',
      'snowstorm-ice-shear',
    ]);
    expect(hailRoofRecipe.id).toBe('hail:roof');
    expect(hailRoofRecipe.layers?.map((layer) => layer.id)).toEqual([
      'hail-roof-bed',
      'hail-roof-pings',
    ]);
    expect(hailSnowRecipe.id).toBe('hail:snow');
    expect(hailSnowRecipe.layers?.map((layer) => layer.id)).toEqual([
      'hail-snow-bed',
      'hail-snow-crunch',
    ]);
  });

  it('supports frozen water and seasonal movement recipe variants', () => {
    const frozenRiverRecipe = buildProceduralSoundRecipe({
      kind: 'river-ambience',
      identityVariant: 'frozen',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const frozenOceanRecipe = buildProceduralSoundRecipe({
      kind: 'ocean',
      identityVariant: 'frozen',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const leafStepRecipe = buildProceduralSoundRecipe({
      kind: 'footstep',
      tileKind: 'forest',
      identityVariant: 'dry-leaves',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const winterLandingRecipe = buildProceduralSoundRecipe({
      kind: 'landing',
      tileKind: 'snow',
      identityVariant: 'winter-snow',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(frozenRiverRecipe.id).toBe('river-ambience:frozen');
    expect(frozenRiverRecipe.layers?.map((layer) => layer.id)).toEqual([
      'river-frozen-bed',
      'river-ice-cracks',
    ]);
    expect(frozenOceanRecipe.id).toBe('ocean:frozen');
    expect(frozenOceanRecipe.layers?.map((layer) => layer.id)).toEqual([
      'ocean-frozen-surge',
      'ocean-ice-shear',
    ]);
    expect(leafStepRecipe.id).toBe('footstep:forest:dry-leaves');
    expect(leafStepRecipe.waveform).toEqual(['triangle', 'square']);
    expect(leafStepRecipe.noiseColor).toEqual(['brown', 'pink']);
    expect(leafStepRecipe.baseFrequency).toBeGreaterThan(
      DEFAULT_SURFACE_PROFILE.footstepFrequency
    );
    expect(winterLandingRecipe.id).toBe('landing:snow:winter-snow');
    expect(winterLandingRecipe.baseFrequency).toBeLessThan(
      DEFAULT_SURFACE_PROFILE.landingFrequency
    );
  });

  it('supports desert ambience variants with wind, sand drift, insects, and sparse calls', () => {
    const sandWindRecipe = buildProceduralSoundRecipe({
      kind: 'desert-ambience',
      identityVariant: 'sand-wind',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: (kind) => (kind === 'desert' ? 164 : 172),
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const nightInsectRecipe = buildProceduralSoundRecipe({
      kind: 'desert-ambience',
      identityVariant: 'night-insects',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: (kind) => (kind === 'desert' ? 164 : 172),
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const sparseCallRecipe = buildProceduralSoundRecipe({
      kind: 'desert-ambience',
      identityVariant: 'sparse-calls',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: (kind) => (kind === 'desert' ? 164 : 172),
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(sandWindRecipe.id).toBe('desert-ambience:sand-wind');
    expect(sandWindRecipe.layers?.map((layer) => layer.id)).toEqual([
      'desert-sand-wind-bed',
      'desert-dune-whistle',
    ]);
    expect(nightInsectRecipe.id).toBe('desert-ambience:night-insects');
    expect(nightInsectRecipe.layers?.map((layer) => layer.id)).toEqual([
      'desert-night-insects',
      'desert-heat-haze-bed',
    ]);
    expect(sparseCallRecipe.id).toBe('desert-ambience:sparse-calls');
    expect(sparseCallRecipe.layers?.map((layer) => layer.id)).toEqual([
      'desert-sparse-calls',
      'desert-open-bed',
    ]);
  });

  it('supports thunder variants with crack, rumble, and reflection layers', () => {
    const overheadRecipe = buildProceduralSoundRecipe({
      kind: 'thunder',
      identityVariant: 'overhead',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const distantRecipe = buildProceduralSoundRecipe({
      kind: 'thunder',
      identityVariant: 'distant',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(overheadRecipe.id).toBe('thunder:overhead');
    expect(overheadRecipe.layers?.map((layer) => layer.id)).toEqual([
      'thunder-overhead-crack',
      'thunder-overhead-rumble',
      'thunder-overhead-reflections',
    ]);
    expect(distantRecipe.id).toBe('thunder:distant');
    expect(distantRecipe.layers?.map((layer) => layer.id)).toEqual([
      'thunder-distant-rumble',
      'thunder-distant-reflections',
    ]);
  });

  it('supports time-of-day and seasonal ambient variants for plains, forest, and settlements', () => {
    const forestNightRecipe = buildProceduralSoundRecipe({
      kind: 'forest-ambience',
      identityVariant: 'night-crickets',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 2,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const plainsSummerRecipe = buildProceduralSoundRecipe({
      kind: 'plains-ambience',
      identityVariant: 'summer-insects',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 1,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const settlementDuskRecipe = buildProceduralSoundRecipe({
      kind: 'settlement-ambience',
      identityVariant: 'tavern',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: -1,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(forestNightRecipe.id).toBe('forest-ambience:night-crickets');
    expect(forestNightRecipe.layers?.map((layer) => layer.id)).toEqual([
      'forest-cricket-bed',
      'forest-nocturnal-rustle',
    ]);
    expect(plainsSummerRecipe.id).toBe('plains-ambience:summer-insects');
    expect(plainsSummerRecipe.layers?.map((layer) => layer.id)).toEqual([
      'plains-summer-insects',
      'plains-heat-breeze',
    ]);
    expect(settlementDuskRecipe.id).toBe('settlement-ambience:tavern');
    expect(settlementDuskRecipe.layers?.map((layer) => layer.id)).toEqual([
      'settlement-tavern-bed',
      'settlement-evening-fiddle',
    ]);
  });

  it('supports snowfield ambience variants for creaks, gusts, and muffled snow drift', () => {
    const snowfieldCreakRecipe = buildProceduralSoundRecipe({
      kind: 'snowfield-ambience',
      identityVariant: 'ice-creaks',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const snowfieldGustRecipe = buildProceduralSoundRecipe({
      kind: 'snowfield-ambience',
      identityVariant: 'winter-gusts',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const snowfieldMuffleRecipe = buildProceduralSoundRecipe({
      kind: 'snowfield-ambience',
      identityVariant: 'muffled-open',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(snowfieldCreakRecipe.id).toBe('snowfield-ambience:ice-creaks');
    expect(snowfieldCreakRecipe.layers?.map((layer) => layer.id)).toEqual([
      'snowfield-ice-bed',
      'snowfield-ice-creak',
    ]);
    expect(snowfieldGustRecipe.id).toBe('snowfield-ambience:winter-gusts');
    expect(snowfieldGustRecipe.layers?.map((layer) => layer.id)).toEqual([
      'snowfield-gust-bed',
      'snowfield-drift-shear',
    ]);
    expect(snowfieldMuffleRecipe.id).toBe('snowfield-ambience:muffled-open');
    expect(snowfieldMuffleRecipe.layers?.map((layer) => layer.id)).toEqual([
      'snowfield-muffle-bed',
      'snowfield-soft-drift',
    ]);
  });

  it('supports volcanic ambience variants for rumble, vents, and lava pops', () => {
    const volcanicRumbleRecipe = buildProceduralSoundRecipe({
      kind: 'volcanic-ambience',
      identityVariant: 'rumble',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const volcanicVentRecipe = buildProceduralSoundRecipe({
      kind: 'volcanic-ambience',
      identityVariant: 'steam-vents',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const volcanicLavaRecipe = buildProceduralSoundRecipe({
      kind: 'volcanic-ambience',
      identityVariant: 'lava-pops',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(volcanicRumbleRecipe.id).toBe('volcanic-ambience:rumble');
    expect(volcanicRumbleRecipe.layers?.map((layer) => layer.id)).toEqual([
      'volcanic-rumble-bed',
      'volcanic-deep-pressure',
    ]);
    expect(volcanicVentRecipe.id).toBe('volcanic-ambience:steam-vents');
    expect(volcanicVentRecipe.layers?.map((layer) => layer.id)).toEqual([
      'volcanic-steam-bed',
      'volcanic-vent-hiss',
    ]);
    expect(volcanicLavaRecipe.id).toBe('volcanic-ambience:lava-pops');
    expect(volcanicLavaRecipe.layers?.map((layer) => layer.id)).toEqual([
      'volcanic-lava-bed',
      'volcanic-lava-pop',
    ]);
  });

  it('supports living ambient event variants and seasonal landmark cues', () => {
    const forestMigrationRecipe = buildProceduralSoundRecipe({
      kind: 'forest-ambience',
      identityVariant: 'migrating-birds',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 3,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const riverSplashRecipe = buildProceduralSoundRecipe({
      kind: 'river-ambience',
      identityVariant: 'water-splashes',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 0,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const ruinsLandmarkRecipe = buildProceduralSoundRecipe({
      kind: 'ruins-ambience',
      identityVariant: 'landmark-hint',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: -1,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(forestMigrationRecipe.id).toBe('forest-ambience:migrating-birds');
    expect(forestMigrationRecipe.layers?.map((layer) => layer.id)).toEqual([
      'forest-migration-calls',
      'forest-open-sky-bed',
    ]);
    expect(riverSplashRecipe.id).toBe('river-ambience:water-splashes');
    expect(riverSplashRecipe.layers?.map((layer) => layer.id)).toEqual([
      'river-splash-bed',
      'river-splash-pop',
    ]);
    expect(ruinsLandmarkRecipe.id).toBe('ruins-ambience:landmark-hint');
    expect(ruinsLandmarkRecipe.layers?.map((layer) => layer.id)).toEqual([
      'ruins-landmark-tone',
      'ruins-stone-hum',
    ]);
  });

  it('supports magical ambience variants with dedicated observatory layer sets', () => {
    const chimeRecipe = buildProceduralSoundRecipe({
      kind: 'magical-ambience',
      identityVariant: 'astral-chimes',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: 2,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });
    const whisperRecipe = buildProceduralSoundRecipe({
      kind: 'magical-ambience',
      identityVariant: 'void-whispers',
      profile: DEFAULT_SURFACE_PROFILE,
      variantOffset: -1,
      resolveAdvancementFrequency: () => 300,
      resolveAmbientSoundFrequency: () => 172,
      resolveInteractionFrequency: () => 128,
      resolveInteractionWaveform: (_tileKind, fallback) => fallback,
      resolvePaddleBoatCalliopeFrequency: () => 520,
      resolveSteamWhistleFrequency: () => 360,
    });

    expect(chimeRecipe.id).toBe('magical-ambience:astral-chimes');
    expect(chimeRecipe.layers?.map((layer) => layer.id)).toEqual([
      'magical-astral-bell',
      'magical-starlight-bed',
    ]);
    expect(whisperRecipe.id).toBe('magical-ambience:void-whispers');
    expect(whisperRecipe.layers?.map((layer) => layer.id)).toEqual([
      'magical-void-bed',
      'magical-whisper-hiss',
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
