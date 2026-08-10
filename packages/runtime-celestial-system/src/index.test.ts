import { describe, expect, it } from 'vitest';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import {
  buildSolarSystemPlanetEvents,
  createCelestialSystemRuntimePlugin,
} from './index.ts';
import { getDaylightCycleState } from '@bworlds/core';

const plugin = createCelestialSystemRuntimePlugin();
type CelestialSystemEnvironmentPayload = Parameters<
  NonNullable<typeof plugin.resolveWorldEnvironment>
>[0];

function createCelestialSystemEnvironmentPayload(): CelestialSystemEnvironmentPayload {
  return {
    state: {
      player: {
        x: 0,
        y: -18000,
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
    timeMs: 210000,
  };
}

describe('runtime celestial system', () => {
  it('builds a stable set of solar-system planets with distinct names', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const events = buildSolarSystemPlanetEvents(cycle, 210000);

    expect(events).toHaveLength(5);
    expect(new Set(events.map((event) => event.name)).size).toBe(5);
    expect(events.every((event) => event.type === 'planet')).toBe(true);
    expect(
      events.every((event) => event.visibility >= 0 && event.visibility <= 1)
    ).toBe(true);
    expect(
      events.every((event) => event.altitude >= -1 && event.altitude <= 1)
    ).toBe(true);
    expect(
      events.every(
        (event) => event.azimuth >= 0 && event.azimuth <= Math.PI * 2
      )
    ).toBe(true);
  });

  it('uses shared observer-aware orbit math so planet altitude changes with latitude', () => {
    const equatorialCycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 0,
    });
    const northernCycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 55,
    });

    const equatorialAurel = buildSolarSystemPlanetEvents(
      equatorialCycle,
      210000
    ).find((event) => event.name === 'Aurel');
    const northernAurel = buildSolarSystemPlanetEvents(
      northernCycle,
      210000
    ).find((event) => event.name === 'Aurel');

    expect(equatorialAurel?.altitude).not.toBeCloseTo(
      northernAurel?.altitude ?? 0,
      6
    );
    expect(equatorialAurel?.azimuth).not.toBeNaN();
    expect(northernAurel?.azimuth).not.toBeNaN();
  });

  it('replaces baseline planets with plugin-driven system planets and requests orrery regeneration', () => {
    const environment = plugin.resolveWorldEnvironment?.(
      createCelestialSystemEnvironmentPayload()
    ) as WorldEnvironmentLike | undefined;

    expect(environment?.celestial?.removeVisibleEventTypes).toEqual(['planet']);
    expect(environment?.celestial?.visibleEventsAppend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'planet',
          name: 'Aurel',
        }),
        expect.objectContaining({
          type: 'planet',
          name: 'Vela',
        }),
      ])
    );
    expect(environment?.celestial?.deriveOrreryFromVisibleEvents).toBe(true);
  });
});
