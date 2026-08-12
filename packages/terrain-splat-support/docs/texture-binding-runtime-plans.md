# Terrain Texture Binding Runtime Plans

`@bworlds/terrain-splat-support/texture-binding-runtime-plan` turns terrain
texture binding plans into shared runtime cache keys and upload descriptors.

## Goals

- make cross-chunk texture-array reuse explicit before renderer upload code
- keep shared binding compatibility keyed by actual texture content/order
- preserve fallback warnings when WebGL texture arrays are unavailable

## Main API

- `createTerrainTextureBindingRuntimePlan(...)`
- `summarizeTerrainTextureBindingReuse(...)`

## Runtime model

- compatible chunks share one `sharedBindingKey`
- each map purpose emits one binding descriptor with texture IDs, dimensions,
  format, bytes-per-pixel, depth, and estimated bytes
- texture-array mode and per-layer fallback mode use different binding keys

## Current limits

- this module does not upload textures or create WebGL/Three.js textures yet
- callers still need to provide the actual texture descriptor resolver
