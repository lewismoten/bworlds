import type { WorldEnvironmentLike } from '@bworlds/plugin-api';

export type EnvironmentFrameCacheInput = {
  timeMs: number;
  contextId: string;
  playerTileX: number;
  playerTileY: number;
};

type EnvironmentFrameCacheResolver = (
  input: EnvironmentFrameCacheInput
) => WorldEnvironmentLike;

type CachedEnvironmentEntry = {
  key: string;
  value: WorldEnvironmentLike;
};

const DEFAULT_ENVIRONMENT_UPDATE_INTERVAL_MS = 250;

export function createEnvironmentFrameCache(
  resolveEnvironment: EnvironmentFrameCacheResolver,
  updateIntervalMs = DEFAULT_ENVIRONMENT_UPDATE_INTERVAL_MS
): (input: EnvironmentFrameCacheInput) => WorldEnvironmentLike {
  let cached: CachedEnvironmentEntry | null = null;

  return (input) => {
    const key = getEnvironmentFrameCacheKey(input, updateIntervalMs);
    if (cached && cached.key === key) {
      return cached.value;
    }

    const value = resolveEnvironment(input);
    cached = {
      key,
      value,
    };
    return value;
  };
}

export function getEnvironmentFrameCacheKey(
  input: EnvironmentFrameCacheInput,
  updateIntervalMs = DEFAULT_ENVIRONMENT_UPDATE_INTERVAL_MS
): string {
  const timeBucket = Math.floor(
    Math.max(0, input.timeMs) / Math.max(1, updateIntervalMs)
  );
  return [
    input.contextId,
    input.playerTileX,
    input.playerTileY,
    timeBucket,
  ].join('|');
}
