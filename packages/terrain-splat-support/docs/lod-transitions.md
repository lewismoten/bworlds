# Terrain Splat LOD Transitions

`@bworlds/terrain-splat-support/lod-transition` compares high-detail and
coarse splat grids at shared world coordinates and produces one crossfade plan
for cells that would otherwise pop during LOD swaps.

## Goals

- detect when coarse LOD cells change dominant or active terrain layers
- let renderers crossfade only the cells that need it
- keep transition behavior deterministic from the already-built splat grids

## Main API

- `createTerrainSplatLodTransitionPlan(...)`
- `resolveTerrainSplatLodCrossfadeWeights(...)`

## Transition model

- grids must share world bounds and use compatible step sizes
- the plan compares coarse samples only at coordinates that exist in both grids
- crossfade weights resolve from one fade band and always sum to one

## Current limits

- this module does not attach the crossfade plan to live renderer materials yet
- it focuses on material identity changes, not geometry morphing
- coarse terrain geometry density is handled separately by
  `createTerrainSplatHeightGeometryPlan(...)` with `lodStepMultiplier`
