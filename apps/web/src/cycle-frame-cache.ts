export type CycleFrameCacheInput = {
  timeMs: number;
  cycleConfig?: object;
  celestialOverrides?: object;
};

type CycleFrameCacheResolver<TResult> = (
  input: CycleFrameCacheInput
) => TResult;

type CachedCycleEntry<TResult> = {
  timeBucket: number;
  cycleConfig?: object;
  celestialOverrides?: object;
  value: TResult;
};

const DEFAULT_CYCLE_UPDATE_INTERVAL_MS = 50;

export function createCycleFrameCache<TResult>(
  resolveCycle: CycleFrameCacheResolver<TResult>,
  updateIntervalMs = DEFAULT_CYCLE_UPDATE_INTERVAL_MS
): (input: CycleFrameCacheInput) => TResult {
  let cached: CachedCycleEntry<TResult> | null = null;

  return (input) => {
    const timeBucket = Math.floor(
      Math.max(0, input.timeMs) / Math.max(1, updateIntervalMs)
    );
    if (
      cached &&
      cached.timeBucket === timeBucket &&
      cached.cycleConfig === input.cycleConfig &&
      cached.celestialOverrides === input.celestialOverrides
    ) {
      return cached.value;
    }

    const value = resolveCycle(input);
    cached = {
      timeBucket,
      cycleConfig: input.cycleConfig,
      celestialOverrides: input.celestialOverrides,
      value,
    };
    return value;
  };
}
