export type WeatherPrecipitationSurface = 'open' | 'roof' | 'leaves' | 'water';

export function isRainWeatherKind(kind: string | undefined): boolean {
  return kind === 'light-rain' || kind === 'heavy-rain';
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
