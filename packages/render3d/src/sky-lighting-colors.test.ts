import { describe, expect, it } from 'vitest';

import {
  createSkyLightingColorState,
  updateSkyLightingColorState,
} from './sky-lighting-colors.ts';

describe('sky lighting colors', () => {
  it('updates reusable color objects in place', () => {
    const state = createSkyLightingColorState();
    const originalDaySkyColor = state.daySkyColor;
    const originalSunColor = state.sunDayColor;

    const first = updateSkyLightingColorState(state, {
      sky: {
        dayColor: '#123456',
        nightColor: '#101820',
        fogNightColor: '#0f1419',
      },
      twilightPalette: {
        skyColor: '#654321',
        fogColor: '#321654',
      },
      lighting: {
        ambientDayColor: '#abcdef',
        groundDayColor: '#224422',
        sunColor: '#ffeedd',
      },
      defaults: {
        daySkyColor: '#87ceeb',
        nightSkyColor: '#001122',
        fogNightColor: '#010203',
        ambientDayColor: '#eaf6ff',
        groundDayColor: '#28442f',
        sunColor: '#fff3cf',
      },
    });

    const second = updateSkyLightingColorState(state, {
      sky: {},
      twilightPalette: {
        skyColor: '#111111',
        fogColor: '#222222',
      },
      lighting: {},
      defaults: {
        daySkyColor: '#333333',
        nightSkyColor: '#444444',
        fogNightColor: '#555555',
        ambientDayColor: '#666666',
        groundDayColor: '#777777',
        sunColor: '#888888',
      },
    });

    expect(first).toBe(state);
    expect(second).toBe(state);
    expect(state.daySkyColor).toBe(originalDaySkyColor);
    expect(state.sunDayColor).toBe(originalSunColor);
    expect(state.daySkyColor.getHexString()).toBe('333333');
    expect(state.sunsetSkyColor.getHexString()).toBe('111111');
    expect(state.nightSkyColor.getHexString()).toBe('444444');
    expect(state.twilightFogColor.getHexString()).toBe('222222');
    expect(state.nightFogColor.getHexString()).toBe('555555');
    expect(state.ambientDayColor.getHexString()).toBe('666666');
    expect(state.groundDayColor.getHexString()).toBe('777777');
    expect(state.sunDayColor.getHexString()).toBe('888888');
  });
});
