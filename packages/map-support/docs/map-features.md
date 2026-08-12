`@bworlds/map-support` now exposes one small shared canonical feature model
for projected maps and future PMTiles export work:

- `createMapFeaturePointRecord(...)`
- `createMapFeatureLineRecord(...)`
- `createMapFeaturePolygonRecord(...)`
- `createStableMapFeatureId(...)`
- `isMapFeatureVisibleAtZoom(...)`

## Purpose

The projection plugins define how world-space coordinates become projected
map-space coordinates. The canonical feature model defines what the map data
is before any projection or tile export step happens.

This separation keeps:

- feature geometry independent from projection choice
- feature ids stable from world object ids
- zoom visibility rules explicit on each feature record
- future PMTiles or vector-tile export logic focused on tiling instead of
  feature normalization

## Canonical Geometry

The shared model currently defines:

- `MapFeaturePointRecord`
- `MapFeatureLineRecord`
- `MapFeaturePolygonRecord`

All geometry stays in canonical `worldX/worldY` space.

That means:

- points store one world-space coordinate
- lines store an ordered world-space polyline
- polygons store one or more world-space rings

Projected coordinates are intentionally not stored on the records.

## Stable IDs

`createStableMapFeatureId(...)` derives stable feature ids from:

- `layerId`
- `sourceWorldObjectId`
- optional `featureKey`

That gives map export or UI code one deterministic id path instead of forcing
every caller to build feature ids ad hoc.

## Zoom Visibility

Each canonical feature record carries:

- `minZoom`
- optional `maxZoom`

inside `zoomRange`.

`isMapFeatureVisibleAtZoom(...)` gives later tiling or viewer code one shared
predicate for zoom filtering without coupling zoom logic to any specific layer
implementation.

## Polygon Rings

Polygon rings normalize to closed loops. If a caller omits the closing vertex,
the helper reuses the first coordinate as the last coordinate.

That keeps later polygon export logic simpler and more consistent across map
layers.
