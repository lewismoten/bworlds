import type { NearbyAmbientKind } from './nearby-ambient.ts';

export type AmbientTerrainInfluence = {
  cadenceMultiplier: number;
  volumeMultiplier: number;
  signatureSuffix: string;
};

export function resolveAmbientNearbyTerrainInfluence(options: {
  kind: NearbyAmbientKind;
  nearbyKinds: readonly NearbyAmbientKind[];
}): AmbientTerrainInfluence {
  const nearbyKinds = [...new Set(options.nearbyKinds)]
    .filter((kind) => kind !== options.kind)
    .sort();

  let cadenceMultiplier = 1;
  let volumeMultiplier = 1;

  for (const nearbyKind of nearbyKinds) {
    applyAmbientNearbyTerrainModifier(
      options.kind,
      nearbyKind,
      (nextCadenceMultiplier, nextVolumeMultiplier) => {
        cadenceMultiplier *= nextCadenceMultiplier;
        volumeMultiplier *= nextVolumeMultiplier;
      }
    );
  }

  return {
    cadenceMultiplier,
    volumeMultiplier,
    signatureSuffix:
      nearbyKinds.length > 0 ? `terrain:${nearbyKinds.join('+')}` : '',
  };
}

function applyAmbientNearbyTerrainModifier(
  kind: NearbyAmbientKind,
  nearbyKind: NearbyAmbientKind,
  apply: (cadenceMultiplier: number, volumeMultiplier: number) => void
): void {
  switch (kind) {
    case 'forest':
      if (nearbyKind === 'river' || nearbyKind === 'ocean') {
        apply(0.94, 1.05);
        return;
      }
      if (nearbyKind === 'mountain' || nearbyKind === 'snowfield') {
        apply(1.08, 0.96);
      }
      return;
    case 'plains':
      if (nearbyKind === 'river' || nearbyKind === 'ocean') {
        apply(1.02, 1.06);
        return;
      }
      if (nearbyKind === 'forest') {
        apply(0.98, 1.03);
      }
      return;
    case 'desert':
      if (nearbyKind === 'mountain') {
        apply(1.06, 1.02);
        return;
      }
      if (nearbyKind === 'river' || nearbyKind === 'ocean') {
        apply(0.96, 1.05);
      }
      return;
    case 'swamp':
      if (nearbyKind === 'river' || nearbyKind === 'ocean') {
        apply(0.92, 1.06);
        return;
      }
      if (nearbyKind === 'forest') {
        apply(0.98, 1.04);
      }
      return;
    case 'mountain':
      if (nearbyKind === 'snowfield') {
        apply(1.08, 1.03);
        return;
      }
      if (nearbyKind === 'forest') {
        apply(0.96, 1.04);
      }
      return;
    case 'snowfield':
      if (nearbyKind === 'mountain') {
        apply(1.08, 1.02);
      }
      return;
    case 'settlement':
      if (nearbyKind === 'river' || nearbyKind === 'ocean') {
        apply(0.96, 1.03);
      }
      return;
    case 'ruins':
      if (nearbyKind === 'forest') {
        apply(1.12, 0.98);
      }
      return;
    case 'cave':
      if (nearbyKind === 'river') {
        apply(1.06, 1.04);
      }
      return;
    case 'volcanic':
      if (nearbyKind === 'mountain') {
        apply(1.1, 1.06);
      }
      return;
    case 'river':
      if (nearbyKind === 'forest' || nearbyKind === 'swamp') {
        apply(0.96, 1.04);
      }
      return;
    case 'ocean':
      if (nearbyKind === 'forest' || nearbyKind === 'mountain') {
        apply(1.02, 1.05);
      }
      return;
    default:
      return;
  }
}
