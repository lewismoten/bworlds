import {
  clamp,
  fract,
  getCometOrbitProgress,
  getDaylightCycleState,
  getSolarEclipseState,
  getOrbitalSkyPosition,
  hash2D,
  normalizeAngle,
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
  ['#89ffd6', '#8b9dff'],
  ['#c7ff8c', '#49e8ff'],
] as const;

export type CelestialEventMode =
  | 'auto'
  | 'aurora'
  | 'meteor-shower'
  | 'comet'
  | 'eclipse';

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
      const solarEclipse =
        forcedMode === 'eclipse'
          ? buildForcedSolarEclipse(celestialState, resolvedTimeMs)
          : celestialState.solarEclipse;

      return {
        celestial: {
          visibleEventsAppend: transientEvents,
          auroraBands,
          solarEclipse,
          deriveOrreryFromVisibleEvents:
            transientEvents.length > 0 || auroraBands.length > 0,
        },
      };
    },
  });
}

function getForcedCelestialEventMode(state: unknown): CelestialEventMode {
  const mode = (state as { celestialEventMode?: string } | null)?.celestialEventMode;
  if (
    mode === 'aurora' ||
    mode === 'meteor-shower' ||
    mode === 'comet' ||
    mode === 'eclipse'
  ) {
    return mode;
  }
  return 'auto';
}

function buildForcedSolarEclipse(
  cycle: ReturnType<typeof getDaylightCycleState>,
  timeMs: number
) {
  const sweep = Math.sin(timeMs / 22000);
  const offsetScale = 0.18;
  const coverage = 0.88 + Math.cos(timeMs / 16000) * 0.08;
  const totality = clamp(0.7 + Math.cos(timeMs / 16000) * 0.18, 0.55, 1);
  return {
    ...getSolarEclipseState({
      dayNumber: cycle.dayNumber,
      dayProgress: cycle.dayProgress,
      yearProgress: cycle.yearProgress,
      sunAngle: cycle.sunAngle,
      sunAzimuth: cycle.sunAzimuth,
      sunAltitude: Math.max(cycle.sunAltitude, 0.35),
      moonAngle: cycle.sunAngle + sweep * 0.02,
      moonIlluminationHint: 1,
    }),
    active: true,
    coverage: clamp(coverage, 0, 1),
    totality,
    daylightReduction: clamp(coverage * (0.62 + totality * 0.28), 0, 1),
    moonAzimuth: normalizeAngle(cycle.sunAzimuth + sweep * offsetScale * 0.08),
    moonAltitude: clamp(Math.max(cycle.sunAltitude, 0.35) + sweep * offsetScale, -1, 1),
    shadowOffsetX: sweep * offsetScale,
    shadowOffsetY: Math.cos(timeMs / 22000) * offsetScale * 0.75,
  };
}

