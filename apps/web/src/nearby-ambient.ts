export type NearbyAmbientKind =
  | 'ocean'
  | 'river'
  | 'forest'
  | 'plains'
  | 'mountain'
  | 'cave'
  | 'settlement'
  | 'ruins';

type AmbientPosition = { x: number; y: number };
type AmbientSourceTier = 'poi' | 'base';

type AmbientStateLike = {
  player: { x: number; y: number };
  getCurrentTile(x: number, y: number): Record<string, unknown>;
};

export type NearbyAmbientProfile = {
  kind: NearbyAmbientKind;
  intensity: number;
  emitter: AmbientPosition;
};

const AMBIENT_KIND_SALTS: Record<NearbyAmbientKind, number> = {
  ocean: 0x13579bdf,
  river: 0x2468ace1,
  forest: 0x31415926,
  plains: 0x27182818,
  mountain: 0x16180339,
  cave: 0x9e3779b1,
  settlement: 0x7f4a7c15,
  ruins: 0x5bd1e995,
};

const BASE_AMBIENT_THRESHOLDS: Record<NearbyAmbientKind, number> = {
  ocean: 0.34,
  river: 0.28,
  forest: 0.24,
  plains: 0.16,
  mountain: 0.2,
  cave: 0.22,
  settlement: 0.18,
  ruins: 0.18,
};

export function findNearbyAmbientProfile(options: {
  state: AmbientStateLike;
  centerX: number;
  centerY: number;
  searchRadius: number;
}): NearbyAmbientProfile | null {
  const { state, centerX, centerY, searchRadius } = options;
  let best:
    | null
    | (NearbyAmbientProfile & {
        distance: number;
        priority: number;
      }) = null;

  for (let y = centerY - searchRadius; y <= centerY + searchRadius; y += 1) {
    for (let x = centerX - searchRadius; x <= centerX + searchRadius; x += 1) {
      const profile = resolveAmbientProfileForTile(
        state.getCurrentTile(x, y),
        x,
        y,
        state.player,
        searchRadius
      );
      if (!profile) {
        continue;
      }
      if (
        best &&
        (profile.priority < best.priority ||
          (profile.priority === best.priority &&
            profile.distance >= best.distance))
      ) {
        continue;
      }
      best = profile;
    }
  }

  return best
    ? {
        kind: best.kind,
        intensity: best.intensity,
        emitter: best.emitter,
      }
    : null;
}

export function shouldAdvertiseBaseAmbientSource(
  kind: NearbyAmbientKind,
  x: number,
  y: number
): boolean {
  const threshold = BASE_AMBIENT_THRESHOLDS[kind];
  return hashAmbientCoordinate(x, y, AMBIENT_KIND_SALTS[kind]) < threshold;
}

function resolveAmbientProfileForTile(
  tile: Record<string, unknown>,
  x: number,
  y: number,
  player: { x: number; y: number },
  searchRadius: number
): (NearbyAmbientProfile & { distance: number; priority: number }) | null {
  const tileKind = typeof tile.kind === 'string' ? tile.kind : '';
  const poiType =
    typeof (tile as { poi?: { type?: unknown } }).poi?.type === 'string'
      ? ((tile as { poi?: { type?: string } }).poi?.type ?? '')
      : '';

  const sourceTier: AmbientSourceTier = poiType ? 'poi' : 'base';
  const ambientKind = poiType
    ? resolvePoiAmbientKind(poiType)
    : resolveBaseAmbientKind(tileKind);
  if (!ambientKind) {
    return null;
  }
  if (
    sourceTier === 'base' &&
    !shouldAdvertiseBaseAmbientSource(ambientKind, x, y)
  ) {
    return null;
  }

  const distance = Math.hypot(player.x - x, player.y - y);
  const intensity = Math.max(0, 1 - distance / (searchRadius + 1));
  if (intensity <= 0.08) {
    return null;
  }

  return {
    kind: ambientKind,
    intensity,
    emitter: { x, y },
    distance,
    priority: sourceTier === 'poi' ? 2 : 1,
  };
}

function resolvePoiAmbientKind(poiType: string): NearbyAmbientKind | null {
  switch (poiType) {
    case 'cave':
    case 'dungeon':
      return 'cave';
    case 'quarry':
      return 'mountain';
    case 'ruins':
    case 'tower':
    case 'landmark':
    case 'sign':
      return 'ruins';
    case 'town':
    case 'stronghold':
    case 'lighthouse':
    case 'observatory':
    case 'npc':
    case 'ship':
    case 'station':
    case 'building':
      return 'settlement';
    default:
      return poiType ? 'settlement' : null;
  }
}

function resolveBaseAmbientKind(tileKind: string): NearbyAmbientKind {
  switch (tileKind) {
    case 'ocean':
    case 'shore':
      return 'ocean';
    case 'river':
    case 'bridge':
    case 'dock':
      return 'river';
    case 'forest':
      return 'forest';
    case 'mountain':
    case 'ashlands':
    case 'quarry':
      return 'mountain';
    case 'cave-floor':
    case 'cave-mushrooms':
    case 'cave-wall':
    case 'dungeon':
      return 'cave';
    case 'ruins':
    case 'tower':
    case 'sign':
      return 'ruins';
    case 'town':
    case 'shop':
    case 'floor':
    case 'interior':
    case 'road':
    case 'rail':
    case 'station':
    case 'ship':
    case 'door':
    case 'stairsUp':
    case 'stairsDown':
    case 'wall':
    case 'lighthouse':
    case 'observatory':
      return 'settlement';
    default:
      return 'plains';
  }
}

function hashAmbientCoordinate(x: number, y: number, salt: number): number {
  let hash = Math.imul(x | 0, 374761393);
  hash = (hash + Math.imul(y | 0, 668265263) + salt) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff;
}
