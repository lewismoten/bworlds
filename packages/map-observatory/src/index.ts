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
type ObservatoryContext = WorldContextLike & {
  origin: Point;
};

export function createObservatoryMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<ObservatoryContext>({
    name: 'map-observatory',
    contextType: 'observatory',
    createMap: createObservatoryMap,
  });
}

function createObservatoryMap(
  context: ObservatoryContext
): WorldMapLike {
  function getTile(x: number, y: number): TileLike {
    if (Math.abs(x) > 5 || Math.abs(y) > 5) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === 5) {
      return {
        kind: 'door',
        note: 'Press X to step back onto the summit path.',
      };
    }
    if (Math.abs(x) === 5 || Math.abs(y) === 5) {
      return {
        kind: 'wall',
        note: 'Stone braces the observatory against the mountain wind.',
      };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'observatory',
        note: 'The telescope platform opens toward the night sky above.',
      };
    }
    if (Math.abs(x) <= 1 && y <= 0) {
      return {
        kind: 'interior',
        note: 'Charts, lenses, and star logs line the observatory floor.',
      };
    }
    return {
      kind: 'floor',
      note: 'A circular gallery surrounds the telescope mount.',
    };
  }

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 5) {
      return createExitMapAction({ x: context.origin.x, y: context.origin.y });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}
