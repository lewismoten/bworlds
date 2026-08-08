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

export type CelestialEventMode = 'auto' | 'aurora' | 'meteor-shower' | 'comet';

export function createCelestialPhenomenaRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-celestial-phenomena', {
    resolveWorldEnvironment({ timeMs, state }) {
      const cycle = resolveCelestialCycleConfig(state);
      const resolvedTimeMs = typeof timeMs === 'number' ? timeMs : 0;
      const celestialState = getDaylightCycleState(resolvedTimeMs, cycle);
      const forcedMode = getForcedCelestialEventMode(state);
      const forcedFacingAngle = getForcedFacingAngle(state);
      const transientEvents = [
        ...buildTransientMeteorEvents(
          celestialState,
          resolvedTimeMs,
          forcedMode === 'meteor-shower',
          forcedFacingAngle
        ),
        ...buildVisitingCometEvents(
          celestialState,
          resolvedTimeMs,
          forcedMode === 'comet',
          forcedFacingAngle
        ),
      ];
      const auroraBands = buildAuroraBands(
        celestialState,
        resolvedTimeMs,
        forcedMode === 'aurora',
        forcedFacingAngle
      );

      return {
        celestial: {
          visibleEventsAppend: transientEvents,
          auroraBands,
          deriveOrreryFromVisibleEvents:
            transientEvents.length > 0 || auroraBands.length > 0,
        },
      };
    },
  });
}

function getForcedCelestialEventMode(state: unknown): CelestialEventMode {
  const mode = (state as { celestialEventMode?: string } | null)?.celestialEventMode;
  if (mode === 'aurora' || mode === 'meteor-shower' || mode === 'comet') {
    return mode;
  }
  return 'auto';
}

function getForcedFacingAngle(state: unknown) {
  const angle = (state as { player?: { facing?: unknown } } | null)?.player?.facing;
  return typeof angle === 'number' ? angle : 0;
}

function buildAuroraBands(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number,
  forced = false,
  facingAngle = 0
): AuroraBandLike[] {
  const latitudeFactor = clamp(
    (Math.abs(cycle.observerLatitudeDegrees) - 34) / 26,
    0,
    1
  );
  const effectiveLatitudeFactor = forced
    ? Math.max(latitudeFactor, 0.88)
    : latitudeFactor;
  if ((!forced && latitudeFactor <= 0.08) || (!forced && cycle.night <= 0.35)) {
    return [];
  }

  const dayChance = hash2D(
    'aurora-day',
    cycle.dayNumber,
    cycle.observerLatitudeDegrees >= 0 ? 1 : 0
  );
  if (!forced && dayChance < 0.7) {
    return [];
  }

  const baseNightFactor = forced ? Math.max(cycle.night, 0.95) : cycle.night;
  const baseIntensity =
    effectiveLatitudeFactor * baseNightFactor * (0.58 + dayChance * 0.42);
  const bandCount = forced ? 3 : dayChance > 0.86 ? 2 : 1;
  const hemisphereAzimuth = forced
    ? facingAngle
    : cycle.observerLatitudeDegrees >= 0
      ? -Math.PI / 2
      : Math.PI / 2;
  return Array.from({ length: bandCount }, (_, index) => {
    const colors = AURORA_COLORS[index % AURORA_COLORS.length];
    return {
      id: `aurora-${cycle.dayNumber}-${index}`,
      azimuthCenter: hemisphereAzimuth + (index - (bandCount - 1) * 0.5) * 0.34,
      span: forced
        ? 1.22 + effectiveLatitudeFactor * 0.34 + index * 0.12
        : 0.82 + effectiveLatitudeFactor * 0.36 + index * 0.08,
      altitude: forced ? 0.34 + index * 0.05 : 0.3 + index * 0.06,
      height: forced
        ? 0.26 + effectiveLatitudeFactor * 0.1
        : 0.18 + effectiveLatitudeFactor * 0.08,
      intensity: clamp(
        forced
          ? Math.max(0.72, baseIntensity * 1.8) * (1 - index * 0.08)
          : baseIntensity * (1 - index * 0.14),
        0,
        1
      ),
      wavePhase: fract(timeMs / 18000 + index * 0.23),
      colorA: colors[0],
      colorB: colors[1],
    };
  });
}

