# Terrain Splat Terrain State

`@bworlds/terrain-splat-support/terrain-state` captures plain terrain records
before chunk building or future render planning.

## Goals

- separate gameplay callbacks from reusable terrain splat inputs
- freeze one terrain-state snapshot that worker, cache, debug, and renderer
  planning paths can share
- keep render-facing code dependent on plain terrain records instead of world
  state APIs

## Main API

- `createTerrainSplatTerrainStateSnapshot(...)`
- `createTerrainSplatTerrainStateResolver(...)`
- `createTerrainSplatWorkerBuildRequestFromTerrainState(...)`

## Model

- a snapshot stores seed, bounds, and plain `{ x, y, kind, signals }` tiles
- optional build-affecting settings such as blend width and LOD stay on the
  snapshot so later chunk builds do not need the original gameplay callback
- terrain-state revision can travel with the snapshot for cache invalidation
