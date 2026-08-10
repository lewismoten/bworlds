import { clamp } from '../math.ts';

export interface MilkyWayBeltLike {
  azimuthOffset: number;
  inclination: number;
  width: number;
  opacity: number;
}

export interface MilkyWayBandSampleLike {
  azimuth: number;
  centerPhi: number;
  innerPhi: number;
  outerPhi: number;
  opacity: number;
}

export function getMilkyWayBeltState({
  dayProgress,
  yearProgress,
  observerLatitudeDegrees,
  starsOpacity,
}: {
  dayProgress?: number;
  yearProgress: number;
  observerLatitudeDegrees?: number;
  starsOpacity?: number;
}): MilkyWayBeltLike {
  const latitudeRadians = ((observerLatitudeDegrees ?? 0) / 180) * Math.PI;
  const dailyRotation = (dayProgress ?? 0) * Math.PI * 2;
  return {
    azimuthOffset:
      dailyRotation +
      yearProgress * Math.PI * 2 * 0.16 +
      Math.sin(latitudeRadians) * 0.42,
    inclination:
      1.04 +
      Math.cos(yearProgress * Math.PI * 2) * 0.12 +
      Math.sin(latitudeRadians) * 0.18,
    width: 0.22 + Math.abs(Math.sin(latitudeRadians)) * 0.06,
    opacity: 0.03 + (starsOpacity ?? 0) * 0.16,
  };
}

export function getMilkyWayBandSamples(
  belt: MilkyWayBeltLike,
  yearProgress: number,
  sampleCount = 72
): MilkyWayBandSampleLike[] {
  const resolvedSampleCount = Math.max(8, Math.floor(sampleCount));
  const halfBandWidth = belt.width * 0.7;
  return Array.from({ length: resolvedSampleCount + 1 }, (_, index) => {
    const progress = index / resolvedSampleCount;
    const azimuth = progress * Math.PI * 2 + belt.azimuthOffset;
    const latitudeWave =
      Math.sin(
        progress * Math.PI * 2 * 3 +
          belt.azimuthOffset * 1.2 +
          yearProgress * Math.PI * 2
      ) * belt.width;
    const centerPhi = belt.inclination + latitudeWave;
    const edgeFade = Math.cos(progress * Math.PI * 2 - Math.PI / 2) * 0.08;
    return {
      azimuth,
      centerPhi,
      innerPhi: centerPhi - halfBandWidth,
      outerPhi: centerPhi + halfBandWidth,
      opacity: clamp(belt.opacity * (0.84 + edgeFade), 0, 1),
    };
  });
}
