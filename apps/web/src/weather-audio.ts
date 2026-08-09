import { createRandom } from '@bworlds/core';

export type WeatherPrecipitationSurface = 'open' | 'roof' | 'leaves' | 'water';
export type WeatherWindSurface = 'open-air' | 'canopy' | 'crossdraft';
export type WeatherHailSurface =
  'roof' | 'wood' | 'rock' | 'water' | 'vegetation' | 'snow' | 'open';
export type WeatherAcousticExposure = 'outdoor' | 'sheltered' | 'opening';
export type WeatherThunderVariant = 'overhead' | 'near' | 'distant';
export type WeatherThunderStrike = {
  distanceKm: number;
  delayMs: number;
  variant: WeatherThunderVariant;
};

export function isRainWeatherKind(kind: string | undefined): boolean {
  return kind === 'light-rain' || kind === 'heavy-rain';
}

export function isWindWeatherKind(kind: string | undefined): boolean {
  return kind === 'wind';
}

export function isSnowWeatherKind(kind: string | undefined): boolean {
  return kind === 'snow';
}

export function isHailWeatherKind(kind: string | undefined): boolean {
  return kind === 'hail';
}

export function isThunderstormWeatherKind(kind: string | undefined): boolean {
  return kind === 'heavy-rain' || kind === 'hail';
}

export function resolveWeatherPrecipitationSurface(
  tileKind: string | undefined
): WeatherPrecipitationSurface {
  if (!tileKind) {
    return 'open';
  }
  if (
    tileKind === 'river' ||
    tileKind === 'water' ||
    tileKind === 'shallows' ||
    tileKind === 'ocean' ||
    tileKind === 'shore'
  ) {
    return 'water';
  }
  if (
    tileKind === 'forest' ||
    tileKind === 'vegetation' ||
    tileKind === 'cave-mushrooms'
  ) {
    return 'leaves';
  }
  if (isInteriorAcousticTile(tileKind)) {
    return 'roof';
  }
  return 'open';
}

export function isInteriorAcousticTile(tileKind: string | undefined): boolean {
  return (
    tileKind === 'interior' ||
    tileKind === 'floor' ||
    tileKind === 'shop' ||
    tileKind === 'town' ||
    tileKind === 'stairsUp' ||
    tileKind === 'stairsDown' ||
    tileKind === 'wall' ||
    tileKind === 'door'
  );
}

export function isVegetationAcousticTile(
  tileKind: string | undefined
): boolean {
  return (
    tileKind === 'forest' ||
    tileKind === 'vegetation' ||
    tileKind === 'cave-mushrooms'
  );
}

export function isWindOpeningTile(tileKind: string | undefined): boolean {
  return (
    tileKind === 'door' ||
    tileKind === 'stairsUp' ||
    tileKind === 'stairsDown' ||
    tileKind === 'cave' ||
    tileKind === 'ruins' ||
    tileKind === 'town' ||
    tileKind === 'shop' ||
    tileKind === 'observatory' ||
    tileKind === 'lighthouse'
  );
}

export function resolveHailAudioSurface(
  tileKind: string | undefined
): WeatherHailSurface {
  if (!tileKind) {
    return 'open';
  }
  if (
    tileKind === 'river' ||
    tileKind === 'water' ||
    tileKind === 'shallows' ||
    tileKind === 'ocean' ||
    tileKind === 'shore'
  ) {
    return 'water';
  }
  if (tileKind === 'snow' || tileKind === 'ice') {
    return 'snow';
  }
  if (isVegetationAcousticTile(tileKind)) {
    return 'vegetation';
  }
  if (
    tileKind === 'bridge' ||
    tileKind === 'dock' ||
    tileKind === 'ship' ||
    tileKind === 'wood' ||
    tileKind === 'door'
  ) {
    return 'wood';
  }
  if (
    tileKind === 'mountain' ||
    tileKind === 'rock' ||
    tileKind === 'quarry' ||
    tileKind === 'observatory'
  ) {
    return 'rock';
  }
  if (isInteriorAcousticTile(tileKind)) {
    return 'roof';
  }
  return 'open';
}

export function normalizeWeatherAudioIntensity(
  weatherIntensity: number | undefined,
  weatherKind: string | undefined
): number {
  const base = clamp(
    typeof weatherIntensity === 'number' ? weatherIntensity : 0,
    0,
    1
  );
  if (weatherKind === 'heavy-rain') {
    return clamp(Math.max(base, 0.7), 0, 1);
  }
  if (weatherKind === 'light-rain') {
    return clamp(Math.max(base, 0.25), 0, 1);
  }
  return base;
}