function getForcedFacingAngle(state: unknown): number {
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
  const bandCount = forced ? 5 : dayChance > 0.9 ? 3 : dayChance > 0.82 ? 2 : 1;
  const poleAzimuth =
    cycle.observerLatitudeDegrees >= 0 ? -Math.PI / 2 : Math.PI / 2;
  const facingToPole =
    Math.cos(facingAngle - poleAzimuth) * 0.3;
  const hemisphereAzimuth = forced
    ? poleAzimuth + facingToPole
    : poleAzimuth + Math.sin(timeMs / 28000) * 0.08;
  return Array.from({ length: bandCount }, (_, index) => {
    const colors = AURORA_COLORS[index % AURORA_COLORS.length];
    const bandDrift =
      Math.sin(timeMs / 22000 + index * 0.8) * (forced ? 0.12 : 0.08);
    const bandOffset = (index - (bandCount - 1) * 0.5) * (forced ? 0.24 : 0.28);
    return {
      id: `aurora-${cycle.dayNumber}-${index}`,
      azimuthCenter: hemisphereAzimuth + bandOffset + bandDrift,
      span: forced
        ? 1.5 + effectiveLatitudeFactor * 0.4 + index * 0.16
        : 0.88 + effectiveLatitudeFactor * 0.42 + index * 0.1,
      altitude: forced
        ? 0.24 + index * 0.04 + Math.sin(timeMs / 18000 + index) * 0.02
        : 0.26 + index * 0.05 + Math.sin(timeMs / 22000 + index) * 0.015,
      height: forced
        ? 0.34 + effectiveLatitudeFactor * 0.12 + index * 0.015
        : 0.22 + effectiveLatitudeFactor * 0.1 + index * 0.01,
      intensity: clamp(
        forced
          ? Math.max(0.78, baseIntensity * 1.95) * (1 - index * 0.06)
          : baseIntensity * (1 - index * 0.12),
        0,
        1
      ),
      wavePhase: fract(timeMs / 12000 + index * 0.19),
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

  const burstPhase = fract(timeMs / 7000);
  const count = forced
    ? 18
    : 6 + Math.floor(hash2D('meteor-burst-count', cycle.dayNumber, 0) * 4);
  return Array.from({ length: count }, (_, index) => {
    const progress = fract(burstPhase + index * 0.071);
    const orbitState = forced
      ? {
          azimuth:
            facingAngle -
            0.9 +
            (index / Math.max(1, count - 1)) * 1.8 +
            Math.sin(progress * Math.PI * 2 + index * 0.4) * 0.08,
          altitude:
            0.5 +
            Math.sin(progress * Math.PI * 2 + index * 0.6) * 0.2 +
            (index % 3) * 0.03,
        }
      : getOrbitalSkyPosition({
          orbitProgress: progress,
          observerLatitudeDegrees: cycle.observerLatitudeDegrees,
          declination: clamp(
            cycle.solarDeclination * -0.24 +
              Math.sin(
                ((cycle.dayNumber + progress) / (9 + index * 2)) * Math.PI * 2
              ) *
                0.16,
            -0.68,
            0.68
          ),
          sunriseAzimuth: cycle.sunriseAzimuth,
          sunsetAzimuth: cycle.sunsetAzimuth,
          azimuthShift: 0.92 + index * 0.12,
        });
    const intensity = forced
      ? clamp(0.82 + Math.sin(progress * Math.PI * 2) * 0.14, 0.72, 1)
      : clamp(0.55 + Math.sin(progress * Math.PI * 2) * 0.24, 0.35, 0.9);
    return {
      type: 'meteor-shower',
      name: 'Northfall Burst',
      progress,
      intensity,
      visibility: getTransientVisibility(
        cycle,
        orbitState.altitude,
        intensity,
        true,
        forced
      ),
      azimuth: orbitState.azimuth,
      altitude: orbitState.altitude,
      color: '#dff4ff',
      size: forced ? 0.42 : 0.32,
      trailLength: forced ? 3.8 + (index % 5) * 0.28 : 2.6 + (index % 4) * 0.22,
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
  const orbitState = forced
    ? {
        azimuth: facingAngle + Math.sin(progress * Math.PI * 2) * 0.18,
        altitude: 0.62 + Math.cos(progress * Math.PI * 2) * 0.08,
      }
    : getOrbitalSkyPosition({
        orbitProgress: progress,
        observerLatitudeDegrees: cycle.observerLatitudeDegrees,
        declination: clamp(
          cycle.solarDeclination * -0.42 +
            Math.cos(
              ((cycle.dayNumber + cycle.dayProgress) / cycleLengthDays) * Math.PI * 2
            ) *
              0.22,
          -0.72,
          0.72
        ),
        sunriseAzimuth: cycle.sunriseAzimuth,
        sunsetAzimuth: cycle.sunsetAzimuth,
        azimuthShift: 1.08,
      });
  const intensity = forced ? 1 : clamp(1 - cycleDay / visitLengthDays, 0.28, 1);
  return [
    {
      type: 'comet',
      name: 'Pilgrim Guest',
      progress,
      intensity,
      visibility: getTransientVisibility(
        cycle,
        orbitState.altitude,
        intensity,
        false,
        forced
      ),
      azimuth: orbitState.azimuth,
      altitude: orbitState.altitude,
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
