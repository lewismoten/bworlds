import { describe, expect, it } from 'vitest';

import {
  isVegetationAcousticTile,
  isWindOpeningTile,
  isWindWeatherKind,
  isInteriorAcousticTile,
  isRainWeatherKind,
  normalizeWindAudioIntensity,
  normalizeWeatherAudioIntensity,
  resolveWindAudioSurface,
  resolveWeatherPrecipitationSurface,
} from './weather-audio.ts';

describe('weather audio', () => {
  it('detects rain weather kinds used by the runtime weather system', () => {
    expect(isRainWeatherKind('light-rain')).toBe(true);
    expect(isRainWeatherKind('heavy-rain')).toBe(true);
    expect(isRainWeatherKind('wind')).toBe(false);
    expect(isWindWeatherKind('wind')).toBe(true);
    expect(isWindWeatherKind('light-rain')).toBe(false);
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

  it('normalizes wind intensity from actual weather conditions', () => {
    expect(normalizeWindAudioIntensity(0.2, 'wind')).toBe(0.35);
    expect(normalizeWindAudioIntensity(0.65, 'clouds')).toBe(0.65);
  });

  it('maps wind-responsive tiles into canopy and opening surfaces', () => {
    expect(isVegetationAcousticTile('forest')).toBe(true);
    expect(isVegetationAcousticTile('plains')).toBe(false);
    expect(isWindOpeningTile('door')).toBe(true);
    expect(isWindOpeningTile('road')).toBe(false);
    expect(resolveWindAudioSurface('vegetation')).toBe('canopy');
    expect(resolveWindAudioSurface('observatory')).toBe('crossdraft');
    expect(resolveWindAudioSurface('plains')).toBe('open-air');
  });
});
