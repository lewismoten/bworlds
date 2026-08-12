`@bworlds/map-support` now exposes one small shared PMTiles export contract
for future vector-tile generation:

- `createMapFeatureGeneratorPlugin(...)`
- `createPmtilesTileCache(...)`
- `selectPmtilesTileFeaturesForZoom(...)`
- `simplifyPmtilesFeatureGeometry(...)`
- `createPmtilesExportPlugin(...)`
- `createPmtilesExportRequest(...)`
- `createPmtilesTileCoordinate(...)`
- `generatePmtilesTileFeatures(...)`
- `generatePmtilesTileFeaturesAtZoomDetail(...)`
- `getOrCreatePmtilesTileFeatures(...)`

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

## On-Demand Feature Generation

`createMapFeatureGeneratorPlugin(...)` defines one layer-scoped generator that
returns canonical world-space map features for a single normalized tile
request.

`generatePmtilesTileFeatures(...)` fans one normalized PMTiles request out to
the relevant generators and concatenates their results.

That keeps later PMTiles export code free to:

- generate tile features only when a tile is requested
- filter generators by requested `layerIds`
- keep layer ownership explicit on returned features

## Zoom Detail

`selectPmtilesTileFeaturesForZoom(...)` applies canonical feature
`zoomRange` visibility to a feature set for one tile zoom.

`simplifyPmtilesFeatureGeometry(...)` reduces line and polygon geometry detail
at lower zoom levels by increasing the kept-vertex stride, while leaving point
features unchanged.

`generatePmtilesTileFeaturesAtZoomDetail(...)` composes:

- on-demand generator fan-out
- zoom visibility filtering
- zoom-based geometry simplification

That gives later PMTiles export code one shared path for:

- coarse features at low zoom
- finer features at higher zoom
- zoom-dependent line and polygon simplification

## World Revision Cache

`createPmtilesTileCache(...)` builds a small in-memory cache keyed by:

- `worldRevision`
- `tile.zoom`
- `tile.x`
- `tile.y`
- requested `layerIds`

`getOrCreatePmtilesTileFeatures(...)` composes:

- request normalization
- cache lookup
- on-demand generation with zoom detail
- cache population on misses

That gives later PMTiles export code one deterministic cache path so repeated
tile requests for the same world revision can reuse generated feature sets,
while revision changes can invalidate old entries cleanly.

## Validation

The helpers validate:

- non-empty plugin ids
- non-empty world revision ids
- valid slippy-style non-negative integer tile coordinates
- tile `x/y` bounds relative to `zoom`
- non-empty requested layer ids

That keeps later PMTiles work focused on tiling, simplification, and caching
instead of repeating low-level request normalization.
