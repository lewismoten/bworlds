import {
  createContextMapPlugin,
  createExitMapAction,
} from '@bworlds/map-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  Seed,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };

type LighthouseTile = TileLike;
type LighthouseContext = WorldContextLike & {
  origin: Point;
};

export function createLighthouseMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<LighthouseContext>({
    name: 'map-lighthouse',
    contextType: 'lighthouse',
    createMap: createLighthouseMap,
  });
}

function createLighthouseMap(
  context: LighthouseContext,
  _seed: Seed,
  _plugins: CreateMapContext['plugins']
): WorldMapLike {
  function getTile(x: number, y: number): LighthouseTile {
    if (Math.abs(x) > 4 || Math.abs(y) > 4) {
      return { kind: 'wall' };
    }
    if (Math.abs(x) === 4 || Math.abs(y) === 4) {
      if (x === 0 && y === 4) {
        return { kind: 'door', note: 'Press X to head back outside.' };
      }
      return { kind: 'wall' };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'lighthouse',
        note: 'The lantern chamber looks out over the surrounding coast.',
      };
    }
    if (Math.abs(x) <= 1 && y <= 0) {
      return {
        kind: 'floor',
        note: 'A spiral stair wraps around the tower wall.',
      };
    }
    return { kind: 'floor', note: 'Salt air drifts through the lantern room.' };
  }

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 4) {
      return createExitMapAction({ x: context.origin.x, y: context.origin.y });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}
