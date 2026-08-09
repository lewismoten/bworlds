import {
  appendHashSeedLabel,
  hash2DWithSeed,
  registerHashLabel,
  resolveHashSeed,
} from '@bworlds/core/hash';
import {
  createContextMapPlugin,
  createReturnMapAction,
} from '@bworlds/map-support';
import type {
  CreateMapContext,
  Point,
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type TrainCarType =
  | 'engine'
  | 'baggage'
  | 'coach'
  | 'dining'
  | 'mail'
  | 'sleeper'
  | 'observation';

export type TrainContext = WorldContextLike & {
  origin: Point;
  lineName: string;
  fromStation: string;
  toStation: string;
};

type TrainCarLayout = {
  type: TrainCarType;
  topY: number;
  bottomY: number;
  centerY: number;
};

const CAR_STRIDE = 5;
const CAR_HALF_WIDTH = 3;
const BOARDING_DOOR_X = 0;
const TRAIN_ENTRY_ROW_Y = 6;
const MIDDLE_CAR_TYPES: TrainCarType[] = [
  'baggage',
  'coach',
  'dining',
  'mail',
  'sleeper',
];
const TRAIN_MIDDLE_COUNT_SEED = registerHashLabel('train-middle-count');
const TRAIN_MIDDLE_CAR_SEED = registerHashLabel('train-middle-car');

export function createTrainMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<TrainContext>({
    name: 'map-train',
    contextType: 'train',
    createMap: createTrainMap,
  });
}

export function resolveTrainCarTypes(
  seed: string | number,
  context: Pick<TrainContext, 'origin' | 'lineName'>
): TrainCarType[] {
  const seedHash = resolveHashSeed(seed);
  const middleCountSeed = appendHashSeedLabel(seedHash, TRAIN_MIDDLE_COUNT_SEED);
  const middleCarSeed = appendHashSeedLabel(
    appendHashSeedLabel(seedHash, TRAIN_MIDDLE_CAR_SEED),
    registerHashLabel(context.lineName)
  );
  const middleCount =
    2 +
    Math.floor(
      hash2DWithSeed(middleCountSeed, context.origin.x, context.origin.y) *
        3
    );
  const cars: TrainCarType[] = ['engine'];

  for (let index = 0; index < middleCount; index += 1) {
    const pick = MIDDLE_CAR_TYPES[
      Math.floor(
        hash2DWithSeed(
          middleCarSeed,
          context.origin.x + index,
          context.origin.y - index
        ) * MIDDLE_CAR_TYPES.length
      )
    ];
    cars.push(pick ?? 'coach');
  }

  cars.push('observation');
  return cars;
}

export function getTrainBoardingSpawn(
  seed: string | number,
  context: Pick<TrainContext, 'origin' | 'lineName'>
): Point {
  const cars = resolveTrainCarTypes(seed, context);
  const layout = getTrainLayout(cars);
  const observationCar = layout.cars[layout.cars.length - 1];
  return {
    x: BOARDING_DOOR_X,
    y: observationCar?.centerY ?? layout.maxY - 1,
  };
}

