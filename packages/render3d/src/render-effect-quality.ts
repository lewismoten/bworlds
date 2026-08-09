import type { RenderBudgetQualityLevel } from '@bworlds/plugin-api';

export type RenderEffectQualityProfile = {
  shadowMapEnabled: boolean;
  allowShadowCasting: boolean;
  starDensityMultiplier: number;
  showConstellations: boolean;
  showMilkyWay: boolean;
  showAurora: boolean;
};

const FULL_RENDER_EFFECT_QUALITY_PROFILE: RenderEffectQualityProfile = {
  shadowMapEnabled: true,
  allowShadowCasting: true,
  starDensityMultiplier: 1,
  showConstellations: true,
  showMilkyWay: true,
  showAurora: true,
};

const REDUCED_RENDER_EFFECT_QUALITY_PROFILE: RenderEffectQualityProfile = {
  shadowMapEnabled: true,
  allowShadowCasting: true,
  starDensityMultiplier: 0.72,
  showConstellations: true,
  showMilkyWay: true,
  showAurora: false,
};

const MINIMAL_RENDER_EFFECT_QUALITY_PROFILE: RenderEffectQualityProfile = {
  shadowMapEnabled: false,
  allowShadowCasting: false,
  starDensityMultiplier: 0.35,
  showConstellations: false,
  showMilkyWay: false,
  showAurora: false,
};

export function getRenderEffectQualityProfile(
  quality: RenderBudgetQualityLevel | null | undefined
): RenderEffectQualityProfile {
  if (quality === 'minimal') {
    return MINIMAL_RENDER_EFFECT_QUALITY_PROFILE;
  }
  if (quality === 'reduced') {
    return REDUCED_RENDER_EFFECT_QUALITY_PROFILE;
  }
  return FULL_RENDER_EFFECT_QUALITY_PROFILE;
}
