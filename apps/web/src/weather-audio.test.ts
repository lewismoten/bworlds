import { describe, expect, it } from 'vitest';

import {
  isInteriorAcousticTile,
  isRainWeatherKind,
  normalizeWeatherAudioIntensity,
  resolveWeatherPrecipitationSurface,
} from './weather-audio.ts';

describe('weather audio', () => {
  it('detects rain weather kinds used by the runtime weather system', () => {
    expect(isRainWeatherKind('light-rain')).toBe(true);
    expect(isRainWeatherKind('heavy-rain')).toBe(true);
    expect(isRainWeatherKind('wind')).toBe(false);
  });

  it('maps surrounding tiles into precipitation surfaces', () => {
    expect(resolveWeatherPrecipitationSurface('forest')).toBe('leaves');
    expect(resolveWeatherPrecipitationSurface('shore')).toBe('water');
    expect(resolveWeatherPrecipitationSurface('interior')).toBe('roof');
    expect(resolveWeatherPrecipitationSurface('plains')).toBe('open');
  });

  it('normalizes continuous weather intensity while preserving rain kind floors', () => {
    expect(normalizeWeatherAudioIntensity(0.1, 'light-rain')).toBe(0.25);
    expect(normalizeWeatherAudioIntensity(0.2, 'heavy-rain')).toBe(0.7);
    expect(normalizeWeatherAudioIntensity(0.55, 'wind')).toBe(0.55);
  });

  it('recognizes indoor acoustic tiles for muffled weather playback', () => {
    expect(isInteriorAcousticTile('floor')).toBe(true);
    expect(isInteriorAcousticTile('door')).toBe(true);
    expect(isInteriorAcousticTile('forest')).toBe(false);
  });
});
