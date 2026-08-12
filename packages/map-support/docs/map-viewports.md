`@bworlds/map-support` now exposes one small shared 2D viewport helper layer
for projected map interactions:

- `createMapViewportState(...)`
- `gesturePanAndZoomMapViewport(...)`
- `mapViewportMapToScreenCoordinate(...)`
- `mapViewportScreenToMapCoordinate(...)`
- `panMapViewport(...)`
- `preserveMapViewportSelectionOnProjectionChange(...)`
- `zoomMapViewportAtScreenPoint(...)`
- `reprojectMapViewportSelection(...)`

It also exposes one small shared 3D orbit-style helper layer:

- `createMapViewport3DState(...)`
- `rotateMapViewport3D(...)`
- `panMapViewport3D(...)`
- `zoomMapViewport3D(...)`
- `resolveMapViewport3DCameraPosition(...)`

## Purpose

The projection plugins define how world coordinates become projected map
coordinates. The viewport helpers define how projected map coordinates move
inside a concrete 2D screen frame.

This separation keeps:

- projection math independent from UI state
- pointer interaction math reusable across future map viewers
- selection reproject logic shareable across projection changes
- 3D orbit camera math reusable across future globe or terrain viewers

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

## Touch Pan And Pinch Zoom

`gesturePanAndZoomMapViewport(...)` handles:

- one-finger drag panning
- two-finger midpoint motion
- two-finger pinch zoom

For two-touch gestures, the helper preserves the projected map coordinate
under the gesture midpoint while also applying the pinch scale. That keeps the
touch interaction consistent with cursor-anchored wheel zoom.

## Selection Reprojection

`reprojectMapViewportSelection(...)` projects a selected `worldX/worldY`
coordinate through a caller-provided projection callback.

This keeps selected map positions anchored in world space instead of treating
projected coordinates as stable across projection changes.

`preserveMapViewportSelectionOnProjectionChange(...)` goes one step further:
it keeps a selected world-space coordinate at the same screen coordinate while
the caller swaps from one projection callback to another.

That lets future projected map viewers:

- keep the selected feature visible
- avoid selection jumps during projection switches
- reuse one deterministic projection-change path across UIs

## 3D Rotate, Pan, And Zoom

`MapViewport3DState` tracks:

- `targetX`
- `targetY`
- `targetZ`
- `yawRadians`
- `pitchRadians`
- `distance`
- `minDistance`
- `maxDistance`
- `minPitchRadians`
- `maxPitchRadians`

`rotateMapViewport3D(...)` applies mouse drag deltas to yaw and pitch.

`panMapViewport3D(...)` translates the camera target along the current camera
right and up axes, scaled by viewport size and orbit distance.

`zoomMapViewport3D(...)` changes orbit distance with min/max clamping.

`resolveMapViewport3DCameraPosition(...)` converts the orbit state into a
concrete camera position in world space.

This keeps 3D map interaction math independent from any specific rendering
engine while still giving future map viewers one shared orbit-control model.
