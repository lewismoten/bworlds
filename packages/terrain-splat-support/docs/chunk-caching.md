# Terrain Splat Chunk Caching

`@bworlds/terrain-splat-support/chunk-cache` provides a cache key and bounded
cache wrapper for chunk-derived terrain splat data.

## Goals

- cache splat data with chunk terrain state instead of view state
- rebuild cached chunk splat data only when terrain inputs actually change
- avoid camera-driven cache churn for reused chunk generation requests

## Main API

- `createTerrainSplatChunkStateKey(...)`
- `createTerrainSplatChunkBuildCache(...)`

## Key behavior

- keys include chunk seed, bounds, build-affecting options, terrain-state
  revision, and serialized tile inputs
- keys intentionally ignore `cameraX`, `cameraY`, and `cameraFacing`
- this keeps repeated camera movement from invalidating chunk splat data that
  still represents the same terrain state

## Cache behavior

- `createTerrainSplatChunkBuildCache(...)` wraps a bounded LRU-style cache
- repeated requests with the same chunk-state key reuse the cached value
- changing the terrain-state revision or serialized tile inputs produces a new
  key and a new cache entry
