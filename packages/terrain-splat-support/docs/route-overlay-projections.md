# Terrain Route Overlay Projections

`@bworlds/terrain-splat-support/route-overlay-projection` projects road and
trail overlay points onto the shared terrain height field.

## Goals

- let narrow route overlays follow terrain height without visible gaps
- reuse the same shared height field as splat terrain geometry
- keep overlay projection deterministic from world coordinates

## Main API

- `projectTerrainRouteOverlayOntoHeightField(...)`
- `sampleTerrainHeightFieldAtWorldPosition(...)`

## Projection model

- overlay points use world-space `x` and `z`
- the height field is sampled with bilinear interpolation between nearby height
  samples
- overlay points receive one small vertical offset so they can sit above the
  terrain surface without z-fighting

## Current limits

- this module only projects overlay points; it does not build ribbons or meshes
