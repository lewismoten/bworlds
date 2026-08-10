import { HALF_WORLD_TILES } from '@bworlds/core';

export type TileTeleportOption = {
  kind: string;
  label: string;
};

export type WorldPoint = {
  x: number;
  y: number;
};

export function listTileTeleportOptions(
  entries: Array<[string, { name?: string; walkable?: boolean }]>
): TileTeleportOption[] {
  return entries
    .filter(([kind]) => kind !== 'unknown')
    .map(([kind, definition]) => ({
      kind,
      label: definition.name?.trim() ? `${definition.name} (${kind})` : kind,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function findRandomTileDestination(
  targetKind: string,
  {
    sampleOverworld,
    canLandAt,
    random = Math.random,
    maxAttempts = 3000,
    nearbySearchRadius = 6,
  }: {
    sampleOverworld(x: number, y: number): { kind: string };
    canLandAt(x: number, y: number): boolean;
    random?: () => number;
    maxAttempts?: number;
    nearbySearchRadius?: number;
  }
): WorldPoint | null {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const x = Math.floor((random() * 2 - 1) * HALF_WORLD_TILES);
    const y = Math.floor((random() * 2 - 1) * HALF_WORLD_TILES * 0.5);
    if (sampleOverworld(x, y).kind !== targetKind) {
      continue;
    }
    const landing = findNearbyLanding(x, y, canLandAt, nearbySearchRadius);
    if (landing) {
      return landing;
    }
  }

  for (let radius = 0; radius <= 18; radius += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const x = offsetX;
        const y = offsetY;
        if (sampleOverworld(x, y).kind !== targetKind) {
          continue;
        }
        const landing = findNearbyLanding(x, y, canLandAt, nearbySearchRadius);
        if (landing) {
          return landing;
        }
      }
    }
  }

  return null;
}

function findNearbyLanding(
  centerX: number,
  centerY: number,
  canLandAt: (x: number, y: number) => boolean,
  nearbySearchRadius: number
): WorldPoint | null {
  if (canLandAt(centerX, centerY)) {
    return { x: centerX, y: centerY };
  }

  for (let radius = 1; radius <= nearbySearchRadius; radius += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) {
          continue;
        }
        const x = centerX + offsetX;
        const y = centerY + offsetY;
        if (canLandAt(x, y)) {
          return { x, y };
        }
      }
    }
  }

  return null;
}
