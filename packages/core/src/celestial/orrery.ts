import { PLANET_SKY_PROFILES, type PlanetSkyProfile } from './time.ts';

const PLANET_NAMES = ['Aurel', 'Brink', 'Cael', 'Damar', 'Vela'];
const COMET_NAMES = ['White Lantern', 'Pilgrim Tail'];
const PLANET_NAME_SET: ReadonlySet<string> = new Set(PLANET_NAMES);
const COMET_NAME_SET: ReadonlySet<string> = new Set(COMET_NAMES);

const COMET_ORRERY_PROFILES = [
  {
    orbitTilt: 0.46,
    orbitEccentricity: 0.42,
    orbitRotation: 0.88,
    speedExponent: 0.72,
  },
  {
    orbitTilt: -0.38,
    orbitEccentricity: 0.56,
    orbitRotation: 1.74,
    speedExponent: 0.58,
  },
] as const;

type CometOrreryProfile = (typeof COMET_ORRERY_PROFILES)[number];

export interface CelestialEventLike {
  type: 'planet' | 'meteor-shower' | 'comet';
  name: string;
  progress: number;
  intensity: number;
  visibility: number;
  azimuth: number;
  altitude: number;
  color: string;
  size: number;
  trailLength: number;
}

export interface OrreryBodyLike {
  id: string;
  type: 'sun' | 'moon' | 'planet' | 'comet';
  orbitRadius: number;
  angle: number;
  orbitTilt: number;
  orbitHeight: number;
  orbitEccentricity: number;
  orbitRotation: number;
  color: string;
  size: number;
  trailLength: number;
}

function getPlanetSkyProfile(
  name: string,
  fallbackIndex = 0
): PlanetSkyProfile {
  const index = PLANET_NAMES.indexOf(name);
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return PLANET_SKY_PROFILES[resolvedIndex % PLANET_SKY_PROFILES.length];
}

function getPlanetSkyProfileIndex(name: string, fallbackIndex = 0): number {
  const index = PLANET_NAMES.indexOf(name);
  return index >= 0 ? index : fallbackIndex % PLANET_SKY_PROFILES.length;
}

function getCometOrreryProfile(
  name: string,
  fallbackIndex = 0
): CometOrreryProfile {
  const index = COMET_NAMES.indexOf(name);
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return COMET_ORRERY_PROFILES[resolvedIndex % COMET_ORRERY_PROFILES.length];
}

function getCometOrreryProfileIndex(name: string, fallbackIndex = 0): number {
  const index = COMET_NAMES.indexOf(name);
  return index >= 0 ? index : fallbackIndex % COMET_ORRERY_PROFILES.length;
}

function normalizeTurns(value: number): number {
  const turns = value % 1;
  return turns < 0 ? turns + 1 : turns;
}

export function getOrreryBodies({
  moonAngle,
  moonIllumination,
  visibleEvents,
}: {
  moonAngle: number;
  moonIllumination: number;
  visibleEvents: CelestialEventLike[];
}): OrreryBodyLike[] {
  const bodies: OrreryBodyLike[] = [
    {
      id: 'sun',
      type: 'sun',
      orbitRadius: 0,
      angle: 0,
      orbitTilt: 0,
      orbitHeight: 0,
      orbitEccentricity: 0,
      orbitRotation: 0,
      color: '#ffd06e',
      size: 0.92,
      trailLength: 0,
    },
    {
      id: 'moon',
      type: 'moon',
      orbitRadius: 2.6,
      angle: normalizeTurns((moonAngle + Math.PI / 2) / (Math.PI * 2)),
      orbitTilt: 0.34,
      orbitHeight: -0.12,
      orbitEccentricity: 0.08,
      orbitRotation: 0.36,
      color: '#dce8ff',
      size: 0.42 + moonIllumination * 0.16,
      trailLength: 0,
    },
  ];

  let unknownPlanetIndex = PLANET_NAMES.length;
  let unknownCometIndex = COMET_NAMES.length;
  visibleEvents.forEach((event) => {
    if (event.type === 'meteor-shower') {
      return;
    }

    const orbitProfile =
      event.type === 'planet'
        ? getPlanetSkyProfile(event.name, unknownPlanetIndex)
        : getCometOrreryProfile(event.name, unknownCometIndex);
    const orbitRadius =
      event.type === 'planet'
        ? 3.6 + getPlanetSkyProfileIndex(event.name, unknownPlanetIndex) * 0.75
        : 8.1 +
          getCometOrreryProfileIndex(event.name, unknownCometIndex) * 0.95;

    if (event.type === 'planet' && !PLANET_NAME_SET.has(event.name)) {
      unknownPlanetIndex += 1;
    }
    if (event.type === 'comet' && !COMET_NAME_SET.has(event.name)) {
      unknownCometIndex += 1;
    }

    bodies.push({
      id: `${event.type}:${event.name}`,
      type: event.type === 'planet' ? 'planet' : 'comet',
      orbitRadius,
      angle: normalizeTurns(event.progress),
      orbitTilt:
        orbitProfile.orbitTilt +
        (event.type === 'planet'
          ? 0
          : getCometOrreryProfileIndex(event.name, 0) % 2 === 0
            ? 0.04
            : -0.04),
      orbitHeight: event.altitude * 0.35,
      orbitEccentricity: orbitProfile.orbitEccentricity,
      orbitRotation: orbitProfile.orbitRotation,
      color: event.color,
      size: Math.max(0.24, event.size * (event.type === 'planet' ? 0.5 : 0.42)),
      trailLength: event.trailLength,
    });
  });

  return bodies;
}
