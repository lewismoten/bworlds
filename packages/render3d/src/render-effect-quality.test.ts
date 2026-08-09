import { describe, expect, it } from 'vitest';

import { getRenderEffectQualityProfile } from './render-effect-quality.ts';

describe('render effect quality', () => {
  it('keeps all optional effects enabled at full quality', () => {
    expect(getRenderEffectQualityProfile('full')).toEqual({
      shadowMapEnabled: true,
      allowShadowCasting: true,
      starDensityMultiplier: 1,
      showConstellations: true,
      showMilkyWay: true,
      showAurora: true,
    });
  });

  it('disables the most expensive optional effects at minimal quality', () => {
    expect(getRenderEffectQualityProfile('minimal')).toEqual({
      shadowMapEnabled: false,
      allowShadowCasting: false,
      starDensityMultiplier: 0.35,
      showConstellations: false,
      showMilkyWay: false,
      showAurora: false,
    });
  });

  it('falls back to the full profile when the budget does not specify a quality', () => {
    expect(getRenderEffectQualityProfile(undefined)).toEqual(
      getRenderEffectQualityProfile('full')
    );
  });
});
