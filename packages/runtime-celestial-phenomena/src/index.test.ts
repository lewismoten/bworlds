import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';
import { describe, expect, it } from 'vitest';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import { createCelestialPhenomenaRuntimePlugin } from './index.ts';

const NIGHT_SAMPLE_OFFSET_MS = 210000;
const plugin = createCelestialPhenomenaRuntimePlugin();
type CelestialPhenomenaPayload = Parameters<
  NonNullable<typeof plugin.resolveWorldEnvironment>
>[0];

function createCelestialPhenomenaPayload(
  overrides: Partial<CelestialPhenomenaPayload> = {}
): CelestialPhenomenaPayload {
  return {
    state: {
      player: {
        x: 0,
        y: 0,
        facing: 0,
      },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return {
          name: 'Plains',
          color: '#84cc16',
          miniColor: '#65a30d',
          walkable: true,
          wallHeight: 0,
        };
      },
    },
    timeMs: NIGHT_SAMPLE_OFFSET_MS,
    ...overrides,
  };
}

describe('runtime celestial phenomena', () => {
  it('adds latitude-sensitive aurora data on qualifying nights', () => {
    let environment: WorldEnvironmentLike | undefined;

    for (let day = 0; day < 160 && !environment?.celestial?.auroraBands?.length; day += 1) {
      environment = plugin.resolveWorldEnvironment?.(createCelestialPhenomenaPayload({
        state: {
          ...createCelestialPhenomenaPayload().state,
          player: {
            x: 0,
            y: -50000,
            facing: 0,
          },
        },
        timeMs: day * DEFAULT_DAY_LENGTH_MS + NIGHT_SAMPLE_OFFSET_MS,
      })) as WorldEnvironmentLike | undefined;
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
    let environment: WorldEnvironmentLike | undefined;

    for (
      let day = 0;
      day < 192 &&
      !(environment?.celestial?.visibleEventsAppend ?? []).some(
        (event) => event.visibility > 0
      );
      day += 1
    ) {
      environment = plugin.resolveWorldEnvironment?.(createCelestialPhenomenaPayload({
        state: {
          ...createCelestialPhenomenaPayload().state,
          player: {
            x: 0,
            y: 40,
            facing: 0,
          },
        },
        timeMs: day * DEFAULT_DAY_LENGTH_MS + NIGHT_SAMPLE_OFFSET_MS,
      })) as WorldEnvironmentLike | undefined;
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

  it('maps natural transient events through observer-aware sky positions', () => {
    let equatorialEnvironment: WorldEnvironmentLike | undefined;
    let northernEnvironment: WorldEnvironmentLike | undefined;
    let matchedEquatorialEvent:
      | { type?: string; name?: string; altitude?: number; azimuth?: number }
      | undefined;
    let matchedNorthernEvent:
      | { type?: string; name?: string; altitude?: number; azimuth?: number }
      | undefined;

    for (let day = 0; day < 192 && !matchedEquatorialEvent; day += 1) {
      equatorialEnvironment = plugin.resolveWorldEnvironment?.(
        createCelestialPhenomenaPayload({
          state: {
            ...createCelestialPhenomenaPayload().state,
            player: {
              x: 0,
              y: 0,
              facing: 0,
            },
          },
          timeMs: day * DEFAULT_DAY_LENGTH_MS + NIGHT_SAMPLE_OFFSET_MS,
        })
      ) as WorldEnvironmentLike | undefined;
      northernEnvironment = plugin.resolveWorldEnvironment?.(
        createCelestialPhenomenaPayload({
          state: {
            ...createCelestialPhenomenaPayload().state,
            player: {
              x: 0,
              y: -50000,
              facing: 0,
            },
          },
          timeMs: day * DEFAULT_DAY_LENGTH_MS + NIGHT_SAMPLE_OFFSET_MS,
        })
      ) as WorldEnvironmentLike | undefined;

      for (const event of equatorialEnvironment?.celestial?.visibleEventsAppend ?? []) {
        const match = (northernEnvironment?.celestial?.visibleEventsAppend ?? []).find(
          (candidate) =>
            candidate.type === event.type &&
            candidate.name === event.name
        );
        if (match) {
          matchedEquatorialEvent = event;
          matchedNorthernEvent = match;
          break;
        }
      }
    }

    expect(matchedEquatorialEvent).toBeDefined();
    expect(matchedNorthernEvent).toBeDefined();
    expect(matchedEquatorialEvent?.altitude).not.toBeCloseTo(
      matchedNorthernEvent?.altitude ?? 0,
      6
    );
    expect(matchedEquatorialEvent?.azimuth).not.toBeNaN();
    expect(matchedNorthernEvent?.azimuth).not.toBeNaN();
  });

  it('can force an aurora regardless of latitude and time of day', () => {
    const forcedAuroraState = {
      ...createCelestialPhenomenaPayload().state,
      player: {
        x: 0,
        y: 0,
        facing: Math.PI / 3,
      },
      celestialEventMode: 'aurora',
    };
    const environment = plugin.resolveWorldEnvironment?.(
      createCelestialPhenomenaPayload({
        state: forcedAuroraState,
        timeMs: 0,
      })
    ) as WorldEnvironmentLike | undefined;

    expect(environment?.celestial?.auroraBands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          intensity: expect.any(Number),
          colorA: expect.any(String),
          colorB: expect.any(String),
        }),
      ])
    );
    expect(environment?.celestial?.auroraBands).toHaveLength(5);
    expect(
      (environment?.celestial?.auroraBands ?? []).every(
        (band) => band.intensity >= 0.6 && band.span > 1.4 && band.height >= 0.34
      )
    ).toBe(true);
    expect(
      (environment?.celestial?.auroraBands ?? []).every(
        (band) => band.azimuthCenter < 0.3
      )
    ).toBe(true);
  });

  it('can force a meteor shower regardless of time of day', () => {
    const forcedMeteorState = {
      ...createCelestialPhenomenaPayload().state,
      player: {
        x: 0,
        y: 0,
        facing: Math.PI / 4,
      },
      celestialEventMode: 'meteor-shower',
    };
    const environment = plugin.resolveWorldEnvironment?.(
      createCelestialPhenomenaPayload({
        state: forcedMeteorState,
        timeMs: 0,
      })
    ) as WorldEnvironmentLike | undefined;

    expect(environment?.celestial?.visibleEventsAppend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'meteor-shower',
          visibility: expect.any(Number),
        }),
      ])
    );
    expect(environment?.celestial?.visibleEventsAppend).toHaveLength(18);
    expect(
      (environment?.celestial?.visibleEventsAppend ?? []).every(
        (event) =>
          event.type === 'meteor-shower' &&
          event.visibility >= 0.72 &&
          event.altitude >= 0.35 &&
          event.trailLength >= 3.8
      )
    ).toBe(true);
    expect(
      (environment?.celestial?.visibleEventsAppend ?? []).some(
        (event) => event.azimuth < 0
      )
    ).toBe(true);
    expect(
      (environment?.celestial?.visibleEventsAppend ?? []).some(
        (event) => event.azimuth > 1
      )
    ).toBe(true);
  });

  it('can force a comet into a bright high-altitude pass', () => {
    const forcedCometState = {
      ...createCelestialPhenomenaPayload().state,
      player: {
        x: 0,
        y: 0,
        facing: Math.PI / 6,
      },
      celestialEventMode: 'comet',
    };
    const environment = plugin.resolveWorldEnvironment?.(
      createCelestialPhenomenaPayload({
        state: forcedCometState,
        timeMs: 0,
      })
    ) as WorldEnvironmentLike | undefined;

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