export function normalizeWindAudioIntensity(
  windStrength: number | undefined,
  weatherKind: string | undefined
): number {
  const base = clamp(typeof windStrength === 'number' ? windStrength : 0, 0, 1);
  if (weatherKind === 'wind') {
    return clamp(Math.max(base, 0.35), 0, 1);
  }
  return base;
}

export function normalizeSnowstormAudioIntensity(
  weatherIntensity: number | undefined,
  weatherKind: string | undefined,
  windStrength: number | undefined
): number {
  if (!isSnowWeatherKind(weatherKind)) {
    return 0;
  }
  const snowIntensity = clamp(
    typeof weatherIntensity === 'number' ? weatherIntensity : 0,
    0,
    1
  );
  const windIntensity = clamp(
    typeof windStrength === 'number' ? windStrength : 0,
    0,
    1
  );
  return clamp(snowIntensity * 0.62 + windIntensity * 0.58, 0, 1);
}

export function normalizeHailAudioIntensity(
  weatherIntensity: number | undefined,
  weatherKind: string | undefined
): number {
  const base = clamp(
    typeof weatherIntensity === 'number' ? weatherIntensity : 0,
    0,
    1
  );
  if (!isHailWeatherKind(weatherKind)) {
    return 0;
  }
  return clamp(Math.max(base, 0.55), 0, 1);
}

export function normalizeThunderstormAudioIntensity(
  weatherIntensity: number | undefined,
  weatherKind: string | undefined,
  windStrength: number | undefined
): number {
  if (!isThunderstormWeatherKind(weatherKind)) {
    return 0;
  }
  const precipitationIntensity = clamp(
    typeof weatherIntensity === 'number' ? weatherIntensity : 0,
    0,
    1
  );
  const windIntensity = clamp(
    typeof windStrength === 'number' ? windStrength : 0,
    0,
    1
  );
  const baseFloor = weatherKind === 'hail' ? 0.62 : 0.42;
  return clamp(
    Math.max(baseFloor, precipitationIntensity * 0.74 + windIntensity * 0.34),
    0,
    1
  );
}

export function resolveWindAudioSurface(
  tileKind: string | undefined
): WeatherWindSurface {
  if (isVegetationAcousticTile(tileKind)) {
    return 'canopy';
  }
  if (isWindOpeningTile(tileKind)) {
    return 'crossdraft';
  }
  return 'open-air';
}

export function resolveWeatherAcousticExposure(
  tileKind: string | undefined
): WeatherAcousticExposure {
  if (isWindOpeningTile(tileKind)) {
    return 'opening';
  }
  if (isInteriorAcousticTile(tileKind)) {
    return 'sheltered';
  }
  return 'outdoor';
}

export function resolveWeatherAcousticGain(
  tileKind: string | undefined,
  weatherKind: string | undefined
): number {
  const exposure = resolveWeatherAcousticExposure(tileKind);
  switch (exposure) {
    case 'opening':
      if (isWindWeatherKind(weatherKind)) {
        return 0.84;
      }
      if (isSnowWeatherKind(weatherKind)) {
        return 0.66;
      }
      if (isHailWeatherKind(weatherKind)) {
        return 0.62;
      }
      return 0.58;
    case 'sheltered':
      if (isWindWeatherKind(weatherKind)) {
        return 0.3;
      }
      if (isSnowWeatherKind(weatherKind)) {
        return 0.34;
      }
      if (isHailWeatherKind(weatherKind)) {
        return 0.28;
      }
      return 0.24;
    case 'outdoor':
    default:
      return 1;
  }
}

export function resolveThunderDelayMs(distanceKm: number): number {
  return Math.round(clamp(distanceKm, 0.2, 12) * 2915);
}

export function resolveThunderIdentityVariant(
  distanceKm: number
): WeatherThunderVariant {
  if (distanceKm <= 1.5) {
    return 'overhead';
  }
  if (distanceKm <= 5.2) {
    return 'near';
  }
  return 'distant';
}

export function resolveThunderLightningStrike(options: {
  weatherIntensity: number | undefined;
  weatherKind: string | undefined;
  windStrength: number | undefined;
  seed: number;
}): WeatherThunderStrike {
  const intensity = normalizeThunderstormAudioIntensity(
    options.weatherIntensity,
    options.weatherKind,
    options.windStrength
  );
  const random = createRandom(options.seed);
  const nearBias = 1 - intensity;
  const minimumDistanceKm = 0.35 + nearBias * 1.2;
  const distanceSpanKm = 1.6 + nearBias * 7.4;
  const distanceKm = clamp(
    minimumDistanceKm + random() * distanceSpanKm,
    0.35,
    12
  );
  return {
    distanceKm,
    delayMs: resolveThunderDelayMs(distanceKm),
    variant: resolveThunderIdentityVariant(distanceKm),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
