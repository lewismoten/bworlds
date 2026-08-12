import { clamp, smoothstep } from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  DecorateOverworldTileContext,
  OverworldSignals,
  RuntimePlugin,
  TileLike,
} from '@bworlds/plugin-api';

const RELIEF_DISABLED_KINDS = new Set([
  'ocean',
  'river',
  'bridge',
  'dock',
  'rail',
  'mountain',
  'interior',
  'floor',
  'wall',
  'door',
]);

export function createOverworldReliefRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-overworld-relief', {
    decorateOverworldTile(context) {
      decorateOverworldRelief(context);
    },
  });
}

export function decorateOverworldRelief({
  tile,
  signals,
}: Pick<DecorateOverworldTileContext, 'tile' | 'signals'>): TileLike {
  if (RELIEF_DISABLED_KINDS.has(tile.kind)) {
    tile.surfaceHeight = 0;
    return tile;
  }

  tile.surfaceHeight = resolveOverworldReliefHeightFromSignals(signals, tile);
  return tile;
}

export function resolveOverworldReliefHeight(
  elevation: number,
  tile: Pick<TileLike, 'kind'>
): number {
  return clamp(
    resolveOverworldContinentUpliftHeight(elevation, tile) +
      resolveOverworldMountainDetailHeight(elevation, tile),
    0,
    0.36
  );
}

export function resolveOverworldReliefHeightFromSignals(
  signals: Pick<OverworldSignals, 'elevation' | 'riverSignal' | 'roadSignal'>,
  tile: Pick<TileLike, 'kind'>
): number {
  if (RELIEF_DISABLED_KINDS.has(tile.kind)) {
    return 0;
  }

  return clamp(
    resolveOverworldContinentUpliftHeight(signals.elevation, tile) +
      resolveOverworldMountainDetailHeight(signals.elevation, tile) +
      resolveOverworldRiverCarvingHeight(signals.riverSignal, tile) +
      resolveOverworldRouteGradingHeight(signals.roadSignal, tile),
    0,
    0.36
  );
}

export function resolveOverworldContinentUpliftHeight(
  elevation: number,
  tile: Pick<TileLike, 'kind'>
): number {
  if (RELIEF_DISABLED_KINDS.has(tile.kind)) {
    return 0;
  }

  const hillProgress = smoothstep(0.28, 0.72, elevation);
  return clamp(hillProgress * 0.34, 0, 0.34);
}

export function resolveOverworldMountainDetailHeight(
  elevation: number,
  tile: Pick<TileLike, 'kind'>
): number {
  if (RELIEF_DISABLED_KINDS.has(tile.kind)) {
    return 0;
  }

  return smoothstep(0.56, 0.72, elevation) * 0.03;
}

export function resolveOverworldRiverCarvingHeight(
  riverSignal: number,
  tile: Pick<TileLike, 'kind'>
): number {
  if (RELIEF_DISABLED_KINDS.has(tile.kind)) {
    return 0;
  }

  return -smoothstep(0.72, 0.94, riverSignal) * 0.02;
}

export function resolveOverworldRouteGradingHeight(
  roadSignal: number,
  tile: Pick<TileLike, 'kind'>
): number {
  if (tile.kind !== 'road') {
    return 0;
  }

  return -smoothstep(0.78, 0.96, roadSignal) * 0.018;
}
