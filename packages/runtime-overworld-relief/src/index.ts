import { clamp, smoothstep } from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  DecorateOverworldTileContext,
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

  tile.surfaceHeight = resolveOverworldReliefHeight(signals.elevation, {
    kind: tile.kind,
  });
  return tile;
}

export function resolveOverworldReliefHeight(
  elevation: number,
  tile: Pick<TileLike, 'kind'>
): number {
  if (RELIEF_DISABLED_KINDS.has(tile.kind)) {
    return 0;
  }

  const hillProgress = smoothstep(0.28, 0.72, elevation);
  const plateauBias = smoothstep(0.56, 0.72, elevation) * 0.03;
  return clamp(hillProgress * 0.34 + plateauBias, 0, 0.36);
}