function buildTransientMeteorEvents(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number,
  forced = false,
  facingAngle = 0
): CelestialEventLike[] {
  if (
    (!forced && cycle.night <= 0.45) ||
    (!forced && hash2D('meteor-burst-day', cycle.dayNumber, 0) < 0.93)
  ) {
    return [];
  }

  const burstPhase = fract(timeMs / 40000);
  const count = forced
    ? 7
    : 3 + Math.floor(hash2D('meteor-burst-count', cycle.dayNumber, 0) * 2);
  return Array.from({ length: count }, (_, index) => {
    const progress = fract(burstPhase + index * 0.19);
    const azimuth = forced
      ? facingAngle - 0.42 + index * 0.14
      : cycle.sunsetAzimuth + 0.45 + index * 0.11;
    const altitude = forced
      ? 0.58 + Math.sin(progress * Math.PI * 2 + index * 0.4) * 0.18
      : 0.34 + Math.sin(progress * Math.PI * 2 + index) * 0.18;
    const intensity = forced
      ? clamp(0.82 + Math.sin(progress * Math.PI * 2) * 0.14, 0.72, 1)
      : clamp(0.55 + Math.sin(progress * Math.PI * 2) * 0.24, 0.35, 0.9);
    return {
      type: 'meteor-shower',
      name: 'Northfall Burst',
      progress,
      intensity,
      visibility: getTransientVisibility(cycle, altitude, intensity, true, forced),
      azimuth,
      altitude,
      color: '#dff4ff',
      size: forced ? 0.38 : 0.3,
      trailLength: forced ? 3.4 + index * 0.22 : 2.4 + index * 0.18,
    };
  });
}

function buildVisitingCometEvents(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number,
  forced = false,
  facingAngle = 0
): CelestialEventLike[] {
  const visitLengthDays = 4;
  const cycleLengthDays = 96;
  const cycleDay =
    ((cycle.dayNumber % cycleLengthDays) + cycleLengthDays) % cycleLengthDays;
  if (
    (!forced && cycleDay >= visitLengthDays) ||
    (!forced && hash2D('visiting-comet-day', cycle.dayNumber, 0) < 0.82)
  ) {
    return [];
  }

  const phaseOffset = 0.41 + hash2D('visiting-comet-offset', cycle.dayNumber, 0) * 0.12;
  const progress = getCometOrbitProgress(
    (forced ? cycle.dayProgress * visitLengthDays : cycleDay + cycle.dayProgress) +
      fract(timeMs / 120000) * 0.2,
    visitLengthDays + 3,
    phaseOffset,
    0.6
  );
  const azimuth = forced
    ? facingAngle + Math.sin(progress * Math.PI * 2) * 0.18
    : cycle.sunriseAzimuth + Math.PI * 0.8 + Math.sin(progress * Math.PI * 2) * 0.72;
  const altitude = forced
    ? 0.62 + Math.cos(progress * Math.PI * 2) * 0.08
    : 0.22 + Math.cos(progress * Math.PI * 2) * 0.2;
  const intensity = forced ? 1 : clamp(1 - cycleDay / visitLengthDays, 0.28, 1);
  return [
    {
      type: 'comet',
      name: 'Pilgrim Guest',
      progress,
      intensity,
      visibility: getTransientVisibility(cycle, altitude, intensity, false, forced),
      azimuth,
      altitude,
      color: '#dff6ff',
      size: forced ? 0.62 : 0.48,
      trailLength: forced ? 3.8 : 2.8,
    },
  ];
}

function getTransientVisibility(
  cycle: ReturnType<typeof getDaylightCycleState>,
  altitude: number,
  intensity: number,
  stronglyNightBound: boolean,
  forced = false
) {
  const horizonVisibility = smoothstep(-0.12, 0.18, altitude);
  if (forced) {
    return clamp((0.72 + intensity * 0.28) * Math.max(horizonVisibility, 0.72), 0, 1);
  }
  const nightVisibility = stronglyNightBound
    ? cycle.night * cycle.starsOpacity
    : 0.22 + cycle.night * 0.78;
  return clamp(horizonVisibility * nightVisibility * (0.42 + intensity * 0.58), 0, 1);
}
