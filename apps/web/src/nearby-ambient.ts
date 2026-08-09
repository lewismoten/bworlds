export type NearbyAmbientKind =
  | 'ocean'
  | 'river'
  | 'forest'
  | 'plains'
  | 'snowfield'
  | 'volcanic'
  | 'mountain'
  | 'cave'
  | 'settlement'
  | 'ruins';

type AmbientPosition = { x: number; y: number };
type AmbientSourceTier = 'poi' | 'base';
type NearbyAmbientCandidate = NearbyAmbientProfile & {
  distance: number;
  priority: number;
};
type AmbientAggregationGroup = {
  kind: NearbyAmbientKind;
  sumIntensity: number;
  maxIntensity: number;
  weightedX: number;
  weightedY: number;
  nearestDistance: number;
  count: number;
};

type AmbientStateLike = {
  player: { x: number; y: number };
  getCurrentTile(x: number, y: number): Record<string, unknown>;
};

export type NearbyAmbientProfile = {
  kind: NearbyAmbientKind;
  intensity: number;
  emitter: AmbientPosition;
  blendedLayers?: NearbyAmbientLayer[];
};

export type NearbyAmbientLayer = {
  kind: NearbyAmbientKind;
  intensity: number;
  emitter: AmbientPosition;
};

const AMBIENT_KIND_SALTS: Record<NearbyAmbientKind, number> = {
  ocean: 0x13579bdf,
  river: 0x2468ace1,
  forest: 0x31415926,
  plains: 0x27182818,
  snowfield: 0x10293847,
  volcanic: 0x56473829,
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
  snowfield: 0.24,
  volcanic: 0.22,
  mountain: 0.2,
  cave: 0.22,
  settlement: 0.18,
  ruins: 0.18,
};

const AMBIENT_BIOLOGICAL_ACTIVITY: Record<NearbyAmbientKind, number> = {
  ocean: 0.58,
  river: 0.68,
  forest: 1,
  plains: 0.78,
  snowfield: 0.28,
  volcanic: 0.08,
  mountain: 0.44,
  cave: 0.22,
  settlement: 0.3,
  ruins: 0.18,
};

export function findNearbyAmbientProfile(options: {
  state: AmbientStateLike;
  centerX: number;
  centerY: number;
  searchRadius: number;
}): NearbyAmbientProfile | null {
  const { state, centerX, centerY, searchRadius } = options;
  const candidates: NearbyAmbientCandidate[] = [];

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
      candidates.push(profile);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return aggregateAmbientProfiles(candidates);
}

export function shouldAdvertiseBaseAmbientSource(
  kind: NearbyAmbientKind,
  x: number,
  y: number
): boolean {
  const threshold = resolveAmbientSourceDensityThreshold(kind);
  return hashAmbientCoordinate(x, y, AMBIENT_KIND_SALTS[kind]) < threshold;
}

export function resolveAmbientBiologicalActivity(
  kind: NearbyAmbientKind
): number {
  return AMBIENT_BIOLOGICAL_ACTIVITY[kind];
}

export function resolveAmbientSourceDensityThreshold(
  kind: NearbyAmbientKind
): number {
  const activity = resolveAmbientBiologicalActivity(kind);
  const densityBoost = 0.55 + activity * 0.9;
  return Math.min(0.94, BASE_AMBIENT_THRESHOLDS[kind] * densityBoost);
}

function resolveAmbientProfileForTile(
  tile: Record<string, unknown>,
  x: number,
  y: number,
  player: { x: number; y: number },
  searchRadius: number
): NearbyAmbientCandidate | null {
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
  const biologicalActivity = resolveAmbientBiologicalActivity(ambientKind);
  const intensityScale =
    sourceTier === 'poi' ? 1 : 0.55 + biologicalActivity * 0.45;
  const intensity =
    Math.max(0, 1 - distance / (searchRadius + 1)) * intensityScale;
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
    case 'snow':
    case 'ice':
      return 'snowfield';
    case 'ashlands':
      return 'volcanic';
    case 'mountain':
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

function aggregateAmbientProfiles(
  profiles: NearbyAmbientCandidate[]
): NearbyAmbientProfile {
  const highestPriority = profiles.reduce(
    (best, profile) => Math.max(best, profile.priority),
    0
  );
  const eligibleProfiles = profiles.filter(
    (profile) => profile.priority === highestPriority
  );
  const groups = new Map<NearbyAmbientKind, AmbientAggregationGroup>();

  for (const profile of eligibleProfiles) {
    const existing = groups.get(profile.kind);
    if (existing) {
      existing.sumIntensity += profile.intensity;
      existing.maxIntensity = Math.max(
        existing.maxIntensity,
        profile.intensity
      );
      existing.weightedX += profile.emitter.x * profile.intensity;
      existing.weightedY += profile.emitter.y * profile.intensity;
      existing.nearestDistance = Math.min(
        existing.nearestDistance,
        profile.distance
      );
      existing.count += 1;
      continue;
    }
    groups.set(profile.kind, {
      kind: profile.kind,
      sumIntensity: profile.intensity,
      maxIntensity: profile.intensity,
      weightedX: profile.emitter.x * profile.intensity,
      weightedY: profile.emitter.y * profile.intensity,
      nearestDistance: profile.distance,
      count: 1,
    });
  }

  const rankedGroups = [...groups.values()].sort((left, right) => {
    if (left.sumIntensity !== right.sumIntensity) {
      return right.sumIntensity - left.sumIntensity;
    }
    if (left.nearestDistance !== right.nearestDistance) {
      return left.nearestDistance - right.nearestDistance;
    }
    return right.count - left.count;
  });
  const bestGroup = rankedGroups[0] ?? null;

  if (!bestGroup) {
    return {
      kind: eligibleProfiles[0]!.kind,
      intensity: eligibleProfiles[0]!.intensity,
      emitter: eligibleProfiles[0]!.emitter,
    };
  }

  const primaryProfile = createAmbientLayerFromGroup(bestGroup);
  const blendedLayers = rankedGroups
    .slice(1)
    .filter((group) => shouldBlendAmbientGroup(bestGroup, group))
    .slice(0, 2)
    .map((group) => createAmbientLayerFromGroup(group));

  return {
    ...primaryProfile,
    blendedLayers: blendedLayers.length > 0 ? blendedLayers : undefined,
  };
}

function createAmbientLayerFromGroup(
  group: AmbientAggregationGroup
): NearbyAmbientLayer {
  const centroidX = group.weightedX / group.sumIntensity;
  const centroidY = group.weightedY / group.sumIntensity;
  const aggregateBoost = Math.min(
    0.35,
    (group.sumIntensity - group.maxIntensity) * 0.35
  );
  return {
    kind: group.kind,
    intensity: Math.min(1, group.maxIntensity + aggregateBoost),
    emitter: {
      x: Math.round(centroidX),
      y: Math.round(centroidY),
    },
  };
}

function shouldBlendAmbientGroup(
  primary: AmbientAggregationGroup,
  candidate: AmbientAggregationGroup
): boolean {
  if (candidate.kind === primary.kind) {
    return false;
  }
  if (candidate.nearestDistance > primary.nearestDistance + 3) {
    return false;
  }
  return candidate.sumIntensity >= primary.sumIntensity * 0.42;
}
