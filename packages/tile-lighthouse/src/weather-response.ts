import { clamp, smoothstep } from '@bworlds/core';
import type {
  WorldEnvironmentLike,
  WorldEnvironmentWeatherConditionLike,
} from '@bworlds/plugin-api';

type LighthouseBeamCycleLike = {
  daylight: number;
  twilight: number;
  night: number;
  sunAltitude?: number;
};

export type LighthouseBeamWeatherProfile = {
  activation: number;
  usesWeatherOverride: boolean;
  nearOpacityScale: number;
  midOpacityScale: number;
  farOpacityScale: number;
  nearEmissiveScale: number;
  midEmissiveScale: number;
  farEmissiveScale: number;
};

export function getLighthouseBeamWeatherProfile(
  cycle: LighthouseBeamCycleLike,
  baseActivation: number,
  environment: WorldEnvironmentLike = {}
): LighthouseBeamWeatherProfile {
  const weather = environment.weather?.current;
  const visibilityLoss = clamp(1 - (weather?.visibility ?? 1), 0, 1);
  const fogBoost = getFogBoost(weather);
  const stormStrength = getStormStrength(weather);
  const defaultSolarSuppression =
    typeof cycle.sunAltitude === 'number'
      ? 1 - smoothstep(-0.2, 0.08, cycle.sunAltitude)
      : 1 - smoothstep(0.06, 0.22, cycle.daylight);
  const weatherDaylightAllowance =
    typeof cycle.sunAltitude === 'number'
      ? 1 - smoothstep(0.04, 0.26, cycle.sunAltitude)
      : 1 - smoothstep(0.18, 0.45, cycle.daylight);
  const weatherActivationFloor = clamp(
    fogBoost * 0.58 + stormStrength * 0.22 + visibilityLoss * 0.12,
    0,
    0.7
  );
  const weatherActivation = weatherActivationFloor * weatherDaylightAllowance;
  const baseSolarActivation = baseActivation * defaultSolarSuppression;
  const activation = clamp(
    Math.max(baseSolarActivation, weatherActivation),
    0,
    1
  );

  const fogVisibilityBoost = 1 + fogBoost * 0.85 + visibilityLoss * 0.35;
  const stormFarReduction = 1 - stormStrength * 0.42;
  const stormMidReduction = 1 - stormStrength * 0.18;

  return {
    activation,
    usesWeatherOverride: weatherActivation > baseSolarActivation + 0.01,
    nearOpacityScale: fogVisibilityBoost,
    midOpacityScale: fogVisibilityBoost * stormMidReduction,
    farOpacityScale: fogVisibilityBoost * stormFarReduction,
    nearEmissiveScale: 1 + fogBoost * 0.48,
    midEmissiveScale: 1 + fogBoost * 0.58,
    farEmissiveScale: (1 + fogBoost * 0.42) * stormFarReduction,
  };
}

function getFogBoost(
  weather: WorldEnvironmentWeatherConditionLike | undefined
): number {
  if (!weather) {
    return 0;
  }
  if (weather.kind === 'fog') {
    return clamp(0.32 + weather.intensity * 0.68, 0, 1);
  }
  return clamp((0.78 - weather.visibility) * 0.85, 0, 0.45);
}

function getStormStrength(
  weather: WorldEnvironmentWeatherConditionLike | undefined
): number {
  if (!weather) {
    return 0;
  }
  if (weather.kind === 'heavy-rain' || weather.kind === 'hail') {
    return clamp(weather.intensity * 0.92 + (1 - weather.visibility) * 0.34, 0, 1);
  }
  if (weather.kind === 'snow') {
    return clamp(weather.intensity * 0.38 + (1 - weather.visibility) * 0.2, 0, 0.5);
  }
  return 0;
}
