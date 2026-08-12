# Terrain Splat Geometry Attribute Plans

`@bworlds/terrain-splat-support/attribute-plan` turns packed terrain splat chunk
data into one stable geometry-attribute layout for renderer upload.

## Goals

- keep packed chunk splat data separate from renderer-specific mesh code
- define one shared attribute naming/layout convention for terrain splat inputs
- let chunk builders, worker results, and renderer upload paths share the same
  attribute plan

## Main API

- `createTerrainSplatGeometryAttributePlanSet(...)`
- `createTerrainSplatGeometryAttributePlanSetFromWorkerResult(...)`
- `createTerrainSplatGeometryAttributePlanSetFromChunkBuild(...)`

## Attribute model

- `terrainSplatLayerIndices`: `Uint8Array`, item size `4`, not normalized
- `terrainSplatLayerWeights`: `Uint8Array`, item size `4`, normalized
- one attribute entry is emitted per packed splat sample
- plan sets report packed memory ownership from the underlying typed arrays

## Current limits

- this module does not create vertex buffers or Three.js `BufferAttribute`
  instances yet
- it assumes one packed splat sample maps to one renderer sample/vertex entry
- callers still decide how the packed sample grid maps onto final terrain
  geometry density

Initial-delivery follow-up:

- `@bworlds/terrain-splat-support/two-layer-vertex-blend` can resolve the
  strongest two layers from these packed vertex weights for simpler first-pass
  terrain materials
