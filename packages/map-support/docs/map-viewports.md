`@bworlds/map-support` now exposes one small shared 2D viewport helper layer
for projected map interactions:

- `createMapViewportState(...)`
- `mapViewportMapToScreenCoordinate(...)`
- `mapViewportScreenToMapCoordinate(...)`
- `panMapViewport(...)`
- `zoomMapViewportAtScreenPoint(...)`
- `reprojectMapViewportSelection(...)`

## Purpose

The projection plugins define how world coordinates become projected map
coordinates. The viewport helpers define how projected map coordinates move
inside a concrete 2D screen frame.

This separation keeps:

- projection math independent from UI state
- pointer interaction math reusable across future map viewers
- selection reproject logic shareable across projection changes

## Viewport State

`MapViewportState` tracks:

- `centerMapX`
- `centerMapY`
- `zoom`
- `minZoom`
- `maxZoom`

The default viewport:

- centers on `0,0`
- starts at zoom `1`
- clamps zoom between `0.25` and `16`

## Coordinate Transforms

`mapViewportMapToScreenCoordinate(...)` converts projected `mapX/mapY`
coordinates into screen pixels.

`mapViewportScreenToMapCoordinate(...)` performs the inverse conversion.

Both functions use the shorter viewport edge as the normalization basis so the
projected `-1..1` square remains stable across non-square viewports.

## Mouse Pan

`panMapViewport(...)` translates screen-space drag deltas into updated
`centerMapX/centerMapY` values.

Dragging right moves the map center left in projected space, which matches the
common "grab and drag the map" interaction pattern.

## Wheel Zoom

`zoomMapViewportAtScreenPoint(...)` changes zoom while preserving the map
coordinate under the hovered screen point.

That means wheel zoom behaves as:

- zoom toward the cursor
- zoom out from the cursor
- no jump under the pointer while zoom changes

## Selection Reprojection

`reprojectMapViewportSelection(...)` projects a selected `worldX/worldY`
coordinate through a caller-provided projection callback.

This keeps selected map positions anchored in world space instead of treating
projected coordinates as stable across projection changes.
