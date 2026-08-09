import {
  DEFAULT_CONSTELLATION_COUNT,
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_YEAR_LENGTH_DAYS,
  getDaylightCycleState,
  registerHashLabel,
  toGps,
} from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

const CELESTIAL_SEED = registerHashLabel('bworlds-celestial');
export const CELESTIAL_DAY_LENGTH_MS = DEFAULT_DAY_LENGTH_MS;

type CelestialCycleConfigState = {
  player?: {
    x?: number;
    y?: number;
  };
};

export function resolveCelestialCycleConfig(
  state?: CelestialCycleConfigState
): {
  dayLengthMs: number;
  offsetMs: number;
  yearLengthDays: number;
  constellationCount: number;
  constellationSeed: number;
  seasonDaylightAmplitude: number;
  observerLatitudeDegrees: number;
} {
  const latitude = toGps(state?.player?.x ?? 0, state?.player?.y ?? 0).latitude;
  return {
    dayLengthMs: CELESTIAL_DAY_LENGTH_MS,
    offsetMs: 45000,
    yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    constellationCount: DEFAULT_CONSTELLATION_COUNT,
    constellationSeed: CELESTIAL_SEED,
    seasonDaylightAmplitude: 0.41,
    observerLatitudeDegrees: latitude,
  };
}

export function createCelestialRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-celestial', {
    resolveWorldEnvironment({ timeMs, state }) {
      const cycle = resolveCelestialCycleConfig(state);
      const resolvedTimeMs = typeof timeMs === 'number' ? timeMs : 0;
      const celestialState = getDaylightCycleState(resolvedTimeMs, cycle);

      return {
        cycle,
        sky: {
          dayColor: '#9ed8ff',
          sunsetColor: '#f2a06a',
          nightColor: '#06111f',
          fogDayColor: '#9ed8ff',
          fogNightColor: '#0a1524',
        },
        lighting: {
          sunColor: '#fff3cf',
          moonColor: '#9ec5ff',
          ambientDayColor: '#eaf6ff',
          ambientNightColor: '#9fc4ff',
          groundDayColor: '#28442f',
          groundNightColor: '#101826',
          shadowStrength: 1,
        },
        stars: {
          density: 1.15,
        },
        celestial: {
          constellations: celestialState.constellations,
          activeConstellationIndex: celestialState.activeConstellationIndex,
          dateLabel: celestialState.calendar.label,
          visibleEvents: celestialState.visibleEvents,
          milkyWay: celestialState.milkyWay,
          solarEclipse: celestialState.solarEclipse,
          orreryBodies: celestialState.orreryBodies,
        },
      };
    },
  });
}
