import { createContextMapPlugin, createExitMapAction } from '@bworlds/map-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };

type StationContext = WorldContextLike & {
  origin: Point;
};

export function createStationMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<StationContext>({
    name: 'map-station',
    contextType: 'station',
    createMap: createStationMap,
  });
}

function createStationMap(
  context: StationContext,
  _seed: string | number,
  _plugins: CreateMapContext['plugins']
): WorldMapLike {
  function getTile(x: number, y: number): TileLike {
    if (Math.abs(x) > 5 || Math.abs(y) > 4) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === 4) {
      return { kind: 'door', note: 'Press X to step back onto the platform road.' };
    }
    if (Math.abs(x) === 5 || Math.abs(y) === 4) {
      return { kind: 'wall', note: 'Brick walls hold back the station weather.' };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'station',
        note: 'The station hall holds schedules, benches, and trunks awaiting the rails.',
      };
    }
    if (Math.abs(x) <= 1 && y <= -1) {
      return { kind: 'interior', note: 'A ticket counter and telegraph desk line the hall.' };
    }
    if (Math.abs(x) >= 3 && y <= 1) {
      return { kind: 'floor', note: 'Benches face the empty platform beyond the windows.' };
    }
    return { kind: 'floor', note: 'Travel posters and cargo tags cover the station walls.' };
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
