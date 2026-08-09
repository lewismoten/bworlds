import { describe, expect, it } from 'vitest';

import {
  resolveAmbientIdentityVariants,
  resolveAmbientIdentityVariantModifiers,
} from './ambient-presets.ts';

describe('ambient presets', () => {
  it('adds living ambient event variants to forest and plains presets', () => {
    expect(resolveAmbientIdentityVariants('forest', 'dawn', 'summer')).toEqual(
      expect.arrayContaining(['dawn-birds', 'nearby-birds', 'distant-birds'])
    );
    expect(resolveAmbientIdentityVariants('plains', 'day', 'summer')).toEqual(
      expect.arrayContaining([
        'summer-insects',
        'nearby-birds',
        'distant-birds',
      ])
    );
  });

  it('adds seasonal migration and leaf events where appropriate', () => {
    expect(resolveAmbientIdentityVariants('forest', 'day', 'autumn')).toEqual(
      expect.arrayContaining(['autumn-leaves', 'animal-calls'])
    );
    expect(resolveAmbientIdentityVariants('mountain', 'day', 'autumn')).toEqual(
      expect.arrayContaining(['migrating-birds', 'falling-rocks'])
    );
  });

  it('gives swamps their own day and night ambient identities', () => {
    expect(resolveAmbientIdentityVariants('swamp', 'night', 'summer')).toEqual([
      'frogs',
      'marsh-insects',
      'bubbles',
    ]);
    expect(resolveAmbientIdentityVariants('swamp', 'dawn', 'spring')).toEqual([
      'frogs',
      'wading-birds',
      'water-movement',
    ]);
  });

  it('slows rare hints and distant events while keeping nearby calls stronger', () => {
    const nearbyBirds = resolveAmbientIdentityVariantModifiers({
      kind: 'forest',
      dayPhase: 'day',
      season: 'summer',
      identityVariant: 'nearby-birds',
    });
    const mysteryHint = resolveAmbientIdentityVariantModifiers({
      kind: 'ruins',
      dayPhase: 'night',
      season: 'autumn',
      identityVariant: 'mystery-hint',
    });

    expect(nearbyBirds.cadenceMultiplier).toBeLessThan(1);
    expect(nearbyBirds.volumeMultiplier).toBeGreaterThan(1);
    expect(mysteryHint.cadenceMultiplier).toBeGreaterThan(2);
    expect(mysteryHint.volumeMultiplier).toBeLessThan(1);
  });

  it('gives swamp frog and bubble layers distinct pacing and volume profiles', () => {
    const frogs = resolveAmbientIdentityVariantModifiers({
      kind: 'swamp',
      dayPhase: 'night',
      season: 'summer',
      identityVariant: 'frogs',
    });
    const bubbles = resolveAmbientIdentityVariantModifiers({
      kind: 'swamp',
      dayPhase: 'day',
      season: 'summer',
      identityVariant: 'bubbles',
    });

    expect(frogs.cadenceMultiplier).toBeGreaterThan(1);
    expect(bubbles.cadenceMultiplier).toBeGreaterThan(1.3);
    expect(frogs.cadenceMultiplier).not.toBe(bubbles.cadenceMultiplier);
    expect(frogs.volumeMultiplier).not.toBe(bubbles.volumeMultiplier);
    expect(bubbles.volumeMultiplier).toBeLessThan(1);
  });
});
