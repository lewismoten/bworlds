import { describe, expect, it, vi } from 'vitest';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';

import {
  createEnvironmentFrameCache,
  getEnvironmentFrameCacheKey,
} from './environment-frame-cache.ts';

function createTestEnvironment(label: string): WorldEnvironmentLike {
  return {
    weather: {
      current: {
        kind: 'clear',
        label,
        intensity: 0,
        cloudCover: 0,
        windStrength: 0,
        precipitation: 0,
        visibility: 1,
        temperature: 72,
        front: {
          id: 'front:test',
          kind: 'warm',
          intensity: 0,
          humidityShift: 0,
          temperatureShift: 0,
          windDirectionDegrees: 0,
          speed: 0,
        },
      },
    },
  };
}

describe('environment frame cache', () => {
  it('reuses the resolved environment within the same time slice and tile', () => {
    const resolveEnvironment = vi.fn((input) =>
      createTestEnvironment(`${input.contextId}:${input.timeMs}`)
    );
    const resolveCachedEnvironment = createEnvironmentFrameCache(
      resolveEnvironment,
      250
    );

    const first = resolveCachedEnvironment({
      timeMs: 100,
      contextId: 'overworld',
      playerTileX: 4,
      playerTileY: 7,
    });
    const second = resolveCachedEnvironment({
      timeMs: 249,
      contextId: 'overworld',
      playerTileX: 4,
      playerTileY: 7,
    });

    expect(second).toBe(first);
    expect(resolveEnvironment).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the time slice advances', () => {
    const resolveEnvironment = vi.fn((input) =>
      createTestEnvironment(`${input.timeMs}`)
    );
    const resolveCachedEnvironment = createEnvironmentFrameCache(
      resolveEnvironment,
      250
    );

    const first = resolveCachedEnvironment({
      timeMs: 249,
      contextId: 'overworld',
      playerTileX: 4,
      playerTileY: 7,
    });
    const second = resolveCachedEnvironment({
      timeMs: 250,
      contextId: 'overworld',
      playerTileX: 4,
      playerTileY: 7,
    });

    expect(second).not.toBe(first);
    expect(resolveEnvironment).toHaveBeenCalledTimes(2);
  });

  it('refreshes when the player changes tiles or contexts', () => {
    const resolveEnvironment = vi.fn((input) =>
      createTestEnvironment(
        `${input.contextId}:${input.playerTileX}:${input.playerTileY}`
      )
    );
    const resolveCachedEnvironment = createEnvironmentFrameCache(
      resolveEnvironment,
      250
    );

    resolveCachedEnvironment({
      timeMs: 100,
      contextId: 'overworld',
      playerTileX: 4,
      playerTileY: 7,
    });
    resolveCachedEnvironment({
      timeMs: 120,
      contextId: 'overworld',
      playerTileX: 5,
      playerTileY: 7,
    });
    resolveCachedEnvironment({
      timeMs: 140,
      contextId: 'town',
      playerTileX: 5,
      playerTileY: 7,
    });

    expect(resolveEnvironment).toHaveBeenCalledTimes(3);
  });

  it('builds a stable cache key from context, tile, and time bucket', () => {
    expect(
      getEnvironmentFrameCacheKey({
        timeMs: 249,
        contextId: 'overworld',
        playerTileX: 4,
        playerTileY: 7,
      })
    ).toBe('overworld|4|7|0');
    expect(
      getEnvironmentFrameCacheKey({
        timeMs: 250,
        contextId: 'overworld',
        playerTileX: 4,
        playerTileY: 7,
      })
    ).toBe('overworld|4|7|1');
  });
});
