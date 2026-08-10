export const DEFAULT_DAY_LENGTH_MINUTES = 42;
export const DEFAULT_DAY_LENGTH_MS = DEFAULT_DAY_LENGTH_MINUTES * 60 * 1000;
export const DEFAULT_YEAR_LENGTH_DAYS = 64;
export const DEFAULT_CONSTELLATION_COUNT = 8;
export const DEFAULT_SEASON_DAYLIGHT_AMPLITUDE = 0.41;

export const PLANET_SKY_PROFILES = [
  {
    orbitLengthDays: 11,
    wobblePeriodDays: 6,
    wobbleAmplitude: 0.012,
    wobblePhase: 0.18,
    declinationFactor: 0.18,
    declinationWaveDays: 15,
    declinationWaveAmplitude: 0.05,
    azimuthShift: 0.08,
    intensityBase: 0.42,
    intensitySwing: 0.34,
    color: '#ffd7a6',
    size: 0.52,
    orbitTilt: 0.16,
    orbitEccentricity: 0.06,
    orbitRotation: 0.12,
  },
  {
    orbitLengthDays: 17,
    wobblePeriodDays: 9,
    wobbleAmplitude: 0.017,
    wobblePhase: 0.54,
    declinationFactor: 0.26,
    declinationWaveDays: 21,
    declinationWaveAmplitude: 0.08,
    azimuthShift: 0.34,
    intensityBase: 0.38,
    intensitySwing: 0.36,
    color: '#f7b8d7',
    size: 0.6,
    orbitTilt: 0.24,
    orbitEccentricity: 0.11,
    orbitRotation: 0.58,
  },
  {
    orbitLengthDays: 24,
    wobblePeriodDays: 13,
    wobbleAmplitude: 0.024,
    wobblePhase: 0.92,
    declinationFactor: 0.34,
    declinationWaveDays: 30,
    declinationWaveAmplitude: 0.12,
    azimuthShift: 0.56,
    intensityBase: 0.36,
    intensitySwing: 0.38,
    color: '#b8efff',
    size: 0.68,
    orbitTilt: -0.21,
    orbitEccentricity: 0.18,
    orbitRotation: 1.04,
  },
  {
    orbitLengthDays: 33,
    wobblePeriodDays: 18,
    wobbleAmplitude: 0.03,
    wobblePhase: 1.36,
    declinationFactor: 0.44,
    declinationWaveDays: 38,
    declinationWaveAmplitude: 0.16,
    azimuthShift: 0.82,
    intensityBase: 0.34,
    intensitySwing: 0.42,
    color: '#ffe08c',
    size: 0.76,
    orbitTilt: 0.31,
    orbitEccentricity: 0.24,
    orbitRotation: 1.52,
  },
  {
    orbitLengthDays: 41,
    wobblePeriodDays: 23,
    wobbleAmplitude: 0.034,
    wobblePhase: 1.86,
    declinationFactor: 0.5,
    declinationWaveDays: 45,
    declinationWaveAmplitude: 0.2,
    azimuthShift: 1.18,
    intensityBase: 0.32,
    intensitySwing: 0.44,
    color: '#9fd0ff',
    size: 0.84,
    orbitTilt: -0.36,
    orbitEccentricity: 0.29,
    orbitRotation: 1.96,
  },
] as const;
export type PlanetSkyProfile = (typeof PLANET_SKY_PROFILES)[number];

export function getWorldTimeMs(
  realTimeMs: number,
  options: {
    timeOffsetMs?: number;
  } = {}
) {
  return realTimeMs + (options.timeOffsetMs ?? 0);
}