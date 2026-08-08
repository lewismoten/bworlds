import { normalizeAngle } from '@bworlds/core';
import { createContextMapPlugin } from '@bworlds/map-support';
import {
  composeOverworldTileFromPlugins,
  createOverworldTerrainSignalSampler,
} from '@bworlds/overworld-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  Seed,
  TileLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type OverworldTile = TileLike;

export function createOverworldCompositionPlugin(): RuntimePlugin {
  return {
    ...createContextMapPlugin({
      name: 'map-overworld',
      contextType: 'overworld',
      createMap(context, seed, plugins) {
        return createOverworldMap(seed, plugins);
      },
    }),
  };
}

function createOverworldMap(
  seed: Seed,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
  const cache = new Map<string, OverworldTile>();
  const sampleTerrainSignals = createOverworldTerrainSignalSampler(seed);
  const defaultTileKind = plugins.getDefaultTileKind();

  function classifyTile(x: number, y: number): OverworldTile {
    return composeOverworldTileFromPlugins({
      seed,
      x,
      y,
      sampleTerrainSignals,
      plugins,
      initialTile: { kind: defaultTileKind },
    });
  }

  function getTile(x: number, y: number) {
    const key = `${x}:${y}`;
    if (!cache.has(key)) {
      cache.set(key, classifyTile(x, y));
    }
    return cache.get(key) ?? { kind: defaultTileKind };
  }

  function getAction(x: number, y: number, state?: { player?: { facing?: number } }) {
    const tile = getTile(x, y);
    const action =
      plugins.createWorldAction({
        seed,
        x,
        y,
        tile,
      }) ?? null;
    if (
      action &&
      action.type === 'enter' &&
      tile.poi &&
      typeof state?.player?.facing === 'number'
    ) {
      action.returnTo = {
        x,
        y,
        facing: normalizeAngle(state.player.facing + Math.PI),
      };
    }
    return action;
  }

  function getExit() {
    return null;
  }

  return { getTile, getAction, getExit };
}
