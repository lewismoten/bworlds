# Terrain Two-Layer Vertex Blends

`@bworlds/terrain-splat-support/two-layer-vertex-blend` resolves one initial
two-layer blend from the packed splat vertex weights.

## Goals

- support the initial delivery path that blends two terrain layers per vertex
- keep that initial renderer path derived from the shared packed splat data
- preserve a clean upgrade path to the later four-layer shader path

## Main API

- `resolveTerrainTwoLayerVertexBlend(...)`
- `createTerrainTwoLayerVertexBlendGrid(...)`

## Model

- sorts one splat sample by weight and keeps the strongest two layers
- renormalizes those two weights so the blend factor stays within `0..1`
- packed grids can be converted into one row-major blend list for initial
  terrain viewers or simpler shader/material paths
