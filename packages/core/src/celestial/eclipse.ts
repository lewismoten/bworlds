import { clamp, normalizeAngle, smoothstep } from '../math.ts';

export interface SolarEclipseLike {
  active: boolean;
  coverage: number;
  totality: number;
  daylightReduction: number;
  moonAzimuth: number;
  moonAltitude: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export function getSolarEclipseState({
  dayNumber,
  dayProgress,
  yearProgress,
  sunAngle,
  sunAzimuth,
  sunAltitude,
  moonAngle,
  moonIlluminationHint = 0,
}: {
  dayNumber: number;
  dayProgress: number;
  yearProgress: number;
  sunAngle: number;
  sunAzimuth: number;
  sunAltitude: number;
  moonAngle: number;
  moonIlluminationHint?: number;
}): SolarEclipseLike {
  const phaseDelta = normalizeAngle(moonAngle - sunAngle);
  const phaseAlignment = 1 - smoothstep(0.06, 0.18, Math.abs(phaseDelta));
  const nodePhase =
    (dayNumber + dayProgress) / 173.3 + yearProgress * 0.12 + 0.17;
  const nodeOffset = Math.sin(nodePhase * Math.PI * 2);
  const nodeAlignment = 1 - smoothstep(0.16, 0.52, Math.abs(nodeOffset));
  const daylightFactor = smoothstep(-0.04, 0.26, sunAltitude);
  const coverage = clamp(
    phaseAlignment *
      nodeAlignment *
      daylightFactor *
      (0.72 + moonIlluminationHint * 0.28),
    0,
    1
  );
  const totality = smoothstep(0.82, 0.98, coverage);
  const daylightReduction = coverage * (0.55 + totality * 0.35);
  const trackX = clamp(phaseDelta / 0.1, -1, 1);
  const trackY = clamp(nodeOffset * 0.68, -1, 1);

  return {
    active: coverage > 0.03,
    coverage,
    totality,
    daylightReduction,
    moonAzimuth: normalizeAngle(sunAzimuth + trackX * 0.06 + trackY * 0.018),
    moonAltitude: clamp(sunAltitude + trackY * 0.08, -1, 1),
    shadowOffsetX: trackX,
    shadowOffsetY: trackY,
  };
}

export function getEclipseAdjustedDaylight(
  daylight: number,
  solarEclipse: SolarEclipseLike
) {
  return clamp(daylight * (1 - solarEclipse.daylightReduction), 0, 1);
}

export function getEclipseAdjustedTwilight(
  twilight: number,
  solarEclipse: SolarEclipseLike
) {
  return clamp(twilight - solarEclipse.daylightReduction * 0.34, 0, 1);
}
