import { describe, expect, it } from 'vitest';

import {
  shouldResolve3dSoundContext,
  shouldResolveNearbyEnvironmentalAudioWork,
  shouldResolvePoiMusicWork,
} from './audio-work-gates.ts';

describe('audio work gates', () => {
  it('only resolves 3d sound context in the 3d viewport', () => {
    expect(shouldResolve3dSoundContext('3d')).toBe(true);
    expect(shouldResolve3dSoundContext('2d')).toBe(false);
    expect(shouldResolve3dSoundContext('text')).toBe(false);
  });

  it('skips nearby environmental audio work when output would be inaudible', () => {
    expect(
      shouldResolveNearbyEnvironmentalAudioWork({
        viewMode: '3d',
        soundEnabled: true,
        ambianceEnabled: true,
        environmentVolume: 1,
      })
    ).toBe(true);
    expect(
      shouldResolveNearbyEnvironmentalAudioWork({
        viewMode: '2d',
        soundEnabled: true,
        ambianceEnabled: true,
        environmentVolume: 1,
      })
    ).toBe(false);
    expect(
      shouldResolveNearbyEnvironmentalAudioWork({
        viewMode: '3d',
        soundEnabled: false,
        ambianceEnabled: true,
        environmentVolume: 1,
      })
    ).toBe(false);
    expect(
      shouldResolveNearbyEnvironmentalAudioWork({
        viewMode: '3d',
        soundEnabled: true,
        ambianceEnabled: false,
        environmentVolume: 1,
      })
    ).toBe(false);
    expect(
      shouldResolveNearbyEnvironmentalAudioWork({
        viewMode: '3d',
        soundEnabled: true,
        ambianceEnabled: true,
        environmentVolume: 0,
      })
    ).toBe(false);
  });

  it('skips poi music discovery when music is disabled or muted', () => {
    expect(
      shouldResolvePoiMusicWork({
        musicEnabled: true,
        musicVolume: 1,
      })
    ).toBe(true);
    expect(
      shouldResolvePoiMusicWork({
        musicEnabled: false,
        musicVolume: 1,
      })
    ).toBe(false);
    expect(
      shouldResolvePoiMusicWork({
        musicEnabled: true,
        musicVolume: 0,
      })
    ).toBe(false);
  });
});
