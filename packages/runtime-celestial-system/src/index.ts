import {
  clamp,
  getDaylightCycleState,
  getPlanetaryOrbitProgress,
  smoothstep,
  type CelestialEventLike,
} from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';
import { resolveCelestialCycleConfig } from '@bworlds/runtime-celestial';

const SOLAR_SYSTEM_PLANETS = [
  {
    name: 'Aurel',
    orbitLengthDays: 9,
    wobblePeriodDays: 5,
    wobbleAmplitude: 0.016,
    wobblePhase: 0.12,
    azimuthShift: -0.32,
    altitudePhase: 0.42,
    baseAltitude: 0.18,
    altitudeSwing: 0.2,
    declinationFactor: 0.16,
    declinationWaveDays: 15,
    declinationWaveAmplitude: 0.05,
    intensityBase: 0.82,
    daylightPresence: 0.78,
    color: '#ffd7a6',
    size: 0.56,
  },
  {
    name: 'Brink',
    orbitLengthDays: 14,
    wobblePeriodDays: 8,
    wobbleAmplitude: 0.02,
    wobblePhase: 0.44,
    azimuthShift: 0.14,
    altitudePhase: 1.26,
    baseAltitude: 0.12,
    altitudeSwing: 0.24,
    declinationFactor: 0.24,
    declinationWaveDays: 19,
    declinationWaveAmplitude: 0.08,
    intensityBase: 0.68,
    daylightPresence: 0.42,
    color: '#f7b8d7',
    size: 0.62,
  },
  {
    name: 'Cael',
    orbitLengthDays: 21,
    wobblePeriodDays: 11,
    wobbleAmplitude: 0.024,
    wobblePhase: 0.86,
    azimuthShift: 0.58,
    altitudePhase: 2.08,
    baseAltitude: 0.08,
    altitudeSwing: 0.3,
    declinationFactor: 0.32,
    declinationWaveDays: 24,
    declinationWaveAmplitude: 0.11,
    intensityBase: 0.62,
    daylightPresence: 0.26,
    color: '#b8efff',
    size: 0.7,
  },
  {
    name: 'Damar',
    orbitLengthDays: 29,
    wobblePeriodDays: 16,
    wobbleAmplitude: 0.028,
    wobblePhase: 1.32,
    azimuthShift: 0.94,
    altitudePhase: 2.62,
    baseAltitude: 0.06,
    altitudeSwing: 0.32,
    declinationFactor: 0.38,
    declinationWaveDays: 33,
    declinationWaveAmplitude: 0.15,
    intensityBase: 0.58,
    daylightPresence: 0.18,
    color: '#ffe08c',
    size: 0.78,
  },
  {
    name: 'Vela',
    orbitLengthDays: 41,
    wobblePeriodDays: 23,
    wobbleAmplitude: 0.034,
    wobblePhase: 1.86,
    azimuthShift: 1.42,
    altitudePhase: 3.28,
    baseAltitude: 0.02,
    altitudeSwing: 0.36,
    declinationFactor: 0.44,
    declinationWaveDays: 39,
    declinationWaveAmplitude: 0.18,
    intensityBase: 0.54,
    daylightPresence: 0.1,
    color: '#9fd0ff',
    size: 0.84,
  },
] as const;

export function createCelestialSystemRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-celestial-system', {
    resolveWorldEnvironment({ timeMs, state }) {
      const cycle = resolveCelestialCycleConfig(state);
      const resolvedTimeMs = typeof timeMs === 'number' ? timeMs : 0;
      const celestialState = getDaylightCycleState(resolvedTimeMs, cycle);

      return {
        celestial: {
          removeVisibleEventTypes: ['planet'],
          visibleEventsAppend: buildSolarSystemPlanetEvents(
            celestialState,
            resolvedTimeMs
          ),
          deriveOrreryFromVisibleEvents: true,
        },
      };
    },
  });
}

export function buildSolarSystemPlanetEvents(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number
): CelestialEventLike[] {
  return SOLAR_SYSTEM_PLANETS.map((planet, index) => {
    const progress = getPlanetaryOrbitProgress(
      cycle.dayNumber + cycle.dayProgress,
      planet
    );
    const azimuth =
      cycle.sunriseAzimuth +
      progress * Math.PI * 2 +
      planet.azimuthShift +
      Math.sin(cycle.yearProgress * Math.PI * 2 + index * 0.6) * 0.08;
    const latitudeFactor = Math.abs(cycle.observerLatitudeDegrees) / 90;
    const altitude = clamp(
      planet.baseAltitude +
        Math.sin(progress * Math.PI * 2 + planet.altitudePhase) *
          (planet.altitudeSwing + latitudeFactor * 0.08) +
        cycle.solarDeclination * planet.declinationFactor +
        Math.sin(
          ((cycle.dayNumber + cycle.dayProgress) / planet.declinationWaveDays) *
            Math.PI *
            2 +
            planet.altitudePhase
        ) *
          planet.declinationWaveAmplitude,
      -0.34,
      0.92
    );
    const intensity = clamp(
      planet.intensityBase +
        Math.sin(timeMs / 90000 + index * 1.7) * 0.04 +
        cycle.starsOpacity * 0.08,
      0.32,
      1
    );

    return {
      type: 'planet',
      name: planet.name,
      progress,
      intensity,
      visibility: getSolarSystemPlanetVisibility(
        cycle,
        altitude,
        intensity,
        planet.daylightPresence
      ),
      azimuth,
      altitude,
      color: planet.color,
      size: planet.size,
      trailLength: 0,
    };
  });
}

function getSolarSystemPlanetVisibility(
  cycle: ReturnType<typeof getDaylightCycleState>,
  altitude: number,
  intensity: number,
  daylightPresence: number
) {
  const horizonVisibility = smoothstep(-0.12, 0.18, altitude);
  const twilightVisibility = smoothstep(0.12, 0.82, cycle.starsOpacity);
  const daylightVisibility =
    daylightPresence * (0.34 + (1 - cycle.daylight) * 0.66);
  const nightVisibility =
    (0.18 + twilightVisibility * 0.82) * (0.34 + cycle.night * 0.66);
  return clamp(
    horizonVisibility *
      (0.22 + intensity * 0.24) *
      Math.max(daylightVisibility, nightVisibility),
    0,
    1
  );
}
