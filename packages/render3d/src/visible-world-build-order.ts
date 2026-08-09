import type { PendingWorldBuildEntry } from './pending-world-build-queue.ts';

type RankedVisibleWorldBuildEntry = PendingWorldBuildEntry & {
  distance: number;
  facingDot: number;
};

export type VisibleWorldBuildOrderScratch = {
  rankedEntries: RankedVisibleWorldBuildEntry[];
  queue: PendingWorldBuildEntry[];
};

export function createVisibleWorldBuildOrderScratch(): VisibleWorldBuildOrderScratch {
  return {
    rankedEntries: [],
    queue: [],
  };
}

export function fillVisibleWorldTileBuildOrder(
  scratch: VisibleWorldBuildOrderScratch,
  {
    playerTileX,
    playerTileY,
    facingAngle,
    chunkRadius,
    shouldRenderWorldTile,
  }: {
    playerTileX: number;
    playerTileY: number;
    facingAngle: number;
    chunkRadius: number;
    shouldRenderWorldTile: (tileX: number, tileY: number) => boolean;
  }
): PendingWorldBuildEntry[] {
  const rankedEntries = scratch.rankedEntries;
  const queue = scratch.queue;
  rankedEntries.length = 0;
  queue.length = 0;
  const forwardX = Math.cos(facingAngle);
  const forwardY = Math.sin(facingAngle);

  for (let y = playerTileY - chunkRadius; y <= playerTileY + chunkRadius; y += 1) {
    for (let x = playerTileX - chunkRadius; x <= playerTileX + chunkRadius; x += 1) {
      if (!shouldRenderWorldTile(x, y)) {
        continue;
      }
      const deltaX = x - playerTileX;
      const deltaY = y - playerTileY;
      const distance = Math.hypot(deltaX, deltaY);
      rankedEntries.push({
        key: `${x}:${y}`,
        x,
        y,
        distance,
        facingDot:
          distance === 0 ? 1 : forwardX * (deltaX / distance) + forwardY * (deltaY / distance),
      });
    }
  }

  rankedEntries.sort((left, right) => {
    if (Math.abs(left.distance - right.distance) > 0.001) {
      return left.distance - right.distance;
    }
    if (Math.abs(left.facingDot - right.facingDot) > 0.0001) {
      return right.facingDot - left.facingDot;
    }
    if (left.y !== right.y) {
      return left.y - right.y;
    }
    return left.x - right.x;
  });

  for (let index = 0; index < rankedEntries.length; index += 1) {
    const entry = rankedEntries[index] as RankedVisibleWorldBuildEntry;
    queue.push({
      key: entry.key,
      x: entry.x,
      y: entry.y,
    });
  }

  return queue;
}
