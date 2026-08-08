import {
  clamp,
  fract,
  getCometOrbitProgress,
  getDaylightCycleState,
  hash2D,
  smoothstep,
  type AuroraBandLike,
  type CelestialEventLike,
} from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';
import { resolveCelestialCycleConfig } from '@bworlds/runtime-celestial';

const AURORA_COLORS = [
  ['#7effbc', '#46d8ff'],
  ['#9dff8f', '#6cf4d4'],
] as const;

export function createCelestialPhenomenaRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-celestial-phenomena', {
    resolveWorldEnvironment({ timeMs, state }) {
      const cycle = resolveCelestialCycleConfig(state);
      const resolvedTimeMs = typeof timeMs === 'number' ? timeMs : 0;
      const celestialState = getDaylightCycleState(resolvedTimeMs, cycle);
      const transientEvents = [
        ...buildTransientMeteorEvents(celestialState, resolvedTimeMs),
        ...buildVisitingCometEvents(celestialState, resolvedTimeMs),
      ];

      return {
        celestial: {
          visibleEventsAppend: transientEvents,
          auroraBands: buildAuroraBands(celestialState, resolvedTimeMs),
          deriveOrreryFromVisibleEvents: transientEvents.length > 0,
        },
      };
    },
  });
}

function buildAuroraBands(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number
): AuroraBandLike[] {
  const latitudeFactor = clamp(
    (Math.abs(cycle.observerLatitudeDegrees) - 34) / 26,
    0,
    1
  );
  if (latitudeFactor <= 0.08 || cycle.night <= 0.35) {
    return [];
  }

  const dayChance = hash2D(
    'aurora-day',
    cycle.dayNumber,
    cycle.observerLatitudeDegrees >= 0 ? 1 : 0
  );
  if (dayChance < 0.7) {
    return [];
  }

  const baseIntensity = latitudeFactor * cycle.night * (0.58 + dayChance * 0.42);
  const bandCount = dayChance > 0.86 ? 2 : 1;
  const hemisphereAzimuth = cycle.observerLatitudeDegrees >= 0 ? -Math.PI / 2 : Math.PI / 2;
  return Array.from({ length: bandCount }, (_, index) => {
    const colors = AURORA_COLORS[index % AURORA_COLORS.length];
    return {
      id: `aurora-${cycle.dayNumber}-${index}`,
      azimuthCenter: hemisphereAzimuth + (index - (bandCount - 1) * 0.5) * 0.34,
      span: 0.82 + latitudeFactor * 0.36 + index * 0.08,
      altitude: 0.3 + index * 0.06,
      height: 0.18 + latitudeFactor * 0.08,
      intensity: clamp(baseIntensity * (1 - index * 0.14), 0, 1),
      wavePhase: fract(timeMs / 18000 + index * 0.23),
      colorA: colors[0],
      colorB: colors[1],
    };
  });
}

function buildTransientMeteorEvents(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number
): CelestialEventLike[] {
  if (cycle.night <= 0.45 || hash2D('meteor-burst-day', cycle.dayNumber, 0) < 0.93) {
    return [];
  }

  const burstPhase = fract(timeMs / 40000);
  const count = 3 + Math.floor(hash2D('meteor-burst-count', cycle.dayNumber, 0) * 2);
  return Array.from({ length: count }, (_, index) => {
    const progress = fract(burstPhase + index * 0.19);
    const azimuth = cycle.sunsetAzimuth + 0.45 + index * 0.11;
    const altitude = 0.34 + Math.sin(progress * Math.PI * 2 + index) * 0.18;
    const intensity = clamp(0.55 + Math.sin(progress * Math.PI * 2) * 0.24, 0.35, 0.9);
    return {
      type: 'meteor-shower',
      name: 'Northfall Burst',
      progress,
      intensity,
      visibility: getTransientVisibility(cycle, altitude, intensity, true),
      azimuth,
      altitude,
      color: '#dff4ff',
      size: 0.3,
      trailLength: 2.4 + index * 0.18,
    };
  });
}

function buildVisitingCometEvents(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number
): CelestialEventLike[] {
  const visitLengthDays = 4;
  const cycleLengthDays = 96;
  const cycleDay =
    ((cycle.dayNumber % cycleLengthDays) + cycleLengthDays) % cycleLengthDays;
  if (cycleDay >= visitLengthDays || hash2D('visiting-comet-day', cycle.dayNumber, 0) < 0.82) {
    return [];
  }

  const phaseOffset = 0.41 + hash2D('visiting-comet-offset', cycle.dayNumber, 0) * 0.12;
  const progress = getCometOrbitProgress(
    cycleDay + cycle.dayProgress + fract(timeMs / 120000) * 0.2,
    visitLengthDays + 3,
    phaseOffset,
    0.6
  );
  const azimuth = cycle.sunriseAzimuth + Math.PI * 0.8 + Math.sin(progress * Math.PI * 2) * 0.72;
  const altitude = 0.22 + Math.cos(progress * Math.PI * 2) * 0.2;
  const intensity = clamp(1 - cycleDay / visitLengthDays, 0.28, 1);
  return [
    {
      type: 'comet',
      name: 'Pilgrim Guest',
      progress,
      intensity,
      visibility: getTransientVisibility(cycle, altitude, intensity, false),
      azimuth,
      altitude,
      color: '#dff6ff',
      size: 0.48,
      trailLength: 2.8,
    },
  ];
}

function getTransientVisibility(
  cycle: ReturnType<typeof getDaylightCycleState>,
  altitude: number,
  intensity: number,
  stronglyNightBound: boolean
) {
  const horizonVisibility = smoothstep(-0.12, 0.18, altitude);
  const nightVisibility = stronglyNightBound
    ? cycle.night * cycle.starsOpacity
    : 0.22 + cycle.night * 0.78;
  return clamp(horizonVisibility * nightVisibility * (0.42 + intensity * 0.58), 0, 1);
}
