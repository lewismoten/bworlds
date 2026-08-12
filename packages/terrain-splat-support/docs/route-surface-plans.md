# Terrain Route Surface Plans

`@bworlds/terrain-splat-support/route-surface-plan` decides whether a route
surface should stay in terrain splats or switch to a separate overlay.

## Goals

- keep broad roads on the shared terrain splat path by default
- move narrow trails to overlays so they do not widen unnaturally in splat data
- keep the decision deterministic from route kind and signal strength

## Main API

- `createTerrainRouteSurfacePlan(...)`

## Policy

- `road` defaults to `splat`
- `path` defaults to `overlay`
- explicit route surface hints can switch among dirt, gravel, stone, mud, and
  grass trail families
- higher route signal can still switch dirt/gravel surface families when no
  explicit hint is present
- trails keep tighter blend zones than roads and can opt into splat rendering
- explicit callers can force road overlays when a renderer path needs that mode

## Current limits

- this module chooses the route surface mode and layer family only
- live overlay projection onto terrain height still needs renderer integration
