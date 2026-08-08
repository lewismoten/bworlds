import { describe, expect, it } from 'vitest';
import { createCelestialRuntimePlugin } from './index.ts';

describe('runtime celestial', () => {
  it('provides seasonal cycle metadata plus procedural constellations', () => {
    const plugin = createCelestialRuntimePlugin();
    const environment = plugin.resolveWorldEnvironment?.({
      state: {} as any,
      timeMs: 600000,
    });

    if (!environment) {
      throw new Error('Expected celestial environment metadata.');
    }
    expect(environment).toEqual(
      expect.objectContaining({
        cycle: expect.objectContaining({
          yearLengthDays: 64,
          constellationCount: 8,
        }),
        celestial: expect.objectContaining({
          activeConstellationIndex: expect.any(Number),
          dateLabel: expect.stringContaining('/'),
          visibleEvents: expect.any(Array),
        }),
      })
    );
    expect(environment.celestial?.constellations).toHaveLength(8);
    expect(environment.celestial?.constellations?.[0]?.name).toMatch(/\w+ \w+/);
  });
});
