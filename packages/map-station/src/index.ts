import { getTrainBoardingSpawn, type TrainContext } from '@bworlds/map-train';
import {
  createContextMapPlugin,
  createEnterMapAction,
  createExitMapAction,
} from '@bworlds/map-support';
import { createOverworldTerrainSignalSampler } from '@bworlds/overworld-support';
import {
  getRailTrainPlacements,
  type RailTrainPlacement,
} from '@bworlds/rail-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };

type StationContext = WorldContextLike & {
  origin: Point;
};

const STATION_PLATFORM_Y = -4;
const BOARDABLE_TRAIN_APPROACH_THRESHOLD = 0.18;

export function createStationMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<StationContext>({
    name: 'map-station',
    contextType: 'station',
    createMap: createStationMap,
  });
}

function createStationMap(
  context: StationContext,
  seed: string | number,
  _plugins: CreateMapContext['plugins']
): WorldMapLike {
  const sampleTerrainSignals = createOverworldTerrainSignalSampler(seed);
  const serviceCache = new Map<number, RailTrainPlacement | null>();

  function resolveBoardableTrainService(
    state?: WorldStateLike
  ): RailTrainPlacement | null {
    const timeMs = state?.timeMs;
    if (typeof timeMs !== 'number') {
      return null;
    }
    const bucket = Math.floor(timeMs / 30_000);
    if (!serviceCache.has(bucket)) {
      serviceCache.set(
        bucket,
        findBoardableTrainService(
          getRailTrainPlacements({
            seed,
            timeMs,
            x: context.origin.x,
            y: context.origin.y,
            sampleTerrainSignals,
          }),
          context.label
        )
      );
    }
    return serviceCache.get(bucket) ?? null;
  }

  function getTile(x: number, y: number, state?: WorldStateLike): TileLike {
    if (Math.abs(x) > 5 || y > 4 || y < -5) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === 4) {
      return { kind: 'door', note: 'Press X to step back onto the platform road.' };
    }
    if (x === 0 && y === STATION_PLATFORM_Y) {
      const service = resolveBoardableTrainService(state);
      return {
        kind: service ? 'door' : 'floor',
        note: service
          ? `${service.lineName} is boarding for ${service.to}. Press Enter to walk through the train cars.`
          : 'The platform edge waits for the next arriving train.',
      };
    }
    if (Math.abs(x) === 5 || y === 4 || y === -5) {
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
    if (Math.abs(x) <= 2 && y <= -3) {
      return {
        kind: 'floor',
        note: 'A long platform canopy shades the station edge beside the waiting rails.',
      };
    }
    if (Math.abs(x) >= 3 && y <= 1) {
      return { kind: 'floor', note: 'Benches face the empty platform beyond the windows.' };
    }
    return { kind: 'floor', note: 'Travel posters and cargo tags cover the station walls.' };
  }

  function getAction(x: number, y: number, state?: WorldStateLike) {
    if (x !== 0 || y !== STATION_PLATFORM_Y) {
      return null;
    }
    const service = resolveBoardableTrainService(state);
    if (!service) {
      return null;
    }

    const trainContext: TrainContext = {
      id: `train:${context.origin.x}:${context.origin.y}:${service.lineName}`,
      label: `${service.lineName} Service`,
      type: 'train',
      depth: context.depth + 1,
      origin: context.origin,
      lineName: service.lineName,
      fromStation: service.from,
      toStation: service.to,
    };

    return createEnterMapAction({
      context: trainContext,
      spawn: getTrainBoardingSpawn(seed, trainContext),
      facing: -Math.PI / 2,
    });
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 4) {
      return createExitMapAction({ x: context.origin.x, y: context.origin.y });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

export function findBoardableTrainService(
  placements: RailTrainPlacement[],
  stationName: string
): RailTrainPlacement | null {
  return (
    placements
      .map((placement) => ({
        placement,
        approachDistance: getTrainApproachDistance(placement, stationName),
      }))
      .filter(
        (
          candidate
        ): candidate is {
          placement: RailTrainPlacement;
          approachDistance: number;
        } =>
          typeof candidate.approachDistance === 'number' &&
          candidate.approachDistance <= BOARDABLE_TRAIN_APPROACH_THRESHOLD
      )
      .sort((left, right) => left.approachDistance - right.approachDistance)[0]
      ?.placement ?? null
  );
}

function getTrainApproachDistance(
  placement: RailTrainPlacement,
  stationName: string
): number | null {
  if (placement.from === stationName) {
    return placement.progress;
  }
  if (placement.to === stationName) {
    return 1 - placement.progress;
  }
  return null;
}
