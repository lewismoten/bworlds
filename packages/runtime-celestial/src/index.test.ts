import { describe, expect, it } from 'vitest';
import {
  CELESTIAL_DAY_LENGTH_MS,
  createCelestialRuntimePlugin,
  resolveCelestialCycleConfig,
} from './index.ts';

describe('runtime celestial', () => {
  it('configures a game day to last 42 minutes', () => {
    const cycle = resolveCelestialCycleConfig();

    expect(cycle.dayLengthMs).toBe(42 * 60 * 1000);
    expect(cycle.dayLengthMs).toBe(CELESTIAL_DAY_LENGTH_MS);
  });

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
          dayLengthMs: CELESTIAL_DAY_LENGTH_MS,
          yearLengthDays: 64,
          constellationCount: 8,
        }),
        celestial: expect.objectContaining({
          activeConstellationIndex: expect.any(Number),
          dateLabel: expect.stringContaining('/'),
          visibleEvents: expect.arrayContaining([
            expect.objectContaining({
              visibility: expect.any(Number),
              azimuth: expect.any(Number),
              altitude: expect.any(Number),
              color: expect.any(String),
              size: expect.any(Number),
              trailLength: expect.any(Number),
            }),
          ]),
          milkyWay: expect.objectContaining({
            azimuthOffset: expect.any(Number),
            inclination: expect.any(Number),
            width: expect.any(Number),
            opacity: expect.any(Number),
          }),
          orreryBodies: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: expect.stringMatching(/sun|moon|planet|comet/),
              orbitRadius: expect.any(Number),
              angle: expect.any(Number),
              orbitTilt: expect.any(Number),
              orbitHeight: expect.any(Number),
              orbitEccentricity: expect.any(Number),
              orbitRotation: expect.any(Number),
            }),
          ]),
        }),
      })
    );
    expect(environment.celestial?.constellations).toHaveLength(8);
    expect(environment.celestial?.constellations?.[0]?.name).toMatch(/\w+ \w+/);
  });
});
