`@bworlds/map-support` now exposes one small shared PMTiles export contract
for future vector-tile generation:

- `createPmtilesExportPlugin(...)`
- `createPmtilesExportRequest(...)`
- `createPmtilesTileCoordinate(...)`

## Purpose

The canonical feature model defines what map features look like in world
space. The PMTiles export contract defines how later code asks for vector
features tile by tile.

This separation keeps:

- feature normalization independent from tile export flow
- export plugin ids explicit and stable
- per-tile generation requests deterministic from `zoom/x/y` and
  `worldRevision`

## Tile Requests

`PmtilesExportRequest` currently carries:

- `worldRevision`
- `tile.zoom`
- `tile.x`
- `tile.y`
- optional `layerIds`

The request is intentionally narrow so later PMTiles generators can ask for
features on demand without coupling the contract to a specific renderer,
projection, or cache implementation.

## Export Plugins

`createPmtilesExportPlugin(...)` builds a normalized `PmtilesExportPlugin`
with:

- stable non-empty `id`
- optional `label`
- `getTileFeatures(request)`

`getTileFeatures(...)` runs per request, which gives later export code one
on-demand generation path for vector features instead of forcing the whole
world to be materialized up front.

## Validation

The helpers validate:

- non-empty plugin ids
- non-empty world revision ids
- valid slippy-style non-negative integer tile coordinates
- tile `x/y` bounds relative to `zoom`
- non-empty requested layer ids

That keeps later PMTiles work focused on tiling, simplification, and caching
instead of repeating low-level request normalization.
