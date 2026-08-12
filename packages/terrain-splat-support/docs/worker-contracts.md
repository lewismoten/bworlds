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

- worker code still needs to provide or import the shared terrain kind and
  layer catalogs
- the request serializes explicit tile inputs instead of a transferable terrain
  source or plugin callback
