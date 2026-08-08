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
});
