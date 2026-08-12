import type { Kind, WorldEnvironmentWeatherConditionLike } from '@bworlds/plugin-api';
import type { TerrainRouteSurfaceType } from './route-surface-plan.ts';

export type TerrainRouteAppearanceProfile = {
  trafficIntensity: number;
  wetness: number;
  wearStrength: number;
  wheelRutStrength: number;
  wornCenterStrength: number;
  edgeGrassStrength: number;
  mudStrength: number;
  snowCoverStrength: number;
  roughnessMultiplier: number;
  tintDarkening: number;
  reason: string;
};

export function resolveTerrainRouteAppearanceProfile(params: {
  kind: Kind;
  surfaceType?: TerrainRouteSurfaceType | null;
  trafficIntensity?: number;
  roadSignal?: number;
  weather?: Pick<
    WorldEnvironmentWeatherConditionLike,
    'kind' | 'intensity' | 'precipitation' | 'temperature'
  >;
  sustainedWetness?: number;
  snowAccumulation?: number;
  snowMelt?: number;
}): TerrainRouteAppearanceProfile {
  const trafficIntensity = clamp01(
    params.trafficIntensity ?? params.roadSignal ?? 0
  );
  const precipitation = clamp01(
    params.weather?.precipitation ?? params.weather?.intensity ?? 0
  );
  const weatherIntensity = clamp01(params.weather?.intensity ?? precipitation);
  const sustainedWetness = clamp01(params.sustainedWetness ?? 0);
  const freezeFactor = resolveFreezeFactor(params.weather?.temperature);
  const isRain =
    params.weather?.kind === 'light-rain' ||
    params.weather?.kind === 'heavy-rain';
  const isSnow = params.weather?.kind === 'snow';
  const isHail = params.weather?.kind === 'hail';
  const rainSignal = isRain
    ? Math.max(precipitation, weatherIntensity * 0.72)
    : isHail
      ? precipitation * 0.3
      : 0;
  const snowSignal = isSnow
    ? Math.max(precipitation, weatherIntensity * 0.78) *
      Math.max(0.7, freezeFactor)
    : isHail
      ? precipitation * freezeFactor * 0.12
      : 0;
  const snowAccumulation = clamp01(params.snowAccumulation ?? 0);
  const snowMelt = clamp01(
    params.snowMelt ?? (1 - freezeFactor) * Math.max(0.08, rainSignal * 0.22)
  );
  const wetness = clamp01(
    Math.max(
      sustainedWetness,
      rainSignal * 0.78 + precipitation * 0.18 + snowAccumulation * 0.1
    )
  );
  const snowCoverStrength = clamp01(
    snowAccumulation * (1 - snowMelt) + snowSignal * 0.58
  );
  const wearStrength = clamp01(0.12 + trafficIntensity * 0.7);
  const dirtLike = isDirtLikeSurface(params.surfaceType, params.kind);
  const gravelLike = isGravelLikeSurface(params.surfaceType);
  const wheelRutStrength =
    params.kind === 'road' && dirtLike
      ? clamp01(wearStrength * (0.32 + trafficIntensity * 0.18 + wetness * 0.42))
      : 0;
  const wornCenterStrength =
    params.kind === 'path'
      ? clamp01(wearStrength * (0.4 + trafficIntensity * 0.36))
      : params.kind === 'road' && dirtLike
        ? clamp01(wearStrength * 0.22)
        : 0;
  const edgeGrassStrength =
    params.kind === 'path' || dirtLike
      ? clamp01(
          (1 - trafficIntensity) *
            (1 - wetness) *
            (params.kind === 'path' ? 0.76 : 0.44)
        )
      : gravelLike
        ? clamp01((1 - trafficIntensity) * 0.12)
        : 0;
  const mudStrength = dirtLike
    ? clamp01(
        wetness *
          (0.34 + trafficIntensity * 0.24) *
          (1 - snowCoverStrength * 0.82)
      )
    : clamp01(
        wetness *
          (gravelLike ? 0.1 : 0.18) *
          (1 - snowCoverStrength * 0.88)
      );
  const roughnessMultiplier = 1 - wetness * 0.22 - mudStrength * 0.08;
  const tintDarkening = wetness * 0.16 + mudStrength * 0.08;

  return {
    trafficIntensity,
    wetness,
    wearStrength,
    wheelRutStrength,
    wornCenterStrength,
    edgeGrassStrength,
    mudStrength,
    snowCoverStrength,
    roughnessMultiplier,
    tintDarkening,
    reason: createReason({
      kind: params.kind,
      surfaceType: params.surfaceType,
      trafficIntensity,
      wetness,
      snowCoverStrength,
    }),
  };
}

function isDirtLikeSurface(
  surfaceType: TerrainRouteSurfaceType | null | undefined,
  kind: Kind
): boolean {
  if (!surfaceType) {
    return kind === 'path' || kind === 'road';
  }
  return (
    surfaceType.includes('dirt') ||
    surfaceType.includes('muddy') ||
    surfaceType.includes('grass')
  );
}

function isGravelLikeSurface(
  surfaceType: TerrainRouteSurfaceType | null | undefined
): boolean {
  if (!surfaceType) {
    return false;
  }
  return surfaceType.includes('gravel') || surfaceType.includes('stone');
}

function resolveFreezeFactor(temperature: number | undefined): number {
  if (!Number.isFinite(temperature)) {
    return 0.5;
  }
  return clamp01((0.45 - (temperature ?? 0)) / 0.45);
}

function createReason(params: {
  kind: Kind;
  surfaceType: TerrainRouteSurfaceType | null | undefined;
  trafficIntensity: number;
  wetness: number;
  snowCoverStrength: number;
}): string {
  const routeLabel = params.surfaceType ?? params.kind;
  if (params.snowCoverStrength > 0.2) {
    return `${routeLabel} appearance favors partial snow cover from current weather and retained accumulation`;
  }
  if (params.wetness > 0.18) {
    return `${routeLabel} appearance darkens and shifts toward mud from current wetness`;
  }
  if (params.trafficIntensity > 0.58) {
    return `${routeLabel} appearance emphasizes heavier wear from sustained traffic`;
  }
  return `${routeLabel} appearance preserves lighter wear and edge regrowth under low pressure`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
