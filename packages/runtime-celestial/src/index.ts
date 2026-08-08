import {
  DEFAULT_CONSTELLATION_COUNT,
  DEFAULT_YEAR_LENGTH_DAYS,
  generateConstellations,
  getDaylightCycleState,
} from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

const CELESTIAL_SEED = 'bworlds-celestial';

export function createCelestialRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-celestial', {
    resolveWorldEnvironment({ timeMs }) {
      const cycle = {
        dayLengthMs: 300000,
        offsetMs: 45000,
        yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
        constellationCount: DEFAULT_CONSTELLATION_COUNT,
        constellationSeed: CELESTIAL_SEED,
        seasonDaylightAmplitude: 0.18,
      };
      const constellations = generateConstellations(CELESTIAL_SEED, {
        count: cycle.constellationCount,
      });
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
          constellations,
          activeConstellationIndex: celestialState.activeConstellationIndex,
          dateLabel: celestialState.calendar.label,
          visibleEvents: celestialState.visibleEvents,
        },
      };
    },
  });
}
