# Terrain Splat Worker Contracts

`@bworlds/terrain-splat-support/worker-contract` provides one serializable
request/result shape for worker-side terrain splat generation.

## Goals

- keep chunk splat generation separate from mesh creation
- avoid ad hoc worker message shapes for tile inputs and packed splat outputs
- preserve the compact typed-array handoff already used by the support package
- let worker pipelines opt into adaptive budget fallback without moving budget
  logic into renderer code

## Main API

- `createTerrainSplatWorkerBuildRequest(...)`
- `buildTerrainSplatWorkerResult(...)`
- `listTerrainSplatWorkerResultTransferables(...)`
- `createTerrainSplatWorkerBuildRequestMessage(...)`
- `buildTerrainSplatWorkerResponseMessage(...)`
- `runTerrainSplatWorkerBuild(...)`

## Request shape

- serializes chunk bounds, seed, and one explicit tile list
- each tile carries `x`, `y`, `kind`, and optional terrain signals
- optional fields include `blendWidth`, `lodStepMultiplier`, `budgetMs`, and
  `fallbackLodStepMultiplier`

## Result shape

- returns one packed sample grid ready for `postMessage(...)`
- exposes optional adaptive-build metrics when the request includes budget or
  fallback settings
- `listTerrainSplatWorkerResultTransferables(...)` returns the packed
  `ArrayBuffer`s for `layerIndices` and `weights`

## Current limits

- the request still serializes explicit tile inputs instead of a transferable
  terrain source or plugin callback

## Worker runtime

- `@bworlds/terrain-splat-support/worker-runtime` wraps the existing request and
  result contract in one small request/response message protocol
- build messages serialize the terrain kind and layer catalogs directly so one
  worker can build packed chunk data without reaching back into gameplay state
- `runTerrainSplatWorkerBuild(...)` accepts any Worker-like host object that
  supports `postMessage(...)` plus `message` / `error` listeners, so app code
  can use a browser `Worker` while tests can use a fake in-process adapter
