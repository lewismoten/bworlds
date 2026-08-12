import { describe, expect, it } from 'vitest';
import { createTerrainSplatGridTileResolver } from './sample-grid.ts';
import {
  createTerrainSplatChunkBuildCache,
  createTerrainSplatChunkStateKey,
} from './chunk-cache.ts';
import { createTerrainSplatWorkerBuildRequest } from './worker-contract.ts';

describe('terrain splat chunk cache', () => {
  it('keeps the same state key when only camera movement changes', () => {
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'chunk-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => ({
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.6,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const first = createTerrainSplatChunkStateKey({
      request,
      terrainStateRevision: 'rev-a',
      cameraX: 4,
      cameraY: 8,
      cameraFacing: 90,
    });
    const shiftedCamera = createTerrainSplatChunkStateKey({
      request,
      terrainStateRevision: 'rev-a',
      cameraX: 24,
      cameraY: 28,
      cameraFacing: 180,
    });

    expect(shiftedCamera).toBe(first);
  });

  it('changes the state key when terrain state changes', () => {
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'chunk-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => ({
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.6,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const first = createTerrainSplatChunkStateKey({
      request,
      terrainStateRevision: 'rev-a',
    });
    const revised = createTerrainSplatChunkStateKey({
      request,
      terrainStateRevision: 'rev-b',
    });

    expect(revised).not.toBe(first);
  });

  it('reuses cached chunk data until the terrain state key changes', () => {
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'chunk-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => ({
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.6,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const cache = createTerrainSplatChunkBuildCache<{ buildId: number }>(8);
    let buildCount = 0;

    const first = cache.getOrCreate(
      {
        request,
        terrainStateRevision: 'rev-a',
        cameraX: 4,
        cameraY: 8,
      },
      () => ({
        buildId: ++buildCount,
      })
    );
    const repeated = cache.getOrCreate(
      {
        request,
        terrainStateRevision: 'rev-a',
        cameraX: 24,
        cameraY: 28,
      },
      () => ({
        buildId: ++buildCount,
      })
    );
    const revised = cache.getOrCreate(
      {
        request,
        terrainStateRevision: 'rev-b',
        cameraX: 24,
        cameraY: 28,
      },
      () => ({
        buildId: ++buildCount,
      })
    );

    expect(repeated).toBe(first);
    expect(revised).not.toBe(first);
    expect(buildCount).toBe(2);
    expect(cache.size()).toBe(2);
  });
});
