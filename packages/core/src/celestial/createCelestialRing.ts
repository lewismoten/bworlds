import type { ConstellationLike } from './constellation.ts';
import { normalizeAngle } from '../math.ts';

export interface CelestialRingEntryLike {
  constellationIndex: number;
  name: string;
  sunriseAzimuth: number;
  visualAzimuth: number;
}

export function createCelestialRing(
  constellations: ConstellationLike[]
): CelestialRingEntryLike[] {
  const count = Math.max(1, constellations.length);
  return constellations.map((constellation, index) => ({
    constellationIndex: index,
    name: constellation.name,
    sunriseAzimuth: normalizeAngle((index / count) * Math.PI * 2),
    visualAzimuth: normalizeAngle(
      (index / count) * Math.PI * 2 + constellation.ringJitter
    ),
  }));
}
