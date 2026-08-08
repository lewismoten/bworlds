import { describe, expect, it } from 'vitest';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import { createCelestialPhenomenaRuntimePlugin } from './index.ts';

describe('runtime celestial phenomena', () => {
  it('adds latitude-sensitive aurora data on qualifying nights', () => {
    const plugin = createCelestialPhenomenaRuntimePlugin();
    const state = {
      player: {
        x: 0,
        y: -50000,
      },
    } as any;
    let environment: WorldEnvironmentLike | undefined;

    for (let day = 0; day < 160 && !environment?.celestial?.auroraBands?.length; day += 1) {
      environment = plugin.resolveWorldEnvironment?.({
        state,
        timeMs: day * 300000 + 210000,
      }) as WorldEnvironmentLike | undefined;
    }

    expect(environment?.celestial?.auroraBands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          intensity: expect.any(Number),
          colorA: expect.any(String),
          colorB: expect.any(String),
        }),
      ])
    );
  });

  it('adds transient meteor showers or visiting comets on eligible nights', () => {
    const plugin = createCelestialPhenomenaRuntimePlugin();
    const state = {
      player: {
        x: 0,
        y: 40,
      },
    } as any;
    let environment: WorldEnvironmentLike | undefined;

    for (
      let day = 0;
      day < 192 &&
      !(environment?.celestial?.visibleEventsAppend ?? []).some(
        (event) => event.visibility > 0
      );
      day += 1
    ) {
      environment = plugin.resolveWorldEnvironment?.({
        state,
        timeMs: day * 300000 + 210000,
      }) as WorldEnvironmentLike | undefined;
    }

    expect(environment?.celestial?.visibleEventsAppend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: expect.stringMatching(/meteor-shower|comet/),
          visibility: expect.any(Number),
        }),
      ])
    );
    expect(environment?.celestial?.deriveOrreryFromVisibleEvents).toBe(true);
  });

  it('can force an aurora regardless of latitude and time of day', () => {
    const plugin = createCelestialPhenomenaRuntimePlugin();
    const environment = plugin.resolveWorldEnvironment?.({
      state: {
        player: {
          x: 0,
          y: 0,
          facing: Math.PI / 3,
        },
        celestialEventMode: 'aurora',
      } as any,
      timeMs: 0,
    }) as WorldEnvironmentLike | undefined;

    expect(environment?.celestial?.auroraBands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          intensity: expect.any(Number),
          colorA: expect.any(String),
          colorB: expect.any(String),
        }),
      ])
    );
    expect(environment?.celestial?.auroraBands).toHaveLength(3);
    expect(
      (environment?.celestial?.auroraBands ?? []).every(
        (band) => band.intensity >= 0.6 && band.span > 1
      )
    ).toBe(true);
  });

  it('can force a meteor shower regardless of time of day', () => {
    const plugin = createCelestialPhenomenaRuntimePlugin();
    const environment = plugin.resolveWorldEnvironment?.({
      state: {
        player: {
          x: 0,
          y: 0,
          facing: Math.PI / 4,
        },
        celestialEventMode: 'meteor-shower',
      } as any,
      timeMs: 0,
    }) as WorldEnvironmentLike | undefined;

    expect(environment?.celestial?.visibleEventsAppend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'meteor-shower',
          visibility: expect.any(Number),
        }),
      ])
    );
    expect(environment?.celestial?.visibleEventsAppend).toHaveLength(7);
    expect(
      (environment?.celestial?.visibleEventsAppend ?? []).every(
        (event) =>
          event.type === 'meteor-shower' &&
          event.visibility >= 0.72 &&
          event.altitude >= 0.35 &&
          event.trailLength >= 3.4
      )
    ).toBe(true);
  });

  it('can force a comet into a bright high-altitude pass', () => {
    const plugin = createCelestialPhenomenaRuntimePlugin();
    const environment = plugin.resolveWorldEnvironment?.({
      state: {
        player: {
          x: 0,
          y: 0,
          facing: Math.PI / 6,
        },
        celestialEventMode: 'comet',
      } as any,
      timeMs: 0,
    }) as WorldEnvironmentLike | undefined;

    expect(environment?.celestial?.visibleEventsAppend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'comet',
          visibility: expect.any(Number),
        }),
      ])
    );
    expect(environment?.celestial?.visibleEventsAppend?.[0]).toEqual(
      expect.objectContaining({
        type: 'comet',
        intensity: 1,
        size: 0.62,
        trailLength: 3.8,
      })
    );
    expect((environment?.celestial?.visibleEventsAppend?.[0]?.altitude ?? 0)).toBeGreaterThan(
      0.5
    );
  });
});
