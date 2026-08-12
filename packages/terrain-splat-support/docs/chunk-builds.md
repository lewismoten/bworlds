# Terrain Splat Chunk Builds

`@bworlds/terrain-splat-support/chunk-build` provides one chunk-oriented entry
point that turns a tile resolver into packed splat chunk data.

## Goals

- generate splat weights while building terrain chunk data
- keep chunk splat generation separate from mesh creation
- reuse the worker request/result contract and chunk-state cache paths instead
  of duplicating them at every call site

## Main API

- `buildTerrainSplatChunkData(...)`
- `buildTerrainSplatChunkDataFromTerrainState(...)`
- `buildTerrainSplatChunkDataInWorker(...)`

## Behavior

- builds one worker-style request from seed, bounds, and a tile resolver
- can also build from one captured terrain-state snapshot with no live gameplay
  callback
- computes a terrain-state cache key when a cache is supplied
- returns a packed splat result ready for worker transfer or later attribute
  upload
- the async worker entry point preserves the same request shape, cache key, and
  packed result contract while dispatching the build through a Worker-like host
- reports whether the chunk data came from cache through `fromCache`

## Current limits

- callers still need to provide the shared terrain kind and layer catalogs
- the entry point stops at packed chunk data and metrics; it does not create
  geometry or materials
