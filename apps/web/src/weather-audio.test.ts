import { describe, expect, it } from 'vitest';

import {
  isHailWeatherKind,
  isSnowWeatherKind,
  isVegetationAcousticTile,
  isWindOpeningTile,
  isWindWeatherKind,
  isInteriorAcousticTile,
  isRainWeatherKind,
  normalizeHailAudioIntensity,
  normalizeSnowstormAudioIntensity,
  normalizeWindAudioIntensity,
  normalizeWeatherAudioIntensity,
  resolveWeatherAcousticExposure,
  resolveWeatherAcousticGain,
  resolveHailAudioSurface,
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
    expect(isSnowWeatherKind('snow')).toBe(true);
    expect(isHailWeatherKind('hail')).toBe(true);
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

  it('distinguishes sheltered interiors from opening tiles for weather leakage', () => {
    expect(resolveWeatherAcousticExposure('plains')).toBe('outdoor');
    expect(resolveWeatherAcousticExposure('interior')).toBe('sheltered');
    expect(resolveWeatherAcousticExposure('door')).toBe('opening');
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

  it('maps hail-responsive tiles into material surfaces', () => {
    expect(resolveHailAudioSurface('door')).toBe('wood');
    expect(resolveHailAudioSurface('mountain')).toBe('rock');
    expect(resolveHailAudioSurface('shore')).toBe('water');
    expect(resolveHailAudioSurface('forest')).toBe('vegetation');
    expect(resolveHailAudioSurface('snow')).toBe('snow');
    expect(resolveHailAudioSurface('interior')).toBe('roof');
  });

  it('normalizes snowstorm and hail intensities from supported weather kinds', () => {
    expect(normalizeSnowstormAudioIntensity(0.8, 'snow', 0.6)).toBeCloseTo(
      0.844,
      3
    );
    expect(normalizeSnowstormAudioIntensity(0.8, 'clear', 0.6)).toBe(0);
    expect(normalizeHailAudioIntensity(0.2, 'hail')).toBe(0.55);
    expect(normalizeHailAudioIntensity(0.8, 'clear')).toBe(0);
  });

  it('keeps weather loudest outdoors while allowing openings to leak more than interiors', () => {
    expect(resolveWeatherAcousticGain('plains', 'heavy-rain')).toBe(1);
    expect(resolveWeatherAcousticGain('door', 'heavy-rain')).toBe(0.58);
    expect(resolveWeatherAcousticGain('interior', 'heavy-rain')).toBe(0.24);
    expect(resolveWeatherAcousticGain('door', 'wind')).toBeGreaterThan(
      resolveWeatherAcousticGain('interior', 'wind')
    );
    expect(resolveWeatherAcousticGain('door', 'snow')).toBeGreaterThan(
      resolveWeatherAcousticGain('interior', 'snow')
    );
  });
});
