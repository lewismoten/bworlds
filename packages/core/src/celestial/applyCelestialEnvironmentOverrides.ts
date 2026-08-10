import { clamp, smoothstep } from '../math';
import type { AuroraBandLike } from './aurora';
import type { ConstellationLike } from './constellation';
import {
  getEclipseAdjustedDaylight,
  getEclipseAdjustedTwilight,
  type SolarEclipseLike,
} from './eclipse';
import type { CelestialEventLike } from './types';
import type { getDaylightCycleState } from './getDaylightCycleState';
import type { MilkyWayBeltLike } from './milky-way';
import { getOrreryBodies, type OrreryBodyLike } from './orrery';

export function applyCelestialEnvironmentOverrides(
  cycle: ReturnType<typeof getDaylightCycleState>,
  overrides: {
    constellations?: ConstellationLike[];
    activeConstellationIndex?: number;
    visibleEvents?: CelestialEventLike[];
    visibleEventsAppend?: CelestialEventLike[];
    removeVisibleEventTypes?: Array<CelestialEventLike['type']>;
    milkyWay?: MilkyWayBeltLike;
    auroraBands?: AuroraBandLike[];
    orreryBodies?: OrreryBodyLike[];
    deriveOrreryFromVisibleEvents?: boolean;
    solarEclipse?: SolarEclipseLike;
  } = {}
) {
  const visibleEventsBase = overrides.visibleEvents ?? cycle.visibleEvents;
  const visibleEventsFiltered =
    (overrides.removeVisibleEventTypes?.length ?? 0) > 0
      ? visibleEventsBase.filter(
          (event) => !overrides.removeVisibleEventTypes?.includes(event.type)
        )
      : visibleEventsBase;
  const visibleEvents = [
    ...visibleEventsFiltered,
    ...(overrides.visibleEventsAppend ?? []),
  ];
  const derivedOrreryBodies = overrides.deriveOrreryFromVisibleEvents
    ? getOrreryBodies({
        moonAngle: cycle.moonAngle,
        moonIllumination: cycle.moonIllumination,
        visibleEvents,
      })
    : null;
  const solarEclipse = overrides.solarEclipse ?? cycle.solarEclipse;
  const rawDaylight = cycle.rawDaylight ?? cycle.daylight;
  const rawTwilight = cycle.rawTwilight ?? cycle.twilight;
  const daylight =
    overrides.solarEclipse != null
      ? getEclipseAdjustedDaylight(rawDaylight, solarEclipse)
      : cycle.daylight;
  const twilight =
    overrides.solarEclipse != null
      ? getEclipseAdjustedTwilight(rawTwilight, solarEclipse)
      : cycle.twilight;
  const night =
    overrides.solarEclipse != null
      ? clamp(1 - twilight + solarEclipse.daylightReduction * 0.28, 0, 1)
      : cycle.night;
  const starsOpacity =
    overrides.solarEclipse != null
      ? smoothstep(0.08, 0.82, Math.max(night, solarEclipse.coverage * 0.72))
      : cycle.starsOpacity;
  return {
    ...cycle,
    constellations: overrides.constellations ?? cycle.constellations,
    activeConstellationIndex:
      overrides.activeConstellationIndex ?? cycle.activeConstellationIndex,
    rawDaylight,
    rawTwilight,
    daylight,
    twilight,
    night,
    starsOpacity,
    solarEclipse,
    visibleEvents,
    milkyWay: overrides.milkyWay ?? cycle.milkyWay,
    auroraBands: overrides.auroraBands ?? cycle.auroraBands ?? [],
    orreryBodies:
      overrides.orreryBodies ?? derivedOrreryBodies ?? cycle.orreryBodies,
    isNight: daylight < 0.22,
  };
}
