import { clamp, lerp, smoothstep } from '@bworlds/core';

import {
  DEFAULT_VISIBILITY_RADIUS,
  MIN_VISIBILITY_RADIUS,
} from './render-visibility-radius.ts';

const MIN_WEATHER_VISIBILITY = 0.18;
const MAX_WEATHER_VISIBILITY = 0.96;

export function getWeatherVisibilityRadiusCap(
  visibility: number | undefined
): number {
  if (typeof visibility !== 'number' || Number.isNaN(visibility)) {
    return DEFAULT_VISIBILITY_RADIUS;
  }

  const normalizedVisibility = smoothstep(
    MIN_WEATHER_VISIBILITY,
    MAX_WEATHER_VISIBILITY,
    clamp(visibility, 0, 1)
  );

  return lerp(
    MIN_VISIBILITY_RADIUS,
    DEFAULT_VISIBILITY_RADIUS,
    normalizedVisibility
  );
}