function createTrainMap(
  context: TrainContext,
  seed: string | number,
  _plugins: CreateMapContext['plugins']
): WorldMapLike {
  const cars = resolveTrainCarTypes(seed, context);
  const layout = getTrainLayout(cars);

  function getTile(x: number, y: number): TileLike {
    if (
      Math.abs(x) > CAR_HALF_WIDTH ||
      y < layout.minY ||
      y > layout.maxY + 1
    ) {
      return { kind: 'wall' };
    }

    if (x === BOARDING_DOOR_X && y === layout.maxY + 1) {
      return {
        kind: 'door',
        note: `Press X to step back onto the ${context.fromStation} platform.`,
      };
    }

    const car = layout.cars.find(
      (candidate) => y >= candidate.topY && y <= candidate.bottomY
    );
    if (!car) {
      return { kind: 'wall' };
    }

    if (Math.abs(x) === CAR_HALF_WIDTH) {
      return {
        kind: 'wall',
        note: 'Wood-paneled walls and brass trim rumble with the passing rails.',
      };
    }

    const isConnectorRow = y === car.topY || y === car.bottomY;
    if (isConnectorRow) {
      if (x === BOARDING_DOOR_X) {
        return {
          kind: y === layout.maxY ? 'door' : 'floor',
          note:
            y === layout.maxY
              ? `A folding step drops toward ${context.fromStation}.`
              : 'An accordion vestibule sways between train cars.',
        };
      }
      return {
        kind: 'wall',
        note: 'Bench backs and bulkheads narrow toward the vestibule door.',
      };
    }

    if (x === BOARDING_DOOR_X && y === car.centerY) {
      return {
        kind: 'interior',
        note: getTrainCarCenterNote(car.type, context),
      };
    }

    return {
      kind: 'floor',
      note: getTrainCarAmbientNote(car.type, context),
    };
  }

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === BOARDING_DOOR_X && (y === layout.maxY || y === layout.maxY + 1)) {
      return createReturnMapAction();
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

function getTrainLayout(cars: TrainCarType[]) {
  const firstTopY = TRAIN_ENTRY_ROW_Y - cars.length * CAR_STRIDE + 1;
  const layouts: TrainCarLayout[] = cars.map((type, index) => {
    const topY = firstTopY + index * CAR_STRIDE;
    const bottomY = topY + CAR_STRIDE - 1;
    return {
      type,
      topY,
      bottomY,
      centerY: topY + Math.floor(CAR_STRIDE / 2),
    };
  });

  return {
    cars: layouts,
    minY: firstTopY,
    maxY: layouts[layouts.length - 1]?.bottomY ?? TRAIN_ENTRY_ROW_Y,
  };
}

function getTrainCarCenterNote(
  type: TrainCarType,
  context: Pick<TrainContext, 'lineName' | 'fromStation' | 'toStation'>
) {
  if (type === 'engine') {
    return `The ${context.lineName} engine hisses with hot iron and coal as it pulls toward ${context.toStation}.`;
  }
  if (type === 'baggage') {
    return 'Crates, trunks, and tagged parcels sway in the baggage car racks.';
  }
  if (type === 'coach') {
    return 'Velvet coach seats line the windows, giving travelers room to watch the countryside slip by.';
  }
  if (type === 'dining') {
    return 'A dining car of polished tables and rattling silverware smells faintly of coffee and broth.';
  }
  if (type === 'mail') {
    return 'Canvas post sacks and pigeonhole cubbies fill the railway mail car.';
  }
  if (type === 'sleeper') {
    return 'Curtained sleeper berths rock gently while the train clatters down the line.';
  }
  return `The observation car opens toward ${context.toStation} with broad windows and a brass-railed rear platform.`;
}

function getTrainCarAmbientNote(
  type: TrainCarType,
  context: Pick<TrainContext, 'fromStation' | 'toStation'>
) {
  if (type === 'engine') {
    return `Steam heat and piston thunder carry forward from the locomotive bound away from ${context.fromStation}.`;
  }
  if (type === 'baggage') {
    return 'Leather straps, freight nets, and stacked trunks shift with each curve in the rails.';
  }
  if (type === 'coach') {
    return 'Overhead racks and paired bench seats leave a narrow aisle through the coach.';
  }
  if (type === 'dining') {
    return 'Table lamps sway above white cloths while glassware taps softly in the pantry.';
  }
  if (type === 'mail') {
    return 'Sorted letters and sealed satchels ride beside a narrow aisle through the mail car.';
  }
  if (type === 'sleeper') {
    return 'Folded blankets and polished berth ladders make the sleeper feel quieter than the other cars.';
  }
  return `Wide rear windows frame the track falling away between ${context.fromStation} and ${context.toStation}.`;
}
