# Terrain Route Splat Projections

`@bworlds/terrain-splat-support/route-splat-projection` projects weighted road
and trail splat samples onto the shared terrain height field.

## Goals

- keep weighted route splat samples aligned to terrain height before renderer
  integration
- preserve route layer and weight metadata while adding projected height
- provide one shared projected-route contract for later shoulder and blend work

## Main API

- `projectTerrainRouteSplatOntoHeightField(...)`

## Model

- each projected point keeps world-space `x` and `z`, plus its route `weight`
- heights come from the shared terrain height field via bilinear sampling
- invalid weights are clamped into `0..1` so later blend stages can rely on
  bounded splat influence
