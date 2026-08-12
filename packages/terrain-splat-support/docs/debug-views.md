# Terrain Splat Debug Views

`@bworlds/terrain-splat-support/debug-view` provides renderer-free debug view
data for chunk splat grids.

## Goals

- expose per-sample debug data before terrain viewer integration exists
- support one-layer views, dominant-layer views, and weight/color summaries
- support texture-map toggles for base color, normal, and roughness metadata
- report simple chunk-level memory and active-layer diagnostics from the same
  shared splat grid input

## Main API

- `createTerrainSplatDebugView(...)`

## Supported modes

- `dominant-layer`
- `active-layer-count`
- `layer-weight`
- `blend-color`
- `layer-index`
- `base-color-map`
- `normal-map`
- `roughness-map`

## Output

- one row-major cell list with `activeLayerIds`, `activeLayerCount`,
  `dominantLayerId`, `dominantWeight`, `colorHex`, and resolved `layerIndices`
- one chunk-level summary with `packedMemoryUsageBytes`, sorted
  `activeLayerIds`, and the active-layer count for the whole grid
- optional `targetLayerId` for one-layer debug views
- optional `blendEnabled: false` to collapse each cell to one dominant layer
  and inspect the same grid without blend visualization

## Current limits

- the module does not render a viewer UI; it only prepares debug payloads
- color maps are intentionally simple helper encodings, not final art
- texture-array index reporting depends on the shared layer catalog indices

Viewer integration:

- `@bworlds/terrain-splat-support/debug-viewer` wraps these payloads in stable
  viewer mode metadata so terrain viewers can expose a splat debug toggle
  without duplicating mode-selection logic
