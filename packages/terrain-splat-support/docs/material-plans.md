# Terrain Splat Material Plans

`@bworlds/terrain-splat-support/material-plan` builds one renderer-free shared
terrain splat material signature from the existing texture binding plans.

## Goals

- define one stable material key for compatible terrain chunks
- keep chunk-local splat data in geometry attributes instead of per-chunk
  material clones
- keep shared renderer state in one bounded uniform/define layout
- warn when a chunk falls off the shared path and needs a unique material plan

## Main API

- `createTerrainSplatMaterialPlan(...)`
- `summarizeTerrainSplatMaterialReuse(...)`

## Material model

- required geometry attributes are `terrainSplatLayerIndices` and
  `terrainSplatLayerWeights`
- global uniforms cover texture bindings plus runtime controls for blend
  enablement, wetness, and snow
- shader defines stay stable for a given binding mode and map-purpose set
- compatible chunks reuse the same `materialKey`

## Current limits

- this module does not create a live Three.js or WebGL material yet
- it plans compatibility and reuse on top of texture binding plans
- final shader code and renderer upload logic still need to consume this plan
