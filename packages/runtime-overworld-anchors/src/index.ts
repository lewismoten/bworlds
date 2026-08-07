import { generatePoiName, hash2D } from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  OverworldAnchorLike,
  OverworldSignals,
  ResolveOverworldAnchorsContext,
  RuntimePlugin,
} from '@bworlds/plugin-api';

type NamedPoint = OverworldAnchorLike & { name: string };
type SampleTerrainSignalsLike = (x: number, y: number) => OverworldSignals;

export function createOverworldAnchorsRuntimePlugin(): RuntimePlugin {
  const townAnchorCache = new Map<string, NamedPoint | null>();
  const bridgeAnchorCache = new Map<string, OverworldAnchorLike | null>();

  return createRuntimePlugin('runtime-overworld-anchors', {
    resolveOverworldAnchors({
      seed,
      x,
      y,
      sampleTerrainSignals,
    }: ResolveOverworldAnchorsContext) {
      return {
        townAnchors: getNearbyTownAnchors(
          seed,
          x,
          y,
          sampleTerrainSignals,
          townAnchorCache
        ),
        bridgeAnchors: getNearbyBridgeAnchors(
          seed,
          x,
          y,
          sampleTerrainSignals,
          bridgeAnchorCache
        ),
      };
    },
  });
}

function getNearbyTownAnchors(
  seed: string | number,
  x: number,
  y: number,
  sampleTerrainSignals: SampleTerrainSignalsLike,
  cache: Map<string, NamedPoint | null>
) {
  const cellSize = 20;
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  const anchors: NamedPoint[] = [];

  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const anchor = getTownAnchor(
        seed,
        cellX + dx,
        cellY + dy,
        sampleTerrainSignals,
        cache
      );
      if (anchor) anchors.push(anchor);
    }
  }

  return anchors;
}

function getNearbyBridgeAnchors(
  seed: string | number,
  x: number,
  y: number,
  sampleTerrainSignals: SampleTerrainSignalsLike,
  cache: Map<string, OverworldAnchorLike | null>
) {
  const cellSize = 16;
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  const anchors: OverworldAnchorLike[] = [];

  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const anchor = getBridgeAnchor(
        seed,
        cellX + dx,
        cellY + dy,
        sampleTerrainSignals,
        cache
      );
      if (anchor) anchors.push(anchor);
    }
  }

  return anchors;
}

function getTownAnchor(
  seed: string | number,
  cellX: number,
  cellY: number,
  sampleTerrainSignals: SampleTerrainSignalsLike,
  cache: Map<string, NamedPoint | null>
) {
  const key = `${seed}:town:${cellX}:${cellY}`;
  if (!cache.has(key)) {
    const cellSize = 20;
    const centerX = cellX * cellSize;
    const centerY = cellY * cellSize;
    const anchorX =
      centerX +
      Math.round((hash2D(`${seed}:town-anchor-x`, cellX, cellY) - 0.5) * 8);
    const anchorY =
      centerY +
      Math.round((hash2D(`${seed}:town-anchor-y`, cellX, cellY) - 0.5) * 8);
    const chance = hash2D(`${seed}:town-anchor`, cellX, cellY);
    const terrain = sampleTerrainSignals(anchorX, anchorY);
    const suitable =
      chance > 0.64 &&
      terrain.continent > 0.47 &&
      terrain.continent < 0.9 &&
      terrain.elevation < 0.7 &&
      terrain.riverSignal < 0.82;

    cache.set(
      key,
      suitable
        ? {
            x: anchorX,
            y: anchorY,
            name: generatePoiName(seed, 'town', anchorX, anchorY),
          }
        : null
    );
  }

  return cache.get(key) ?? null;
}

function getBridgeAnchor(
  seed: string | number,
  cellX: number,
  cellY: number,
  sampleTerrainSignals: SampleTerrainSignalsLike,
  cache: Map<string, OverworldAnchorLike | null>
) {
  const key = `${seed}:bridge:${cellX}:${cellY}`;
  if (!cache.has(key)) {
    const cellSize = 16;
    const centerX = cellX * cellSize;
    const centerY = cellY * cellSize;
    const anchorX =
      centerX +
      Math.round((hash2D(`${seed}:bridge-anchor-x`, cellX, cellY) - 0.5) * 6);
    const anchorY =
      centerY +
      Math.round((hash2D(`${seed}:bridge-anchor-y`, cellX, cellY) - 0.5) * 6);
    const chance = hash2D(`${seed}:bridge-anchor`, cellX, cellY);
    const terrain = sampleTerrainSignals(anchorX, anchorY);
    const suitable =
      chance > 0.72 &&
      terrain.continent > 0.46 &&
      terrain.continent < 0.88 &&
      terrain.elevation < 0.68 &&
      terrain.riverSignal > 0.8;

    cache.set(
      key,
      suitable
        ? {
            x: anchorX,
            y: anchorY,
          }
        : null
    );
  }

  return cache.get(key) ?? null;
}
