import { describe, expect, it } from 'vitest';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import {
  buildSolarSystemPlanetEvents,
  createCelestialSystemRuntimePlugin,
} from './index.ts';
import { getDaylightCycleState } from '@bworlds/core';

describe('runtime celestial system', () => {
  it('builds a stable set of solar-system planets with distinct names', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const events = buildSolarSystemPlanetEvents(cycle, 210000);

    expect(events).toHaveLength(5);
    expect(new Set(events.map((event) => event.name)).size).toBe(5);
    expect(events.every((event) => event.type === 'planet')).toBe(true);
    expect(events.every((event) => event.visibility >= 0 && event.visibility <= 1)).toBe(
      true
    );
  });

  it('replaces baseline planets with plugin-driven system planets and requests orrery regeneration', () => {
    const plugin = createCelestialSystemRuntimePlugin();
    const environment = plugin.resolveWorldEnvironment?.({
      state: {
        player: {
          x: 0,
          y: -18000,
        },
      } as any,
      timeMs: 210000,
    }) as WorldEnvironmentLike | undefined;

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
