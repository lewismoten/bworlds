import {
  COMET_NAMES,
  getCometOrreryProfile,
  getCometOrreryProfileIndex,
} from './comet.ts';
import {
  PLANET_NAMES,
  getPlanetSkyProfile,
  getPlanetSkyProfileIndex,
} from './planet.ts';
import type { CelestialEventLike } from './types.ts';
const PLANET_NAME_SET: ReadonlySet<string> = new Set(PLANET_NAMES);
const COMET_NAME_SET: ReadonlySet<string> = new Set(COMET_NAMES);

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
