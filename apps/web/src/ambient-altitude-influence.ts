import type { NearbyAmbientKind } from './nearby-ambient.ts';

export type AmbientAltitudeInfluence = {
  cadenceMultiplier: number;
  volumeMultiplier: number;
  signatureSuffix: string;
};

export function resolveAmbientAltitudeInfluence(options: {
  kind: NearbyAmbientKind;
  altitude?: number;
}): AmbientAltitudeInfluence {
  const normalizedAltitude = normalizeAmbientAltitude(options.altitude);
  if (normalizedAltitude <= 0) {
    return {
      cadenceMultiplier: 1,
      volumeMultiplier: 1,
      signatureSuffix: '',
    };
  }

  const altitudeBand = Math.round(normalizedAltitude * 10);
  let cadenceMultiplier = 1;
  let volumeMultiplier = 1;

  switch (options.kind) {
    case 'mountain':
    case 'snowfield':
      cadenceMultiplier *= 1 + normalizedAltitude * 0.16;
      volumeMultiplier *= 1 + normalizedAltitude * 0.12;
      break;
    case 'desert':
      cadenceMultiplier *= 1 + normalizedAltitude * 0.08;
      volumeMultiplier *= 1 + normalizedAltitude * 0.06;
      break;
    case 'forest':
    case 'plains':
    case 'swamp':
      cadenceMultiplier *= 1 + normalizedAltitude * 0.1;
      volumeMultiplier *= 1 - normalizedAltitude * 0.14;
      break;
    case 'river':
      cadenceMultiplier *= 1 + normalizedAltitude * 0.08;
      volumeMultiplier *= 1 - normalizedAltitude * 0.12;
      break;
    case 'ocean':
      volumeMultiplier *= 1 - normalizedAltitude * 0.1;
      break;
    default:
      cadenceMultiplier *= 1 + normalizedAltitude * 0.04;
      volumeMultiplier *= 1 - normalizedAltitude * 0.05;
      break;
  }

  return {
    cadenceMultiplier,
    volumeMultiplier,
    signatureSuffix: `altitude:${altitudeBand}`,
  };
}

function normalizeAmbientAltitude(altitude: number | undefined): number {
  if (typeof altitude !== 'number' || Number.isNaN(altitude)) {
    return 0;
  }
  return clamp((altitude + 0.12) / 0.5, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
