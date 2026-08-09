import { describe, expect, it } from 'vitest';

import { resolveAmbientAltitudeInfluence } from './ambient-altitude-influence.ts';

describe('ambient altitude influence', () => {
  it('boosts exposed high-altitude mountain ambience', () => {
    const lowland = resolveAmbientAltitudeInfluence({
      kind: 'mountain',
      altitude: 0,
    });
    const highland = resolveAmbientAltitudeInfluence({
      kind: 'mountain',
      altitude: 0.36,
    });

    expect(highland.cadenceMultiplier).toBeGreaterThan(
      lowland.cadenceMultiplier
    );
    expect(highland.volumeMultiplier).toBeGreaterThan(lowland.volumeMultiplier);
    expect(highland.signatureSuffix).toContain('altitude:');
  });

  it('softens lowland biological ambience as altitude rises', () => {
    const lowForest = resolveAmbientAltitudeInfluence({
      kind: 'forest',
      altitude: 0.02,
    });
    const highForest = resolveAmbientAltitudeInfluence({
      kind: 'forest',
      altitude: 0.3,
    });

    expect(highForest.cadenceMultiplier).toBeGreaterThan(
      lowForest.cadenceMultiplier
    );
    expect(highForest.volumeMultiplier).toBeLessThan(
      lowForest.volumeMultiplier
    );
  });
});
