import {
  type BoatContext,
  findNearestBoatLaunchPoint,
  isBoatLaunchableLandTile,
} from '@bworlds/map-boat';
import { type CanoeContext, findNearestCanoeLaunchPoint } from '@bworlds/map-canoe';
import {
  type GliderContext,
  findGliderLandingPoint,
  isGliderLaunchableLandTile,
} from '@bworlds/map-glider';
import { normalizeAngle } from '@bworlds/core';
import { createContextMapPlugin, createEnterMapAction } from '@bworlds/map-support';
import {
  composeOverworldTileFromPlugins,
  createOverworldTerrainSignalSampler,
} from '@bworlds/overworld-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  Seed,
  TileLike,
  WorldStateLike,
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
  let activeRevision = -1;

  function classifyTile(
    x: number,
    y: number,
    state?: WorldStateLike
  ): OverworldTile {
    return composeOverworldTileFromPlugins({
      seed,
      x,
      y,
      sampleTerrainSignals,
      plugins,
      initialTile: { kind: defaultTileKind },
      state,
    });
  }

  function getTile(x: number, y: number, state?: WorldStateLike) {
    const nextRevision =
      typeof (state as { overworldTileRevision?: unknown } | undefined)
        ?.overworldTileRevision === 'number'
        ? ((state as { overworldTileRevision?: number }).overworldTileRevision ?? 0)
        : 0;
    if (nextRevision !== activeRevision) {
      cache.clear();
      activeRevision = nextRevision;
    }
    const key = `${x}:${y}`;
    if (!cache.has(key)) {
      cache.set(key, classifyTile(x, y, state));
    }
    return cache.get(key) ?? { kind: defaultTileKind };
  }

  function getAction(
    x: number,
    y: number,
    state?: WorldStateLike & { player?: { facing?: number } }
  ) {
    const tile = getTile(x, y, state);
    const action =
      plugins.createWorldAction({
        seed,
        x,
        y,
        tile,
        state,
      }) ?? null;
    if (!action) {
      const boatAction = resolveBoatAction(x, y, state);
      if (boatAction) {
        return boatAction;
      }
      const canoeAction = resolveCanoeAction(x, y, state);
      if (canoeAction) {
        return canoeAction;
      }
      const gliderAction = resolveGliderAction(x, y, state);
      if (gliderAction) {
        return gliderAction;
      }
    }
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

  function resolveCanoeAction(
    x: number,
    y: number,
    state?: WorldStateLike & { player?: { facing?: number } }
  ) {
    const launch = findNearestCanoeLaunchPoint({
      x,
      y,
      sampleTile: getTile,
      state,
    });
    if (!launch) {
      return null;
    }

    const context: CanoeContext = {
      id: `canoe:${x}:${y}`,
      label: 'Canoe',
      type: 'canoe',
      depth: 1,
      origin: { x, y },
    };

    return createEnterMapAction({
      context,
      spawn: {
        x: launch.x - x,
        y: launch.y - y,
      },
      facing: state?.player?.facing ?? 0,
    });
  }

  function resolveBoatAction(
    x: number,
    y: number,
    state?: WorldStateLike & { player?: { facing?: number } }
  ) {
    if (
      !isBoatLaunchableLandTile({
        x,
        y,
        sampleTile: getTile,
        isWalkable(kind) {
          return Boolean(plugins.getTileDefinition(kind)?.walkable);
        },
        state,
      })
    ) {
      return null;
    }

    const launch = findNearestBoatLaunchPoint({
      x,
      y,
      sampleTile: getTile,
      state,
    });
    if (!launch) {
      return null;
    }

    const context: BoatContext = {
      id: `boat:${x}:${y}`,
      label: 'Boat',
      type: 'boat',
      depth: 1,
      origin: { x, y },
    };

    return createEnterMapAction({
      context,
      spawn: {
        x: launch.x - x,
        y: launch.y - y,
      },
      facing: state?.player?.facing ?? 0,
    });
  }

  function resolveGliderAction(
    x: number,
    y: number,
    state?: WorldStateLike & { player?: { facing?: number } }
  ) {
    if (
      !isGliderLaunchableLandTile({
        x,
        y,
        sampleTile: getTile,
        isWalkable(kind) {
          return Boolean(plugins.getTileDefinition(kind)?.walkable);
        },
        state,
      })
    ) {
      return null;
    }

    const facing = state?.player?.facing ?? 0;
    const landing = findGliderLandingPoint({
      x,
      y,
      facing,
      sampleTile: getTile,
      isWalkable(kind) {
        return Boolean(plugins.getTileDefinition(kind)?.walkable);
      },
      state,
    });
    if (!landing) {
      return null;
    }

    const context: GliderContext = {
      id: `glider:${x}:${y}:${landing.x}:${landing.y}`,
      label: 'Glider',
      type: 'glider',
      depth: 1,
      origin: { x, y },
      destination: landing,
    };

    return createEnterMapAction({
      context,
      spawn: { x: 0, y: 1 },
      facing,
    });
  }
}
